import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const siteRoot = fileURLToPath(new URL('../', import.meta.url))
const config = JSON.parse(await readFile(new URL('../.next/required-server-files.json', import.meta.url), 'utf8')).config
const base = `${config.basePath || ''}/`
const listener = createServer()
listener.listen(0, '127.0.0.1')
await once(listener, 'listening')
const port = listener.address().port
await new Promise(resolve => listener.close(resolve))
const server = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)), 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: siteRoot, env: { ...process.env, SITE_BASE: base }, stdio: ['ignore', 'pipe', 'pipe'] })
const exited = once(server, 'exit')
let logs = ''
server.stdout.on('data', data => logs += data)
server.stderr.on('data', data => logs += data)
const origin = `http://127.0.0.1:${port}`
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null)
      throw new Error(logs)
    try {
      ready = (await fetch(`${origin}${base}`, { signal: AbortSignal.timeout(1000) })).ok
    }
    catch { /* Next may still be starting. */ }
    if (ready)
      break
    await delay(200)
  }
  assert.ok(ready, logs)
  const indexResponse = await fetch(`${origin}${base}search-index.json`)
  assert.equal(indexResponse.status, 200)
  const index = await indexResponse.json()
  assert.equal(index.length, 22)
  assert.ok(index.some(page => page.text.includes('WEIXIN_APPID')))
  const htmlPages = new Map(await Promise.all([base, ...index.map(page => page.url)].map(async (url) => {
    const response = await fetch(`${origin}${url}`)
    assert.equal(response.status, 200, url)
    const html = await response.text()
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1, url)
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])
    assert.equal(new Set(ids).size, ids.length, `Duplicate IDs: ${url}`)
    return [url, html]
  })))
  const assets = new Set()
  for (const slug of ['local-baseline', 'runtime-baseline']) {
    const html = htmlPages.get(`${base}docs/${slug}/`)
    assert.ok(html, `Missing verification record: ${slug}`)
    const pagination = html.match(/<nav class="doc-pagination"[^>]*>([\s\S]*?)<\/nav>/)?.[1]
    assert.notEqual(pagination, undefined)
    assert.doesNotMatch(pagination, /<a\b/)
  }
  for (const [pageUrl, html] of htmlPages) {
    for (const match of html.matchAll(/<(?:a|script|link|img)\b[^>]+?(?:href|src)="([^"]+)"/g)) {
      const url = new URL(match[1].replaceAll('&amp;', '&'), `${origin}${pageUrl}`)
      if (url.origin !== origin)
        continue
      assert.ok(url.pathname.startsWith(base), `Lost base path: ${url}`)
      const destination = htmlPages.get(url.pathname)
      if (destination && url.hash)
        assert.ok(destination.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `Missing anchor: ${url}`)
      if (!destination)
        assets.add(url.pathname)
    }
  }
  for (const asset of assets)
    assert.equal((await fetch(`${origin}${asset}`)).status, 200, asset)
  for (const route of ['missing/', 'docs/missing/'])
    assert.equal((await fetch(`${origin}${base}${route}`)).status, 404, route)
  const docs = await fetch(`${origin}${base}docs/`, { redirect: 'manual' })
  assert.ok([307, 308].includes(docs.status))
  assert.equal(new URL(docs.headers.get('location'), origin).pathname, `${base}docs/getting-started/`)
  console.log(`Next production verification passed: ${htmlPages.size} pages, ${assets.size} assets, search, redirects and 404s (base ${base})`)
}
finally {
  if (server.exitCode === null) {
    server.kill('SIGTERM')
    await exited
  }
}
