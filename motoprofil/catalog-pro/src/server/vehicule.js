/**
 * handleVehicule — retourne un véhicule mock + 8 articles aléatoires du catalogue.
 *
 * @param {number|string} ktype  — identifiant TecDoc du véhicule
 * @param {object}        res    — ServerResponse Node.js
 * @param {Function}      getDb  — retourne l'instance better-sqlite3 ou null
 */
export function handleVehicule(ktype, res, getDb) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const db = getDb()

  if (!db) {
    res.statusCode = 503
    res.end(JSON.stringify({ error: 'catalog non disponible' }))
    return
  }

  try {
    const rows = db.prepare(`
      SELECT motonet, manufacturer, name, original, barcode, priceNet, priceRetail,
             temotCat, stockChorzow, stockHub
      FROM articles
      WHERE priceRetail > 0 AND name != ''
      ORDER BY RANDOM()
      LIMIT 8
    `).all()

    const articles = rows.map(row => {
      const motonetSlug = row.motonet.toLowerCase().replace(/[^a-z0-9]/g, '-')
      const nameSlug = row.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 30)
      const odoo_url = `/shop/${motonetSlug}-${nameSlug}`
      const price_ttc = Math.round(row.priceRetail * 1.20 * 100) / 100

      return {
        motonet: row.motonet,
        name: row.name,
        brand: row.manufacturer,
        oe: row.original,
        category: row.temotCat,
        price_ht: row.priceRetail,
        price_ttc,
        in_stock: (row.stockChorzow > 0 || row.stockHub > 0),
        odoo_url,
      }
    })

    const payload = {
      ktype: isNaN(Number(ktype)) ? ktype : Number(ktype),
      vehicle: {
        brand: 'Peugeot',
        model: '206',
        version: '1.4 HDi',
        year: 2003,
        fuel: 'Diesel',
      },
      articles,
      total: articles.length,
      source: 'mock',
    }

    res.statusCode = 200
    res.end(JSON.stringify(payload))
  } catch {
    res.statusCode = 503
    res.end(JSON.stringify({ error: 'catalog non disponible' }))
  }
}
