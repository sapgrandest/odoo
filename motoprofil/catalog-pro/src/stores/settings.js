import { defineStore } from 'pinia'
import { ref } from 'vue'

const LS_KEY = 'catalog_settings'

export const useSettingsStore = defineStore('settings', () => {
  const csvPath = ref(import.meta.env.VITE_CSV_PATH || '')
  const language = ref('fr')

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved.csvPath) csvPath.value = saved.csvPath
      if (saved.language) language.value = saved.language
    } catch {
      // ignore
    }
  }

  function save(patch) {
    const current = { csvPath: csvPath.value, language: language.value }
    const updated = { ...current, ...patch }
    if ('csvPath' in patch) csvPath.value = patch.csvPath
    if ('language' in patch) language.value = patch.language
    localStorage.setItem(LS_KEY, JSON.stringify(updated))
  }

  async function updateCsvPath(path) {
    const res = await fetch('/api/catalog/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvPath: path })
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Erreur mise à jour chemin CSV : ${err}`)
    }
    save({ csvPath: path })
  }

  load()

  return {
    csvPath,
    language,
    load,
    save,
    updateCsvPath
  }
})
