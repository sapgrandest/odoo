import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCatalogStore = defineStore('catalog', () => {
  const ready = ref(false)
  const total = ref(0)
  const brandsCount = ref(0)
  const categoriesCount = ref(0)
  const brands = ref([])
  const categories = ref([])
  const discountGroups = ref([])
  const vatRates = ref([])
  const priceRange = ref({ min: 0, max: 0 })
  const statusPollInterval = ref(null)

  async function startPolling() {
    if (statusPollInterval.value) return
    statusPollInterval.value = setInterval(async () => {
      try {
        const res = await fetch('/api/catalog/status')
        if (!res.ok) return
        const data = await res.json()
        total.value = data.total ?? 0
        brandsCount.value = data.brandsCount ?? 0
        categoriesCount.value = data.categoriesCount ?? 0
        if (data.ready) {
          ready.value = true
          stopPolling()
          await Promise.all([loadBrands(), loadCategories(), loadMeta()])
        }
      } catch {
        // ignore
      }
    }, 800)
  }

  async function loadBrands() {
    try {
      const res = await fetch('/api/catalog/brands')
      if (res.ok) brands.value = await res.json()
    } catch {
      // ignore
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch('/api/catalog/categories')
      if (res.ok) categories.value = await res.json()
    } catch {
      // ignore
    }
  }

  async function loadMeta() {
    try {
      const [dRes, vRes] = await Promise.all([
        fetch('/api/catalog/discount-groups'),
        fetch('/api/catalog/vat-rates')
      ])
      if (dRes.ok) discountGroups.value = await dRes.json()
      if (vRes.ok) vatRates.value = await vRes.json()
    } catch {
      // ignore
    }
  }

  function stopPolling() {
    if (statusPollInterval.value) {
      clearInterval(statusPollInterval.value)
      statusPollInterval.value = null
    }
  }

  return {
    ready,
    total,
    brandsCount,
    categoriesCount,
    brands,
    categories,
    discountGroups,
    vatRates,
    priceRange,
    statusPollInterval,
    startPolling,
    loadBrands,
    loadCategories,
    loadMeta,
    stopPolling
  }
})
