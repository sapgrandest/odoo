<template>
  <AppLayout>
    <template #title>
      <span style="font-size:14px;font-weight:600;color:#fafafa">Tableau de bord</span>
    </template>

    <div class="dash-wrapper">

      <div class="dash-header">
        <div>
          <div style="font-size:20px;font-weight:700;color:#fafafa">Business Intelligence</div>
          <div style="font-size:13px;color:#71717a;margin-top:2px">Analyse du catalogue PB Offer</div>
        </div>
        <button @click="loadAll" :style="refreshBtnStyle" :disabled="globalLoading">
          <span :class="['pi', globalLoading ? 'pi-spin pi-spinner' : 'pi-refresh']" style="font-size:14px" />
          <span class="btn-txt">Actualiser</span>
        </button>
      </div>

      <!-- KPIs -->
      <div :style="kpiGridStyle">
        <StatsCard
          title="Total articles"
          :value="overview.total ? overview.total.toLocaleString('fr-FR') : '—'"
          icon="pi-box"
          color="#10b981"
          :loading="loadingOverview"
        />
        <StatsCard
          title="Marques"
          :value="overview.brands ? overview.brands.toLocaleString('fr-FR') : '—'"
          icon="pi-building"
          color="#60a5fa"
          :loading="loadingOverview"
        />
        <StatsCard
          title="Catégories"
          :value="overview.categories ? overview.categories.toLocaleString('fr-FR') : '—'"
          icon="pi-folder"
          color="#a78bfa"
          :loading="loadingOverview"
        />
        <StatsCard
          title="En stock Chorzów"
          :value="overview.inStock ? overview.inStock.toLocaleString('fr-FR') : '—'"
          :subtitle="overview.total ? `${((overview.inStock / overview.total) * 100).toFixed(1)}% du catalogue` : ''"
          icon="pi-check-circle"
          color="#10b981"
          :loading="loadingOverview"
        />
        <StatsCard
          title="En stock HUB"
          :value="overview.inStockHub ? overview.inStockHub.toLocaleString('fr-FR') : '—'"
          icon="pi-warehouse"
          color="#2dd4bf"
          :loading="loadingOverview"
        />
        <StatsCard
          title="Prix moyen retail"
          :value="overview.avgPriceRetail ? overview.avgPriceRetail.toFixed(2) + ' €' : '—'"
          :subtitle="overview.minPrice && overview.maxPrice ? `${overview.minPrice.toFixed(2)}€ – ${overview.maxPrice.toFixed(2)}€` : ''"
          icon="pi-tag"
          color="#facc15"
          :loading="loadingOverview"
        />
        <StatsCard
          title="Marge brute moyenne"
          :value="catalogHealth.avgMargin ? catalogHealth.avgMargin + '%' : '—'"
          icon="pi-percentage"
          color="#10b981"
          :loading="loadingHealth"
        />
        <StatsCard
          title="Non retournables"
          :value="overview.nonReturnable ? overview.nonReturnable.toLocaleString('fr-FR') : '—'"
          icon="pi-ban"
          color="#ef4444"
          :loading="loadingOverview"
        />
      </div>

      <!-- Charts ligne 1 -->
      <div :style="chartGridStyle">
        <BrandDistributionChart :data="brandsTop" :loading="loadingBrands" title="Top marques par volume" @brand-click="drillBrand" />
        <CategoryChart :data="categories" :loading="loadingCategories" @cat-click="drillCategory" />
      </div>

      <!-- Charts ligne 2 -->
      <div :style="chartGridStyle">
        <PriceDistributionChart :data="priceDistribution" :loading="loadingPrice" />
        <StockChart :data="stockByBrand" :loading="loadingStock" @brand-click="drillBrand" />
      </div>

      <!-- Table marques -->
      <div style="margin-bottom:16px">
        <BrandStockTable :data="brandsTop" :loading="loadingBrands" @brand-click="drillBrand" />
      </div>

      <!-- Santé catalogue + Groupes remise -->
      <div :style="chartGridStyle">

        <div :style="cardStyle">
          <div style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:14px;font-weight:600;color:#fafafa">Santé du catalogue</div>
              <div style="font-size:12px;color:#71717a;margin-top:2px">Complétude des données pour le dropshipping</div>
            </div>
            <RouterLink to="/qualite" style="font-size:11px;color:#10b981;text-decoration:none;display:flex;align-items:center;gap:4px">
              Détail par marque <span class="pi pi-arrow-right" style="font-size:10px" />
            </RouterLink>
          </div>
          <Skeleton v-if="loadingHealth" height="220px" border-radius="8px" />
          <div v-else>
            <div v-for="kpi in healthKpis" :key="kpi.label" style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
                <span style="font-size:12px;color:#a1a1aa">{{ kpi.label }}</span>
                <span :style="{ fontSize: '12px', fontWeight: '700', color: healthColor(kpi.pct) }">{{ kpi.pct }}%</span>
              </div>
              <div style="height:4px;border-radius:2px;background:#27272a">
                <div :style="{ width: Math.min(kpi.pct, 100) + '%', height: '100%', borderRadius: '2px', background: healthColor(kpi.pct), transition: 'width 0.6s ease' }" />
              </div>
            </div>
          </div>
        </div>

        <div :style="cardStyle">
          <div style="margin-bottom:16px">
            <div style="font-size:14px;font-weight:600;color:#fafafa">Groupes de remise</div>
            <div style="font-size:12px;color:#71717a;margin-top:2px">Grilles tarifaires appliquées</div>
          </div>
          <template v-if="loadingDiscount">
            <Skeleton height="200px" border-radius="8px" />
          </template>
          <template v-else>
            <DataTable :value="discountGroups" size="small" :pt="dtPt">
              <Column field="name" header="Groupe">
                <template #body="{ data: row }">
                  <span style="font-size:12px;color:#fafafa;font-weight:500">{{ row.name }}</span>
                </template>
              </Column>
              <Column field="count" header="Articles" style="text-align:right">
                <template #body="{ data: row }">
                  <span style="font-size:12px;color:#a1a1aa">{{ (row.count || 0).toLocaleString('fr-FR') }}</span>
                </template>
              </Column>
              <Column field="avgDiscount" header="Remise moy." style="text-align:right">
                <template #body="{ data: row }">
                  <span style="font-size:12px;color:#fb923c">
                    {{ row.avgDiscount != null ? row.avgDiscount.toFixed(1) + '%' : '—' }}
                  </span>
                </template>
              </Column>
            </DataTable>
          </template>
        </div>
      </div>

    </div>

    <Toast />
  </AppLayout>
</template>

<style scoped>
.dash-wrapper {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
}
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}
@media (max-width: 767px) {
  .dash-wrapper { padding: 16px 12px; }
  .btn-txt { display: none; }
}
</style>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useRouter } from 'vue-router'
import { useBreakpoint } from '../composables/useBreakpoint.js'
import Toast from 'primevue/toast'
import Skeleton from 'primevue/skeleton'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { RouterLink } from 'vue-router'

import AppLayout from '../components/layout/AppLayout.vue'
import StatsCard from '../components/bi/StatsCard.vue'
import BrandDistributionChart from '../components/bi/BrandDistributionChart.vue'
import PriceDistributionChart from '../components/bi/PriceDistributionChart.vue'
import StockChart from '../components/bi/StockChart.vue'
import CategoryChart from '../components/bi/CategoryChart.vue'
import BrandStockTable from '../components/bi/BrandStockTable.vue'
import { useFiltersStore } from '../stores/filters.js'

const toast = useToast()
const router = useRouter()
const filtersStore = useFiltersStore()
const { isMobile, isTablet } = useBreakpoint()

function drillBrand(name) {
  filtersStore.reset()
  filtersStore.setFilter('brands', [name])
  router.push('/parcourir')
}

function drillCategory(cat) {
  filtersStore.reset()
  filtersStore.setFilter('categories', [cat])
  router.push('/parcourir')
}

const overview = ref({})
const brandsTop = ref([])
const priceDistribution = ref([])
const stockByBrand = ref([])
const categories = ref([])
const discountGroups = ref([])
const catalogHealth = ref({})

const loadingOverview = ref(true)
const loadingBrands = ref(true)
const loadingPrice = ref(true)
const loadingStock = ref(true)
const loadingCategories = ref(true)
const loadingDiscount = ref(true)
const loadingHealth = ref(true)
const globalLoading = ref(false)

const healthKpis = computed(() => [
  { label: 'Avec référence OEM',  pct: catalogHealth.value.pctOem ?? 0 },
  { label: 'Avec code EAN',       pct: catalogHealth.value.pctBarcode ?? 0 },
  { label: 'En stock (Chorzów)',  pct: catalogHealth.value.pctStock ?? 0 },
  { label: 'Avec description',    pct: catalogHealth.value.pctDesc ?? 0 },
  { label: 'Avec poids',          pct: catalogHealth.value.pctWeight ?? 0 }
])

function healthColor(pct) {
  if (pct >= 80) return '#10b981'
  if (pct >= 50) return '#fb923c'
  return '#f87171'
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.json()
}

async function loadAll() {
  globalLoading.value = true
  loadingOverview.value = true
  loadingBrands.value = true
  loadingPrice.value = true
  loadingStock.value = true
  loadingCategories.value = true
  loadingDiscount.value = true
  loadingHealth.value = true

  try {
    await Promise.all([
      fetchJson('/api/stats/overview').then(d => { overview.value = d; loadingOverview.value = false }),
      fetchJson('/api/stats/brands-top?limit=25').then(d => { brandsTop.value = d; loadingBrands.value = false }),
      fetchJson('/api/stats/price-distribution').then(d => { priceDistribution.value = d; loadingPrice.value = false }),
      fetchJson('/api/stats/stock-by-brand?limit=20').then(d => { stockByBrand.value = d; loadingStock.value = false }),
      fetchJson('/api/stats/categories?limit=30').then(d => { categories.value = d; loadingCategories.value = false }),
      fetchJson('/api/stats/discount-groups').then(d => { discountGroups.value = d; loadingDiscount.value = false }),
      fetchJson('/api/stats/catalogue-health').then(d => { catalogHealth.value = d; loadingHealth.value = false })
    ])
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erreur de chargement', detail: err.message, life: 5000 })
    loadingOverview.value = false; loadingBrands.value = false; loadingPrice.value = false
    loadingStock.value = false; loadingCategories.value = false; loadingDiscount.value = false
    loadingHealth.value = false
  } finally {
    globalLoading.value = false
  }
}

onMounted(loadAll)

const cardStyle = {
  background: '#111113',
  border: '1px solid #27272a',
  borderRadius: '12px',
  padding: '20px'
}

const refreshBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  fontSize: '13px',
  background: 'rgba(16,185,129,0.1)',
  border: '1px solid rgba(16,185,129,0.3)',
  borderRadius: '8px',
  color: '#10b981',
  cursor: 'pointer',
  fontWeight: '500'
}

const kpiGridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: isMobile.value ? 'repeat(2,1fr)' : isTablet.value ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
  gap: isMobile.value ? '10px' : '16px',
  marginBottom: '24px'
}))

const chartGridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: isMobile.value ? '1fr' : '1fr 1fr',
  gap: isMobile.value ? '12px' : '16px',
  marginBottom: '16px'
}))

const dtPt = {
  root: { style: 'background:transparent;border:none' },
  thead: { style: 'background:#1c1c1f' },
  headerRow: { style: 'background:#1c1c1f' },
  headerCell: { style: 'background:#1c1c1f;color:#71717a;font-size:11px;padding:8px 10px;border-color:#27272a' },
  bodyRow: { style: 'background:transparent;border-color:#27272a' },
  bodyCell: { style: 'padding:6px 10px;border-color:#27272a' }
}
</script>
