import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createCatalogServer } from './src/server/catalog.js'
import { createStatsServer } from './src/server/stats.js'

const catalogApiPlugin = {
  name: 'catalog-api',
  configureServer(server) {
    createCatalogServer(server.middlewares)
    createStatsServer(server.middlewares)
  }
}

export default defineConfig({
  plugins: [vue(), catalogApiPlugin],
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'https://id.profiauto.pl',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth/, '')
      }
    }
  }
})
