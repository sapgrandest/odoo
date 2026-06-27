import http from 'http'

/**
 * Crée un mini serveur HTTP connect-compatible pour les tests d'intégration.
 * Même pattern que server.js pour garantir la fidélité avec la prod.
 */
export function createTestApp() {
  const stack = []
  function app(req, res) {
    let i = 0
    function next() {
      const fn = stack[i++]
      if (!fn) { res.statusCode = 404; res.end('Not Found'); return }
      try { fn(req, res, next) } catch (e) {
        if (!res.headersSent) { res.statusCode = 500; res.end(e.message) }
      }
    }
    next()
  }
  app.use = fn => { stack.push(fn); return app }
  return app
}

export function startServer(app) {
  return new Promise(resolve => {
    const server = http.createServer(app)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` })
    })
  })
}

export function stopServer(server) {
  return new Promise(resolve => server.close(resolve))
}

export async function get(baseUrl, path) {
  const res = await fetch(`${baseUrl}${path}`)
  const contentType = res.headers.get('content-type') || ''
  const headers = Object.fromEntries(res.headers.entries())
  const body = contentType.includes('application/json')
    ? await res.json()
    : await res.text()
  return { status: res.status, body, headers }
}

export async function post(baseUrl, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  return { status: res.status, body: json }
}
