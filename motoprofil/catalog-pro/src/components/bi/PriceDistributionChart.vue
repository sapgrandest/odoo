<template>
  <div :style="cardStyle">
    <div style="margin-bottom:16px">
      <div style="font-size:14px;font-weight:600;color:#fafafa">Distribution des prix</div>
      <div style="font-size:12px;color:#71717a;margin-top:2px">Répartition des articles par tranche de prix</div>
    </div>
    <template v-if="loading">
      <Skeleton height="300px" border-radius="8px" />
    </template>
    <template v-else>
      <div style="height:320px;position:relative">
        <Chart type="bar" :data="chartData" :options="chartOptions" style="height:100%" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Chart from 'primevue/chart'
import Skeleton from 'primevue/skeleton'

const props = defineProps({
  data: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const total = computed(() => props.data.reduce((s, d) => s + d.count, 0))

const GRADIENT = [
  '#60a5fa','#60a5fa','#818cf8','#818cf8','#a78bfa',
  '#a78bfa','#34d399','#10b981','#10b981','#10b981',
  '#10b981','#34d399','#6ee7b7','#bef264','#fde047',
  '#fb923c','#f87171','#f43f5e','#e11d48','#be123c'
]

const chartData = computed(() => ({
  labels: props.data.map(d => d.label || d.range),
  datasets: [{
    label: 'Articles',
    data: props.data.map(d => d.count),
    backgroundColor: props.data.map((_, i) => GRADIENT[i % GRADIENT.length] + 'cc'),
    borderColor: props.data.map((_, i) => GRADIENT[i % GRADIENT.length]),
    borderWidth: 1,
    borderRadius: 4,
    borderSkipped: false
  }]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
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
          const pct = total.value > 0 ? ((ctx.raw / total.value) * 100).toFixed(1) : 0
          return ` ${ctx.raw.toLocaleString('fr-FR')} articles (${pct}%)`
        }
      }
    }
  },
  scales: {
    x: {
      ticks: { color: '#71717a', font: { size: 10 }, maxRotation: 45 },
      grid: { color: '#1c1c1f' }
    },
    y: {
      ticks: { color: '#71717a', font: { size: 11 } },
      grid: { color: '#1c1c1f' }
    }
  }
}))

const cardStyle = {
  background: '#111113',
  border: '1px solid #27272a',
  borderRadius: '12px',
  padding: '20px'
}
</script>
