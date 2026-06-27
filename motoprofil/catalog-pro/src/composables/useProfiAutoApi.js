import { useAuthStore } from '../stores/auth.js'

const BASE_URL = 'https://article.profiauto.com'
const BATCH_SIZE = 500

export function useProfiAutoApi() {
  const auth = useAuthStore()

  function headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'workshop-guid': ''
    }
  }

  async function getArticleDetails(motonets, signal) {
    const results = []
    for (let i = 0; i < motonets.length; i += BATCH_SIZE) {
      const batch = motonets.slice(i, i + BATCH_SIZE)
      const res = await fetch(`${BASE_URL}/Offer/GetArticleDetailsForList`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          categoryTreeType: 0,
          vehicleId: 0,
          elIds: [],
          motonets: batch
        }),
        ...(signal ? { signal } : {})
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`GetArticleDetailsForList échoué : ${err}`)
      }
      const data = await res.json()
      const items = data?.items ?? data ?? []
      results.push(...items)
    }
    return results
  }

  async function getGraphics(elId) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    try {
      const res = await fetch(`${BASE_URL}/Offer/GetGraphics`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ elId }),
        signal: controller.signal
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`GetGraphics échoué : ${err}`)
      }
      const data = await res.json()
      const files = data?.filesList ?? []
      return files.map(f => {
        const guid = f.guid ?? f.Guid ?? ''
        const cdnBase = 'https://cdn.profiauto.com/Image/'
        const src = f.itemImageSrc ?? f.url ?? (guid ? cdnBase + guid : '')
        const thumb = f.thumbnailImageSrc ?? f.thumbnailUrl ?? src
        const type = f.type ?? ''
        const isPdf = src.toLowerCase().includes('.pdf') || type.toLowerCase() === 'pdf'
        return { itemImageSrc: src, thumbnailImageSrc: thumb, guid, type, isPdf }
      })
    } finally {
      clearTimeout(timer)
    }
  }

  async function enrichArticles(csvArticles) {
    if (!csvArticles.length) return []
    const motonets = csvArticles.map(a => a.motonet ?? a.Motonet ?? '').filter(Boolean)
    const apiItems = await getArticleDetails(motonets)

    const byMotonet = Object.fromEntries(
      apiItems.map(item => [item.motonet ?? item.Motonet ?? '', item])
    )

    return csvArticles.map(article => {
      const key = article.motonet ?? article.Motonet ?? ''
      const api = byMotonet[key]
      if (!api) return article
      return {
        ...article,
        photoGuid: api.photoGuid ?? api.photo_guid ?? null,
        elId: api.elId ?? api.el_id ?? null,
        isImage: api.isImage ?? api.is_image ?? false,
        brandLogoUrl: api.brandLogoUrl ?? null,
        _enriched: true
      }
    })
  }

  return { getArticleDetails, getGraphics, enrichArticles }
}
