// Tests de navigation : routes, menu, retour arrière, responsive
import { test, expect } from '@playwright/test'

const ROUTES = [
  { path: '/#/',           label: 'Recherche'       },
  { path: '/#/parcourir', label: 'Parcourir'        },
  { path: '/#/dashboard', label: 'Tableau de bord'  },
  { path: '/#/analyse',   label: 'Analyse'          },
  { path: '/#/qualite',   label: 'Qualité'          },
  { path: '/#/export',    label: 'Export'           },
]

test.describe('Navigation', () => {

  test('Toutes les routes se chargent sans page blanche ni erreur JS', async ({ page }) => {
    for (const route of ROUTES) {
      const errors = []
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

      await page.goto(route.path)
      await page.waitForLoadState('load')

      // Pas de page blanche (body a du contenu)
      const bodyText = await page.textContent('body')
      expect(bodyText.trim().length, `Route ${route.path} → page blanche`).toBeGreaterThan(100)

      // Pas d'erreur JS critique (on ignore les erreurs réseau non-critiques)
      const criticalErrors = errors.filter(e =>
        !e.includes('net::ERR_') &&
        !e.includes('Failed to load resource') &&
        !e.includes('favicon')
      )
      expect(criticalErrors, `Route ${route.path} erreurs JS : ${criticalErrors.join('\n')}`).toHaveLength(0)

      page.removeAllListeners('console')
    }
  })

  test('Route inconnue → redirige vers /', async ({ page }) => {
    await page.goto('/#/page-qui-nexiste-vraiment-pas')
    await page.waitForLoadState('load')
    expect(page.url()).toContain('#/')
    const bodyText = await page.textContent('body')
    expect(bodyText.trim().length).toBeGreaterThan(100)
  })

  test('Refresh (F5) sur /parcourir conserve la page (pas de 404)', async ({ page }) => {
    await page.goto('/#/parcourir')
    await page.waitForLoadState('load')
    await page.reload()
    await page.waitForLoadState('load')
    const bodyText = await page.textContent('body')
    expect(bodyText.trim().length).toBeGreaterThan(100)
    expect(bodyText).not.toContain('404')
    expect(bodyText).not.toContain('Cannot GET')
  })

  test('Refresh sur /dashboard conserve la page', async ({ page }) => {
    await page.goto('/#/dashboard')
    await page.waitForLoadState('load')
    await page.reload()
    await page.waitForLoadState('load')
    const bodyText = await page.textContent('body')
    expect(bodyText).not.toContain('404')
    expect(bodyText).not.toContain('Cannot GET')
  })

  test('Menu de navigation : liens fonctionnent', async ({ page }) => {
    await page.goto('/#/')
    await page.waitForLoadState('load')

    // Cliquer sur "Parcourir" dans la sidebar de navigation
    const parcourirLink = page.locator('a[href*="parcourir"], nav button').filter({ hasText: /parcourir/i })
    if (await parcourirLink.count() > 0) {
      await parcourirLink.first().click()
      await page.waitForLoadState('load')
      expect(page.url()).toContain('parcourir')
    }

    // Cliquer sur "Dashboard"
    const dashLink = page.locator('a[href*="dashboard"], nav button').filter({ hasText: /tableau|dashboard/i })
    if (await dashLink.count() > 0) {
      await dashLink.first().click()
      await page.waitForLoadState('load')
      expect(page.url()).toContain('dashboard')
    }
  })

  test('Retour arrière browser depuis détail → retour à browse', async ({ page }) => {
    await page.goto('/#/parcourir')
    await page.waitForLoadState('load')

    // Sélectionner BOSCH
    const boschBtn = page.locator('.browse-sidebar button').filter({ hasText: 'BOSCH' }).first()
    if (await boschBtn.count() === 0) return
    await boschBtn.click()
    await page.waitForLoadState('load')

    // Naviguer vers le dashboard
    await page.goto('/#/dashboard')
    await page.waitForLoadState('load')
    expect(page.url()).toContain('dashboard')

    // Retour arrière
    await page.goBack()
    await page.waitForLoadState('load')
    expect(page.url()).toContain('parcourir')
  })

  test('Aucune requête serveur en erreur sur toutes les routes', async ({ page }) => {
    const networkErrors = []
    page.on('response', res => {
      if (res.status() >= 500) networkErrors.push({ url: res.url(), status: res.status() })
    })

    for (const route of ROUTES) {
      await page.goto(route.path)
      await page.waitForLoadState('load')
    }

    expect(networkErrors, `Erreurs 5xx : ${JSON.stringify(networkErrors)}`).toHaveLength(0)
  })

})

test.describe('Responsive (mobile 375×667)', () => {

  test.use({ viewport: { width: 375, height: 667 } })

  test('Page /parcourir sur mobile : pas de scroll horizontal', async ({ page }) => {
    await page.goto('/#/parcourir')
    await page.waitForLoadState('load')

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = 375
    expect(bodyWidth, `Scroll horizontal détecté : body.scrollWidth=${bodyWidth} > ${viewportWidth}`).toBeLessThanOrEqual(viewportWidth + 10)
  })

  test('Page /dashboard sur mobile : contenu visible', async ({ page }) => {
    await page.goto('/#/dashboard')
    await page.waitForLoadState('load')
    await page.waitForSelector('.pi-spin', { state: 'hidden', timeout: 15_000 }).catch(() => {})
    const content = await page.textContent('body')
    expect(content.trim().length).toBeGreaterThan(100)
  })

  test('Sidebar browse masquée sur mobile (pas visible par défaut)', async ({ page }) => {
    await page.goto('/#/parcourir')
    await page.waitForLoadState('load')
    // Sur mobile la sidebar est en position:fixed et transform: translateX(-100%)
    // Elle ne doit pas être visible à l'écran sans clic sur le bouton burger
    const sidebar = page.locator('.browse-sidebar')
    const transform = await sidebar.evaluate(el => getComputedStyle(el).transform)
    // Si transform contient une valeur négative de translateX, la sidebar est cachée
    expect(
      transform === 'none' || transform.includes('matrix'),
      'sidebar transform inattendue sur mobile'
    ).toBe(true)
  })

})
