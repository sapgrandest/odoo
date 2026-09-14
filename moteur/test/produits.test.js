// produits.test.js — end-to-end suite for the `produits` table build + the
// revised swap in src/ingest.js (M4 fix: dedup by motonet must pick a REAL,
// whole source row via MIN(rowid) — never a column-wise "Frankenstein" mix).
//
// Covers: dedup correctness (no Frankenstein), articles-keeps-duplicates vs
// produits-is-deduped, column-aware build (subset CSV), indexes present,
// re-ingest rotation (produits_prev appears, articles_prev never does),
// VACUUM (no bloat), and the safety invariant extended to `produits`.
//
// This file writes NOTHING under src/ and does not modify test/support.js —
// all DB introspection beyond support.js's `inspect()` (which only reads
// `articles`) is done locally with better-sqlite3.
//
// Run: node --test test/produits.test.js   (from moteur/), or `npm test`.

import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import {
  buildCsv, line, writeCsv, tmpDir, runIngest, inspect,
  HEAD, ROW1, ROW2, BOM, CRITICAL,
} from './support.js'

function fresh() {
  const dir = tmpDir()
  return { dir, db: `${dir}/catalog.db` }
}

// ── Local DB introspection (beyond support.js's articles-only `inspect`) ──
function tableExists(db, name) {
  return !!db.prepare("SELECT 1 x FROM sqlite_master WHERE type='table' AND name=?").get(name)
}
function tableInfo(db, name) {
  if (!tableExists(db, name)) return null
  const cols = db.prepare(`PRAGMA table_info("${name}")`).all().map(c => c.name)
  const rows = db.prepare(`SELECT * FROM "${name}"`).all()
  return { cols, rows, count: rows.length }
}
// Full snapshot of everything this suite cares about. Opens read-only, closes itself.
function inspectFull(dbPath) {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true })
  try {
    return {
      articles: tableInfo(db, 'articles'),
      produits: tableInfo(db, 'produits'),
      produits_prev: tableInfo(db, 'produits_prev'),
      articles_prev_exists: tableExists(db, 'articles_prev'),
      indexes: db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index'").all(),
      freelist_count: db.pragma('freelist_count', { simple: true }),
    }
  } finally { db.close() }
}
// Does there exist, in `articles`, a SINGLE row that simultaneously matches
// every column of `produitsRow`? If yes, the produits row is a verbatim copy
// of one real source row — not a column-wise mix ("Frankenstein") of several.
function existsSingleMatchingArticleRow(dbPath, produitsRow, cols) {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true })
  try {
    const clauses = cols.map(c => `("${c}" IS ?)`).join(' AND ')
    const vals = cols.map(c => produitsRow[c])
    return db.prepare(`SELECT COUNT(*) n FROM articles WHERE ${clauses}`).get(...vals).n
  } finally { db.close() }
}

// ───────────────────────────────────────────────────────────────────────────
// 1. DEDUP (M4, critical): 3 rows share ONE motonet, all DIVERGENT on every
//    field that matters commercially (manufacturer, prices, stock, weight,
//    barcode, parts_name). If dedup were a column-wise aggregate (e.g. MIN
//    price, MAX stock, alphabetical manufacturer) instead of "pick one real
//    row via MIN(rowid)", at least one field below would come from the WRONG
//    donor row. rowA is first in the file => MIN(rowid) => must win whole.
// ───────────────────────────────────────────────────────────────────────────
const rowA = ['AAA', '1001', 'Widget A', '10,00', '20,00', 'MANU-A', 'DUPE001', 'BC-AAA', '1,00', '5', '2']
const rowB = ['BBB', '2002', 'Widget B', '1,00', '2,00', 'AAA-FIRST-ALPHA', 'DUPE001', 'BC-BBB', '99,99', '999', '50']
const rowC = ['CCC', '3003', 'Widget C', '999,99', '1500,00', 'ZZZ-LAST-ALPHA', 'DUPE001', 'BC-CCC', '0,01', '0', '0']
// rowB has the smallest price + biggest stock + alphabetically-first manufacturer;
// rowC has the biggest price + zero stock + alphabetically-last manufacturer.
// Any MIN()/MAX()/ORDER BY aggregate bug would leak B or C's values into the
// winning row. Only a true "whole row via MIN(rowid)" pick reproduces rowA.

test('01 dedup picks ONE real source row (MIN rowid), not a column-wise mix', () => {
  const { dir, db } = fresh()
  const rows = [rowA, rowB, rowC, ROW2]   // rowA first in file for motonet DUPE001; ROW2 = distinct motonet control
  const csv = writeCsv(dir, 'dup.csv', buildCsv({ rows }))
  const res = runIngest(csv, db)
  assert.equal(res.status, 0, `ingest should succeed. stderr=${res.stderr}`)

  const full = inspectFull(db)
  assert.equal(full.articles.count, 4, 'articles keeps all 4 raw rows (mirror)')
  assert.equal(full.produits.count, 2, 'produits deduped to 2 (DUPE001 once + ABC555)')

  const p = full.produits.rows.find(r => r.motonet_number === 'DUPE001')
  assert.ok(p, 'a produits row exists for the duplicated motonet')

  // (a) exact expected values: must match rowA field-for-field, never B or C's.
  assert.equal(p.prefix, 'AAA')
  assert.equal(p.index, '1001')
  assert.equal(p.parts_name, 'Widget A')
  assert.equal(p.manufacturer, 'MANU-A')
  assert.equal(p.purchase_nett_price, 10)
  assert.equal(p.nett_retail_price, 20)
  assert.equal(p.stock_availability_chorzow, 5)
  assert.equal(p.stock_availability_hub, 2)
  assert.equal(p.barcode, 'BC-AAA')
  assert.equal(p.weight, 1)

  // (b) generic Frankenstein-detector: every column of the produits row must
  // be simultaneously satisfiable by ONE row in `articles` (not synthesized
  // by combining fields from different donor rows).
  const n = existsSingleMatchingArticleRow(db, p, full.produits.cols)
  assert.ok(n >= 1, 'produits row must be a verbatim copy of a single articles row, not a mix')
})

// ───────────────────────────────────────────────────────────────────────────
// 2. articles is the raw mirror (keeps ALL duplicates); produits is strictly
//    deduped (count < count when duplicates exist). Cross-checked against an
//    independent COUNT(DISTINCT motonet_number) computed straight off articles.
// ───────────────────────────────────────────────────────────────────────────
test('02 articles keeps duplicates (mirror); produits count == distinct motonet count', () => {
  const { dir, db } = fresh()
  const rows = [rowA, rowB, rowC, ROW2, ROW2]   // ROW2 duplicated too, on top of the DUPE001 trio
  const csv = writeCsv(dir, 'dup2.csv', buildCsv({ rows }))
  const res = runIngest(csv, db)
  assert.equal(res.status, 0, res.stderr)

  const full = inspectFull(db)
  assert.equal(full.articles.count, 5, 'articles: no silent dedup on the raw mirror')
  assert.ok(full.produits.count < full.articles.count, 'produits must be strictly smaller when duplicates exist')

  const sqliteDb = new Database(db, { readonly: true })
  const distinct = sqliteDb.prepare(
    "SELECT COUNT(DISTINCT motonet_number) n FROM articles WHERE motonet_number IS NOT NULL AND motonet_number <> ''"
  ).get().n
  sqliteDb.close()
  assert.equal(full.produits.count, distinct, 'produits row count == distinct non-empty motonet count in articles')
  assert.equal(full.produits.count, 2, 'DUPE001 x3 + ABC555 x2 -> 2 distinct motonets')
})

// ───────────────────────────────────────────────────────────────────────────
// 3. Column-aware build: a CSV reduced to ONLY the 9 critical columns must
//    still build `produits` without error (no "no such column"), with EXACTLY
//    the columns that are actually present (subset of the full `wanted` list).
// ───────────────────────────────────────────────────────────────────────────
test('03 CSV with only the 9 critical columns: produits builds, column-subset only', () => {
  const header = CRITICAL   // ['Prefix','Index','Motonet number','Parts name','Purchase nett price',
                             //  'Nett retail price','Stock availability - Chorzów','Stock availability - HUB','Manufacturer']
  const r1 = ['JMJ', '1091132', 'JMJ1091132', 'Catalytic Converter', '102,81', '228,47', '14', '1', 'JMJ']
  const r2 = ['ABC', '555', 'ABC555', 'Brake Pad', '10,00', '19,99', '0', '3', 'ABC']
  const { dir, db } = fresh()
  const csv = writeCsv(dir, 'critonly.csv', buildCsv({ header, rows: [r1, r2] }))
  const res = runIngest(csv, db)
  assert.equal(res.status, 0, `must succeed on a minimal critical-only header. stderr=${res.stderr}`)
  assert.doesNotMatch(res.stderr, /no such column/i)

  const full = inspectFull(db)
  assert.ok(full.produits, 'produits table exists')
  const expectedCols = [
    'motonet_number', 'prefix', 'index', 'manufacturer', 'parts_name',
    'purchase_nett_price', 'nett_retail_price', 'stock_availability_chorzow', 'stock_availability_hub',
  ]
  assert.deepEqual([...full.produits.cols].sort(), [...expectedCols].sort(),
    'produits has exactly the present-column subset of `wanted`, nothing invented')
  assert.equal(full.produits.count, 2)
  const jmj = full.produits.rows.find(r => r.motonet_number === 'JMJ1091132')
  assert.equal(jmj.manufacturer, 'JMJ')
  assert.equal(jmj.purchase_nett_price, 102.81)
  assert.equal(jmj.nett_retail_price, 228.47)
})

// ───────────────────────────────────────────────────────────────────────────
// 4. Indexes: after a (first) ingest, sqlite_master carries the expected
//    indexes, and ix_pn_motonet is UNIQUE.
// ───────────────────────────────────────────────────────────────────────────
test('04 indexes present after ingest; ix_pn_motonet is UNIQUE', () => {
  const { dir, db } = fresh()
  const csv = writeCsv(dir, 'idx.csv', buildCsv())
  const res = runIngest(csv, db)
  assert.equal(res.status, 0, res.stderr)

  const sqliteDb = new Database(db, { readonly: true })
  try {
    const names = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(r => r.name)
    for (const n of ['ix_pn_motonet', 'ix_pn_manuf', 'ix_an_motonet', 'ix_an_manuf']) {
      assert.ok(names.includes(n), `expected index ${n} to exist, got: ${names.join(', ')}`)
    }
    const list = sqliteDb.prepare('PRAGMA index_list(produits)').all()
    const pnMotonet = list.find(i => i.name === 'ix_pn_motonet')
    assert.ok(pnMotonet, 'ix_pn_motonet listed on produits')
    assert.equal(pnMotonet.unique, 1, 'ix_pn_motonet must be UNIQUE (motonet is the dedup key)')
    // first-ever ingest into a fresh db: no previous produits -> no produits_prev index yet.
    assert.equal(names.includes('ix_pp_motonet'), false, 'ix_pp_motonet only appears once produits_prev exists')
  } finally { sqliteDb.close() }
})

// ───────────────────────────────────────────────────────────────────────────
// 5. Re-ingest: 2nd ingest rotates produits -> produits_prev (matching the
//    OLD data exactly); articles_prev must NEVER exist (comment in ingest.js:
//    "plus d'articles_prev"); no "index already exists" error.
// ───────────────────────────────────────────────────────────────────────────
test('05 re-ingest: produits_prev appears with old data, articles_prev never exists', () => {
  const { dir, db } = fresh()
  const csv1 = writeCsv(dir, 'first.csv', buildCsv({ rows: [ROW1, ROW2] }))
  const res1 = runIngest(csv1, db)
  assert.equal(res1.status, 0, res1.stderr)
  const afterFirst = inspectFull(db)
  assert.equal(afterFirst.produits.count, 2)
  assert.equal(afterFirst.produits_prev, null, 'no produits_prev on the very first ingest')
  assert.equal(afterFirst.articles_prev_exists, false)

  const csv2 = writeCsv(dir, 'second.csv', buildCsv({ rows: [ROW2] }))   // different data set
  const res2 = runIngest(csv2, db)
  assert.equal(res2.status, 0, `2nd ingest must succeed. stderr=${res2.stderr}`)
  assert.doesNotMatch(res2.stderr, /already exists/i, 'no "index already exists" on re-ingest')

  const afterSecond = inspectFull(db)
  assert.equal(afterSecond.produits.count, 1, 'new produits reflects the 2nd CSV')
  assert.equal(afterSecond.produits.rows[0].motonet_number, 'ABC555')

  assert.ok(afterSecond.produits_prev, 'produits_prev must exist after the 2nd ingest')
  assert.equal(afterSecond.produits_prev.count, 2, 'produits_prev == what produits held before this run')
  const prevMotonets = afterSecond.produits_prev.rows.map(r => r.motonet_number).sort()
  assert.deepEqual(prevMotonets, ['ABC555', 'JMJ1091132'])

  assert.equal(afterSecond.articles_prev_exists, false, 'articles_prev must never exist (design: swap drops it)')

  const sqliteDb = new Database(db, { readonly: true })
  const names = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(r => r.name)
  sqliteDb.close()
  assert.ok(names.includes('ix_pp_motonet'), 'ix_pp_motonet created now that produits_prev exists')
  assert.ok(names.includes('ix_pn_motonet') && names.includes('ix_an_motonet'))
})

// ───────────────────────────────────────────────────────────────────────────
// 6. VACUUM: after ingest, no bloat (freelist_count == 0). Checked after a
//    fresh ingest AND after a re-ingest (swap + drops could otherwise leak
//    free pages if VACUUM were skipped/misplaced).
// ───────────────────────────────────────────────────────────────────────────
test('06 VACUUM: freelist_count is 0 after ingest, and after re-ingest', () => {
  const { dir, db } = fresh()
  const csv1 = writeCsv(dir, 'v1.csv', buildCsv({ rows: [ROW1, ROW2] }))
  const res1 = runIngest(csv1, db)
  assert.equal(res1.status, 0, res1.stderr)
  assert.equal(inspectFull(db).freelist_count, 0, 'no bloat after a single ingest')

  const csv2 = writeCsv(dir, 'v2.csv', buildCsv({ rows: [ROW1] }))
  const res2 = runIngest(csv2, db)
  assert.equal(res2.status, 0, res2.stderr)
  assert.equal(inspectFull(db).freelist_count, 0, 'no bloat after a re-ingest (swap + drops fully VACUUMed)')
})

// ───────────────────────────────────────────────────────────────────────────
// 7. Safety preserved: a failing ingest (malformed CSV, wrong field count)
//    must leave BOTH `articles` AND `produits` from the previous good run
//    completely untouched (extends the articles-only safety invariant).
// ───────────────────────────────────────────────────────────────────────────
test('07 failed ingest leaves previous articles AND produits fully intact', () => {
  const { dir, db } = fresh()
  const seed = runIngest(writeCsv(dir, 'seed.csv', buildCsv({ rows: [ROW1, ROW2] })), db)
  assert.equal(seed.status, 0, `seed must succeed. stderr=${seed.stderr}`)
  const before = inspectFull(db)
  assert.equal(before.articles.count, 2)
  assert.equal(before.produits.count, 2)

  // Wrong field count (stray ';' splits a field) -> STRICT abort during "chargement".
  const badRow = 'JMJ;1091132;Kit; 5 pcs;102,81;228,47;JMJ;JMJ1091132;5901436521129;6,70;14;1;'
  const bad = writeCsv(dir, 'bad.csv', BOM + [line(HEAD), badRow].join('\n') + '\n')
  const res = runIngest(bad, db)
  assert.notEqual(res.status, 0, 'malformed CSV must abort')

  const after = inspectFull(db)
  assert.equal(after.articles.exists !== false, true)
  assert.deepEqual(after.articles.cols, before.articles.cols, 'articles columns unchanged')
  assert.deepEqual(after.articles.rows, before.articles.rows, 'articles rows unchanged (no destruction)')
  assert.ok(after.produits, 'produits must still exist')
  assert.deepEqual(after.produits.cols, before.produits.cols, 'produits columns unchanged')
  assert.deepEqual(after.produits.rows, before.produits.rows, 'produits rows unchanged (no destruction, no partial swap)')
  // failure happens before the swap step -> produits_prev must not have been created by this failed attempt.
  assert.equal(after.produits_prev, null, 'a failed ingest must not rotate produits -> produits_prev')
})

console.log('--- loaded produits.test.js ---')
