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
    },
    // Integration tests get a fresh module registry (catalog has module-level state)
    pool: 'forks',
    poolOptions: { forks: { singleFork: false } },
    globalSetup: './tests/setup/global.js',
    include: ['tests/**/*.test.js'],
    testTimeout: 30000,
    reporters: ['verbose'],
  },
})
