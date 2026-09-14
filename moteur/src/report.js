// report.js — analyse catalog.db (lentille REVENDEUR : marge + mouvements de coût)
// et poste un message par salon Discord. Mouvements calculés vs catalog.prev.db (si présent).
// Autonome : `node src/report.js` fait une démo sur ./catalog.db.

import fs from 'fs'
import Database from 'better-sqlite3'

const C = { green: 3066993, red: 15158332, orange: 15105570, blue: 3447003, purple: 10181046 }
const STK = '(COALESCE(stock_availability_chorzow,0)+COALESCE(stock_availability_hub,0))'

// ── Formatage ─────────────────────────────────────────────────────────────────
const fmt = n => Math.round(n || 0).toLocaleString('fr-FR')
const money = n => { n = n || 0; return n >= 1e6 ? (n / 1e6).toFixed(2) + ' M€' : n >= 1e3 ? (n / 1e3).toFixed(0) + ' k€' : n.toFixed(0) + ' €' }
const eur = n => (n ?? 0).toFixed(2).replace('.', ',') + ' €'
const pct = n => (n >= 0 ? '+' : '') + (n || 0).toFixed(1) + ' %'
function delta(cur, prev, kind = 'int') {
  if (prev == null) return ''
  const d = cur - prev; if (Math.abs(d) < 1e-9) return '  `=`'
  const a = d > 0 ? '▲' : '▼', x = Math.abs(d)
  return kind === 'money' ? `  ${a} ${money(x)}` : kind === 'eur' ? `  ${a} ${eur(x)}` : kind === 'pt' ? `  ${a} ${x.toFixed(1)} pt` : `  ${a} ${fmt(x)}`
}

// ── Stats catalogue (courant) ─────────────────────────────────────────────────
export function computeStats(db) {
  const g = s => db.prepare(s).get()
  return {
    rows: g('SELECT COUNT(*) n FROM articles').n,
    marques: g("SELECT COUNT(DISTINCT manufacturer) n FROM articles WHERE manufacturer<>''").n,
    en_stock: g(`SELECT COUNT(*) n FROM articles WHERE ${STK}>0`).n,
    stock_total: g(`SELECT COALESCE(SUM(${STK}),0) n FROM articles`).n,
    rentables: g('SELECT COUNT(*) n FROM articles WHERE purchase_nett_price>0 AND nett_retail_price>purchase_nett_price').n,
    a_perte: g('SELECT COUNT(*) n FROM articles WHERE purchase_nett_price>0 AND nett_retail_price>0 AND nett_retail_price<=purchase_nett_price').n,
    marge_moy: g('SELECT AVG((nett_retail_price-purchase_nett_price)/nett_retail_price*100) m FROM articles WHERE nett_retail_price>0 AND purchase_nett_price>0').m || 0,
    marge_pot: g(`SELECT COALESCE(SUM((nett_retail_price-purchase_nett_price)*${STK}),0) n FROM articles WHERE ${STK}>0 AND nett_retail_price>purchase_nett_price AND purchase_nett_price>0`).n,
    valeur_achat: g(`SELECT COALESCE(SUM(purchase_nett_price*${STK}),0) n FROM articles WHERE ${STK}>0`).n,
    brands: db.prepare("SELECT DISTINCT manufacturer FROM articles WHERE manufacturer<>'' ORDER BY manufacturer").all().map(r => r.manufacturer),
  }
}

// ── Mouvements (diff vs snapshot précédent) ───────────────────────────────────
export function computeMovements(db) {
  if (!db.prepare("SELECT 1 x FROM sqlite_master WHERE type='table' AND name='articles_prev'").get()) return null
  const g = s => db.prepare(s).get()
  // motonet non unique dans le flux → dédoublonner par motonet AVANT de comparer
  const dd = t => `(SELECT motonet_number mn, MAX(manufacturer) b, MAX(purchase_nett_price) cost, MAX(nett_retail_price) retail, MAX(${STK}) stk FROM ${t} WHERE motonet_number IS NOT NULL AND motonet_number<>'' GROUP BY motonet_number)`
  const A = dd('articles'), P = dd('articles_prev')
  const j = `FROM ${A} a JOIN ${P} p ON a.mn=p.mn`
  return {
    cout_h: g(`SELECT COUNT(*) n ${j} WHERE p.cost>0 AND a.cost>p.cost`).n,
    cout_b: g(`SELECT COUNT(*) n ${j} WHERE p.cost>0 AND a.cost<p.cost`).n,
    impact: g(`SELECT AVG((a.cost-p.cost)/p.cost*100) m ${j} WHERE p.cost>0 AND a.cost<>p.cost`).m || 0,
    nouveaux: g(`SELECT COUNT(*) n FROM ${A} a LEFT JOIN ${P} p ON a.mn=p.mn WHERE p.mn IS NULL`).n,
    conseille_h: g(`SELECT COUNT(*) n ${j} WHERE p.retail>0 AND a.retail>p.retail`).n,
    ruptures: g(`SELECT COUNT(*) n ${j} WHERE a.stk=0 AND p.stk>0`).n,
    nouveaux_stock: g(`SELECT COUNT(*) n ${j} WHERE a.stk>0 AND p.stk=0`).n,
    top: g(`SELECT a.b b, p.cost o, a.cost nn, (a.cost-p.cost)/p.cost*100 pc ${j} WHERE p.cost>0 AND a.cost>p.cost ORDER BY pc DESC LIMIT 1`),
  }
}

// ── ops.db (deltas de totaux entre runs) ──────────────────────────────────────
export function openOps(path) { const db = new Database(path); db.exec('CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY, ts TEXT, ok INTEGER, csv_hash TEXT, stats_json TEXT)'); return db }
const lastStats = ops => { const r = ops.prepare('SELECT stats_json FROM runs WHERE ok=1 ORDER BY id DESC LIMIT 1').get(); return r ? JSON.parse(r.stats_json) : null }
export const lastRun = ops => ops.prepare('SELECT ts, csv_hash FROM runs WHERE ok=1 ORDER BY id DESC LIMIT 1').get() || null
const saveRun = (ops, ok, stats, csvHash) => ops.prepare('INSERT INTO runs (ts,ok,csv_hash,stats_json) VALUES (?,?,?,?)').run(new Date().toISOString(), ok ? 1 : 0, csvHash || null, JSON.stringify(stats))

// ── Messages par salon ────────────────────────────────────────────────────────
const F = (name, value, inline = true) => ({ name, value: String(value), inline })
const NOPREV = 'premier snapshot — comparaison dès le prochain run'

function buildEmbeds(s, p, mv, meta) {
  const mb = b => (b / 1048576).toFixed(0) + ' Mo'
  const dbg = meta.duration_s ? fmt(s.rows / meta.duration_s) : '—'
  const ts = new Date().toISOString()
  const d = (c, pr, k) => { const x = delta(c, pr, k); return x ? ` *(${x.replace(/`|\s+/g, ' ').trim()})*` : '' }

  // ── ⚙️ Mise à jour ────────────────────────────────
  const runs = { title: '⚙️ Mise à jour du catalogue', color: C.blue, timestamp: ts, footer: { text: `run #${meta.run_id}` },
    description: `✅ Catalogue rafraîchi — **${fmt(s.rows)}** articles${d(s.rows, p?.rows)}, chargés en **${meta.duration_s}s**.`,
    fields: [F('📥 Fichier reçu', `${mb(meta.csv_bytes)} · il y a ${meta.csv_age} min`), F('🗄️ Base générée', mb(meta.db_bytes)), F('⚡ Vitesse', `${dbg} lignes/s`)] }

  // ── 🧱 Structure ──────────────────────────────────
  const changed = meta.added_cols?.length || meta.removed_cols?.length
  const structures = { title: '🧱 Structure du fichier', color: changed ? C.orange : C.green, timestamp: ts,
    description: changed ? '⚠️ **Le fournisseur a modifié des colonnes** — à vérifier ci-dessous.'
      : `✅ Fichier conforme : **${meta.cols} colonnes**, structure inchangée.`, fields: [] }
  if (meta.added_cols?.length) structures.fields.push(F('🔔 Nouvelles colonnes', meta.added_cols.join(', '), false))
  if (meta.removed_cols?.length) structures.fields.push(F('❌ Colonnes disparues', meta.removed_cols.join(', '), false))
  if (meta.coercion) structures.fields.push(F('Valeurs illisibles ignorées', `${fmt(meta.coercion)} (laissées vides)`, false))
  if (!structures.fields.length) structures.fields.push(F('Colonnes', `${meta.cols}`))

  // ── 💰 Marges ─────────────────────────────────────
  const vm = s.marge_moy >= 30 ? 'saine ✅' : s.marge_moy >= 20 ? 'correcte ✅' : s.marge_moy >= 10 ? 'faible ⚠️' : 'critique 🔴'
  const marges = { title: '💰 Marges & rentabilité', color: s.marge_moy >= 20 ? C.green : C.orange, timestamp: ts,
    description: `Marge moyenne **${s.marge_moy.toFixed(1)} %** (${vm}). Si on vendait tout le stock au prix conseillé, gain de **${money(s.marge_pot)}**.`
      + (s.a_perte ? `\n⚠️ **${fmt(s.a_perte)}** articles se vendraient **à perte** (coût ≥ prix).` : ''),
    fields: [
      F('Marge moyenne', `${s.marge_moy.toFixed(1)} %${delta(s.marge_moy, p?.marge_moy, 'pt')}`),
      F('Gain potentiel', `${money(s.marge_pot)}${delta(s.marge_pot, p?.marge_pot, 'money')}`),
      F('Rentables', `${fmt(s.rentables)}${delta(s.rentables, p?.rentables)}`),
      F('À perte', `${fmt(s.a_perte)}${delta(s.a_perte, p?.a_perte)}`),
    ] }

  // ── 🛒 Offre ──────────────────────────────────────
  const offres = { title: '🛒 Ce qu\'on peut vendre', color: C.blue, timestamp: ts,
    description: `**${fmt(s.en_stock)}** articles disponibles à la vente aujourd'hui (en stock chez le grossiste).`
      + (mv?.ruptures ? `\n⚠️ **${fmt(mv.ruptures)}** viennent de tomber en **rupture** (on ne peut plus les livrer).` : '')
      + (mv?.nouveaux_stock ? `\n🆕 **${fmt(mv.nouveaux_stock)}** sont **de nouveau en stock**.` : ''),
    fields: [
      F('Vendables (en stock)', `${fmt(s.en_stock)}${delta(s.en_stock, p?.en_stock)}`),
      F('Unités disponibles', `${fmt(s.stock_total)}${delta(s.stock_total, p?.stock_total)}`),
      F('Coût pour les acheter', money(s.valeur_achat)),
    ] }

  // ── 📈 Coûts du grossiste ─────────────────────────
  const couts = { title: '📈 Coûts du grossiste', color: C.orange, timestamp: ts }
  if (!mv) couts.description = `ℹ️ ${NOPREV}.`
  else {
    const sens = mv.impact > 0.5 ? '⚠️ **tes marges se réduisent**' : mv.impact < -0.5 ? '✅ **tes marges s\'améliorent**' : 'marges stables'
    couts.color = mv.impact > 0.5 ? C.red : mv.impact < -0.5 ? C.green : C.orange
    couts.description = `Le grossiste a **augmenté ${fmt(mv.cout_h)}** coûts et baissé **${fmt(mv.cout_b)}**. En moyenne **${pct(mv.impact)}** → ${sens}.`
      + (mv.top ? `\n⚡ Plus forte hausse : **${mv.top.b}** ${eur(mv.top.o)} → ${eur(mv.top.nn)} (**${pct(mv.top.pc)}**).` : '')
  }

  // ── 🌟 Opportunités ───────────────────────────────
  const newB = p ? s.brands.filter(b => !p.brands.includes(b)) : []
  const opportunites = { title: '🌟 Opportunités & nouveautés', color: C.purple, timestamp: ts }
  if (!mv) opportunites.description = `ℹ️ ${NOPREV}.` + (newB.length ? `\n🆕 Nouvelles marques disponibles : **${newB.slice(0, 10).join(', ')}**.` : '')
  else opportunites.description = `**${fmt(mv.nouveaux)}** nouveaux articles au catalogue. `
    + (newB.length ? `**${newB.length}** nouvelle(s) marque(s) : **${newB.slice(0, 8).join(', ')}**.` : 'Aucune nouvelle marque.')
    + (mv.conseille_h ? `\n📈 **${fmt(mv.conseille_h)}** articles dont le prix conseillé a monté — tu peux vendre plus cher.` : '')

  return { runs, structures, marges, offres, couts, opportunites }
}

function anomalies(s, p, meta) {
  const l = []
  if (p?.rows) { const x = (s.rows - p.rows) / p.rows * 100; if (x < -5) l.push(`📉 Articles ${x.toFixed(1)} % (${fmt(p.rows)} → ${fmt(s.rows)}) — chute suspecte`) }
  const gone = p ? p.brands.filter(b => !s.brands.includes(b)) : []
  if (gone.length) l.push(`🏭 Marque(s) disparue(s) : ${gone.slice(0, 8).join(', ')}`)
  if (meta.removed_cols?.length) l.push(`🧱 Colonne(s) disparue(s) : ${meta.removed_cols.join(', ')}`)
  return l.length ? { title: '🔴 Anomalie ingest', color: C.red, description: l.join('\n') + '\n→ vérifier le CSV source', timestamp: new Date().toISOString() } : null
}

async function post(url, embeds) {
  if (!url) { console.log('(no webhook) ' + embeds.map(e => e.title).join(' · ')); return }
  const test = process.env.MODE === 'test'
  if (test) embeds = embeds.map(e => e.title ? { ...e, title: '🧪 ' + e.title } : e)
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: test ? '🧪 SAPGE TEST' : 'SAPGE', embeds }) })
  if (!r.ok) console.error('discord', r.status, embeds.map(e => e.title).join(','))
}

// ── Orchestration ─────────────────────────────────────────────────────────────
export async function reportRun({ dbPath, opsPath, meta, wh }) {
  const db = new Database(dbPath)
  const s = computeStats(db)
  const mv = computeMovements(db)
  db.close()
  const ops = openOps(opsPath); const p = lastStats(ops)
  meta = { ...meta, run_id: ops.prepare('SELECT COALESCE(MAX(id),0)+1 n FROM runs').get().n }
  const E = buildEmbeds(s, p, mv, meta)
  await Promise.all([
    post(wh.runs, [E.runs]), post(wh.structures, [E.structures]), post(wh.marges, [E.marges]),
    post(wh.offres, [E.offres]), post(wh.couts, [E.couts]), post(wh.opportunites, [E.opportunites]),
  ])
  const a = anomalies(s, p, meta); if (a) await post(wh.alertes, [a])
  saveRun(ops, true, s, meta.csv_hash); ops.close()
}

// ── Démo : node src/report.js ─────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const e = process.env
  await reportRun({
    dbPath: e.DB_PATH || './catalog.db', opsPath: e.OPS_PATH || './ops.db',
    meta: { cols: 70, duration_s: 42.3, csv_bytes: 422 * 1048576, csv_age: 12, db_bytes: 530 * 1048576, added_cols: [], removed_cols: [] },
    wh: { runs: e.DISCORD_RUNS, structures: e.DISCORD_STRUCTURES, marges: e.DISCORD_MARGES, couts: e.DISCORD_COUTS, offres: e.DISCORD_OFFRES, opportunites: e.DISCORD_OPPORTUNITES, alertes: e.DISCORD_ALERTES },
  })
  console.log('démo report OK')
}
