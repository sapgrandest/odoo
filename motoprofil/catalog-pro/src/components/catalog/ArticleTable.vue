<template>
  <div style="display:flex;flex-direction:column;height:100%;min-height:0">
    <!-- Barre d'outils -->
    <div
      style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid #27272a;background:#111113;flex-shrink:0;flex-wrap:wrap"
    >
      <button
        @click="exportCsv"
        style="background:transparent;border:1px solid #27272a;color:#a1a1aa;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px"
      >
        <span class="pi pi-download" style="font-size:12px" />
        Export CSV
      </button>

      <span style="color:#52525b;font-size:12px">
        {{ articles.length.toLocaleString('fr-FR') }} article{{ articles.length !== 1 ? 's' : '' }}
      </span>

      <div style="margin-left:auto;display:flex;align-items:center;gap:5px;flex-wrap:wrap">
        <span style="font-size:11px;color:#52525b">Colonnes :</span>
        <span
          v-for="col in allColumns"
          :key="col.field"
          @click="toggleColumn(col.field)"
          :style="{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '12px',
            cursor: 'pointer',
            border: '1px solid #27272a',
            background: visibleCols.includes(col.field) ? 'rgba(16,185,129,0.15)' : 'transparent',
            color: visibleCols.includes(col.field) ? '#10b981' : '#52525b',
            transition: 'all 0.1s'
          }"
        >{{ col.header }}</span>
      </div>
    </div>

    <DataTable
      ref="dtRef"
      :value="articles"
      :loading="loading"
      scrollable
      scrollHeight="flex"
      size="small"
      stripedRows
      rowHover
      @row-click="(e) => $emit('row-click', e.data)"
      style="flex:1;font-size:12px"
      :pt="{
        root: { style: 'height:100%;display:flex;flex-direction:column;background:#09090b' },
        wrapper: { style: 'flex:1;overflow:auto' },
        header: { style: 'background:#111113;border-bottom:1px solid #27272a' },
        thead: { style: 'background:#111113;position:sticky;top:0;z-index:1' },
        bodyRow: { style: 'cursor:pointer' }
      }"
    >
      <template #empty>
        <div style="padding:40px;text-align:center;color:#52525b">
          <span class="pi pi-inbox" style="font-size:36px;display:block;margin-bottom:10px" />
          Aucun article
        </div>
      </template>

      <Column v-if="isVisible('photo')" header="Photo" style="width:64px;padding:4px 8px !important">
        <template #body="{ data }">
          <img
            v-if="data.photoGuid"
            :src="`https://cdn.profiauto.com/Image/${data.photoGuid}`"
            style="width:48px;height:36px;object-fit:contain;border-radius:3px;background:#09090b;display:block"
            loading="lazy"
          />
          <div v-else style="width:48px;height:36px;display:flex;align-items:center;justify-content:center">
            <span class="pi pi-image" style="font-size:16px;color:#3f3f46" />
          </div>
        </template>
      </Column>

      <Column v-if="isVisible('motonet')" field="motonet" sortable style="min-width:110px">
        <template #header><span style="display:flex;align-items:center;gap:2px">Motonet<FieldInfo field="motonet" /></span></template>
        <template #body="{ data }">
          <span style="font-family:monospace;color:#10b981;font-weight:600;font-size:12px">{{ data.motonet }}</span>
        </template>
      </Column>

      <Column v-if="isVisible('manufacturer')" field="manufacturer" sortable style="min-width:90px">
        <template #header><span style="display:flex;align-items:center;gap:2px">Marque<FieldInfo field="manufacturer" /></span></template>
        <template #body="{ data }">
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#a1a1aa">{{ data.manufacturer }}</span>
        </template>
      </Column>

      <Column v-if="isVisible('name')" field="name" sortable style="min-width:200px;max-width:320px">
        <template #header><span style="display:flex;align-items:center;gap:2px">Nom<FieldInfo field="name" /></span></template>
        <template #body="{ data }">
          <span class="line-clamp-1" style="font-size:12px;color:#fafafa">{{ data.name }}</span>
        </template>
      </Column>

      <Column v-if="isVisible('original')" field="original" style="min-width:110px">
        <template #header><span style="display:flex;align-items:center;gap:2px">OEM<FieldInfo field="original" /></span></template>
        <template #body="{ data }">
          <span style="font-family:monospace;font-size:11px;color:#71717a">{{ data.original || '—' }}</span>
        </template>
      </Column>

      <Column v-if="isVisible('barcode')" field="barcode" style="min-width:120px">
        <template #header><span style="display:flex;align-items:center;gap:2px">EAN<FieldInfo field="barcode" /></span></template>
        <template #body="{ data }">
          <span style="font-family:monospace;font-size:11px;color:#71717a">{{ data.barcode || '—' }}</span>
        </template>
      </Column>

      <Column v-if="isVisible('priceNet')" field="priceNet" sortable style="min-width:90px">
        <template #header><span style="width:100%;text-align:right;display:flex;align-items:center;justify-content:flex-end;gap:2px">Prix net<FieldInfo field="priceNet" /></span></template>
        <template #body="{ data }">
          <span style="font-family:monospace;font-size:12px;color:#fafafa;display:block;text-align:right">{{ formatPrice(data.priceNet) }}</span>
        </template>
      </Column>

      <Column v-if="isVisible('priceRetail')" field="priceRetail" sortable style="min-width:95px">
        <template #header><span style="width:100%;text-align:right;display:flex;align-items:center;justify-content:flex-end;gap:2px">Prix retail<FieldInfo field="priceRetail" /></span></template>
        <template #body="{ data }">
          <span style="font-family:monospace;font-size:12px;color:#a1a1aa;display:block;text-align:right">{{ formatPrice(data.priceRetail) }}</span>
        </template>
      </Column>

      <Column v-if="isVisible('discount')" field="discount" sortable style="min-width:65px">
        <template #header><span style="width:100%;text-align:right;display:flex;align-items:center;justify-content:flex-end;gap:2px">Rem.<FieldInfo field="discount" /></span></template>
        <template #body="{ data }">
          <span v-if="data.discount > 0" style="color:#10b981;font-size:12px;display:block;text-align:right">{{ data.discount }}%</span>
          <span v-else style="color:#3f3f46;display:block;text-align:right">—</span>
        </template>
      </Column>

      <Column v-if="isVisible('stockChorzow')" field="stockChorzow" sortable style="min-width:72px">
        <template #header><span style="display:flex;align-items:center;gap:2px">Stk CZ<FieldInfo field="stockChorzow" /></span></template>
        <template #body="{ data }">
          <span :style="stockStyle(data.stockChorzow)">{{ data.stockChorzow ?? 0 }}</span>
        </template>
      </Column>

      <Column v-if="isVisible('stockHub')" field="stockHub" sortable style="min-width:72px">
        <template #header><span style="display:flex;align-items:center;gap:2px">Stk HUB<FieldInfo field="stockHub" /></span></template>
        <template #body="{ data }">
          <span :style="stockStyle(data.stockHub)">{{ data.stockHub ?? 0 }}</span>
        </template>
      </Column>

      <Column v-if="isVisible('temotCat')" field="temotCat" style="min-width:130px">
        <template #header><span style="display:flex;align-items:center;gap:2px">Catégorie<FieldInfo field="temotCat" /></span></template>
        <template #body="{ data }">
          <span style="font-size:11px;color:#71717a">{{ data.temotCat || '—' }}</span>
        </template>
      </Column>

      <Column v-if="isVisible('weight')" field="weight" sortable style="min-width:70px">
        <template #header><span style="display:flex;align-items:center;gap:2px">Poids<FieldInfo field="weight" /></span></template>
        <template #body="{ data }">
          <span style="font-size:11px;color:#71717a">{{ data.weight ? `${data.weight} kg` : '—' }}</span>
        </template>
      </Column>

      <Column v-if="isVisible('unit')" field="unit" style="min-width:60px">
        <template #header><span style="display:flex;align-items:center;gap:2px">Unité<FieldInfo field="unit" /></span></template>
        <template #body="{ data }">
          <span style="font-size:11px;color:#71717a">{{ data.unit || '—' }}</span>
        </template>
      </Column>

      <Column v-if="isVisible('vatRate')" field="vatRate" sortable style="min-width:60px">
        <template #header><span style="display:flex;align-items:center;gap:2px">TVA<FieldInfo field="vatRate" /></span></template>
        <template #body="{ data }">
          <span style="font-size:11px;color:#71717a">{{ data.vatRate != null ? `${data.vatRate}%` : '—' }}</span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const props = defineProps({
  articles: { type: Array,   default: () => [] },
  loading:  { type: Boolean, default: false }
})

defineEmits(['row-click', 'page-change'])

const dtRef = ref(null)

const allColumns = [
  { field: 'photo',        header: 'Photo' },
  { field: 'motonet',      header: 'Motonet' },
  { field: 'manufacturer', header: 'Marque' },
  { field: 'name',         header: 'Nom' },
  { field: 'original',     header: 'OEM' },
  { field: 'barcode',      header: 'EAN' },
  { field: 'priceNet',     header: 'Prix net' },
  { field: 'priceRetail',  header: 'Prix retail' },
  { field: 'discount',     header: 'Rem.' },
  { field: 'stockChorzow', header: 'Stk CZ' },
  { field: 'stockHub',     header: 'Stk HUB' },
  { field: 'temotCat',     header: 'Catégorie' },
  { field: 'weight',       header: 'Poids' },
  { field: 'unit',         header: 'Unité' },
  { field: 'vatRate',      header: 'TVA' }
]

const visibleCols = ref([
  'photo', 'motonet', 'manufacturer', 'name', 'original',
  'priceNet', 'priceRetail', 'discount', 'stockChorzow', 'stockHub', 'temotCat'
])

function isVisible(field) {
  return visibleCols.value.includes(field)
}

function toggleColumn(field) {
  const idx = visibleCols.value.indexOf(field)
  if (idx === -1) {
    visibleCols.value.push(field)
  } else if (visibleCols.value.length > 1) {
    visibleCols.value.splice(idx, 1)
  }
}

function stockStyle(val) {
  const hasStock = (val ?? 0) > 0
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    background: hasStock ? 'rgba(16,185,129,0.15)' : 'rgba(63,63,70,0.25)',
    color: hasStock ? '#10b981' : '#52525b'
  }
}

function formatPrice(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function exportCsv() {
  if (!props.articles.length) return
  const cols = ['motonet', 'manufacturer', 'name', 'original', 'barcode',
                'priceNet', 'priceRetail', 'discount', 'stockChorzow', 'stockHub',
                'temotCat', 'vatRate', 'weight', 'unit']
  const header = cols.join(';')
  const rows = props.articles.map(a =>
    cols.map(c => `"${String(a[c] ?? '').replace(/"/g, '""')}"`).join(';')
  )
  const csv = '﻿' + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `articles_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
