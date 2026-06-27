import { useAuthStore } from '../stores/auth.js'
import { storeToRefs } from 'pinia'

export function useAuth() {
  const store = useAuthStore()
  const { isAuthenticated, expiresFormatted, username, autoLoginPending } = storeToRefs(store)

  return {
    isAuthenticated,
    expiresFormatted,
    username,
    autoLoginPending,
    autoLogin: store.autoLogin
  }
}
