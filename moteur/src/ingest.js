// ingest.js — CSV Moto-Profil → catalog.db (SQLite). Lecture par NOM, mode STRICT.
// Contrat d'en-tête + pré-vol schéma + parse strict + swap atomique (garde articles_prev).
// Échec → alerte Discord riche (étape, erreur, ligne fautive, DB préservée).

import fs from 'fs'
import readline from 'readline'
import crypto from 'crypto'
import Database from 'better-sqlite3'
import { parse } from 'csv-parse'
import { parse as parseSync } from 'csv-parse/sync'
import { reportRun, openOps, lastRun } from './report.js'

// ── Config ────────────────────────────────────────────────────────────────────
const CSV_PATH = process.argv[2] || process.env.CSV_PATH || './sample.csv'
const DB_PATH  = process.env.DB_PATH || './catalog.db'
const MODE     = process.env.MODE || 'prod'
const env = process.env
const WH = { runs: env.DISCORD_RUNS, structures: env.DISCORD_STRUCTURES, marges: env.DISCORD_MARGES,
  couts: env.DISCORD_COUTS, offres: env.DISCORD_OFFRES, opportunites: env.DISCORD_OPPORTUNITES, alertes: env.DISCORD_ALERTES }

// ── Contrat & schéma ──────────────────────────────────────────────────────────
const CRITICAL = ['Prefix', 'Index', 'Motonet number', 'Parts name', 'Purchase nett price',
  'Nett retail price', 'Stock availability - Chorzów', 'Stock availability - HUB', 'Manufacturer']
const KNOWN = ['Prefix','Index','Parts name','Article description','Original number','Suppliers number',
  'Stock availability - Chorzów','Purchase nett price','Percent discount','Discount group name','Nett retail price',
  'Deposit','Bail','Unit of measure','Manufacturer','Motonet number','Non-returnable','Custom code','Barcode','Weight',
  'List of attributes','MP superior attribute','MP subaltern attribute','Temot FAM attribute','Temot CAT attribute',
  'Replacement prefix','Replacement index','List of alternatives', ...Array.from({ length: 26 }, (_, i) => `Alternative ${i + 1}`),
  'TecDoc DLNr','TecDoc ArtNr','Sales quantity','Gross retail price','Gross purchase price','TecDoc HerNr','Article generic id',
  'Stock availability - HUB','Discount Id','VAT rate','TecDoc GenArtNr','Product group code','Split payroll required',
  'Country code','Product group code required','TecDoc Manufacturer']
const REAL = new Set(['Purchase nett price','Nett retail price','Gross retail price','Gross purchase price','Weight','Percent discount','VAT rate','Deposit','Bail'])
const INTEGER = new Set(['Stock availability - Chorzów','Stock availability - HUB','Sales quantity'])

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
const NUMRE = /^-?\d+(?:[.,]\d+)?$/
let coercion = 0
function num(v, int) {
  if (v == null) return null
  const t = String(v).trim(); if (t === '') return null
  if (!NUMRE.test(t)) { coercion++; return null }        // non conforme → NULL + compté (P3, pas silencieux)
  const n = parseFloat(t.replace(',', '.')); return int ? Math.trunc(n) : n
}

// ── Discord ───────────────────────────────────────────────────────────────────
const tag = t => MODE === 'test' ? '🧪 ' + t : t
async function discordEmbed(url, embed) {
  if (!url) { console.log('(no webhook)', embed.title); return }
  embed.title = tag(embed.title)
  await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: MODE === 'test' ? '🧪 SAPGE TEST' : 'SAPGE', embeds: [embed] }) }).catch(e => console.error('discord', e.message))
}
// Dead-man ping (healthchecks.io) — prouve que le cron tourne ; suffixe '/fail' = échec immédiat
const ping = async (suffix = '') => { if (env.HEALTHCHECK_URL) await fetch(env.HEALTHCHECK_URL + suffix).catch(() => {}) }

// Lit la ligne N (1-indexée) du fichier — pour donner le contenu fautif dans l'alerte
function readLineAt(path, n) {
  return new Promise(res => {
    if (!n || n < 1) return res(null)
    const rl = readline.createInterface({ input: fs.createReadStream(path), crlfDelay: Infinity })
    let i = 0, out = null
    rl.on('line', l => { if (++i === n) { out = l; rl.close() } })
    rl.on('close', () => res(out)); rl.on('error', () => res(null))
  })
}

// Hash streaming du CSV — détecte si le contenu a changé (fraîcheur)
function hashFile(path) {
  return new Promise((res, rej) => {
    const h = crypto.createHash('sha1')
    fs.createReadStream(path).on('data', d => h.update(d)).on('end', () => res(h.digest('hex'))).on('error', rej)
  })
}

// ── Ingest ────────────────────────────────────────────────────────────────────
let step = 'init'
async function run() {
  const t0 = Date.now()
  const OPS = env.OPS_PATH || './ops.db'

  // Source figée ? (Moto-Profil a-t-il arrêté de pousser le CSV ? = le bug du 13/07)
  step = 'fraîcheur source'
  const srcAgeH = (Date.now() - fs.statSync(CSV_PATH).mtimeMs) / 3600000
  if (srcAgeH > +(env.STALE_HOURS || 3))
    await discordEmbed(WH.alertes, { title: '⚠️ Source figée — CSV non mis à jour', color: 15105570,
      description: `Le fichier reçu date de **${srcAgeH.toFixed(1)} h**. Moto-Profil a peut-être **arrêté de pousser** le catalogue.\n→ Vérifier le flux SFTP / le portail ProfiAuto.`, timestamp: new Date().toISOString() })

  // 0. Fraîcheur — hash du CSV vs dernier import → skip si identique (heartbeat cron)
  step = 'fraîcheur'
  const csvHash = await hashFile(CSV_PATH)
  if (fs.existsSync(OPS)) {
    const o = openOps(OPS); const prev = lastRun(o); o.close()
    if (prev && prev.csv_hash === csvHash) {
      const ms = Date.now() - new Date(prev.ts).getTime()
      const age = ms < 3.6e6 ? `${Math.round(ms / 6e4)} min` : `${(ms / 3.6e6).toFixed(1)} h`
      console.log('🔄 CSV inchangé — skip')
      await discordEmbed(WH.runs, { title: '🔄 Vérification — CSV inchangé', color: 9807270,
        description: `Le fichier reçu est **identique** au dernier import (il y a ${age}). Rien à faire.`,
        timestamp: new Date().toISOString(), footer: { text: 'cron OK · rien à ingérer ce cycle' } })
      await ping()
      return
    }
  }

  // 1. En-tête (csv-parse → quote-safe, cohérent avec les données)
  step = 'lecture en-tête'
  const fd = fs.openSync(CSV_PATH, 'r'); const b = Buffer.alloc(1 << 16); const n = fs.readSync(fd, b, 0, b.length, 0); fs.closeSync(fd)
  let head = b.slice(0, n).toString('utf8'); if (head.charCodeAt(0) === 0xFEFF) head = head.slice(1)
  const rawCols = parseSync(head.slice(0, head.indexOf('\n') >= 0 ? head.indexOf('\n') : head.length), { delimiter: ';', quote: false })[0]
  if (!rawCols || !rawCols.length) throw Object.assign(new Error('CSV vide ou en-tête illisible'), { hint: 'Le fichier ne contient pas d\'en-tête exploitable.' })
  const cols = rawCols.map(c => c.trim()).filter(Boolean)
  const NFIELDS = rawCols.length

  // 2. Contrat
  step = 'contrat en-tête'
  const missing = CRITICAL.filter(c => !cols.includes(c))
  if (missing.length) throw Object.assign(new Error(`colonne(s) critique(s) manquante(s) : ${missing.join(', ')}`), { hint: `L'en-tête du CSV a changé. Reçu : ${cols.length} colonnes.` })
  const added = cols.filter(c => !KNOWN.includes(c)), removed = KNOWN.filter(c => !cols.includes(c))

  // 3. Pré-vol schéma (P4 : collision / slug vide AVANT d'ouvrir la DB)
  step = 'schéma'
  const slugs = cols.map(slug)
  const empty = cols.filter((c, i) => !slugs[i])
  if (empty.length) throw Object.assign(new Error(`colonne au nom technique vide : « ${empty.join(', ')} »`), { hint: 'Renommer/ignorer cette colonne côté contrat.' })
  const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i)
  if (dup.length) throw Object.assign(new Error(`collision de nom technique : ${[...new Set(dup)].join(', ')}`), { hint: 'Deux colonnes produisent le même identifiant.' })

  // 4. Table + insertion STRICT (relax OFF → mauvais compte de champs = échec net)
  step = 'chargement'
  const db = new Database(DB_PATH); db.pragma('journal_mode = WAL')
  db.exec('DROP TABLE IF EXISTS articles_new')
  db.exec(`CREATE TABLE articles_new (${cols.map((c, i) => `"${slugs[i]}" ${REAL.has(c) ? 'REAL' : INTEGER.has(c) ? 'INTEGER' : 'TEXT'}`).join(', ')})`)
  const stmt = db.prepare(`INSERT INTO articles_new (${slugs.map(s => `"${s}"`).join(',')}) VALUES (${slugs.map(s => '@' + s).join(',')})`)
  const parser = fs.createReadStream(CSV_PATH).pipe(parse({
    delimiter: ';', bom: true, from_line: 2, skip_empty_lines: true,
    quote: false,                                                // fichier ;-séparé, " est un caractère littéral (pouces)
    relax_column_count: false,                                   // ← STRICT
    columns: rawCols.map(c => (c.trim() ? slug(c) : null)),
  }))
  let count = 0
  db.exec('BEGIN')
  try {
    for await (const rec of parser) {
      const p = {}
      for (let i = 0; i < cols.length; i++) { const s = slugs[i]; const v = rec[s]; p[s] = REAL.has(cols[i]) ? num(v, false) : INTEGER.has(cols[i]) ? num(v, true) : (v ?? null) }
      stmt.run(p); count++
    }
    db.exec('COMMIT')
  } catch (e) { db.exec('ROLLBACK'); db.close(); throw e }

  // 5. Swap atomique — garde l'ancienne table en articles_prev (pour les mouvements)
  step = 'swap'
  const hasArticles = db.prepare("SELECT 1 x FROM sqlite_master WHERE type='table' AND name='articles'").get()
  db.exec(`BEGIN; DROP TABLE IF EXISTS articles_prev; ${hasArticles ? 'ALTER TABLE articles RENAME TO articles_prev;' : ''} ALTER TABLE articles_new RENAME TO articles; COMMIT`)
  db.close()

  // 6. Rapport multi-salons (report.js)
  step = 'report'
  const csvSt = fs.statSync(CSV_PATH), dbSt = fs.statSync(DB_PATH)
  await reportRun({
    dbPath: DB_PATH, opsPath: OPS, mode: MODE, wh: WH,
    meta: { cols: cols.length, duration_s: +((Date.now() - t0) / 1000).toFixed(1), csv_bytes: csvSt.size, csv_hash: csvHash,
      csv_age: Math.round((Date.now() - csvSt.mtimeMs) / 60000), db_bytes: dbSt.size, added_cols: added, removed_cols: removed, coercion },
  })
  console.log(`✅ ingest OK — ${count.toLocaleString('fr-FR')} lignes · ${cols.length} colonnes${coercion ? ` · ${coercion} valeurs non conformes→NULL` : ''}`)
  await ping()
}

// ── Échec → alerte riche ──────────────────────────────────────────────────────
run().catch(async e => {
  const lineNo = e.lines || (e.message.match(/line (\d+)/i)?.[1] | 0) || null
  const rawLine = lineNo ? await readLineAt(CSV_PATH, lineNo) : null
  let intact = 'aucune DB précédente'
  try { const d = new Database(DB_PATH, { readonly: true }); const r = d.prepare("SELECT COUNT(*) n FROM articles").get(); intact = `${r.n.toLocaleString('fr-FR')} articles intacts`; d.close() } catch {}
  const csvSt = fs.existsSync(CSV_PATH) ? fs.statSync(CSV_PATH) : null
  const fields = [
    { name: 'Étape', value: step, inline: true },
    { name: 'Code', value: e.code || '—', inline: true },
    { name: 'Ligne', value: lineNo ? lineNo.toLocaleString('fr-FR') : '—', inline: true },
    { name: 'Erreur', value: '```' + e.message.slice(0, 300) + '```', inline: false },
    { name: 'Exception (stack)', value: '```' + (e.stack || String(e)).slice(0, 950) + '```', inline: false },
  ]
  if (rawLine) fields.push({ name: 'Contenu fautif', value: '```' + rawLine.slice(0, 400) + '```', inline: false })
  if (csvSt) fields.push({ name: 'CSV', value: `${(csvSt.size / 1048576).toFixed(0)} Mo · maj il y a ${Math.round((Date.now() - csvSt.mtimeMs) / 60000)} min`, inline: true })
  fields.push({ name: '✅ DB préservée', value: intact + ' — rien d\'impacté', inline: false })
  if (e.hint) fields.push({ name: '→ À vérifier', value: e.hint, inline: false })
  console.error('🔴 ÉCHEC', step, e.message)
  await discordEmbed(WH.alertes, { title: '🔴 Ingest ÉCHEC', color: 15158332, fields, timestamp: new Date().toISOString(), footer: { text: `étape : ${step}` } })
  await ping('/fail')
  process.exit(1)
})
