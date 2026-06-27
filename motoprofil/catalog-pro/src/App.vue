<template>
  <div class="dark">
    <RouterView />
    <Toast position="bottom-right" />
  </div>
</template>

<script setup>
import Toast from 'primevue/toast'
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth.js'
import { useCatalogStore } from './stores/catalog.js'

const auth = useAuthStore()
const catalog = useCatalogStore()

onMounted(async () => {
  await auth.autoLogin()
  catalog.startPolling()
})
</script>
