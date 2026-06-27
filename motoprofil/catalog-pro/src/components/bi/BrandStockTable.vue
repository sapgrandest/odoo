<template>
  <div :style="cardStyle">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div>
        <div style="font-size:14px;font-weight:600;color:#fafafa">Détail par marque</div>
        <div style="font-size:12px;color:#71717a;margin-top:2px">{{ props.data.length.toLocaleString('fr-FR') }} marques</div>
      </div>
      <button @click="exportCsv" :style="btnStyle">
        <span class="pi pi-download" style="font-size:12px" />
        Exporter CSV
      </button>
    </div>
    <template v-if="loading">
      <Skeleton height="400px" border-radius="8px" />
    </template>
    <template v-else>
      <DataTable
        :value="props.data"
        :rows="20"
        paginator
        :paginator-template="'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink'"
        striped-rows
        sortable
        size="small"
        :pt="{ ...dtPt, bodyRow: { style: 'background:transparent;border-color:#27272a;cursor:pointer' } }"
        scrollable
        scroll-height="460px"
        @row-click="(e) => emit('brand-click', e.data.name)"
      >
        <Column header="#" style="width:44px;text-align:center">
          <template #body="{ index }">
            <span style="font-size:11px;color:#52525b">{{ index + 1 }}</span>
          </template>
        </Column>
        <Column field="name" header="Marque" sortable style="min-width:120px">
          <template #body="{ data: row }">
            <span style="font-size:12px;font-weight:500;color:#fafafa">{{ row.name }}</span>
          </template>
        </Column>
        <Column field="count" header="Total" sortable style="text-align:right;min-width:80px">
          <template #body="{ data: row }">
            <span style="font-size:12px;color:#a1a1aa">{{ (row.count || 0).toLocaleString('fr-FR') }}</span>
          </template>
        </Column>
        <Column field="inStock" header="Stock CZ" sortable style="text-align:center;min-width:90px">
          <template #body="{ data: row }">
            <span :style="badgeStyle('#10b981')">{{ (row.inStock || 0).toLocaleString('fr-FR') }}</span>
          </template>
        </Column>
        <Column field="inStockHub" header="Stock HUB" sortable style="text-align:center;min-width:90px">
          <template #body="{ data: row }">
            <span :style="badgeStyle('#60a5fa')">{{ (row.inStockHub || 0).toLocaleString('fr-FR') }}</span>
          </template>
        </Column>
        <Column field="inStock" header="% Stock" sortable style="min-width:120px">
          <template #body="{ data: row }">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;height:6px;background:#27272a;border-radius:3px;overflow:hidden">
                <div :style="progressStyle(row)" />
              </div>
              <span style="font-size:11px;color:#71717a;min-width:32px;text-align:right">
                {{ pctStock(row).toFixed(0) }}%
              </span>
            </div>
          </template>
        </Column>
        <Column field="avgPriceRetail" header="Prix retail" sortable style="text-align:right;min-width:90px">
          <template #body="{ data: row }">
            <span style="font-size:12px;color:#a1a1aa">{{ row.avgPriceRetail ? row.avgPriceRetail.toFixed(2) + ' €' : '—' }}</span>
          </template>
        </Column>
        <Column field="avgPriceNet" header="Prix achat" sortable style="text-align:right;min-width:90px">
          <template #body="{ data: row }">
            <span style="font-size:12px;color:#a1a1aa">{{ row.avgPriceNet ? row.avgPriceNet.toFixed(2) + ' €' : '—' }}</span>
          </template>
        </Column>
        <Column header="Marge" style="text-align:right;min-width:72px">
          <template #body="{ data: row }">
            <span :style="margeStyle(row)">{{ margeText(row) }}</span>
          </template>
        </Column>
      </DataTable>
    </template>
  </div>
</template>

<script setup>
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Skeleton from 'primevue/skeleton'

const props = defineProps({
  data: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['brand-click'])

const cardStyle = {
  background: '#111113',
  border: '1px solid #27272a',
  borderRadius: '12px',
  padding: '20px'
}

const btnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  fontSize: '12px',
  background: 'transparent',
  border: '1px solid #27272a',
  borderRadius: '6px',
  color: '#71717a',
  cursor: 'pointer'
}

const dtPt = {
  root: { style: 'background:transparent;border:none' },
  thead: { style: 'background:#1c1c1f;position:sticky;top:0;z-index:1' },
  tbody: { style: 'background:transparent' },
  headerRow: { style: 'background:#1c1c1f' },
  headerCell: { style: 'background:#1c1c1f;color:#71717a;font-size:11px;padding:8px 10px;border-color:#27272a' },
  bodyRow: { style: 'background:transparent;border-color:#27272a' },
  bodyCell: { style: 'padding:6px 10px;border-color:#27272a' },
  paginator: { style: 'background:transparent;border-top:1px solid #27272a;padding:8px 0;color:#71717a' }
}

function badgeStyle(color) {
  return {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    background: color + '22',
    color: color,
    fontWeight: '500'
  }
}

function pctStock(row) {
  if (!row.count) return 0
  return ((row.inStock || 0) / row.count) * 100
}

function progressStyle(row) {
  const pct = pctStock(row)
  const color = pct >= 50 ? '#10b981' : pct >= 25 ? '#f59e0b' : '#ef4444'
  return { width: pct + '%', height: '100%', background: color, borderRadius: '3px' }
}

function margeText(row) {
  if (!row.avgPriceNet || !row.avgPriceRetail || row.avgPriceNet <= 0) return '—'
  const m = ((row.avgPriceRetail - row.avgPriceNet) / row.avgPriceNet) * 100
  return m > 0 ? `+${m.toFixed(0)}%` : `${m.toFixed(0)}%`
}

function margeStyle(row) {
  if (!row.avgPriceNet || !row.avgPriceRetail || row.avgPriceNet <= 0) return { fontSize: '12px', color: '#52525b' }
  const m = ((row.avgPriceRetail - row.avgPriceNet) / row.avgPriceNet) * 100
  return { fontSize: '12px', fontWeight: '600', color: m > 0 ? '#10b981' : '#ef4444' }
}

function exportCsv() {
  const headers = ['Marque','Total','En stock CZ','En stock HUB','% Stock','Prix retail','Prix achat','Marge']
  const rows = props.data.map(r => [
    r.name,
    r.count || 0,
    r.inStock || 0,
    r.inStockHub || 0,
    pctStock(r).toFixed(1),
    r.avgPriceRetail?.toFixed(2) || '',
    r.avgPriceNet?.toFixed(2) || '',
    margeText(r)
  ])
  const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'marques-stock.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>
