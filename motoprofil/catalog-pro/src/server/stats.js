import { getCatalog } from './catalog.js'
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
      const cat = await getCatalog()

      if (route === '/overview') {
        let inStock = 0, inStockHub = 0, nonReturnable = 0
        let sumRetail = 0, countRetail = 0, sumNet = 0, countNet = 0

        for (const a of cat.articles) {
          if (a.stockChorzow > 0) inStock++
          if (a.stockHub > 0) inStockHub++
          if (a.nonReturnable) nonReturnable++
          if (a.priceRetail > 0) { sumRetail += a.priceRetail; countRetail++ }
          if (a.priceNet > 0) { sumNet += a.priceNet; countNet++ }
        }

        return json(res, {
          total: cat.total,
          inStock,
          inStockHub,
          withImage: 0,
          brands: cat.brandStats.length,
          categories: cat.categoryStats.length,
          avgPriceRetail: countRetail > 0 ? sumRetail / countRetail : 0,
          avgPriceNet: countNet > 0 ? sumNet / countNet : 0,
          minPrice: cat.priceRange.min,
          maxPrice: cat.priceRange.max,
          nonReturnable
        })
      }

      if (route === '/brands-top') {
        const limit = Math.max(1, parseInt(p.limit) || 25)
        const result = Array.from(cat.byBrand.entries())
          .map(([name, items]) => {
            let sumRetail = 0, countRetail = 0, sumNet = 0, countNet = 0
            let inStock = 0, inStockHub = 0
            for (const a of items) {
              if (a.priceRetail > 0) { sumRetail += a.priceRetail; countRetail++ }
              if (a.priceNet > 0) { sumNet += a.priceNet; countNet++ }
              if (a.stockChorzow > 0) inStock++
              if (a.stockHub > 0) inStockHub++
            }
            return {
              name,
              count: items.length,
              avgPriceRetail: countRetail > 0 ? sumRetail / countRetail : 0,
              avgPriceNet: countNet > 0 ? sumNet / countNet : 0,
              inStock,
              inStockHub
            }
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)

        return json(res, result)
      }

      if (route === '/price-distribution') {
        const buckets = PRICE_RANGES.map(r => ({ ...r, count: 0 }))
        for (const a of cat.articles) {
          if (a.priceNet <= 0) continue
          for (const b of buckets) {
            if (a.priceNet >= b.min && a.priceNet < b.max) { b.count++; break }
          }
        }
        return json(res, buckets.map(({ range, label, count }) => ({ range, label, count })))
      }

      if (route === '/stock-by-brand') {
        const limit = Math.max(1, parseInt(p.limit) || 20)
        const result = Array.from(cat.byBrand.entries())
          .map(([brand, items]) => {
            const total = items.length
            const inStock = items.filter(a => a.stockChorzow > 0).length
            const inStockHub = items.filter(a => a.stockHub > 0).length
            return { brand, total, inStock, inStockHub, pctStock: total > 0 ? (inStock / total) * 100 : 0 }
          })
          .sort((a, b) => b.total - a.total)
          .slice(0, limit)

        return json(res, result)
      }

      if (route === '/categories') {
        const limit = Math.max(1, parseInt(p.limit) || 30)
        const result = Array.from(cat.byCategory.entries())
          .map(([category, items]) => {
            const withPrice = items.filter(a => a.priceRetail > 0)
            const avgPrice = withPrice.length > 0
              ? withPrice.reduce((s, a) => s + a.priceRetail, 0) / withPrice.length
              : 0
            const inStock = items.filter(a => a.stockChorzow > 0).length
            return { category, count: items.length, avgPrice, inStock }
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)

        return json(res, result)
      }

      if (route === '/vat-distribution') {
        const vatMap = new Map()
        for (const a of cat.articles) {
          vatMap.set(a.vatRate, (vatMap.get(a.vatRate) || 0) + 1)
        }
        const total = cat.total
        const result = Array.from(vatMap.entries())
          .map(([vatRate, count]) => ({ vatRate, count, pct: total > 0 ? (count / total) * 100 : 0 }))
          .sort((a, b) => a.vatRate - b.vatRate)

        return json(res, result)
      }

      if (route === '/discount-groups') {
        const result = Array.from(cat.byDiscountGroup.entries())
          .map(([name, items]) => {
            const withDiscount = items.filter(a => a.discount > 0)
            const avgDiscount = withDiscount.length > 0
              ? withDiscount.reduce((s, a) => s + a.discount, 0) / withDiscount.length
              : 0
            return { name, count: items.length, avgDiscount }
          })
          .sort((a, b) => b.count - a.count)

        return json(res, result)
      }

      if (route === '/temot-fam') {
        const famMap = new Map()
        for (const a of cat.articles) {
          if (!a.temotFam) continue
          famMap.set(a.temotFam, (famMap.get(a.temotFam) || 0) + 1)
        }
        const result = Array.from(famMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 30)

        return json(res, result)
      }

      if (route === '/catalogue-health') {
        let withOem = 0, withBarcode = 0, withDesc = 0, withWeight = 0, withStock = 0, withStockHub = 0
        let sumMargin = 0, countMargin = 0

        for (const a of cat.articles) {
          if (a.original) withOem++
          if (a.barcode) withBarcode++
          if (a.description) withDesc++
          if (a.weight > 0) withWeight++
          if (a.stockChorzow > 0) withStock++
          if (a.stockHub > 0) withStockHub++
          if (a.priceRetail > 0 && a.priceNet > 0) {
            const m = (a.priceRetail - a.priceNet) / a.priceRetail * 100
            if (m > 0 && m < 100) { sumMargin += m; countMargin++ }
          }
        }

        const total = cat.total
        return json(res, {
          total,
          withOem, pctOem: Math.round(withOem / total * 1000) / 10,
          withBarcode, pctBarcode: Math.round(withBarcode / total * 1000) / 10,
          withDesc, pctDesc: Math.round(withDesc / total * 1000) / 10,
          withWeight, pctWeight: Math.round(withWeight / total * 1000) / 10,
          withStock, pctStock: Math.round(withStock / total * 1000) / 10,
          withStockHub, pctStockHub: Math.round(withStockHub / total * 1000) / 10,
          avgMargin: countMargin > 0 ? Math.round(sumMargin / countMargin * 10) / 10 : 0
        })
      }

      if (route === '/quality-by-brand') {
        const limit = Math.min(500, parseInt(p.limit) || 200)
        const sort = p.sort || 'count'

        const result = Array.from(cat.byBrand.entries())
          .filter(([name]) => name)
          .map(([name, items]) => {
            const count = items.length
            let withOem = 0, withBarcode = 0, withDesc = 0, withWeight = 0, withStock = 0
            let sumMargin = 0, countMargin = 0, sumNet = 0, countNet = 0

            for (const a of items) {
              if (a.original) withOem++
              if (a.barcode) withBarcode++
              if (a.description) withDesc++
              if (a.weight > 0) withWeight++
              if (a.stockChorzow > 0 || a.stockHub > 0) withStock++
              if (a.priceNet > 0) { sumNet += a.priceNet; countNet++ }
              if (a.priceRetail > 0 && a.priceNet > 0) {
                const m = (a.priceRetail - a.priceNet) / a.priceRetail * 100
                if (m > 0 && m < 100) { sumMargin += m; countMargin++ }
              }
            }

            const pctOem = count > 0 ? withOem / count * 100 : 0
            const pctBarcode = count > 0 ? withBarcode / count * 100 : 0
            const pctDesc = count > 0 ? withDesc / count * 100 : 0
            const pctWeight = count > 0 ? withWeight / count * 100 : 0
            const pctStock = count > 0 ? withStock / count * 100 : 0
            const avgMargin = countMargin > 0 ? sumMargin / countMargin : 0
            const avgPriceNet = countNet > 0 ? sumNet / countNet : 0
            const qualityScore = pctOem * 0.2 + pctBarcode * 0.2 + pctStock * 0.3 + pctDesc * 0.15 + pctWeight * 0.15

            return {
              name, count,
              pctOem: Math.round(pctOem * 10) / 10,
              pctBarcode: Math.round(pctBarcode * 10) / 10,
              pctDesc: Math.round(pctDesc * 10) / 10,
              pctWeight: Math.round(pctWeight * 10) / 10,
              pctStock: Math.round(pctStock * 10) / 10,
              avgMargin: Math.round(avgMargin * 10) / 10,
              avgPriceNet: Math.round(avgPriceNet * 100) / 100,
              qualityScore: Math.round(qualityScore * 10) / 10
            }
          })
          .sort((a, b) => {
            if (sort === 'score') return b.qualityScore - a.qualityScore
            if (sort === 'margin') return b.avgMargin - a.avgMargin
            if (sort === 'stock') return b.pctStock - a.pctStock
            return b.count - a.count
          })
          .slice(0, limit)

        return json(res, result)
      }

      if (route === '/scatter') {
        const VALID = {
          priceNet: 'Prix net moyen (€)',
          priceRetail: 'Prix retail moyen (€)',
          discount: 'Remise moyenne (%)',
          stockChorzow: 'Stock Chorzów moyen',
          stockHub: 'Stock HUB moyen',
          weight: 'Poids moyen (kg)'
        }
        const xField = VALID[p.x] ? p.x : 'priceNet'
        const yField = VALID[p.y] ? p.y : 'discount'
        const limit = Math.min(200, parseInt(p.limit) || 150)

        const result = Array.from(cat.byBrand.entries())
          .filter(([name]) => name)
          .map(([name, items]) => {
            const valid = items.filter(a => a[xField] > 0 && a[yField] > 0)
            if (valid.length < 3) return null
            const avgX = valid.reduce((s, a) => s + a[xField], 0) / valid.length
            const avgY = valid.reduce((s, a) => s + a[yField], 0) / valid.length
            return { name, x: Math.round(avgX * 100) / 100, y: Math.round(avgY * 100) / 100, count: items.length }
          })
          .filter(Boolean)
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)

        return json(res, { data: result, xLabel: VALID[xField], yLabel: VALID[yField] })
      }

      if (route === '/matrix') {
        const topBrandsN = Math.min(30, Math.max(5, parseInt(p.brands) || 20))
        const topCatsN = Math.min(20, Math.max(3, parseInt(p.cats) || 10))

        const topBrands = Array.from(cat.byBrand.entries())
          .filter(([name]) => name)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, topBrandsN)
          .map(([name]) => name)

        const topCats = Array.from(cat.byCategory.entries())
          .filter(([name]) => name)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, topCatsN)
          .map(([name]) => name)

        const brandSet = new Set(topBrands)
        const catSet = new Set(topCats)
        const matrix = {}
        for (const b of topBrands) { matrix[b] = {}; for (const c of topCats) matrix[b][c] = 0 }

        for (const a of cat.articles) {
          if (brandSet.has(a.manufacturer) && catSet.has(a.temotCat)) {
            matrix[a.manufacturer][a.temotCat]++
          }
        }

        let maxVal = 0
        for (const b of topBrands)
          for (const c of topCats)
            if (matrix[b][c] > maxVal) maxVal = matrix[b][c]

        return json(res, { brands: topBrands, categories: topCats, matrix, maxVal })
      }

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
          min, max,
          label: max === Infinity ? `${min}+` : `${min}–${max}`,
          count: 0
        }))

        const items = brand ? (cat.byBrand.get(brand) ?? []) : cat.articles

        let sum = 0, count = 0, minV = Infinity, maxV = -Infinity
        const vals = []
        for (const a of items) {
          const v = a[field]
          if (!v || v <= 0) continue
          vals.push(v); sum += v; count++
          if (v < minV) minV = v
          if (v > maxV) maxV = v
          for (const b of buckets) {
            if (v >= b.min && v < b.max) { b.count++; break }
          }
        }

        vals.sort((a, b) => a - b)
        const median = vals.length > 0 ? vals[Math.floor(vals.length / 2)] : 0

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

      if (route === '/top-margins') {
        const sortBy = p.sortBy === 'value' ? 'value' : 'pct'
        const limit = Math.min(500, parseInt(p.limit) || 200)
        const brand = p.brand || ''
        const category = p.category || ''
        const inStock = p.inStock === '1'
        const minPrice = parseFloat(p.minPrice) || 0
        const maxPrice = parseFloat(p.maxPrice) || Infinity
        const minMarginPct = parseFloat(p.minMarginPct) || 0

        let pool = cat.articles
        if (brand) pool = cat.byBrand.get(brand) ?? []
        else if (category) pool = cat.byCategory.get(category) ?? []

        const result = []
        for (const a of pool) {
          if (a.priceRetail <= 0 || a.priceNet <= 0 || a.priceRetail <= a.priceNet) continue
          if (brand && a.manufacturer !== brand) continue
          if (category && a.temotCat !== category) continue
          if (inStock && a.stockChorzow <= 0 && a.stockHub <= 0) continue
          if (minPrice > 0 && a.priceNet < minPrice) continue
          if (maxPrice < Infinity && a.priceNet > maxPrice) continue
          const marginPct = Math.round((a.priceRetail - a.priceNet) / a.priceRetail * 1000) / 10
          const marginValue = Math.round((a.priceRetail - a.priceNet) * 100) / 100
          if (marginPct < minMarginPct) continue
          result.push({
            motonet: a.motonet, manufacturer: a.manufacturer, name: a.name,
            priceNet: a.priceNet, priceRetail: a.priceRetail,
            stockChorzow: a.stockChorzow, stockHub: a.stockHub,
            temotCat: a.temotCat, original: a.original, barcode: a.barcode,
            marginPct, marginValue
          })
        }

        result.sort((a, b) => sortBy === 'value' ? b.marginValue - a.marginValue : b.marginPct - a.marginPct)

        // Stats globales
        let sumPct = 0, sumVal = 0, n = result.length
        for (const r of result) { sumPct += r.marginPct; sumVal += r.marginValue }

        return json(res, {
          total: n,
          avgMarginPct: n > 0 ? Math.round(sumPct / n * 10) / 10 : 0,
          avgMarginValue: n > 0 ? Math.round(sumVal / n * 100) / 100 : 0,
          topPct: result.slice().sort((a, b) => b.marginPct - a.marginPct).slice(0, 1)[0] ?? null,
          topValue: result.slice().sort((a, b) => b.marginValue - a.marginValue).slice(0, 1)[0] ?? null,
          items: result.slice(0, limit)
        })
      }

      return json(res, { error: 'not found' }, 404)
    } catch (err) {
      return json(res, { error: err.message }, 500)
    }
  })
}
