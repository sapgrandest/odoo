import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getCatalog, createCatalogServer } from '../../src/server/catalog.js'
import { createTestApp, startServer, stopServer, get, post } from './helpers.js'

let server, baseUrl

beforeAll(async () => {
  await getCatalog() // attendre que le fixture CSV soit chargé
  const app = createTestApp()
  createCatalogServer(app)
  ;({ server, baseUrl } = await startServer(app))
})

afterAll(() => stopServer(server))

// ── /api/catalog/status ──────────────────────────────────────────────────
describe('GET /api/catalog/status', () => {
  it('retourne ready:true après chargement', async () => {
    const { status, body } = await get(baseUrl, '/api/catalog/status')
    expect(status).toBe(200)
    expect(body.ready).toBe(true)
  })

  it('total = 15 articles dans le fixture', async () => {
    const { body } = await get(baseUrl, '/api/catalog/status')
    expect(body.total).toBe(15)
  })

  it('inclut le champ loading avec status ready', async () => {
    const { body } = await get(baseUrl, '/api/catalog/status')
    expect(body.loading).toBeDefined()
    expect(body.loading.status).toBe('ready')
  })
})

// ── /api/catalog/brands ──────────────────────────────────────────────────
describe('GET /api/catalog/brands', () => {
  it('retourne 5 marques', async () => {
    const { status, body } = await get(baseUrl, '/api/catalog/brands')
    expect(status).toBe(200)
    expect(body).toHaveLength(5)
  })

  it('trié alphabétiquement (ATE en premier)', async () => {
    const { body } = await get(baseUrl, '/api/catalog/brands')
    expect(body[0].name).toBe('ATE')
  })

  it('chaque marque a un count > 0', async () => {
    const { body } = await get(baseUrl, '/api/catalog/brands')
    expect(body.every(b => b.count > 0)).toBe(true)
  })
})

// ── /api/catalog/categories ──────────────────────────────────────────────
describe('GET /api/catalog/categories', () => {
  it('retourne 3 catégories', async () => {
    const { body } = await get(baseUrl, '/api/catalog/categories')
    expect(body).toHaveLength(3)
  })

  it('trié par count desc — TI PR.CAT. 28 en premier (7 articles)', async () => {
    const { body } = await get(baseUrl, '/api/catalog/categories')
    expect(body[0].name).toBe('TI PR.CAT. 28')
    expect(body[0].count).toBe(7)
  })
})

// ── /api/catalog/browse ──────────────────────────────────────────────────
describe('GET /api/catalog/browse', () => {
  it('sans filtre — retourne tous les articles (15)', async () => {
    const { body } = await get(baseUrl, '/api/catalog/browse?limit=50')
    expect(body.total).toBe(15)
    expect(body.items).toHaveLength(15)
  })

  it('brand=KAMOKA → 3 articles', async () => {
    const { body } = await get(baseUrl, '/api/catalog/browse?brand=KAMOKA&limit=50')
    expect(body.total).toBe(3)
    expect(body.items.every(a => a.manufacturer === 'KAMOKA')).toBe(true)
  })

  it('brand=FEBI, category=TI PR.CAT. 68 → 1 article (FEBI-001)', async () => {
    const { body } = await get(baseUrl, '/api/catalog/browse?brand=FEBI&category=TI%20PR.CAT.%2068&limit=50')
    expect(body.total).toBe(1)
    expect(body.items[0].motonet).toBe('FEBI-001')
  })

  it('inStock=1 → 10 articles avec stock CZ', async () => {
    const { body } = await get(baseUrl, '/api/catalog/browse?inStock=1&limit=50')
    expect(body.total).toBe(10)
    expect(body.items.every(a => a.stockChorzow > 0)).toBe(true)
  })

  it('minPrice=100 → 2 articles (FEBI-002=120, BOSCH-002=200)', async () => {
    const { body } = await get(baseUrl, '/api/catalog/browse?minPrice=100&limit=50')
    expect(body.total).toBe(2)
  })

  it('discountGroup=A → 6 articles', async () => {
    const { body } = await get(baseUrl, '/api/catalog/browse?discountGroup=A&limit=50')
    expect(body.total).toBe(6)
  })

  it('pagination — page 1, limit 5 → 5 items, total 15, pages 3', async () => {
    const { body } = await get(baseUrl, '/api/catalog/browse?page=1&limit=5')
    expect(body.items).toHaveLength(5)
    expect(body.total).toBe(15)
    expect(body.pages).toBe(3)
  })

  it('pagination — page 4 hors-limite → items vide', async () => {
    const { body } = await get(baseUrl, '/api/catalog/browse?page=4&limit=5')
    expect(body.items).toHaveLength(0)
    expect(body.total).toBe(15)
  })

  it('sortBy=priceNet&sortDir=asc — premier article : KAMOKA-003 (5€)', async () => {
    const { body } = await get(baseUrl, '/api/catalog/browse?sortBy=priceNet&sortDir=asc&limit=50')
    expect(body.items[0].motonet).toBe('KAMOKA-003')
    expect(body.items[0].priceNet).toBe(5)
  })

  it('sortBy=priceNet&sortDir=desc — premier article : BOSCH-002 (200€)', async () => {
    const { body } = await get(baseUrl, '/api/catalog/browse?sortBy=priceNet&sortDir=desc&limit=50')
    expect(body.items[0].motonet).toBe('BOSCH-002')
  })
})

// ── /api/catalog/search ──────────────────────────────────────────────────
describe('GET /api/catalog/search', () => {
  it('q=kamoka → 3 articles (manufacturer)', async () => {
    const { body } = await get(baseUrl, '/api/catalog/search?q=kamoka')
    expect(body.total).toBe(3)
    expect(body.items.every(a => a.manufacturer === 'KAMOKA')).toBe(true)
  })

  it('q=KAMOKA-001 → 1 article exact (motonet)', async () => {
    const { body } = await get(baseUrl, '/api/catalog/search?q=KAMOKA-001')
    expect(body.total).toBe(1)
    expect(body.items[0].motonet).toBe('KAMOKA-001')
  })

  it('q=frein → 4 articles (description contient "frein")', async () => {
    const { body } = await get(baseUrl, '/api/catalog/search?q=frein')
    expect(body.total).toBe(4)
  })

  it('q inexistant → 0 articles', async () => {
    const { body } = await get(baseUrl, '/api/catalog/search?q=xxxxxxzzzzz')
    expect(body.total).toBe(0)
    expect(body.items).toHaveLength(0)
  })

  it('q vide → 0 articles (pas de full-scan)', async () => {
    const { body } = await get(baseUrl, '/api/catalog/search?q=')
    expect(body.total).toBe(0)
  })
})

// ── /api/catalog/articles ────────────────────────────────────────────────
describe('GET /api/catalog/articles', () => {
  it('lookup par motonets connus → retourne les bons articles', async () => {
    const { body } = await get(baseUrl, '/api/catalog/articles?motonets=KAMOKA-001,FEBI-002')
    expect(body).toHaveLength(2)
    expect(body.map(a => a.motonet).sort()).toEqual(['FEBI-002', 'KAMOKA-001'])
  })

  it('motonet inconnu → ignoré', async () => {
    const { body } = await get(baseUrl, '/api/catalog/articles?motonets=KAMOKA-001,INEXISTANT')
    expect(body).toHaveLength(1)
  })
})

// ── /api/catalog/discount-groups ─────────────────────────────────────────
describe('GET /api/catalog/discount-groups', () => {
  it('retourne 4 groupes', async () => {
    const { body } = await get(baseUrl, '/api/catalog/discount-groups')
    expect(body).toHaveLength(4)
  })
})

// ── /api/catalog/vat-rates ───────────────────────────────────────────────
describe('GET /api/catalog/vat-rates', () => {
  it('retourne [8, 23]', async () => {
    const { body } = await get(baseUrl, '/api/catalog/vat-rates')
    expect(body).toContain(8)
    expect(body).toContain(23)
    expect(body).toHaveLength(2)
  })
})

// ── /api/catalog/config ──────────────────────────────────────────────────
describe('GET /api/catalog/config', () => {
  it('retourne le chemin CSV courant et le statut', async () => {
    const { status, body } = await get(baseUrl, '/api/catalog/config')
    expect(status).toBe(200)
    expect(body.csvPath).toBeTruthy()
    expect(body.ready).toBe(true)
    expect(body.total).toBe(15)
  })
})

// ── /api/catalog/export ──────────────────────────────────────────────────
describe('GET /api/catalog/export — preview JSON', () => {
  it('preview=1 → retourne total + tableau preview', async () => {
    const { status, body } = await get(baseUrl, '/api/catalog/export?preview=1')
    expect(status).toBe(200)
    expect(body.total).toBe(15)
    expect(Array.isArray(body.preview)).toBe(true)
    expect(body.preview.length).toBeLessThanOrEqual(10)
  })

  it('preview=1 → chaque article preview a les champs attendus', async () => {
    const { body } = await get(baseUrl, '/api/catalog/export?preview=1')
    const item = body.preview[0]
    expect(item).toHaveProperty('motonet')
    expect(item).toHaveProperty('manufacturer')
    expect(item).toHaveProperty('priceNet')
    expect(item).toHaveProperty('priceRetail')
    expect(item).toHaveProperty('stockChorzow')
    expect(item).toHaveProperty('temotCat')
  })

  it('brand=KAMOKA&preview=1 → total=3', async () => {
    const { body } = await get(baseUrl, '/api/catalog/export?preview=1&brand=KAMOKA')
    expect(body.total).toBe(3)
    expect(body.preview.every(a => a.manufacturer === 'KAMOKA')).toBe(true)
  })

  it('hasStock=1&preview=1 → seulement les articles avec CZ ou HUB > 0', async () => {
    const { body } = await get(baseUrl, '/api/catalog/export?preview=1&hasStock=1')
    // 10 CZ + KAMOKA-002 Hub → 11 articles avec stock quelque part
    expect(body.total).toBeGreaterThan(0)
    expect(body.total).toBeLessThan(15)
  })

  it('minPrice=50&preview=1 → seulement articles avec priceNet ≥ 50', async () => {
    const { body } = await get(baseUrl, '/api/catalog/export?preview=1&minPrice=50')
    // FEBI-001(50), FEBI-002(120), BOSCH-002(200), ATE-002(90) = 4
    expect(body.total).toBe(4)
    expect(body.preview.every(a => a.priceNet >= 50)).toBe(true)
  })
})

describe('GET /api/catalog/export — téléchargement CSV', () => {
  it('format=shopify → Content-Type text/csv + Content-Disposition attachment', async () => {
    const { status, headers } = await get(baseUrl, '/api/catalog/export?format=shopify')
    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/text\/csv/)
    expect(headers['content-disposition']).toMatch(/attachment/)
    expect(headers['content-disposition']).toMatch(/shopify/)
  })

  it('format=csv (generic) → Content-Type text/csv', async () => {
    const { status, headers } = await get(baseUrl, '/api/catalog/export?format=csv')
    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/text\/csv/)
  })

  it('format=woocommerce → Content-Disposition avec "woocommerce"', async () => {
    const { status, headers } = await get(baseUrl, '/api/catalog/export?format=woocommerce')
    expect(status).toBe(200)
    expect(headers['content-disposition']).toMatch(/woocommerce/)
  })
})
