<template>
  <div style="background:#111113;border:1px solid #27272a;border-radius:10px;overflow:hidden;display:flex;flex-direction:column">

    <!-- Filtres actifs -->
    <div
      v-if="activeFilters.length"
      style="padding:10px 12px;border-bottom:1px solid #27272a;display:flex;flex-wrap:wrap;gap:5px"
    >
      <span
        v-for="f in activeFilters"
        :key="f.key"
        @click="removeFilter(f)"
        style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:12px;font-size:11px;color:#10b981;cursor:pointer"
      >
        {{ f.label }}
        <span class="pi pi-times" style="font-size:8px" />
      </span>
    </div>

    <div style="flex:1;overflow-y:auto">

      <!-- Marques -->
      <template v-if="showBrandFilter">
        <div class="filter-section">
          <button class="filter-section-header" @click="toggle('brands')">
            <span>Marques <FieldInfo field="manufacturer" /></span>
            <div style="display:flex;align-items:center;gap:6px">
              <span v-if="filtersStore.brands.length" style="font-size:10px;background:rgba(16,185,129,0.2);color:#10b981;padding:1px 6px;border-radius:10px">
                {{ filtersStore.brands.length }}
              </span>
              <span :class="['pi', open.brands ? 'pi-chevron-up' : 'pi-chevron-down']" style="font-size:11px;color:#52525b" />
            </div>
          </button>
          <div v-show="open.brands" style="padding:0 12px 12px">
            <MultiSelect
              :modelValue="filtersStore.brands"
              @update:modelValue="val => applyFilter('brands', val)"
              :options="catalogStore.brands"
              optionLabel="name"
              optionValue="name"
              placeholder="Toutes les marques"
              :filter="true"
              filterPlaceholder="Rechercher…"
              :maxSelectedLabels="2"
              style="width:100%"
              :virtualScrollerOptions="{ itemSize: 36 }"
            >
              <template #option="{ option }">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%">
                  <span style="font-size:12px">{{ option.name }}</span>
                  <span style="font-size:11px;color:#52525b">{{ (option.count ?? 0).toLocaleString('fr-FR') }}</span>
                </div>
              </template>
            </MultiSelect>
          </div>
        </div>
      </template>

      <!-- Catégories -->
      <template v-if="showCategoryFilter">
        <div class="filter-section">
          <button class="filter-section-header" @click="toggle('categories')">
            <span>Catégories <FieldInfo field="temotCat" /></span>
            <div style="display:flex;align-items:center;gap:6px">
              <span v-if="filtersStore.categories.length" style="font-size:10px;background:rgba(16,185,129,0.2);color:#10b981;padding:1px 6px;border-radius:10px">
                {{ filtersStore.categories.length }}
              </span>
              <span :class="['pi', open.categories ? 'pi-chevron-up' : 'pi-chevron-down']" style="font-size:11px;color:#52525b" />
            </div>
          </button>
          <div v-show="open.categories" style="padding:0 12px 12px">
            <MultiSelect
              :modelValue="filtersStore.categories"
              @update:modelValue="val => applyFilter('categories', val)"
              :options="catalogStore.categories"
              optionLabel="name"
              optionValue="name"
              placeholder="Toutes les catégories"
              :filter="true"
              filterPlaceholder="Rechercher…"
              :maxSelectedLabels="2"
              style="width:100%"
              :virtualScrollerOptions="{ itemSize: 36 }"
            />
          </div>
        </div>
      </template>

      <!-- Prix -->
      <div class="filter-section">
        <button class="filter-section-header" @click="toggle('prix')">
          <span>Prix (€) <FieldInfo field="priceNet" /></span>
          <div style="display:flex;align-items:center;gap:6px">
            <span v-if="filtersStore.priceMin !== null || filtersStore.priceMax !== null" style="font-size:10px;background:rgba(16,185,129,0.2);color:#10b981;padding:1px 6px;border-radius:10px">●</span>
            <span :class="['pi', open.prix ? 'pi-chevron-up' : 'pi-chevron-down']" style="font-size:11px;color:#52525b" />
          </div>
        </button>
        <div v-show="open.prix" style="padding:0 12px 12px;display:flex;gap:8px;align-items:center">
          <InputNumber
            :modelValue="filtersStore.priceMin"
            @update:modelValue="val => applyFilter('priceMin', val)"
            placeholder="Min"
            :min="0"
            :maxFractionDigits="2"
            style="flex:1"
            :inputStyle="{ width:'100%', fontSize:'12px' }"
          />
          <span style="color:#3f3f46;font-size:14px;flex-shrink:0">—</span>
          <InputNumber
            :modelValue="filtersStore.priceMax"
            @update:modelValue="val => applyFilter('priceMax', val)"
            placeholder="Max"
            :min="0"
            :maxFractionDigits="2"
            style="flex:1"
            :inputStyle="{ width:'100%', fontSize:'12px' }"
          />
        </div>
      </div>

      <!-- Stock -->
      <div class="filter-section">
        <button class="filter-section-header" @click="toggle('stock')">
          <span>Stock <FieldInfo field="stockChorzow" /></span>
          <div style="display:flex;align-items:center;gap:6px">
            <span v-if="filtersStore.inStockOnly" style="font-size:10px;background:rgba(16,185,129,0.2);color:#10b981;padding:1px 6px;border-radius:10px">●</span>
            <span :class="['pi', open.stock ? 'pi-chevron-up' : 'pi-chevron-down']" style="font-size:11px;color:#52525b" />
          </div>
        </button>
        <div v-show="open.stock" style="padding:0 12px 12px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <label for="fs-inStock" style="font-size:13px;color:#a1a1aa;cursor:pointer">En stock uniquement</label>
            <ToggleSwitch
              :modelValue="filtersStore.inStockOnly"
              @update:modelValue="val => applyFilter('inStockOnly', val)"
              inputId="fs-inStock"
            />
          </div>
        </div>
      </div>

      <!-- Médias -->
      <div class="filter-section">
        <button class="filter-section-header" @click="toggle('medias')">
          <span>Médias <FieldInfo field="isImage" /></span>
          <div style="display:flex;align-items:center;gap:6px">
            <span v-if="filtersStore.hasImageOnly || filtersStore.hasPdfOnly" style="font-size:10px;background:rgba(16,185,129,0.2);color:#10b981;padding:1px 6px;border-radius:10px">●</span>
            <span :class="['pi', open.medias ? 'pi-chevron-up' : 'pi-chevron-down']" style="font-size:11px;color:#52525b" />
          </div>
        </button>
        <div v-show="open.medias" style="padding:0 12px 12px;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;align-items:center;gap:8px">
            <Checkbox
              :modelValue="filtersStore.hasImageOnly"
              @update:modelValue="val => applyFilter('hasImageOnly', val)"
              :binary="true"
              inputId="fs-hasImage"
            />
            <label for="fs-hasImage" style="font-size:13px;color:#a1a1aa;cursor:pointer">Avec image</label>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <Checkbox
              :modelValue="filtersStore.hasPdfOnly"
              @update:modelValue="val => applyFilter('hasPdfOnly', val)"
              :binary="true"
              inputId="fs-hasPdf"
            />
            <label for="fs-hasPdf" style="font-size:13px;color:#a1a1aa;cursor:pointer">Avec fiche PDF</label>
          </div>
        </div>
      </div>

      <!-- TVA -->
      <div class="filter-section">
        <button class="filter-section-header" @click="toggle('tva')">
          <span>TVA <FieldInfo field="vatRate" /></span>
          <div style="display:flex;align-items:center;gap:6px">
            <span v-if="filtersStore.vatRates.length" style="font-size:10px;background:rgba(16,185,129,0.2);color:#10b981;padding:1px 6px;border-radius:10px">
              {{ filtersStore.vatRates.length }}
            </span>
            <span :class="['pi', open.tva ? 'pi-chevron-up' : 'pi-chevron-down']" style="font-size:11px;color:#52525b" />
          </div>
        </button>
        <div v-show="open.tva" style="padding:0 12px 12px">
          <MultiSelect
            :modelValue="filtersStore.vatRates"
            @update:modelValue="val => applyFilter('vatRates', val)"
            :options="catalogStore.vatRates"
            placeholder="Tous les taux"
            :maxSelectedLabels="3"
            style="width:100%"
          >
            <template #option="{ option }">
              <span style="font-size:12px">{{ option }}%</span>
            </template>
            <template #value="{ value }">
              <span v-if="value && value.length" style="font-size:12px">{{ value.map(v => v + '%').join(', ') }}</span>
              <span v-else style="color:#71717a;font-size:12px">Tous les taux</span>
            </template>
          </MultiSelect>
        </div>
      </div>

      <!-- Groupes de remise -->
      <div class="filter-section">
        <button class="filter-section-header" @click="toggle('remise')">
          <span>Groupes de remise <FieldInfo field="discountGroup" /></span>
          <div style="display:flex;align-items:center;gap:6px">
            <span v-if="filtersStore.discountGroups.length" style="font-size:10px;background:rgba(16,185,129,0.2);color:#10b981;padding:1px 6px;border-radius:10px">
              {{ filtersStore.discountGroups.length }}
            </span>
            <span :class="['pi', open.remise ? 'pi-chevron-up' : 'pi-chevron-down']" style="font-size:11px;color:#52525b" />
          </div>
        </button>
        <div v-show="open.remise" style="padding:0 12px 12px">
          <MultiSelect
            :modelValue="filtersStore.discountGroups"
            @update:modelValue="val => applyFilter('discountGroups', val)"
            :options="catalogStore.discountGroups"
            optionLabel="name"
            optionValue="name"
            placeholder="Tous les groupes"
            :filter="true"
            :maxSelectedLabels="2"
            style="width:100%"
          />
        </div>
      </div>

      <!-- Tri -->
      <div class="filter-section" style="border-bottom:none">
        <button class="filter-section-header" @click="toggle('tri')">
          <span>Tri</span>
          <span :class="['pi', open.tri ? 'pi-chevron-up' : 'pi-chevron-down']" style="font-size:11px;color:#52525b" />
        </button>
        <div v-show="open.tri" style="padding:0 12px 12px;display:flex;gap:6px">
          <Select
            :modelValue="filtersStore.sortBy"
            @update:modelValue="val => applyFilter('sortBy', val)"
            :options="sortOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Trier par"
            style="flex:1;font-size:12px"
          />
          <button
            @click="toggleSortDir"
            :title="filtersStore.sortDir === 'asc' ? 'Croissant' : 'Décroissant'"
            style="background:#1c1c1f;border:1px solid #27272a;color:#a1a1aa;border-radius:6px;padding:0 10px;cursor:pointer;display:flex;align-items:center"
          >
            <span :class="['pi', filtersStore.sortDir === 'asc' ? 'pi-sort-amount-up' : 'pi-sort-amount-down']" style="font-size:14px" />
          </button>
        </div>
      </div>
    </div>

    <!-- Réinitialiser -->
    <div style="padding:10px 12px;border-top:1px solid #27272a;flex-shrink:0">
      <button
        @click="resetAll"
        style="width:100%;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:6px;padding:7px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;gap:6px;transition:border-color 0.15s,color 0.15s"
        @mouseenter="e => { e.target.style.borderColor='#3f3f46'; e.target.style.color='#a1a1aa' }"
        @mouseleave="e => { e.target.style.borderColor='#27272a'; e.target.style.color='#71717a' }"
      >
        <span class="pi pi-refresh" style="font-size:12px" />
        Réinitialiser les filtres
      </button>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import MultiSelect  from 'primevue/multiselect'
import InputNumber  from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import Checkbox     from 'primevue/checkbox'
import Select       from 'primevue/select'
import { useFiltersStore } from '../../stores/filters.js'
import { useCatalogStore } from '../../stores/catalog.js'

const props = defineProps({
  showBrandFilter:    { type: Boolean, default: true },
  showCategoryFilter: { type: Boolean, default: true }
})

const emit = defineEmits(['change'])

const filtersStore  = useFiltersStore()
const catalogStore  = useCatalogStore()

const open = reactive({
  brands:     true,
  categories: true,
  prix:       false,
  stock:      true,
  medias:     false,
  tva:        false,
  remise:     false,
  tri:        true
})

function toggle(key) {
  open[key] = !open[key]
}

const sortOptions = [
  { label: 'Nom',         value: 'name' },
  { label: 'Prix net',    value: 'priceNet' },
  { label: 'Prix retail', value: 'priceRetail' },
  { label: 'Motonet',     value: 'motonet' },
  { label: 'Marque',      value: 'manufacturer' },
  { label: 'Stock',       value: 'stockChorzow' },
  { label: 'Remise',      value: 'discount' }
]

function applyFilter(key, val) {
  filtersStore.setFilter(key, val)
  emit('change')
}

function toggleSortDir() {
  filtersStore.setFilter('sortDir', filtersStore.sortDir === 'asc' ? 'desc' : 'asc')
  emit('change')
}

function resetAll() {
  filtersStore.reset()
  emit('change')
}

const activeFilters = computed(() => {
  const list = []
  filtersStore.brands.forEach(b =>
    list.push({ key: `brand-${b}`, label: b, type: 'brands', value: b })
  )
  filtersStore.categories.forEach(c =>
    list.push({ key: `cat-${c}`, label: c, type: 'categories', value: c })
  )
  filtersStore.discountGroups.forEach(d =>
    list.push({ key: `dg-${d}`, label: d, type: 'discountGroups', value: d })
  )
  filtersStore.vatRates.forEach(v =>
    list.push({ key: `vat-${v}`, label: `TVA ${v}%`, type: 'vatRates', value: v })
  )
  if (filtersStore.priceMin !== null)
    list.push({ key: 'priceMin', label: `≥ ${filtersStore.priceMin} €`, type: 'priceMin' })
  if (filtersStore.priceMax !== null)
    list.push({ key: 'priceMax', label: `≤ ${filtersStore.priceMax} €`, type: 'priceMax' })
  if (filtersStore.inStockOnly)
    list.push({ key: 'inStock', label: 'En stock', type: 'inStockOnly' })
  if (filtersStore.hasImageOnly)
    list.push({ key: 'hasImage', label: 'Avec image', type: 'hasImageOnly' })
  if (filtersStore.hasPdfOnly)
    list.push({ key: 'hasPdf',  label: 'Avec PDF',   type: 'hasPdfOnly' })
  return list
})

function removeFilter(f) {
  const arrayTypes = ['brands', 'categories', 'discountGroups', 'vatRates']
  if (arrayTypes.includes(f.type)) {
    filtersStore.setFilter(f.type, filtersStore[f.type].filter(v => v !== f.value))
  } else {
    filtersStore.setFilter(f.type, f.type.includes('Only') ? false : null)
  }
  emit('change')
}
</script>

<style scoped>
.filter-section {
  border-bottom: 1px solid #27272a;
}
.filter-section-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: #a1a1aa;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: color 0.1s;
}
.filter-section-header:hover {
  color: #fafafa;
}
</style>
