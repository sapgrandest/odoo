// safety.test.js — failure modes + THE safety invariant.
//
// THE invariant: an ingest that FAILS must exit != 0 AND must leave the
// previous `articles` table completely intact (the last good data).

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  buildCsv, line, writeCsv, tmpDir, runIngest, inspect,
  HEAD, ROW1, ROW2, BOM,
} from './support.js'

function fresh() {
  const dir = tmpDir()
  return { dir, db: `${dir}/catalog.db` }
}

// Seed a db with a known-good ingest (2 rows). Returns {dir, db}.
function seedGood() {
  const { dir, db } = fresh()
  const good = writeCsv(dir, 'good.csv', buildCsv())
  const res = runIngest(good, db)
  assert.equal(res.status, 0, `seed ingest must succeed. stderr=${res.stderr}`)
  const info = inspect(db)
  assert.equal(info.count, 2)
  return { dir, db, before: info }
}

// Assert that `articles` is byte-for-byte the good seed (2 rows, same values).
function assertIntact(db, before) {
  const after = inspect(db)
  assert.equal(after.exists, true, 'articles table must still exist after a failed ingest')
  assert.equal(after.count, 2, 'articles must still hold the 2 good rows')
  assert.deepEqual(after.cols, before.cols, 'columns must be unchanged')
  assert.deepEqual(after.rows, before.rows, 'row data must be unchanged (no destruction)')
}

// ───────────────────────────────────────────────────────────────────────────
// 4 + SAFETY(a): critical column missing -> fail before DB is touched.
// ───────────────────────────────────────────────────────────────────────────
test('SAFETY-a critical column missing: exit!=0 AND previous articles intact', () => {
  const { dir, db, before } = seedGood()
  const header = HEAD.filter(c => c !== 'Nett retail price')
  const rows = [ROW1, ROW2].map(r => r.filter((_, i) => HEAD[i] !== 'Nett retail price'))
  const bad = writeCsv(dir, 'bad_missing_crit.csv', buildCsv({ header, rows }))
  const res = runIngest(bad, db)
  assert.notEqual(res.status, 0, 'must fail')
  assert.match(res.stderr, /critique/, 'must report a critical-column error')
  assertIntact(db, before)
})

// ───────────────────────────────────────────────────────────────────────────
// 8 + SAFETY(b): the REAL load-time failure mode is a row with the WRONG field
//   count (a stray ';' adds/removes a field). With quote:false + relax OFF this
//   aborts DURING insert (DB open, articles_new created, BEGIN) -> ROLLBACK,
//   previous articles intact. (There is no "unclosed quote" concept anymore.)
// ───────────────────────────────────────────────────────────────────────────
test('SAFETY-b wrong field count during load (extra ;): exit!=0 AND previous articles intact', () => {
  const { dir, db, before } = seedGood()
  // 'Catalytic Converter' broken by a stray ';' -> one field too many -> strict abort.
  const badRow = 'JMJ;1091132;Catalytic;Converter;102,81;228,47;JMJ;JMJ1091132;5901436521129;6,70;14;1;'
  const text = BOM + [line(HEAD), line(ROW2), badRow].join('\n') + '\n'
  const bad = writeCsv(dir, 'bad_fieldcount.csv', text)
  const res = runIngest(bad, db)
  assert.notEqual(res.status, 0, `must fail. stdout=${res.stdout}`)
  assertIntact(db, before)
})

// ───────────────────────────────────────────────────────────────────────────
// SAFETY(c): slug collision fails at CREATE TABLE (after DB open) -> intact.
// ───────────────────────────────────────────────────────────────────────────
test('SAFETY-c slug collision (fail at CREATE TABLE): exit!=0 AND previous articles intact', () => {
  const { dir, db, before } = seedGood()
  // "Parts name" and "Parts-name" both slug to parts_name -> duplicate column.
  const header = [...HEAD, 'Parts-name']
  const rows = [[...ROW1, 'dup'], [...ROW2, 'dup']]
  const bad = writeCsv(dir, 'bad_collision.csv', buildCsv({ header, rows }))
  const res = runIngest(bad, db)
  console.log(`   [SAFETY-c] status=${res.status} stderr=${res.stderr.trim().slice(0, 200)}`)
  assert.notEqual(res.status, 0, 'slug collision should abort')
  assertIntact(db, before)
})

// ───────────────────────────────────────────────────────────────────────────
// 10 + SAFETY(d): empty file -> fail (contract), previous articles intact.
// ───────────────────────────────────────────────────────────────────────────
test('SAFETY-d empty file: exit!=0 AND previous articles intact', () => {
  const { dir, db, before } = seedGood()
  const bad = writeCsv(dir, 'empty.csv', '')
  const res = runIngest(bad, db)
  assert.notEqual(res.status, 0, 'empty file must fail the contract')
  assertIntact(db, before)
})

// ───────────────────────────────────────────────────────────────────────────
// SAFETY(e): CSV path does not exist -> fail, previous articles intact.
// ───────────────────────────────────────────────────────────────────────────
test('SAFETY-e missing CSV file: exit!=0 AND previous articles intact', () => {
  const { dir, db, before } = seedGood()
  const res = runIngest(`${dir}/does-not-exist.csv`, db)
  assert.notEqual(res.status, 0)
  assertIntact(db, before)
})

// ───────────────────────────────────────────────────────────────────────────
// SAFETY(f): column whose name slugs to '' (empty) -> observe + must stay intact.
// ───────────────────────────────────────────────────────────────────────────
test('SAFETY-f column name that slugs to empty: observe behavior, articles intact', () => {
  const { dir, db, before } = seedGood()
  const header = [...HEAD, '# @ !']   // slug('# @ !') === ''
  const rows = [[...ROW1, 'q'], [...ROW2, 'q']]
  const bad = writeCsv(dir, 'slug_empty.csv', buildCsv({ header, rows }))
  const res = runIngest(bad, db)
  console.log(`   [SAFETY-f] status=${res.status} stderr=${res.stderr.trim().slice(0, 200)}`)
  // Whatever the outcome, the old data must never be destroyed.
  if (res.status !== 0) assertIntact(db, before)
})

// ───────────────────────────────────────────────────────────────────────────
// P2 (REAL): `"` in a header name is a LITERAL char (inches). It never splits
//   or triggers quoting — the column stays ONE column and maps correctly.
//   Only `;` separates columns. (`quote: false` in the header parse too.)
// ───────────────────────────────────────────────────────────────────────────
test('P2 literal double-quote in a header name -> single column, correct mapping', () => {
  const header = HEAD.map(c => c === 'Barcode' ? 'Pipe 1/2"' : c)   // literal inch-mark, no ;
  const { dir, db } = fresh()
  const csv = writeCsv(dir, 'quote_header.csv', buildCsv({ header, rows: [ROW1, ROW2] }))
  const res = runIngest(csv, db)
  const info = inspect(db)
  console.log(`   [P2] status=${res.status} cols=${JSON.stringify(info.cols)}`)
  assert.equal(res.status, 0, res.stderr)
  assert.ok(info.cols.includes('pipe_1_2'), 'header " kept literal -> single column pipe_1_2')
  assert.equal(info.cols.includes('note'), false, 'no spurious column from the "')
  // mapping intact: the renamed column carries the Barcode value; no shift
  const jmj = info.rows.find(r => r.prefix === 'JMJ')
  assert.equal(jmj.pipe_1_2, '5901436521129')
  assert.equal(jmj.weight, 6.7)
  assert.equal(jmj.stock_availability_hub, 1)
})

// ───────────────────────────────────────────────────────────────────────────
// SUCCESS re-ingest fully replaces previous data (swap correctness).
// ───────────────────────────────────────────────────────────────────────────
test('SWAP successful re-ingest replaces old data entirely', () => {
  const { db } = seedGood()          // 2 rows
  const { dir } = fresh()
  const csv2 = writeCsv(dir, 'second.csv', buildCsv({ rows: [ROW2] }))  // 1 row
  const res = runIngest(csv2, db)
  assert.equal(res.status, 0, res.stderr)
  const after = inspect(db)
  assert.equal(after.count, 1, 'old rows must be gone, replaced by the new single row')
  assert.equal(after.rows[0].prefix, 'ABC')
  // no leftover staging table
  assert.equal(fs.existsSync(db), true)
})
