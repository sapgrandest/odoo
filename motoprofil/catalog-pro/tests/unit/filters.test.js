import { describe, it, expect, beforeAll } from 'vitest'
import { applyAllFilters, applySecondaryFilters, buildIndexes } from '../../src/server/catalog.js'
import { ARTICLES } from '../fixtures/articles.js'

function toArticle(a) {
  return {
    motonet: a.motonet, manufacturer: a.manufacturer, name: a.name,
    priceNet: a.priceNet, priceRetail: a.priceRetail, barcode: a.barcode,
    weight: a.weight, description: a.description, stockChorzow: a.stockChorzow,
    discount: a.discount, discountGroup: a.discountGroup, nonReturnable: a.nonReturnable,
    temotCat: a.temotCat, stockHub: a.stockHub, vatRate: a.vatRate,
    original: '', tecDocArtNr: '', alternatives: [],
  }
}

let articles

beforeAll(() => {
  articles = ARTICLES.map(toArticle)
})

describe('applyAllFilters — filtre par marque', () => {
  it('brand=KAMOKA → 3 articles', () => {
    const result = applyAllFilters(articles, { brand: 'KAMOKA' })
    expect(result).toHaveLength(3)
    expect(result.every(a => a.manufacturer === 'KAMOKA')).toBe(true)
  })

  it('brand=FEBI → 3 articles', () => {
    expect(applyAllFilters(articles, { brand: 'FEBI' })).toHaveLength(3)
  })

  it('brand=INEXISTANTE → 0 articles', () => {
    expect(applyAllFilters(articles, { brand: 'INEXISTANTE' })).toHaveLength(0)
  })
})

describe('applyAllFilters — filtre par catégorie', () => {
  it('category=TI PR.CAT. 28 → 7 articles', () => {
    const result = applyAllFilters(articles, { category: 'TI PR.CAT. 28' })
    expect(result).toHaveLength(7)
  })

  it('category=TI PR.CAT. 116 → 3 articles', () => {
    expect(applyAllFilters(articles, { category: 'TI PR.CAT. 116' })).toHaveLength(3)
  })
})

describe('applyAllFilters — filtre par discountGroup', () => {
  it('discountGroup=A → 6 articles (KAMOKA×3 + ATE×3)', () => {
    const result = applyAllFilters(articles, { discountGroup: 'A' })
    expect(result).toHaveLength(6)
    expect(result.every(a => a.discountGroup === 'A')).toBe(true)
  })

  it('discountGroup=D → 3 articles NGK', () => {
    const result = applyAllFilters(articles, { discountGroup: 'D' })
    expect(result).toHaveLength(3)
    expect(result.every(a => a.manufacturer === 'NGK')).toBe(true)
  })
})

describe('applyAllFilters — combinaisons marque + catégorie', () => {
  it('brand=KAMOKA, category=TI PR.CAT. 28 → 2 articles', () => {
    const result = applyAllFilters(articles, { brand: 'KAMOKA', category: 'TI PR.CAT. 28' })
    expect(result).toHaveLength(2)
    expect(result.map(a => a.motonet).sort()).toEqual(['KAMOKA-001', 'KAMOKA-002'])
  })

  it('brand=FEBI, category=TI PR.CAT. 68 → 1 article (FEBI-001)', () => {
    const result = applyAllFilters(articles, { brand: 'FEBI', category: 'TI PR.CAT. 68' })
    expect(result).toHaveLength(1)
    expect(result[0].motonet).toBe('FEBI-001')
  })

  it('brand=BOSCH, category=TI PR.CAT. 28 → 1 article (BOSCH-001)', () => {
    const result = applyAllFilters(articles, { brand: 'BOSCH', category: 'TI PR.CAT. 28' })
    expect(result).toHaveLength(1)
    expect(result[0].motonet).toBe('BOSCH-001')
  })
})

describe('applySecondaryFilters — stock', () => {
  it('inStock=1 → seulement articles avec stockChorzow > 0 (10 articles)', () => {
    const result = applySecondaryFilters(articles, { inStock: '1' })
    expect(result).toHaveLength(10)
    expect(result.every(a => a.stockChorzow > 0)).toBe(true)
  })

  it('inStock=0 → articles sans stock CZ (5 articles)', () => {
    const result = applySecondaryFilters(articles, { inStock: '0' })
    expect(result).toHaveLength(5)
    expect(result.every(a => a.stockChorzow <= 0)).toBe(true)
  })
})

describe('applySecondaryFilters — prix', () => {
  it('minPrice=100 → articles avec priceNet ≥ 100 (FEBI-002=120, BOSCH-002=200)', () => {
    const result = applySecondaryFilters(articles, { minPrice: '100' })
    expect(result).toHaveLength(2)
    expect(result.every(a => a.priceNet >= 100)).toBe(true)
  })

  it('maxPrice=10 → articles avec priceNet ≤ 10 (5,8,8 = 3)', () => {
    const result = applySecondaryFilters(articles, { maxPrice: '10' })
    expect(result).toHaveLength(3)
    expect(result.every(a => a.priceNet <= 10)).toBe(true)
  })

  it('minPrice=20, maxPrice=50 → articles entre 20 et 50', () => {
    const result = applySecondaryFilters(articles, { minPrice: '20', maxPrice: '50' })
    expect(result.every(a => a.priceNet >= 20 && a.priceNet <= 50)).toBe(true)
    // 22(ATE-003), 25(KAMOKA-002), 30(NGK-003), 35(ATE-001), 45(BOSCH-001), 50(FEBI-001) = 6
    expect(result).toHaveLength(6)
  })
})

describe('applySecondaryFilters — TVA', () => {
  it('vatRate=8 → FEBI-002, BOSCH-003, ATE-003 (3 articles)', () => {
    const result = applySecondaryFilters(articles, { vatRate: '8' })
    expect(result).toHaveLength(3)
    expect(result.every(a => a.vatRate === 8)).toBe(true)
  })

  it('vatRate=23 → 12 articles', () => {
    const result = applySecondaryFilters(articles, { vatRate: '23' })
    expect(result).toHaveLength(12)
  })
})

describe('applyAllFilters — combinaisons avancées', () => {
  it('brand=KAMOKA, inStock=1 → 2 articles (KAMOKA-001, KAMOKA-003)', () => {
    const result = applyAllFilters(articles, { brand: 'KAMOKA', inStock: '1' })
    expect(result).toHaveLength(2)
    expect(result.every(a => a.stockChorzow > 0)).toBe(true)
  })

  it('brand=KAMOKA, inStock=0 → 1 article (KAMOKA-002)', () => {
    const result = applyAllFilters(articles, { brand: 'KAMOKA', inStock: '0' })
    expect(result).toHaveLength(1)
    expect(result[0].motonet).toBe('KAMOKA-002')
  })

  it('category=TI PR.CAT. 68, inStock=1 → 4 articles avec stock', () => {
    const result = applyAllFilters(articles, { category: 'TI PR.CAT. 68', inStock: '1' })
    expect(result.every(a => a.temotCat === 'TI PR.CAT. 68' && a.stockChorzow > 0)).toBe(true)
  })
})
