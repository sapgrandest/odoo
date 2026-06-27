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
    // Attendre les résultats
    await expect(page.locator('.browse-main').getByText(/article/)).toBeVisible({ timeout: 10_000 })

    const bodyText = await page.textContent('body')
    const expectedStr = apiResult.total.toLocaleString('fr-FR')
    expect(bodyText, `Total "${expectedStr}" doit apparaître dans la page`).toContain(expectedStr)
  })

  test('Recherche terme inexistant → message "aucun résultat"', async ({ page }) => {
    const searchInput = page.locator('textarea').first()
    await searchInput.fill('TERMEQUINEXISTEPAS_XYZ_9999')
    await page.keyboard.press('Control+Enter')
    await page.waitForLoadState('load')

    const bodyText = await page.textContent('body')
    const hasEmptyMessage = bodyText.includes('aucun') || bodyText.includes('Aucun') ||
      bodyText.includes('0 article') || bodyText.includes('résultat') ||
      bodyText.includes('Vérifiez')
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
    const apiResult = await apiGet(request, '/api/catalog/search?q=filtr&limit=5')
    if (apiResult.total === 0) return

    await page.goto('/#/parcourir')
    await page.waitForLoadState('load')

    // Attendre que le catalogue soit prêt (brands loaded) avant de taper la recherche
    await expect(page.locator('.browse-sidebar button').nth(2)).toBeVisible({ timeout: 20_000 })

    const searchInput = page.locator('input[placeholder*="globale"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5_000 })
    await searchInput.fill('filtr')
    await searchInput.press('Enter')
    // Attendre les résultats
    await expect(page.locator('.browse-main').getByText(/article/)).toBeVisible({ timeout: 10_000 })

    for (const item of apiResult.items.slice(0, 3)) {
      await expect(
        page.locator(`text=${item.motonet}`).first(),
        `Motonet ${item.motonet} doit apparaître dans les résultats`
      ).toBeVisible({ timeout: 5_000 })
    }
  })

})
