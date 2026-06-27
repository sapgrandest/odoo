import { getCatalog, getDb } from './catalog.js'
import { URL } from 'url'

function json(res, data, status = 200) {
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = status
  res.end(JSON.stringify(data))
}

const PRICE_RANGES = [
  { range: '0-5',       label: '0-5€',       min: 0,    max: 5 },
  { range: '5-15',      label: '5-15€',      min: 5,    max: 15 },
  { range: '15-30',     label: '15-30€',     min: 15,   max: 30 },
  { range: '30-60',     label: '30-60€',     min: 30,   max: 60 },
  { range: '60-100',    label: '60-100€',    min: 60,   max: 100 },
  { range: '100-200',   label: '100-200€',   min: 100,  max: 200 },
  { range: '200-500',   label: '200-500€',   min: 200,  max: 500 },
  { range: '500-1000',  label: '500-1000€',  min: 500,  max: 1000 },
  { range: '1000-5000', label: '1000-5000€', min: 1000, max: 5000 },
  { range: '5000+',     label: '5000+€',     min: 5000, max: Infinity }
]

export function createStatsServer(middlewares) {
  middlewares.use(async (req, res, next) => {
    if (!req.url.startsWith('/api/stats')) return next()

    const url = new URL(req.url, 'http://localhost')
    const route = url.pathname.replace('/api/stats', '') || '/'
    const p = Object.fromEntries(url.searchParams)

    try {
      await getCatalog()
      const db = getDb()

      // ── /overview ────────────────────────────────────────────────────────
      if (route === '/overview') {
        const r = db.prepare(`
          SELECT
            COUNT(*) as total,
            COUNT(DISTINCT NULLIF(manufacturer,'')) as brands,
            COUNT(DISTINCT NULLIF(temotCat,'')) as categories,
            SUM(CASE WHEN stockChorzow > 0 THEN 1 ELSE 0 END) as inStock,
            SUM(CASE WHEN stockHub > 0 THEN 1 ELSE 0 END) as inStockHub,
            SUM(CASE WHEN nonReturnable = 1 THEN 1 ELSE 0 END) as nonReturnable,
            AVG(CASE WHEN priceRetail > 0 THEN priceRetail END) as avgPriceRetail,
            AVG(CASE WHEN priceNet > 0 THEN priceNet END) as avgPriceNet,
            MIN(CASE WHEN priceNet > 0 THEN priceNet END) as minPrice,
            MAX(CASE WHEN priceNet > 0 THEN priceNet END) as maxPrice
          FROM articles
        `).get()

        return json(res, {
          total: r.total,
          inStock: r.inStock,
          inStockHub: r.inStockHub,
          withImage: 0,
          brands: r.brands,
          categories: r.categories,
          avgPriceRetail: r.avgPriceRetail ?? 0,
          avgPriceNet: r.avgPriceNet ?? 0,
          minPrice: r.minPrice ?? 0,
          maxPrice: r.maxPrice ?? 0,
          nonReturnable: r.nonReturnable
        })
      }

      // ── /brands-top ──────────────────────────────────────────────────────
      if (route === '/brands-top') {
        const limit = Math.max(1, parseInt(p.limit) || 25)
        const rows = db.prepare(`
          SELECT manufacturer as name, COUNT(*) as count,
            AVG(CASE WHEN priceRetail > 0 THEN priceRetail END) as avgPriceRetail,
            AVG(CASE WHEN priceNet > 0 THEN priceNet END) as avgPriceNet,
            SUM(CASE WHEN stockChorzow > 0 THEN 1 ELSE 0 END) as inStock,
            SUM(CASE WHEN stockHub > 0 THEN 1 ELSE 0 END) as inStockHub
          FROM articles WHERE manufacturer != ''
          GROUP BY manufacturer ORDER BY count DESC LIMIT ?
        `).all(limit)
        return json(res, rows.map(r => ({
          name: r.name, count: r.count,
          avgPriceRetail: r.avgPriceRetail ?? 0,
          avgPriceNet: r.avgPriceNet ?? 0,
          inStock: r.inStock,
          inStockHub: r.inStockHub
        })))
      }

      // ── /price-distribution ──────────────────────────────────────────────
      if (route === '/price-distribution') {
        const buckets = PRICE_RANGES.map(r => ({ ...r, count: 0 }))
        const prices = db.prepare('SELECT priceNet FROM articles WHERE priceNet > 0').pluck().all()
        for (const v of prices) {
          for (const b of buckets) {
            if (v >= b.min && v < b.max) { b.count++; break }
          }
        }
        return json(res, buckets.map(({ range, label, count }) => ({ range, label, count })))
      }

      // ── /stock-by-brand ──────────────────────────────────────────────────
      if (route === '/stock-by-brand') {
        const limit = Math.max(1, parseInt(p.limit) || 20)
        const rows = db.prepare(`
          SELECT manufacturer as brand, COUNT(*) as total,
            SUM(CASE WHEN stockChorzow > 0 THEN 1 ELSE 0 END) as inStock,
            SUM(CASE WHEN stockHub > 0 THEN 1 ELSE 0 END) as inStockHub
          FROM articles WHERE manufacturer != ''
          GROUP BY manufacturer ORDER BY total DESC LIMIT ?
        `).all(limit)
        return json(res, rows.map(r => ({
          brand: r.brand, total: r.total, inStock: r.inStock, inStockHub: r.inStockHub,
          pctStock: r.total > 0 ? (r.inStock / r.total) * 100 : 0
        })))
      }

      // ── /categories ──────────────────────────────────────────────────────
      if (route === '/categories') {
        const limit = Math.max(1, parseInt(p.limit) || 30)
        const rows = db.prepare(`
          SELECT temotCat as category, COUNT(*) as count,
            AVG(CASE WHEN priceRetail > 0 THEN priceRetail END) as avgPrice,
            SUM(CASE WHEN stockChorzow > 0 THEN 1 ELSE 0 END) as inStock
          FROM articles WHERE temotCat != ''
          GROUP BY temotCat ORDER BY count DESC LIMIT ?
        `).all(limit)
        return json(res, rows.map(r => ({
          category: r.category, count: r.count,
          avgPrice: r.avgPrice ?? 0,
          inStock: r.inStock
        })))
      }

      // ── /vat-distribution ────────────────────────────────────────────────
      if (route === '/vat-distribution') {
        const total = db.prepare('SELECT COUNT(*) as n FROM articles').get().n
        const rows = db.prepare(`
          SELECT vatRate, COUNT(*) as count FROM articles WHERE vatRate > 0
          GROUP BY vatRate ORDER BY vatRate
        `).all()
        return json(res, rows.map(r => ({
          vatRate: r.vatRate, count: r.count,
          pct: total > 0 ? (r.count / total) * 100 : 0
        })))
      }

      // ── /discount-groups ─────────────────────────────────────────────────
      if (route === '/discount-groups') {
        const rows = db.prepare(`
          SELECT discountGroup as name, COUNT(*) as count,
            AVG(CASE WHEN discount > 0 THEN discount END) as avgDiscount
          FROM articles WHERE discountGroup != ''
          GROUP BY discountGroup ORDER BY count DESC
        `).all()
        return json(res, rows.map(r => ({
          name: r.name, count: r.count, avgDiscount: r.avgDiscount ?? 0
        })))
      }

      // ── /temot-fam ───────────────────────────────────────────────────────
      if (route === '/temot-fam') {
        const rows = db.prepare(`
          SELECT temotFam as name, COUNT(*) as count FROM articles WHERE temotFam != ''
          GROUP BY temotFam ORDER BY count DESC LIMIT 30
        `).all()
        return json(res, rows)
      }

      // ── /catalogue-health ────────────────────────────────────────────────
      if (route === '/catalogue-health') {
        const r = db.prepare(`
          SELECT COUNT(*) as total,
            SUM(CASE WHEN original != '' THEN 1 ELSE 0 END) as withOem,
            SUM(CASE WHEN barcode != '' THEN 1 ELSE 0 END) as withBarcode,
            SUM(CASE WHEN description != '' THEN 1 ELSE 0 END) as withDesc,
            SUM(CASE WHEN weight > 0 THEN 1 ELSE 0 END) as withWeight,
            SUM(CASE WHEN stockChorzow > 0 THEN 1 ELSE 0 END) as withStock,
            SUM(CASE WHEN stockHub > 0 THEN 1 ELSE 0 END) as withStockHub,
            AVG(CASE WHEN priceRetail > priceNet AND priceRetail > 0 AND priceNet > 0
                THEN (priceRetail - priceNet) * 100.0 / priceRetail END) as avgMargin
          FROM articles
        `).get()
        const total = r.total || 1
        const pct = n => Math.round((n / total) * 1000) / 10
        return json(res, {
          total: r.total,
          withOem: r.withOem,       pctOem: pct(r.withOem),
          withBarcode: r.withBarcode, pctBarcode: pct(r.withBarcode),
          withDesc: r.withDesc,     pctDesc: pct(r.withDesc),
          withWeight: r.withWeight, pctWeight: pct(r.withWeight),
          withStock: r.withStock,   pctStock: pct(r.withStock),
          withStockHub: r.withStockHub, pctStockHub: pct(r.withStockHub),
          avgMargin: r.avgMargin != null ? Math.round(r.avgMargin * 10) / 10 : 0
        })
      }

      // ── /quality-by-brand ────────────────────────────────────────────────
      if (route === '/quality-by-brand') {
        const limit = Math.min(500, parseInt(p.limit) || 200)
        const sort = p.sort || 'count'

        const rows = db.prepare(`
          SELECT manufacturer,
            COUNT(*) as count,
            SUM(CASE WHEN original != '' THEN 1 ELSE 0 END) as withOem,
            SUM(CASE WHEN barcode != '' THEN 1 ELSE 0 END) as withBarcode,
            SUM(CASE WHEN description != '' THEN 1 ELSE 0 END) as withDesc,
            SUM(CASE WHEN weight > 0 THEN 1 ELSE 0 END) as withWeight,
            SUM(CASE WHEN stockChorzow > 0 OR stockHub > 0 THEN 1 ELSE 0 END) as withStock,
            AVG(CASE WHEN priceNet > 0 THEN priceNet END) as avgPriceNet,
            AVG(CASE WHEN priceRetail > priceNet AND priceRetail > 0 AND priceNet > 0
                THEN (priceRetail - priceNet) * 100.0 / priceRetail END) as avgMargin
          FROM articles WHERE manufacturer != ''
          GROUP BY manufacturer
        `).all()

        const result = rows.map(r => {
          const pctOem = r.count > 0 ? r.withOem / r.count * 100 : 0
          const pctBarcode = r.count > 0 ? r.withBarcode / r.count * 100 : 0
          const pctDesc = r.count > 0 ? r.withDesc / r.count * 100 : 0
          const pctWeight = r.count > 0 ? r.withWeight / r.count * 100 : 0
          const pctStock = r.count > 0 ? r.withStock / r.count * 100 : 0
          const qualityScore = pctOem * 0.2 + pctBarcode * 0.2 + pctStock * 0.3 + pctDesc * 0.15 + pctWeight * 0.15
          return {
            name: r.manufacturer, count: r.count,
            pctOem: Math.round(pctOem * 10) / 10,
            pctBarcode: Math.round(pctBarcode * 10) / 10,
            pctDesc: Math.round(pctDesc * 10) / 10,
            pctWeight: Math.round(pctWeight * 10) / 10,
            pctStock: Math.round(pctStock * 10) / 10,
            avgMargin: r.avgMargin != null ? Math.round(r.avgMargin * 10) / 10 : 0,
            avgPriceNet: r.avgPriceNet != null ? Math.round(r.avgPriceNet * 100) / 100 : 0,
            qualityScore: Math.round(qualityScore * 10) / 10
          }
        }).sort((a, b) => {
          if (sort === 'score') return b.qualityScore - a.qualityScore
          if (sort === 'margin') return b.avgMargin - a.avgMargin
          if (sort === 'stock') return b.pctStock - a.pctStock
          return b.count - a.count
        }).slice(0, limit)

        return json(res, result)
      }

      // ── /scatter ─────────────────────────────────────────────────────────
      if (route === '/scatter') {
        const VALID = {
          priceNet: 'Prix net moyen (€)', priceRetail: 'Prix retail moyen (€)',
          discount: 'Remise moyenne (%)', stockChorzow: 'Stock Chorzów moyen',
          stockHub: 'Stock HUB moyen', weight: 'Poids moyen (kg)'
        }
        const xField = VALID[p.x] ? p.x : 'priceNet'
        const yField = VALID[p.y] ? p.y : 'discount'
        const limit = Math.min(200, parseInt(p.limit) || 150)

        // AVG(NULLIF(field,0)) = average of non-zero values
        const rows = db.prepare(`
          SELECT manufacturer as name, COUNT(*) as count,
            AVG(NULLIF(priceNet,0)) as avgPriceNet,
            AVG(NULLIF(priceRetail,0)) as avgPriceRetail,
            AVG(NULLIF(discount,0)) as avgDiscount,
            AVG(NULLIF(stockChorzow,0)) as avgStockChorzow,
            AVG(NULLIF(stockHub,0)) as avgStockHub,
            AVG(NULLIF(weight,0)) as avgWeight
          FROM articles WHERE manufacturer != ''
          GROUP BY manufacturer HAVING count >= 3
        `).all()

        const fieldToAvg = {
          priceNet: 'avgPriceNet', priceRetail: 'avgPriceRetail', discount: 'avgDiscount',
          stockChorzow: 'avgStockChorzow', stockHub: 'avgStockHub', weight: 'avgWeight'
        }

        const result = rows
          .filter(b => b[fieldToAvg[xField]] != null && b[fieldToAvg[yField]] != null)
          .map(b => ({
            name: b.name,
            x: Math.round(b[fieldToAvg[xField]] * 100) / 100,
            y: Math.round(b[fieldToAvg[yField]] * 100) / 100,
            count: b.count
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)

        return json(res, { data: result, xLabel: VALID[xField], yLabel: VALID[yField] })
      }

      // ── /matrix ──────────────────────────────────────────────────────────
      if (route === '/matrix') {
        const topBrandsN = Math.min(30, Math.max(5, parseInt(p.brands) || 20))
        const topCatsN = Math.min(20, Math.max(3, parseInt(p.cats) || 10))

        const topBrands = db.prepare(`
          SELECT manufacturer FROM articles WHERE manufacturer != ''
          GROUP BY manufacturer ORDER BY COUNT(*) DESC LIMIT ?
        `).pluck().all(topBrandsN)

        const topCats = db.prepare(`
          SELECT temotCat FROM articles WHERE temotCat != ''
          GROUP BY temotCat ORDER BY COUNT(*) DESC LIMIT ?
        `).pluck().all(topCatsN)

        const matrix = {}
        for (const b of topBrands) { matrix[b] = {}; for (const c of topCats) matrix[b][c] = 0 }

        const brandSet = new Set(topBrands)
        const catSet = new Set(topCats)

        const crossTab = db.prepare(`
          SELECT manufacturer, temotCat, COUNT(*) as count
          FROM articles WHERE manufacturer != '' AND temotCat != ''
          GROUP BY manufacturer, temotCat
        `).all()

        let maxVal = 0
        for (const r of crossTab) {
          if (brandSet.has(r.manufacturer) && catSet.has(r.temotCat)) {
            matrix[r.manufacturer][r.temotCat] = r.count
            if (r.count > maxVal) maxVal = r.count
          }
        }

        return json(res, { brands: topBrands, categories: topCats, matrix, maxVal })
      }

      // ── /distribution ────────────────────────────────────────────────────
      if (route === '/distribution') {
        const VALID_FIELDS = ['priceNet', 'priceRetail', 'discount', 'weight']
        const field = VALID_FIELDS.includes(p.field) ? p.field : 'priceNet'
        const brand = p.brand || ''

        const DIST_RANGES = {
          priceNet:    [[0,5],[5,15],[15,30],[30,60],[60,100],[100,200],[200,500],[500,1000],[1000,5000],[5000,Infinity]],
          priceRetail: [[0,10],[10,25],[25,50],[50,100],[100,200],[200,500],[500,1000],[1000,5000],[5000,Infinity]],
          discount:    [[0,5],[5,10],[10,15],[15,20],[20,25],[25,30],[30,35],[35,40],[40,45],[45,50],[50,60],[60,Infinity]],
          weight:      [[0,0.1],[0.1,0.5],[0.5,1],[1,2],[2,5],[5,10],[10,20],[20,Infinity]]
        }

        const ranges = DIST_RANGES[field]
        const buckets = ranges.map(([min, max]) => ({
          min, max, label: max === Infinity ? `${min}+` : `${min}–${max}`, count: 0
        }))

        // Safe: field is whitelisted above
        const vals = brand
          ? db.prepare(`SELECT ${field} as val FROM articles WHERE ${field} > 0 AND manufacturer = ?`).pluck().all(brand)
          : db.prepare(`SELECT ${field} as val FROM articles WHERE ${field} > 0`).pluck().all()

        const sorted = vals.slice().sort((a, b) => a - b)
        let sum = 0, minV = Infinity, maxV = -Infinity
        for (const v of sorted) {
          sum += v
          if (v < minV) minV = v
          if (v > maxV) maxV = v
          for (const b of buckets) {
            if (v >= b.min && v < b.max) { b.count++; break }
          }
        }
        const count = sorted.length
        const median = count > 0 ? sorted[Math.floor(count / 2)] : 0

        return json(res, {
          buckets: buckets.map(({ label, count }) => ({ label, count })),
          stats: {
            avg: count > 0 ? Math.round(sum / count * 100) / 100 : 0,
            median: Math.round(median * 100) / 100,
            min: minV === Infinity ? 0 : Math.round(minV * 100) / 100,
            max: maxV === -Infinity ? 0 : Math.round(maxV * 100) / 100,
            count
          }
        })
      }

      // ── /top-margins ─────────────────────────────────────────────────────
      if (route === '/top-margins') {
        const sortBy = p.sortBy === 'value' ? 'value' : 'pct'
        const limit = Math.min(500, parseInt(p.limit) || 200)
        const brand = p.brand || ''
        const category = p.category || ''
        const inStock = p.inStock === '1'
        const minPrice = parseFloat(p.minPrice) || 0
        const maxPrice = parseFloat(p.maxPrice) || Infinity
        const minMarginPct = parseFloat(p.minMarginPct) || 0

        const conditions = ['priceRetail > priceNet', 'priceRetail > 0', 'priceNet > 0']
        const params = {}
        if (brand) { conditions.push('manufacturer = @brand'); params.brand = brand }
        else if (category) { conditions.push('temotCat = @category'); params.category = category }
        if (inStock) conditions.push('(stockChorzow > 0 OR stockHub > 0)')
        if (minPrice > 0) { conditions.push('priceNet >= @minPrice'); params.minPrice = minPrice }
        if (maxPrice < Infinity) { conditions.push('priceNet <= @maxPrice'); params.maxPrice = maxPrice }
        if (minMarginPct > 0) {
          conditions.push('(priceRetail - priceNet) * 100.0 / priceRetail >= @minMarginPct')
          params.minMarginPct = minMarginPct
        }

        const where = 'WHERE ' + conditions.join(' AND ')
        const orderCol = sortBy === 'value' ? '(priceRetail - priceNet)' : '(priceRetail - priceNet) / priceRetail'

        const total = db.prepare(`SELECT COUNT(*) as n FROM articles ${where}`).get(params).n

        const rows = db.prepare(`
          SELECT motonet, manufacturer, name, priceNet, priceRetail, stockChorzow, stockHub,
            temotCat, original, barcode,
            ROUND((priceRetail - priceNet) * 100.0 / priceRetail, 1) as marginPct,
            ROUND(priceRetail - priceNet, 2) as marginValue
          FROM articles ${where}
          ORDER BY ${orderCol} DESC
          LIMIT @limit
        `).all({ ...params, limit })

        let sumPct = 0, sumVal = 0
        for (const r of rows) { sumPct += r.marginPct; sumVal += r.marginValue }
        const n = rows.length

        return json(res, {
          total,
          avgMarginPct: n > 0 ? Math.round(sumPct / n * 10) / 10 : 0,
          avgMarginValue: n > 0 ? Math.round(sumVal / n * 100) / 100 : 0,
          topPct: rows.slice().sort((a, b) => b.marginPct - a.marginPct)[0] ?? null,
          topValue: rows.slice().sort((a, b) => b.marginValue - a.marginValue)[0] ?? null,
          items: rows
        })
      }

      return json(res, { error: 'not found' }, 404)
    } catch (err) {
      return json(res, { error: err.message }, 500)
    }
  })
}
