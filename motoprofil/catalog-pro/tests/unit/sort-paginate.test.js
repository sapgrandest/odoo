import { describe, it, expect, beforeAll } from 'vitest'
import { sortItems, paginateResult } from '../../src/server/catalog.js'
import { ARTICLES } from '../fixtures/articles.js'

function toArticle(a) {
  return { motonet: a.motonet, manufacturer: a.manufacturer, priceNet: a.priceNet, priceRetail: a.priceRetail, stockChorzow: a.stockChorzow }
}

let articles

beforeAll(() => { articles = ARTICLES.map(toArticle) })

describe('sortItems — tri numérique', () => {
  it('priceNet asc — premier article est le moins cher (5€)', () => {
    const sorted = sortItems(articles, 'priceNet', 'asc')
    expect(sorted[0].priceNet).toBe(5)
    expect(sorted[0].motonet).toBe('KAMOKA-003')
  })

  it('priceNet desc — premier article est le plus cher (200€)', () => {
    const sorted = sortItems(articles, 'priceNet', 'desc')
    expect(sorted[0].priceNet).toBe(200)
    expect(sorted[0].motonet).toBe('BOSCH-002')
  })

  it('stockChorzow desc — premier article a le plus grand stock (NGK-001=20)', () => {
    const sorted = sortItems(articles, 'stockChorzow', 'desc')
    expect(sorted[0].stockChorzow).toBe(20)
  })

  it('ne modifie pas le tableau original', () => {
    const copy = [...articles]
    sortItems(articles, 'priceNet', 'asc')
    expect(articles.map(a => a.motonet)).toEqual(copy.map(a => a.motonet))
  })
})

describe('sortItems — tri alphabétique', () => {
  it('manufacturer asc — ATE avant BOSCH avant FEBI', () => {
    const sorted = sortItems(articles, 'manufacturer', 'asc')
    expect(sorted[0].manufacturer).toBe('ATE')
    // Tous les ATE en tête
    expect(sorted.slice(0, 3).every(a => a.manufacturer === 'ATE')).toBe(true)
  })

  it('motonet asc — KAMOKA-001 < KAMOKA-002 < KAMOKA-003 (après ATE,BOSCH,FEBI)', () => {
    const sorted = sortItems(articles, 'motonet', 'asc')
    const motones = sorted.map(a => a.motonet)
    expect(motones.indexOf('ATE-001')).toBeLessThan(motones.indexOf('KAMOKA-001'))
  })
})

describe('paginateResult — pagination correcte', () => {
  it('page 1, limit 5 — 5 articles, total 15, pages 3', () => {
    const r = paginateResult(articles, 1, 5)
    expect(r.items).toHaveLength(5)
    expect(r.total).toBe(15)
    expect(r.pages).toBe(3)
    expect(r.page).toBe(1)
    expect(r.limit).toBe(5)
  })

  it('page 2, limit 5 — articles 5-9', () => {
    const r = paginateResult(articles, 2, 5)
    expect(r.items).toHaveLength(5)
    expect(r.items[0].motonet).toBe(articles[5].motonet)
    expect(r.items[4].motonet).toBe(articles[9].motonet)
  })

  it('page 3, limit 5 — articles 10-14', () => {
    const r = paginateResult(articles, 3, 5)
    expect(r.items).toHaveLength(5)
  })

  it('page 4 au-delà du dernier — items vide, total/pages corrects', () => {
    const r = paginateResult(articles, 4, 5)
    expect(r.items).toHaveLength(0)
    expect(r.total).toBe(15)
    expect(r.pages).toBe(3)
  })

  it('page 1, limit 15 — tous les articles en une page', () => {
    const r = paginateResult(articles, 1, 15)
    expect(r.items).toHaveLength(15)
    expect(r.pages).toBe(1)
  })

  it('page 2, limit 10 — 5 articles restants (page partielle)', () => {
    const r = paginateResult(articles, 2, 10)
    expect(r.items).toHaveLength(5)
    expect(r.pages).toBe(2)
  })

  it('array vide — total 0, pages 0', () => {
    const r = paginateResult([], 1, 10)
    expect(r.total).toBe(0)
    expect(r.pages).toBe(0)
    expect(r.items).toHaveLength(0)
  })
})
