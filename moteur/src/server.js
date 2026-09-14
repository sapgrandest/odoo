// server.js — process long-running du conteneur (garde le conteneur vivant pour la
// Scheduled Task Coolify). Expose /health (Coolify healthcheck) et /status (dernier run).
// L'ingestion, elle, est lancée séparément par le cron : `node src/ingest.js`.

import http from 'http'
import Database from 'better-sqlite3'

const OPS = process.env.OPS_PATH || '/data/ops.db'
const PORT = process.env.PORT || 3000

function lastStatus() {
  try {
    const db = new Database(OPS, { readonly: true })
    const r = db.prepare('SELECT ts, csv_hash, stats_json FROM runs WHERE ok=1 ORDER BY id DESC LIMIT 1').get()
    db.close()
    if (!r) return { ok: true, message: 'aucun run encore' }
    const ageMin = Math.round((Date.now() - new Date(r.ts).getTime()) / 60000)
    return { ok: true, lastRun: r.ts, ageMinutes: ageMin, stats: JSON.parse(r.stats_json) }
  } catch (e) { return { ok: false, error: e.message } }
}

http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); return res.end('ok') }
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify(lastStatus(), null, 2))
}).listen(PORT, () => console.log(`moteur health/status on :${PORT}`))
