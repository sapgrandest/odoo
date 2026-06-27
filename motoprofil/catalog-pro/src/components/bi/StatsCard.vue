<template>
  <div :style="cardStyle">
    <template v-if="loading">
      <div style="display:flex;align-items:center;gap:12px">
        <Skeleton width="40px" height="40px" border-radius="50%" />
        <div style="flex:1">
          <Skeleton width="60%" height="12px" style="margin-bottom:8px" />
          <Skeleton width="40%" height="22px" />
        </div>
      </div>
    </template>
    <template v-else>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;font-weight:500;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">
            {{ title }}
          </div>
          <div style="font-size:24px;font-weight:700;color:#fafafa;line-height:1.2;margin-bottom:4px">
            {{ value }}
          </div>
          <div v-if="subtitle" style="font-size:12px;color:#52525b">{{ subtitle }}</div>
          <div v-if="trend" style="display:flex;align-items:center;gap:4px;margin-top:6px">
            <span
              :class="trend.value >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"
              :style="{ fontSize: '10px', color: trend.value >= 0 ? '#10b981' : '#ef4444' }"
            />
            <span :style="{ fontSize: '11px', fontWeight: '600', color: trend.value >= 0 ? '#10b981' : '#ef4444' }">
              {{ Math.abs(trend.value) }}%
            </span>
            <span style="font-size:11px;color:#52525b">{{ trend.label }}</span>
          </div>
        </div>
        <div :style="iconWrapStyle">
          <span :class="['pi', icon]" style="font-size:18px" :style="{ color: color || '#10b981' }" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Skeleton from 'primevue/skeleton'

const props = defineProps({
  title: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  subtitle: { type: String, default: '' },
  icon: { type: String, required: true },
  color: { type: String, default: '#10b981' },
  loading: { type: Boolean, default: false },
  trend: { type: Object, default: null }
})

const cardStyle = {
  background: '#111113',
  border: '1px solid #27272a',
  borderRadius: '12px',
  padding: '20px'
}

const iconWrapStyle = computed(() => ({
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: `${props.color || '#10b981'}26`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: '0'
}))
</script>
