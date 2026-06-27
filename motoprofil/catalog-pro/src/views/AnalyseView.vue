<template>
  <AppLayout>
    <template #title>
      <span style="font-size:14px;font-weight:600;color:#fafafa">Analyse</span>
    </template>

    <div class="analyse-wrapper">

      <!-- Tabs -->
      <div class="analyse-tabs">
        <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" :style="tabBtnStyle(tab.id === activeTab)">
          <span :class="['pi', tab.icon]" style="font-size:13px" />
          {{ tab.label }}
        </button>
      </div>

      <!-- ═══ SCATTER ═══ -->
      <div v-if="activeTab === 'scatter'">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px">
            <label style="font-size:12px;color:#71717a;white-space:nowrap">Axe X</label>
            <select v-model="scatterX" @change="loadScatter" :style="selectSt">
              <option v-for="f in scatterFields" :key="f.v" :value="f.v">{{ f.l }}</option>
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="font-size:12px;color:#71717a;white-space:nowrap">Axe Y</label>
            <select v-model="scatterY" @change="loadScatter" :style="selectSt">
              <option v-for="f in scatterFields" :key="f.v" :value="f.v">{{ f.l }}</option>
            </select>
          </div>
          <span style="font-size:12px;color:#52525b">{{ scatterData.length }} marques représentées</span>
        </div>
        <div :style="cardSt">
          <div class="chart-h-lg">
            <Skeleton v-if="loadingScatter" height="100%" border-radius="8px" />
            <Chart v-else type="bubble" :data="scatterChartData" :options="scatterOpts" style="height:100%" />
          </div>
          <div style="margin-top:10px;font-size:11px;color:#3f3f46;text-align:center">
            Chaque bulle = une marque · Taille = nombre d'articles · Survoler pour le détail
          </div>
        </div>
      </div>

      <!-- ═══ DISTRIBUTION ═══ -->
      <div v-else-if="activeTab === 'distribution'">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px">
            <label style="font-size:12px;color:#71717a;white-space:nowrap">Champ</label>
            <select v-model="distField" @change="loadDist" :style="selectSt">
              <option value="priceNet">Prix net (€)</option>
              <option value="priceRetail">Prix retail (€)</option>
              <option value="discount">Remise (%)</option>
              <option value="weight">Poids (kg)</option>
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="font-size:12px;color:#71717a;white-space:nowrap">Marque</label>
            <select v-model="distBrand" @change="loadDist" :style="selectSt">
              <option value="">Toutes marques</option>
              <option v-for="b in topBrandNames" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
        </div>

        <div :style="cardSt">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;gap:16px;flex-wrap:wrap">
            <div>
              <div style="font-size:14px;font-weight:600;color:#fafafa">Distribution — {{ distFieldLabel }}</div>
              <div v-if="distBrand" style="font-size:11px;color:#10b981;margin-top:2px">{{ distBrand }}</div>
            </div>
            <div v-if="distStats" style="display:flex;gap:20px;flex-wrap:wrap">
              <div v-for="s in statsSummary" :key="s.l" style="text-align:center">
                <div style="font-size:18px;font-weight:700;color:#fafafa">{{ s.v }}</div>
                <div style="font-size:10px;color:#52525b;margin-top:1px">{{ s.l }}</div>
              </div>
            </div>
          </div>
          <div class="chart-h-md">
            <Skeleton v-if="loadingDist" height="100%" border-radius="8px" />
            <Chart v-else type="bar" :data="distChartData" :options="distOpts" style="height:100%" />
          </div>
        </div>
      </div>

      <!-- ═══ MATRICE ═══ -->
      <div v-else-if="activeTab === 'matrix'">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px">
            <label style="font-size:12px;color:#71717a;white-space:nowrap">Marques (top N)</label>
            <select v-model="matrixBrands" @change="loadMatrix" :style="selectSt">
              <option :value="10">10</option><option :value="15">15</option>
              <option :value="20">20</option><option :value="25">25</option>
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="font-size:12px;color:#71717a;white-space:nowrap">Catégories (top N)</label>
            <select v-model="matrixCats" @change="loadMatrix" :style="selectSt">
              <option :value="8">8</option><option :value="10">10</option>
              <option :value="12">12</option><option :value="15">15</option>
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:60px;height:10px;border-radius:4px;background:linear-gradient(to right,#09090b,#10b981)" />
            <span style="font-size:11px;color:#52525b">0 → max</span>
          </div>
        </div>
        <div :style="cardSt">
          <div style="margin-bottom:14px">
            <div style="font-size:14px;font-weight:600;color:#fafafa">Matrice Marque × Catégorie</div>
            <div style="font-size:11px;color:#71717a;margin-top:2px">Nombre d'articles par intersection. Intensité = densité.</div>
          </div>
          <Skeleton v-if="loadingMatrix" height="420px" border-radius="8px" />
          <div v-else style="overflow:auto;max-height:520px">
            <table style="border-collapse:collapse;font-size:10px;width:max-content">
              <thead>
                <tr>
                  <th :style="thSt">Marque \ Catégorie</th>
                  <th v-for="c in matrixData.categories" :key="c" :style="thSt" :title="c">
                    <div style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ c }}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in matrixData.brands" :key="b">
                  <td :style="tdBrandSt">{{ b }}</td>
                  <td v-for="c in matrixData.categories" :key="c"
                    :style="{ ...matrixCellSt(matrixData.matrix?.[b]?.[c] || 0, matrixData.maxVal), cursor: (matrixData.matrix?.[b]?.[c] || 0) > 0 ? 'pointer' : 'default' }"
                    :title="`${b} × ${c}: ${(matrixData.matrix?.[b]?.[c] || 0).toLocaleString('fr-FR')} articles — cliquer pour explorer`"
                    @click="(matrixData.matrix?.[b]?.[c] || 0) > 0 && drillBrandCat(b, c)">
                    <span v-if="(matrixData.matrix?.[b]?.[c] || 0) > 0">
                      {{ (matrixData.matrix[b][c]).toLocaleString('fr-FR') }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ═══ OPPORTUNITÉS ═══ -->
      <div v-else-if="activeTab === 'opps'">

        <!-- Contrôles -->
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;flex-wrap:wrap">
          <div style="display:flex;gap:4px;background:#1c1c1f;border-radius:8px;padding:3px">
            <button @click="oppSort='pct'; loadOpps()" :style="sortBtnSt(oppSort==='pct')">Marge %</button>
            <button @click="oppSort='value'; loadOpps()" :style="sortBtnSt(oppSort==='value')">Marge €</button>
          </div>
          <select v-model="oppBrand" @change="loadOpps" :style="selectSt">
            <option value="">Toutes marques</option>
            <option v-for="b in topBrandNames" :key="b" :value="b">{{ b }}</option>
          </select>
          <label :style="chkLabelSt">
            <input type="checkbox" v-model="oppInStock" @change="loadOpps" style="accent-color:#10b981;width:14px;height:14px" />
            <span style="font-size:12px;color:#a1a1aa">En stock uniquement</span>
          </label>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:12px;color:#71717a">Prix net min</span>
            <input v-model.number="oppMinPrice" @change="loadOpps" type="number" min="0" placeholder="0"
              style="width:72px;background:#1c1c1f;border:1px solid #27272a;color:#a1a1aa;border-radius:6px;padding:5px 8px;font-size:12px" />
          </div>
          <span v-if="oppsData.total != null" style="font-size:12px;color:#52525b;margin-left:auto">
            {{ oppsData.total.toLocaleString('fr-FR') }} articles éligibles
          </span>
        </div>

        <!-- KPI top articles -->
        <div v-if="oppsData.topPct || oppsData.topValue" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div v-if="oppsData.topPct" :style="kpiOppSt('#10b981')">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#10b981;margin-bottom:6px">Meilleure marge %</div>
            <div style="font-size:18px;font-weight:800;color:#fafafa">{{ oppsData.topPct.marginPct }}%</div>
            <div style="font-size:12px;color:#a1a1aa;margin-top:2px">{{ oppsData.topPct.motonet }} — {{ oppsData.topPct.manufacturer }}</div>
            <div style="font-size:11px;color:#52525b;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ oppsData.topPct.name }}</div>
            <div style="font-size:12px;color:#71717a;margin-top:4px">
              {{ oppsData.topPct.priceNet.toFixed(2) }}€ net → {{ oppsData.topPct.priceRetail.toFixed(2) }}€ retail
              · <span style="color:#10b981">+{{ oppsData.topPct.marginValue.toFixed(2) }}€</span>
            </div>
          </div>
          <div v-if="oppsData.topValue" :style="kpiOppSt('#f59e0b')">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#f59e0b;margin-bottom:6px">Meilleure marge €</div>
            <div style="font-size:18px;font-weight:800;color:#fafafa">+{{ oppsData.topValue.marginValue.toFixed(2) }}€</div>
            <div style="font-size:12px;color:#a1a1aa;margin-top:2px">{{ oppsData.topValue.motonet }} — {{ oppsData.topValue.manufacturer }}</div>
            <div style="font-size:11px;color:#52525b;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ oppsData.topValue.name }}</div>
            <div style="font-size:12px;color:#71717a;margin-top:4px">
              {{ oppsData.topValue.priceNet.toFixed(2) }}€ net → {{ oppsData.topValue.priceRetail.toFixed(2) }}€ retail
              · <span style="color:#f59e0b">{{ oppsData.topValue.marginPct }}%</span>
            </div>
          </div>
        </div>

        <!-- Scatter marge% × marge€ -->
        <div :style="{ ...cardSt, marginBottom: '16px' }">
          <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:14px;font-weight:600;color:#fafafa">Marge % vs Marge €</div>
              <div style="font-size:11px;color:#71717a;margin-top:2px">Coin haut-droit = meilleur des deux mondes. Survoler pour le détail.</div>
            </div>
          </div>
          <div class="chart-h-md">
            <Skeleton v-if="loadingOpps" height="100%" border-radius="8px" />
            <Chart v-else type="bubble" :data="oppsScatterData" :options="oppsScatterOpts" style="height:100%" />
          </div>
        </div>

        <!-- Table classement -->
        <div :style="cardSt">
          <div style="font-size:14px;font-weight:600;color:#fafafa;margin-bottom:14px">
            Top {{ (oppsData.items || []).length }} articles
            <span style="font-size:11px;color:#71717a;font-weight:400;margin-left:8px">
              triés par {{ oppSort === 'pct' ? 'marge %' : 'marge €' }}
            </span>
          </div>
          <Skeleton v-if="loadingOpps" height="300px" border-radius="8px" />
          <div v-else style="overflow:auto">
            <table style="border-collapse:collapse;width:100%;font-size:11px">
              <thead>
                <tr>
                  <th :style="thSt">Rang</th>
                  <th :style="thSt">Motonet</th>
                  <th :style="thSt">Marque</th>
                  <th :style="thSt" style="max-width:220px">Nom</th>
                  <th :style="{ ...thSt, textAlign:'right' }">Prix net</th>
                  <th :style="{ ...thSt, textAlign:'right' }">Prix retail</th>
                  <th :style="{ ...thSt, textAlign:'right' }">Marge %</th>
                  <th :style="{ ...thSt, textAlign:'right' }">Marge €</th>
                  <th :style="{ ...thSt, textAlign:'center' }">Stk CZ</th>
                  <th :style="thSt">Catégorie</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(a, idx) in (oppsData.items || [])" :key="a.motonet"
                  :style="{ borderBottom: '1px solid #1c1c1f', cursor: 'pointer' }"
                  @click="drillSearch(a.motonet)">
                  <td style="padding:6px 8px;color:#52525b;font-weight:700;text-align:center">{{ idx + 1 }}</td>
                  <td style="padding:6px 8px">
                    <span style="font-family:monospace;color:#10b981;font-weight:600;text-decoration:underline;text-decoration-color:#10b98155">{{ a.motonet }}</span>
                  </td>
                  <td style="padding:6px 8px">
                    <span @click.stop="drillBrand(a.manufacturer)" style="font-weight:700;color:#60a5fa;text-transform:uppercase;font-size:10px;cursor:pointer;text-decoration:underline;text-decoration-color:#60a5fa55">{{ a.manufacturer }}</span>
                  </td>
                  <td style="padding:6px 8px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fafafa">{{ a.name }}</td>
                  <td style="padding:6px 8px;text-align:right;font-family:monospace;color:#71717a">{{ a.priceNet.toFixed(2) }}€</td>
                  <td style="padding:6px 8px;text-align:right;font-family:monospace;color:#fafafa">{{ a.priceRetail.toFixed(2) }}€</td>
                  <td style="padding:6px 8px;text-align:right">
                    <span :style="{ fontWeight:'700', color: a.marginPct >= 60 ? '#10b981' : a.marginPct >= 40 ? '#34d399' : '#fb923c' }">
                      {{ a.marginPct }}%
                    </span>
                  </td>
                  <td style="padding:6px 8px;text-align:right">
                    <span :style="{ fontWeight:'700', color: a.marginValue >= 100 ? '#f59e0b' : a.marginValue >= 20 ? '#fbbf24' : '#a1a1aa' }">
                      +{{ a.marginValue.toFixed(2) }}€
                    </span>
                  </td>
                  <td style="padding:6px 8px;text-align:center">
                    <span :style="stockBadgeSt(a.stockChorzow)">{{ a.stockChorzow }}</span>
                  </td>
                  <td style="padding:6px 8px;color:#52525b;font-size:10px">{{ a.temotCat || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Chart from 'primevue/chart'
import Skeleton from 'primevue/skeleton'
import AppLayout from '../components/layout/AppLayout.vue'
import { useFiltersStore } from '../stores/filters.js'

const router = useRouter()
const filtersStore = useFiltersStore()

function drillBrand(name) {
  filtersStore.reset()
  filtersStore.setFilter('brands', [name])
  router.push('/parcourir')
}

function drillBrandCat(brand, cat) {
  filtersStore.reset()
  filtersStore.setFilter('brands', [brand])
  filtersStore.setFilter('categories', [cat])
  router.push('/parcourir')
}

function drillSearch(q) {
  router.push({ path: '/parcourir', query: { q } })
}

const tabs = [
  { id: 'scatter',      label: 'Nuage de marques', icon: 'pi-chart-scatter' },
  { id: 'distribution', label: 'Distribution',     icon: 'pi-chart-bar' },
  { id: 'matrix',       label: 'Matrice',           icon: 'pi-table' },
  { id: 'opps',         label: 'Opportunités',      icon: 'pi-star-fill' }
]
const activeTab = ref('scatter')

const PALETTE = [
  '#10b981','#60a5fa','#f59e0b','#f87171','#a78bfa','#34d399','#fb923c',
  '#818cf8','#4ade80','#fbbf24','#f472b6','#38bdf8','#a3e635','#e879f9',
  '#22d3ee','#fb7185','#86efac','#fcd34d','#c084fc','#67e8f9'
]

// ─── SCATTER ───
const scatterFields = [
  { v: 'priceNet',    l: 'Prix net moyen (€)' },
  { v: 'priceRetail', l: 'Prix retail moyen (€)' },
  { v: 'discount',    l: 'Remise moyenne (%)' },
  { v: 'stockChorzow',l: 'Stock Chorzów moyen' },
  { v: 'stockHub',    l: 'Stock HUB moyen' },
  { v: 'weight',      l: 'Poids moyen (kg)' }
]
const scatterX = ref('priceNet')
const scatterY = ref('discount')
const scatterData = ref([])
const loadingScatter = ref(true)

async function loadScatter() {
  loadingScatter.value = true
  try {
    const res = await fetch(`/api/stats/scatter?x=${scatterX.value}&y=${scatterY.value}&limit=150`)
    const json = await res.json()
    scatterData.value = json.data || []
    scatterXLabel.value = json.xLabel || scatterX.value
    scatterYLabel.value = json.yLabel || scatterY.value
  } finally {
    loadingScatter.value = false
  }
}

const scatterXLabel = ref('')
const scatterYLabel = ref('')

const scatterChartData = computed(() => {
  if (!scatterData.value.length) return { datasets: [] }
  const maxCount = Math.max(...scatterData.value.map(d => d.count))
  return {
    datasets: [{
      label: 'Marques',
      data: scatterData.value.map((d, i) => ({
        x: d.x, y: d.y,
        r: Math.max(5, Math.min(28, Math.sqrt(d.count / maxCount) * 28)),
        _name: d.name, _count: d.count
      })),
      backgroundColor: scatterData.value.map((_, i) => PALETTE[i % PALETTE.length] + 'bb'),
      borderColor: scatterData.value.map((_, i) => PALETTE[i % PALETTE.length]),
      borderWidth: 1.5
    }]
  }
})

const scatterOpts = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  onClick: (event, elements, chart) => {
    if (!elements.length) return
    const name = chart.data.datasets[0].data[elements[0].index]._name
    if (name) drillBrand(name)
  },
  onHover: (event, elements) => {
    if (event.native?.target) event.native.target.style.cursor = elements.length ? 'pointer' : 'default'
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1c1c1f', borderColor: '#27272a', borderWidth: 1,
      titleColor: '#fafafa', bodyColor: '#a1a1aa',
      callbacks: {
        title: ctx => ctx[0]?.raw?._name ?? '',
        label: ctx => {
          const r = ctx.raw
          return [
            ` ${scatterXLabel.value}: ${r.x?.toLocaleString('fr-FR')}`,
            ` ${scatterYLabel.value}: ${r.y?.toLocaleString('fr-FR')}`,
            ` Articles: ${r._count?.toLocaleString('fr-FR')}`,
            ` → Cliquer pour explorer`
          ]
        }
      }
    }
  },
  scales: {
    x: {
      title: { display: true, text: scatterXLabel.value, color: '#71717a', font: { size: 11 } },
      ticks: { color: '#71717a', font: { size: 10 } },
      grid: { color: '#1c1c1f' }
    },
    y: {
      title: { display: true, text: scatterYLabel.value, color: '#71717a', font: { size: 11 } },
      ticks: { color: '#71717a', font: { size: 10 } },
      grid: { color: '#1c1c1f' }
    }
  }
}))

// ─── DISTRIBUTION ───
const distField = ref('priceNet')
const distBrand = ref('')
const distData = ref([])
const distStats = ref(null)
const loadingDist = ref(true)
const topBrandNames = ref([])

const distFieldLabel = computed(() => ({
  priceNet: 'Prix net (€)', priceRetail: 'Prix retail (€)',
  discount: 'Remise (%)', weight: 'Poids (kg)'
}[distField.value] || distField.value))

async function loadDist() {
  loadingDist.value = true
  try {
    const params = new URLSearchParams({ field: distField.value })
    if (distBrand.value) params.set('brand', distBrand.value)
    const res = await fetch(`/api/stats/distribution?${params}`)
    const json = await res.json()
    distData.value = json.buckets || []
    distStats.value = json.stats || null
  } finally {
    loadingDist.value = false
  }
}

const distChartData = computed(() => ({
  labels: distData.value.map(b => b.label),
  datasets: [{
    label: 'Articles',
    data: distData.value.map(b => b.count),
    backgroundColor: distData.value.map((_, i) => PALETTE[i % PALETTE.length] + 'cc'),
    borderColor: distData.value.map((_, i) => PALETTE[i % PALETTE.length]),
    borderWidth: 1, borderRadius: 4, borderSkipped: false
  }]
}))

const total = computed(() => distData.value.reduce((s, b) => s + b.count, 0))

const distOpts = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1c1c1f', borderColor: '#27272a', borderWidth: 1,
      titleColor: '#fafafa', bodyColor: '#a1a1aa',
      callbacks: {
        label: ctx => {
          const pct = total.value > 0 ? ((ctx.raw / total.value) * 100).toFixed(1) : 0
          return ` ${ctx.raw.toLocaleString('fr-FR')} articles (${pct}%)`
        }
      }
    }
  },
  scales: {
    x: { ticks: { color: '#71717a', font: { size: 10 }, maxRotation: 40 }, grid: { color: '#1c1c1f' } },
    y: { ticks: { color: '#71717a', font: { size: 10 } }, grid: { color: '#1c1c1f' } }
  }
}))

const statsSummary = computed(() => {
  if (!distStats.value) return []
  const fmt = v => {
    if (distField.value === 'priceNet' || distField.value === 'priceRetail') return `${v} €`
    if (distField.value === 'discount') return `${v}%`
    if (distField.value === 'weight') return `${v} kg`
    return String(v)
  }
  return [
    { l: 'Moyenne', v: fmt(distStats.value.avg) },
    { l: 'Médiane', v: fmt(distStats.value.median) },
    { l: 'Min', v: fmt(distStats.value.min) },
    { l: 'Max', v: fmt(distStats.value.max) },
    { l: 'Échantillon', v: (distStats.value.count || 0).toLocaleString('fr-FR') }
  ]
})

// ─── MATRIX ───
const matrixBrands = ref(20)
const matrixCats = ref(10)
const matrixData = ref({ brands: [], categories: [], matrix: {}, maxVal: 0 })
const loadingMatrix = ref(true)

async function loadMatrix() {
  loadingMatrix.value = true
  try {
    const res = await fetch(`/api/stats/matrix?brands=${matrixBrands.value}&cats=${matrixCats.value}`)
    matrixData.value = await res.json()
  } finally {
    loadingMatrix.value = false
  }
}

function matrixCellSt(val, maxVal) {
  if (!val) return { padding: '5px 8px', border: '1px solid #1c1c1f', textAlign: 'right', color: '#27272a', minWidth: '70px' }
  const intensity = maxVal > 0 ? val / maxVal : 0
  const alpha = Math.round(15 + intensity * 230)
  const alphaHex = alpha.toString(16).padStart(2, '0')
  const isLight = intensity > 0.6
  return {
    padding: '5px 8px', border: '1px solid #1c1c1f',
    textAlign: 'right', minWidth: '70px', fontWeight: '500',
    background: `#10b981${alphaHex}`,
    color: isLight ? '#022c22' : '#6ee7b7'
  }
}

// ─── LIFECYCLE ───
async function loadTopBrands() {
  const res = await fetch('/api/stats/brands-top?limit=200')
  const data = await res.json()
  topBrandNames.value = data.map(b => b.name)
}

// ─── OPPORTUNITÉS ───
const oppSort = ref('pct')
const oppBrand = ref('')
const oppInStock = ref(false)
const oppMinPrice = ref(null)
const oppsData = ref({ total: null, items: [], topPct: null, topValue: null })
const loadingOpps = ref(false)

async function loadOpps() {
  loadingOpps.value = true
  try {
    const params = new URLSearchParams({ sortBy: oppSort.value, limit: '200' })
    if (oppBrand.value) params.set('brand', oppBrand.value)
    if (oppInStock.value) params.set('inStock', '1')
    if (oppMinPrice.value) params.set('minPrice', oppMinPrice.value)
    const res = await fetch(`/api/stats/top-margins?${params}`)
    oppsData.value = await res.json()
  } finally {
    loadingOpps.value = false
  }
}

const oppsScatterData = computed(() => {
  const items = oppsData.value.items || []
  if (!items.length) return { datasets: [] }
  const maxVal = Math.max(...items.map(a => a.marginValue))
  const brandColors = {}
  let colorIdx = 0
  return {
    datasets: [{
      label: 'Articles',
      data: items.map(a => {
        if (!brandColors[a.manufacturer]) brandColors[a.manufacturer] = PALETTE[colorIdx++ % PALETTE.length]
        return {
          x: a.marginPct,
          y: a.marginValue,
          r: Math.max(4, Math.min(18, Math.sqrt(a.marginValue / maxVal) * 18)),
          _a: a
        }
      }),
      backgroundColor: items.map(a => (brandColors[a.manufacturer] || '#10b981') + 'aa'),
      borderColor: items.map(a => brandColors[a.manufacturer] || '#10b981'),
      borderWidth: 1
    }]
  }
})

const oppsScatterOpts = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  onClick: (event, elements, chart) => {
    if (!elements.length) return
    const a = chart.data.datasets[0].data[elements[0].index]._a
    if (a?.motonet) drillSearch(a.motonet)
  },
  onHover: (event, elements) => {
    if (event.native?.target) event.native.target.style.cursor = elements.length ? 'pointer' : 'default'
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1c1c1f', borderColor: '#27272a', borderWidth: 1,
      titleColor: '#fafafa', bodyColor: '#a1a1aa',
      callbacks: {
        title: ctx => `${ctx[0]?.raw?._a?.motonet} — ${ctx[0]?.raw?._a?.manufacturer}`,
        label: ctx => {
          const a = ctx.raw._a
          return [
            ` ${a.name?.slice(0, 40)}`,
            ` Net: ${a.priceNet?.toFixed(2)}€ → Retail: ${a.priceRetail?.toFixed(2)}€`,
            ` Marge: ${a.marginPct}% / +${a.marginValue?.toFixed(2)}€`,
            ` Stock CZ: ${a.stockChorzow ?? 0}`,
            ` → Cliquer pour voir l'article`
          ]
        }
      }
    }
  },
  scales: {
    x: {
      title: { display: true, text: 'Marge (%)', color: '#71717a', font: { size: 11 } },
      ticks: { color: '#71717a', font: { size: 10 } }, grid: { color: '#1c1c1f' }
    },
    y: {
      title: { display: true, text: 'Marge (€)', color: '#71717a', font: { size: 11 } },
      ticks: { color: '#71717a', font: { size: 10 }, callback: v => v + '€' },
      grid: { color: '#1c1c1f' }
    }
  }
}))

function stockBadgeSt(val) {
  const has = (val ?? 0) > 0
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '1px 7px', borderRadius: '9px', fontSize: '10px', fontWeight: '600',
    background: has ? 'rgba(16,185,129,0.15)' : 'rgba(63,63,70,0.2)',
    color: has ? '#10b981' : '#52525b'
  }
}

onMounted(() => {
  loadScatter()
  loadDist()
  loadMatrix()
  loadTopBrands()
})

watch(activeTab, tab => {
  if (tab === 'scatter' && !scatterData.value.length) loadScatter()
  if (tab === 'distribution' && !distData.value.length) loadDist()
  if (tab === 'matrix' && !matrixData.value.brands.length) loadMatrix()
  if (tab === 'opps' && oppsData.value.total == null) loadOpps()
})

// ─── STYLES ───
function tabBtnStyle(active) {
  return {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '7px 14px', fontSize: '13px', fontWeight: '500',
    background: active ? '#10b981' : 'transparent',
    color: active ? '#022c22' : '#71717a',
    border: 'none', borderRadius: '7px', cursor: 'pointer',
    transition: 'all 0.15s', whiteSpace: 'nowrap'
  }
}

function sortBtnSt(active) {
  return {
    padding: '5px 12px', fontSize: '12px', fontWeight: '600',
    background: active ? '#10b981' : 'transparent',
    color: active ? '#022c22' : '#71717a',
    border: 'none', borderRadius: '6px', cursor: 'pointer'
  }
}

function kpiOppSt(color) {
  return {
    background: '#111113', border: `1px solid ${color}33`,
    borderRadius: '10px', padding: '16px'
  }
}

const chkLabelSt = { display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }

const selectSt = {
  background: '#1c1c1f', border: '1px solid #27272a', color: '#a1a1aa',
  borderRadius: '6px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer'
}

const cardSt = {
  background: '#111113', border: '1px solid #27272a',
  borderRadius: '12px', padding: '20px'
}

const thSt = {
  background: '#1c1c1f', color: '#71717a', padding: '7px 8px',
  border: '1px solid #27272a', textAlign: 'left', whiteSpace: 'nowrap',
  fontWeight: '500', fontSize: '10px', position: 'sticky', top: 0, zIndex: 1
}

const tdBrandSt = {
  background: '#111113', color: '#a1a1aa', padding: '5px 10px',
  border: '1px solid #1c1c1f', whiteSpace: 'nowrap',
  fontWeight: '600', fontSize: '11px', position: 'sticky', left: 0, zIndex: 0
}
</script>

<style scoped>
.analyse-wrapper {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.analyse-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 24px;
  background: #1c1c1f;
  border-radius: 10px;
  padding: 4px;
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}
.analyse-tabs::-webkit-scrollbar { display: none; }

.chart-h-lg { height: 500px; position: relative; }
.chart-h-md { height: 380px; position: relative; }

@media (max-width: 767px) {
  .analyse-wrapper { padding: 12px; }
  .chart-h-lg { height: 300px; }
  .chart-h-md { height: 260px; }
  .analyse-tabs { width: 100%; }
}
</style>
