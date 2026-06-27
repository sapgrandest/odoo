<template>
  <AppLayout>
    <template #title>
      <span style="font-size:14px;font-weight:600;color:#fafafa">Recherche par motonet</span>
    </template>

    <div style="display:flex;height:100%;overflow:hidden">

      <!-- Zone principale -->
      <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">

        <!-- Zone de saisie sticky -->
        <div style="flex-shrink:0;background:#111113;border-bottom:1px solid #27272a;padding:14px 16px">
          <div style="display:flex;gap:10px;align-items:flex-start">
            <div style="flex:1;display:flex;flex-direction:column;gap:8px">
              <Textarea
                v-model="searchText"
                placeholder="Saisir les numéros motonet, un par ligne ou séparés par des virgules…"
                :rows="3"
                style="width:100%;font-family:monospace;font-size:13px;resize:vertical"
                @keydown.ctrl.enter="handleSearch"
                @keydown.meta.enter="handleSearch"
              />
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span style="font-size:11px;color:#52525b">Ex. :</span>
                <span
                  v-for="ex in examples"
                  :key="ex"
                  @click="appendExample(ex)"
                  style="font-size:11px;font-family:monospace;padding:2px 8px;background:#1c1c1f;border:1px solid #27272a;border-radius:10px;color:#71717a;cursor:pointer;transition:border-color 0.1s"
                  @mouseenter="e => e.currentTarget.style.borderColor='#3f3f46'"
                  @mouseleave="e => e.currentTarget.style.borderColor='#27272a'"
                >{{ ex }}</span>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
              <button
                @click="handleSearch"
                :disabled="loading || !searchText.trim()"
                style="background:#10b981;border:none;color:#fff;font-size:13px;font-weight:600;padding:10px 20px;border-radius:7px;cursor:pointer;display:flex;align-items:center;gap:7px;white-space:nowrap;opacity:1;transition:opacity 0.15s"
                :style="{ opacity: loading || !searchText.trim() ? 0.5 : 1, cursor: loading || !searchText.trim() ? 'not-allowed' : 'pointer' }"
              >
                <span :class="['pi', loading ? 'pi-spin pi-spinner' : 'pi-search']" style="font-size:13px" />
                {{ loading ? 'Recherche…' : 'Rechercher' }}
              </button>
              <button
                v-if="articles.length > 0"
                @click="clearResults"
                style="background:transparent;border:1px solid #27272a;color:#71717a;font-size:12px;padding:7px 14px;border-radius:7px;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap"
              >
                <span class="pi pi-times" style="font-size:11px" />
                Effacer
              </button>
            </div>
          </div>

          <!-- Barre de progression (batch) -->
          <div v-if="loading && progress > 0" style="margin-top:10px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:11px;color:#71717a">Chargement… {{ progress }}%</span>
              <span style="font-size:11px;color:#71717a">{{ articles.length.toLocaleString('fr-FR') }} articles chargés</span>
            </div>
            <ProgressBar :value="progress" style="height:4px" :pt="{ value: { style: 'background:#10b981' } }" />
          </div>
        </div>

        <!-- Barre de stats + contrôles -->
        <div
          v-if="articles.length > 0"
          style="flex-shrink:0;display:flex;align-items:center;gap:12px;padding:8px 16px;border-bottom:1px solid #27272a;background:#0d0d0f;flex-wrap:wrap"
        >
          <span style="font-size:13px;font-weight:600;color:#fafafa">{{ articles.length.toLocaleString('fr-FR') }} article{{ articles.length !== 1 ? 's' : '' }}</span>
          <span style="color:#27272a">|</span>
          <span style="font-size:12px;color:#71717a">
            <span class="pi pi-image" style="font-size:11px;margin-right:4px;color:#10b981" />
            {{ withImages }} avec image{{ withImages !== 1 ? 's' : '' }}
          </span>
          <span style="font-size:12px;color:#71717a">
            <span class="pi pi-check-circle" style="font-size:11px;margin-right:4px;color:#10b981" />
            {{ inStock }} en stock
          </span>
          <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
            <Select
              :modelValue="filtersStore.sortBy"
              @update:modelValue="val => { filtersStore.setFilter('sortBy', val); sortArticles() }"
              :options="sortOptions"
              optionLabel="label"
              optionValue="value"
              style="font-size:12px"
            />
            <button
              @click="toggleSortDir"
              style="background:#1c1c1f;border:1px solid #27272a;color:#a1a1aa;border-radius:6px;padding:6px 10px;cursor:pointer"
              :title="filtersStore.sortDir === 'asc' ? 'Croissant' : 'Décroissant'"
            >
              <span :class="['pi', filtersStore.sortDir === 'asc' ? 'pi-sort-amount-up' : 'pi-sort-amount-down']" style="font-size:13px" />
            </button>
            <ViewToggle :modelValue="filtersStore.viewMode" @update:modelValue="val => filtersStore.setFilter('viewMode', val)" />
          </div>
        </div>

        <!-- Zone de résultats -->
        <div style="flex:1;overflow:auto;padding:16px">

          <!-- État vide initial -->
          <div
            v-if="!loading && articles.length === 0 && !hasSearched"
            style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px;color:#3f3f46"
          >
            <span class="pi pi-search" style="font-size:64px" />
            <div style="text-align:center">
              <div style="font-size:16px;font-weight:600;color:#52525b;margin-bottom:6px">Saisir des numéros motonet</div>
              <div style="font-size:13px;color:#3f3f46">Un par ligne, ou séparés par des virgules / espaces</div>
            </div>
          </div>

          <!-- Aucun résultat -->
          <div
            v-else-if="!loading && articles.length === 0 && hasSearched"
            style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px;color:#3f3f46"
          >
            <span class="pi pi-inbox" style="font-size:64px" />
            <div style="text-align:center">
              <div style="font-size:16px;font-weight:600;color:#52525b;margin-bottom:6px">Aucun article trouvé</div>
              <div style="font-size:13px;color:#3f3f46">Vérifiez les numéros saisis</div>
            </div>
          </div>

          <!-- Vue tableau -->
          <div v-else-if="filtersStore.viewMode === 'table'" style="height:100%;min-height:400px">
            <ArticleTable
              :articles="sortedArticles"
              :loading="loading"
              @row-click="art => dialogRef?.open(art)"
            />
          </div>

          <!-- Vue liste -->
          <div v-else-if="filtersStore.viewMode === 'list'" style="display:flex;flex-direction:column;gap:4px">
            <div
              v-for="art in sortedArticles"
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
              <span v-if="art.original" style="font-family:monospace;font-size:11px;color:#52525b;flex-shrink:0">{{ art.original }}</span>
              <span v-if="art.priceRetail > 0" style="font-family:monospace;font-size:12px;font-weight:600;color:#fafafa;flex-shrink:0">{{ fmtPrice(art.priceRetail) }} €</span>
              <span
                :style="{
                  width:'7px', height:'7px', borderRadius:'50%', flexShrink:0,
                  background: (art.stockChorzow > 0 || art.stockHub > 0) ? '#10b981' : '#3f3f46'
                }"
              />
            </div>
          </div>

          <!-- Vue grille -->
          <div v-else style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px">
            <ArticleCard
              v-for="art in sortedArticles"
              :key="art.motonet"
              :article="art"
              @open="dialogRef?.open(art)"
            />
          </div>
        </div>
      </div>

      <!-- Panneau filtres -->
      <div
        :style="{
          width: showFilters ? '270px' : '0',
          minWidth: showFilters ? '270px' : '0',
          overflow: 'hidden',
          borderLeft: showFilters ? '1px solid #27272a' : 'none',
          transition: 'all 0.2s ease',
          flexShrink: 0
        }"
      >
        <div style="width:270px;height:100%;overflow-y:auto;padding:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <span style="font-size:12px;font-weight:600;color:#71717a">Filtres</span>
            <button @click="showFilters = false" style="background:transparent;border:none;color:#52525b;cursor:pointer;padding:2px">
              <span class="pi pi-times" style="font-size:12px" />
            </button>
          </div>
          <FilterPanel @change="onFilterChange" />
        </div>
      </div>

      <!-- Bouton toggle filtres (fixed) -->
      <button
        @click="showFilters = !showFilters"
        :style="{
          position:'fixed', bottom:'20px', right:'20px',
          background: showFilters ? '#27272a' : '#10b981',
          border:'none', color:'#fff', borderRadius:'50%',
          width:'44px', height:'44px', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 12px rgba(0,0,0,0.4)', zIndex:50,
          transition:'background 0.15s'
        }"
        :title="showFilters ? 'Masquer les filtres' : 'Afficher les filtres'"
      >
        <span class="pi pi-sliders-h" style="font-size:16px" />
      </button>
    </div>

    <!-- Dialog de détail -->
    <ArticleDetailDialog
      ref="dialogRef"
      @open-alternative="openAlternative"
    />
  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import Textarea      from 'primevue/textarea'
import ProgressBar   from 'primevue/progressbar'
import Select        from 'primevue/select'
import AppLayout     from '../components/layout/AppLayout.vue'
import ViewToggle    from '../components/catalog/ViewToggle.vue'
import FilterPanel   from '../components/catalog/FilterPanel.vue'
import ArticleCard   from '../components/catalog/ArticleCard.vue'
import ArticleTable  from '../components/catalog/ArticleTable.vue'
import ArticleDetailDialog from '../components/catalog/ArticleDetailDialog.vue'
import { useFiltersStore } from '../stores/filters.js'
import { useProfiAutoApi } from '../composables/useProfiAutoApi.js'

const CHUNK_SIZE = 100

const filtersStore            = useFiltersStore()
const { getArticleDetails }   = useProfiAutoApi()

const searchText = ref('')
const loading    = ref(false)
const progress   = ref(0)
const hasSearched = ref(false)
const showFilters = ref(false)
const articles   = ref([])
const dialogRef  = ref(null)
const lastMonets  = ref([])

const examples = ['ABS0215Q', 'FTROP570', 'BOS0986478105', 'MANC30139', 'PURL460']

const sortOptions = [
  { label: 'Nom',         value: 'name' },
  { label: 'Motonet',     value: 'motonet' },
  { label: 'Marque',      value: 'manufacturer' },
  { label: 'Prix retail', value: 'priceRetail' },
  { label: 'Prix net',    value: 'priceNet' },
  { label: 'Stock',       value: 'stockChorzow' },
  { label: 'Remise',      value: 'discount' }
]

const withImages = computed(() => articles.value.filter(a => a.photoGuid).length)
const inStock    = computed(() => articles.value.filter(a => (a.stockChorzow ?? 0) > 0 || (a.stockHub ?? 0) > 0).length)

const sortedArticles = computed(() => {
  const key = filtersStore.sortBy
  const dir = filtersStore.sortDir === 'asc' ? 1 : -1
  return [...articles.value].sort((a, b) => {
    const av = a[key] ?? ''
    const bv = b[key] ?? ''
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv), 'fr') * dir
  })
})

function parseMofonets(text) {
  return [...new Set(
    text.split(/[\n,;\s]+/)
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 2)
  )]
}

function appendExample(ex) {
  const current = searchText.value.trim()
  searchText.value = current ? `${current}\n${ex}` : ex
}

function fmtPrice(val) {
  return Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function handleSearch() {
  const motonets = parseMofonets(searchText.value)
  if (!motonets.length || loading.value) return

  loading.value    = true
  hasSearched.value = true
  progress.value   = 0
  articles.value   = []
  lastMonets.value = motonets

  try {
    const results = []
    for (let i = 0; i < motonets.length; i += CHUNK_SIZE) {
      const batch = motonets.slice(i, i + CHUNK_SIZE)
      const res = await fetch(`/api/catalog/articles?motonets=${batch.join(',')}`)
      if (res.ok) {
        const data = await res.json()
        results.push(...(Array.isArray(data) ? data : []))
      }
      progress.value = Math.round(((i + batch.length) / motonets.length) * 80)
    }
    articles.value = results
    progress.value = 90
    enrichImages(motonets)
  } catch (err) {
    console.error('Erreur recherche :', err)
  } finally {
    loading.value  = false
    progress.value = 0
  }
}

async function enrichImages(motonets) {
  try {
    const enriched = await getArticleDetails(motonets)
    const byMotonet = Object.fromEntries(
      enriched.map(e => [e.motonet ?? e.Motonet ?? '', e])
    )
    articles.value = articles.value.map(a => {
      const e = byMotonet[a.motonet]
      if (!e) return a
      return {
        ...a,
        photoGuid: e.photoGuid ?? a.photoGuid,
        elId:      e.elId      ?? a.elId,
        isImage:   e.isImage   ?? a.isImage
      }
    })
  } catch {
    // enrichissement silencieux
  }
}

function onFilterChange() {
  if (lastMonets.value.length > 0) {
    handleSearch()
  }
}

function sortArticles() {
  // le computed sortedArticles est réactif, rien à faire ici
}

function toggleSortDir() {
  filtersStore.setFilter('sortDir', filtersStore.sortDir === 'asc' ? 'desc' : 'asc')
}

function clearResults() {
  articles.value    = []
  hasSearched.value  = false
  lastMonets.value   = []
  searchText.value   = ''
}

function openAlternative(motonet) {
  searchText.value = motonet
  handleSearch()
}
</script>
