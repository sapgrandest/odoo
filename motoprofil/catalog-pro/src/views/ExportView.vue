<template>
  <AppLayout>
    <template #title>
      <span style="font-size:14px;font-weight:600;color:#fafafa">Export</span>
    </template>

    <div class="export-wrapper">

      <div class="export-grid">

        <!-- ── PANNEAU FILTRES ── -->
        <div :style="cardSt">
          <div style="font-size:14px;font-weight:600;color:#fafafa;margin-bottom:16px;display:flex;align-items:center;gap:8px">
            <span class="pi pi-filter" style="color:#10b981" />
            Filtres & format
          </div>

          <!-- Format -->
          <div style="margin-bottom:16px">
            <label :style="labelSt">Format de sortie</label>
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
              <label v-for="fmt in formats" :key="fmt.id"
                :style="fmtLabelSt(filters.format === fmt.id)"
                @click="filters.format = fmt.id">
                <div style="display:flex;align-items:center;gap:8px">
                  <span :class="['pi', fmt.icon]" :style="{ color: filters.format === fmt.id ? '#10b981' : '#52525b', fontSize: '14px' }" />
                  <div>
                    <div style="font-size:12px;font-weight:600">{{ fmt.label }}</div>
                    <div style="font-size:10px;color:#71717a;margin-top:1px">{{ fmt.desc }}</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <hr style="border-color:#27272a;margin:12px 0" />

          <!-- Marque -->
          <div style="margin-bottom:12px">
            <label :style="labelSt">Marque</label>
            <select v-model="filters.brand" @change="updatePreview" :style="{ ...selectSt, width: '100%', marginTop: '5px' }">
              <option value="">Toutes les marques</option>
              <option v-for="b in brandList" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>

          <!-- Catégorie -->
          <div style="margin-bottom:12px">
            <label :style="labelSt">Catégorie</label>
            <select v-model="filters.category" @change="updatePreview" :style="{ ...selectSt, width: '100%', marginTop: '5px' }">
              <option value="">Toutes les catégories</option>
              <option v-for="c in categoryList" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <!-- Checkboxes -->
          <div style="margin-bottom:12px;display:flex;flex-direction:column;gap:7px">
            <label v-for="chk in checkboxFilters" :key="chk.key" :style="chkLabelSt">
              <input type="checkbox" v-model="filters[chk.key]" @change="updatePreview"
                style="accent-color:#10b981;width:14px;height:14px;cursor:pointer" />
              <span style="font-size:12px;color:#a1a1aa">{{ chk.label }}</span>
            </label>
          </div>

          <!-- Prix net -->
          <div style="margin-bottom:12px">
            <label :style="labelSt">Prix net (€)</label>
            <div style="display:flex;gap:6px;margin-top:5px">
              <input v-model.number="filters.minPrice" @change="updatePreview" type="number" min="0" placeholder="Min"
                :style="{ ...selectSt, width: '50%' }" />
              <input v-model.number="filters.maxPrice" @change="updatePreview" type="number" min="0" placeholder="Max"
                :style="{ ...selectSt, width: '50%' }" />
            </div>
          </div>

          <!-- Remise min -->
          <div style="margin-bottom:16px">
            <label :style="labelSt">Remise min. (%)</label>
            <input v-model.number="filters.minDiscount" @change="updatePreview" type="number" min="0" max="99"
              :style="{ ...selectSt, width: '100%', marginTop: '5px' }" />
          </div>

          <!-- Bouton export -->
          <button @click="doExport" :disabled="previewData.total === 0 || exporting" :style="exportBtnSt">
            <span :class="['pi', exporting ? 'pi-spin pi-spinner' : 'pi-download']" style="font-size:13px" />
            {{ exporting ? 'Génération…' : `Télécharger (${(previewData.total || 0).toLocaleString('fr-FR')} articles)` }}
          </button>
          <div v-if="previewData.total > 100000" style="font-size:10px;color:#fb923c;margin-top:6px">
            Limité à 100 000 articles par export
          </div>
        </div>

        <!-- ── PRÉVISUALISATION ── -->
        <div>
          <!-- Compteur -->
          <div :style="{ ...cardSt, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }">
            <div>
              <div style="font-size:24px;font-weight:800;color:#10b981">
                {{ (previewData.total || 0).toLocaleString('fr-FR') }}
              </div>
              <div style="font-size:12px;color:#71717a;margin-top:2px">articles correspondent aux filtres</div>
            </div>
            <div v-if="loadingPreview">
              <span class="pi pi-spin pi-spinner" style="color:#71717a" />
            </div>
            <div v-else style="display:flex;align-items:center;gap:8px">
              <span class="pi pi-check-circle" style="color:#10b981" />
              <span style="font-size:12px;color:#52525b">Prêt pour l'export</span>
            </div>
          </div>

          <!-- Table preview -->
          <div :style="cardSt">
            <div style="font-size:13px;font-weight:600;color:#fafafa;margin-bottom:12px">
              Aperçu — 10 premiers articles
            </div>
            <Skeleton v-if="loadingPreview" height="300px" border-radius="8px" />
            <div v-else-if="!previewData.preview?.length" style="padding:40px;text-align:center;color:#52525b">
              <span class="pi pi-inbox" style="font-size:32px;display:block;margin-bottom:10px" />
              Aucun article ne correspond aux filtres sélectionnés
            </div>
            <div v-else style="overflow:auto">
              <table style="border-collapse:collapse;width:100%;font-size:11px">
                <thead>
                  <tr>
                    <th v-for="col in previewCols" :key="col.key" :style="thSt">{{ col.label }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in previewData.preview" :key="row.motonet" :style="trSt">
                    <td :style="tdSt">
                      <span style="font-family:monospace;color:#10b981;font-weight:600">{{ row.motonet }}</span>
                    </td>
                    <td :style="tdSt">
                      <span style="font-weight:600;color:#a1a1aa;font-size:10px;text-transform:uppercase">{{ row.manufacturer }}</span>
                    </td>
                    <td :style="{ ...tdSt, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">
                      <span style="color:#fafafa">{{ row.name }}</span>
                    </td>
                    <td :style="tdSt">
                      <span style="font-family:monospace;color:#fafafa">{{ row.priceNet > 0 ? row.priceNet.toFixed(2) + ' €' : '—' }}</span>
                    </td>
                    <td :style="tdSt">
                      <span style="font-family:monospace;color:#71717a">{{ row.priceRetail > 0 ? row.priceRetail.toFixed(2) + ' €' : '—' }}</span>
                    </td>
                    <td :style="tdSt">
                      <span v-if="row.discount > 0" style="color:#10b981;font-weight:600">{{ row.discount }}%</span>
                      <span v-else style="color:#3f3f46">—</span>
                    </td>
                    <td :style="tdSt">
                      <span :style="stockSt(row.stockChorzow)">{{ row.stockChorzow }}</span>
                    </td>
                    <td :style="tdSt">
                      <span :style="stockSt(row.stockHub)">{{ row.stockHub }}</span>
                    </td>
                    <td :style="{ ...tdSt, color: '#71717a' }">{{ row.temotCat || '—' }}</td>
                    <td :style="tdSt">
                      <span v-if="row.original" style="font-family:monospace;font-size:10px;color:#60a5fa">{{ row.original }}</span>
                      <span v-else style="color:#3f3f46">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Format info -->
            <div v-if="activeFormat" style="margin-top:16px;padding:12px;background:#1c1c1f;border-radius:8px;font-size:11px;color:#71717a">
              <strong style="color:#a1a1aa">{{ activeFormat.label }}</strong> —
              {{ activeFormat.info }}
            </div>
          </div>
        </div>

      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Skeleton from 'primevue/skeleton'
import AppLayout from '../components/layout/AppLayout.vue'

const formats = [
  { id: 'shopify',     icon: 'pi-shopping-cart', label: 'Shopify CSV',       desc: 'Import produits Shopify standard',
    info: 'Colonnes: Handle, Title, Vendor, Type, Variant Price/SKU/Barcode/Weight/Inventory Qty, etc.' },
  { id: 'woocommerce', icon: 'pi-globe',          label: 'WooCommerce CSV',    desc: 'Import produits WooCommerce',
    info: 'Colonnes: SKU, Name, Regular price, Sale price, Stock quantity, Categories, Attributes.' },
  { id: 'google',      icon: 'pi-external-link',  label: 'Google Shopping',    desc: 'Flux produits TSV (tabulations)',
    info: 'Colonnes: id, title, availability, price, brand, gtin, mpn, google_product_category.' },
  { id: 'csv',         icon: 'pi-table',           label: 'CSV générique',      desc: 'Tous les champs, séparateur ;',
    info: 'Colonnes: motonet, manufacturer, name, original, barcode, priceNet, priceRetail, discount, stocks, catégorie.' }
]

const filters = ref({
  format: 'shopify', brand: '', category: '',
  hasStock: false, hasOem: false, hasBarcode: false,
  minPrice: null, maxPrice: null, minDiscount: null
})

const checkboxFilters = [
  { key: 'hasStock',   label: 'En stock uniquement (CZ ou HUB)' },
  { key: 'hasOem',     label: 'Avec référence OEM' },
  { key: 'hasBarcode', label: 'Avec code EAN/barcode' }
]

const previewCols = [
  { key: 'motonet', label: 'Motonet' }, { key: 'manufacturer', label: 'Marque' },
  { key: 'name', label: 'Nom' }, { key: 'priceNet', label: 'Prix net' },
  { key: 'priceRetail', label: 'Prix retail' }, { key: 'discount', label: 'Rem.' },
  { key: 'stockChorzow', label: 'Stk CZ' }, { key: 'stockHub', label: 'Stk HUB' },
  { key: 'temotCat', label: 'Catégorie' }, { key: 'original', label: 'OEM' }
]

const brandList = ref([])
const categoryList = ref([])
const previewData = ref({ total: 0, preview: [] })
const loadingPreview = ref(false)
const exporting = ref(false)

const activeFormat = computed(() => formats.find(f => f.id === filters.value.format))

function buildParams(extra = {}) {
  const f = filters.value
  const p = new URLSearchParams()
  if (f.brand) p.set('brand', f.brand)
  if (f.category) p.set('category', f.category)
  if (f.hasStock) p.set('hasStock', '1')
  if (f.hasOem) p.set('hasOem', '1')
  if (f.hasBarcode) p.set('hasBarcode', '1')
  if (f.minPrice) p.set('minPrice', f.minPrice)
  if (f.maxPrice) p.set('maxPrice', f.maxPrice)
  if (f.minDiscount) p.set('minDiscount', f.minDiscount)
  for (const [k, v] of Object.entries(extra)) p.set(k, v)
  return p
}

let previewTimer = null
function updatePreview() {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(fetchPreview, 400)
}

async function fetchPreview() {
  loadingPreview.value = true
  try {
    const params = buildParams({ preview: '1' })
    const res = await fetch(`/api/catalog/export?${params}`)
    previewData.value = await res.json()
  } finally {
    loadingPreview.value = false
  }
}

async function doExport() {
  if (exporting.value) return
  exporting.value = true
  try {
    const params = buildParams({ format: filters.value.format })
    const res = await fetch(`/api/catalog/export?${params}`)
    if (!res.ok) throw new Error('Export failed')
    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="?([^"]+)"?/)
    const filename = match ? match[1] : `catalogue-export.csv`
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: filename
    })
    a.click(); URL.revokeObjectURL(a.href)
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  const [brands, cats] = await Promise.all([
    fetch('/api/catalog/brands').then(r => r.json()),
    fetch('/api/catalog/categories').then(r => r.json())
  ])
  brandList.value = brands.map(b => b.name).filter(Boolean).sort()
  categoryList.value = cats.map(c => c.name).filter(Boolean).sort()
  await fetchPreview()
})

watch(() => filters.value.format, () => {}) // no-op, format only affects download

function stockSt(v) {
  const has = (v ?? 0) > 0
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '1px 7px', borderRadius: '9px', fontSize: '10px', fontWeight: '600',
    background: has ? 'rgba(16,185,129,0.15)' : 'rgba(63,63,70,0.2)',
    color: has ? '#10b981' : '#52525b'
  }
}

// ─── STYLES ───
const cardSt = { background: '#111113', border: '1px solid #27272a', borderRadius: '12px', padding: '20px' }
const labelSt = { fontSize: '11px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }
const selectSt = {
  background: '#1c1c1f', border: '1px solid #27272a', color: '#a1a1aa',
  borderRadius: '6px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer'
}
const exportBtnSt = computed(() => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
  width: '100%', padding: '10px', fontSize: '13px', fontWeight: '600',
  background: previewData.value.total > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(63,63,70,0.1)',
  border: `1px solid ${previewData.value.total > 0 ? 'rgba(16,185,129,0.4)' : '#27272a'}`,
  borderRadius: '8px', color: previewData.value.total > 0 ? '#10b981' : '#52525b',
  cursor: previewData.value.total > 0 ? 'pointer' : 'not-allowed'
}))
function fmtLabelSt(active) {
  return {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
    border: `1px solid ${active ? 'rgba(16,185,129,0.4)' : '#27272a'}`,
    background: active ? 'rgba(16,185,129,0.06)' : 'transparent'
  }
}
const chkLabelSt = { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }
const thSt = {
  background: '#1c1c1f', color: '#52525b', padding: '7px 8px',
  border: '1px solid #27272a', fontWeight: '500', fontSize: '10px',
  textAlign: 'left', whiteSpace: 'nowrap'
}
const trSt = { borderBottom: '1px solid #1c1c1f' }
const tdSt = { padding: '6px 8px', border: '1px solid #1c1c1f', verticalAlign: 'middle' }
</script>

<style scoped>
.export-wrapper {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.export-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 1023px) {
  .export-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .export-wrapper { padding: 12px; }
}
</style>
