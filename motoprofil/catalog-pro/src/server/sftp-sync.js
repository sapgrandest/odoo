import SftpClient from 'ssh2-sftp-client'
import fs from 'fs'
import path from 'path'
import { startLoadBackground } from './catalog.js'

const {
  SFTP_HOST,
  SFTP_PORT = '2222',
  SFTP_USER,
  SFTP_PASSWORD,
  SFTP_REMOTE_PATH = '/motoprofil/catalogue.csv',
  CSV_PATH = '/data/catalogue.csv',
  SFTP_SYNC_INTERVAL = '3600'
} = process.env

export async function syncNow() {
  const sftp = new SftpClient()
  try {
    console.log(`[sftp-sync] Connexion ${SFTP_HOST}:${SFTP_PORT}…`)
    await sftp.connect({
      host: SFTP_HOST,
      port: parseInt(SFTP_PORT),
      username: SFTP_USER,
      password: SFTP_PASSWORD,
      readyTimeout: 20000,
    })

    const tmpPath = CSV_PATH + '.tmp'
    fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true })
    await sftp.fastGet(SFTP_REMOTE_PATH, tmpPath)
    fs.renameSync(tmpPath, CSV_PATH)
    console.log(`[sftp-sync] CSV téléchargé → ${CSV_PATH}`)
    startLoadBackground(CSV_PATH)
  } catch (err) {
    console.error('[sftp-sync] Erreur:', err.message)
  } finally {
    await sftp.end().catch(() => {})
  }
}

// Conservé comme fallback si besoin de polling manuel.
// En prod, utiliser le webhook SFTPGo → POST /api/catalog/reload.
export function startSftpSync() {
  const intervalMs = parseInt(SFTP_SYNC_INTERVAL) * 1000
  console.log(`[sftp-sync] Polling démarré — toutes les ${SFTP_SYNC_INTERVAL}s`)
  syncNow()
  setInterval(syncNow, intervalMs)
}
