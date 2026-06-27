<template>
  <nav v-if="isMobile" class="bottom-nav">
    <!-- Tab : Recherche -->
    <RouterLink to="/" custom v-slot="{ isExactActive, navigate }">
      <button
        :class="['bottom-tab', { active: isExactActive }]"
        @click="navigate"
      >
        <span v-if="isExactActive" class="tab-indicator" />
        <span class="pi pi-search tab-icon" />
        <span class="tab-label">Recherche</span>
      </button>
    </RouterLink>

    <!-- Tab : Parcourir -->
    <RouterLink to="/parcourir" custom v-slot="{ isActive, navigate }">
      <button
        :class="['bottom-tab', { active: isActive }]"
        @click="navigate"
      >
        <span v-if="isActive" class="tab-indicator" />
        <span class="pi pi-th-large tab-icon" />
        <span class="tab-label">Parcourir</span>
      </button>
    </RouterLink>

    <!-- Tab : Dashboard -->
    <RouterLink to="/dashboard" custom v-slot="{ isActive, navigate }">
      <button
        :class="['bottom-tab', { active: isActive }]"
        @click="navigate"
      >
        <span v-if="isActive" class="tab-indicator" />
        <span class="pi pi-chart-bar tab-icon" />
        <span class="tab-label">Dashboard</span>
      </button>
    </RouterLink>

    <!-- Tab : Plus -->
    <button
      :class="['bottom-tab', { active: isMoreActive || morePanelOpen }]"
      @click="toggleMorePanel"
    >
      <span v-if="isMoreActive || morePanelOpen" class="tab-indicator" />
      <span class="pi pi-ellipsis-h tab-icon" />
      <span class="tab-label">Plus</span>
    </button>

    <!-- Overlay semi-transparent -->
    <Transition name="overlay-fade">
      <div
        v-if="morePanelOpen"
        class="more-overlay"
        @click="morePanelOpen = false"
      />
    </Transition>

    <!-- Panneau slide-up -->
    <Transition name="panel-slide">
      <div v-if="morePanelOpen" class="more-panel">
        <div class="more-panel-handle" />
        <div class="more-panel-items">
          <RouterLink to="/analyse" custom v-slot="{ isActive, navigate }">
            <button
              :class="['more-item', { active: isActive }]"
              @click="() => { navigate(); morePanelOpen = false }"
            >
              <span class="pi pi-chart-scatter more-icon" />
              <span class="more-label">Analyse</span>
            </button>
          </RouterLink>

          <RouterLink to="/qualite" custom v-slot="{ isActive, navigate }">
            <button
              :class="['more-item', { active: isActive }]"
              @click="() => { navigate(); morePanelOpen = false }"
            >
              <span class="pi pi-star more-icon" />
              <span class="more-label">Qualité</span>
            </button>
          </RouterLink>

          <RouterLink to="/export" custom v-slot="{ isActive, navigate }">
            <button
              :class="['more-item', { active: isActive }]"
              @click="() => { navigate(); morePanelOpen = false }"
            >
              <span class="pi pi-download more-icon" />
              <span class="more-label">Export</span>
            </button>
          </RouterLink>

          <RouterLink to="/parametres" custom v-slot="{ isActive, navigate }">
            <button
              :class="['more-item', { active: isActive }]"
              @click="() => { navigate(); morePanelOpen = false }"
            >
              <span class="pi pi-cog more-icon" />
              <span class="more-label">Paramètres</span>
            </button>
          </RouterLink>
        </div>
      </div>
    </Transition>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useBreakpoint } from '../../composables/useBreakpoint.js'

const { isMobile } = useBreakpoint()
const route = useRoute()

const morePanelOpen = ref(false)

const moreRoutes = ['/analyse', '/qualite', '/export', '/parametres']
const isMoreActive = computed(() => moreRoutes.includes(route.path))

function toggleMorePanel() {
  morePanelOpen.value = !morePanelOpen.value
}
</script>

<style scoped>
/* ─── Barre de navigation fixe ──────────────────────────────────────── */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: #111113;
  border-top: 1px solid #27272a;
  display: flex;
  align-items: stretch;
  z-index: 300;
}

/* ─── Onglets ────────────────────────────────────────────────────────── */
.bottom-tab {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #71717a;
  padding: 4px 0;
  transition: color 0.15s;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.bottom-tab.active {
  color: #10b981;
}

.bottom-tab:active {
  opacity: 0.7;
}

/* Indicateur 2px en haut de l'onglet actif */
.tab-indicator {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 2px;
  background: #10b981;
  border-radius: 0 0 2px 2px;
}

.tab-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.tab-label {
  font-size: 9px;
  font-weight: 500;
  white-space: nowrap;
  line-height: 1;
}

/* ─── Overlay sombre ─────────────────────────────────────────────────── */
.more-overlay {
  position: fixed;
  inset: 0;
  bottom: 56px;
  background: rgba(0, 0, 0, 0.6);
  z-index: 299;
}

/* ─── Panneau "Plus" slide-up ────────────────────────────────────────── */
.more-panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 56px;
  background: #111113;
  border-top: 1px solid #27272a;
  border-radius: 16px 16px 0 0;
  z-index: 300;
  padding: 8px 0 16px;
}

.more-panel-handle {
  width: 36px;
  height: 4px;
  background: #3f3f46;
  border-radius: 2px;
  margin: 0 auto 12px;
}

.more-panel-items {
  display: flex;
  flex-direction: column;
}

.more-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 24px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #a1a1aa;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  outline: none;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}

.more-item:hover,
.more-item:active {
  background: rgba(255, 255, 255, 0.04);
  color: #fafafa;
}

.more-item.active {
  color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.more-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.more-label {
  white-space: nowrap;
}

/* ─── Transitions ─────────────────────────────────────────────────────── */
.overlay-fade-enter-active,
.overlay-fade-leave-active { transition: opacity 0.25s; }
.overlay-fade-enter-from,
.overlay-fade-leave-to     { opacity: 0; }

.panel-slide-enter-active,
.panel-slide-leave-active { transition: transform 0.25s ease; }
.panel-slide-enter-from,
.panel-slide-leave-to     { transform: translateY(100%); }
</style>
