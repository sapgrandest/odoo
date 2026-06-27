import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getCatalog } from '../../src/server/catalog.js'
import { createStatsServer } from '../../src/server/stats.js'
import { createTestApp, startServer, stopServer, get } from './helpers.js'

let server, baseUrl

beforeAll(async () => {
  await getCatalog()
  const app = createTestApp()
  createStatsServer(app)
  ;({ server, baseUrl } = await startServer(app))
})

afterAll(() => stopServer(server))

// ── /api/stats/overview ──────────────────────────────────────────────────
describe('GET /api/stats/overview', () => {
  it('total = 15', async () => {
    const { body } = await get(baseUrl, '/api/stats/overview')
    expect(body.total).toBe(15)
  })

  it('brands = 5', async () => {
    const { body } = await get(baseUrl, '/api/stats/overview')
    expect(body.brands).toBe(5)
  })

  it('categories = 3', async () => {
    const { body } = await get(baseUrl, '/api/stats/overview')
    expect(body.categories).toBe(3)
  })

  it('inStock = 10 (articles avec stockChorzow > 0)', async () => {
    const { body } = await get(baseUrl, '/api/stats/overview')
    expect(body.inStock).toBe(10)
  })

  it('inStockHub = 6 (articles avec stockHub > 0)', async () => {
    const { body } = await get(baseUrl, '/api/stats/overview')
    expect(body.inStockHub).toBe(6)
  })

  it('nonReturnable = 5', async () => {
    const { body } = await get(baseUrl, '/api/stats/overview')
    expect(body.nonReturnable).toBe(5)
  })

  it('avgPriceRetail > 0', async () => {
    const { body } = await get(baseUrl, '/api/stats/overview')
    expect(body.avgPriceRetail).toBeGreaterThan(0)
    // 1012 / 15 ≈ 67.47
    expect(body.avgPriceRetail).toBeCloseTo(67.47, 0)
  })

  it('minPrice = 5, maxPrice = 200', async () => {
    const { body } = await get(baseUrl, '/api/stats/overview')
    expect(body.minPrice).toBe(5)
    expect(body.maxPrice).toBe(200)
  })
})

// ── /api/stats/brands-top ────────────────────────────────────────────────
describe('GET /api/stats/brands-top', () => {
  it('limit=5 → 5 marques', async () => {
    const { body } = await get(baseUrl, '/api/stats/brands-top?limit=5')
    expect(body).toHaveLength(5)
  })

  it('limit=3 → top 3 seulement', async () => {
    const { body } = await get(baseUrl, '/api/stats/brands-top?limit=3')
    expect(body).toHaveLength(3)
  })

  it('chaque entrée a les bons champs', async () => {
    const { body } = await get(baseUrl, '/api/stats/brands-top?limit=1')
    const brand = body[0]
    expect(brand).toHaveProperty('name')
    expect(brand).toHaveProperty('count')
    expect(brand).toHaveProperty('avgPriceRetail')
    expect(brand).toHaveProperty('inStock')
    expect(brand).toHaveProperty('inStockHub')
  })

  it('trié par count desc — toutes les marques ont count=3', async () => {
    const { body } = await get(baseUrl, '/api/stats/brands-top?limit=5')
    expect(body.every(b => b.count === 3)).toBe(true)
  })
})

// ── /api/stats/stock-by-brand ────────────────────────────────────────────
describe('GET /api/stats/stock-by-brand', () => {
  it('retourne des données de stock par marque', async () => {
    const { body } = await get(baseUrl, '/api/stats/stock-by-brand?limit=5')
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })

  it('chaque entrée a total, inStock, pctStock', async () => {
    const { body } = await get(baseUrl, '/api/stats/stock-by-brand?limit=5')
    const entry = body[0]
    expect(entry).toHaveProperty('total')
    expect(entry).toHaveProperty('inStock')
    expect(entry).toHaveProperty('pctStock')
    expect(entry.pctStock).toBeGreaterThanOrEqual(0)
    expect(entry.pctStock).toBeLessThanOrEqual(100)
  })
})

// ── /api/stats/categories ────────────────────────────────────────────────
describe('GET /api/stats/categories', () => {
  it('retourne 3 catégories', async () => {
    const { body } = await get(baseUrl, '/api/stats/categories?limit=30')
    expect(body).toHaveLength(3)
  })

  it('TI PR.CAT. 28 en tête avec 7 articles', async () => {
    const { body } = await get(baseUrl, '/api/stats/categories?limit=30')
    expect(body[0].category).toBe('TI PR.CAT. 28')
    expect(body[0].count).toBe(7)
  })

  it('chaque catégorie a avgPrice et inStock', async () => {
    const { body } = await get(baseUrl, '/api/stats/categories?limit=30')
    for (const cat of body) {
      expect(cat).toHaveProperty('avgPrice')
      expect(cat).toHaveProperty('inStock')
      expect(cat.inStock).toBeGreaterThanOrEqual(0)
    }
  })
})

// ── /api/stats/price-distribution ────────────────────────────────────────
describe('GET /api/stats/price-distribution', () => {
  it('retourne les buckets de prix', async () => {
    const { body } = await get(baseUrl, '/api/stats/price-distribution')
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })

  it('somme des counts = 15 (tous les articles ont un prix)', async () => {
    const { body } = await get(baseUrl, '/api/stats/price-distribution')
    const total = body.reduce((s, b) => s + b.count, 0)
    expect(total).toBe(15)
  })

  it('chaque bucket a range, label, count', async () => {
    const { body } = await get(baseUrl, '/api/stats/price-distribution')
    expect(body[0]).toHaveProperty('range')
    expect(body[0]).toHaveProperty('label')
    expect(body[0]).toHaveProperty('count')
  })
})

// ── /api/stats/catalogue-health ──────────────────────────────────────────
describe('GET /api/stats/catalogue-health', () => {
  it('retourne les pourcentages de qualité', async () => {
    const { status, body } = await get(baseUrl, '/api/stats/catalogue-health')
    expect(status).toBe(200)
    expect(body).toHaveProperty('pctOem')
    expect(body).toHaveProperty('pctBarcode')
    expect(body).toHaveProperty('pctStock')
    expect(body).toHaveProperty('pctDesc')
  })

  it('pctBarcode = 80 (12/15 ont un barcode)', async () => {
    const { body } = await get(baseUrl, '/api/stats/catalogue-health')
    expect(body.pctBarcode).toBeCloseTo(80, 0)
  })

  it('pctStock = 66.67 (10/15 en stock CZ)', async () => {
    const { body } = await get(baseUrl, '/api/stats/catalogue-health')
    expect(body.pctStock).toBeCloseTo(66.67, 0)
  })

  it('pctDesc = 100 (toutes les fixtures ont une description)', async () => {
    const { body } = await get(baseUrl, '/api/stats/catalogue-health')
    expect(body.pctDesc).toBeCloseTo(100, 0)
  })

  it('pctWeight = 100 (toutes les fixtures ont un poids > 0)', async () => {
    const { body } = await get(baseUrl, '/api/stats/catalogue-health')
    expect(body.pctWeight).toBeCloseTo(100, 0)
  })

  it('pctOem = 0 (aucune fixture n\'a de référence OEM)', async () => {
    const { body } = await get(baseUrl, '/api/stats/catalogue-health')
    expect(body.pctOem).toBe(0)
  })

  it('avgMargin > 0 (toutes les fixtures ont priceRetail > priceNet)', async () => {
    const { body } = await get(baseUrl, '/api/stats/catalogue-health')
    expect(body.avgMargin).toBeGreaterThan(0)
  })
})

// ── /api/stats/quality-by-brand ──────────────────────────────────────────
describe('GET /api/stats/quality-by-brand', () => {
  it('retourne 5 entrées (une par marque)', async () => {
    const { body } = await get(baseUrl, '/api/stats/quality-by-brand')
    expect(body).toHaveLength(5)
  })

  it('chaque entrée a les champs qualité requis', async () => {
    const { body } = await get(baseUrl, '/api/stats/quality-by-brand')
    const entry = body[0]
    expect(entry).toHaveProperty('name')
    expect(entry).toHaveProperty('count')
    expect(entry).toHaveProperty('pctOem')
    expect(entry).toHaveProperty('pctBarcode')
    expect(entry).toHaveProperty('pctDesc')
    expect(entry).toHaveProperty('pctWeight')
    expect(entry).toHaveProperty('pctStock')
    expect(entry).toHaveProperty('avgMargin')
    expect(entry).toHaveProperty('qualityScore')
  })

  it('KAMOKA pctBarcode = 33.3 (seulement KAMOKA-001 a un barcode)', async () => {
    const { body } = await get(baseUrl, '/api/stats/quality-by-brand')
    const kamoka = body.find(b => b.name === 'KAMOKA')
    expect(kamoka).toBeDefined()
    expect(kamoka.pctBarcode).toBeCloseTo(33.3, 0)
  })

  it('FEBI pctBarcode = 100 (les 3 FEBI ont un barcode)', async () => {
    const { body } = await get(baseUrl, '/api/stats/quality-by-brand')
    const febi = body.find(b => b.name === 'FEBI')
    expect(febi.pctBarcode).toBe(100)
  })

  it('KAMOKA pctStock = 100 (chaque article KAMOKA a CZ ou HUB > 0)', async () => {
    // KAMOKA-001 CZ=5, KAMOKA-002 Hub=2, KAMOKA-003 CZ=10
    const { body } = await get(baseUrl, '/api/stats/quality-by-brand')
    const kamoka = body.find(b => b.name === 'KAMOKA')
    expect(kamoka.pctStock).toBe(100)
  })

  it('toutes les marques ont pctDesc = 100 et pctWeight = 100', async () => {
    const { body } = await get(baseUrl, '/api/stats/quality-by-brand')
    for (const brand of body) {
      expect(brand.pctDesc).toBe(100)
      expect(brand.pctWeight).toBe(100)
    }
  })

  it('sort=score → la première entrée a le qualityScore le plus élevé', async () => {
    const { body } = await get(baseUrl, '/api/stats/quality-by-brand?sort=score')
    expect(body[0].qualityScore).toBeGreaterThanOrEqual(body[1].qualityScore)
    expect(body[1].qualityScore).toBeGreaterThanOrEqual(body[4].qualityScore)
  })

  it('sort=score → FEBI/BOSCH/NGK en tête (score=70), KAMOKA et ATE en queue', async () => {
    // FEBI,BOSCH,NGK: pctBarcode=100, pctStock=66.7 → score ≈ 70
    // KAMOKA: pctBarcode=33.3, pctStock=100 → score ≈ 66.7
    // ATE: pctBarcode=66.7, pctStock=66.7 → score ≈ 63.3
    const { body } = await get(baseUrl, '/api/stats/quality-by-brand?sort=score')
    const topScore = body[0].qualityScore
    expect(topScore).toBeCloseTo(70, 0)
    const ate = body.find(b => b.name === 'ATE')
    expect(ate.qualityScore).toBeLessThan(topScore)
  })

  it('limit=2 → seulement 2 entrées', async () => {
    const { body } = await get(baseUrl, '/api/stats/quality-by-brand?limit=2')
    expect(body).toHaveLength(2)
  })
})

// ── /api/stats/scatter ────────────────────────────────────────────────────
describe('GET /api/stats/scatter', () => {
  it('retourne {data, xLabel, yLabel}', async () => {
    const { status, body } = await get(baseUrl, '/api/stats/scatter')
    expect(status).toBe(200)
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('xLabel')
    expect(body).toHaveProperty('yLabel')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('5 marques retournées (chacune a ≥ 3 articles valides)', async () => {
    const { body } = await get(baseUrl, '/api/stats/scatter')
    expect(body.data).toHaveLength(5)
  })

  it('chaque point a name, x, y, count', async () => {
    const { body } = await get(baseUrl, '/api/stats/scatter')
    const point = body.data[0]
    expect(point).toHaveProperty('name')
    expect(point).toHaveProperty('x')
    expect(point).toHaveProperty('y')
    expect(point).toHaveProperty('count')
    expect(point.count).toBe(3)
  })

  it('xLabel change selon le param x', async () => {
    const { body: b1 } = await get(baseUrl, '/api/stats/scatter?x=priceNet')
    const { body: b2 } = await get(baseUrl, '/api/stats/scatter?x=priceRetail')
    expect(b1.xLabel).not.toBe(b2.xLabel)
  })

  it('x invalide → fallback sur priceNet', async () => {
    const { body: valid } = await get(baseUrl, '/api/stats/scatter?x=priceNet')
    const { body: bad }   = await get(baseUrl, '/api/stats/scatter?x=CHAMP_INCONNU')
    expect(bad.xLabel).toBe(valid.xLabel)
  })
})

// ── /api/stats/matrix ────────────────────────────────────────────────────
describe('GET /api/stats/matrix', () => {
  it('retourne {brands, categories, matrix, maxVal}', async () => {
    const { status, body } = await get(baseUrl, '/api/stats/matrix?brands=5&cats=3')
    expect(status).toBe(200)
    expect(Array.isArray(body.brands)).toBe(true)
    expect(Array.isArray(body.categories)).toBe(true)
    expect(body).toHaveProperty('matrix')
    expect(typeof body.maxVal).toBe('number')
  })

  it('brands=5 → 5 marques dans la liste', async () => {
    const { body } = await get(baseUrl, '/api/stats/matrix?brands=5&cats=3')
    expect(body.brands).toHaveLength(5)
  })

  it('cats=3 → les 3 catégories du fixture', async () => {
    const { body } = await get(baseUrl, '/api/stats/matrix?brands=5&cats=3')
    expect(body.categories).toHaveLength(3)
  })

  it('matrice contient toutes les marques × catégories', async () => {
    const { body } = await get(baseUrl, '/api/stats/matrix?brands=5&cats=3')
    for (const brand of body.brands) {
      expect(body.matrix[brand]).toBeDefined()
      for (const cat of body.categories) {
        expect(typeof body.matrix[brand][cat]).toBe('number')
      }
    }
  })

  it('maxVal = 2 (KAMOKA et NGK ont chacun 2 articles en TI PR.CAT. 28)', async () => {
    const { body } = await get(baseUrl, '/api/stats/matrix?brands=5&cats=3')
    expect(body.maxVal).toBe(2)
  })
})

// ── /api/stats/discount-groups (stats) ───────────────────────────────────
describe('GET /api/stats/discount-groups', () => {
  it('retourne 4 groupes de remise', async () => {
    const { body } = await get(baseUrl, '/api/stats/discount-groups')
    expect(body).toHaveLength(4)
  })

  it('chaque groupe a name, count, avgDiscount', async () => {
    const { body } = await get(baseUrl, '/api/stats/discount-groups')
    const g = body[0]
    expect(g).toHaveProperty('name')
    expect(g).toHaveProperty('count')
    expect(g).toHaveProperty('avgDiscount')
  })

  it('groupe A → count=6, avgDiscount ≈ 21.5 (KAMOKA 25, ATE 18)', async () => {
    const { body } = await get(baseUrl, '/api/stats/discount-groups')
    const grpA = body.find(g => g.name === 'A')
    expect(grpA.count).toBe(6)
    // (25*3 + 18*3) / 6 = 21.5
    expect(grpA.avgDiscount).toBeCloseTo(21.5, 1)
  })

  it('groupe B → avgDiscount = 30 (toutes les FEBI à 30%)', async () => {
    const { body } = await get(baseUrl, '/api/stats/discount-groups')
    const grpB = body.find(g => g.name === 'B')
    expect(grpB.avgDiscount).toBeCloseTo(30, 0)
  })
})

// ── /api/stats/distribution ───────────────────────────────────────────────
describe('GET /api/stats/distribution', () => {
  it('retourne {buckets, stats}', async () => {
    const { status, body } = await get(baseUrl, '/api/stats/distribution?field=priceNet')
    expect(status).toBe(200)
    expect(Array.isArray(body.buckets)).toBe(true)
    expect(body).toHaveProperty('stats')
  })

  it('stats contient avg, median, min, max, count', async () => {
    const { body } = await get(baseUrl, '/api/stats/distribution?field=priceNet')
    expect(body.stats).toHaveProperty('avg')
    expect(body.stats).toHaveProperty('median')
    expect(body.stats).toHaveProperty('min')
    expect(body.stats).toHaveProperty('max')
    expect(body.stats).toHaveProperty('count')
  })

  it('field=priceNet sans filtre → count = 15', async () => {
    const { body } = await get(baseUrl, '/api/stats/distribution?field=priceNet')
    expect(body.stats.count).toBe(15)
  })

  it('field=priceNet → stats.min=5, stats.max=200', async () => {
    const { body } = await get(baseUrl, '/api/stats/distribution?field=priceNet')
    expect(body.stats.min).toBe(5)
    expect(body.stats.max).toBe(200)
  })

  it('brand=KAMOKA → count=3, avg≈13.5', async () => {
    const { body } = await get(baseUrl, '/api/stats/distribution?field=priceNet&brand=KAMOKA')
    expect(body.stats.count).toBe(3)
    // KAMOKA: 10.5, 25, 5 → sum=40.5 / 3 = 13.5
    expect(body.stats.avg).toBeCloseTo(13.5, 1)
  })

  it('champ invalide → fallback sur priceNet', async () => {
    const { body: bad }   = await get(baseUrl, '/api/stats/distribution?field=INCONNU')
    const { body: valid } = await get(baseUrl, '/api/stats/distribution?field=priceNet')
    expect(bad.stats.count).toBe(valid.stats.count)
  })
})

// ── /api/stats/top-margins ────────────────────────────────────────────────
describe('GET /api/stats/top-margins', () => {
  it('retourne {total, avgMarginPct, avgMarginValue, topPct, topValue, items}', async () => {
    const { status, body } = await get(baseUrl, '/api/stats/top-margins')
    expect(status).toBe(200)
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('avgMarginPct')
    expect(body).toHaveProperty('avgMarginValue')
    expect(body).toHaveProperty('items')
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.total).toBe(15)
  })

  it('chaque item a motonet, manufacturer, priceNet, priceRetail, marginPct, marginValue', async () => {
    const { body } = await get(baseUrl, '/api/stats/top-margins')
    const item = body.items[0]
    expect(item).toHaveProperty('motonet')
    expect(item).toHaveProperty('manufacturer')
    expect(item).toHaveProperty('priceNet')
    expect(item).toHaveProperty('priceRetail')
    expect(item).toHaveProperty('marginPct')
    expect(item).toHaveProperty('marginValue')
    expect(item.marginPct).toBeGreaterThan(0)
  })

  it('trié par marginPct desc par défaut', async () => {
    const { body } = await get(baseUrl, '/api/stats/top-margins')
    const items = body.items
    for (let i = 0; i < items.length - 1; i++) {
      expect(items[i].marginPct).toBeGreaterThanOrEqual(items[i + 1].marginPct)
    }
  })

  it('brand=KAMOKA → total=3, items tous KAMOKA', async () => {
    const { body } = await get(baseUrl, '/api/stats/top-margins?brand=KAMOKA')
    expect(body.total).toBe(3)
    expect(body.items).toHaveLength(3)
    expect(body.items.every(a => a.manufacturer === 'KAMOKA')).toBe(true)
  })

  it('limit=2 → items.length=2, total reste le total réel', async () => {
    const { body } = await get(baseUrl, '/api/stats/top-margins?limit=2')
    expect(body.items).toHaveLength(2)
    expect(body.total).toBe(15)
  })

  it('minMarginPct=35 → exclut les articles avec margin < 35%', async () => {
    const { body } = await get(baseUrl, '/api/stats/top-margins?minMarginPct=35')
    expect(body.items.every(a => a.marginPct >= 35)).toBe(true)
  })
})
