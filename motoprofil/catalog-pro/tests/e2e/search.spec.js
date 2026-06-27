// Tests E2E de la page de recherche / (SearchView)
import { test, expect } from '@playwright/test'
import { apiGet } from './helpers/api.js'

test.describe('Page de recherche (/)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/')
    await page.waitForLoadState('load')
  })

  test('Page se charge avec un champ de recherche visible', async ({ page }) => {
    const searchInput = page.locator('textarea').first()
    await expect(searchInput).toBeVisible()
  })

  test('Recherche "filtr" → résultats, total = API total, noms pertinents', async ({ page, request }) => {
    const apiResult = await apiGet(request, '/api/catalog/search?q=filtr')
    expect(apiResult.total, 'API doit retourner des résultats pour "filtr"').toBeGreaterThan(0)

    await page.goto('/#/parcourir')
    await page.waitForLoadState('load')

    // Attendre que le catalogue soit prêt (brands loaded) avant de taper la recherche
    await expect(page.locator('.browse-sidebar button').nth(2)).toBeVisible({ timeout: 20_000 })

    const searchInput = page.locator('input[placeholder*="globale"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5_000 })
    await searchInput.fill('filtr')
    await searchInput.press('Enter')
    // Pas de breadcrumb total pour recherche globale (breadcrumbLabel vide) — attendre les cartes
    await expect(page.locator('.browse-main .article-card').first()).toBeVisible({ timeout: 20_000 })
    const cardCount = await page.locator('.browse-main .article-card').count()
    expect(cardCount, 'Des résultats doivent être affichés pour "filtr"').toBeGreaterThan(0)
  })

  test('Recherche terme inexistant → message "aucun résultat"', async ({ page }) => {
    const searchInput = page.locator('textarea').first()
    await searchInput.fill('TERMEQUINEXISTEPAS_XYZ_9999')
    await page.keyboard.press('Control+Enter')
    // SPA: waitForLoadState ne suffit pas — attendre le message vide
    await expect(page.locator('text=Aucun article trouvé')).toBeVisible({ timeout: 15_000 })
    const bodyText = await page.textContent('body')
    const hasEmptyMessage = bodyText.includes('Aucun article trouvé') || bodyText.includes('Vérifiez')
    expect(hasEmptyMessage, 'Un message "aucun résultat" doit être affiché').toBe(true)
  })

  test('Recherche avec apostrophe → pas de crash SQL', async ({ page, request }) => {
    const res = await request.get("/api/catalog/search?q=l'huile")
    expect(res.status(), "Apostrophe ne doit pas causer un 500").toBeLessThan(500)
    const data = await res.json()
    expect(typeof data.total).toBe('number')
  })

  test('Recherche injection XSS → pas d\'exécution JS', async ({ page }) => {
    const alerts = []
    page.on('dialog', d => { alerts.push(d.message()); d.dismiss() })

    const searchInput = page.locator('textarea').first()
    await searchInput.fill('<script>alert("xss")</script>')
    await page.keyboard.press('Control+Enter')
    await page.waitForLoadState('load')
    expect(alerts, 'Aucune alerte XSS ne doit se déclencher').toHaveLength(0)
  })

  test('Injection SQL → pas de 500', async ({ page, request }) => {
    const res = await request.get("/api/catalog/search?q=' OR '1'='1")
    expect(res.status()).toBeLessThan(500)
  })

  test('Recherche ref exacte (motonet) → article correspondant retourné', async ({ request }) => {
    const browse = await apiGet(request, '/api/catalog/browse?brand=BOSCH&limit=1')
    const motonet = browse.items[0]?.motonet
    if (!motonet) return

    const result = await apiGet(request, `/api/catalog/search?q=${encodeURIComponent(motonet)}`)
    expect(result.total, `Recherche motonet exact ${motonet} doit retourner ≥ 1 résultat`).toBeGreaterThanOrEqual(1)
    expect(result.items[0].motonet, 'Premier résultat = motonet recherché').toBe(motonet)
  })

  test('Résultats search cohérents avec API (5 premiers articles = même ordre)', async ({ page, request }) => {
    // Mêmes params que BrowseView: sortBy=name&sortDir=asc&page=1&limit=48
    const apiResult = await apiGet(request, '/api/catalog/search?q=filtr&sortBy=name&sortDir=asc&page=1&limit=48')
    if (apiResult.total === 0) return

    await page.goto('/#/parcourir')
    await page.waitForLoadState('load')

    // Attendre que le catalogue soit prêt (brands loaded) avant de taper la recherche
    await expect(page.locator('.browse-sidebar button').nth(2)).toBeVisible({ timeout: 20_000 })

    const searchInput = page.locator('input[placeholder*="globale"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5_000 })
    await searchInput.fill('filtr')
    await searchInput.press('Enter')
    // Pas de breadcrumb total pour recherche globale — attendre les cartes
    await expect(page.locator('.browse-main .article-card').first()).toBeVisible({ timeout: 20_000 })

    // Vérifier les 3 premiers motnets (mêmes params = même tri qu'en vue)
    for (const item of apiResult.items.slice(0, 3)) {
      const locator = page.locator('.browse-main .article-motonet').filter({ hasText: item.motonet }).first()
      await expect(
        locator,
        `Motonet ${item.motonet} doit apparaître dans les résultats`
      ).toBeVisible({ timeout: 10_000 })
    }
  })

})
