<template>
  <header class="app-header">
    <!-- Hamburger (mobile uniquement) -->
    <button v-if="showHamburger" class="hamburger" @click="$emit('toggle-sidebar')" aria-label="Menu">
      <span class="pi pi-bars" style="font-size:18px;color:#a1a1aa" />
    </button>

    <!-- Logo -->
    <div class="logo">
      <span class="pi pi-car" style="font-size:20px;color:#10b981;flex-shrink:0" />
      <div class="logo-text">
        <span class="logo-title">ProfiAuto Catalog Pro</span>
        <span class="logo-sub">Moto-Profil / SAP Grand Est</span>
      </div>
    </div>

    <!-- Titre de la page -->
    <div class="page-title">
      <slot name="title" />
    </div>

    <!-- Auth -->
    <div class="auth-area">
      <template v-if="autoLoginPending">
        <span class="pi pi-spin pi-spinner" style="font-size:16px;color:#71717a" />
      </template>
      <template v-else-if="isAuthenticated">
        <span class="dot green" />
        <div class="user-info">
          <span class="user-name">{{ username }}</span>
          <span class="user-expires">{{ expiresFormatted }}</span>
        </div>
        <button class="btn-auth" @click="auth.logout()" title="Déconnexion">
          <span class="pi pi-sign-out" style="font-size:11px" />
          <span class="btn-label">Déconnexion</span>
        </button>
      </template>
      <template v-else>
        <span class="dot red" />
        <button class="btn-auth" @click="auth.autoLogin()">
          <span class="pi pi-sign-in" style="font-size:11px" />
          <span class="btn-label">Connexion</span>
        </button>
      </template>
    </div>
  </header>
</template>

<script setup>
import { useAuthStore } from '../../stores/auth.js'
import { useAuth } from '../../composables/useAuth.js'

defineProps({
  showHamburger: { type: Boolean, default: false }
})
defineEmits(['toggle-sidebar'])

const auth = useAuthStore()
const { isAuthenticated, expiresFormatted, username, autoLoginPending } = useAuth()
</script>

<style scoped>
.app-header {
  height: 52px;
  background: #111113;
  border-bottom: 1px solid #27272a;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  flex-shrink: 0;
  z-index: 200;
}

.hamburger {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.hamburger:hover { background: #1c1c1f; }

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.logo-title {
  font-size: 13px;
  font-weight: 700;
  color: #fafafa;
  white-space: nowrap;
}

.logo-sub {
  font-size: 10px;
  color: #71717a;
  white-space: nowrap;
}

.page-title {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.auth-area {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot.green { background: #10b981; }
.dot.red   { background: #ef4444; }

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  align-items: flex-end;
}
.user-name    { font-size: 12px; color: #fafafa; white-space: nowrap; }
.user-expires { font-size: 10px; color: #71717a; white-space: nowrap; }

.btn-auth {
  background: transparent;
  border: 1px solid #27272a;
  color: #71717a;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Mobile : masquer logo-text, user-info, btn-label */
@media (max-width: 767px) {
  .logo-text  { display: none; }
  .user-info  { display: none; }
  .btn-label  { display: none; }
  .app-header { gap: 8px; padding: 0 10px; }
}
</style>
