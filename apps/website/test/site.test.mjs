import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { build, output } from '../scripts/build.mjs'
import { splitReadme } from '../scripts/content.mjs'
import { createPreviewServer } from '../scripts/serve.mjs'

/** Enumerate generated files to audit every static link and fragment, including source-doc links. */
async function listFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory())
      files.push(...await listFiles(full))
    else files.push(full)
  }
  return files
}

test('README section splitting ignores headings in fenced examples', () => {
  const sections = splitReadme('## Start\n\n```sh\n## Not a section\n```\n\n## Next\nBody')
  assert.deepEqual([...sections.keys()], ['Start', 'Next'])
  assert.match(sections.get('Start'), /## Not a section/)
})

test('static site supports root and subpath deployment with valid internal links', async () => {
  const original = process.env.SITE_BASE
  try {
    for (const base of ['/', '/ci/']) {
      process.env.SITE_BASE = base
      const pages = await build()
      const files = await listFiles(output)
      const htmlFiles = files.filter(file => file.endsWith('.html'))
      assert.ok(pages.length >= 18)
      const documents = new Map(await Promise.all(htmlFiles.map(async file => [file, await readFile(file, 'utf8')])))
      for (const [file, html] of documents) {
        assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `One page title: ${file}`)
        const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])
        assert.equal(new Set(ids).size, ids.length, `Unique IDs: ${file}`)
        for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
          const href = match[1].replaceAll('&amp;', '&')
          if (/^(?:https?:|mailto:)/.test(href))
            continue
          const currentPath = `${base}${path.relative(output, file).split(path.sep).join('/')}`
          const url = new URL(href, `https://site.example${currentPath}`)
          assert.ok(url.pathname.startsWith(base), `Base path lost: ${href} in ${file}`)
          let target = path.join(output, decodeURIComponent(url.pathname.slice(base.length)))
          if (url.pathname.endsWith('/'))
            target = path.join(target, 'index.html')
          assert.ok(files.includes(target), `Broken link: ${href} in ${file}`)
          if (url.hash) {
            const destination = documents.get(target)
            const id = decodeURIComponent(url.hash.slice(1))
            assert.ok(destination?.includes(`id="${id}"`), `Broken fragment: ${href} in ${file}`)
          }
        }
      }
      const search = JSON.parse(await readFile(path.join(output, 'search-index.json'), 'utf8'))
      assert.equal(search.length, pages.length)
      assert.ok(search.some(page => page.text.includes('WEIXIN_APPID')), 'Search preserves config identifiers')
      assert.ok(search.every(page => page.url.startsWith(`${base}docs/`) && page.text.length > 50))
      const release = documents.get(path.join(output, 'docs/release/index.html'))
      assert.match(release, /strict/)
      assert.match(release, /tentative/)
      assert.match(release, /versionResolution/)
      const intro = documents.get(path.join(output, 'docs/getting-started/index.html'))
      assert.match(intro, /href=".*docs\/configuration\/#配置"/)
      assert.match(intro, /process\.env\.WEIXIN_APPID!/)
    }
  }
  finally {
    if (original === undefined)
      delete process.env.SITE_BASE
    else process.env.SITE_BASE = original
  }
})

test('preview serves deep links, redirects directories and returns actual 404s', async () => {
  const server = createPreviewServer({ base: '/ci/' })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = `http://127.0.0.1:${server.address().port}`
  try {
    const home = await fetch(`${address}/ci/`)
    assert.equal(home.status, 200)
    assert.match(await home.text(), /Wot CI/)
    assert.equal((await fetch(`${address}/ci/docs/upload/`)).status, 200)
    assert.equal((await fetch(`${address}/ci/styles.css`)).headers.get('content-type'), 'text/css; charset=utf-8')
    const redirect = await fetch(`${address}/ci/docs/upload?test=1`, { redirect: 'manual' })
    assert.equal(redirect.status, 308)
    assert.equal(redirect.headers.get('location'), '/ci/docs/upload/?test=1')
    assert.equal((await fetch(`${address}/ci/missing/`)).status, 404)
    assert.equal((await fetch(`${address}/docs/upload/`)).status, 404)
    assert.equal((await fetch(`${address}/ci/`, { method: 'POST' })).status, 405)
  }
  finally { await new Promise(resolve => server.close(resolve)) }
})
