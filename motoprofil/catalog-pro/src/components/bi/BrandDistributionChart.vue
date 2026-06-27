<template>
  <div :style="cardStyle">
    <div style="margin-bottom:16px">
      <div style="font-size:14px;font-weight:600;color:#fafafa">{{ title || 'Top marques par volume' }}</div>
      <div style="font-size:12px;color:#71717a;margin-top:2px">Nombre d'articles par marque</div>
    </div>
    <template v-if="loading">
      <Skeleton height="400px" border-radius="8px" />
    </template>
    <template v-else>
      <div style="height:420px;position:relative">
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
  loading: { type: Boolean, default: false },
  title: { type: String, default: '' }
})

const emit = defineEmits(['brand-click'])

const cardStyle = {
  background: '#111113',
  border: '1px solid #27272a',
  borderRadius: '12px',
  padding: '20px'
}

const chartData = computed(() => {
  const top20 = props.data.slice(0, 20)
  return {
    labels: top20.map(d => d.name),
    datasets: [{
      label: 'Articles',
      data: top20.map(d => d.count),
      backgroundColor: top20.map((_, i) => `rgba(16,185,129,${1 - i * 0.04})`),
      borderColor: 'transparent',
      borderRadius: 4,
      borderSkipped: false
    }]
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
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1c1c1f',
      borderColor: '#27272a',
      borderWidth: 1,
      titleColor: '#fafafa',
      bodyColor: '#a1a1aa',
      callbacks: {
        label: ctx => ` ${ctx.raw.toLocaleString('fr-FR')} articles — cliquer pour voir les articles`
      }
    }
  },
  scales: {
    x: {
      ticks: { color: '#71717a', font: { size: 11 } },
      grid: { color: '#1c1c1f' }
    },
    y: {
      ticks: { color: '#a1a1aa', font: { size: 11 } },
      grid: { color: 'transparent' }
    }
  }
}))
</script>
