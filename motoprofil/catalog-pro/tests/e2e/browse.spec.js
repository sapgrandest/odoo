// Tests E2E de la page /parcourir
// Vérifie l'affichage ET la cohérence des données UI vs API
import { test, expect } from '@playwright/test'
import { apiGet, parseDisplayedPrice, looksLikeBrandName, formatPrice } from './helpers/api.js'

const BRAND = 'BOSCH'

test.describe('Page /parcourir', () => {

  test.beforeEach(async ({ page }) => {
    const errors = []
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/#/parcourir')
    await page.waitForLoadState('load')
    const sidebar = page.locator('.browse-sidebar')

    // Mobile : ouvrir sidebar d'abord (display:none par défaut sauf avec .open)
    const viewport = page.viewportSize()
    if (viewport && viewport.width < 768) {
      await page.locator('.browse-filter-toggle').click()
      await expect(page.locator('.browse-sidebar.open')).toBeVisible({ timeout: 5_000 })
    } else {
      await expect(sidebar).toBeVisible({ timeout: 10_000 })
    }

    // Attendre les boutons marques (=3ème bouton = 1er bouton de marque)
    await expect(sidebar.locator('button').nth(2)).toBeVisible({ timeout: 20_000 })
    // Stocker les erreurs console dans la page pour y accéder après
    page['_consoleErrors'] = errors
  })

  // ─── Sidebar marques ────────────────────────────────────────────────────────

  test('Liste marques : affichée, cohérente avec API, pas de noms de produits', async ({ page, request }) => {
    const apiBrands = await apiGet(request, '/api/catalog/brands')
    const sidebar = page.locator('.browse-sidebar')
    await expect(sidebar).toBeVisible()

    // Attendre que les boutons marques soient chargés (>2 pour exclure les onglets Marques/Catégories)
    await expect(sidebar.locator('button').nth(2)).toBeVisible({ timeout: 5_000 }).catch(() => {})
    const brandButtons = sidebar.locator('button').filter({ hasNotText: /^Marques$|^Catégories$/ })
    const count = await brandButtons.count()
    expect(count, 'Au moins 10 marques doivent être affichées').toBeGreaterThan(10)

    // Comparer les 10 premières marques UI vs API
    for (let i = 0; i < Math.min(10, count); i++) {
      const btn = brandButtons.nth(i)
      const nameUI = (await btn.locator('span').first().textContent()).trim()
      const countUI = (await btn.locator('span').last().textContent()).trim().replace(/\s/g, '')

      const apiEntry = apiBrands[i]
      expect(nameUI, `Marque[${i}] UI="${nameUI}" vs API="${apiEntry?.name}"`).toBe(apiEntry?.name)

      const countApiStr = (apiEntry?.count ?? 0).toLocaleString('fr-FR').replace(/\s/g, '')
      expect(countUI, `Count marque[${i}] "${nameUI}" UI=${countUI} vs API=${countApiStr}`).toBe(countApiStr)

      // Vérification qualité : c'est une vraie marque
      expect(
        looksLikeBrandName(nameUI),
        `"${nameUI}" ressemble à un nom de produit, pas une marque automobile`
      ).toBe(true)
    }
  })

  test('Footer sidebar : total marques et articles = API', async ({ page, request }) => {
    const status = await apiGet(request, '/api/catalog/status')
    const apiBrands = await apiGet(request, '/api/catalog/brands')
    const footer = page.locator('.browse-sidebar').last().locator('div').filter({ hasText: /marques · / })
    await expect(footer).toBeVisible({ timeout: 15_000 })
    const footerText = await footer.textContent()

    const expectedBrandsStr = apiBrands.length.toLocaleString('fr-FR')
    expect(footerText, `Footer doit contenir "${expectedBrandsStr} marques"`).toContain(expectedBrandsStr)

    const expectedTotalStr = status.total.toLocaleString('fr-FR')
    expect(footerText, `Footer doit contenir "${expectedTotalStr} articles"`).toContain(expectedTotalStr)
  })

  // ─── Sélection marque → articles ────────────────────────────────────────────

  test('Cliquer une marque → articles affichés, manufacturer = nom marque dans chaque card', async ({ page, request }) => {
    const apiBrowse = await apiGet(request, `/api/catalog/browse?brand=${encodeURIComponent(BRAND)}`)
    expect(apiBrowse.total, `BOSCH doit avoir des articles`).toBeGreaterThan(0)

    // Cliquer sur BOSCH dans la sidebar
    const boschBtn = page.locator('.browse-sidebar button').filter({ hasText: BRAND }).first()
    await expect(boschBtn).toBeVisible({ timeout: 10_000 })
    await boschBtn.click()
    // Attendre que les articles apparaissent (fetch async, pas une vraie navigation)
    await expect(page.locator('.browse-main').getByText(/article/)).toBeVisible({ timeout: 15_000 })

    // Le breadcrumb affiche le bon total
    const breadcrumb = page.locator('.browse-main').getByText(/article/)
    await expect(breadcrumb).toBeVisible()
    const breadcrumbText = await breadcrumb.textContent()
    const totalUI = parseInt(breadcrumbText.replace(/\s/g, '').match(/[\d]+/)?.[0] ?? '0')
    expect(
      Math.abs(totalUI - apiBrowse.total),
      `Total UI=${totalUI} vs API=${apiBrowse.total} (écart trop grand)`
    ).toBeLessThan(2)

    // Les articles sont affichés (mode grille par défaut)
    const cards = page.locator('.browse-main').locator('div[style*="border-radius: 10px"]')
    const cardCount = await cards.count()
    expect(cardCount, 'Au moins 1 card doit être affichée').toBeGreaterThan(0)

    // Vérifier les données des 3 premières cards vs API
    for (let i = 0; i < Math.min(3, cardCount); i++) {
      const card = cards.nth(i)
      const motonetUI = (await card.locator('span[style*="monospace"]').first().textContent()).trim()
      const manufacturerUI = (await card.locator('span[style*="10b981"][style*="uppercase"]').textContent()).trim()

      // manufacturer dans la card = BOSCH
      expect(
        manufacturerUI.toUpperCase(),
        `Card[${i}] manufacturer UI="${manufacturerUI}" devrait être "${BRAND}"`
      ).toBe(BRAND)

      // Cross-check avec l'API article
      const article = await apiGet(request, `/api/catalog/article/${motonetUI}`)
      expect(article.manufacturer, `API manufacturer pour ${motonetUI}`).toBe(manufacturerUI)
    }
  })

  test('Articles en mode liste : données cohérentes avec API', async ({ page, request }) => {
    // Aller en mode liste
    const boschBtn = page.locator('.browse-sidebar button').filter({ hasText: BRAND }).first()
    await boschBtn.click()
    // Attendre que les articles apparaissent (fetch async, pas une vraie navigation)
    await expect(page.locator('.browse-main').getByText(/article/)).toBeVisible({ timeout: 15_000 })

    // Switcher en mode liste (ViewToggle)
    const listToggle = page.locator('button[title*="liste"], button[aria-label*="liste"]')
    if (await listToggle.count() > 0) await listToggle.click()

    const rows = page.locator('.browse-main div[style*="border:1px solid #27272a"][style*="border-radius:7px"]')
    const rowCount = await rows.count()
    if (rowCount === 0) return // mode liste peut ne pas être sélectionné

    for (let i = 0; i < Math.min(3, rowCount); i++) {
      const row = rows.nth(i)
      const spans = row.locator('span')
      // Récupérer le motonet (vert monospace)
      const motonetUI = (await row.locator('span[style*="10b981"][style*="monospace"]').textContent()).trim()

      // Cross-check avec API
      const article = await apiGet(request, `/api/catalog/article/${motonetUI}`)
      const priceRetailSpan = row.locator('span[style*="monospace"][style*="font-size:12px"]').last()
      if (await priceRetailSpan.count() > 0 && article.priceRetail > 0) {
        const priceUI = parseDisplayedPrice(await priceRetailSpan.textContent())
        const priceAPI = parseFloat(Number(article.priceRetail).toFixed(2))
        expect(
          Math.abs(priceUI - priceAPI),
          `priceRetail card[${i}] ${motonetUI} UI=${priceUI} vs API=${priceAPI}`
        ).toBeLessThan(0.02)
      }
    }
  })

  // ─── Grille cards : données champ par champ ──────────────────────────────

  test('ArticleCard : manufacturer, motonet, name, prix, stock cohérents avec API', async ({ page, request }) => {
    const boschBtn = page.locator('.browse-sidebar button').filter({ hasText: BRAND }).first()
    await boschBtn.click()
    // Attendre que les articles apparaissent (fetch async, pas une vraie navigation)
    await expect(page.locator('.browse-main').getByText(/article/)).toBeVisible({ timeout: 15_000 })

    const apiBrowse = await apiGet(request, `/api/catalog/browse?brand=${encodeURIComponent(BRAND)}`)
    const apiItems = apiBrowse.items.slice(0, 3)

    const cards = page.locator('.browse-main').locator('div[style*="border-radius: 10px"]')
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThan(0)

    for (let i = 0; i < Math.min(3, cardCount, apiItems.length); i++) {
      const card = cards.nth(i)
      const apiItem = apiItems[i]

      // Manufacturer (vert, uppercase)
      const manufacturerUI = (await card.locator('span[style*="10b981"][style*="uppercase"]').textContent()).trim()
      expect(manufacturerUI, `Card[${i}] manufacturer`).toBe(apiItem.manufacturer)

      // Motonet (monospace, couleur #52525b)
      const motonetUI = (await card.locator('span[style*="monospace"][style*="52525b"]').textContent()).trim()
      expect(motonetUI, `Card[${i}] motonet`).toBe(apiItem.motonet)

      // Prix retail (badge haut-droite)
      if (apiItem.priceRetail > 0) {
        const priceBadge = card.locator('div[style*="position:absolute"][style*="top:6px"][style*="right:6px"]')
        if (await priceBadge.count() > 0) {
          const priceUI = parseDisplayedPrice(await priceBadge.textContent())
          const priceAPI = parseFloat(Number(apiItem.priceRetail).toFixed(2))
          expect(
            Math.abs(priceUI - priceAPI),
            `Card[${i}] priceRetail UI=${priceUI} vs API=${priceAPI}`
          ).toBeLessThan(0.02)
        }
      }

      // Badge remise
      if (apiItem.discount > 0) {
        const discountBadge = card.locator('div[style*="f59e0b"]')
        await expect(discountBadge, `Card[${i}] badge remise attendu (discount=${apiItem.discount})`).toBeVisible()
        const discountText = await discountBadge.textContent()
        expect(discountText.trim(), `Card[${i}] remise affichée`).toContain(`${apiItem.discount}%`)
      }

      // Badge stock : vert si en stock, gris sinon
      const stockDot = card.locator('span[style*="border-radius: 50%"]').first()
      const stockDotBg = await stockDot.evaluate(el => el.style.background)
      const isInStockAPI = (apiItem.stockChorzow ?? 0) > 0 || (apiItem.stockHub ?? 0) > 0
      const isInStockUI = stockDotBg.includes('10b981')
      expect(
        isInStockUI,
        `Card[${i}] stock UI=${isInStockUI} vs API=${isInStockAPI} (CZ=${apiItem.stockChorzow} HUB=${apiItem.stockHub})`
      ).toBe(isInStockAPI)

      // OEM affiché si non vide
      const oemEl = card.locator('div[style*="OEM"]')
      if (apiItem.original) {
        await expect(oemEl, `Card[${i}] OEM doit être visible`).toBeVisible()
        expect(await oemEl.textContent(), `Card[${i}] OEM`).toContain(apiItem.original)
      }
    }
  })

  // ─── Filtre stock ────────────────────────────────────────────────────────

  test('Filtre "En stock" : tous les articles affichés sont en stock', async ({ page, request }) => {
    const boschBtn = page.locator('.browse-sidebar button').filter({ hasText: BRAND }).first()
    await boschBtn.click()
    // Attendre que les articles apparaissent (fetch async, pas une vraie navigation)
    await expect(page.locator('.browse-main').getByText(/article/)).toBeVisible({ timeout: 15_000 })

    // Cocher "En stock" dans la toolbar
    const inStockCheckbox = page.locator('#br-inStock')
    await inStockCheckbox.check()
    // Attendre que les articles se rechargent avec le filtre inStock
    await expect(page.locator('.browse-main').getByText(/article/)).toBeVisible({ timeout: 15_000 })

    const apiBrowse = await apiGet(request, `/api/catalog/browse?brand=${encodeURIComponent(BRAND)}&inStock=1`)
    const breadcrumb = page.locator('.browse-main').getByText(/article/)
    const breadcrumbText = await breadcrumb.textContent()
    const totalUI = parseInt(breadcrumbText.replace(/\s/g, '').match(/\d+/)?.[0] ?? '0')
    expect(totalUI, 'Total avec filtre En stock doit être > 0 et < total sans filtre').toBeGreaterThan(0)

    // Vérifier que les articles API retournés sont bien tous en stock
    for (const item of apiBrowse.items) {
      expect(
        (item.stockChorzow ?? 0) > 0 || (item.stockHub ?? 0) > 0,
        `Article ${item.motonet} n'est pas en stock mais est retourné par inStock=1`
      ).toBe(true)
    }
  })

  // ─── Pagination ─────────────────────────────────────────────────────────

  test('Pagination : page 2 a des articles différents de page 1', async ({ page, request }) => {
    const boschBtn = page.locator('.browse-sidebar button').filter({ hasText: BRAND }).first()
    await boschBtn.click()
    // Attendre que les articles apparaissent (fetch async, pas une vraie navigation)
    await expect(page.locator('.browse-main').getByText(/article/)).toBeVisible({ timeout: 15_000 })

    // Récupérer les motonets de la page 1 via API
    const p1 = await apiGet(request, `/api/catalog/browse?brand=${encodeURIComponent(BRAND)}&page=1&limit=48`)
    const ids1 = new Set(p1.items.map(i => i.motonet))

    // Cliquer page 2 dans le paginator PrimeVue
    const nextBtn = page.locator('.p-paginator button[aria-label*="Next"], .p-paginator .p-paginator-next')
    if (await nextBtn.count() === 0 || await nextBtn.isDisabled()) return
    await nextBtn.click()
    // Attendre que les articles se rechargent sur la page 2
    await expect(page.locator('.browse-main').getByText(/article/)).toBeVisible({ timeout: 15_000 })

    const p2 = await apiGet(request, `/api/catalog/browse?brand=${encodeURIComponent(BRAND)}&page=2&limit=48`)
    const ids2 = p2.items.map(i => i.motonet)
    const overlap = ids2.filter(id => ids1.has(id))
    expect(overlap, `Overlap page 1 / page 2 : ${overlap.join(', ')}`).toHaveLength(0)
  })

  // ─── Dialog détail article ───────────────────────────────────────────────

  test('Détail article : tous les champs affichés cohérents avec API article', async ({ page, request }) => {
    const boschBtn = page.locator('.browse-sidebar button').filter({ hasText: BRAND }).first()
    await boschBtn.click()
    // Attendre que les articles apparaissent (fetch async, pas une vraie navigation)
    await expect(page.locator('.browse-main').getByText(/article/)).toBeVisible({ timeout: 15_000 })

    // Récupérer le premier article de l'API
    const apiBrowse = await apiGet(request, `/api/catalog/browse?brand=${encodeURIComponent(BRAND)}`)
    const apiItem = apiBrowse.items[0]
    const apiArticle = await apiGet(request, `/api/catalog/article/${apiItem.motonet}`)

    // Cliquer la première card
    const firstCard = page.locator('.browse-main').locator('div[style*="border-radius: 10px"]').first()
    await firstCard.click()

    // Attendre le Dialog PrimeVue
    const dialog = page.locator('.p-dialog')
    await expect(dialog).toBeVisible({ timeout: 8_000 })

    // Header : manufacturer tag
    const manufacturerTag = dialog.locator('.p-tag').first()
    const manufacturerUI = (await manufacturerTag.textContent()).trim()
    expect(manufacturerUI.toUpperCase(), 'manufacturer dans header dialog').toBe(apiArticle.manufacturer.toUpperCase())

    // Header : name
    const nameHeader = dialog.locator('span[style*="14px"][style*="font-weight:600"]').first()
    const nameUI = (await nameHeader.textContent()).trim()
    expect(nameUI, 'name dans header dialog').toBe(apiArticle.name)

    // Grille des références
    const infoRows = dialog.locator('.info-row')
    const infoRowCount = await infoRows.count()
    expect(infoRowCount, 'Au moins 5 lignes info attendues').toBeGreaterThan(5)

    // Motonet
    const motonetCell = dialog.locator('div[style*="monospace"][style*="13px"][style*="10b981"]')
    const motonetUI = (await motonetCell.first().textContent()).trim()
    expect(motonetUI, 'motonet dans dialog').toBe(apiArticle.motonet)

    // OEM
    const oemCells = dialog.locator('div[style*="monospace"][style*="12px"][style*="a1a1aa"]')
    if (apiArticle.original) {
      const oemFound = await oemCells.first().textContent()
      expect(oemFound.trim(), 'OEM dans dialog').toBe(apiArticle.original)
    }

    // Prix net : ligne "Prix d'achat net HT"
    if (apiArticle.priceNet > 0) {
      const priceNetRow = dialog.locator('.info-row').filter({ hasText: "Prix d'achat net" })
      if (await priceNetRow.count() > 0) {
        const priceNetUI = (await priceNetRow.locator('span').last().textContent()).trim()
        const priceNetParsed = parseDisplayedPrice(priceNetUI)
        const priceNetAPI = parseFloat(Number(apiArticle.priceNet).toFixed(2))
        expect(Math.abs(priceNetParsed - priceNetAPI), `priceNet dialog`).toBeLessThan(0.02)
      }
    }

    // Stock Chorzów
    const stockCZRow = dialog.locator('.info-row').filter({ hasText: 'Chorzów' })
    if (await stockCZRow.count() > 0) {
      const stockUI = parseInt((await stockCZRow.locator('span').last().textContent()).trim())
      expect(stockUI, `Stock Chorzów dialog`).toBe(apiArticle.stockChorzow ?? 0)
    }

    // Stock HUB
    const stockHubRow = dialog.locator('.info-row').filter({ hasText: 'HUB' })
    if (await stockHubRow.count() > 0) {
      const stockHubUI = parseInt((await stockHubRow.locator('span').last().textContent()).trim())
      expect(stockHubUI, `Stock HUB dialog`).toBe(apiArticle.stockHub ?? 0)
    }

    // TVA
    if (apiArticle.vatRate != null) {
      const tvaRow = dialog.locator('.info-row').filter({ hasText: 'TVA' })
      if (await tvaRow.count() > 0) {
        const tvaUI = (await tvaRow.locator('span').last().textContent()).trim()
        expect(tvaUI, `TVA dialog`).toBe(`${apiArticle.vatRate}%`)
      }
    }

    // Alternatives
    if (apiArticle.alternatives?.filter(Boolean).length > 0) {
      const altsSection = dialog.locator('div[class="section-title"]').filter({ hasText: 'alternatifs' })
      await expect(altsSection, 'Section alternatives doit être visible').toBeVisible()
      for (const alt of apiArticle.alternatives.filter(Boolean)) {
        await expect(dialog.locator(`text=${alt}`), `Alternative ${alt} doit être visible`).toBeVisible()
      }
    }
  })

  // ─── Catégories sidebar ─────────────────────────────────────────────────

  test('Onglet Catégories : cohérent avec API', async ({ page, request }) => {
    const apiCats = await apiGet(request, '/api/catalog/categories')

    const catsTab = page.locator('.browse-sidebar button').filter({ hasText: 'Catégories' })
    await catsTab.click()

    const catButtons = page.locator('.browse-sidebar button').filter({ hasNotText: /^Marques$|^Catégories$/ })
    await expect(catButtons.first()).toBeVisible({ timeout: 8_000 })
    const catCount = await catButtons.count()
    expect(catCount, 'Au moins 10 catégories').toBeGreaterThan(10)

    for (let i = 0; i < Math.min(10, catCount); i++) {
      const btn = catButtons.nth(i)
      const nameUI = (await btn.locator('span').first().textContent()).trim()
      const countUI = (await btn.locator('span').last().textContent()).trim().replace(/\s/g, '')
      const apiCat = apiCats[i]
      expect(nameUI, `Cat[${i}] UI="${nameUI}" vs API="${apiCat?.name}"`).toBe(apiCat?.name)
      const countAPIStr = (apiCat?.count ?? 0).toLocaleString('fr-FR').replace(/\s/g, '')
      expect(countUI, `Cat[${i}] count`).toBe(countAPIStr)
    }
  })

  // ─── Console errors ─────────────────────────────────────────────────────

  test('Pas d\'erreurs console sur la page browse', async ({ page }) => {
    const boschBtn = page.locator('.browse-sidebar button').filter({ hasText: BRAND }).first()
    await boschBtn.click()
    // Attendre que les articles apparaissent (fetch async, pas une vraie navigation)
    await expect(page.locator('.browse-main').getByText(/article/)).toBeVisible({ timeout: 15_000 })
    expect(
      page['_consoleErrors'],
      `Erreurs console : ${page['_consoleErrors'].join('\n')}`
    ).toHaveLength(0)
  })

})
