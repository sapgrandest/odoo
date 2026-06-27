import fs from 'fs'
import os from 'os'
import path from 'path'
import readline from 'readline'
import { URL } from 'url'
import Database from 'better-sqlite3'

const DEFAULT_CSV_PATH = '/data/catalogue.csv'

// ── État global ────────────────────────────────────────────────────────────
let db = null
let loadingProgress = { status: 'idle', loaded: 0, error: '' }
let loadResolvers = []

// ── Helpers HTTP ───────────────────────────────────────────────────────────
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

// ── Parseurs CSV ───────────────────────────────────────────────────────────
const pf = v => (!v ? 0 : parseFloat(v.replace(',', '.')) || 0)
const pb = v => v === '1'
const pc = v => (v ? v.trim() : '')

export function parseRow(cols) {
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

// ── SQLite — ouverture et schéma ───────────────────────────────────────────
function openDb() {
  if (db) return db
  const csvPath = process.env.CSV_PATH || process.env.VITE_CSV_PATH || DEFAULT_CSV_PATH
  const dbPath = process.env.DB_PATH ||
    path.join(path.dirname(csvPath), 'catalog.db')

  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  }

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = -32000')   // 32 MB de cache pages
  db.pragma('temp_store = MEMORY')

  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      motonet TEXT PRIMARY KEY,
      manufacturer TEXT DEFAULT '',
      tecDocArtNr TEXT DEFAULT '',
      name TEXT DEFAULT '',
      original TEXT DEFAULT '',
      priceNet REAL DEFAULT 0,
      prefix TEXT DEFAULT '',
      artIndex TEXT DEFAULT '',
      suppliersRef TEXT DEFAULT '',
      deposit REAL DEFAULT 0,
      bail REAL DEFAULT 0,
      customCode TEXT DEFAULT '',
      barcode TEXT DEFAULT '',
      weight REAL DEFAULT 0,
      minQty INTEGER DEFAULT 1,
      description TEXT DEFAULT '',
      stockChorzow INTEGER DEFAULT 0,
      discount REAL DEFAULT 0,
      discountGroup TEXT DEFAULT '',
      priceRetail REAL DEFAULT 0,
      unit TEXT DEFAULT 'szt',
      nonReturnable INTEGER DEFAULT 0,
      attributes TEXT DEFAULT '',
      mpSuperior TEXT DEFAULT '',
      mpSubaltern TEXT DEFAULT '',
      temotFam TEXT DEFAULT '',
      temotCat TEXT DEFAULT '',
      replacementPrefix TEXT DEFAULT '',
      replacementIndex TEXT DEFAULT '',
      listAlternatives TEXT DEFAULT '',
      alternatives TEXT DEFAULT '[]',
      priceGrossRetail REAL DEFAULT 0,
      priceGrossPurchase REAL DEFAULT 0,
      tecDocHerNr TEXT DEFAULT '',
      genericId TEXT DEFAULT '',
      stockHub INTEGER DEFAULT 0,
      discountId TEXT DEFAULT '',
      vatRate REAL DEFAULT 0,
      tecDocGenArtNr TEXT DEFAULT '',
      productGroupCode TEXT DEFAULT '',
      splitPayroll INTEGER DEFAULT 0,
      countryCode TEXT DEFAULT '',
      productGroupCodeRequired INTEGER DEFAULT 0,
      tecDocManufacturer TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_manufacturer  ON articles(manufacturer);
    CREATE INDEX IF NOT EXISTS idx_temotCat      ON articles(temotCat);
    CREATE INDEX IF NOT EXISTS idx_discountGroup ON articles(discountGroup);
    CREATE INDEX IF NOT EXISTS idx_priceNet      ON articles(priceNet);
    CREATE INDEX IF NOT EXISTS idx_stockCz       ON articles(stockChorzow);
    CREATE INDEX IF NOT EXISTS idx_stockHub      ON articles(stockHub);
    CREATE INDEX IF NOT EXISTS idx_vatRate       ON articles(vatRate);
  `)

  return db
}

// Convertit une ligne SQLite → objet article (même structure qu'avant)
function rowToArticle(row) {
  if (!row) return null
  return {
    motonet: row.motonet,
    manufacturer: row.manufacturer,
    tecDocArtNr: row.tecDocArtNr,
    name: row.name,
    original: row.original,
    priceNet: row.priceNet,
    prefix: row.prefix,
    index: row.artIndex,
    suppliersRef: row.suppliersRef,
    deposit: row.deposit,
    bail: row.bail,
    customCode: row.customCode,
    barcode: row.barcode,
    weight: row.weight,
    minQty: row.minQty,
    description: row.description,
    stockChorzow: row.stockChorzow,
    discount: row.discount,
    discountGroup: row.discountGroup,
    priceRetail: row.priceRetail,
    unit: row.unit,
    nonReturnable: row.nonReturnable === 1,
    attributes: row.attributes,
    mpSuperior: row.mpSuperior,
    mpSubaltern: row.mpSubaltern,
    temotFam: row.temotFam,
    temotCat: row.temotCat,
    replacementPrefix: row.replacementPrefix,
    replacementIndex: row.replacementIndex,
    listAlternatives: row.listAlternatives,
    alternatives: JSON.parse(row.alternatives || '[]'),
    priceGrossRetail: row.priceGrossRetail,
    priceGrossPurchase: row.priceGrossPurchase,
    tecDocHerNr: row.tecDocHerNr,
    genericId: row.genericId,
    stockHub: row.stockHub,
    discountId: row.discountId,
    vatRate: row.vatRate,
    tecDocGenArtNr: row.tecDocGenArtNr,
    productGroupCode: row.productGroupCode,
    splitPayroll: row.splitPayroll === 1,
    countryCode: row.countryCode,
    productGroupCodeRequired: row.productGroupCodeRequired === 1,
    tecDocManufacturer: row.tecDocManufacturer,
  }
}

// ── Import CSV → SQLite ─────────────────────────────────────────────────────
const BATCH_SIZE = 500

async function importCsv(csvPath) {
  const database = openDb()
  loadingProgress = { status: 'loading', loaded: 0, error: '' }

  try {
    database.exec('DELETE FROM articles')

    const insert = database.prepare(`INSERT OR REPLACE INTO articles (
      motonet, manufacturer, tecDocArtNr, name, original, priceNet, prefix, artIndex,
      suppliersRef, deposit, bail, customCode, barcode, weight, minQty, description,
      stockChorzow, discount, discountGroup, priceRetail, unit, nonReturnable,
      attributes, mpSuperior, mpSubaltern, temotFam, temotCat, replacementPrefix,
      replacementIndex, listAlternatives, alternatives, priceGrossRetail,
      priceGrossPurchase, tecDocHerNr, genericId, stockHub, discountId, vatRate,
      tecDocGenArtNr, productGroupCode, splitPayroll, countryCode,
      productGroupCodeRequired, tecDocManufacturer
    ) VALUES (
      @motonet, @manufacturer, @tecDocArtNr, @name, @original, @priceNet, @prefix, @artIndex,
      @suppliersRef, @deposit, @bail, @customCode, @barcode, @weight, @minQty, @description,
      @stockChorzow, @discount, @discountGroup, @priceRetail, @unit, @nonReturnable,
      @attributes, @mpSuperior, @mpSubaltern, @temotFam, @temotCat, @replacementPrefix,
      @replacementIndex, @listAlternatives, @alternatives, @priceGrossRetail,
      @priceGrossPurchase, @tecDocHerNr, @genericId, @stockHub, @discountId, @vatRate,
      @tecDocGenArtNr, @productGroupCode, @splitPayroll, @countryCode,
      @productGroupCodeRequired, @tecDocManufacturer
    )`)

    const insertBatch = database.transaction((rows) => {
      for (const row of rows) insert.run(row)
    })

    const fileStream = fs.createReadStream(csvPath, { encoding: 'utf8' })
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })

    let firstLine = true
    let batch = []

    for await (const line of rl) {
      if (firstLine) { firstLine = false; continue }
      if (!line.trim()) continue
      const cols = line.split(';')
      if (cols.length < 2) continue
      const art = parseRow(cols)
      if (!art.motonet) continue

      batch.push({
        motonet: art.motonet,
        manufacturer: art.manufacturer,
        tecDocArtNr: art.tecDocArtNr,
        name: art.name,
        original: art.original,
        priceNet: art.priceNet,
        prefix: art.prefix,
        artIndex: art.index,
        suppliersRef: art.suppliersRef,
        deposit: art.deposit,
        bail: art.bail,
        customCode: art.customCode,
        barcode: art.barcode,
        weight: art.weight,
        minQty: art.minQty,
        description: art.description,
        stockChorzow: art.stockChorzow,
        discount: art.discount,
        discountGroup: art.discountGroup,
        priceRetail: art.priceRetail,
        unit: art.unit,
        nonReturnable: art.nonReturnable ? 1 : 0,
        attributes: art.attributes,
        mpSuperior: art.mpSuperior,
        mpSubaltern: art.mpSubaltern,
        temotFam: art.temotFam,
        temotCat: art.temotCat,
        replacementPrefix: art.replacementPrefix,
        replacementIndex: art.replacementIndex,
        listAlternatives: art.listAlternatives,
        alternatives: JSON.stringify(art.alternatives),
        priceGrossRetail: art.priceGrossRetail,
        priceGrossPurchase: art.priceGrossPurchase,
        tecDocHerNr: art.tecDocHerNr,
        genericId: art.genericId,
        stockHub: art.stockHub,
        discountId: art.discountId,
        vatRate: art.vatRate,
        tecDocGenArtNr: art.tecDocGenArtNr,
        productGroupCode: art.productGroupCode,
        splitPayroll: art.splitPayroll ? 1 : 0,
        countryCode: art.countryCode,
        productGroupCodeRequired: art.productGroupCodeRequired ? 1 : 0,
        tecDocManufacturer: art.tecDocManufacturer,
      })

      if (batch.length >= BATCH_SIZE) {
        insertBatch(batch)
        loadingProgress.loaded += batch.length
        batch = []
      }
    }

    if (batch.length > 0) {
      insertBatch(batch)
      loadingProgress.loaded += batch.length
    }

    loadingProgress = { status: 'ready', loaded: loadingProgress.loaded, error: '' }
    const mem = process.memoryUsage()
    console.log(`[catalog] Import terminé — ${loadingProgress.loaded} articles | RSS ${Math.round(mem.rss/1024/1024)}MB heap ${Math.round(mem.heapUsed/1024/1024)}MB`)
    // Force WAL checkpoint to flush all data to the main DB file (no-op for :memory:)
    try { database.pragma('wal_checkpoint(TRUNCATE)') } catch (_) {}
  } catch (err) {
    loadingProgress = { status: 'error', loaded: loadingProgress.loaded, error: err.message }
    console.error('[catalog] Erreur import CSV:', err.message, err.stack)
  } finally {
    markReady()
  }
}

let hasEverBeenReady = false

function markReady() {
  hasEverBeenReady = true
  for (const resolve of loadResolvers) resolve(db)
  loadResolvers = []
}

// ── API publique ───────────────────────────────────────────────────────────
export function getCatalog() {
  // Bloque uniquement au premier démarrage (DB vide, jamais chargée).
  // Pendant un re-import SFTP, on répond immédiatement avec la DB courante
  // (vide après DELETE, mais le serveur ne freeze pas).
  if (!hasEverBeenReady) {
    return new Promise(resolve => loadResolvers.push(resolve))
  }
  return Promise.resolve(db)
}

export function getDb() { return db }

export function startLoadBackground(csvPath) {
  const p = csvPath || process.env.CSV_PATH || process.env.VITE_CSV_PATH || DEFAULT_CSV_PATH
  importCsv(p).catch(err => console.error('[catalog] Erreur rechargement:', err.message))
}

// ── Démarrage module ───────────────────────────────────────────────────────
async function startLoad() {
  openDb()
  const count = db.prepare('SELECT COUNT(*) as n FROM articles').get().n
  if (count > 0) {
    loadingProgress = { status: 'ready', loaded: count, error: '' }
    markReady()
    console.log(`[catalog] DB existante — ${count} articles`)
    return
  }
  const csvPath = process.env.CSV_PATH || process.env.VITE_CSV_PATH || DEFAULT_CSV_PATH
  await importCsv(csvPath)
}

startLoad().catch(err => {
  loadingProgress = { status: 'error', loaded: 0, error: err.message }
  console.error('[catalog] Erreur démarrage:', err.message)
  markReady()
})

// ── Helpers browse/search ──────────────────────────────────────────────────
const SORT_COLS = new Set(['name', 'priceNet', 'priceRetail', 'stockChorzow', 'motonet', 'manufacturer', 'discount'])

function buildWhereClause(p, extra = []) {
  const conditions = [...extra]
  const params = {}
  if (p.brand) { conditions.push('manufacturer = @brand'); params.brand = p.brand }
  if (p.category) { conditions.push('temotCat = @category'); params.category = p.category }
  if (p.discountGroup) { conditions.push('discountGroup = @dg'); params.dg = p.discountGroup }
  if (p.inStock === '1') conditions.push('stockChorzow > 0')
  else if (p.inStock === '0') conditions.push('stockChorzow <= 0')
  if (p.minPrice) { const v = parseFloat(p.minPrice); if (!isNaN(v)) { conditions.push('priceNet >= @minPrice'); params.minPrice = v } }
  if (p.maxPrice) { const v = parseFloat(p.maxPrice); if (!isNaN(v)) { conditions.push('priceNet <= @maxPrice'); params.maxPrice = v } }
  if (p.vatRate) { const v = parseFloat(p.vatRate); if (!isNaN(v)) { conditions.push('vatRate = @vatRate'); params.vatRate = v } }
  return { where: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params }
}

function paginationParams(p) {
  const page = Math.max(1, parseInt(p.page) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(p.limit) || 48))
  const sortField = SORT_COLS.has(p.sortBy) ? p.sortBy : 'priceNet'
  const sortDir = p.sortDir === 'desc' ? 'DESC' : 'ASC'
  const offset = (page - 1) * limit
  return { page, limit, sortField, sortDir, offset }
}

// ── Serveur HTTP ───────────────────────────────────────────────────────────
export function createCatalogServer(middlewares) {
  middlewares.use(async (req, res, next) => {
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
        res.statusCode = 200; res.end(Buffer.from(buffer))
      } catch (err) { res.statusCode = 502; res.end(err.message) }
      return
    }

    if (!req.url.startsWith('/api/catalog')) return next()

    const url = new URL(req.url, 'http://localhost')
    const route = url.pathname.replace('/api/catalog', '') || '/'
    const p = Object.fromEntries(url.searchParams)

    try {
      // ── Routes qui ne nécessitent pas d'attendre le chargement ──────────

      // Webhook SFTPGo : POST /api/catalog/reload
      // En prod (SFTP_HOST défini) : télécharge depuis SFTPGo puis importe.
      // En dev/test (pas de SFTP_HOST) : importe depuis le CSV local.
      if (route === '/reload' && req.method === 'POST') {
        const secret = process.env.RELOAD_SECRET
        if (secret && req.headers['x-reload-secret'] !== secret) {
          res.writeHead(401)
          return res.end(JSON.stringify({ error: 'Unauthorized' }))
        }
        const csvPath = process.env.CSV_PATH || DEFAULT_CSV_PATH
        startLoadBackground(csvPath)
        console.log(`[catalog] Reload déclenché via webhook → ${csvPath}`)
        return json(res, { success: true, message: 'Reload déclenché' })
      }

      if (route === '/status') {
        const ready = loadingProgress.status === 'ready'
        const mem = process.memoryUsage()
        return json(res, {
          ready,
          total: loadingProgress.loaded,
          loading: loadingProgress,
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        })
      }

      if (route === '/config') {
        if (req.method === 'GET') {
          const database = openDb()
          const total = database.prepare('SELECT COUNT(*) as n FROM articles').get().n
          const csvPath = process.env.CSV_PATH || process.env.VITE_CSV_PATH || DEFAULT_CSV_PATH
          return json(res, { csvPath, ready: loadingProgress.status === 'ready', total })
        }
        if (req.method === 'POST') {
          let body
          try { body = await readBody(req) } catch { return json(res, { success: false, error: 'invalid JSON' }, 400) }
          const { csvPath } = body
          if (!csvPath) return json(res, { success: false, error: 'csvPath required' }, 400)
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
          startLoadBackground(tmpPath)
          return json(res, { success: true, tmpPath, message: 'Fichier reçu, chargement en cours' })
        } catch (err) {
          return json(res, { success: false, error: err.message }, 500)
        }
      }

      // ── Routes qui attendent que le catalogue soit prêt ─────────────────
      const database = await getCatalog()

      if (route === '/brands') {
        const rows = database.prepare("SELECT manufacturer as name, COUNT(*) as count FROM articles WHERE manufacturer != '' GROUP BY manufacturer ORDER BY manufacturer").all()
        return json(res, rows)
      }

      if (route === '/categories') {
        const rows = database.prepare("SELECT temotCat as name, COUNT(*) as count FROM articles WHERE temotCat != '' GROUP BY temotCat ORDER BY count DESC").all()
        return json(res, rows)
      }

      if (route === '/discount-groups') {
        const rows = database.prepare("SELECT discountGroup as name, COUNT(*) as count FROM articles WHERE discountGroup != '' GROUP BY discountGroup ORDER BY count DESC").all()
        return json(res, rows)
      }

      if (route === '/vat-rates') {
        const rows = database.prepare('SELECT DISTINCT vatRate FROM articles WHERE vatRate > 0 ORDER BY vatRate').pluck().all()
        return json(res, rows)
      }

      if (route === '/articles') {
        const raw = p.motonets ?? ''
        const motonets = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
        if (!motonets.length) return json(res, [])
        const placeholders = motonets.map(() => '?').join(',')
        const rows = database.prepare(`SELECT * FROM articles WHERE motonet IN (${placeholders})`).all(...motonets)
        return json(res, rows.map(rowToArticle))
      }

      if (route.startsWith('/article/')) {
        const motonet = decodeURIComponent(route.slice('/article/'.length))
        const row = database.prepare('SELECT * FROM articles WHERE motonet = ?').get(motonet)
        return row ? json(res, rowToArticle(row)) : json(res, { error: 'not found' }, 404)
      }

      if (route === '/browse') {
        const { where, params } = buildWhereClause(p)
        const { page, limit, sortField, sortDir, offset } = paginationParams(p)
        const total = database.prepare(`SELECT COUNT(*) as n FROM articles ${where}`).get(params).n
        const rows = database.prepare(
          `SELECT * FROM articles ${where} ORDER BY ${sortField} ${sortDir} LIMIT @limit OFFSET @offset`
        ).all({ ...params, limit, offset })
        return json(res, { items: rows.map(rowToArticle), total, pages: Math.ceil(total / limit) || 0, page, limit })
      }

      if (route === '/search') {
        const q = (p.q || '').trim()
        if (!q) return json(res, { items: [], total: 0, pages: 0, page: 1, limit: 48 })
        const like = `%${q}%`
        const searchCondition = '(motonet LIKE @like OR manufacturer LIKE @like OR name LIKE @like OR original LIKE @like OR barcode LIKE @like OR description LIKE @like OR attributes LIKE @like)'
        const { where, params } = buildWhereClause(p, [searchCondition])
        params.like = like
        const { page, limit, sortField, sortDir, offset } = paginationParams(p)
        const total = database.prepare(`SELECT COUNT(*) as n FROM articles ${where}`).get(params).n
        const rows = database.prepare(
          `SELECT * FROM articles ${where} ORDER BY ${sortField} ${sortDir} LIMIT @limit OFFSET @offset`
        ).all({ ...params, limit, offset })
        return json(res, { items: rows.map(rowToArticle), total, pages: Math.ceil(total / limit) || 0, page, limit })
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

        const conditions = []
        const params = {}
        if (brand) { conditions.push('manufacturer = @brand'); params.brand = brand }
        if (category) { conditions.push('temotCat = @category'); params.category = category }
        if (hasStock) conditions.push('(stockChorzow > 0 OR stockHub > 0)')
        if (hasOem) conditions.push("original != ''")
        if (hasBarcode) conditions.push("barcode != ''")
        if (minPrice > 0) { conditions.push('priceNet >= @minPrice'); params.minPrice = minPrice }
        if (maxPrice < Infinity) { conditions.push('priceNet <= @maxPrice'); params.maxPrice = maxPrice }
        if (minDiscount > 0) { conditions.push('discount >= @minDiscount'); params.minDiscount = minDiscount }
        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

        if (previewOnly) {
          const total = database.prepare(`SELECT COUNT(*) as n FROM articles ${where}`).get(params).n
          const preview = database.prepare(
            `SELECT motonet, manufacturer, name, priceNet, priceRetail, discount, stockChorzow, stockHub, temotCat, original, barcode FROM articles ${where} LIMIT 10`
          ).all(params)
          return json(res, { total, preview })
        }

        const items = database.prepare(`SELECT * FROM articles ${where} LIMIT 100000`).all(params).map(rowToArticle)
        const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
        const date = new Date().toISOString().slice(0, 10)

        if (format === 'shopify') {
          const headers = ['Handle','Title','Body (HTML)','Vendor','Product Category','Type','Tags','Published','Variant Price','Variant Compare At Price','Variant SKU','Variant Barcode','Variant Weight','Variant Weight Unit','Variant Inventory Qty']
          const rows = items.map(a => [
            a.motonet.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            esc(`${a.name} ${a.manufacturer}`.trim()),
            esc(a.description || ''), esc(a.manufacturer), esc(a.temotCat || ''),
            esc(a.temotFam || ''), esc(a.manufacturer), 'TRUE',
            a.priceRetail > 0 ? a.priceRetail.toFixed(2) : '',
            a.priceGrossRetail > 0 ? a.priceGrossRetail.toFixed(2) : '',
            a.motonet, a.barcode || '', a.weight || '0', 'kg',
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
            '', 'simple', a.motonet, esc(`${a.name} ${a.manufacturer}`.trim()), '1',
            esc(a.description || ''),
            a.priceRetail > 0 ? a.priceRetail.toFixed(2) : '',
            a.priceNet > 0 ? a.priceNet.toFixed(2) : '',
            'taxable', (a.stockChorzow > 0 || a.stockHub > 0) ? 'instock' : 'outofstock',
            Math.round((a.stockChorzow || 0) + (a.stockHub || 0)),
            a.weight || '', esc(a.temotCat || ''), esc(a.manufacturer), 'Marque', esc(a.manufacturer)
          ].join(','))
          const csv = '﻿' + [headers.join(','), ...rows].join('\n')
          res.setHeader('Content-Type', 'text/csv; charset=utf-8')
          res.setHeader('Content-Disposition', `attachment; filename="catalogue-woocommerce-${date}.csv"`)
          res.statusCode = 200; res.end(csv); return
        }

        if (format === 'google') {
          const headers = ['id','title','description','link','image_link','availability','price','sale_price','brand','gtin','mpn','condition','google_product_category','product_type']
          const rows = items.map(a => [
            a.motonet, esc(`${a.name} ${a.manufacturer}`.trim()), esc(a.description || ''), '', '',
            (a.stockChorzow > 0 || a.stockHub > 0) ? 'in_stock' : 'out_of_stock',
            a.priceRetail > 0 ? `${a.priceRetail.toFixed(2)} EUR` : '',
            a.priceNet > 0 ? `${a.priceNet.toFixed(2)} EUR` : '',
            esc(a.manufacturer), a.barcode || '', a.original || a.motonet,
            'new', 'Vehicles & Parts > Vehicle Parts & Accessories', esc(a.temotCat || '')
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

