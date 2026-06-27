import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateCsv } from '../fixtures/articles.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = path.join(__dirname, '../fixtures/sample.csv')

export async function setup() {
  fs.writeFileSync(FIXTURE_PATH, generateCsv(), 'utf8')
  console.log('[test-setup] Fixture CSV écrit →', FIXTURE_PATH)
}
