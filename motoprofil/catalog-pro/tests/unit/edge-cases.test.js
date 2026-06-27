import { describe, it, expect } from 'vitest'
import { parseRow } from '../../src/server/catalog.js'

// ── parseRow — robustesse ────────────────────────────────────────────────
describe('parseRow — edge cases', () => {
  it('row avec < 64 colonnes → pas de crash, champs manquants valent zéro/vide', () => {
    const short = ['1', 'SHORT-001', 'BRAND', '', 'Nom']
    expect(() => parseRow(short)).not.toThrow()
    const art = parseRow(short)
    expect(art.motonet).toBe('SHORT-001')
    expect(art.priceNet).toBe(0)
    expect(art.stockChorzow).toBe(0)
    expect(art.nonReturnable).toBe(false)
    expect(art.temotCat).toBe('')
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
    cols[31] = 'ALT-A'; cols[35] = 'ALT-B'
    const art = parseRow(cols)
    expect(art.alternatives).toEqual(['ALT-A', 'ALT-B'])
    expect(art.alternatives).toHaveLength(2)
  })

  it('prix entier sans virgule (ex: "50") → parsé correctement', () => {
    const cols = new Array(64).fill('')
    cols[1] = 'Z-007'; cols[6] = '50'
    expect(parseRow(cols).priceNet).toBe(50)
  })
})
