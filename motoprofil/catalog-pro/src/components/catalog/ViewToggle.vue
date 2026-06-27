<template>
  <div style="display:inline-flex;gap:2px;background:#1c1c1f;border:1px solid #27272a;border-radius:8px;padding:3px">
    <button
      v-for="mode in modes"
      :key="mode.value"
      @click="$emit('update:modelValue', mode.value)"
      :title="mode.label"
      :style="{
        background: modelValue === mode.value ? '#10b981' : 'transparent',
        color: modelValue === mode.value ? '#fff' : '#71717a',
        border: 'none',
        borderRadius: '5px',
        padding: '5px 10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        lineHeight: 1
      }"
    >
      <span :class="['pi', mode.icon]" style="font-size:14px" />
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: 'grid' }
})

defineEmits(['update:modelValue'])

const modes = [
  { value: 'grid',  icon: 'pi-th-large', label: 'Grille' },
  { value: 'list',  icon: 'pi-list',     label: 'Liste' },
  { value: 'table', icon: 'pi-table',    label: 'Tableau' }
]
</script>
