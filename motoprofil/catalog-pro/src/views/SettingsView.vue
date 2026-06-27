<template>
  <AppLayout>
    <template #title>
      <span style="font-size:14px;font-weight:600;color:#fafafa">Paramètres</span>
    </template>

    <div style="padding:24px;max-width:860px;margin:0 auto">

      <div style="margin-bottom:24px">
        <div style="font-size:20px;font-weight:700;color:#fafafa">Paramètres</div>
        <div style="font-size:13px;color:#71717a;margin-top:2px">Configuration de l'outil de visualisation</div>
      </div>

      <!-- Connexion ProfiAuto -->
      <div :style="cardStyle" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
          <span class="pi pi-shield" style="font-size:16px;color:#60a5fa" />
          <div style="font-size:15px;font-weight:600;color:#fafafa">Connexion ProfiAuto</div>
        </div>

        <div v-if="authStore.isAuthenticated">
          <div style="display:flex;align-items:center;gap:16px;padding:14px 16px;background:#1c1c1f;border-radius:10px;border:1px solid #27272a;margin-bottom:16px">
            <span style="width:10px;height:10px;border-radius:50%;background:#10b981;flex-shrink:0" />
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;color:#fafafa">{{ authStore.username }}</div>
              <div style="font-size:11px;color:#71717a;margin-top:2px">
                Token valide encore <span style="color:#10b981;font-weight:500">{{ authStore.expiresFormatted }}</span>
              </div>
            </div>
            <button @click="handleLogout" :style="dangerBtnStyle">
              <span class="pi pi-sign-out" style="font-size:12px" />
              Se déconnecter
            </button>
          </div>

          <div style="padding:10px 14px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:8px;font-size:11px;color:#71717a">
            <span style="color:#10b981;font-weight:500">Scope :</span>
            <code style="color:#a1a1aa;margin-left:6px">openid api.article api.cdn pbapi</code>
            <span style="display:block;margin-top:4px">Token valide 8h, renouvelé automatiquement au démarrage.</span>
          </div>
        </div>

        <div v-else>
          <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:8px;margin-bottom:20px">
            <span style="width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0" />
            <span style="font-size:12px;color:#ef4444">Non connecté</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:12px;max-width:360px">
            <div>
              <label style="font-size:11px;color:#71717a;display:block;margin-bottom:4px">Identifiant</label>
              <InputText
                v-model="loginForm.username"
                placeholder="Nom d'utilisateur"
                style="width:100%;background:#1c1c1f;border-color:#27272a;color:#fafafa;font-size:13px"
              />
            </div>
            <div>
              <label style="font-size:11px;color:#71717a;display:block;margin-bottom:4px">Mot de passe</label>
              <Password
                v-model="loginForm.password"
                placeholder="Mot de passe"
                :feedback="false"
                toggleMask
                style="width:100%"
                :inputStyle="{ width:'100%', background:'#1c1c1f', borderColor:'#27272a', color:'#fafafa', fontSize:'13px' }"
              />
            </div>
            <button @click="handleLogin" :style="primaryBtnStyle" :disabled="loginLoading">
              <span :class="['pi', loginLoading ? 'pi-spin pi-spinner' : 'pi-sign-in']" style="font-size:13px" />
              {{ loginLoading ? 'Connexion…' : 'Se connecter' }}
            </button>
          </div>

          <div style="margin-top:12px;font-size:11px;color:#52525b">
            Scope utilisé : <code style="color:#71717a">openid api.article api.cdn pbapi</code>
            <br>Token valide 8h, renouvelé automatiquement au démarrage.
          </div>
        </div>
      </div>

      <!-- Catalogue PB Offer -->
      <div :style="cardStyle" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
          <span class="pi pi-database" style="font-size:16px;color:#10b981" />
          <div style="font-size:15px;font-weight:600;color:#fafafa">Catalogue PB Offer</div>
        </div>

        <!-- Zone upload drag & drop -->
        <div
          class="drop-zone"
          :class="{ 'drop-zone--over': dragOver, 'drop-zone--uploading': uploadPhase === 'uploading' }"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
          @click="fileInputRef?.click()"
        >
          <input ref="fileInputRef" type="file" accept=".csv" style="display:none" @change="onFileInput" />
          <template v-if="uploadPhase === 'idle'">
            <span class="pi pi-upload" style="font-size:28px;color:#3f3f46;margin-bottom:8px" />
            <div style="font-size:13px;color:#71717a;font-weight:500">Déposer un fichier CSV ici</div>
            <div style="font-size:11px;color:#52525b;margin-top:4px">ou cliquer pour parcourir</div>
          </template>
          <template v-else-if="uploadPhase === 'uploading'">
            <span class="pi pi-spin pi-spinner" style="font-size:22px;color:#10b981;margin-bottom:8px" />
            <div style="font-size:13px;color:#a1a1aa;margin-bottom:10px">Envoi du fichier… {{ uploadPct }}%</div>
            <div class="prog-bar-bg"><div class="prog-bar-fg" :style="{ width: uploadPct + '%', background: '#10b981' }" /></div>
          </template>
          <template v-else-if="uploadPhase === 'parsing'">
            <span class="pi pi-spin pi-spinner" style="font-size:22px;color:#60a5fa;margin-bottom:8px" />
            <div style="font-size:13px;color:#a1a1aa;margin-bottom:4px">Indexation du catalogue…</div>
            <div style="font-size:20px;font-weight:700;color:#60a5fa;margin-bottom:10px">
              {{ parsedCount.toLocaleString('fr-FR') }} articles
            </div>
            <div class="prog-bar-bg"><div class="prog-bar-fg prog-bar-anim" style="background:#60a5fa" /></div>
          </template>
          <template v-else-if="uploadPhase === 'done'">
            <span class="pi pi-check-circle" style="font-size:28px;color:#10b981;margin-bottom:8px" />
            <div style="font-size:13px;color:#10b981;font-weight:600">Catalogue chargé !</div>
            <div style="font-size:11px;color:#71717a;margin-top:4px">{{ parsedCount.toLocaleString('fr-FR') }} articles indexés</div>
          </template>
          <template v-else-if="uploadPhase === 'error'">
            <span class="pi pi-times-circle" style="font-size:28px;color:#ef4444;margin-bottom:8px" />
            <div style="font-size:13px;color:#ef4444;font-weight:600">Erreur</div>
            <div style="font-size:11px;color:#71717a;margin-top:4px">{{ uploadError }}</div>
          </template>
        </div>

        <!-- Ou chemin absolu (serveur local) -->
        <div style="margin:16px 0 4px;display:flex;align-items:center;gap:10px">
          <div style="flex:1;height:1px;background:#27272a" />
          <span style="font-size:11px;color:#52525b;white-space:nowrap">ou chemin absolu (serveur)</span>
          <div style="flex:1;height:1px;background:#27272a" />
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <InputText
            v-model="csvPathInput"
            placeholder="/chemin/absolu/vers/catalogue.csv"
            style="flex:1;background:#1c1c1f;border-color:#27272a;color:#fafafa;font-size:12px;font-family:monospace"
          />
          <button @click="handleReloadCatalog" :style="primaryBtnStyle" :disabled="uploadPhase === 'uploading' || uploadPhase === 'parsing'">
            <span :class="['pi', uploadPhase === 'parsing' ? 'pi-spin pi-spinner' : 'pi-refresh']" style="font-size:13px" />
            Recharger
          </button>
        </div>
        <div style="font-size:11px;color:#52525b;margin-top:4px">Chemins absolus uniquement · ex: /data/catalogue.csv</div>

        <!-- Statut courant -->
        <div style="padding:12px 16px;background:#1c1c1f;border-radius:8px;border:1px solid #27272a;margin-top:16px">
          <div style="display:flex;align-items:center;gap:8px">
            <template v-if="catalogStore.ready">
              <span style="width:8px;height:8px;border-radius:50%;background:#10b981;flex-shrink:0" />
              <span style="font-size:13px;color:#fafafa;font-weight:500">
                Chargé ·
                <span style="color:#10b981">{{ catalogStore.total.toLocaleString('fr-FR') }}</span> articles ·
                <span style="color:#60a5fa">{{ catalogStore.brandsCount.toLocaleString('fr-FR') }}</span> marques
              </span>
            </template>
            <template v-else>
              <span class="pi pi-spin pi-spinner" style="font-size:13px;color:#71717a" />
              <span style="font-size:13px;color:#71717a">Chargement du catalogue en cours…</span>
            </template>
          </div>
          <div style="font-size:11px;color:#52525b;margin-top:6px">
            Chemin actuel : <code style="color:#71717a">{{ settingsStore.csvPath || '—' }}</code>
          </div>
        </div>
      </div>

      <!-- APIs ProfiAuto -->
      <div :style="cardStyle" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
          <span class="pi pi-link" style="font-size:16px;color:#a78bfa" />
          <div style="font-size:15px;font-weight:600;color:#fafafa">APIs ProfiAuto</div>
        </div>

        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="border-bottom:1px solid #27272a">
                <th style="text-align:left;padding:8px 12px;color:#71717a;font-weight:500">Endpoint</th>
                <th style="text-align:center;padding:8px 12px;color:#71717a;font-weight:500;white-space:nowrap">Statut</th>
                <th style="text-align:left;padding:8px 12px;color:#71717a;font-weight:500">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="api in apiEndpoints" :key="api.endpoint" style="border-bottom:1px solid #1c1c1f">
                <td style="padding:10px 12px">
                  <code style="font-size:11px;color:#a1a1aa">{{ api.endpoint }}</code>
                </td>
                <td style="padding:10px 12px;text-align:center;white-space:nowrap">
                  <span :style="api.ok ? statusOkStyle : statusErrStyle">
                    {{ api.ok ? '🟢 OK' : '🔴 Erreur' }}
                  </span>
                </td>
                <td style="padding:10px 12px;color:#71717a">{{ api.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="margin-top:12px;padding:10px 14px;background:#1c1c1f;border-radius:8px;font-size:11px;color:#52525b">
          Les APIs SOAP (<code style="color:#71717a">ws1.moto-profil.pl</code>) nécessitent le compte MOTONET 0ACU pour les données stock temps réel.
        </div>
      </div>

      <!-- À propos -->
      <div :style="cardStyle">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
          <span class="pi pi-info-circle" style="font-size:16px;color:#fb923c" />
          <div style="font-size:15px;font-weight:600;color:#fafafa">À propos</div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px">
          <div :style="aboutRowStyle">
            <span style="font-size:12px;color:#71717a">Version</span>
            <span style="font-size:12px;color:#fafafa;font-weight:500">1.0.0</span>
          </div>
          <div :style="aboutRowStyle">
            <span style="font-size:12px;color:#71717a">Catalogue source</span>
            <span style="font-size:12px;color:#fafafa">PB Offer 2026-06-27</span>
          </div>
          <div :style="aboutRowStyle">
            <span style="font-size:12px;color:#71717a">Projet</span>
            <span style="font-size:12px;color:#fafafa">Moto-Profil / SAP Grand Est</span>
          </div>
          <div style="margin-top:8px;padding:10px 14px;background:rgba(251,146,60,0.06);border:1px solid rgba(251,146,60,0.15);border-radius:8px;font-size:11px;color:#71717a">
            Les images produits sont issues de la base TecDoc et restent la propriété de leurs détenteurs respectifs.
            Leur utilisation est soumise aux conditions d'utilisation TecDoc / ProfiAuto.
          </div>
        </div>
      </div>

    </div>

    <Toast />
  </AppLayout>
</template>

<style scoped>
.drop-zone {
  border: 2px dashed #27272a;
  border-radius: 12px;
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: #0d0d0f;
  user-select: none;
}
.drop-zone:hover,
.drop-zone--over {
  border-color: #10b981;
  background: rgba(16,185,129,0.04);
}
.drop-zone--uploading {
  cursor: default;
  border-color: #10b981;
}

.prog-bar-bg {
  width: 100%;
  max-width: 260px;
  height: 5px;
  border-radius: 3px;
  background: #27272a;
  overflow: hidden;
}
.prog-bar-fg {
  height: 100%;
  border-radius: 3px;
  transition: width 0.15s;
}
.prog-bar-anim {
  width: 60%;
  animation: slide 1.2s ease-in-out infinite;
}
@keyframes slide {
  0%   { transform: translateX(-100%) }
  100% { transform: translateX(200%) }
}
</style>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'

import AppLayout from '../components/layout/AppLayout.vue'
import { useAuthStore } from '../stores/auth.js'
import { useCatalogStore } from '../stores/catalog.js'
import { useSettingsStore } from '../stores/settings.js'

const toast = useToast()
const authStore = useAuthStore()
const catalogStore = useCatalogStore()
const settingsStore = useSettingsStore()

const csvPathInput = ref(settingsStore.csvPath)
const loginLoading = ref(false)

// Upload state
const fileInputRef = ref(null)
const dragOver = ref(false)
// phases: idle | uploading | parsing | done | error
const uploadPhase = ref('idle')
const uploadPct = ref(0)
const parsedCount = ref(0)
const uploadError = ref('')
let pollTimer = null

const loginForm = ref({ username: '', password: '' })

async function handleLogin() {
  if (!loginForm.value.username || !loginForm.value.password) return
  loginLoading.value = true
  try {
    await authStore.login(loginForm.value.username, loginForm.value.password)
    toast.add({ severity: 'success', summary: 'Connecté', detail: `Bonjour ${authStore.username}`, life: 3000 })
    loginForm.value = { username: '', password: '' }
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erreur de connexion', detail: err.message, life: 5000 })
  } finally {
    loginLoading.value = false
  }
}

function handleLogout() {
  authStore.logout()
  toast.add({ severity: 'info', summary: 'Déconnecté', detail: 'Session ProfiAuto terminée', life: 3000 })
}

function startPollingStatus() {
  stopPolling()
  uploadPhase.value = 'parsing'
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/catalog/status')
      const data = await res.json()
      parsedCount.value = data.loading?.loaded ?? data.total ?? 0
      if (data.loading?.status === 'error') {
        uploadPhase.value = 'error'
        uploadError.value = data.loading.error || 'Erreur inconnue'
        stopPolling()
      } else if (data.ready) {
        parsedCount.value = data.total
        uploadPhase.value = 'done'
        stopPolling()
        catalogStore.startPolling()
        setTimeout(() => { uploadPhase.value = 'idle' }, 3000)
      }
    } catch { /* ignore */ }
  }, 800)
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

onUnmounted(stopPolling)

function onDrop(e) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) uploadFile(file)
}

function onFileInput(e) {
  const file = e.target?.files?.[0]
  if (file) uploadFile(file)
  e.target.value = ''
}

function uploadFile(file) {
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    toast.add({ severity: 'warn', summary: 'Fichier invalide', detail: 'Seuls les fichiers .csv sont acceptés', life: 3000 })
    return
  }
  uploadPhase.value = 'uploading'
  uploadPct.value = 0
  uploadError.value = ''

  const xhr = new XMLHttpRequest()
  xhr.open('POST', '/api/catalog/upload')
  xhr.setRequestHeader('Content-Type', 'text/csv')

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) uploadPct.value = Math.round((e.loaded / e.total) * 100)
  })

  xhr.onload = () => {
    if (xhr.status === 200) {
      startPollingStatus()
    } else {
      uploadPhase.value = 'error'
      uploadError.value = xhr.responseText || `HTTP ${xhr.status}`
    }
  }
  xhr.onerror = () => {
    uploadPhase.value = 'error'
    uploadError.value = 'Erreur réseau pendant l\'upload'
  }

  xhr.send(file)
}

async function handleReloadCatalog() {
  if (!csvPathInput.value) {
    toast.add({ severity: 'warn', summary: 'Chemin requis', detail: 'Renseignez le chemin du fichier CSV', life: 3000 })
    return
  }
  try {
    await settingsStore.updateCsvPath(csvPathInput.value)
    startPollingStatus()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erreur', detail: err.message, life: 5000 })
  }
}

const apiEndpoints = [
  {
    endpoint: 'article.profiauto.com/Offer/GetArticleDetailsForList',
    ok: true,
    description: 'Images + métadonnées articles'
  },
  {
    endpoint: 'article.profiauto.com/Offer/GetGraphics',
    ok: true,
    description: 'Toutes les images par elId'
  },
  {
    endpoint: 'id.profiauto.pl/connect/token',
    ok: true,
    description: 'Auth OAuth2 ROPC (8h)'
  }
]

const cardStyle = {
  background: '#111113',
  border: '1px solid #27272a',
  borderRadius: '12px',
  padding: '24px'
}

const primaryBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  fontSize: '13px',
  background: 'rgba(16,185,129,0.1)',
  border: '1px solid rgba(16,185,129,0.3)',
  borderRadius: '8px',
  color: '#10b981',
  cursor: 'pointer',
  fontWeight: '500',
  whiteSpace: 'nowrap'
}

const dangerBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  fontSize: '12px',
  background: 'rgba(239,68,68,0.08)',
  border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: '6px',
  color: '#ef4444',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
}

const statusOkStyle = {
  fontSize: '12px',
  color: '#10b981',
  fontWeight: '500'
}

const statusErrStyle = {
  fontSize: '12px',
  color: '#ef4444',
  fontWeight: '500'
}

const aboutRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid #1c1c1f'
}
</script>
