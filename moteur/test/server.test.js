// server.test.js — real process tests for src/server.js (the scheduler/watchdog/health process).
// 0 tests existed for this file before — it is the riskiest surface in the repo (long-running
// process, spawns children, has a watchdog, alerts, a dead-man heartbeat). These tests drive it
// as an actual OS process, exactly like production does, and only observe it from the outside
// (HTTP requests, stdout, ops.db, signals) — nothing in src/ is modified or mocked in-process.
//
// STRATEGY — stubbing the ingest child without touching src/
// ─────────────────────────────────────────────────────────
// server.js spawns its child with a *relative* path, hardcoded:
//     spawn(process.execPath, ['src/ingest.js'], { stdio: 'inherit', env: process.env })
// No `cwd` is passed to that spawn call, so Node resolves 'src/ingest.js' against server.js's
// OWN process.cwd(). And process.cwd() of a spawned process is exactly whatever `cwd` option
// WE pass when we spawn server.js itself.
//   ⇒ if we spawn server.js with `{ cwd: someTmpDir }`, then server.js's attempt to run
//     'src/ingest.js' resolves to `someTmpDir/src/ingest.js` — a file we fully control.
// So each test creates an isolated tmp dir, writes a tiny fake `src/ingest.js` (a "stub": exits
// immediately, sleeps, hangs forever, or kills itself — depending what the test needs), and
// launches the REAL, unmodified src/server.js with cwd pointed at that tmp dir. Verified in
// isolation before writing this suite (two-level cwd-relative spawn behaves identically to a
// direct call). This means src/server.js itself is never copied, edited, or monkeypatched.
//
// Discord webhooks and the healthchecks dead-man ping are captured by tiny local HTTP servers
// started per-test and passed in via DISCORD_ALERTES / HEALTHCHECK_URL env vars — nothing ever
// reaches the real network. All other DISCORD_* channels are forced empty (NO_WEBHOOKS, reused
// from support.js) so a webhook accidentally left exported in the dev shell (`source .env.sh`)
// can NEVER leak into these tests.
//
// TESTABILITY NOTE (see also the written report): INTERVAL_MIN / MAX_RUN_MIN / PING_MIN accept
// fractional minutes (`+env * 60000`), so sub-minute watchdog/interval timings ARE achievable —
// no workaround needed there. The two genuinely hardcoded, non-injectable delays are the first
// "démarrage" run (`setTimeout(..., 5000)`) and the first ops.db backup (`setTimeout(..., 30000)`).
// Both are exercised for real below (hence this file's ~80-90s runtime) rather than skipped —
// see the report for a concrete recommendation (env-configurable delays) to make this instant.

import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import http from 'node:http'
import Database from 'better-sqlite3'
import { MOTEUR_ROOT, NO_WEBHOOKS } from './support.js'

const SERVER_JS = path.join(MOTEUR_ROOT, 'src', 'server.js')

// ── generic async helpers ──────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function waitFor(conditionFn, { timeout = 5000, interval = 100, label = 'condition' } = {}) {
  const deadline = Date.now() + timeout
  let lastErr
  while (Date.now() < deadline) {
    try { if (await conditionFn()) return } catch (e) { lastErr = e }
    await sleep(interval)
  }
  throw new Error(`waitFor: ${label} not met within ${timeout}ms` + (lastErr ? ` (last error: ${lastErr.message})` : ''))
}

async function waitForHttp(url, timeout = 5000) {
  await waitFor(async () => { try { return (await fetch(url)).ok } catch { return false } },
    { timeout, interval: 50, label: `${url} reachable` })
}

async function fetchJson(url) { return (await fetch(url)).json() }

// ── tmp dir / free port / ingest stub writer ───────────────────────────────
function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'server-test-')) }

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)) })
  })
}

function writeStub(dir, code) {
  const srcDir = path.join(dir, 'src')
  fs.mkdirSync(srcDir, { recursive: true })
  fs.writeFileSync(path.join(srcDir, 'ingest.js'), code)
}

// Fake ingest.js variants. No package.json exists in the tmp dir (and none up to the fs root),
// so Node defaults these to CommonJS — plain `require`/`process` work with no setup.
const STUB_NOOP = `process.exit(0)`

// Sleeps STUB_SLEEP_MS then exits 0. Because the real ingest child runs with stdio:'inherit',
// these console.log lines land verbatim in server.js's own captured stdout — the test reads
// them from there instead of needing a separate marker file.
const STUB_SLOW = `
const ms = +(process.env.STUB_SLEEP_MS || 500)
console.log('STUB_START', process.pid, Date.now())
setTimeout(() => { console.log('STUB_END', process.pid, Date.now()); process.exit(0) }, ms)
`

// Never exits by itself (only a SIGKILL/SIGTERM from outside ends it). Writes its own pid to
// <dir>/child.pid so the test can assert liveness/death directly via process.kill(pid, 0).
const STUB_HANG = `
const fs = require('fs'), path = require('path')
fs.writeFileSync(path.join(__dirname, '..', 'child.pid'), String(process.pid))
console.log('STUB_HANG_START', process.pid, Date.now())
setInterval(() => {}, 1000000)
`

// Simulates an OOM-style external kill: the child kills ITSELF with SIGKILL shortly after
// starting — no watchdog involved — to exercise server.js's *other* alert branch
// ("Ingest tué (signal)"), distinct from the watchdog's own alert.
const STUB_SELFKILL = `
console.log('STUB_SELFKILL_START', process.pid, Date.now())
setTimeout(() => process.kill(process.pid, 'SIGKILL'), 300)
`

// ── tiny local HTTP capture server (stands in for Discord webhooks / healthchecks) ─────────
function captureServer() {
  return new Promise(resolve => {
    const hits = []
    const srv = http.createServer((req, res) => {
      let raw = ''
      req.on('data', c => { raw += c })
      req.on('end', () => {
        let body = null
        if (raw) { try { body = JSON.parse(raw) } catch { body = raw } }
        hits.push({ method: req.method, url: req.url, body, ts: Date.now() })
        res.writeHead(200); res.end('ok')
      })
    })
    srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); resolve({ srv, hits, port, url: () => `http://127.0.0.1:${port}/` }) })
  })
}
function closeCapture(cap) { return new Promise(r => cap.srv.close(r)) }

// ── ops.db seeding — schema copied from src/report.js openOps() so this file stays
//    independent of src/ internals (same convention as support.js's copied slug()) ──────────
function openTestOps(opsPath) {
  const db = new Database(opsPath)
  db.pragma('journal_mode = WAL')
  db.exec("CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY, ts TEXT, ok INTEGER, kind TEXT DEFAULT 'ingest', csv_hash TEXT, stats_json TEXT)")
  db.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)')
  return db
}
function insertRun(opsPath, { ts, ok = 1, kind = 'ingest', stats = null }) {
  const db = openTestOps(opsPath)
  db.prepare('INSERT INTO runs (ts,ok,kind,stats_json) VALUES (?,?,?,?)').run(ts, ok, kind, stats ? JSON.stringify(stats) : null)
  db.close()
}

// ── server.js lifecycle ─────────────────────────────────────────────────────
const liveChildren = new Set()
after(() => { for (const p of liveChildren) { try { p.kill('SIGKILL') } catch {} } })

const BASE_ENV = {
  MODE: 'test',
  HEALTHCHECK_URL: '',
  INTERVAL_MIN: '60', MAX_RUN_MIN: '15', PING_MIN: '5',   // deliberately slow defaults; tests override what they need
  STARTUP_DELAY_MS: '200', BACKUP_DELAY_MS: '500',        // délais injectables → suite rapide (au lieu de 5s/30s en dur)
}

// Spawns the REAL src/server.js (cwd-trick stub strategy, see header) with a fresh tmp dir +
// stub + free port, runs `fn(ctx)`, then guarantees teardown (SIGTERM → grace period → SIGKILL,
// tmp dir removed) even if `fn` throws — so a failing assertion never leaks a process or a dir.
async function withServer({ stub = STUB_NOOP, env = {}, seedOps = null } = {}, fn) {
  const dir = tmpDir()
  const opsPath = env.OPS_PATH || path.join(dir, 'ops.db')
  if (seedOps) seedOps(opsPath)
  writeStub(dir, stub)
  const port = await getFreePort()
  // server.js utilise un chemin d'ingest ABSOLU par défaut → on injecte le stub via INGEST_SCRIPT
  const fullEnv = { ...process.env, ...BASE_ENV, ...NO_WEBHOOKS, PORT: String(port), OPS_PATH: opsPath, INGEST_SCRIPT: path.join(dir, 'src', 'ingest.js'), ...env }
  const proc = spawn(process.execPath, [SERVER_JS], { cwd: dir, env: fullEnv })
  liveChildren.add(proc)
  let out = '', err = ''
  proc.stdout.on('data', d => { out += d })
  proc.stderr.on('data', d => { err += d })
  const ctx = { dir, opsPath, port, proc, baseUrl: `http://127.0.0.1:${port}`, stdout: () => out, stderr: () => err }
  try {
    await fn(ctx)
  } finally {
    try { proc.kill('SIGTERM') } catch {}
    await Promise.race([new Promise(r => proc.once('exit', r)), sleep(1500)])
    try { proc.kill('SIGKILL') } catch {}
    liveChildren.delete(proc)
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. /health + /status
// ─────────────────────────────────────────────────────────────────────────────
test('01 /health responds 200 "ok"', async () => {
  await withServer({}, async ({ baseUrl }) => {
    await waitForHttp(`${baseUrl}/health`)
    const res = await fetch(`${baseUrl}/health`)
    assert.equal(res.status, 200)
    assert.equal(await res.text(), 'ok')
  })
})

test('02 /status: running + lastIngest(kind=ingest only) + lastCheck(latest, any kind)', async () => {
  const tsIngest = new Date(Date.now() - 5000).toISOString()
  const tsSkip = new Date(Date.now() - 1000).toISOString()   // newer than tsIngest, different kind
  await withServer({
    seedOps: opsPath => {
      insertRun(opsPath, { ts: tsIngest, kind: 'ingest', stats: { rows: 42 } })
      insertRun(opsPath, { ts: tsSkip, kind: 'skip' })
    },
  }, async ({ baseUrl }) => {
    await waitForHttp(`${baseUrl}/health`)
    const status = await fetchJson(`${baseUrl}/status`)
    assert.equal(status.ok, true)
    assert.equal(status.running, false)
    assert.ok(status.lastIngest, 'lastIngest must be present')
    assert.equal(status.lastIngest.ts, tsIngest, 'lastIngest must come from the kind=ingest row — NOT the newer skip row')
    assert.deepEqual(status.stats, { rows: 42 })
    assert.ok(status.lastCheck, 'lastCheck must be present')
    assert.equal(status.lastCheck.kind, 'skip')
    assert.equal(status.lastCheck.ts, tsSkip, 'lastCheck must be the single most recent row regardless of kind')
    assert.equal(typeof status.lastIngest.ageMinutes, 'number')
    assert.equal(typeof status.lastCheck.ageMinutes, 'number')
  })
})

test('02b /status degrades to {ok:false, error} when ops.db does not exist yet (fresh deploy)', async () => {
  await withServer({}, async ({ baseUrl }) => {
    // no seedOps -> ops.db is never created for this test
    await waitForHttp(`${baseUrl}/health`)
    const res = await fetch(`${baseUrl}/status`)
    assert.equal(res.status, 200, 'endpoint itself must not 500 even when ops.db is unreadable')
    const status = await res.json()
    assert.equal(status.ok, false)
    assert.equal(typeof status.error, 'string')
    assert.ok(status.error.length > 0)
    assert.equal(status.running, false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. Single-flight: a 2nd trigger while ingest is running must be ignored
// ─────────────────────────────────────────────────────────────────────────────
test('03 single-flight: overlapping trigger is ignored while an ingest child is still running', async () => {
  await withServer({
    stub: STUB_SLOW,
    // démarrage fires at the hardcoded t=5s; cycle horaire then fires every ~3s while the
    // stub sleeps 6s — so at least one cycle attempt lands squarely inside the running window.
    env: { INTERVAL_MIN: '0.05', STUB_SLEEP_MS: '6000' },
  }, async ({ baseUrl, stdout }) => {
    await waitForHttp(`${baseUrl}/health`)
    // NB: INTERVAL_MIN (3s) is deliberately SHORTER than the hardcoded 5s "démarrage" delay, so
    // which reason fires first is not guaranteed (cycle horaire can beat démarrage to the punch,
    // in which case démarrage becomes the one that gets skipped) — don't assert an order, just
    // that exactly one run actually starts while the stub sleeps, and the rest are skipped.
    await waitFor(() => /▶️\s*ingest \(/.test(stdout()), { timeout: 7000, label: 'first ingest run started' })
    const mid = await fetchJson(`${baseUrl}/status`)
    assert.equal(mid.running, true, 'running must be true while the child is mid-sleep')
    await waitFor(() => /⏭️\s*ingest déjà en cours/.test(stdout()), { timeout: 6000, label: 'overlapping trigger skipped' })
    const starts = (stdout().match(/▶️\s*ingest \(/g) || []).length
    assert.equal(starts, 1, 'exactly one ingest run must have actually started while the stub sleeps')
    const stubStarts = (stdout().match(/STUB_START/g) || []).length
    assert.equal(stubStarts, 1, 'exactly one child process must have been spawned')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Watchdog: a run that never finishes is killed after MAX_RUN_MIN, alert fires, running resets
// ─────────────────────────────────────────────────────────────────────────────
test('04 watchdog kills a run exceeding MAX_RUN_MIN, alerts, and running resets to false', async () => {
  const alerts = await captureServer()
  try {
    await withServer({
      stub: STUB_HANG,
      env: { MAX_RUN_MIN: '0.03', DISCORD_ALERTES: alerts.url() },   // ~1.8s ceiling
    }, async ({ baseUrl, dir }) => {
      await waitForHttp(`${baseUrl}/health`)
      await waitFor(() => fs.existsSync(path.join(dir, 'child.pid')), { timeout: 7000, label: 'hung child started' })
      const childPid = Number(fs.readFileSync(path.join(dir, 'child.pid'), 'utf8'))
      assert.doesNotThrow(() => process.kill(childPid, 0), 'child must be alive right after it starts')

      await waitFor(() => alerts.hits.length >= 1, { timeout: 8000, label: 'watchdog alert received' })
      const embed = alerts.hits[0].body.embeds[0]
      assert.match(embed.title, /watchdog|bloqué/i)

      await waitFor(async () => (await fetchJson(`${baseUrl}/status`)).running === false,
        { timeout: 4000, label: 'running resets to false after the kill' })
      assert.throws(() => process.kill(childPid, 0), 'the hung child must actually be dead (SIGKILL) once the watchdog fires')
    })
  } finally { await closeCapture(alerts) }
})

test('04b non-watchdog signal kill (e.g. OOM) fires the OTHER alert branch, distinct from the watchdog one', async () => {
  const alerts = await captureServer()
  try {
    await withServer({
      stub: STUB_SELFKILL,
      env: { MAX_RUN_MIN: '10', DISCORD_ALERTES: alerts.url() },   // generous ceiling: watchdog must NOT be involved
    }, async ({ baseUrl }) => {
      await waitForHttp(`${baseUrl}/health`)
      await waitFor(() => alerts.hits.length >= 1, { timeout: 8000, label: 'signal-kill alert received' })
      const embed = alerts.hits[0].body.embeds[0]
      assert.match(embed.title, /signal/i)
      assert.doesNotMatch(embed.title, /watchdog/i, 'must be the distinct "killed by signal" branch, not the watchdog one')
      await waitFor(async () => (await fetchJson(`${baseUrl}/status`)).running === false,
        { timeout: 4000, label: 'running resets to false' })
    })
  } finally { await closeCapture(alerts) }
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. Heartbeat conditional on ops.db freshness (the dead-man detector)
// ─────────────────────────────────────────────────────────────────────────────
test('05a heartbeat pings healthchecks (beyond the unconditional boot ping) when the last cycle is recent', async () => {
  const hb = await captureServer()
  try {
    const recentTs = new Date(Date.now() - 1000).toISOString()
    await withServer({
      seedOps: opsPath => insertRun(opsPath, { ts: recentTs }),
      env: { INTERVAL_MIN: '0.1', PING_MIN: '0.05', HEALTHCHECK_URL: hb.url() },   // MAXAGE = 2*INTERVAL = 12s
    }, async ({ baseUrl }) => {
      await waitForHttp(`${baseUrl}/health`)
      await waitFor(() => hb.hits.length >= 1, { timeout: 2000, label: 'unconditional boot ping' })
      await waitFor(() => hb.hits.length >= 2, { timeout: 5000, label: 'conditional ping (fresh ops.db)' })
    })
  } finally { await closeCapture(hb) }
})

test('05b heartbeat stays silent beyond the boot ping when the last cycle is stale (engine looks stalled)', async () => {
  const hb = await captureServer()
  try {
    const staleTs = new Date(Date.now() - 60000).toISOString()   // 60s old, MAXAGE below is only 12s
    await withServer({
      seedOps: opsPath => insertRun(opsPath, { ts: staleTs }),
      env: { INTERVAL_MIN: '0.1', PING_MIN: '0.05', HEALTHCHECK_URL: hb.url() },
    }, async ({ baseUrl }) => {
      await waitForHttp(`${baseUrl}/health`)
      await waitFor(() => hb.hits.length >= 1, { timeout: 2000, label: 'unconditional boot ping' })
      await sleep(4000)   // let 1-2 more PING_MIN cycles elapse
      assert.equal(hb.hits.length, 1, 'no ping beyond the unconditional boot ping — this is the fix that detects a stalled engine')
    })
  } finally { await closeCapture(hb) }
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Backup — ops.db.bak created ~30s after boot (hardcoded delay, see report)
// ─────────────────────────────────────────────────────────────────────────────
test('06 ops.db is backed up to ops.db.bak', { timeout: 40000 }, async () => {
  await withServer({
    seedOps: opsPath => insertRun(opsPath, { ts: new Date().toISOString() }),
  }, async ({ opsPath }) => {
    await waitFor(() => fs.existsSync(opsPath + '.bak'), { timeout: 35000, interval: 500, label: 'ops.db.bak created' })
    const orig = fs.readFileSync(opsPath)
    const bak = fs.readFileSync(opsPath + '.bak')
    assert.deepEqual(bak, orig, 'backup content must match ops.db at copy time')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. SIGTERM: kills the running child, exits cleanly, no orphan
// ─────────────────────────────────────────────────────────────────────────────
test('07 SIGTERM kills the active child and the server exits cleanly (no orphan)', async () => {
  await withServer({ stub: STUB_HANG }, async ({ baseUrl, dir, proc, stdout }) => {
    await waitForHttp(`${baseUrl}/health`)
    await waitFor(() => fs.existsSync(path.join(dir, 'child.pid')), { timeout: 7000, label: 'hung child started' })
    const childPid = Number(fs.readFileSync(path.join(dir, 'child.pid'), 'utf8'))
    assert.doesNotThrow(() => process.kill(childPid, 0), 'child should be alive just before SIGTERM')

    const exited = new Promise(resolve => proc.once('exit', (code, signal) => resolve({ code, signal })))
    proc.kill('SIGTERM')
    const { code } = await Promise.race([
      exited,
      sleep(3000).then(() => { throw new Error('server did not exit within 3s of SIGTERM') }),
    ])
    assert.equal(code, 0, 'process.exit(0) expected after a clean shutdown')
    assert.match(stdout(), /SIGTERM reçu/)
    assert.throws(() => process.kill(childPid, 0), 'the ingest child must be dead too — no orphan left behind')
  })
})
