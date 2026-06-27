import { describe, it, expect } from 'vitest'
import { parseRow } from '../../src/server/catalog.js'

function makeRow(overrides = {}) {
  const cols = new Array(64).fill('')
  cols[1]  = overrides.motonet      ?? 'TEST-001'
  cols[2]  = overrides.manufacturer ?? 'BRAND'
  cols[4]  = overrides.name         ?? 'Piece test'
  cols[6]  = overrides.priceNet     ?? '10,50'
  cols[13] = overrides.barcode      ?? '1234567890123'
  cols[14] = overrides.weight       ?? '0,25'
  cols[15] = overrides.minQty       ?? '1'
  cols[16] = overrides.description  ?? 'Description test'
  cols[17] = overrides.stockChorzow ?? '5'
  cols[18] = overrides.discount     ?? '25'
  cols[19] = overrides.discountGroup ?? 'A'
  cols[20] = overrides.priceRetail  ?? '15,75'
  cols[21] = overrides.unit         ?? 'szt'
  cols[22] = overrides.nonReturnable ?? ''
  cols[27] = overrides.temotCat     ?? 'TI PR.CAT. 28'
  cols[55] = overrides.stockHub     ?? '2'
  cols[57] = overrides.vatRate      ?? '23'
  cols[3]  = overrides.tecDocArtNr  ?? ''
  cols[5]  = overrides.original     ?? 'OE-12345'
  cols[23] = overrides.attributes   ?? ''
  // Alternatives in cols 31-50
  ;(overrides.alternatives || []).forEach((v, i) => { cols[31 + i] = v })
  return cols
}

describe('parseRow — mapping colonnes → champs article', () => {
  it('mappe motonet (col 1)', () => {
    expect(parseRow(makeRow({ motonet: 'ABC-123' })).motonet).toBe('ABC-123')
  })

  it('mappe manufacturer (col 2)', () => {
    expect(parseRow(makeRow({ manufacturer: 'BOSCH' })).manufacturer).toBe('BOSCH')
  })

  it('mappe name (col 4)', () => {
    expect(parseRow(makeRow({ name: 'Filtre huile' })).name).toBe('Filtre huile')
  })

  it('mappe priceNet (col 6) — virgule décimale polonaise', () => {
    expect(parseRow(makeRow({ priceNet: '10,50' })).priceNet).toBe(10.50)
    expect(parseRow(makeRow({ priceNet: '1234,99' })).priceNet).toBe(1234.99)
    expect(parseRow(makeRow({ priceNet: '' })).priceNet).toBe(0)
  })

  it('mappe barcode (col 13)', () => {
    expect(parseRow(makeRow({ barcode: '9012437037038' })).barcode).toBe('9012437037038')
    expect(parseRow(makeRow({ barcode: '' })).barcode).toBe('')
  })

  it('mappe weight (col 14) — virgule décimale', () => {
    expect(parseRow(makeRow({ weight: '1,250' })).weight).toBe(1.25)
  })

  it('mappe description (col 16)', () => {
    expect(parseRow(makeRow({ description: 'Desc test' })).description).toBe('Desc test')
  })

  it('mappe stockChorzow (col 17) — entier', () => {
    expect(parseRow(makeRow({ stockChorzow: '42' })).stockChorzow).toBe(42)
    expect(parseRow(makeRow({ stockChorzow: '0' })).stockChorzow).toBe(0)
  })

  it('mappe discount (col 18)', () => {
    expect(parseRow(makeRow({ discount: '30' })).discount).toBe(30)
  })

  it('mappe discountGroup (col 19)', () => {
    expect(parseRow(makeRow({ discountGroup: 'B2' })).discountGroup).toBe('B2')
  })

  it('mappe priceRetail (col 20) — virgule décimale', () => {
    expect(parseRow(makeRow({ priceRetail: '15,75' })).priceRetail).toBe(15.75)
  })

  it('mappe nonReturnable (col 22) — "1" = true, "" = false', () => {
    expect(parseRow(makeRow({ nonReturnable: '1' })).nonReturnable).toBe(true)
    expect(parseRow(makeRow({ nonReturnable: '' })).nonReturnable).toBe(false)
    expect(parseRow(makeRow({ nonReturnable: '0' })).nonReturnable).toBe(false)
  })

  it('mappe temotCat (col 27)', () => {
    expect(parseRow(makeRow({ temotCat: 'TI PR.CAT. 116' })).temotCat).toBe('TI PR.CAT. 116')
  })

  it('mappe stockHub (col 55)', () => {
    expect(parseRow(makeRow({ stockHub: '7' })).stockHub).toBe(7)
  })

  it('mappe vatRate (col 57)', () => {
    expect(parseRow(makeRow({ vatRate: '23' })).vatRate).toBe(23)
    expect(parseRow(makeRow({ vatRate: '8' })).vatRate).toBe(8)
  })

  it('mappe alternatives (cols 31-50) — filtre les vides', () => {
    const cols = makeRow({ alternatives: ['ALT-A', '', 'ALT-B', ''] })
    expect(parseRow(cols).alternatives).toEqual(['ALT-A', 'ALT-B'])
  })

  it('mappe original (col 5)', () => {
    expect(parseRow(makeRow({ original: 'OE-REF-99' })).original).toBe('OE-REF-99')
  })

  it('trim les espaces autour des valeurs texte', () => {
    const cols = makeRow({ manufacturer: '  KAMOKA  ', name: ' Filtre  ' })
    const art = parseRow(cols)
    expect(art.manufacturer).toBe('KAMOKA')
    expect(art.name).toBe('Filtre')
  })
})
