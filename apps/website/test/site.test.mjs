import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { normalizeBase } from '../lib/base.mjs'
import { compileContent, pages, splitReadme } from '../lib/content.mjs'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const sources = Object.fromEntries(await Promise.all(['README.md', ...pages.filter(page => page.file).map(page => page.file)].map(async file => [file, await readFile(path.join(root, file), 'utf8')])))

test('README section splitting ignores headings in fenced examples', () => {
  const sections = splitReadme('## Start\n\n```sh\n## Not a section\n```\n\n## Next\nBody')
  assert.deepEqual([...sections.keys()], ['Start', 'Next'])
  assert.match(sections.get('Start'), /## Not a section/)
})

test('canonical documents retain links, anchors and search identifiers at root and subpaths', () => {
  for (const base of ['/', '/ci/']) {
    const documents = compileContent(sources, base)
    assert.equal(documents.length, 20)
    const byUrl = new Map(documents.map(page => [page.url, page]))
    for (const page of documents) {
      const ids = [...page.html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])
      assert.equal(new Set(ids).size, ids.length)
      for (const match of page.html.matchAll(/href="([^"]+)"/g)) {
        const href = match[1].replaceAll('&amp;', '&')
        if (/^(?:https?:|mailto:)/.test(href))
          continue
        const url = new URL(href, `https://site.example${page.url}`)
        const destination = byUrl.get(url.pathname)
        assert.ok(destination, `Broken link: ${href}`)
        if (url.hash)
          assert.ok(destination.html.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `Broken fragment: ${href}`)
      }
      assert.ok(page.searchText.length > 50)
      assert.ok(page.toc.every(item => ids.includes(item.id)))
    }
    assert.ok(documents.some(page => page.searchText.includes('WEIXIN_APPID')))
    assert.match(documents.find(page => page.slug === 'release').html, /versionResolution/)
    assert.match(documents.find(page => page.slug === 'integration').html, /private-key/)
  }
})

test('invalid base paths and missing canonical sources fail before deployment', () => {
  assert.equal(normalizeBase(), '/')
  assert.equal(normalizeBase('/ci/'), '/ci/')
  for (const value of ['ci', '/ci', '//host/', '/a/../', '/<script>/'])
    assert.throws(() => normalizeBase(value), /SITE_BASE/)
  assert.throws(() => compileContent({ ...sources, 'README.md': '' }), /README section missing/)
  assert.throws(() => compileContent({ ...sources, 'docs/support-matrix.md': undefined }), /Document source missing/)
})
