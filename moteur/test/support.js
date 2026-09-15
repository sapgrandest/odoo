// support.js — helpers for the adversarial ingest test suite.
// Zero external deps beyond what the project already ships (better-sqlite3).
// Tests are hermetic: each builds its own CSV bytes into an isolated tmp dir
// and runs `node src/ingest.js <csv>` with a private DB_PATH.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const MOTEUR_ROOT = path.resolve(__dirname, '..')
export const INGEST = path.join(MOTEUR_ROOT, 'src', 'ingest.js')
export const BOM = '﻿'

// slug() — copied verbatim from src/ingest.js so tests reason about real slugs.
export const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

// The 9 critical columns (exact strings, must match src/ingest.js CRITICAL).
export const CRITICAL = [
  'Prefix', 'Index', 'Motonet number', 'Parts name',
  'Purchase nett price', 'Nett retail price',
  'Stock availability - Chorzów', 'Stock availability - HUB', 'Manufacturer',
]

// Canonical minimal-but-valid header: the 9 criticals + 2 non-critical typed
// columns (Barcode TEXT, Weight REAL). All 9 criticals present => contract OK.
// Order chosen to look plausible; ingest reads by NAME so order is irrelevant.
export const HEAD = [
  'Prefix', 'Index', 'Parts name', 'Purchase nett price', 'Nett retail price',
  'Manufacturer', 'Motonet number', 'Barcode', 'Weight',
  'Stock availability - Chorzów', 'Stock availability - HUB',
]

// Two canonical data rows aligned to HEAD (decimals use the comma, like the real file).
export const ROW1 = ['JMJ', '1091132', 'Catalytic Converter', '102,81', '228,47',
  'JMJ', 'JMJ1091132', '5901436521129', '6,70', '14', '1']
export const ROW2 = ['ABC', '555', 'Brake Pad', '10,00', '19,99',
  'ABC', 'ABC555', '12345', '0,50', '0', '3']

// Join a list of fields into one CSV line, mirroring the real file's trailing ';'
// (the empty 71st column). Set trailingSemi:false to omit it.
export const line = (fields, trailingSemi = true) =>
  fields.join(';') + (trailingSemi ? ';' : '')

// Build full CSV text. rows = array of field-arrays. Options: header override,
// bom, eol ('\n' | '\r\n'), trailingSemi, finalNewline.
export function buildCsv({
  header = HEAD, rows = [ROW1, ROW2], bom = true, eol = '\n',
  trailingSemi = true, finalNewline = true,
} = {}) {
  const lines = [line(header, trailingSemi), ...rows.map(r => line(r, trailingSemi))]
  return (bom ? BOM : '') + lines.join(eol) + (finalNewline ? eol : '')
}

// Reorder header + rows by a permutation of column indices (for the read-by-name test).
export function reorder(header, rows, perm) {
  return {
    header: perm.map(i => header[i]),
    rows: rows.map(r => perm.map(i => r[i])),
  }
}

const _tmpDirs = []
export function tmpDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-test-'))
  _tmpDirs.push(d)
  return d
}
// nettoyage à la sortie du process de test (évite l'accumulation de dossiers tmp)
process.on('exit', () => { for (const d of _tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }) } catch { /* best effort */ } } })

// Write CSV text to a file inside dir and return its absolute path.
export function writeCsv(dir, name, text) {
  const p = path.join(dir, name)
  fs.writeFileSync(p, text)
  return p
}

// All Discord webhook env vars used by ingest.js + report.js, forced empty so
// nothing ever hits the network (report.js logs "(no webhook)" to console).
export const NO_WEBHOOKS = {
  DISCORD_INGEST: '', DISCORD_ALERTES: '', DISCORD_RUNS: '', DISCORD_STRUCTURES: '',
  DISCORD_MARGES: '', DISCORD_COUTS: '', DISCORD_OFFRES: '', DISCORD_OPPORTUNITES: '',
}

// Run the ingest as a real subprocess. Returns {status, stdout, stderr, signal}.
// Webhooks forced empty + OPS_PATH isolated per-run (derived from dbPath) so the
// report.js run-log never pollutes the repo's ./ops.db and stays test-local.
export function runIngest(csvPath, dbPath, opsPath = `${dbPath}.ops`) {
  const r = spawnSync(process.execPath, [INGEST, csvPath], {
    cwd: MOTEUR_ROOT,
    env: {
      ...process.env,
      DB_PATH: dbPath,
      OPS_PATH: opsPath,
      ...NO_WEBHOOKS,
    },
    encoding: 'utf8',
    timeout: 60000,
  })
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', signal: r.signal, error: r.error }
}

// Inspect the resulting DB. Returns table presence, column names and rows of `articles`.
export function inspect(dbPath) {
  if (!fs.existsSync(dbPath)) return { dbExists: false, exists: false }
  const db = new Database(dbPath, { readonly: true, fileMustExist: true })
  try {
    const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='articles'").get()
    if (!t) return { dbExists: true, exists: false }
    const cols = db.prepare('PRAGMA table_info(articles)').all()
    const rows = db.prepare('SELECT * FROM articles').all()
    return {
      dbExists: true, exists: true,
      cols: cols.map(c => c.name),
      colTypes: Object.fromEntries(cols.map(c => [c.name, c.type])),
      rows, count: rows.length,
    }
  } finally { db.close() }
}
