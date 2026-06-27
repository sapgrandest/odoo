<template>
  <div style="width:100%;display:flex;flex-direction:column;min-height:300px">
    <div
      v-if="loading"
      style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:#09090b;border-radius:8px"
    >
      <ProgressSpinner style="width:36px;height:36px" />
      <span style="font-size:12px;color:#71717a">Chargement des images…</span>
    </div>

    <div
      v-else-if="!images || images.length === 0"
      style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#09090b;border-radius:8px;border:1px dashed #27272a;color:#3f3f46"
    >
      <span class="pi pi-image" style="font-size:48px" />
      <span style="font-size:13px">Pas d'image disponible</span>
    </div>

    <template v-else>
      <!-- Images -->
      <div v-if="imageItems.length" style="background:#09090b;border-radius:8px;overflow:hidden;border:1px solid #27272a">
        <div v-if="imageItems.length === 1" style="position:relative">
          <img
            :src="imageItems[0].itemImageSrc"
            style="width:100%;max-height:400px;object-fit:contain;display:block"
          />
          <span
            v-if="imageItems[0].isMain"
            style="position:absolute;top:8px;left:8px;background:#10b981;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;letter-spacing:0.04em"
          >Principale</span>
        </div>

        <Galleria
          v-else
          :value="imageItems"
          :numVisible="Math.min(imageItems.length, 5)"
          :circular="true"
          :showItemNavigators="true"
          :showThumbnails="true"
          containerStyle="width:100%"
        >
          <template #item="{ item }">
            <div style="position:relative;display:flex;justify-content:center">
              <img
                :src="item.itemImageSrc"
                style="max-width:100%;max-height:380px;object-fit:contain;display:block;margin:0 auto;padding:8px"
              />
              <span
                v-if="item.isMain"
                style="position:absolute;top:8px;left:8px;background:#10b981;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;letter-spacing:0.04em"
              >Principale</span>
              <span
                v-else-if="item.type"
                style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.6);color:#a1a1aa;font-size:10px;padding:2px 7px;border-radius:10px;border:1px solid #27272a"
              >{{ typeLabel(item.type) }}</span>
            </div>
          </template>
          <template #thumbnail="{ item }">
            <div style="position:relative;display:inline-block">
              <img
                :src="item.thumbnailImageSrc || item.itemImageSrc"
                style="width:56px;height:44px;object-fit:cover;border-radius:4px;display:block"
              />
              <span
                v-if="item.isMain"
                style="position:absolute;bottom:2px;right:2px;background:#10b981;color:#fff;font-size:8px;font-weight:700;padding:1px 4px;border-radius:4px;line-height:1.4"
              >★</span>
            </div>
          </template>
        </Galleria>
      </div>

      <!-- PDFs -->
      <div v-if="pdfItems.length" style="margin-top:10px">
        <div style="font-size:10px;font-weight:600;color:#52525b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">
          Documents PDF ({{ pdfItems.length }})
        </div>
        <div
          v-for="(pdf, i) in pdfItems"
          :key="pdf.guid || i"
          style="display:flex;align-items:center;gap:8px;background:#111113;border:1px solid #27272a;border-radius:6px;padding:8px 10px;margin-bottom:4px"
        >
          <span class="pi pi-file-pdf" style="font-size:18px;color:#ef4444;flex-shrink:0" />
          <span style="font-size:11px;font-family:monospace;color:#71717a;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            {{ pdf.itemImageSrc }}
          </span>
          <a
            :href="pdf.itemImageSrc"
            target="_blank"
            rel="noopener"
            style="background:transparent;border:1px solid #ef4444;color:#ef4444;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;text-decoration:none;flex-shrink:0;display:flex;align-items:center;gap:4px"
          >
            <span class="pi pi-external-link" style="font-size:11px" />
            Ouvrir
          </a>
          <button
            @click="copyUrl(pdf.itemImageSrc)"
            style="background:transparent;border:1px solid #27272a;color:#71717a;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;display:flex;align-items:center;gap:4px;flex-shrink:0"
          >
            <span class="pi pi-copy" style="font-size:11px" />
          </button>
        </div>
      </div>

      <!-- URLs CDN -->
      <div v-if="imageItems.length" style="margin-top:10px;display:flex;flex-direction:column;gap:4px">
        <div style="font-size:10px;font-weight:600;color:#52525b;text-transform:uppercase;letter-spacing:0.05em">
          URLs CDN ({{ imageItems.length }})
        </div>
        <div
          v-for="(img, i) in imageItems"
          :key="img.guid || i"
          style="display:flex;align-items:center;gap:8px;background:#111113;border:1px solid #27272a;border-radius:6px;padding:6px 10px"
        >
          <span
            v-if="img.isMain"
            style="font-size:9px;font-weight:700;color:#10b981;flex-shrink:0;background:rgba(16,185,129,0.1);padding:1px 5px;border-radius:4px;border:1px solid rgba(16,185,129,0.3)"
          >★</span>
          <span style="font-size:11px;font-family:monospace;color:#71717a;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            {{ img.itemImageSrc }}
          </span>
          <button
            @click="copyUrl(img.itemImageSrc)"
            style="background:transparent;border:1px solid #27272a;color:#71717a;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;display:flex;align-items:center;gap:4px;white-space:nowrap;flex-shrink:0"
          >
            <span class="pi pi-copy" style="font-size:11px" />
            Copier
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Galleria from 'primevue/galleria'
import ProgressSpinner from 'primevue/progressspinner'
import { useToast } from 'primevue/usetoast'

const props = defineProps({
  images:  { type: Array,   default: () => [] },
  loading: { type: Boolean, default: false }
})

const toast = useToast()

const sortedImages = computed(() => {
  if (!props.images.length) return []
  const main = props.images.filter(img => img.isMain)
  const rest = props.images.filter(img => !img.isMain)
  return [...main, ...rest]
})

const imageItems = computed(() => sortedImages.value.filter(img => !img.isPdf))
const pdfItems   = computed(() => sortedImages.value.filter(img => img.isPdf))

const TYPE_LABELS = {
  '1': 'Photo produit',
  '2': 'Dessin technique',
  '3': 'Vue en coupe',
  '4': 'Vue éclatée',
  '5': 'Photo emballage',
  '6': 'Logo marque',
  'P': 'Photo produit',
  'T': 'Dessin technique',
  'S': 'Vue en coupe',
  'E': 'Vue éclatée',
}

function typeLabel(type) {
  return TYPE_LABELS[String(type)] ?? `Type ${type}`
}

function copyUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    toast.add({ severity: 'success', summary: 'Copié', detail: 'URL copiée dans le presse-papier', life: 2000 })
  }).catch(() => {
    toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de copier', life: 2000 })
  })
}
</script>
