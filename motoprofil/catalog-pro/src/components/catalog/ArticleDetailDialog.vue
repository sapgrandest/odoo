<template>
  <Dialog
    v-model:visible="visible"
    modal
    :dismissableMask="true"
    :style="{ width: '90vw', maxWidth: '1200px' }"
    :pt="{
      root:    { style: 'background:#111113;border:1px solid #27272a;border-radius:12px;overflow:hidden;color:#fafafa' },
      header:  { style: 'background:#111113;border-bottom:1px solid #27272a;padding:14px 20px;display:flex;align-items:center;gap:10px' },
      content: { style: 'background:#111113;padding:0;overflow:hidden' },
      title:   { style: 'font-size:15px;font-weight:600;color:#fafafa;line-height:1.4' }
    }"
    @hide="onHide"
  >
    <template #header>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0">
        <Tag v-if="currentArticle?.manufacturer" :value="currentArticle.manufacturer" severity="info" style="font-weight:700;text-transform:uppercase;font-size:10px;flex-shrink:0" />
        <span class="dialog-article-name" style="font-size:14px;font-weight:600;color:#fafafa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          {{ currentArticle?.name || 'Détail article' }}
        </span>
        <Tag v-if="currentArticle?.isNew"    value="NOUVEAU"  style="font-size:9px;background:#7c3aed;color:#fff;border:none;flex-shrink:0" />
        <Tag v-if="currentArticle?.isOnSale" value="EN PROMO" severity="warning" style="font-size:9px;flex-shrink:0" />
      </div>
    </template>

    <div v-if="currentArticle" style="display:flex;height:70vh;min-height:400px;overflow:hidden">

      <!-- Colonne gauche : Images -->
      <div style="width:50%;border-right:1px solid #27272a;padding:16px;overflow-y:auto;flex-shrink:0">
        <ImageGallery :images="images" :loading="loadingImages" />
      </div>

      <!-- Colonne droite : Informations -->
      <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px">

        <!-- Description -->
        <div v-if="currentArticle.description" style="font-size:13px;color:#71717a;line-height:1.5;padding:10px;background:#09090b;border-radius:7px;border:1px solid #27272a">
          {{ currentArticle.description }}
        </div>

        <!-- Applications véhicules -->
        <div
          v-if="currentArticle.vehicleApplications?.length"
          style="padding:10px 12px;background:#09090b;border-radius:8px;border:1px solid #27272a"
        >
          <div style="font-size:10px;font-weight:600;color:#52525b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Véhicules compatibles</div>
          <div style="font-size:12px;color:#a1a1aa;line-height:1.7">{{ currentArticle.vehicleApplications.join(' · ') }}</div>
        </div>

        <!-- Grille des références -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="padding:8px 10px;background:#09090b;border-radius:7px;border:1px solid #27272a">
            <div style="font-size:10px;color:#52525b;margin-bottom:3px">Motonet <FieldInfo field="motonet" /></div>
            <div class="dialog-motonet" style="font-family:monospace;font-size:13px;font-weight:700;color:#10b981">{{ currentArticle.motonet || '—' }}</div>
          </div>
          <div style="padding:8px 10px;background:#09090b;border-radius:7px;border:1px solid #27272a">
            <div style="font-size:10px;color:#52525b;margin-bottom:3px">elId ProfiAuto <FieldInfo field="elId" /></div>
            <div style="font-family:monospace;font-size:13px;font-weight:600;color:#fafafa">{{ currentArticle.elId || '—' }}</div>
          </div>
          <div style="padding:8px 10px;background:#09090b;border-radius:7px;border:1px solid #27272a">
            <div style="font-size:10px;color:#52525b;margin-bottom:3px">OEM / Original <FieldInfo field="original" /></div>
            <div class="dialog-oem" style="font-family:monospace;font-size:12px;color:#a1a1aa;word-break:break-all">{{ currentArticle.original || '—' }}</div>
          </div>
          <div style="padding:8px 10px;background:#09090b;border-radius:7px;border:1px solid #27272a">
            <div style="font-size:10px;color:#52525b;margin-bottom:3px">EAN / Barcode <FieldInfo field="barcode" /></div>
            <div style="font-family:monospace;font-size:12px;color:#a1a1aa">{{ currentArticle.barcode || '—' }}</div>
          </div>
        </div>

        <Divider style="margin:0" />

        <!-- Tarifs -->
        <div>
          <div class="section-title">Tarifs</div>
          <div class="info-rows">
            <template v-for="row in tarifRows" :key="row.label">
              <div v-if="row.value != null && row.value !== ''" class="info-row">
                <span class="info-label">{{ row.label }}<FieldInfo v-if="row.field" :field="row.field" /></span>
                <span :style="{ fontSize:'12px', fontWeight:'500', color: row.green ? '#10b981' : '#fafafa' }">{{ row.value }}</span>
              </div>
            </template>
          </div>
        </div>

        <!-- Logistique -->
        <div>
          <div class="section-title">Logistique</div>
          <div class="info-rows">
            <template v-for="row in logistiqueRows" :key="row.label">
              <div v-if="row.value != null && row.value !== ''" class="info-row">
                <span class="info-label">{{ row.label }}<FieldInfo v-if="row.field" :field="row.field" /></span>
                <span :style="{ fontSize:'12px', fontWeight:'500', color: row.red ? '#ef4444' : row.green ? '#10b981' : '#fafafa' }">{{ row.value }}</span>
              </div>
            </template>
          </div>
        </div>

        <!-- Classification -->
        <div>
          <div class="section-title">Classification</div>
          <div class="info-rows">
            <template v-for="row in classifRows" :key="row.label">
              <div v-if="row.value != null && row.value !== ''" class="info-row">
                <span class="info-label">{{ row.label }}<FieldInfo v-if="row.field" :field="row.field" /></span>
                <span style="font-size:12px;color:#fafafa">{{ row.value }}</span>
              </div>
            </template>
          </div>
        </div>

        <!-- Caractéristiques techniques -->
        <div v-if="currentArticle.parameters?.length">
          <div class="section-title">Caractéristiques techniques</div>
          <DataTable
            :value="currentArticle.parameters"
            size="small"
            :pt="{
              root: { style: 'background:#09090b;border:1px solid #27272a;border-radius:6px;overflow:hidden;font-size:12px' },
              bodyRow: { style: 'background:transparent' }
            }"
          >
            <Column field="name"  header="Propriété" style="color:#71717a;width:45%;font-size:12px" />
            <Column field="value" header="Valeur"    style="color:#fafafa;font-size:12px" />
          </DataTable>
        </div>

        <!-- Alternatives -->
        <div v-if="currentArticle.alternatives?.filter(Boolean).length">
          <div class="section-title">Articles alternatifs</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            <span
              v-for="alt in currentArticle.alternatives.filter(Boolean)"
              :key="alt"
              @click="$emit('open-alternative', alt)"
              style="display:inline-flex;align-items:center;padding:3px 10px;background:#1c1c1f;border:1px solid #27272a;border-radius:12px;font-size:12px;font-family:monospace;color:#10b981;cursor:pointer;transition:border-color 0.1s"
              @mouseenter="e => e.currentTarget.style.borderColor='#10b981'"
              @mouseleave="e => e.currentTarget.style.borderColor='#27272a'"
            >{{ alt }}</span>
          </div>
        </div>

        <!-- Intégration Odoo -->
        <div style="background:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.2);border-radius:8px;padding:12px">
          <div style="font-size:10px;font-weight:600;color:#10b981;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">
            <span class="pi pi-link" style="margin-right:5px" />Intégration Odoo
          </div>
          <div v-for="ref_ in odooRefs" :key="ref_.label" style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:11px;color:#52525b;flex-shrink:0;min-width:110px">{{ ref_.label }}</span>
            <span style="font-size:12px;font-family:monospace;color:#a1a1aa;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ ref_.value }}</span>
            <button
              @click="copyToClipboard(ref_.value)"
              style="background:transparent;border:1px solid rgba(16,185,129,0.3);color:#10b981;border-radius:4px;padding:2px 7px;cursor:pointer;font-size:10px;flex-shrink:0"
            >Copier</button>
          </div>
        </div>

        <!-- Article de remplacement -->
        <div
          v-if="replacementMotonet"
          style="padding:10px 12px;background:#09090b;border-radius:8px;border:1px solid #27272a"
        >
          <div style="font-size:10px;font-weight:600;color:#52525b;margin-bottom:6px">Remplacé par</div>
          <span
            @click="$emit('open-alternative', replacementMotonet)"
            style="font-family:monospace;color:#10b981;cursor:pointer;font-size:13px;text-decoration:underline;text-underline-offset:3px"
          >{{ replacementMotonet }}</span>
        </div>

      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import Dialog      from 'primevue/dialog'
import Tag         from 'primevue/tag'
import Divider     from 'primevue/divider'
import DataTable   from 'primevue/datatable'
import Column      from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import ImageGallery from './ImageGallery.vue'
import { useProfiAutoApi } from '../../composables/useProfiAutoApi.js'
import { useAuthStore } from '../../stores/auth.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  article:    { type: Object,  default: null }
})

const emit = defineEmits(['update:modelValue', 'open-alternative'])

const toast                              = useToast()
const auth                               = useAuthStore()
const { getGraphics, getArticleDetails } = useProfiAutoApi()

const internalArticle = ref(null)
const internalVisible = ref(false)
const images          = ref([])
const loadingImages   = ref(false)

const currentArticle = computed(() => internalArticle.value ?? props.article)

const visible = computed({
  get:  () => internalVisible.value || props.modelValue,
  set: val => {
    internalVisible.value = val
    emit('update:modelValue', val)
  }
})

async function open(article) {
  internalArticle.value = article
  internalVisible.value = true
  images.value          = []
  if (!auth.isAuthenticated || !article?.motonet) return

  loadingImages.value = true
  const abortCtrl  = new AbortController()
  const abortTimer = setTimeout(() => abortCtrl.abort(), 15000)

  try {
    let elId = article.elId ?? null

    if (!elId) {
      const [apiItem] = await getArticleDetails([article.motonet], abortCtrl.signal)
      if (apiItem) {
        elId = apiItem.elId ?? null
        internalArticle.value = {
          ...article,
          elId:       apiItem.elId      ?? null,
          photoGuid:  apiItem.photoGuid ?? article.photoGuid ?? null,
          isImage:    apiItem.isImage   ?? false,
          isPdf:      apiItem.isPdf     ?? false,
          onStock:    apiItem.onStock   ?? null,
          gtuCode:    apiItem.gtuCode   ?? null,
          parameters: apiItem.parameters ?? [],
        }
      }
    }

    clearTimeout(abortTimer)

    if (elId) {
      const rawImages = await getGraphics(elId)
      const pg        = internalArticle.value?.photoGuid ?? null

      // Affichage immédiat avec photoGuid comme fallback → spinner s'arrête vite
      const pgIdx  = pg ? rawImages.findIndex(img => img.guid === pg) : -1
      const defIdx = pgIdx >= 0 ? pgIdx : 0
      images.value = rawImages.map((img, i) => ({ ...img, isMain: i === defIdx }))

      // Détection du fond en arrière-plan (non-bloquant)
      detectMainImageIndex(rawImages, pg).then(mainIdx => {
        if (mainIdx >= 0 && mainIdx !== defIdx && images.value.length === rawImages.length) {
          images.value = images.value.map((img, i) => ({ ...img, isMain: i === mainIdx }))
        }
      }).catch(() => {})
    }
  } catch (e) {
    // Timeout dialog-level (getArticleDetails hung) → avertir l'utilisateur
    if (e?.name === 'AbortError' && abortCtrl.signal.aborted) {
      toast.add({ severity: 'warn', summary: 'Article inaccessible', detail: 'L\'API ProfiAuto n\'a pas répondu pour cet article', life: 5000 })
    }
    // Timeout getGraphics (8 s) → silencieux, "Pas d'image disponible" suffit
    images.value = []
  } finally {
    clearTimeout(abortTimer)
    loadingImages.value = false
  }
}

// Détecte l'image principale : préfère les images à fond clair (photo produit)
// Si CORS bloqué → repli sur photoGuid → puis première image
async function detectMainImageIndex(images, photoGuid) {
  if (!images.length) return -1

  const brightnesses = await Promise.all(images.map(img => sampleCornerBrightness(img.itemImageSrc)))
  const firstLight = brightnesses.findIndex(b => b !== null && b > 200)
  if (firstLight >= 0) return firstLight

  if (photoGuid) {
    const pgIdx = images.findIndex(img => img.guid === photoGuid)
    if (pgIdx >= 0) return pgIdx
  }

  return 0
}

// Échantillonne le coin supérieur gauche (8×8 px) via canvas pour détecter le fond.
// Passe par /api/cdn-proxy/{guid} (même origine) pour éviter les restrictions CORS.
function sampleCornerBrightness(src) {
  const guidMatch = src.match(/\/Image\/([0-9a-f-]{36})/i)
  const proxySrc  = guidMatch ? `/api/cdn-proxy/${guidMatch[1]}` : src

  return new Promise(resolve => {
    const img = new Image()   // pas de crossOrigin : même origine via proxy
    const t = setTimeout(() => resolve(null), 8000)
    img.onload = () => {
      clearTimeout(t)
      try {
        const c = document.createElement('canvas')
        c.width = c.height = 8
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0, 8, 8, 0, 0, 8, 8)
        const { data } = ctx.getImageData(0, 0, 8, 8)
        let total = 0
        for (let i = 0; i < data.length; i += 4) total += (data[i] + data[i + 1] + data[i + 2]) / 3
        resolve(total / 64) // moyenne 0–255 sur 64 pixels
      } catch { resolve(null) }
    }
    img.onerror = () => { clearTimeout(t); resolve(null) }
    img.src = proxySrc
  })
}

function onHide() {
  internalVisible.value = false
  internalArticle.value = null
  images.value          = []
}

defineExpose({ open })

function fmtPrice(val) {
  if (val == null || val === '' || Number(val) === 0) return null
  return Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

const tarifRows = computed(() => {
  const a = currentArticle.value
  if (!a) return []
  return [
    { label: "Prix d'achat net HT",  field: 'priceNet',          value: fmtPrice(a.priceNet) },
    { label: 'Prix retail HT',        field: 'priceRetail',       value: fmtPrice(a.priceRetail) },
    { label: 'Prix brut retail',      field: 'priceGrossRetail',  value: fmtPrice(a.priceGrossRetail) },
    { label: 'Prix brut achat',       field: 'priceGrossPurchase',value: fmtPrice(a.priceGrossPurchase) },
    { label: 'Remise',                field: 'discount',          value: a.discount > 0 ? `${a.discount}%` : null, green: true },
    { label: 'Groupe de remise',      field: 'discountGroup',     value: a.discountGroup },
    { label: 'TVA',                   field: 'vatRate',           value: a.vatRate != null ? `${a.vatRate}%` : null },
    { label: 'Consigne',              field: 'deposit',           value: a.deposit > 0 ? fmtPrice(a.deposit) : null }
  ]
})

const logistiqueRows = computed(() => {
  const a = currentArticle.value
  if (!a) return []
  return [
    { label: 'Stock Chorzów',         field: 'stockChorzow',  value: a.stockChorzow ?? 0, green: (a.stockChorzow ?? 0) > 0 },
    { label: 'Stock HUB',             field: 'stockHub',      value: a.stockHub ?? 0,     green: (a.stockHub ?? 0) > 0 },
    { label: 'Poids',                 field: 'weight',        value: a.weight ? `${a.weight} kg` : null },
    { label: 'Qté min. commande',     field: 'minQty',        value: a.minQty },
    { label: 'Unité',                 field: 'unit',          value: a.unit },
    { label: 'Non retournable',       field: 'nonReturnable', value: a.nonReturnable ? 'Oui' : null, red: true },
    { label: 'Code GTU',              field: 'gtuCode',       value: a.gtuCode }
  ]
})

const classifRows = computed(() => {
  const a = currentArticle.value
  if (!a) return []
  return [
    { label: 'Famille (Temot FAM)',   field: 'temotFam',          value: a.temotFam },
    { label: 'Catégorie (Temot CAT)', field: 'temotCat',          value: a.temotCat },
    { label: 'Code produit',          field: 'productGroupCode',  value: a.productGroupCode },
    { label: 'Code pays',             field: 'countryCode',       value: a.countryCode },
    { label: 'Fabricant TecDoc',      field: 'tecDocManufacturer',value: a.tecDocManufacturer },
    { label: "N° art. TecDoc",        field: 'tecDocArtNr',       value: a.tecDocArtNr },
    { label: 'N° herst. TecDoc',      field: 'tecDocHerNr',       value: a.tecDocHerNr },
    { label: 'GenArt TecDoc',         field: 'tecDocGenArtNr',    value: a.tecDocGenArtNr }
  ]
})

const odooRefs = computed(() => {
  const a = currentArticle.value
  if (!a) return []
  const list = [
    { label: 'Réf. interne',     value: a.motonet },
    { label: 'Réf. fournisseur', value: a.suppliersRef }
  ]
  if (a.photoGuid) {
    list.push({ label: 'Image CDN', value: `https://cdn.profiauto.com/Image/${a.photoGuid}` })
  }
  return list.filter(r => r.value)
})

const replacementMotonet = computed(() => {
  const a = currentArticle.value
  if (!a) return ''
  return ((a.replacementPrefix ?? '') + (a.replacementIndex ?? '')).trim()
})

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    toast.add({ severity: 'success', summary: 'Copié', detail: text.slice(0, 60), life: 2000 })
  })
}
</script>

<style scoped>
.section-title {
  font-size: 10px;
  font-weight: 600;
  color: #52525b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}
.info-rows {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.info-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid #1c1c1f;
}
.info-label {
  font-size: 12px;
  color: #71717a;
  flex-shrink: 0;
}
</style>
