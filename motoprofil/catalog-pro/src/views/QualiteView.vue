<template>
  <AppLayout>
    <template #title>
      <span style="font-size:14px;font-weight:600;color:#fafafa">Qualité catalogue</span>
    </template>

    <div class="qualite-wrapper">

      <!-- KPI santé globale -->
      <div class="qualite-kpi-grid">
        <template v-if="loadingHealth">
          <div v-for="i in 7" :key="i" :style="kpiCardSt"><Skeleton height="64px" border-radius="8px" /></div>
        </template>
        <template v-else>
          <div v-for="kpi in healthKpis" :key="kpi.label" :style="kpiCardSt">
            <div style="font-size:22px;font-weight:800" :style="{ color: kpiColor(kpi.pct) }">
              {{ kpi.pct }}%
            </div>
            <div style="font-size:11px;color:#71717a;margin-top:3px">{{ kpi.label }}</div>
            <div style="margin-top:6px;height:3px;border-radius:2px;background:#27272a">
              <div :style="{ width: kpi.pct + '%', height: '100%', borderRadius: '2px', background: kpiColor(kpi.pct) }" />
            </div>
          </div>
          <div :style="{ ...kpiCardSt, borderColor: '#10b981' }">
            <div style="font-size:22px;font-weight:800;color:#10b981">{{ health.avgMargin }}%</div>
            <div style="font-size:11px;color:#71717a;margin-top:3px">Marge brute moyenne</div>
          </div>
        </template>
      </div>

      <!-- Score formule -->
      <div :style="{ ...cardSt, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }">
        <span class="pi pi-info-circle" style="color:#60a5fa;font-size:16px;flex-shrink:0" />
        <span style="font-size:12px;color:#71717a">
          <strong style="color:#a1a1aa">Score dropshipping</strong> = OEM×20% + EAN×20% + Stock×30% + Description×15% + Poids×15%
          &nbsp;—&nbsp;mesure la complétude des données pour la vente en ligne.
        </span>
      </div>

      <!-- Barre de contrôles -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <input v-model="searchQuery" placeholder="Filtrer par marque…" :style="inputSt" />
        <div style="display:flex;align-items:center;gap:6px">
          <label style="font-size:12px;color:#71717a">Trier par</label>
          <select v-model="sortKey" :style="selectSt">
            <option value="count">Nb articles</option>
            <option value="score">Score</option>
            <option value="margin">Marge</option>
            <option value="stock">% Stock</option>
          </select>
        </div>
        <span style="font-size:12px;color:#52525b;margin-left:auto">
          {{ filteredBrands.length }} marque{{ filteredBrands.length !== 1 ? 's' : '' }}
        </span>
        <button @click="exportQualityCsv" :style="exportBtnSt">
          <span class="pi pi-download" style="font-size:12px" />
          Export CSV
        </button>
      </div>

      <!-- Table qualité -->
      <div :style="cardSt">
        <Skeleton v-if="loadingBrands" height="400px" border-radius="8px" />
        <div v-else class="qualite-table-scroll">
          <table style="border-collapse:collapse;min-width:700px;width:100%;font-size:12px">
            <thead style="position:sticky;top:0;z-index:1">
              <tr>
                <th :style="thSt('left')">Marque</th>
                <th :style="thSt('right')">Articles</th>
                <th :style="thSt('center')">Score</th>
                <th :style="thSt('center')">OEM</th>
                <th :style="thSt('center')">EAN</th>
                <th :style="thSt('center')">Stock</th>
                <th :style="thSt('center')">Desc.</th>
                <th :style="thSt('center')">Poids</th>
                <th :style="thSt('right')">Marge moy.</th>
                <th :style="thSt('right')">Prix net moy.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in filteredBrands" :key="b.name" :style="trSt" @click="drillBrand(b.name)">
                <td :style="tdSt('left')">
                  <span style="font-weight:600;color:#10b981;text-decoration:underline;text-decoration-color:#10b98155">{{ b.name }}</span>
                  <span class="pi pi-arrow-right" style="font-size:9px;color:#3f3f46;margin-left:5px" />
                </td>
                <td :style="tdSt('right')">
                  <span style="color:#71717a">{{ b.count.toLocaleString('fr-FR') }}</span>
                </td>
                <td :style="tdSt('center')">
                  <div style="display:flex;align-items:center;gap:6px;justify-content:center">
                    <div style="width:48px;height:5px;border-radius:3px;background:#27272a;flex-shrink:0">
                      <div :style="{ width: b.qualityScore + '%', height: '100%', borderRadius: '3px', background: scoreColor(b.qualityScore) }" />
                    </div>
                    <span :style="{ fontSize: '11px', fontWeight: '700', color: scoreColor(b.qualityScore) }">
                      {{ b.qualityScore.toFixed(0) }}
                    </span>
                  </div>
                </td>
                <td :style="tdSt('center')"><PctBadge :v="b.pctOem" /></td>
                <td :style="tdSt('center')"><PctBadge :v="b.pctBarcode" /></td>
                <td :style="tdSt('center')"><PctBadge :v="b.pctStock" /></td>
                <td :style="tdSt('center')"><PctBadge :v="b.pctDesc" /></td>
                <td :style="tdSt('center')"><PctBadge :v="b.pctWeight" /></td>
                <td :style="tdSt('right')">
                  <span :style="{ color: b.avgMargin > 30 ? '#10b981' : b.avgMargin > 15 ? '#fb923c' : '#f87171' }">
                    {{ b.avgMargin > 0 ? b.avgMargin.toFixed(1) + '%' : '—' }}
                  </span>
                </td>
                <td :style="tdSt('right')">
                  <span style="color:#71717a;font-family:monospace">
                    {{ b.avgPriceNet > 0 ? b.avgPriceNet.toFixed(2) + ' €' : '—' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Skeleton from 'primevue/skeleton'
import AppLayout from '../components/layout/AppLayout.vue'
import { useFiltersStore } from '../stores/filters.js'

// ─── sub-component ───
const PctBadge = {
  props: { v: Number },
  template: `
    <span :style="{
      fontSize: '11px', fontWeight: '600', padding: '1px 7px',
      borderRadius: '10px', display: 'inline-block',
      background: v >= 90 ? 'rgba(16,185,129,0.15)' : v >= 60 ? 'rgba(251,146,60,0.15)' : v >= 30 ? 'rgba(248,113,113,0.15)' : 'rgba(63,63,70,0.2)',
      color: v >= 90 ? '#10b981' : v >= 60 ? '#fb923c' : v >= 30 ? '#f87171' : '#52525b'
    }">{{ v != null ? v.toFixed(0) + '%' : '—' }}</span>
  `
}

const router = useRouter()
const filtersStore = useFiltersStore()

function drillBrand(name) {
  filtersStore.reset()
  filtersStore.setFilter('brands', [name])
  router.push('/parcourir')
}

// ─── DATA ───
const health = ref({})
const brandsData = ref([])
const loadingHealth = ref(true)
const loadingBrands = ref(true)
const searchQuery = ref('')
const sortKey = ref('count')

const healthKpis = computed(() => [
  { label: 'Avec OEM',         pct: health.value.pctOem ?? 0 },
  { label: 'Avec EAN',         pct: health.value.pctBarcode ?? 0 },
  { label: 'En stock (CZ)',     pct: health.value.pctStock ?? 0 },
  { label: 'En stock (HUB)',    pct: health.value.pctStockHub ?? 0 },
  { label: 'Avec description',  pct: health.value.pctDesc ?? 0 },
  { label: 'Avec poids',       pct: health.value.pctWeight ?? 0 }
])

const filteredBrands = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  let items = brandsData.value
  if (q) items = items.filter(b => b.name.toLowerCase().includes(q))
  return items.slice().sort((a, b) => {
    if (sortKey.value === 'score') return b.qualityScore - a.qualityScore
    if (sortKey.value === 'margin') return b.avgMargin - a.avgMargin
    if (sortKey.value === 'stock') return b.pctStock - a.pctStock
    return b.count - a.count
  })
})

async function loadHealth() {
  loadingHealth.value = true
  try {
    const res = await fetch('/api/stats/catalogue-health')
    health.value = await res.json()
  } finally {
    loadingHealth.value = false
  }
}

async function loadBrands() {
  loadingBrands.value = true
  try {
    const res = await fetch('/api/stats/quality-by-brand?limit=500')
    brandsData.value = await res.json()
  } finally {
    loadingBrands.value = false
  }
}

onMounted(() => { loadHealth(); loadBrands() })

function exportQualityCsv() {
  const cols = ['name','count','qualityScore','pctOem','pctBarcode','pctStock','pctDesc','pctWeight','avgMargin','avgPriceNet']
  const headers = ['Marque','Articles','Score','%OEM','%EAN','%Stock','%Desc','%Poids','Marge moy.','Prix net moy.']
  const rows = filteredBrands.value.map(b => cols.map(c => b[c] ?? '').join(';'))
  const csv = '﻿' + [headers.join(';'), ...rows].join('\n')
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })),
    download: `qualite-catalogue-${new Date().toISOString().slice(0,10)}.csv`
  })
  a.click(); URL.revokeObjectURL(a.href)
}

// ─── COLOR HELPERS ───
function kpiColor(pct) {
  if (pct >= 80) return '#10b981'
  if (pct >= 50) return '#fb923c'
  if (pct >= 20) return '#f87171'
  return '#ef4444'
}
function scoreColor(s) {
  if (s >= 70) return '#10b981'
  if (s >= 45) return '#fb923c'
  return '#f87171'
}

// ─── STYLES ───
const cardSt = { background: '#111113', border: '1px solid #27272a', borderRadius: '12px', padding: '20px' }
const kpiCardSt = { background: '#111113', border: '1px solid #27272a', borderRadius: '10px', padding: '14px 16px' }
const inputSt = {
  background: '#1c1c1f', border: '1px solid #27272a', color: '#fafafa',
  borderRadius: '7px', padding: '6px 12px', fontSize: '12px', width: '220px', outline: 'none'
}
const selectSt = {
  background: '#1c1c1f', border: '1px solid #27272a', color: '#a1a1aa',
  borderRadius: '6px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer'
}
const exportBtnSt = {
  display: 'flex', alignItems: 'center', gap: '5px',
  padding: '6px 14px', fontSize: '12px',
  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
  borderRadius: '7px', color: '#10b981', cursor: 'pointer', fontWeight: '500'
}
function thSt(align) {
  return {
    background: '#1c1c1f', color: '#52525b', padding: '8px 10px',
    border: '1px solid #27272a', fontWeight: '500', fontSize: '11px',
    textAlign: align, whiteSpace: 'nowrap'
  }
}
const trSt = { borderBottom: '1px solid #1c1c1f', cursor: 'pointer', transition: 'background 0.1s' }
function tdSt(align) {
  return { padding: '7px 10px', border: '1px solid #1c1c1f', textAlign: align, verticalAlign: 'middle' }
}
</script>

<style scoped>
.qualite-wrapper {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.qualite-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.qualite-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 767px) {
  .qualite-wrapper { padding: 12px; }
  .qualite-kpi-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
}
</style>
