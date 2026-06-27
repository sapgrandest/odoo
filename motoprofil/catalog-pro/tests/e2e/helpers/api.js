// Helpers pour appels API directs depuis les tests Playwright
// Utilise page.request pour rester dans le même contexte (ignoreHTTPSErrors)

export async function apiGet(request, path) {
  const res = await request.get(path)
  if (!res.ok()) throw new Error(`API ${path} → ${res.status()}`)
  return res.json()
}

// "12 345,67 €" → 12345.67
export function parseDisplayedPrice(str) {
  return parseFloat(
    String(str)
      .replace(/ |\s/g, '')   // espaces insécables et espaces
      .replace(',', '.')
      .replace('€', '')
      .trim()
  )
}

// Vérifie qu'un nom ressemble à une vraie marque automobile
// (pas un nom de produit, pas une description polonaise)
export function looksLikeBrandName(name) {
  if (!name) return false
  if (/^\d/.test(name)) return false          // commence par un chiffre → produit
  if (name.length > 35) return false           // trop long → description
  if (/\bNARZĘDZI\b|\bZESTAW\b|\bWALIZCE\b|\bBITÓW\b|\bSZT\.\b/i.test(name)) return false
  return true
}

// Formate un prix comme le fait le composant Vue (fr-FR)
export function formatPrice(val) {
  return Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
