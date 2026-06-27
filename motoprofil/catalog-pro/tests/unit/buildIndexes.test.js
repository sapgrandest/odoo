import { describe, it, expect, beforeAll } from 'vitest'
import { buildIndexes } from '../../src/server/catalog.js'
import { ARTICLES } from '../fixtures/articles.js'

// Simule les objets retournés par parseRow
function toArticle(a) {
  return {
    motonet: a.motonet, manufacturer: a.manufacturer, name: a.name,
    priceNet: a.priceNet, priceRetail: a.priceRetail, barcode: a.barcode,
    weight: a.weight, description: a.description, stockChorzow: a.stockChorzow,
    discount: a.discount, discountGroup: a.discountGroup, nonReturnable: a.nonReturnable,
    temotCat: a.temotCat, stockHub: a.stockHub, vatRate: a.vatRate,
    original: '', tecDocArtNr: '', prefix: '', index: '', suppliersRef: '',
    deposit: 0, bail: 0, customCode: '', minQty: 1, unit: 'szt', attributes: '',
    mpSuperior: '', mpSubaltern: '', temotFam: '', replacementPrefix: '',
    replacementIndex: '', listAlternatives: '', alternatives: [],
    priceGrossRetail: 0, priceGrossPurchase: 0, tecDocHerNr: '', genericId: '',
    discountId: '', vatRate: a.vatRate, tecDocGenArtNr: '', productGroupCode: '',
    splitPayroll: false, countryCode: 'PL', productGroupCodeRequired: false, tecDocManufacturer: '',
  }
}

let cat

beforeAll(() => {
  cat = buildIndexes(ARTICLES.map(toArticle))
})

describe('buildIndexes — structure générale', () => {
  it('total = 15', () => expect(cat.total).toBe(15))
  it('brandStats — 5 marques', () => expect(cat.brandStats).toHaveLength(5))
  it('categoryStats — 3 catégories', () => expect(cat.categoryStats).toHaveLength(3))
  it('discountGroups — 4 groupes', () => expect(cat.discountGroups).toHaveLength(4))
  it('vatRates contient 8 et 23', () => {
    expect(cat.vatRates).toContain(8)
    expect(cat.vatRates).toContain(23)
    expect(cat.vatRates).toHaveLength(2)
  })
})

describe('buildIndexes — priceRange', () => {
  it('min = 5 (KAMOKA-003)', () => expect(cat.priceRange.min).toBe(5))
  it('max = 200 (BOSCH-002)', () => expect(cat.priceRange.max).toBe(200))
})

describe('buildIndexes — brandStats', () => {
  it('trié alphabétiquement', () => {
    const names = cat.brandStats.map(b => b.name)
    expect(names).toEqual([...names].sort())
  })

  it('chaque marque a 3 articles', () => {
    for (const b of cat.brandStats) {
      expect(b.count).toBe(3)
    }
  })
})

describe('buildIndexes — categoryStats', () => {
  it('trié par count desc', () => {
    const counts = cat.categoryStats.map(c => c.count)
    expect(counts[0]).toBeGreaterThanOrEqual(counts[1])
    expect(counts[1]).toBeGreaterThanOrEqual(counts[2])
  })

  it('TI PR.CAT. 28 → 7 articles', () => {
    const cat28 = cat.categoryStats.find(c => c.name === 'TI PR.CAT. 28')
    expect(cat28).toBeDefined()
    expect(cat28.count).toBe(7)
  })

  it('TI PR.CAT. 68 → 5 articles', () => {
    const cat68 = cat.categoryStats.find(c => c.name === 'TI PR.CAT. 68')
    expect(cat68?.count).toBe(5)
  })

  it('TI PR.CAT. 116 → 3 articles', () => {
    const cat116 = cat.categoryStats.find(c => c.name === 'TI PR.CAT. 116')
    expect(cat116?.count).toBe(3)
  })
})

describe('buildIndexes — byMotonet', () => {
  it('lookup exact par motonet', () => {
    expect(cat.byMotonet.get('KAMOKA-001')?.manufacturer).toBe('KAMOKA')
    expect(cat.byMotonet.get('BOSCH-002')?.priceNet).toBe(200)
    expect(cat.byMotonet.get('INEXISTANT')).toBeUndefined()
  })
})

describe('buildIndexes — byBrand', () => {
  it('FEBI → 3 articles', () => expect(cat.byBrand.get('FEBI')).toHaveLength(3))
  it('NGK → 3 articles', () => expect(cat.byBrand.get('NGK')).toHaveLength(3))
})

describe('buildIndexes — discountGroups', () => {
  it('groupe A = 6 articles (KAMOKA×3 + ATE×3)', () => {
    const A = cat.discountGroups.find(g => g.name === 'A')
    expect(A?.count).toBe(6)
  })

  it('groupes B, C, D = 3 articles chacun', () => {
    for (const name of ['B', 'C', 'D']) {
      const g = cat.discountGroups.find(g => g.name === name)
      expect(g?.count).toBe(3)
    }
  })
})
