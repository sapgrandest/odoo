// server.js — process long-running du conteneur.
//  1) ORDONNANCEUR : lance l'ingest (process ENFANT frais) à intervalle, single-flight.
//  2) SANTÉ : /health (Coolify healthcheck) + /status (dernier run).
//  3) ALERTES conteneur : démarrage, échec de lancement, crash → Discord.

import http from 'http'
import { spawn } from 'child_process'
import Database from 'better-sqlite3'

const OPS = process.env.OPS_PATH || '/data/ops.db'
const PORT = process.env.PORT || 3000
const INTERVAL = (+(process.env.INTERVAL_MIN || 60)) * 60000   // défaut : 1 h
const tag = t => process.env.MODE === 'test' ? '🧪 ' + t : t

async function discord(url, title, description, color = 15158332) {
  if (!url) { console.log('(no webhook)', title); return }
  await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: process.env.MODE === 'test' ? '🧪 SAPGE TEST' : 'SAPGE', embeds: [{ title: tag(title), description, color, timestamp: new Date().toISOString() }] }) }).catch(() => {})
}

// ── Ordonnanceur ────────────────────────────────────────────────────────────
let running = false
function runIngest(reason) {
  if (running) { console.log('⏭️  ingest déjà en cours — cycle ignoré'); return }
  running = true
  console.log(`▶️  ingest (${reason})`)
  const p = spawn(process.execPath, ['src/ingest.js'], { stdio: 'inherit', env: process.env })
  p.on('exit', code => { running = false; console.log(`■ ingest terminé (code ${code})`) })
  p.on('error', e => {
    running = false; console.error('spawn error:', e.message)
    discord(process.env.DISCORD_ALERTES, '🔴 Impossible de lancer l\'ingest', `Le planificateur n'a pas pu démarrer le job.\n\`\`\`${e.message}\`\`\``)
  })
}
setTimeout(() => runIngest('démarrage'), 5000)
setInterval(() => runIngest('cycle horaire'), INTERVAL)

// ── Dead-man : heartbeat healthchecks (liveness du moteur, découplé de l'ingest) ──
const HB = process.env.HEALTHCHECK_URL
if (HB) {
  const beat = () => fetch(HB).catch(() => {})
  beat()
  setInterval(beat, (+(process.env.PING_MIN || 5)) * 60000)   // défaut : 5 min
}

// ── Crash du planificateur → alerte + exit (Docker redémarre le conteneur) ────
for (const sig of ['uncaughtException', 'unhandledRejection']) {
  process.on(sig, async e => {
    console.error(sig, e)
    await discord(process.env.DISCORD_ALERTES, '🔴 Moteur planté', `Erreur non gérée (\`${sig}\`) — le conteneur va redémarrer.\n\`\`\`${(e?.stack || String(e)).slice(0, 600)}\`\`\``)
    process.exit(1)
  })
}

// ── Santé / statut ────────────────────────────────────────────────────────────
function lastStatus() {
  try {
    const db = new Database(OPS, { readonly: true })
    const r = db.prepare('SELECT ts, stats_json FROM runs WHERE ok=1 ORDER BY id DESC LIMIT 1').get()
    db.close()
    if (!r) return { ok: true, message: 'aucun run encore', running }
    return { ok: true, running, lastRun: r.ts, ageMinutes: Math.round((Date.now() - new Date(r.ts).getTime()) / 60000), stats: JSON.parse(r.stats_json) }
  } catch (e) { return { ok: false, error: e.message, running } }
}
http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); return res.end('ok') }
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify(lastStatus(), null, 2))
}).listen(PORT, () => {
  console.log(`moteur health/status on :${PORT} · ingest toutes les ${INTERVAL / 60000} min`)
  discord(process.env.DISCORD_RUNS, '🟢 Moteur démarré', `Le conteneur a (re)démarré. Ingestion toutes les **${INTERVAL / 60000} min**, 1er run dans 5 s.`, 3066993)
})
