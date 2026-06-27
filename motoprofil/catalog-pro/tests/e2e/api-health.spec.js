// Tests de santé API — vérifient la structure et la cohérence des données brutes
// avant même de toucher à l'UI. Si ces tests échouent, l'UI sera forcément cassée.
import { test, expect } from '@playwright/test'
import { apiGet, looksLikeBrandName } from './helpers/api.js'

const MIN_ARTICLES = 500_000

test.describe('API Health', () => {

  test('GET /api/catalog/status — ready et cohérent', async ({ request }) => {
    const s = await apiGet(request, '/api/catalog/status')
    expect(s.ready, 'status.ready doit être true').toBe(true)
    expect(s.total, `total doit être > ${MIN_ARTICLES}`).toBeGreaterThan(MIN_ARTICLES)
    expect(s.brandsCount, 'brandsCount doit être > 100').toBeGreaterThan(100)
    expect(s.categoriesCount, 'categoriesCount doit être > 50').toBeGreaterThan(50)
  })

  test('GET /api/catalog/brands — vraies marques, pas des noms de produits', async ({ request }) => {
    const brands = await apiGet(request, '/api/catalog/brands')
    expect(Array.isArray(brands), 'brands doit être un tableau').toBe(true)
    expect(brands.length, 'au moins 100 marques attendues').toBeGreaterThan(100)

    // Chaque entrée a name et count
    for (const b of brands.slice(0, 50)) {
      expect(typeof b.name, `brand.name doit être string`).toBe('string')
      expect(b.name.length, `brand.name ne doit pas être vide`).toBeGreaterThan(0)
      expect(typeof b.count, `brand.count doit être number`).toBe('number')
      expect(b.count, `brand.count doit être > 0`).toBeGreaterThan(0)
    }

    // Vérification qualité : les 20 premières marques doivent ressembler à de vraies marques
    // (pas "10 OSTRZY ŁAMANYCH...", pas "108 NARZĘDZI W WALIZCE", etc.)
    const aberrants = brands.slice(0, 20).filter(b => !looksLikeBrandName(b.name))
    expect(
      aberrants.map(b => b.name),
      `Des entrées "marques" ressemblent à des noms de produits : ${aberrants.map(b => b.name).join(', ')}`
    ).toHaveLength(0)

    // La somme des counts ne doit pas dépasser le total (sanity check)
    const s = await apiGet(request, '/api/catalog/status')
    const sumCounts = brands.reduce((acc, b) => acc + b.count, 0)
    // Un article peut appartenir à plusieurs marques → somme >= total est acceptable
    // Mais si sumCounts < total/2, quelque chose ne va pas
    expect(sumCounts, 'somme des counts marques doit couvrir au moins 50% du catalogue').toBeGreaterThan(s.total / 2)
  })

  test('GET /api/catalog/categories — structure correcte', async ({ request }) => {
    const cats = await apiGet(request, '/api/catalog/categories')
    expect(Array.isArray(cats)).toBe(true)
    expect(cats.length).toBeGreaterThan(50)
    for (const c of cats.slice(0, 20)) {
      expect(typeof c.name).toBe('string')
      expect(c.name.length).toBeGreaterThan(0)
      expect(c.count).toBeGreaterThan(0)
    }
  })

  test('GET /api/catalog/browse — structure et champs complets', async ({ request }) => {
    const data = await apiGet(request, '/api/catalog/browse?brand=BOSCH')
    expect(data.total, 'BOSCH doit avoir des articles').toBeGreaterThan(0)
    expect(Array.isArray(data.items)).toBe(true)
    expect(data.items.length).toBeGreaterThan(0)
    expect(typeof data.pages).toBe('number')
    expect(data.page).toBe(1)

    // Vérifier les champs de chaque article
    const requiredFields = ['motonet', 'manufacturer', 'name', 'priceNet', 'priceRetail',
      'discount', 'stockChorzow', 'stockHub', 'vatRate']
    for (const item of data.items.slice(0, 5)) {
      for (const f of requiredFields) {
        expect(item, `article doit avoir le champ "${f}"`).toHaveProperty(f)
      }
      // manufacturer ne doit pas être un nom de produit
      expect(
        looksLikeBrandName(item.manufacturer),
        `manufacturer "${item.manufacturer}" ressemble à un nom de produit`
      ).toBe(true)
    }
  })

  test('GET /api/catalog/browse — filtres prix fonctionnent', async ({ request }) => {
    const data = await apiGet(request, '/api/catalog/browse?minPrice=10&maxPrice=50&brand=BOSCH')
    for (const item of data.items) {
      expect(item.priceNet, `priceNet ${item.priceNet} doit être >= 10`).toBeGreaterThanOrEqual(10)
      expect(item.priceNet, `priceNet ${item.priceNet} doit être <= 50`).toBeLessThanOrEqual(50)
    }
  })

  test('GET /api/catalog/browse — filtre inStock cohérent', async ({ request }) => {
    const data = await apiGet(request, '/api/catalog/browse?inStock=1&brand=BOSCH')
    expect(data.total).toBeGreaterThan(0)
    for (const item of data.items) {
      expect(
        (item.stockChorzow ?? 0) > 0 || (item.stockHub ?? 0) > 0,
        `article ${item.motonet} : inStock=1 mais stockChorzow=${item.stockChorzow} stockHub=${item.stockHub}`
      ).toBe(true)
    }
  })

  test('GET /api/catalog/browse — tri priceNet asc cohérent', async ({ request }) => {
    const data = await apiGet(request, '/api/catalog/browse?sortBy=priceNet&sortDir=asc&brand=BOSCH')
    const prices = data.items.map(i => i.priceNet)
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i], `prices[${i}]=${prices[i]} doit être >= prices[${i-1}]=${prices[i-1]}`).toBeGreaterThanOrEqual(prices[i - 1])
    }
  })

  test('GET /api/catalog/browse — pagination cohérente', async ({ request }) => {
    const p1 = await apiGet(request, '/api/catalog/browse?brand=BOSCH&page=1&limit=10')
    const p2 = await apiGet(request, '/api/catalog/browse?brand=BOSCH&page=2&limit=10')
    const ids1 = p1.items.map(i => i.motonet)
    const ids2 = p2.items.map(i => i.motonet)
    // Aucun motonet commun entre page 1 et page 2
    const overlap = ids1.filter(id => ids2.includes(id))
    expect(overlap, `Overlap entre page 1 et page 2 : ${overlap.join(', ')}`).toHaveLength(0)
  })

  test('GET /api/catalog/browse — marque inexistante → total 0', async ({ request }) => {
    const data = await apiGet(request, '/api/catalog/browse?brand=MARQUE_INEXISTANTE_XYZ_9999')
    expect(data.total).toBe(0)
    expect(data.items).toHaveLength(0)
  })

  test('GET /api/stats/overview — valeurs cohérentes', async ({ request }) => {
    const o = await apiGet(request, '/api/stats/overview')
    expect(o.total).toBeGreaterThan(MIN_ARTICLES)
    expect(o.inStock).toBeGreaterThan(0)
    expect(o.inStock).toBeLessThanOrEqual(o.total)
    expect(o.brands).toBeGreaterThan(100)
    expect(o.categories).toBeGreaterThan(50)
    expect(o.avgPriceRetail, 'avgPriceRetail doit être > avgPriceNet').toBeGreaterThan(o.avgPriceNet)
    expect(o.avgPriceNet).toBeGreaterThan(0)
    expect(o.maxPrice).toBeGreaterThan(o.avgPriceRetail)
  })

  test('GET /api/stats/brands-top — 10 vraies marques', async ({ request }) => {
    const brands = await apiGet(request, '/api/stats/brands-top?limit=10')
    expect(brands).toHaveLength(10)
    for (const b of brands) {
      expect(typeof b.name).toBe('string')
      expect(b.count).toBeGreaterThan(0)
      expect(b.avgPriceRetail).toBeGreaterThan(0)
      expect(
        looksLikeBrandName(b.name),
        `Top brand "${b.name}" ressemble à un nom de produit`
      ).toBe(true)
    }
    // Trié décroissant par count
    for (let i = 1; i < brands.length; i++) {
      expect(brands[i].count).toBeLessThanOrEqual(brands[i - 1].count)
    }
  })

  test('GET /api/stats/catalogue-health — pourcentages entre 0 et 100', async ({ request }) => {
    const h = await apiGet(request, '/api/stats/catalogue-health')
    const pcts = ['pctOem', 'pctBarcode', 'pctDesc', 'pctWeight', 'pctStock', 'pctStockHub']
    for (const k of pcts) {
      expect(h[k], `${k}=${h[k]} doit être entre 0 et 100`).toBeGreaterThanOrEqual(0)
      expect(h[k], `${k}=${h[k]} doit être entre 0 et 100`).toBeLessThanOrEqual(100)
    }
    expect(h.avgMargin, 'avgMargin doit être > 0').toBeGreaterThan(0)
  })

  test('GET /api/stats/vat-distribution — somme % ≈ 100', async ({ request }) => {
    const vat = await apiGet(request, '/api/stats/vat-distribution')
    expect(Array.isArray(vat)).toBe(true)
    const sumPct = vat.reduce((acc, v) => acc + (v.pct ?? 0), 0)
    expect(sumPct, `somme des pct TVA = ${sumPct}, doit être proche de 100`).toBeGreaterThan(95)
    expect(sumPct).toBeLessThanOrEqual(101)
  })

})
