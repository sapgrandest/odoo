<template>
  <div
    class="article-card"
    @click="$emit('open', article)"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    :style="{
      background: hovered ? '#141417' : '#111113',
      border: `1px solid ${hovered ? '#10b981' : '#27272a'}`,
      borderRadius: '10px',
      cursor: 'pointer',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'border-color 0.15s, background 0.15s',
      userSelect: 'none'
    }"
  >
    <!-- Zone image -->
    <div style="height:160px;background:#09090b;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
      <img
        v-if="article.photoGuid && !imgError"
        :src="`https://cdn.profiauto.com/Image/${article.photoGuid}`"
        :alt="article.name"
        style="max-width:100%;max-height:100%;object-fit:contain"
        loading="lazy"
        @error="imgError = true"
      />
      <span v-else class="pi pi-car" style="font-size:42px;color:#3f3f46" />

      <!-- Badge remise haut-gauche -->
      <div
        v-if="article.discount > 0"
        class="article-discount-badge"
        style="position:absolute;top:6px;left:6px;background:#f59e0b;color:#09090b;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;letter-spacing:0.03em"
      >-{{ article.discount }}%</div>

      <!-- Badge NOUVEAU -->
      <div
        v-if="article.isNew"
        style="position:absolute;top:6px;right:6px;background:#7c3aed;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;letter-spacing:0.06em"
      >NOUVEAU</div>

      <!-- Badge prix haut-droite (si pas badge NOUVEAU) -->
      <div
        v-else-if="article.priceRetail > 0"
        class="article-price-badge"
        style="position:absolute;top:6px;right:6px;background:rgba(9,9,11,0.88);border:1px solid #27272a;color:#fafafa;font-size:11px;font-weight:600;padding:2px 8px;border-radius:5px"
      >{{ formatPrice(article.priceRetail) }} €</div>

      <!-- Badge prix haut-droite (si badge NOUVEAU ET prix) -->
      <div
        v-if="article.isNew && article.priceRetail > 0"
        class="article-price-badge"
        style="position:absolute;top:26px;right:6px;background:rgba(9,9,11,0.88);border:1px solid #27272a;color:#fafafa;font-size:11px;font-weight:600;padding:2px 8px;border-radius:5px"
      >{{ formatPrice(article.priceRetail) }} €</div>

      <!-- Badge stock bas-gauche -->
      <div style="position:absolute;bottom:6px;left:6px;display:flex;align-items:center;gap:4px">
        <span
          class="article-stock-dot"
          :style="{
            width: '7px', height: '7px', borderRadius: '50%',
            background: inStock ? '#10b981' : '#3f3f46',
            flexShrink: 0
          }"
        />
        <span v-if="inStock" style="font-size:10px;color:#10b981;font-weight:500">En stock</span>
      </div>
    </div>

    <!-- Zone infos -->
    <div style="padding:10px 12px;display:flex;flex-direction:column;gap:4px;flex:1">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0">
        <span class="article-manufacturer" style="font-size:10px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.05em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:1">
          {{ article.manufacturer }}
        </span>
        <span class="article-motonet" style="font-size:10px;font-family:monospace;color:#52525b;white-space:nowrap;flex-shrink:0">
          {{ article.motonet }}
        </span>
      </div>

      <div class="line-clamp-2" style="font-size:13px;color:#fafafa;line-height:1.4;min-height:2.8em">
        {{ article.name }}
      </div>

      <div
        v-if="article.original"
        class="article-oem"
        style="font-size:10px;font-family:monospace;color:#52525b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
      >OEM {{ article.original }}</div>

      <div style="margin-top:auto;padding-top:6px;display:flex;align-items:center;gap:4px">
        <span class="pi pi-barcode" style="font-size:11px;color:#3f3f46" />
        <span style="font-size:10px;font-family:monospace;color:#3f3f46">{{ article.barcode || '—' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  article: { type: Object, required: true }
})

defineEmits(['open'])

const hovered  = ref(false)
const imgError = ref(false)

const inStock = computed(() =>
  (props.article.stockChorzow ?? 0) > 0 || (props.article.stockHub ?? 0) > 0
)

function formatPrice(val) {
  return Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>
