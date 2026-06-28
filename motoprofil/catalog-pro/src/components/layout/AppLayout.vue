<template>
  <div class="app-root">
    <AppHeader @toggle-sidebar="toggleSidebar" :show-hamburger="!isMobile" />

    <div class="app-body">
      <!-- Sidebar (desktop uniquement) -->
      <AppSidebar
        v-if="!isMobile"
        :collapsed="collapsed"
        @toggle="toggleSidebar"
      />

      <main class="app-main">
        <slot />
      </main>
    </div>

    <!-- Navigation mobile (hors app-body pour rester au-dessus du tout) -->
    <BottomNav />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useBreakpoint } from '../../composables/useBreakpoint.js'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import BottomNav from './BottomNav.vue'

const { isMobile } = useBreakpoint()

const collapsed = ref(false)

function toggleSidebar() {
  if (!isMobile.value) collapsed.value = !collapsed.value
}
</script>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
  background: #09090b;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.app-main {
  flex: 1;
  overflow: auto;
  padding: 0;
  min-width: 0;
}

/* Espace sous le contenu pour ne pas être masqué par BottomNav */
@media (max-width: 767px) {
  .app-main {
    padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
