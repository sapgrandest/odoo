import fs from 'fs'
import os from 'os'
import path from 'path'
import readline from 'readline'
import { URL } from 'url'

const DEFAULT_CSV_PATH = '/data/catalogue.csv'

let currentCsvPath = process.env.CSV_PATH || process.env.VITE_CSV_PATH || DEFAULT_CSV_PATH
let catalog = null
let loadPromise = null
// { status: 'idle'|'loading'|'ready'|'error', loaded: N, error: '' }
let loadingProgress = { status: 'idle', loaded: 0, error: '' }

function json(res, data, status = 200) {
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = status
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

const pf = v => (!v ? 0 : parseFloat(v.replace(',', '.')) || 0)
const pb = v => v === '1'
const pc = v => (v ? v.trim() : '')

function parseRow(cols) {
  return {
    motonet: pc(cols[1]),
    manufacturer: pc(cols[2]),
    tecDocArtNr: pc(cols[3]),
    name: pc(cols[4]),
    original: pc(cols[5]),
    priceNet: pf(cols[6]),
    prefix: pc(cols[7]),
    index: pc(cols[8]),
    suppliersRef: pc(cols[9]),
    deposit: pf(cols[10]),
    bail: pf(cols[11]),
    customCode: pc(cols[12]),
    barcode: pc(cols[13]),
    weight: pf(cols[14]),
    minQty: pf(cols[15]) || 1,
    description: pc(cols[16]),
    stockChorzow: pf(cols[17]),
    discount: pf(cols[18]),
    discountGroup: pc(cols[19]),
    priceRetail: pf(cols[20]),
    unit: pc(cols[21]),
    nonReturnable: pb(cols[22]),
    attributes: pc(cols[23]),
    mpSuperior: pc(cols[24]),
    mpSubaltern: pc(cols[25]),
    temotFam: pc(cols[26]),
    temotCat: pc(cols[27]),
    replacementPrefix: pc(cols[28]),
    replacementIndex: pc(cols[29]),
    listAlternatives: pc(cols[30]),
    alternatives: cols.slice(31, 51).filter(v => v && v.trim()).map(v => v.trim()),
    priceGrossRetail: pf(cols[51]),
    priceGrossPurchase: pf(cols[52]),
    tecDocHerNr: pc(cols[53]),
    genericId: pc(cols[54]),
    stockHub: pf(cols[55]),
    discountId: pc(cols[56]),
    vatRate: pf(cols[57]),
    tecDocGenArtNr: pc(cols[58]),
    productGroupCode: pc(cols[59]),
    splitPayroll: pb(cols[60]),
    countryCode: pc(cols[61]),
    productGroupCodeRequired: pb(cols[62]),
    tecDocManufacturer: pc(cols[63])
  }
}

function buildIndexes(articles) {
  const byMotonet = new Map()
  const byBrand = new Map()
  const byCategory = new Map()
  const byDiscountGroup = new Map()
  const vatSet = new Set()
  let minPrice = Infinity
  let maxPrice = -Infinity

  for (const art of articles) {
    byMotonet.set(art.motonet, art)

    const brand = art.manufacturer || ''
    if (!byBrand.has(brand)) byBrand.set(brand, [])
    byBrand.get(brand).push(art)

    const cat = art.temotCat || ''
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat).push(art)

    const dg = art.discountGroup || ''
    if (!byDiscountGroup.has(dg)) byDiscountGroup.set(dg, [])
    byDiscountGroup.get(dg).push(art)

    if (art.vatRate > 0) vatSet.add(art.vatRate)
    if (art.priceNet > 0) {
      if (art.priceNet < minPrice) minPrice = art.priceNet
      if (art.priceNet > maxPrice) maxPrice = art.priceNet
    }
  }

  return {
    articles,
    byMotonet,
    byBrand,
    byCategory,
    byDiscountGroup,
    brandStats: Array.from(byBrand.entries())
      .map(([name, items]) => ({ name, count: items.length }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    categoryStats: Array.from(byCategory.entries())
      .map(([name, items]) => ({ name, count: items.length }))
      .sort((a, b) => b.count - a.count),
    discountGroups: Array.from(byDiscountGroup.entries())
      .map(([name, items]) => ({ name, count: items.length }))
      .sort((a, b) => b.count - a.count),
    vatRates: Array.from(vatSet).sort((a, b) => a - b),
    priceRange: {
      min: minPrice === Infinity ? 0 : minPrice,
      max: maxPrice === -Infinity ? 0 : maxPrice
    },
    total: articles.length
  }
}

function loadCatalog(csvPath) {
  return new Promise((resolve, reject) => {
    const articles = []
    let firstLine = true
    loadingProgress = { status: 'loading', loaded: 0, error: '' }

    const fileStream = fs.createReadStream(csvPath, { encoding: 'utf8' })
    fileStream.on('error', reject)

    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })

    rl.on('line', (line) => {
      if (firstLine) { firstLine = false; return }
      if (!line) return
      const cols = line.split(';')
      if (cols.length < 2) return
      const art = parseRow(cols)
      if (art.motonet) {
        articles.push(art)
        loadingProgress.loaded = articles.length
      }
    })

    rl.on('close', () => {
      loadingProgress = { status: 'ready', loaded: articles.length, error: '' }
      resolve(buildIndexes(articles))
    })
    rl.on('error', reject)
  })
}

function startLoad(csvPath) {
  const p = csvPath || currentCsvPath
  loadPromise = loadCatalog(p)
    .then(result => { catalog = result; return catalog })
    .catch(err => {
      loadingProgress = { status: 'error', loaded: 0, error: err.message }
      loadPromise = null
      throw err
    })
  return loadPromise
}

export function startLoadBackground(csvPath) {
  catalog = null
  loadPromise = null
  loadingProgress = { status: 'loading', loaded: 0, error: '' }
  startLoad(csvPath || currentCsvPath).catch(err => {
    console.error('[catalog] Erreur rechargement:', err.message)
  })
}

export function getCatalog() {
  if (catalog) return Promise.resolve(catalog)
  return loadPromise || startLoad()
}

startLoad().catch(err => {
  console.error('[catalog] Erreur chargement CSV:', err.message)
})

const SORT_FIELDS = new Set(['name', 'priceNet', 'priceRetail', 'stockChorzow', 'motonet', 'manufacturer', 'discount'])

function sortItems(items, sortBy, sortDir) {
  const dir = sortDir === 'desc' ? -1 : 1
  return items.slice().sort((a, b) => {
    const av = a[sortBy]
    const bv = b[sortBy]
    if (typeof av === 'number' && typeof bv === 'number') return dir * (av - bv)
    return dir * String(av ?? '').localeCompare(String(bv ?? ''))
  })
}

function applySecondaryFilters(items, p) {
  if (p.inStock === '1') items = items.filter(a => a.stockChorzow > 0)
  else if (p.inStock === '0') items = items.filter(a => a.stockChorzow <= 0)
  if (p.minPrice) { const v = parseFloat(p.minPrice); if (!isNaN(v)) items = items.filter(a => a.priceNet >= v) }
  if (p.maxPrice) { const v = parseFloat(p.maxPrice); if (!isNaN(v)) items = items.filter(a => a.priceNet <= v) }
  if (p.vatRate) { const v = parseFloat(p.vatRate); if (!isNaN(v)) items = items.filter(a => a.vatRate === v) }
  return items
}

function applyAllFilters(items, p) {
  if (p.brand) items = items.filter(a => a.manufacturer === p.brand)
  if (p.category) items = items.filter(a => a.temotCat === p.category)
  if (p.discountGroup) items = items.filter(a => a.discountGroup === p.discountGroup)
  return applySecondaryFilters(items, p)
}

function paginateResult(items, page, limit) {
  const total = items.length
  const pages = Math.ceil(total / limit) || 0
  const start = (page - 1) * limit
  return { items: items.slice(start, start + limit), total, pages, page, limit }
}

function browseItems(cat, p) {
  let items
  if (p.brand) {
    items = cat.byBrand.get(p.brand) ?? []
    if (p.category) items = items.filter(a => a.temotCat === p.category)
    if (p.discountGroup) items = items.filter(a => a.discountGroup === p.discountGroup)
  } else if (p.category) {
    items = cat.byCategory.get(p.category) ?? []
    if (p.discountGroup) items = items.filter(a => a.discountGroup === p.discountGroup)
  } else if (p.discountGroup) {
    items = cat.byDiscountGroup.get(p.discountGroup) ?? []
  } else {
    items = cat.articles
  }

  items = applySecondaryFilters(items, p)
  if (p.sortBy && SORT_FIELDS.has(p.sortBy)) items = sortItems(items, p.sortBy, p.sortDir || 'asc')

  const page = Math.max(1, parseInt(p.page) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(p.limit) || 48))
  return paginateResult(items, page, limit)
}

function searchItems(cat, p) {
  const q = (p.q || '').toLowerCase().trim()
  if (!q) return { items: [], total: 0, pages: 0, page: 1 }

  let items = cat.articles.filter(a =>
    a.motonet.toLowerCase().includes(q) ||
    a.name.toLowerCase().includes(q) ||
    a.original.toLowerCase().includes(q) ||
    a.barcode.toLowerCase().includes(q) ||
    a.description.toLowerCase().includes(q) ||
    a.manufacturer.toLowerCase().includes(q) ||
    a.attributes.toLowerCase().includes(q)
  )

  items = applyAllFilters(items, p)
  if (p.sortBy && SORT_FIELDS.has(p.sortBy)) items = sortItems(items, p.sortBy, p.sortDir || 'asc')

  const page = Math.max(1, parseInt(p.page) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(p.limit) || 48))
  return paginateResult(items, page, limit)
}

export function createCatalogServer(middlewares) {
  middlewares.use(async (req, res, next) => {
    // Proxy CDN images pour permettre l'accès canvas (même origine)
    if (req.url.startsWith('/api/cdn-proxy/')) {
      const guid = req.url.slice('/api/cdn-proxy/'.length).split('?')[0]
      if (!guid) { res.statusCode = 400; res.end('guid required'); return }
      try {
        const imgRes = await fetch(`https://cdn.profiauto.com/Image/${guid}`)
        if (!imgRes.ok) { res.statusCode = 502; res.end('CDN error'); return }
        const buffer = await imgRes.arrayBuffer()
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Cache-Control', 'public, max-age=3600')
        res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg')
        res.statusCode = 200
        res.end(Buffer.from(buffer))
      } catch (err) {
        res.statusCode = 502; res.end(err.message)
      }
      return
    }

    if (!req.url.startsWith('/api/catalog')) return next()

    const url = new URL(req.url, 'http://localhost')
    const route = url.pathname.replace('/api/catalog', '') || '/'
    const p = Object.fromEntries(url.searchParams)

    try {
      if (route === '/status') {
        return json(res, {
          ready: !!catalog,
          total: catalog?.total ?? 0,
          brandsCount: catalog?.brandStats?.length ?? 0,
          categoriesCount: catalog?.categoryStats?.length ?? 0,
          loading: loadingProgress
        })
      }

      if (route === '/config') {
        if (req.method === 'GET') {
          return json(res, { csvPath: currentCsvPath, ready: !!catalog, total: catalog?.total ?? 0 })
        }
        if (req.method === 'POST') {
          let body
          try { body = await readBody(req) } catch { return json(res, { success: false, error: 'invalid JSON' }, 400) }
          const { csvPath } = body
          if (!csvPath) return json(res, { success: false, error: 'csvPath required' }, 400)
          currentCsvPath = csvPath
          startLoadBackground(csvPath)
          return json(res, { success: true, message: 'Chargement démarré en arrière-plan' })
        }
        return json(res, { error: 'method not allowed' }, 405)
      }

      if (route === '/upload') {
        if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405)
        const tmpPath = path.join(os.tmpdir(), `catalog_${Date.now()}.csv`)
        try {
          await new Promise((resolve, reject) => {
            const out = fs.createWriteStream(tmpPath)
            req.pipe(out)
            out.on('finish', resolve)
            out.on('error', reject)
            req.on('error', reject)
          })
          currentCsvPath = tmpPath
          startLoadBackground(tmpPath)
          return json(res, { success: true, tmpPath, message: 'Fichier reçu, chargement en cours' })
        } catch (err) {
          return json(res, { success: false, error: err.message }, 500)
        }
      }

      const cat = await getCatalog()

      if (route === '/brands') return json(res, cat.brandStats)
      if (route === '/categories') return json(res, cat.categoryStats)
      if (route === '/discount-groups') return json(res, cat.discountGroups)
      if (route === '/vat-rates') return json(res, cat.vatRates)
      if (route === '/articles') {
        const raw = p.motonets ?? ''
        const motonets = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
        const items = motonets.map(m => cat.byMotonet.get(m)).filter(Boolean)
        return json(res, items)
      }
      if (route === '/browse') return json(res, browseItems(cat, p))
      if (route === '/search') return json(res, searchItems(cat, p))

      if (route.startsWith('/article/')) {
        const motonet = decodeURIComponent(route.slice('/article/'.length))
        const art = cat.byMotonet.get(motonet)
        return art ? json(res, art) : json(res, { error: 'not found' }, 404)
      }

      if (route === '/export') {
        const format = p.format || 'csv'
        const previewOnly = p.preview === '1'
        const brand = p.brand || ''
        const category = p.category || ''
        const hasStock = p.hasStock === '1'
        const hasOem = p.hasOem === '1'
        const hasBarcode = p.hasBarcode === '1'
        const minPrice = parseFloat(p.minPrice) || 0
        const maxPrice = parseFloat(p.maxPrice) || Infinity
        const minDiscount = parseFloat(p.minDiscount) || 0

        let items = cat.articles
        if (brand) items = items.filter(a => a.manufacturer === brand)
        if (category) items = items.filter(a => a.temotCat === category)
        if (hasStock) items = items.filter(a => a.stockChorzow > 0 || a.stockHub > 0)
        if (hasOem) items = items.filter(a => a.original)
        if (hasBarcode) items = items.filter(a => a.barcode)
        if (minPrice > 0) items = items.filter(a => a.priceNet >= minPrice)
        if (maxPrice < Infinity) items = items.filter(a => a.priceNet <= maxPrice)
        if (minDiscount > 0) items = items.filter(a => a.discount >= minDiscount)

        if (previewOnly) {
          return json(res, {
            total: items.length,
            preview: items.slice(0, 10).map(a => ({
              motonet: a.motonet, manufacturer: a.manufacturer, name: a.name,
              priceNet: a.priceNet, priceRetail: a.priceRetail, discount: a.discount,
              stockChorzow: a.stockChorzow, stockHub: a.stockHub,
              temotCat: a.temotCat, original: a.original, barcode: a.barcode
            }))
          })
        }

        items = items.slice(0, 100000)
        const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
        const date = new Date().toISOString().slice(0, 10)

        if (format === 'shopify') {
          const headers = ['Handle','Title','Body (HTML)','Vendor','Product Category','Type','Tags','Published','Variant Price','Variant Compare At Price','Variant SKU','Variant Barcode','Variant Weight','Variant Weight Unit','Variant Inventory Qty']
          const rows = items.map(a => [
            a.motonet.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            esc(`${a.name} ${a.manufacturer}`.trim()),
            esc(a.description || ''),
            esc(a.manufacturer), esc(a.temotCat || ''),
            esc(a.temotFam || ''), esc(a.manufacturer), 'TRUE',
            a.priceRetail > 0 ? a.priceRetail.toFixed(2) : '',
            a.priceGrossRetail > 0 ? a.priceGrossRetail.toFixed(2) : '',
            a.motonet, a.barcode || '',
            a.weight || '0', 'kg',
            Math.round((a.stockChorzow || 0) + (a.stockHub || 0))
          ].join(','))
          const csv = '﻿' + [headers.join(','), ...rows].join('\n')
          res.setHeader('Content-Type', 'text/csv; charset=utf-8')
          res.setHeader('Content-Disposition', `attachment; filename="catalogue-shopify-${date}.csv"`)
          res.statusCode = 200; res.end(csv); return
        }

        if (format === 'woocommerce') {
          const headers = ['ID','Type','SKU','Name','Published','Short description','Regular price','Sale price','Tax status','Stock','Stock quantity','Weight (kg)','Categories','Tags','Attribute 1 name','Attribute 1 value(s)']
          const rows = items.map(a => [
            '', 'simple', a.motonet,
            esc(`${a.name} ${a.manufacturer}`.trim()), '1',
            esc(a.description || ''),
            a.priceRetail > 0 ? a.priceRetail.toFixed(2) : '',
            a.priceNet > 0 ? a.priceNet.toFixed(2) : '',
            'taxable',
            (a.stockChorzow > 0 || a.stockHub > 0) ? 'instock' : 'outofstock',
            Math.round((a.stockChorzow || 0) + (a.stockHub || 0)),
            a.weight || '', esc(a.temotCat || ''),
            esc(a.manufacturer), 'Marque', esc(a.manufacturer)
          ].join(','))
          const csv = '﻿' + [headers.join(','), ...rows].join('\n')
          res.setHeader('Content-Type', 'text/csv; charset=utf-8')
          res.setHeader('Content-Disposition', `attachment; filename="catalogue-woocommerce-${date}.csv"`)
          res.statusCode = 200; res.end(csv); return
        }

        if (format === 'google') {
          const headers = ['id','title','description','link','image_link','availability','price','sale_price','brand','gtin','mpn','condition','google_product_category','product_type']
          const rows = items.map(a => [
            a.motonet, esc(`${a.name} ${a.manufacturer}`.trim()),
            esc(a.description || ''), '', '',
            (a.stockChorzow > 0 || a.stockHub > 0) ? 'in_stock' : 'out_of_stock',
            a.priceRetail > 0 ? `${a.priceRetail.toFixed(2)} EUR` : '',
            a.priceNet > 0 ? `${a.priceNet.toFixed(2)} EUR` : '',
            esc(a.manufacturer), a.barcode || '', a.original || a.motonet,
            'new', 'Vehicles & Parts > Vehicle Parts & Accessories',
            esc(a.temotCat || '')
          ].join('\t'))
          const tsv = [headers.join('\t'), ...rows].join('\n')
          res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8')
          res.setHeader('Content-Disposition', `attachment; filename="catalogue-google-${date}.tsv"`)
          res.statusCode = 200; res.end(tsv); return
        }

        const cols = ['motonet','manufacturer','name','original','barcode','priceNet','priceRetail','discount','stockChorzow','stockHub','temotCat','temotFam','weight','vatRate','description']
        const csv = '﻿' + [cols.join(';'), ...items.map(a => cols.map(c => esc(a[c] ?? '')).join(';'))].join('\n')
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="catalogue-${date}.csv"`)
        res.statusCode = 200; res.end(csv); return
      }

      return json(res, { error: 'not found' }, 404)
    } catch (err) {
      return json(res, { error: err.message }, 500)
    }
  })
}

// Pure function exports — used by unit tests only
export { parseRow, buildIndexes, applyAllFilters, applySecondaryFilters, sortItems, paginateResult }
