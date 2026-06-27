import http from 'http'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createCatalogServer } from './src/server/catalog.js'
import { createStatsServer } from './src/server/stats.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')
const PORT = parseInt(process.env.PORT || '3000')

// Minimal connect-compatible middleware chain
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught Exception:', err.message, err.stack)
})
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled Rejection:', reason)
})

function createApp() {
  const stack = []
  function app(req, res) {
    let i = 0
    function next() {
      const fn = stack[i++]
      if (!fn) return serveStatic(req, res)
      try {
        Promise.resolve(fn(req, res, next)).catch(err => {
          console.error('[server] Async middleware error:', err.message, err.stack)
          if (!res.headersSent) { res.statusCode = 500; res.end('Internal Server Error') }
        })
      } catch (err) {
        console.error('[server] Middleware error:', err.message)
        if (!res.headersSent) { res.statusCode = 500; res.end('Internal Server Error') }
      }
    }
    next()
  }
  app.use = (fn) => { stack.push(fn); return app }
  return app
}

const app = createApp()

// API routes
createCatalogServer(app)
createStatsServer(app)

// Proxy /auth → https://id.profiauto.pl (OAuth ProfiAuto)
app.use((req, res, next) => {
  if (!req.url.startsWith('/auth')) return next()
  const targetPath = req.url.slice('/auth'.length) || '/'
  const options = {
    hostname: 'id.profiauto.pl',
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: 'id.profiauto.pl' },
  }
  delete options.headers['content-length']
  const proxy = https.request(options, (proxyRes) => {
    res.statusCode = proxyRes.statusCode
    for (const [k, v] of Object.entries(proxyRes.headers)) res.setHeader(k, v)
    proxyRes.pipe(res)
  })
  proxy.on('error', (err) => {
    if (!res.headersSent) { res.statusCode = 502; res.end(err.message) }
  })
  req.pipe(proxy)
})

// Static files + SPA fallback
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
}

function serveStatic(req, res) {
  const urlPath = req.url.split('?')[0]
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html')
  }
  const ext = path.extname(filePath)
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
  if (ext !== '.html') res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  const stream = fs.createReadStream(filePath)
  stream.on('error', () => { res.statusCode = 404; res.end('Not Found') })
  stream.pipe(res)
}

http.createServer(app).listen(PORT, '0.0.0.0', () => {
  console.log(`[catalog-pro] http://0.0.0.0:${PORT}`)
})

// Le rechargement du catalogue se fait via webhook SFTPGo → POST /api/catalog/reload.
// Le polling SFTP est supprimé. Décommenter startSftpSync() si fallback polling nécessaire.
// if (process.env.SFTP_HOST) {
//   import('./src/server/sftp-sync.js').then(m => m.startSftpSync()).catch(console.error)
// }
