import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('pa_token') || '')
  const tokenExpiry = ref(Number(localStorage.getItem('pa_token_expiry')) || 0)
  const username = ref(localStorage.getItem('pa_username') || '')
  const autoLoginPending = ref(false)

  const isAuthenticated = computed(() => !!token.value && Date.now() < tokenExpiry.value)

  const expiresIn = computed(() => {
    if (!isAuthenticated.value) return 0
    return Math.floor((tokenExpiry.value - Date.now()) / 1000)
  })

  const expiresFormatted = computed(() => {
    const secs = expiresIn.value
    if (secs <= 0) return 'expiré'
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  })

  async function login(user, pass) {
    const body = new URLSearchParams({
      grant_type: 'password',
      scope: 'openid api.article api.cdn pbapi',
      username: user,
      password: pass
    })

    const res = await fetch('/auth/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Authentification échouée : ${err}`)
    }

    const data = await res.json()
    const expiry = Date.now() + (data.expires_in || 28800) * 1000

    token.value = data.access_token
    tokenExpiry.value = expiry
    username.value = user

    localStorage.setItem('pa_token', data.access_token)
    localStorage.setItem('pa_token_expiry', String(expiry))
    localStorage.setItem('pa_username', user)
  }

  function logout() {
    token.value = ''
    tokenExpiry.value = 0
    username.value = ''
    localStorage.removeItem('pa_token')
    localStorage.removeItem('pa_token_expiry')
    localStorage.removeItem('pa_username')
  }

  async function autoLogin() {
    if (isAuthenticated.value) return
    const user = import.meta.env.VITE_PA_USERNAME
    const pass = import.meta.env.VITE_PA_PASSWORD
    if (!user || !pass) return
    autoLoginPending.value = true
    try {
      await login(user, pass)
    } catch {
      // silencieux
    } finally {
      autoLoginPending.value = false
    }
  }

  return {
    token,
    tokenExpiry,
    username,
    autoLoginPending,
    isAuthenticated,
    expiresIn,
    expiresFormatted,
    login,
    logout,
    autoLogin
  }
})
