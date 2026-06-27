import { describe, it, expect } from 'vitest'
import { parseRow, buildIndexes, paginateResult } from '../../src/server/catalog.js'

// ── parseRow — robustesse ────────────────────────────────────────────────
describe('parseRow — edge cases', () => {
  it('row avec < 64 colonnes → pas de crash, champs manquants valent zéro/vide', () => {
    const short = ['1', 'SHORT-001', 'BRAND', '', 'Nom']  // seulement 5 colonnes
    expect(() => parseRow(short)).not.toThrow()
    const art = parseRow(short)
    expect(art.motonet).toBe('SHORT-001')
    expect(art.priceNet).toBe(0)          // col 6 absente → 0
    expect(art.stockChorzow).toBe(0)      // col 17 absente → 0
    expect(art.nonReturnable).toBe(false) // col 22 absente → false
    expect(art.temotCat).toBe('')         // col 27 absente → ''
  })

  it('prix à zéro → priceNet = 0', () => {
    const cols = new Array(64).fill('')
    cols[1] = 'Z-001'; cols[6] = '0'
    expect(parseRow(cols).priceNet).toBe(0)
  })

  it('prix vide → priceNet = 0', () => {
    const cols = new Array(64).fill('')
    cols[1] = 'Z-002'; cols[6] = ''
    expect(parseRow(cols).priceNet).toBe(0)
  })

  it('minQty vide → minQty = 1 (default)', () => {
    const cols = new Array(64).fill('')
    cols[1] = 'Z-003'; cols[15] = ''
    expect(parseRow(cols).minQty).toBe(1)
  })

  it('minQty explicite → respectée', () => {
    const cols = new Array(64).fill('')
    cols[1] = 'Z-004'; cols[15] = '4'
    expect(parseRow(cols).minQty).toBe(4)
  })

  it('splitPayroll (col 60) — "1" = true, "" = false', () => {
    const cols = new Array(64).fill('')
    cols[1] = 'Z-005'; cols[60] = '1'
    expect(parseRow(cols).splitPayroll).toBe(true)
    cols[60] = ''
    expect(parseRow(cols).splitPayroll).toBe(false)
  })

  it('alternatives — filtre les vides sur toute la plage 31-50', () => {
    const cols = new Array(64).fill('')
    cols[1] = 'Z-006'
    // Seulement 2 alternatives non-vides sur 20 slots
    cols[31] = 'ALT-A'
    cols[35] = 'ALT-B'
    const art = parseRow(cols)
    expect(art.alternatives).toEqual(['ALT-A', 'ALT-B'])
    expect(art.alternatives).toHaveLength(2)
  })

  it('prix avec virgule ET sans décimale (ex: "50") → parsé correctement', () => {
    const cols = new Array(64).fill('')
    cols[1] = 'Z-007'; cols[6] = '50'
    expect(parseRow(cols).priceNet).toBe(50)
  })
})

// ── buildIndexes — edge cases ────────────────────────────────────────────
describe('buildIndexes — edge cases', () => {
  it('catalogue vide → total=0, priceRange={min:0, max:0}', () => {
    const cat = buildIndexes([])
    expect(cat.total).toBe(0)
    expect(cat.priceRange.min).toBe(0)
    expect(cat.priceRange.max).toBe(0)
    expect(cat.brandStats).toHaveLength(0)
    expect(cat.categoryStats).toHaveLength(0)
  })

  it('articles avec manufacturer vide → comptés dans brandStats', () => {
    const arts = [
      { motonet: 'A', manufacturer: '', temotCat: 'CAT', discountGroup: 'G',
        priceNet: 10, vatRate: 23 },
      { motonet: 'B', manufacturer: 'BRAND', temotCat: 'CAT', discountGroup: 'G',
        priceNet: 20, vatRate: 23 },
    ]
    const cat = buildIndexes(arts)
    // L'article sans manufacturer est dans brandStats avec name=''
    const emptyBrand = cat.brandStats.find(b => b.name === '')
    expect(emptyBrand).toBeDefined()
    expect(emptyBrand.count).toBe(1)
  })

  it('articles tous sans prix → priceRange={min:0, max:0}', () => {
    const arts = [
      { motonet: 'A', manufacturer: 'B', temotCat: '', discountGroup: '',
        priceNet: 0, vatRate: 0 },
    ]
    const cat = buildIndexes(arts)
    expect(cat.priceRange.min).toBe(0)
    expect(cat.priceRange.max).toBe(0)
  })

  it('un seul article → priceRange.min = priceRange.max', () => {
    const arts = [
      { motonet: 'A', manufacturer: 'B', temotCat: 'C', discountGroup: 'D',
        priceNet: 42, vatRate: 23 },
    ]
    const cat = buildIndexes(arts)
    expect(cat.priceRange.min).toBe(42)
    expect(cat.priceRange.max).toBe(42)
  })

  it('vatRates trié croissant', () => {
    const arts = [
      { motonet: 'A', manufacturer: 'B', temotCat: 'C', discountGroup: 'D', priceNet: 10, vatRate: 23 },
      { motonet: 'B', manufacturer: 'B', temotCat: 'C', discountGroup: 'D', priceNet: 10, vatRate: 8 },
      { motonet: 'C', manufacturer: 'B', temotCat: 'C', discountGroup: 'D', priceNet: 10, vatRate: 5 },
    ]
    const cat = buildIndexes(arts)
    expect(cat.vatRates).toEqual([5, 8, 23])
  })
})

// ── paginateResult — boundary conditions ─────────────────────────────────
describe('paginateResult — valeurs limites', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ id: i }))

  it('limit = 1 → 1 item par page, pages = 20', () => {
    const r = paginateResult(items, 1, 1)
    expect(r.items).toHaveLength(1)
    expect(r.pages).toBe(20)
  })

  it('limit > total → 1 page unique', () => {
    const r = paginateResult(items, 1, 100)
    expect(r.items).toHaveLength(20)
    expect(r.pages).toBe(1)
  })

  it('page = 0 traitée comme page 1 par la couche HTTP (limite = Math.max)', () => {
    // paginateResult elle-même ne clamp pas — c'est browseItems qui le fait
    // Elle retourne les items à start=(0-1)*limit=-limit → slice(-5,0)=[]
    // On vérifie juste que ça ne plante pas
    expect(() => paginateResult(items, 0, 5)).not.toThrow()
  })
})
