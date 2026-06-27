<template>
  <div :style="cardStyle">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div>
        <div style="font-size:14px;font-weight:600;color:#fafafa">Stock par marque</div>
        <div style="font-size:12px;color:#71717a;margin-top:2px">Top 20 marques</div>
      </div>
      <div style="display:flex;gap:4px">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :style="tabStyle(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>
    <template v-if="loading">
      <Skeleton height="380px" border-radius="8px" />
    </template>
    <template v-else>
      <div style="height:400px;position:relative">
        <Chart type="bar" :data="chartData" :options="chartOptions" style="height:100%" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import Chart from 'primevue/chart'
import Skeleton from 'primevue/skeleton'

const props = defineProps({
  data: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['brand-click'])

const activeTab = ref('pct')

const tabs = [
  { id: 'pct', label: '% Stock' },
  { id: 'vol', label: 'Volumes' }
]

const cardStyle = {
  background: '#111113',
  border: '1px solid #27272a',
  borderRadius: '12px',
  padding: '20px'
}

function tabStyle(id) {
  const active = activeTab.value === id
  return {
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: '500',
    borderRadius: '6px',
    border: active ? '1px solid #10b981' : '1px solid #27272a',
    background: active ? 'rgba(16,185,129,0.1)' : 'transparent',
    color: active ? '#10b981' : '#71717a',
    cursor: 'pointer'
  }
}

function stockColor(pct) {
  if (pct >= 50) return '#10b981'
  if (pct >= 25) return '#f59e0b'
  return '#ef4444'
}

const chartData = computed(() => {
  const top20 = props.data.slice(0, 20)
  if (activeTab.value === 'pct') {
    return {
      labels: top20.map(d => d.brand),
      datasets: [{
        label: '% En stock',
        data: top20.map(d => d.pctStock),
        backgroundColor: top20.map(d => stockColor(d.pctStock) + 'cc'),
        borderColor: top20.map(d => stockColor(d.pctStock)),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false
      }]
    }
  }
  return {
    labels: top20.map(d => d.brand),
    datasets: [
      {
        label: 'En stock',
        data: top20.map(d => d.inStock),
        backgroundColor: '#10b981cc',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 0,
        stack: 'stack'
      },
      {
        label: 'Hors stock',
        data: top20.map(d => (d.total || 0) - (d.inStock || 0)),
        backgroundColor: '#ef4444cc',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 0,
        stack: 'stack'
      }
    ]
  }
})

const chartOptions = computed(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  onClick: (event, elements, chart) => {
    if (!elements.length) return
    const label = chart.data.labels[elements[0].index]
    emit('brand-click', label)
  },
  onHover: (event, elements) => {
    if (event.native?.target) event.native.target.style.cursor = elements.length ? 'pointer' : 'default'
  },
  plugins: {
    legend: {
      display: activeTab.value === 'vol',
      labels: { color: '#a1a1aa', font: { size: 11 } }
    },
    tooltip: {
      backgroundColor: '#1c1c1f',
      borderColor: '#27272a',
      borderWidth: 1,
      titleColor: '#fafafa',
      bodyColor: '#a1a1aa',
      callbacks: {
        label: ctx => {
          if (activeTab.value === 'pct') return ` ${ctx.raw.toFixed(1)}% en stock`
          return ` ${ctx.raw.toLocaleString('fr-FR')} articles`
        }
      }
    }
  },
  scales: {
    x: {
      ticks: {
        color: '#71717a',
        font: { size: 11 },
        callback: v => activeTab.value === 'pct' ? `${v}%` : v.toLocaleString('fr-FR')
      },
      grid: { color: '#1c1c1f' },
      max: activeTab.value === 'pct' ? 100 : undefined,
      stacked: activeTab.value === 'vol'
    },
    y: {
      ticks: { color: '#a1a1aa', font: { size: 10 } },
      grid: { color: 'transparent' },
      stacked: activeTab.value === 'vol'
    }
  }
}))
</script>
