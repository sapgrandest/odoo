import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_CSV = path.join(__dirname, 'tests/fixtures/sample.csv')

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      CSV_PATH: FIXTURE_CSV,
      DB_PATH: ':memory:',
    },
    // Threads (même process que vitest = node v20 nvm) évite le conflit NMV
    // avec better-sqlite3 compilé pour v20. Chaque fichier a son propre
    // contexte vm + DB :memory: → isolation complète.
    pool: 'threads',
    poolOptions: { threads: { isolate: true, singleThread: false } },
    globalSetup: './tests/setup/global.js',
    include: ['tests/**/*.test.js'],
    testTimeout: 30000,
    reporters: ['verbose'],
  },
})
