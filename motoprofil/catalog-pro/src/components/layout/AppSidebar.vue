<template>
  <aside :class="['app-sidebar', { collapsed, 'mobile-open': mobileOpen }]">
    <nav class="sidebar-nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        custom
        v-slot="{ isActive, navigate }"
      >
        <button
          :class="['nav-item', { active: isActive, collapsed }]"
          @click="() => { navigate(); $emit('close') }"
          :title="collapsed ? item.label : undefined"
          v-tooltip.right="collapsed ? item.label : undefined"
        >
          <span :class="['pi', item.icon]" class="nav-icon" />
          <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
        </button>
      </RouterLink>
    </nav>

    <div :class="['sidebar-footer', { collapsed }]">
      <template v-if="catalogStore.ready">
        <div class="status-row">
          <span class="status-dot" />
          <span v-if="!collapsed" class="status-label">
            {{ catalogStore.total.toLocaleString('fr-FR') }} articles
          </span>
        </div>
      </template>
      <template v-else>
        <div class="status-row">
          <span class="pi pi-spin pi-spinner" style="font-size:12px;color:#71717a;flex-shrink:0" />
          <span v-if="!collapsed" class="status-label">Chargement…</span>
        </div>
      </template>

      <!-- Toggle desktop uniquement -->
      <button
        v-if="!mobileOpen"
        class="toggle-btn"
        @click="$emit('toggle')"
        :title="collapsed ? 'Développer' : 'Réduire'"
      >
        <span :class="['pi', collapsed ? 'pi-chevron-right' : 'pi-chevron-left']" style="font-size:12px" />
      </button>
    </div>
  </aside>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { useCatalogStore } from '../../stores/catalog.js'

defineProps({
  collapsed:   { type: Boolean, default: false },
  mobileOpen:  { type: Boolean, default: false }
})
defineEmits(['toggle', 'close'])

const catalogStore = useCatalogStore()

const navItems = [
  { path: '/',           label: 'Recherche',  icon: 'pi-search' },
  { path: '/parcourir',  label: 'Parcourir',  icon: 'pi-th-large' },
  { path: '/dashboard',  label: 'Dashboard',  icon: 'pi-chart-bar' },
  { path: '/analyse',    label: 'Analyse',    icon: 'pi-chart-scatter' },
  { path: '/qualite',    label: 'Qualité',    icon: 'pi-star' },
  { path: '/export',     label: 'Export',     icon: 'pi-download' },
  { path: '/parametres', label: 'Paramètres', icon: 'pi-cog' }
]
</script>

<style scoped>
.app-sidebar {
  width: 220px;
  min-width: 220px;
  background: #111113;
  border-right: 1px solid #27272a;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease, min-width 0.2s ease;
  overflow: hidden;
  z-index: 200;
}

.app-sidebar.collapsed {
  width: 56px;
  min-width: 56px;
}

/* Mobile : cachée par défaut, drawer overlay quand open */
@media (max-width: 767px) {
  .app-sidebar {
    position: fixed;
    top: 52px;
    left: 0;
    bottom: 0;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    width: 240px;
    min-width: 240px;
    z-index: 200;
  }

  .app-sidebar.mobile-open {
    transform: translateX(0);
  }
}

.sidebar-nav {
  flex: 1;
  padding: 8px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 16px;
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  color: #a1a1aa;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  text-align: left;
  outline: none;
}

.nav-item.collapsed {
  padding: 11px 0;
  justify-content: center;
}

.nav-item:hover { background: rgba(255,255,255,0.04); color: #fafafa; }

.nav-item.active {
  background: rgba(16,185,129,0.1);
  border-left-color: #10b981;
  color: #10b981;
}

.nav-icon { font-size: 18px; flex-shrink: 0; }
.nav-label { white-space: nowrap; }

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sidebar-footer.collapsed {
  padding: 12px 0;
  justify-content: center;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  flex-shrink: 0;
}

.status-label {
  font-size: 11px;
  color: #71717a;
  white-space: nowrap;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: #3f3f46;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}
</style>
