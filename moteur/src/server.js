// server.js — process long-running du conteneur.
//  1) ORDONNANCEUR : lance l'ingest (enfant frais) à intervalle, single-flight, + WATCHDOG.
//  2) SANTÉ : /health (liveness) + /status (dernier ingest ET dernier contrôle).
//  3) ALERTES conteneur : démarrage, échec lancement, run figé, kill signal, crash → Discord.
//  4) DEAD-MAN : heartbeat healthchecks conditionné à l'activité réelle (pas juste "process vivant").

import http from 'http'
import fs from 'fs'
import { spawn } from 'child_process'
import Database from 'better-sqlite3'

const OPS = process.env.OPS_PATH || '/data/ops.db'
const PORT = process.env.PORT || 3000
const INTERVAL = (+(process.env.INTERVAL_MIN || 60)) * 60000
const MAX_RUN = (+(process.env.MAX_RUN_MIN || 15)) * 60000        // ceiling d'un run avant watchdog
const INGEST = process.env.INGEST_SCRIPT || `${import.meta.dirname}/ingest.js`   // chemin ABSOLU (robuste au cwd) · overridable en test
const tag = t => process.env.MODE === 'test' ? '🧪 ' + t : t

async function discord(url, title, description, color = 15158332) {
  if (!url) { console.log('(no webhook)', title); return }
  await fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ username: process.env.MODE === 'test' ? '🧪 SAPGE TEST' : 'SAPGE', embeds: [{ title: tag(title), description, color, timestamp: new Date().toISOString() }] }),
  }).catch(() => {})
}

// Âge du DERNIER cycle (ingest OU skip OU fail) — prouve que le moteur fait encore des cycles.
function lastCheckAgeMs() {
  try { const db = new Database(OPS, { readonly: true }); const r = db.prepare('SELECT ts FROM runs ORDER BY id DESC LIMIT 1').get(); db.close(); return r ? Date.now() - new Date(r.ts).getTime() : Infinity }
  catch { return Infinity }
}

// ── Ordonnanceur + watchdog ───────────────────────────────────────────────────
let running = false
let currentChild = null
function runIngest(reason) {
  if (running) { console.log('⏭️  ingest déjà en cours — cycle ignoré'); return }
  running = true
  console.log(`▶️  ingest (${reason})`)
  const p = spawn(process.execPath, [INGEST], { stdio: 'inherit', env: process.env })
  currentChild = p
  let killed = false
  const wd = setTimeout(() => {                                   // WATCHDOG : run figé → on tue + alerte
    killed = true; p.kill('SIGKILL')
    discord(process.env.DISCORD_ALERTES, '🔴 Ingest bloqué — tué par le watchdog', `Un run dépassait **${MAX_RUN / 60000} min** → tué. À investiguer (Discord/disque qui pend ?).`)
  }, MAX_RUN)
  p.on('exit', (code, signal) => {
    clearTimeout(wd); running = false; currentChild = null
    console.log(`■ ingest terminé (code ${code}${signal ? ', signal ' + signal : ''})`)
    if (signal && !killed) discord(process.env.DISCORD_ALERTES, '🔴 Ingest tué (signal)', `Le job a été tué par signal \`${signal}\` (OOM ? crash natif ?) — sans alerte propre. À investiguer.`)
  })
  p.on('error', e => { clearTimeout(wd); running = false; currentChild = null; console.error('spawn error:', e.message); discord(process.env.DISCORD_ALERTES, '🔴 Impossible de lancer l\'ingest', `Le planificateur n'a pas pu démarrer le job.\n\`\`\`${e.message}\`\`\`` ) })
}

// ── Backup léger d'ops.db (M9) : protège d'une corruption/suppression accidentelle du fichier ──
const backup = () => { try { if (fs.existsSync(OPS)) fs.copyFileSync(OPS, OPS + '.bak') } catch (e) { console.error('backup ops:', e.message) } }
setTimeout(backup, +(process.env.BACKUP_DELAY_MS || 30000)); setInterval(backup, 24 * 3600000)

// ── Arrêt propre (redéploiement) : tuer l'enfant, ne pas laisser d'orphelin ──
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => {
  console.log(`${sig} reçu — arrêt propre`); if (currentChild) currentChild.kill('SIGTERM'); setTimeout(() => process.exit(0), 1000)
})
setTimeout(() => runIngest('démarrage'), +(process.env.STARTUP_DELAY_MS || 5000))
setInterval(() => runIngest('cycle horaire'), INTERVAL)

// ── Dead-man : ping healthchecks SEULEMENT si le moteur fait encore des cycles ────
const HB = process.env.HEALTHCHECK_URL
if (HB) {
  const MAXAGE = 2 * INTERVAL
  const beat = force => { if (force || lastCheckAgeMs() < MAXAGE) fetch(HB, { signal: AbortSignal.timeout(8000) }).catch(() => {}) }
  beat(true)                                                      // boot : ping "up" (retour après redéploiement)
  setInterval(() => beat(false), (+(process.env.PING_MIN || 5)) * 60000)
  //  → si les cycles s'arrêtent (run figé/scheduler mort), lastCheck vieillit → plus de ping → healthchecks alerte
}

// ── Crash du planificateur → alerte + exit (Docker redémarre) ─────────────────
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
    const ing = db.prepare("SELECT ts, stats_json FROM runs WHERE kind='ingest' AND ok=1 ORDER BY id DESC LIMIT 1").get()
    const chk = db.prepare('SELECT ts, kind, ok FROM runs ORDER BY id DESC LIMIT 1').get()
    db.close()
    const age = t => t ? Math.round((Date.now() - new Date(t).getTime()) / 60000) : null
    return {
      ok: true, running,
      lastIngest: ing ? { ts: ing.ts, ageMinutes: age(ing.ts) } : null,   // âge des DONNÉES
      lastCheck: chk ? { ts: chk.ts, kind: chk.kind, ageMinutes: age(chk.ts) } : null,   // dernier CYCLE (skip inclus)
      stats: ing && ing.stats_json ? JSON.parse(ing.stats_json) : null,
    }
  } catch (e) { return { ok: false, error: e.message, running } }
}
http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); return res.end('ok') }
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify(lastStatus(), null, 2))
}).listen(PORT, () => {
  console.log(`moteur health/status on :${PORT} · ingest toutes les ${INTERVAL / 60000} min · watchdog ${MAX_RUN / 60000} min`)
  discord(process.env.DISCORD_RUNS, '🟢 Moteur démarré', `Le conteneur a (re)démarré. Ingestion toutes les **${INTERVAL / 60000} min**, 1er run dans 5 s.`, 3066993)
})
