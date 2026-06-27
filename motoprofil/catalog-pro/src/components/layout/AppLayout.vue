<template>
  <div class="app-root">
    <AppHeader @toggle-sidebar="toggleSidebar" :show-hamburger="isMobile" />

    <div class="app-body">
      <!-- Backdrop mobile -->
      <Transition name="backdrop">
        <div
          v-if="isMobile && mobileOpen"
          class="sidebar-backdrop"
          @click="mobileOpen = false"
        />
      </Transition>

      <!-- Sidebar -->
      <AppSidebar
        :collapsed="!isMobile && collapsed"
        :mobile-open="isMobile && mobileOpen"
        @toggle="toggleSidebar"
        @close="mobileOpen = false"
      />

      <main class="app-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useBreakpoint } from '../../composables/useBreakpoint.js'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'

const { isMobile } = useBreakpoint()

const collapsed   = ref(false)
const mobileOpen  = ref(false)

function toggleSidebar() {
  if (isMobile.value) mobileOpen.value = !mobileOpen.value
  else collapsed.value = !collapsed.value
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

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 199;
}

.backdrop-enter-active,
.backdrop-leave-active { transition: opacity 0.25s; }
.backdrop-enter-from,
.backdrop-leave-to { opacity: 0; }
</style>
