<template>
  <AppLayout>
    <template #title>
      <span style="font-size:14px;font-weight:600;color:#fafafa">Parcourir le catalogue</span>
    </template>

    <div class="browse-root">

      <!-- Backdrop mobile pour sidebar catalogue -->
      <Transition name="bkdrop">
        <div v-if="filterSidebarOpen" class="browse-backdrop" @click="filterSidebarOpen = false" />
      </Transition>

      <!-- Sidebar marques / catégories -->
      <div :class="['browse-sidebar', { open: filterSidebarOpen }]">

        <!-- Onglets Marques / Catégories -->
        <div style="display:flex;border-bottom:1px solid #27272a;flex-shrink:0">
          <button
            @click="sidebarMode = 'brands'"
            :style="{
              flex:1, padding:'10px 0', background:'transparent', border:'none',
              borderBottom: sidebarMode === 'brands' ? '2px solid #10b981' : '2px solid transparent',
              color: sidebarMode === 'brands' ? '#10b981' : '#71717a',
              cursor:'pointer', fontSize:'12px', fontWeight:'600', transition:'all 0.1s'
            }"
          >Marques</button>
          <button
            @click="sidebarMode = 'categories'"
            :style="{
              flex:1, padding:'10px 0', background:'transparent', border:'none',
              borderBottom: sidebarMode === 'categories' ? '2px solid #10b981' : '2px solid transparent',
              color: sidebarMode === 'categories' ? '#10b981' : '#71717a',
              cursor:'pointer', fontSize:'12px', fontWeight:'600', transition:'all 0.1s'
            }"
          >Catégories</button>
        </div>

        <!-- Filtre recherche -->
        <div style="padding:8px;flex-shrink:0;border-bottom:1px solid #1c1c1f">
          <InputText
            v-model="sidebarSearch"
            :placeholder="sidebarMode === 'brands' ? 'Filtrer les marques…' : 'Filtrer les catégories…'"
            style="width:100%;font-size:12px"
          />
        </div>

        <!-- Liste -->
        <div style="flex:1;overflow-y:auto">
          <template v-if="sidebarMode === 'brands'">
            <button
              v-for="brand in filteredBrands"
              :key="brand.name"
              @click="selectBrand(brand.name)"
              :style="{
                width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'7px 12px', background: isSelectedBrand(brand.name) ? 'rgba(16,185,129,0.08)' : 'transparent',
                borderLeft: isSelectedBrand(brand.name) ? '2px solid #10b981' : '2px solid transparent',
                borderTop:'none', borderRight:'none', borderBottom:'none',
                color: isSelectedBrand(brand.name) ? '#fafafa' : '#a1a1aa',
                cursor:'pointer', fontSize:'12px', textAlign:'left', transition:'all 0.1s'
              }"
            >
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">{{ brand.name }}</span>
              <span style="font-size:10px;color:#52525b;flex-shrink:0;margin-left:6px">{{ (brand.count ?? 0).toLocaleString('fr-FR') }}</span>
            </button>
          </template>

          <template v-else>
            <button
              v-for="cat in filteredCategories"
              :key="cat.name"
              @click="selectCategory(cat.name)"
              :style="{
                width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'7px 12px', background: isSelectedCategory(cat.name) ? 'rgba(16,185,129,0.08)' : 'transparent',
                borderLeft: isSelectedCategory(cat.name) ? '2px solid #10b981' : '2px solid transparent',
                borderTop:'none', borderRight:'none', borderBottom:'none',
                color: isSelectedCategory(cat.name) ? '#fafafa' : '#a1a1aa',
                cursor:'pointer', fontSize:'12px', textAlign:'left', transition:'all 0.1s'
              }"
            >
              <span class="line-clamp-1" style="flex:1;text-align:left">{{ cat.name }}</span>
              <span style="font-size:10px;color:#52525b;flex-shrink:0;margin-left:6px">{{ (cat.count ?? 0).toLocaleString('fr-FR') }}</span>
            </button>
          </template>
        </div>

        <!-- Footer stats -->
        <div style="padding:8px 12px;border-top:1px solid #27272a;font-size:10px;color:#3f3f46;flex-shrink:0">
          {{ catalogStore.brandsCount.toLocaleString('fr-FR') }} marques · {{ catalogStore.total.toLocaleString('fr-FR') }} articles
        </div>
      </div>

      <!-- Zone principale -->
      <div class="browse-main">

        <!-- Barre d'outils -->
        <div style="flex-shrink:0;padding:8px 12px;border-bottom:1px solid #27272a;background:#0d0d0f;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <!-- Bouton marques/catégories sur mobile -->
          <button
            class="browse-filter-toggle"
            @click="filterSidebarOpen = true"
          >
            <span class="pi pi-th-large" style="font-size:13px" />
          </button>
          <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:180px">
            <InputText
              v-model="globalSearch"
              placeholder="Recherche globale…"
              style="flex:1;font-size:12px"
              @keydown.enter="handleGlobalSearch"
            />
            <button
              @click="handleGlobalSearch"
              style="background:#10b981;border:none;color:#fff;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:5px;white-space:nowrap"
            >
              <span class="pi pi-search" style="font-size:12px" />
            </button>
          </div>

          <button
            @click="showFilters = !showFilters"
            :style="{
              background: showFilters ? 'rgba(16,185,129,0.15)' : 'transparent',
              border: `1px solid ${showFilters ? '#10b981' : '#27272a'}`,
              color: showFilters ? '#10b981' : '#71717a',
              borderRadius:'6px', padding:'6px 12px', cursor:'pointer',
              fontSize:'12px', display:'flex', alignItems:'center', gap:'5px', whiteSpace:'nowrap'
            }"
          >
            <span class="pi pi-sliders-h" style="font-size:12px" />
            Filtres
          </button>

          <ViewToggle :modelValue="filtersStore.viewMode" @update:modelValue="val => filtersStore.setFilter('viewMode', val)" />

          <Select
            :modelValue="filtersStore.pageSize"
            @update:modelValue="val => { filtersStore.setFilter('pageSize', val); fetchArticles() }"
            :options="pageSizeOptions"
            optionLabel="label"
            optionValue="value"
            style="font-size:12px;width:90px"
          />

          <div style="display:flex;align-items:center;gap:6px">
            <input
              type="checkbox"
              id="br-inStock"
              :checked="filtersStore.inStockOnly"
              @change="e => { filtersStore.setFilter('inStockOnly', e.target.checked); fetchArticles() }"
              style="width:14px;height:14px;cursor:pointer;accent-color:#10b981"
            />
            <label for="br-inStock" style="font-size:12px;color:#a1a1aa;cursor:pointer;white-space:nowrap">En stock</label>
          </div>
        </div>

        <!-- Breadcrumb + stats -->
        <div v-if="breadcrumbLabel" style="flex-shrink:0;padding:6px 14px;background:#09090b;border-bottom:1px solid #27272a;display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;color:#fafafa;font-weight:600">{{ breadcrumbLabel }}</span>
          <span style="color:#27272a">—</span>
          <span style="font-size:12px;color:#71717a">{{ total.toLocaleString('fr-FR') }} article{{ total !== 1 ? 's' : '' }}</span>
          <span style="color:#27272a">·</span>
          <span style="font-size:12px;color:#52525b">Page {{ filtersStore.page }} / {{ totalPages }}</span>
          <button
            v-if="breadcrumbLabel"
            @click="clearSelection"
            style="margin-left:auto;background:transparent;border:none;color:#52525b;cursor:pointer;font-size:11px;display:flex;align-items:center;gap:4px"
          >
            <span class="pi pi-times" style="font-size:10px" /> Désélectionner
          </button>
        </div>

        <!-- Panneau filtres collapsible -->
        <div
          v-show="showFilters"
          style="flex-shrink:0;border-bottom:1px solid #27272a;padding:12px;background:#0d0d0f;max-height:300px;overflow-y:auto"
        >
          <FilterPanel @change="onFilterChange" />
        </div>

        <!-- Zone contenu -->
        <div style="flex:1;overflow:auto;padding:12px">
          <div v-if="loading" style="display:flex;align-items:center;justify-content:center;height:200px;gap:10px;color:#71717a">
            <span class="pi pi-spin pi-spinner" style="font-size:24px" />
            <span style="font-size:13px">Chargement…</span>
          </div>

          <div v-else-if="articles.length === 0 && !loading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:12px;color:#3f3f46">
            <span class="pi pi-inbox" style="font-size:56px" />
            <span style="font-size:14px;color:#52525b">Sélectionner une marque ou une catégorie</span>
          </div>

          <!-- Tableau -->
          <div v-else-if="filtersStore.viewMode === 'table'" style="height:calc(100% - 16px);min-height:300px">
            <ArticleTable
              :articles="articles"
              :loading="loading"
              @row-click="art => dialogRef?.open(art)"
            />
          </div>

          <!-- Liste -->
          <div v-else-if="filtersStore.viewMode === 'list'" style="display:flex;flex-direction:column;gap:4px">
            <div
              v-for="art in articles"
              :key="art.motonet"
              @click="dialogRef?.open(art)"
              style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:#111113;border:1px solid #27272a;border-radius:7px;cursor:pointer;transition:border-color 0.1s"
              @mouseenter="e => e.currentTarget.style.borderColor='#10b981'"
              @mouseleave="e => e.currentTarget.style.borderColor='#27272a'"
            >
              <img
                v-if="art.photoGuid"
                :src="`https://cdn.profiauto.com/Image/${art.photoGuid}`"
                style="width:48px;height:36px;object-fit:contain;flex-shrink:0;background:#09090b;border-radius:4px"
                loading="lazy"
              />
              <div v-else style="width:48px;height:36px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <span class="pi pi-car" style="font-size:20px;color:#3f3f46" />
              </div>
              <span style="font-family:monospace;font-size:12px;font-weight:700;color:#10b981;flex-shrink:0;min-width:100px">{{ art.motonet }}</span>
              <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#71717a;flex-shrink:0;min-width:80px">{{ art.manufacturer }}</span>
              <span class="line-clamp-1" style="font-size:13px;color:#fafafa;flex:1">{{ art.name }}</span>
              <span v-if="art.priceRetail > 0" style="font-family:monospace;font-size:12px;font-weight:600;color:#fafafa;flex-shrink:0">{{ fmtPrice(art.priceRetail) }} €</span>
              <span
                :style="{
                  width:'7px', height:'7px', borderRadius:'50%', flexShrink:0,
                  background: (art.stockChorzow > 0 || art.stockHub > 0) ? '#10b981' : '#3f3f46'
                }"
              />
            </div>
          </div>

          <!-- Grille -->
          <div v-else style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px">
            <ArticleCard
              v-for="art in articles"
              :key="art.motonet"
              :article="art"
              @open="dialogRef?.open(art)"
            />
          </div>
        </div>

        <!-- Paginator -->
        <div v-if="total > 0" style="flex-shrink:0;border-top:1px solid #27272a;background:#0d0d0f">
          <Paginator
            :rows="filtersStore.pageSize"
            :totalRecords="total"
            :first="(filtersStore.page - 1) * filtersStore.pageSize"
            :rowsPerPageOptions="[24, 48, 96, 200]"
            @page="onPageChange"
            :pt="{
              root: { style: 'background:transparent;border:none;padding:6px 12px' },
              current: { style: 'color:#71717a;font-size:12px' }
            }"
          />
        </div>
      </div>

      <!-- Dialog de détail -->
      <ArticleDetailDialog
        ref="dialogRef"
        @open-alternative="openAlternative"
      />
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import InputText   from 'primevue/inputtext'
import Select      from 'primevue/select'
import Paginator   from 'primevue/paginator'
import AppLayout   from '../components/layout/AppLayout.vue'
import ViewToggle  from '../components/catalog/ViewToggle.vue'
import FilterPanel from '../components/catalog/FilterPanel.vue'
import ArticleCard from '../components/catalog/ArticleCard.vue'
import ArticleTable from '../components/catalog/ArticleTable.vue'
import ArticleDetailDialog from '../components/catalog/ArticleDetailDialog.vue'
import { useFiltersStore } from '../stores/filters.js'
import { useCatalogStore } from '../stores/catalog.js'
import { useProfiAutoApi } from '../composables/useProfiAutoApi.js'

const route                 = useRoute()
const filtersStore          = useFiltersStore()
const filterSidebarOpen     = ref(false)
const catalogStore          = useCatalogStore()
const { getArticleDetails } = useProfiAutoApi()

const sidebarMode   = ref('brands')
const sidebarSearch = ref('')
const globalSearch  = ref('')
const showFilters   = ref(false)
const loading       = ref(false)
const articles      = ref([])
const total         = ref(0)
const totalPages    = ref(0)
const dialogRef     = ref(null)
const imageCache    = ref({})

const pageSizeOptions = [
  { label: '24 / page',  value: 24 },
  { label: '48 / page',  value: 48 },
  { label: '96 / page',  value: 96 },
  { label: '200 / page', value: 200 }
]

const filteredBrands = computed(() => {
  const q = sidebarSearch.value.toLowerCase()
  return q
    ? catalogStore.brands.filter(b => b.name.toLowerCase().includes(q))
    : catalogStore.brands
})

const filteredCategories = computed(() => {
  const q = sidebarSearch.value.toLowerCase()
  return q
    ? catalogStore.categories.filter(c => c.name.toLowerCase().includes(q))
    : catalogStore.categories
})

const breadcrumbLabel = computed(() => {
  if (filtersStore.brands.length === 1) return filtersStore.brands[0]
  if (filtersStore.categories.length === 1) return filtersStore.categories[0]
  if (filtersStore.brands.length > 1) return `${filtersStore.brands.length} marques`
  if (filtersStore.categories.length > 1) return `${filtersStore.categories.length} catégories`
  return ''
})

function isSelectedBrand(name)    { return filtersStore.brands.includes(name) }
function isSelectedCategory(name) { return filtersStore.categories.includes(name) }

function selectBrand(name) {
  filtersStore.setFilter('brands', [name])
  filtersStore.setFilter('categories', [])
  filterSidebarOpen.value = false
  fetchArticles()
}

function selectCategory(name) {
  filtersStore.setFilter('categories', [name])
  filterSidebarOpen.value = false
  fetchArticles()
}

function clearSelection() {
  filtersStore.setFilter('brands', [])
  filtersStore.setFilter('categories', [])
  articles.value = []
  total.value = 0
}

function handleGlobalSearch() {
  if (!globalSearch.value.trim()) return
  filtersStore.setFilter('brands', [])
  filtersStore.setFilter('categories', [])
  fetchWithQuery(globalSearch.value.trim())
}

async function fetchWithQuery(q) {
  loading.value = true
  try {
    const params = filtersStore.buildQueryParams()
    params.set('q', q)
    const res = await fetch(`/api/catalog/search?${params}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data  = await res.json()
    articles.value  = data.items   ?? []
    total.value     = data.total   ?? 0
    totalPages.value = data.pages  ?? 0
    enrichImagesBackground()
  } catch (err) {
    console.error('Erreur recherche :', err)
  } finally {
    loading.value = false
  }
}

async function fetchArticles() {
  if (!filtersStore.brands.length && !filtersStore.categories.length && !globalSearch.value) return

  loading.value = true
  try {
    const params = filtersStore.buildQueryParams()
    const res = await fetch(`/api/catalog/browse?${params}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data   = await res.json()
    articles.value  = data.items  ?? []
    total.value     = data.total  ?? 0
    totalPages.value = data.pages ?? 0
    enrichImagesBackground()
  } catch (err) {
    console.error('Erreur browse :', err)
  } finally {
    loading.value = false
  }
}

async function enrichImagesBackground() {
  const toEnrich = articles.value
    .filter(a => a.motonet && !a.photoGuid && !imageCache.value[a.motonet])
    .map(a => a.motonet)

  if (!toEnrich.length) {
    // Appliquer le cache existant
    applyImageCache()
    return
  }

  try {
    const enriched = await getArticleDetails(toEnrich)
    enriched.forEach(e => {
      const key = e.motonet ?? e.Motonet
      if (key && e.photoGuid) imageCache.value[key] = e.photoGuid
    })
    applyImageCache()
  } catch {
    // enrichissement silencieux
  }
}

function applyImageCache() {
  articles.value = articles.value.map(a => {
    if (a.photoGuid) return a
    const cached = imageCache.value[a.motonet]
    return cached ? { ...a, photoGuid: cached } : a
  })
}

function onFilterChange() {
  filtersStore.setFilter('page', 1)
  fetchArticles()
}

function onPageChange(event) {
  const newPage = Math.floor(event.first / event.rows) + 1
  filtersStore.setFilter('page',     newPage)
  filtersStore.setFilter('pageSize', event.rows)
  fetchArticles()
}

function openAlternative(motonet) {
  // Rechercher l'article alternatif directement
  const existing = articles.value.find(a => a.motonet === motonet)
  if (existing) {
    dialogRef.value?.open(existing)
  }
}

function fmtPrice(val) {
  return Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

onMounted(() => {
  const q = route.query?.q
  if (q) {
    globalSearch.value = String(q)
    fetchWithQuery(globalSearch.value)
  } else if (filtersStore.brands.length || filtersStore.categories.length) {
    fetchArticles()
  }
})
</script>

<style scoped>
.browse-root {
  display: flex;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.browse-sidebar {
  width: 240px;
  min-width: 240px;
  background: #111113;
  border-right: 1px solid #27272a;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 150;
}

.browse-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.browse-backdrop {
  display: none;
}

/* Bouton filtre visible uniquement sur mobile */
.browse-filter-toggle {
  display: none;
  background: #1c1c1f;
  border: 1px solid #27272a;
  color: #a1a1aa;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .browse-sidebar {
    position: fixed;
    top: 52px;
    left: 0;
    bottom: 0;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    z-index: 150;
  }

  .browse-sidebar.open {
    transform: translateX(0);
  }

  .browse-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    z-index: 149;
  }

  .browse-filter-toggle {
    display: flex;
    align-items: center;
    gap: 5px;
  }
}

.bkdrop-enter-active,
.bkdrop-leave-active { transition: opacity 0.25s; }
.bkdrop-enter-from,
.bkdrop-leave-to { opacity: 0; }
</style>
