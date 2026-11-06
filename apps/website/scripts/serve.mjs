import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const output = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' }

/** Serve the built site, including directory URLs and real 404 responses. */
export function createPreviewServer({ base = process.env.SITE_BASE || '/' } = {}) {
  return createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end()
        return
      }
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      let file = pathname.startsWith(base) ? path.resolve(output, `.${path.sep}${pathname.slice(base.length)}`) : ''
      if (!file || (file !== output && !file.startsWith(`${output}${path.sep}`))) {
        response.writeHead(404).end('Not found')
        return
      }
      const info = await stat(file).catch(() => undefined)
      if (info?.isDirectory()) {
        if (!pathname.endsWith('/')) {
          response.writeHead(308, { Location: `${pathname}/${new URL(request.url, 'http://localhost').search}` }).end()
          return
        }
        file = path.join(file, 'index.html')
      }
      const content = await readFile(file).catch(() => undefined)
      const body = content ?? await readFile(path.join(output, '404.html'))
      response.writeHead(content ? 200 : 404, { 'Content-Type': `${content ? types[path.extname(file)] || 'application/octet-stream' : 'text/html'}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
      response.end(request.method === 'HEAD' ? undefined : body)
    }
    catch {
      response.writeHead(400).end('Bad request')
    }
  })
}

export function startServer() {
  const server = createPreviewServer()
  const port = Number(process.env.PORT || 4173)
  server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}${process.env.SITE_BASE || '/'}`))
  return server
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  startServer()
