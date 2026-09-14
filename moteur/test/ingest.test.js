// ingest.test.js — adversarial suite for src/ingest.js
// Goal: try hard to break the CSV -> SQLite ingest, and above all verify the
// safety invariant: a FAILED ingest must never destroy the previous `articles`.
//
// Run: node --test   (from moteur/), or `npm test`.

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCsv, line, reorder, writeCsv, tmpDir, runIngest, inspect, NO_WEBHOOKS,
  HEAD, ROW1, ROW2, BOM, slug,
} from './support.js'

// Each test gets a fresh isolated dir + DB.
function fresh() {
  const dir = tmpDir()
  return { dir, db: `${dir}/catalog.db` }
}

// Convenience: ingest a CSV text into a fresh db, return {res, info}.
function ingestText(text, name = 'in.csv') {
  const { dir, db } = fresh()
  const csv = writeCsv(dir, name, text)
  const res = runIngest(csv, db)
  return { res, info: inspect(db), db, dir }
}

// Seed a fresh db with a known-good 2-row ingest, then run a broken CSV against
// the SAME db. Returns { res, before, after } so tests can assert the STRICT
// failure AND that the previous `articles` survived untouched.
function seedThenBad(badText, name = 'bad.csv') {
  const { dir, db } = fresh()
  const seed = runIngest(writeCsv(dir, 'seed.csv', buildCsv()), db)
  assert.equal(seed.status, 0, `seed must succeed. stderr=${seed.stderr}`)
  const before = inspect(db)
  assert.equal(before.count, 2)
  const res = runIngest(writeCsv(dir, name, badText), db)
  return { res, before, after: inspect(db) }
}

function assertIntact(before, after) {
  assert.equal(after.exists, true, 'articles must still exist after a failed ingest')
  assert.deepEqual(after.cols, before.cols, 'columns unchanged')
  assert.deepEqual(after.rows, before.rows, 'row data unchanged (no destruction)')
}

// ───────────────────────────────────────────────────────────────────────────
// 1. Nominal: N rows, correct types, comma -> point.
// ───────────────────────────────────────────────────────────────────────────
test('01 nominal valid CSV: rows + types + decimal conversion', () => {
  const { res, info } = ingestText(buildCsv())
  assert.equal(res.status, 0, `ingest should succeed. stderr=${res.stderr}`)
  assert.equal(info.exists, true)
  assert.equal(info.count, 2)

  // types: prices REAL, stock INTEGER, rest TEXT
  assert.equal(info.colTypes.purchase_nett_price, 'REAL')
  assert.equal(info.colTypes.nett_retail_price, 'REAL')
  assert.equal(info.colTypes.weight, 'REAL')
  assert.equal(info.colTypes.stock_availability_chorzow, 'INTEGER')
  assert.equal(info.colTypes.stock_availability_hub, 'INTEGER')
  assert.equal(info.colTypes.prefix, 'TEXT')
  assert.equal(info.colTypes.index, 'TEXT')

  const r0 = info.rows[0]
  assert.equal(r0.prefix, 'JMJ')
  assert.equal(r0.parts_name, 'Catalytic Converter')
  assert.equal(r0.purchase_nett_price, 102.81)      // "102,81" -> 102.81
  assert.equal(r0.nett_retail_price, 228.47)
  assert.equal(r0.weight, 6.7)                        // "6,70" -> 6.7
  assert.equal(r0.stock_availability_chorzow, 14)
  assert.equal(r0.stock_availability_hub, 1)
  // trailing empty 71st column must NOT create a stray column
  assert.equal(info.cols.includes(''), false)
})

// ───────────────────────────────────────────────────────────────────────────
// 2. Reordered columns -> read by name still correct.
// ───────────────────────────────────────────────────────────────────────────
test('02 reordered columns: mapping stays correct (read by name)', () => {
  const perm = [10, 0, 4, 8, 2, 6, 1, 9, 5, 3, 7]  // arbitrary permutation of 11 cols
  const { header, rows } = reorder(HEAD, [ROW1, ROW2], perm)
  const { res, info } = ingestText(buildCsv({ header, rows }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.count, 2)
  const r0 = info.rows.find(r => r.prefix === 'JMJ')
  assert.equal(r0.nett_retail_price, 228.47)
  assert.equal(r0.stock_availability_chorzow, 14)
  assert.equal(r0.weight, 6.7)
  assert.equal(r0.manufacturer, 'JMJ')
})

// ───────────────────────────────────────────────────────────────────────────
// 3. New unknown column -> created + inserted (signalisation now lives in
//    report.js/Discord, NOT stdout — so we only assert the table + no error).
// ───────────────────────────────────────────────────────────────────────────
test('03 new unknown column: created + inserted, no error', () => {
  const header = [...HEAD, 'Turbo flag']
  const rows = [[...ROW1, 'YES'], [...ROW2, 'NO']]
  const { res, info } = ingestText(buildCsv({ header, rows }))
  assert.equal(res.status, 0, res.stderr)
  assert.ok(info.cols.includes('turbo_flag'), 'new column present in table')
  assert.equal(info.rows.find(r => r.prefix === 'JMJ').turbo_flag, 'YES')
  // strict-mode success line format (no per-column noise on stdout anymore)
  assert.match(res.stdout, /✅ ingest OK — 2 lignes · 12 colonnes/)
})

// ───────────────────────────────────────────────────────────────────────────
// 5. Non-critical column missing -> success, column simply absent.
// ───────────────────────────────────────────────────────────────────────────
test('05 non-critical column missing (Barcode): success, absent', () => {
  const header = HEAD.filter(c => c !== 'Barcode')
  const rows = [ROW1, ROW2].map(r => r.filter((_, i) => HEAD[i] !== 'Barcode'))
  const { res, info } = ingestText(buildCsv({ header, rows }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.exists, true)
  assert.equal(info.cols.includes('barcode'), false)
  assert.equal(info.count, 2)
})

// ───────────────────────────────────────────────────────────────────────────
// 6. REAL contract: the file is pure ;-separated, `"` is a LITERAL char (inches,
//    e.g. `1/2"`). A `"` in a field is stored verbatim; no quoting semantics,
//    no column shift. (`quote: false` in src/ingest.js.)
// ───────────────────────────────────────────────────────────────────────────
test('06 double-quote is a literal char (1/2") — stored verbatim, no shift', () => {
  const r = [...ROW1]; r[2] = 'Elbow 1/2" pipe'   // Parts name with a literal inch-mark
  const { res, info } = ingestText(buildCsv({ rows: [r] }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.count, 1)
  const x = info.rows[0]
  assert.equal(x.parts_name, 'Elbow 1/2" pipe')     // kept exactly, quote not stripped
  assert.equal(x.purchase_nett_price, 102.81)        // downstream columns NOT shifted
  assert.equal(x.stock_availability_hub, 1)
})

// ───────────────────────────────────────────────────────────────────────────
// 7. REAL contract: several literal `"` scattered across fields on one line do
//    not trigger any quote handling and do not break/shift the record.
// ───────────────────────────────────────────────────────────────────────────
test('07 multiple literal double-quotes on a line do not break the record', () => {
  const r = [...ROW2]
  r[2] = 'Hose 3/4"'      // Parts name
  r[5] = 'ACME"'          // Manufacturer with a trailing "
  r[7] = '5/8"'           // Barcode (TEXT)
  const { res, info } = ingestText(buildCsv({ rows: [r] }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.count, 1)
  const x = info.rows[0]
  assert.equal(x.parts_name, 'Hose 3/4"')
  assert.equal(x.manufacturer, 'ACME"')
  assert.equal(x.barcode, '5/8"')
  assert.equal(x.nett_retail_price, 19.99)           // no shift
})

// ───────────────────────────────────────────────────────────────────────────
// 9. Non-numeric value in numeric column -> stored NULL, no crash.
// ───────────────────────────────────────────────────────────────────────────
test('09 non-numeric in numeric column -> NULL, no crash', () => {
  const r = [...ROW1]; r[3] = 'abc'; r[9] = 'N/A'  // purchase price + stock chorzow
  const { res, info } = ingestText(buildCsv({ rows: [r] }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.count, 1)
  assert.equal(info.rows[0].purchase_nett_price, null)
  assert.equal(info.rows[0].stock_availability_chorzow, null)
})

// ───────────────────────────────────────────────────────────────────────────
// 11. Header only, 0 data rows -> table empty, no crash.
// ───────────────────────────────────────────────────────────────────────────
test('11 header only, zero data rows -> empty table, exit 0', () => {
  const { res, info } = ingestText(BOM + line(HEAD) + '\n')
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.exists, true)
  assert.equal(info.count, 0)
})

// ───────────────────────────────────────────────────────────────────────────
// 12. BOM and no-BOM both work.
// ───────────────────────────────────────────────────────────────────────────
test('12a with BOM works', () => {
  const { res, info } = ingestText(buildCsv({ bom: true }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.count, 2)
  assert.equal(info.rows.find(r => r.prefix === 'JMJ').prefix, 'JMJ') // no BOM glued to first col
})
test('12b without BOM works', () => {
  const { res, info } = ingestText(buildCsv({ bom: false }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.count, 2)
})

// ───────────────────────────────────────────────────────────────────────────
// 13. CRLF and LF both work.
// ───────────────────────────────────────────────────────────────────────────
test('13a CRLF line endings work', () => {
  const { res, info } = ingestText(buildCsv({ eol: '\r\n' }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.count, 2)
  assert.equal(info.rows.find(r => r.prefix === 'JMJ').stock_availability_hub, 1) // last col not polluted by \r
})
test('13b LF line endings work', () => {
  const { res, info } = ingestText(buildCsv({ eol: '\n' }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.count, 2)
})

// ───────────────────────────────────────────────────────────────────────────
// 14. Trailing ; (empty 71st column) ignored; also test WITHOUT trailing ;.
// ───────────────────────────────────────────────────────────────────────────
test('14a trailing ; (empty last col) ignored', () => {
  const { res, info } = ingestText(buildCsv({ trailingSemi: true }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.cols.length, HEAD.length)   // no extra empty-name column
})
test('14b no trailing ; also works', () => {
  const { res, info } = ingestText(buildCsv({ trailingSemi: false }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.count, 2)
  assert.equal(info.cols.length, HEAD.length)
})

// ───────────────────────────────────────────────────────────────────────────
// 15. Duplicate rows -> all inserted (no silent dedup).
// ───────────────────────────────────────────────────────────────────────────
test('15 duplicate rows: all inserted, no dedup', () => {
  const { res, info } = ingestText(buildCsv({ rows: [ROW1, ROW1, ROW1] }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.count, 3)
})

// ───────────────────────────────────────────────────────────────────────────
// 16. Decimal edge cases: negative, zero, empty, comma.
// ───────────────────────────────────────────────────────────────────────────
test('16 numeric edge cases: negative / zero / empty / comma', () => {
  const rNeg = [...ROW1]; rNeg[3] = '-12,50'; rNeg[9] = '-3'
  const rZero = [...ROW1]; rZero[0] = 'ZERO'; rZero[3] = '0'; rZero[4] = '0,00'; rZero[9] = '0'
  const rEmpty = [...ROW1]; rEmpty[0] = 'EMPTY'; rEmpty[3] = ''; rEmpty[4] = ''; rEmpty[9] = ''
  const { res, info } = ingestText(buildCsv({ rows: [rNeg, rZero, rEmpty] }))
  assert.equal(res.status, 0, res.stderr)
  const neg = info.rows[0], zero = info.rows[1], empty = info.rows[2]
  assert.equal(neg.purchase_nett_price, -12.5)
  assert.equal(neg.stock_availability_chorzow, -3)
  assert.equal(zero.purchase_nett_price, 0)
  assert.equal(zero.nett_retail_price, 0)
  assert.equal(zero.stock_availability_chorzow, 0)
  assert.equal(empty.purchase_nett_price, null)
  assert.equal(empty.nett_retail_price, null)
  assert.equal(empty.stock_availability_chorzow, null)
})

// (Strict field-count tests 18a/18b + 23 live further below, next to the
//  coercion tests — they now assert fail-fast, not the old relaxed behavior.)

// ───────────────────────────────────────────────────────────────────────────
// Extra: all-empty-but-delimited row is NOT skipped -> junk all-NULL row inserted.
// ───────────────────────────────────────────────────────────────────────────
test('EX all-empty delimited row (;;;;) is inserted as junk row', () => {
  const junk = line(HEAD.map(() => ''))  // ";;;;;;;;;;;"
  const full = BOM + [line(HEAD), junk].join('\n') + '\n'
  const { res, info } = ingestText(full)
  assert.equal(res.status, 0, res.stderr)
  // Observed behavior recorded for the report:
  console.log(`   [EX] all-empty row -> inserted count=${info.count}`)
  assert.equal(info.count, 1)
})

// ───────────────────────────────────────────────────────────────────────────
// 19. Very large single field (light DoS / memory probe).
// ───────────────────────────────────────────────────────────────────────────
test('19 very large single field is ingested without crash', () => {
  const big = 'x'.repeat(2_000_000)   // ~2 MB in one field
  const r = [...ROW1]; r[2] = big
  const { res, info } = ingestText(buildCsv({ rows: [r] }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.count, 1)
  assert.equal(info.rows[0].parts_name.length, big.length)
})

// ───────────────────────────────────────────────────────────────────────────
// STRICT (P3): a value not matching /^-?\d+([.,]\d+)?$/ -> NULL (no swallowing)
//   and is counted. A well-formed comma-decimal still parses; ints truncate.
//   Anti-regression: "12,5abc"/"99,90 PLN" must be NULL, NOT 12.5/99.9.
// ───────────────────────────────────────────────────────────────────────────
test('22 non-conforming numeric -> NULL (not swallowed), row still inserted', () => {
  const r = [...ROW1]
  r[3] = '12,5abc'   // purchase_nett_price REAL -> NULL (garbage suffix)
  r[4] = '99,90 PLN' // nett_retail_price REAL -> NULL (unit suffix)
  r[9] = '1,9'       // stock chorzow INTEGER -> well-formed -> truncated to 1
  r[10] = '  7  '    // stock hub INTEGER with spaces -> 7
  const { res, info } = ingestText(buildCsv({ rows: [r] }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.count, 1, 'row still inserted (no abort on coercion)')
  const x = info.rows[0]
  assert.equal(x.purchase_nett_price, null, '"12,5abc" -> NULL (not 12.5)')
  assert.equal(x.nett_retail_price, null, '"99,90 PLN" -> NULL (not 99.9)')
  assert.equal(x.stock_availability_chorzow, 1, '"1,9" -> trunc -> 1')
  assert.equal(x.stock_availability_hub, 7)
  // counter surfaced on the success line (2 non-conforming values)
  assert.match(res.stdout, /· 2 valeurs non conformes→NULL/)
})

// ───────────────────────────────────────────────────────────────────────────
// STRICT (P1): an UNQUOTED ';' inside a field makes the row have the wrong
//   field count. With relax_column_count OFF this now ABORTS the whole ingest
//   (fail-fast) instead of silently shifting+committing. Previous data intact.
// ───────────────────────────────────────────────────────────────────────────
test('23 unquoted ; inside a field -> STRICT abort (exit!=0), previous data intact', () => {
  const badRow = 'JMJ;1091132;Kit; 5 pcs;102,81;228,47;JMJ;JMJ1091132;5901436521129;6,70;14;1;'
  const { res, before, after } = seedThenBad(BOM + [line(HEAD), badRow].join('\n') + '\n')
  assert.notEqual(res.status, 0, 'wrong field count must abort (relax OFF)')
  assertIntact(before, after)
})

// ───────────────────────────────────────────────────────────────────────────
// STRICT (P1): too many / too few fields both abort now (relax OFF).
// ───────────────────────────────────────────────────────────────────────────
test('18a too many fields -> STRICT abort (exit!=0), previous data intact', () => {
  const long = line([...ROW1, 'EXTRA1', 'EXTRA2'])
  const { res, before, after } = seedThenBad(BOM + [line(HEAD), long].join('\n') + '\n')
  assert.notEqual(res.status, 0, 'extra fields must abort')
  assertIntact(before, after)
})
test('18b too few fields -> STRICT abort (exit!=0), previous data intact', () => {
  const short = 'JMJ;1091132;Catalytic Converter;102,81;'  // only 5 fields
  const { res, before, after } = seedThenBad(BOM + [line(HEAD), short].join('\n') + '\n')
  assert.notEqual(res.status, 0, 'missing fields must abort')
  assertIntact(before, after)
})

// ───────────────────────────────────────────────────────────────────────────
// NEW (a): coercion counter is exact + surfaced. 3 non-conforming values.
// ───────────────────────────────────────────────────────────────────────────
test('NEW coercion counter is exact on the success line', () => {
  const r = [...ROW1]
  r[3] = 'n/a'       // REAL -> NULL (+1)
  r[4] = '12.3.4'    // REAL, malformed -> NULL (+1)
  r[9] = 'lots'      // INTEGER -> NULL (+1)
  r[10] = '5'        // INTEGER ok
  const { res, info } = ingestText(buildCsv({ rows: [r] }))
  assert.equal(res.status, 0, res.stderr)
  assert.equal(info.rows[0].stock_availability_hub, 5)
  assert.match(res.stdout, /· 3 valeurs non conformes→NULL/, 'counter must read exactly 3')
})

// ───────────────────────────────────────────────────────────────────────────
// NEW (b): a malformed row makes ingest exit 1 AND emit a rich failure log
//   (step + error), while the previous articles stay intact (the alert's
//   "DB préservée" guarantee). Webhook empty => alert title logged to stdout.
// ───────────────────────────────────────────────────────────────────────────
test('NEW malformed row -> exit 1 + rich failure log + DB preserved', () => {
  const long = line([...ROW1, 'EXTRA'])   // wrong field count
  const { res, before, after } = seedThenBad(BOM + [line(HEAD), long].join('\n') + '\n')
  assert.equal(res.status, 1, 'must exit 1')
  assert.match(res.stderr, /🔴 ÉCHEC/, 'rich failure logged to stderr')
  assert.match(res.stderr, /chargement/, 'failing step reported')
  assert.match(res.stdout, /\(no webhook\).*Ingest ÉCHEC/, 'failure alert built (would post to Discord)')
  assertIntact(before, after)   // the "DB préservée" promise
})

// ───────────────────────────────────────────────────────────────────────────
// 20. Concurrency probe (tolerant): two ingests race on the same DB.
//   We only require: no corruption, DB stays readable, and the winner's
//   `articles` is complete (not a partial write).
// ───────────────────────────────────────────────────────────────────────────
test('20 concurrent ingests on same DB: no corruption', async () => {
  const { dir, db } = fresh()
  const a = writeCsv(dir, 'a.csv', buildCsv({ rows: [ROW1, ROW2] }))
  const b = writeCsv(dir, 'b.csv', buildCsv({ rows: [ROW1] }))
  const { spawn } = await import('node:child_process')
  const run = (csv, tag) => new Promise((resolve) => {
    const cp = spawn(process.execPath, ['src/ingest.js', csv], {
      cwd: (new URL('..', import.meta.url)).pathname,
      env: { ...process.env, DB_PATH: db, OPS_PATH: `${db}.${tag}.ops`, ...NO_WEBHOOKS },
    })
    let err = ''
    cp.stderr.on('data', d => { err += d })
    cp.on('close', code => resolve({ code, err }))
  })
  const [ra, rb] = await Promise.all([run(a, 'a'), run(b, 'b')])
  const info = inspect(db)
  console.log(`   [20] codes=${ra.code}/${rb.code} finalCount=${info.exists ? info.count : 'no-table'}`)
  // At least one must succeed; the DB must remain readable & consistent.
  assert.ok(ra.code === 0 || rb.code === 0, 'at least one ingest should win')
  assert.equal(info.exists, true, 'articles must exist and be queryable')
  assert.ok(info.count === 1 || info.count === 2, 'complete row set from a winner, not partial')
})

console.log('--- loaded ingest.test.js ---')
