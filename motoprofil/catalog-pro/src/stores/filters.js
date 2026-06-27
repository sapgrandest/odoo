import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFiltersStore = defineStore('filters', () => {
  const brands = ref([])
  const categories = ref([])
  const discountGroups = ref([])
  const vatRates = ref([])
  const priceMin = ref(null)
  const priceMax = ref(null)
  const inStockOnly = ref(false)
  const hasImageOnly = ref(false)
  const hasPdfOnly = ref(false)
  const viewMode = ref('grid')
  const sortBy = ref('name')
  const sortDir = ref('asc')
  const pageSize = ref(48)
  const page = ref(1)

  function reset() {
    brands.value = []
    categories.value = []
    discountGroups.value = []
    vatRates.value = []
    priceMin.value = null
    priceMax.value = null
    inStockOnly.value = false
    hasImageOnly.value = false
    hasPdfOnly.value = false
    viewMode.value = 'grid'
    sortBy.value = 'name'
    sortDir.value = 'asc'
    pageSize.value = 48
    page.value = 1
  }

  function setFilter(key, value) {
    const map = {
      brands, categories, discountGroups, vatRates,
      priceMin, priceMax, inStockOnly, hasImageOnly,
      hasPdfOnly, viewMode, sortBy, sortDir, pageSize, page
    }
    if (key in map) {
      map[key].value = value
      if (key !== 'page' && key !== 'viewMode') {
        page.value = 1
      }
    }
  }

  function buildQueryParams() {
    const params = new URLSearchParams()
    if (brands.value.length) params.set('brand', brands.value.join(','))
    if (categories.value.length) params.set('category', categories.value.join(','))
    if (discountGroups.value.length) params.set('discountGroup', discountGroups.value.join(','))
    if (vatRates.value.length) params.set('vatRate', vatRates.value.join(','))
    if (priceMin.value !== null) params.set('minPrice', String(priceMin.value))
    if (priceMax.value !== null) params.set('maxPrice', String(priceMax.value))
    if (inStockOnly.value) params.set('inStock', 'true')
    if (hasImageOnly.value) params.set('hasImage', 'true')
    if (hasPdfOnly.value) params.set('hasPdf', 'true')
    params.set('sortBy', sortBy.value)
    params.set('sortDir', sortDir.value)
    params.set('page', String(page.value))
    params.set('limit', String(pageSize.value))
    return params
  }

  return {
    brands,
    categories,
    discountGroups,
    vatRates,
    priceMin,
    priceMax,
    inStockOnly,
    hasImageOnly,
    hasPdfOnly,
    viewMode,
    sortBy,
    sortDir,
    pageSize,
    page,
    reset,
    setFilter,
    buildQueryParams
  }
})
