<template>
  <div :style="cardStyle">
    <div style="margin-bottom:16px">
      <div style="font-size:14px;font-weight:600;color:#fafafa">Catégories Temot</div>
      <div style="font-size:12px;color:#71717a;margin-top:2px">Distribution par catégorie</div>
    </div>
    <template v-if="loading">
      <Skeleton height="300px" border-radius="8px" style="margin-bottom:12px" />
      <Skeleton height="150px" border-radius="8px" />
    </template>
    <template v-else>
      <div style="display:flex;align-items:center;gap:24px;margin-bottom:24px">
        <div style="position:relative;flex-shrink:0;width:220px;height:220px">
          <Chart type="doughnut" :data="chartData" :options="chartOptions" style="width:220px;height:220px" />
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none">
            <div style="font-size:22px;font-weight:700;color:#fafafa">{{ total.toLocaleString('fr-FR') }}</div>
            <div style="font-size:10px;color:#71717a">articles</div>
          </div>
        </div>
        <div style="flex:1;overflow:auto;max-height:220px">
          <div
            v-for="(item, i) in top15"
            :key="item.category"
            @click="emit('cat-click', item.category)"
            style="display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer;border-radius:4px"
            :style="{ padding:'4px 6px', borderRadius:'4px', cursor:'pointer' }"
          >
            <span :style="{ width:'10px', height:'10px', borderRadius:'2px', background: PALETTE[i % PALETTE.length], flexShrink: '0' }" />
            <span style="font-size:11px;color:#a1a1aa;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ item.category }}</span>
            <span style="font-size:11px;color:#71717a;flex-shrink:0">{{ item.count.toLocaleString('fr-FR') }}</span>
          </div>
        </div>
      </div>

      <div style="border-top:1px solid #27272a;padding-top:16px">
        <div style="font-size:12px;font-weight:600;color:#71717a;margin-bottom:8px">Toutes les catégories</div>
        <DataTable
          :value="props.data"
          :rows="10"
          paginator
          size="small"
          :pt="{ ...dtPt, bodyRow: { style: 'background:transparent;border-color:#27272a;cursor:pointer' } }"
          scroll-height="240px"
          scrollable
          @row-click="(e) => emit('cat-click', e.data.category)"
        >
          <Column field="category" header="Catégorie" style="font-size:12px" />
          <Column field="count" header="Articles" style="font-size:12px;text-align:right">
            <template #body="{ data: row }">{{ row.count.toLocaleString('fr-FR') }}</template>
          </Column>
          <Column field="avgPrice" header="Prix moy." style="font-size:12px;text-align:right">
            <template #body="{ data: row }">{{ row.avgPrice ? row.avgPrice.toFixed(2) + ' €' : '—' }}</template>
          </Column>
          <Column field="inStock" header="En stock" style="font-size:12px;text-align:right">
            <template #body="{ data: row }">
              <span style="color:#10b981">{{ (row.inStock || 0).toLocaleString('fr-FR') }}</span>
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Chart from 'primevue/chart'
import Skeleton from 'primevue/skeleton'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const props = defineProps({
  data: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['cat-click'])

const PALETTE = ['#10b981','#60a5fa','#a78bfa','#fb923c','#facc15','#f472b6','#2dd4bf','#f87171','#34d399','#818cf8','#fbbf24','#38bdf8','#c084fc','#4ade80','#fb7185']

const top15 = computed(() => props.data.slice(0, 15))
const total = computed(() => props.data.reduce((s, d) => s + d.count, 0))

const chartData = computed(() => ({
  labels: top15.value.map(d => d.category),
  datasets: [{
    data: top15.value.map(d => d.count),
    backgroundColor: top15.value.map((_, i) => PALETTE[i % PALETTE.length] + 'cc'),
    borderColor: top15.value.map((_, i) => PALETTE[i % PALETTE.length]),
    borderWidth: 2,
    hoverOffset: 8
  }]
}))

const chartOptions = computed(() => ({
  responsive: false,
  maintainAspectRatio: false,
  cutout: '65%',
  onClick: (event, elements, chart) => {
    if (!elements.length) return
    const label = chart.data.labels[elements[0].index]
    emit('cat-click', label)
  },
  onHover: (event, elements) => {
    if (event.native?.target) event.native.target.style.cursor = elements.length ? 'pointer' : 'default'
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1c1c1f',
      borderColor: '#27272a',
      borderWidth: 1,
      titleColor: '#fafafa',
      bodyColor: '#a1a1aa',
      callbacks: {
        label: ctx => {
          const item = top15.value[ctx.dataIndex]
          const avg = item?.avgPrice ? ` · moy. ${item.avgPrice.toFixed(2)}€` : ''
          return ` ${ctx.raw.toLocaleString('fr-FR')} articles${avg} — cliquer pour explorer`
        }
      }
    }
  }
}))

const cardStyle = {
  background: '#111113',
  border: '1px solid #27272a',
  borderRadius: '12px',
  padding: '20px'
}

const dtPt = {
  root: { style: 'background:transparent;border:none' },
  thead: { style: 'background:#1c1c1f' },
  tbody: { style: 'background:transparent' },
  headerRow: { style: 'background:#1c1c1f' },
  headerCell: { style: 'background:#1c1c1f;color:#71717a;font-size:11px;padding:6px 10px;border-color:#27272a' },
  bodyRow: { style: 'background:transparent;border-color:#27272a' },
  bodyCell: { style: 'color:#a1a1aa;padding:5px 10px;border-color:#27272a' }
}
</script>
