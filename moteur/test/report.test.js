// report.test.js — tests for src/report.js (surface previously untested).
//
// Covers the recent correctness fixes:
//   1. computeStats(db)     reads `produits` (already deduped by motonet) — numbers
//                            must not be inflated by raw CSV duplicates.
//   2. computeMovements(db) compares `produits` vs `produits_prev` via a direct,
//                            deterministic join on motonet_number (no more MAX-per-column).
//   3. anomalies(s,p,meta)  chute >5%, hausse >10% (M6), marque disparue, colonne
//                            disparue, coercion EXPLOSION (M7). NOT exported from
//                            src/report.js (no `export` keyword) — tested black-box
//                            through reportRun() by stubbing global.fetch and reading
//                            back the JSON actually POSTed to the alertes webhook.
//   4. ops.db               openOps/getMeta/setMeta + kind-aware lastRun/lastCheck.
//
// node:test, hermetic: synthetic sqlite DBs (in-memory for computeStats/computeMovements,
// real tmp files for reportRun/ops.db since those are opened by path). No network: either
// webhooks are left empty (post() short-circuits to console.log) or global.fetch is stubbed.

import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import Database from 'better-sqlite3'
import {
  computeStats, computeMovements, openOps, getMeta, setMeta, lastRun, lastCheck, saveRun, reportRun,
} from '../src/report.js'
import { tmpDir } from './support.js'

const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps

// ── schema + insert helpers ─────────────────────────────────────────────────
// Only the columns report.js actually reads (real `produits` has ~26; irrelevant here).
const COLS = ['motonet_number', 'manufacturer', 'purchase_nett_price', 'nett_retail_price',
  'stock_availability_chorzow', 'stock_availability_hub']

function createTable(db, table) {
  db.exec(`CREATE TABLE ${table} (
    motonet_number TEXT, manufacturer TEXT,
    purchase_nett_price REAL, nett_retail_price REAL,
    stock_availability_chorzow INTEGER, stock_availability_hub INTEGER
  )`)
}

function insertRows(db, table, rows) {
  const stmt = db.prepare(`INSERT INTO ${table} (${COLS.join(',')}) VALUES (${COLS.map(() => '?').join(',')})`)
  for (const r of rows) stmt.run(...COLS.map(c => (c in r ? r[c] : null)))
}

function produitsDb(rows) {
  const db = new Database(':memory:')
  createTable(db, 'produits')
  insertRows(db, 'produits', rows)
  return db
}

// ═════════════════════════════════════════════════════════════════════════
// 1. computeStats(db) — reads `produits` (deduped), numbers must be exact.
// ═════════════════════════════════════════════════════════════════════════
// Hand-picked rows so every stat can be checked against a manually computed value:
//   A BOSCH  10→20  stock 5   rentable, margin +50%
//   B BOSCH  15→10  stock 0   à perte,  margin -50%
//   C FEBI    0→25  stock 5   purchase=0 → excluded from margin/rentable/perte
//   D FEBI    8→8   stock 0   à perte (retail<=purchase), margin 0%
//   E ''      5→10  stock 2   rentable, margin +50% — but manufacturer empty
//   F BOSCH  null   stock 0   all-null row, must not blow up COALESCE/aggregates
const STATS_ROWS = [
  { motonet_number: 'A', manufacturer: 'BOSCH', purchase_nett_price: 10, nett_retail_price: 20, stock_availability_chorzow: 5, stock_availability_hub: 0 },
  { motonet_number: 'B', manufacturer: 'BOSCH', purchase_nett_price: 15, nett_retail_price: 10, stock_availability_chorzow: 0, stock_availability_hub: 0 },
  { motonet_number: 'C', manufacturer: 'FEBI', purchase_nett_price: 0, nett_retail_price: 25, stock_availability_chorzow: 2, stock_availability_hub: 3 },
  { motonet_number: 'D', manufacturer: 'FEBI', purchase_nett_price: 8, nett_retail_price: 8, stock_availability_chorzow: 0, stock_availability_hub: 0 },
  { motonet_number: 'E', manufacturer: '', purchase_nett_price: 5, nett_retail_price: 10, stock_availability_chorzow: 1, stock_availability_hub: 1 },
  { motonet_number: 'F', manufacturer: 'BOSCH', purchase_nett_price: null, nett_retail_price: null, stock_availability_chorzow: null, stock_availability_hub: null },
]

test('computeStats: rows/marques/en_stock/stock_total exact on synthetic produits', () => {
  const db = produitsDb(STATS_ROWS)
  const s = computeStats(db)
  assert.equal(s.rows, 6)
  assert.equal(s.marques, 2, 'DISTINCT manufacturer excluding empty string: BOSCH, FEBI')
  assert.equal(s.en_stock, 3, 'A, C, E have STK>0 (B, D, F have STK=0)')
  assert.equal(s.stock_total, 12, '5+0+5+0+2+0')
  assert.deepEqual(s.brands, ['BOSCH', 'FEBI'], 'ordered, excludes empty manufacturer')
})

test('computeStats: rentables/a_perte only count purchase>0 rows', () => {
  const db = produitsDb(STATS_ROWS)
  const s = computeStats(db)
  // rentables: purchase>0 AND retail>purchase -> A (10<20), E (5<10). C excluded (purchase=0).
  assert.equal(s.rentables, 2)
  // a_perte: purchase>0 AND retail>0 AND retail<=purchase -> B (10<=15), D (8<=8). C excluded (purchase=0).
  assert.equal(s.a_perte, 2)
})

test('computeStats: marge_moy/marge_pot/valeur_achat exact, purchase=0 rows excluded from margin', () => {
  const db = produitsDb(STATS_ROWS)
  const s = computeStats(db)
  // marge_moy over A(+50), B(-50), D(0), E(+50) [C excluded: purchase=0; F excluded: null] = 50/4 = 12.5
  assert.equal(s.marge_moy, 12.5)
  // marge_pot: STK>0 AND retail>purchase AND purchase>0 -> A:(20-10)*5=50, E:(10-5)*2=10 [C excluded]. Sum=60.
  assert.equal(s.marge_pot, 60)
  // valeur_achat: STK>0 -> A:10*5=50, C:0*5=0, E:5*2=10. Sum=60.
  assert.equal(s.valeur_achat, 60)
})

test('computeStats: empty produits table -> all zeros, no crash', () => {
  const db = produitsDb([])
  const s = computeStats(db)
  assert.equal(s.rows, 0)
  assert.equal(s.marques, 0)
  assert.equal(s.en_stock, 0)
  assert.equal(s.marge_moy, 0, 'AVG() of empty set is NULL -> || 0 fallback')
  assert.equal(s.marge_pot, 0)
  assert.equal(s.valeur_achat, 0)
  assert.deepEqual(s.brands, [])
})

// ═════════════════════════════════════════════════════════════════════════
// 2. computeMovements(db) — `produits` vs `produits_prev`, deterministic join.
// ═════════════════════════════════════════════════════════════════════════
// M1 cost UP (10->12, +20%), retail unchanged, stock unchanged.
// M2 cost DOWN (20->15), retail UP (30->35) -> conseille_h.
// M3 cost unchanged, stock 4->0 -> rupture.
// M4 cost unchanged, stock 0->3 -> nouveaux_stock.
// M5 present ONLY in produits_prev (removed item) -> must not leak into any metric.
// M6 present ONLY in produits (new item) -> nouveaux.
// M7 cost UP (4->10, +150%, biggest jump) -> top.
const PREV_ROWS = [
  { motonet_number: 'M1', manufacturer: 'BOSCH', purchase_nett_price: 10, nett_retail_price: 20, stock_availability_chorzow: 3, stock_availability_hub: 2 },
  { motonet_number: 'M2', manufacturer: 'BOSCH', purchase_nett_price: 20, nett_retail_price: 30, stock_availability_chorzow: 2, stock_availability_hub: 2 },
  { motonet_number: 'M3', manufacturer: 'FEBI', purchase_nett_price: 10, nett_retail_price: 15, stock_availability_chorzow: 4, stock_availability_hub: 0 },
  { motonet_number: 'M4', manufacturer: 'FEBI', purchase_nett_price: 8, nett_retail_price: 12, stock_availability_chorzow: 0, stock_availability_hub: 0 },
  { motonet_number: 'M5', manufacturer: 'YAMAHA', purchase_nett_price: 100, nett_retail_price: 150, stock_availability_chorzow: 5, stock_availability_hub: 5 },
  { motonet_number: 'M7', manufacturer: 'FEBI', purchase_nett_price: 4, nett_retail_price: 9, stock_availability_chorzow: 1, stock_availability_hub: 0 },
]
const CUR_ROWS = [
  { motonet_number: 'M1', manufacturer: 'BOSCH', purchase_nett_price: 12, nett_retail_price: 20, stock_availability_chorzow: 3, stock_availability_hub: 2 },
  { motonet_number: 'M2', manufacturer: 'BOSCH', purchase_nett_price: 15, nett_retail_price: 35, stock_availability_chorzow: 2, stock_availability_hub: 2 },
  { motonet_number: 'M3', manufacturer: 'FEBI', purchase_nett_price: 10, nett_retail_price: 15, stock_availability_chorzow: 0, stock_availability_hub: 0 },
  { motonet_number: 'M4', manufacturer: 'FEBI', purchase_nett_price: 8, nett_retail_price: 12, stock_availability_chorzow: 3, stock_availability_hub: 0 },
  { motonet_number: 'M6', manufacturer: 'BOSCH', purchase_nett_price: 5, nett_retail_price: 9, stock_availability_chorzow: 1, stock_availability_hub: 1 },
  { motonet_number: 'M7', manufacturer: 'FEBI', purchase_nett_price: 10, nett_retail_price: 9, stock_availability_chorzow: 1, stock_availability_hub: 0 },
]

function movementsDb() {
  const db = new Database(':memory:')
  createTable(db, 'produits')
  createTable(db, 'produits_prev')
  insertRows(db, 'produits', CUR_ROWS)
  insertRows(db, 'produits_prev', PREV_ROWS)
  return db
}

test('computeMovements: cout_h/cout_b/impact exact, unchanged-cost rows excluded from impact', () => {
  const mv = computeMovements(movementsDb())
  assert.equal(mv.cout_h, 2, 'M1 (10->12), M7 (4->10)')
  assert.equal(mv.cout_b, 1, 'M2 (20->15)')
  // impact = AVG over M1(+20%), M2(-25%), M7(+150%) = 145/3. M3/M4 excluded (cost unchanged).
  assert.ok(close(mv.impact, 145 / 3), `impact=${mv.impact}`)
})

test('computeMovements: nouveaux/ruptures/nouveaux_stock/conseille_h exact', () => {
  const mv = computeMovements(movementsDb())
  assert.equal(mv.nouveaux, 1, 'only M6 is new; M5 (removed-only) must not count')
  assert.equal(mv.conseille_h, 1, 'only M2 retail went up')
  assert.equal(mv.ruptures, 1, 'only M3 went from stock>0 to stock=0')
  assert.equal(mv.nouveaux_stock, 1, 'only M4 went from stock=0 to stock>0')
})

test('computeMovements: top is the single biggest cost-increase row (M7, +150%)', () => {
  const mv = computeMovements(movementsDb())
  assert.equal(mv.top.b, 'FEBI')
  assert.equal(mv.top.o, 4)
  assert.equal(mv.top.nn, 10)
  assert.ok(close(mv.top.pc, 150))
})

test('computeMovements: no produits_prev table -> null (first run)', () => {
  const db = new Database(':memory:')
  createTable(db, 'produits')
  insertRows(db, 'produits', CUR_ROWS)
  assert.equal(computeMovements(db), null)
})

// ═════════════════════════════════════════════════════════════════════════
// 3. anomalies(s,p,meta) — NOT exported (no `export` keyword in src/report.js).
//    Tested black-box through reportRun(): stub global.fetch, point wh.alertes at
//    a fake URL, and inspect the embed actually POSTed. The other 5 webhooks are
//    left undefined so post() takes the "(no webhook)" console.log path for them
//    (no fetch call, no assertion needed there).
// ═════════════════════════════════════════════════════════════════════════

// Fixed "current" catalog: 20 rows, 15 BOSCH + 5 FEBI, used by every sub-test below
// (only the seeded "previous" stats vary, to hit each anomaly branch in isolation).
const FIXED_ROWS = Array.from({ length: 20 }, (_, i) => ({
  motonet_number: `X${i + 1}`,
  manufacturer: i < 15 ? 'BOSCH' : 'FEBI',
  purchase_nett_price: 10,
  nett_retail_price: 20,
  stock_availability_chorzow: 1,
  stock_availability_hub: 0,
}))

function fixedCatalogDbPath() {
  const dir = tmpDir()
  const dbPath = path.join(dir, 'catalog.db')
  const db = new Database(dbPath)
  createTable(db, 'produits')
  insertRows(db, 'produits', FIXED_ROWS)
  db.close()
  return dbPath
}

function baseMeta(overrides = {}) {
  return {
    cols: 11, duration_s: 1, csv_bytes: 1000, csv_age: 1, db_bytes: 1000,
    added_cols: [], removed_cols: [], coercion: 0, csv_hash: 'curhash',
    ...overrides,
  }
}

// Shape mirrors computeStats()'s return + the `coercion` field reportRun adds
// before persisting (`{ ...s, coercion: meta.coercion }`).
function prevStats(overrides = {}) {
  return {
    rows: 20, marques: 2, en_stock: 20, stock_total: 20, rentables: 0, a_perte: 0,
    marge_moy: 50, marge_pot: 0, valeur_achat: 0, brands: ['BOSCH', 'FEBI'], coercion: 0,
    ...overrides,
  }
}

function seedPrevRun(opsPath, stats) {
  const ops = openOps(opsPath)
  saveRun(ops, true, stats, 'prevhash')
  ops.close()
}

// Runs reportRun with a stubbed global.fetch (no real network) and returns the
// list of {url, body} calls actually made — normally 0 or 1 (the alertes webhook).
async function runAndCapture({ dbPath, opsPath, meta }) {
  const calls = []
  const orig = globalThis.fetch
  globalThis.fetch = async (url, opts) => { calls.push({ url, body: JSON.parse(opts.body) }); return { ok: true, status: 200 } }
  try {
    await reportRun({ dbPath, opsPath, meta, wh: { alertes: 'http://fake.invalid/alertes' } })
  } finally {
    globalThis.fetch = orig
  }
  return calls
}

function opsPathFor() { return path.join(tmpDir(), 'ops.db') }

test('anomalies: chute >5% triggers, rest quiet', async () => {
  const dbPath = fixedCatalogDbPath()
  const opsPath = opsPathFor()
  seedPrevRun(opsPath, prevStats({ rows: 50 })) // 20 vs 50 = -60%
  const calls = await runAndCapture({ dbPath, opsPath, meta: baseMeta() })
  assert.equal(calls.length, 1, 'exactly one alertes POST')
  const desc = calls[0].body.embeds[0].description
  assert.match(desc, /📉/)
  assert.doesNotMatch(desc, /📈|🏭|🧱|⚠️/)
})

test('anomalies: hausse >10% triggers (M6)', async () => {
  const dbPath = fixedCatalogDbPath()
  const opsPath = opsPathFor()
  seedPrevRun(opsPath, prevStats({ rows: 15 })) // 20 vs 15 = +33.3%
  const calls = await runAndCapture({ dbPath, opsPath, meta: baseMeta() })
  assert.equal(calls.length, 1)
  const desc = calls[0].body.embeds[0].description
  assert.match(desc, /📈/)
  assert.doesNotMatch(desc, /📉|🏭|🧱|⚠️/)
})

test('anomalies: marque disparue triggers', async () => {
  const dbPath = fixedCatalogDbPath()
  const opsPath = opsPathFor()
  seedPrevRun(opsPath, prevStats({ brands: ['BOSCH', 'FEBI', 'YAMAHA'] }))
  const calls = await runAndCapture({ dbPath, opsPath, meta: baseMeta() })
  assert.equal(calls.length, 1)
  const desc = calls[0].body.embeds[0].description
  assert.match(desc, /🏭/)
  assert.match(desc, /YAMAHA/)
})

test('anomalies: colonne disparue triggers', async () => {
  const dbPath = fixedCatalogDbPath()
  const opsPath = opsPathFor()
  seedPrevRun(opsPath, prevStats())
  const calls = await runAndCapture({ dbPath, opsPath, meta: baseMeta({ removed_cols: ['Old Column'] }) })
  assert.equal(calls.length, 1)
  const desc = calls[0].body.embeds[0].description
  assert.match(desc, /🧱/)
  assert.match(desc, /Old Column/)
})

test('anomalies: coercion EXPLOSION (M7) triggers strictly above max(100, prev*3)', async () => {
  const dbPath = fixedCatalogDbPath()
  const opsPath = opsPathFor()
  seedPrevRun(opsPath, prevStats({ coercion: 10 })) // threshold = max(100, 30) = 100
  const calls = await runAndCapture({ dbPath, opsPath, meta: baseMeta({ coercion: 150 }) })
  assert.equal(calls.length, 1)
  const desc = calls[0].body.embeds[0].description
  assert.match(desc, /⚠️/)
  assert.match(desc, /Valeurs illisibles/)
})

test('anomalies: coercion exactly at threshold does NOT trigger (strict >)', async () => {
  const dbPath = fixedCatalogDbPath()
  const opsPath = opsPathFor()
  seedPrevRun(opsPath, prevStats({ coercion: 100 })) // threshold = max(100, 300) = 300
  const calls = await runAndCapture({ dbPath, opsPath, meta: baseMeta({ coercion: 300 }) }) // == threshold, not >
  assert.equal(calls.length, 0, 'boundary value must not trigger')
})

test('anomalies: no previous run (first ever) -> null, no alert', async () => {
  const dbPath = fixedCatalogDbPath()
  const opsPath = opsPathFor() // never seeded
  const calls = await runAndCapture({ dbPath, opsPath, meta: baseMeta() })
  assert.equal(calls.length, 0)
})

test('anomalies: previous run present but nothing anomalous -> null, no alert', async () => {
  const dbPath = fixedCatalogDbPath()
  const opsPath = opsPathFor()
  seedPrevRun(opsPath, prevStats()) // same rows, same brands, coercion 0, no removed_cols
  const calls = await runAndCapture({ dbPath, opsPath, meta: baseMeta() })
  assert.equal(calls.length, 0)
})

test('anomalies: multiple simultaneous triggers combine into ONE alert, multi-line', async () => {
  const dbPath = fixedCatalogDbPath()
  const opsPath = opsPathFor()
  seedPrevRun(opsPath, prevStats({ rows: 50, brands: ['BOSCH', 'FEBI', 'YAMAHA'] }))
  const calls = await runAndCapture({ dbPath, opsPath, meta: baseMeta() })
  assert.equal(calls.length, 1, 'still a single POST, not one per anomaly')
  const desc = calls[0].body.embeds[0].description
  assert.match(desc, /📉/)
  assert.match(desc, /🏭/)
})

// ═════════════════════════════════════════════════════════════════════════
// 4. ops.db — openOps schema, getMeta/setMeta round-trip, kind-aware queries.
// ═════════════════════════════════════════════════════════════════════════

test('openOps: creates runs + meta tables with a kind column', () => {
  const ops = openOps(path.join(tmpDir(), 'ops.db'))
  const tables = ops.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name).sort()
  assert.deepEqual(tables, ['meta', 'runs'])
  const cols = ops.prepare('PRAGMA table_info(runs)').all().map(c => c.name)
  assert.ok(cols.includes('kind'))
  ops.close()
})

test('saveRun: default kind is "ingest"', () => {
  const ops = openOps(path.join(tmpDir(), 'ops.db'))
  saveRun(ops, true, { rows: 1 }, 'h')
  const row = ops.prepare('SELECT kind FROM runs ORDER BY id DESC LIMIT 1').get()
  assert.equal(row.kind, 'ingest')
  ops.close()
})

test('lastRun/lastCheck: null on empty runs table', () => {
  const ops = openOps(path.join(tmpDir(), 'ops.db'))
  assert.equal(lastRun(ops), null)
  assert.equal(lastCheck(ops), null)
  ops.close()
})

test('lastRun filters kind=ingest AND ok=1; lastCheck is the last row of any kind', () => {
  const ops = openOps(path.join(tmpDir(), 'ops.db'))
  saveRun(ops, true, { rows: 100 }, 'h1')                 // ingest, ok=1
  saveRun(ops, true, null, null, 'skip')                  // skip, ok=1 -> must not affect lastRun
  saveRun(ops, false, null, null, 'fail')                 // fail, ok=0

  assert.equal(lastRun(ops).csv_hash, 'h1', 'skip/fail rows must not shadow the last real ingest')
  const lc1 = lastCheck(ops)
  assert.equal(lc1.kind, 'fail', 'lastCheck reflects the most recent row of ANY kind')
  assert.equal(lc1.ok, 0)

  saveRun(ops, false, null, 'h2', 'ingest')                // a FAILED ingest -> must not count as lastRun
  assert.equal(lastRun(ops).csv_hash, 'h1', 'failed ingest (ok=0) must not become lastRun')
  const lc2 = lastCheck(ops)
  assert.equal(lc2.kind, 'ingest')
  assert.equal(lc2.ok, 0)

  saveRun(ops, true, { rows: 200 }, 'h3', 'ingest')        // a successful ingest
  assert.equal(lastRun(ops).csv_hash, 'h3')
  const lc3 = lastCheck(ops)
  assert.equal(lc3.kind, 'ingest')
  assert.equal(lc3.ok, 1)

  ops.close()
})

test('getMeta/setMeta: round-trip, upsert (no duplicate rows), unknown key -> null', () => {
  const ops = openOps(path.join(tmpDir(), 'ops.db'))
  assert.equal(getMeta(ops, 'nope'), null)

  setMeta(ops, 'k1', 'v1')
  assert.equal(getMeta(ops, 'k1'), 'v1')

  setMeta(ops, 'k1', 'v2') // upsert: same key updated, not a second row
  assert.equal(getMeta(ops, 'k1'), 'v2')
  const count = ops.prepare('SELECT COUNT(*) n FROM meta WHERE k=?').get('k1').n
  assert.equal(count, 1)

  setMeta(ops, 'n', 42) // numeric value coerced to string
  assert.equal(getMeta(ops, 'n'), '42')

  ops.close()
})
