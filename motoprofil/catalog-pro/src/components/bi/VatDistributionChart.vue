<template>
  <div :style="cardStyle">
    <div style="margin-bottom:12px">
      <div style="font-size:14px;font-weight:600;color:#fafafa">Répartition TVA</div>
      <div style="font-size:12px;color:#71717a;margin-top:2px">Taux de TVA appliqués</div>
    </div>
    <template v-if="loading">
      <Skeleton width="100%" height="200px" border-radius="8px" />
    </template>
    <template v-else>
      <div style="display:flex;align-items:center;gap:16px">
        <div style="flex-shrink:0;width:160px;height:160px">
          <Chart type="pie" :data="chartData" :options="chartOptions" style="width:160px;height:160px" />
        </div>
        <div style="flex:1">
          <div
            v-for="(item, i) in props.data"
            :key="item.vatRate"
            style="display:flex;align-items:center;gap:8px;padding:4px 0"
          >
            <span :style="{ width:'10px', height:'10px', borderRadius:'2px', background: PALETTE[i % PALETTE.length], flexShrink:'0' }" />
            <span style="font-size:12px;color:#a1a1aa;flex:1">TVA {{ item.vatRate }}%</span>
            <span style="font-size:11px;color:#71717a">{{ (item.pct || 0).toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import Chart from 'primevue/chart'
import Skeleton from 'primevue/skeleton'

const props = defineProps({
  data: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const PALETTE = ['#10b981','#60a5fa','#a78bfa','#fb923c','#facc15','#f472b6','#2dd4bf','#f87171']

const chartData = {
  get labels() { return props.data.map(d => `TVA ${d.vatRate}%`) },
  get datasets() {
    return [{
      data: props.data.map(d => d.count),
      backgroundColor: props.data.map((_, i) => PALETTE[i % PALETTE.length] + 'cc'),
      borderColor: props.data.map((_, i) => PALETTE[i % PALETTE.length]),
      borderWidth: 2,
      hoverOffset: 6
    }]
  }
}

const chartOptions = {
  responsive: false,
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
          const item = props.data[ctx.dataIndex]
          return ` ${ctx.raw.toLocaleString('fr-FR')} articles (${(item?.pct || 0).toFixed(1)}%)`
        }
      }
    }
  }
}

const cardStyle = {
  background: '#111113',
  border: '1px solid #27272a',
  borderRadius: '12px',
  padding: '20px'
}
</script>
