// server.js — process long-running du conteneur.
//  1) ORDONNANCEUR : lance l'ingest (process ENFANT frais) à intervalle, single-flight.
//     → zéro cron système, isolation mémoire par run, redémarrage géré par Docker.
//  2) SANTÉ : /health (Coolify healthcheck) + /status (dernier run, lu dans ops.db).

import http from 'http'
import { spawn } from 'child_process'
import Database from 'better-sqlite3'

const OPS = process.env.OPS_PATH || '/data/ops.db'
const PORT = process.env.PORT || 3000
const INTERVAL = (+(process.env.INTERVAL_MIN || 60)) * 60000   // défaut : 1 h

// ── Ordonnanceur ────────────────────────────────────────────────────────────
let running = false
function runIngest(reason) {
  if (running) { console.log('⏭️  ingest déjà en cours — cycle ignoré'); return }
  running = true
  console.log(`▶️  ingest (${reason})`)
  const p = spawn(process.execPath, ['src/ingest.js'], { stdio: 'inherit', env: process.env })
  p.on('exit', code => { running = false; console.log(`■ ingest terminé (code ${code})`) })
  p.on('error', e => { running = false; console.error('spawn error:', e.message) })
}
setTimeout(() => runIngest('démarrage'), 5000)          // 1er run peu après le boot
setInterval(() => runIngest('cycle horaire'), INTERVAL)  // puis à chaque intervalle

// ── Santé / statut ──────────────────────────────────────────────────────────
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
}).listen(PORT, () => console.log(`moteur health/status on :${PORT} · ingest toutes les ${INTERVAL / 60000} min`))
