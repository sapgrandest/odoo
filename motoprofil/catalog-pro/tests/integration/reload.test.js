import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getCatalog } from '../../src/server/catalog.js'
import { createCatalogServer } from '../../src/server/catalog.js'
import { createTestApp, startServer, stopServer, get, post } from './helpers.js'

let server, baseUrl

beforeAll(async () => {
  await getCatalog()  // attend la fin du premier import
  const app = createTestApp()
  createCatalogServer(app)
  ;({ server, baseUrl } = await startServer(app))
})

afterAll(() => stopServer(server))

// Utilitaire : attend que le status soit ready (max 10s)
async function waitForReady(maxMs = 10000) {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    const { body } = await get(baseUrl, '/api/catalog/status')
    if (body.ready) return body
    await new Promise(r => setTimeout(r, 100))
  }
  throw new Error('Timeout : catalogue jamais prêt en ' + maxMs + 'ms')
}

// ── Phase 1 : état initial avant re-import ────────────────────────────────
describe('Avant le re-import', () => {
  it('catalogue prêt avec 15 articles', async () => {
    const { body } = await get(baseUrl, '/api/catalog/status')
    expect(body.ready).toBe(true)
    expect(body.total).toBe(15)
  })

  it('/browse retourne bien 15 articles', async () => {
    const { body } = await get(baseUrl, '/api/catalog/browse')
    expect(body.total).toBe(15)
    expect(body.items.length).toBeGreaterThan(0)
  })
})

// ── Phase 2 : déclenchement du re-import ─────────────────────────────────
describe('Déclenchement du re-import', () => {
  it("POST /reload répond immédiatement (ne bloque pas pendant l'import)", async () => {
    const start = Date.now()

    const { status, body } = await post(baseUrl, '/api/catalog/reload', {})

    const elapsed = Date.now() - start
    expect(status).toBe(200)
    expect(body.success).toBe(true)
    // Le POST doit répondre en < 500ms (il ne fait que déclencher, pas attendre)
    expect(elapsed).toBeLessThan(500)
  })
})

// ── Phase 3 : pendant le re-import ────────────────────────────────────────
describe('Pendant le re-import', () => {
  it('le serveur répond toujours à /status (pas de freeze)', async () => {
    const csvPath = process.env.CSV_PATH
    await post(baseUrl, '/api/catalog/reload', {})

    // Plusieurs requêtes rapides — aucune ne doit bloquer plus de 2s
    const timeout = (ms) => new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`request hanged > ${ms}ms`)), ms)
    )

    const results = await Promise.all([
      Promise.race([get(baseUrl, '/api/catalog/status'), timeout(2000)]),
      Promise.race([get(baseUrl, '/api/catalog/status'), timeout(2000)]),
      Promise.race([get(baseUrl, '/api/catalog/status'), timeout(2000)]),
    ])

    for (const r of results) {
      expect(r.status).toBe(200)
      expect(r.body).toHaveProperty('ready')
      expect(r.body).toHaveProperty('loading')
    }
  })

  it('le serveur répond toujours à /browse pendant le re-import (même si vide)', async () => {
    const csvPath = process.env.CSV_PATH
    await post(baseUrl, '/api/catalog/reload', {})

    const timeout = (ms) => new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`request hanged > ${ms}ms`)), ms)
    )

    const { body } = await Promise.race([
      get(baseUrl, '/api/catalog/browse'),
      timeout(2000)
    ])

    // Le serveur répond — total peut être 0 (pendant DELETE) ou 15 (déjà fini)
    expect(typeof body.total).toBe('number')
    expect(Array.isArray(body.items)).toBe(true)
  })
})

// ── Phase 4 : après le re-import ─────────────────────────────────────────
describe('Après le re-import', () => {
  it('status revient à ready:true avec 15 articles', async () => {
    const csvPath = process.env.CSV_PATH
    await post(baseUrl, '/api/catalog/reload', {})

    const status = await waitForReady()
    expect(status.ready).toBe(true)
    expect(status.total).toBe(15)
  })

  it('les données sont complètes après re-import', async () => {
    const csvPath = process.env.CSV_PATH
    await post(baseUrl, '/api/catalog/reload', {})
    await waitForReady()

    const { body } = await get(baseUrl, '/api/catalog/browse')
    expect(body.total).toBe(15)
    expect(body.items.length).toBeGreaterThan(0)
  })

  it('les marques sont toujours disponibles après re-import', async () => {
    const csvPath = process.env.CSV_PATH
    await post(baseUrl, '/api/catalog/reload', {})
    await waitForReady()

    const { body } = await get(baseUrl, '/api/catalog/brands')
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(5)
    expect(body.map(b => b.name)).toContain('KAMOKA')
  })

  it("re-imports multiples successifs ne cassent pas l'état", async () => {
    const csvPath = process.env.CSV_PATH

    // Déclencher 3 re-imports rapides
    await post(baseUrl, '/api/catalog/reload', {})
    await post(baseUrl, '/api/catalog/reload', {})
    await post(baseUrl, '/api/catalog/reload', {})

    // Attendre la stabilisation
    const status = await waitForReady()
    expect(status.ready).toBe(true)
    expect(status.total).toBe(15)

    const { body } = await get(baseUrl, '/api/catalog/browse')
    expect(body.total).toBe(15)
  })
})
