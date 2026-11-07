import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { normalizeBase } from '../lib/base.mjs'
import { compileContent, pages } from '../lib/content.mjs'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const sources = Object.fromEntries(await Promise.all(pages.map(page => page.file).map(async file => [file, await readFile(path.join(root, file), 'utf8')])))

test('standalone guides render without the repository README and ignore fenced headings', () => {
  const documents = compileContent({ ...sources, 'docs/guides/overview.md': '# Overview\n\n```sh\n## Not a section\n```\n\n## Next\nBody' })
  const overview = documents.find(page => page.slug === 'overview')
  assert.deepEqual(overview.toc.map(item => item.text), ['Next'])
  assert.match(overview.html, /## Not a section/)
  assert.ok(documents.every(page => page.source.startsWith('docs/')))
})

test('canonical documents retain links, anchors and search identifiers at root and subpaths', () => {
  for (const base of ['/', '/ci/']) {
    const documents = compileContent(sources, base)
    assert.equal(documents.length, 23)
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
    const integration = documents.find(page => page.slug === 'integration')
    assert.match(integration.html, /AI 一键接入/)
    assert.match(integration.html, /data-copy-code/)
    assert.match(integration.html, /minifyWXSS/)
    assert.match(integration.html, /GITHUB_STEP_SUMMARY/)
    const jenkins = documents.find(page => page.slug === 'jenkins')
    assert.match(jenkins.html, /examples\/jenkins\/weixin\/Jenkinsfile/)
    assert.match(jenkins.html, /examples\/jenkins\/playground\/Jenkinsfile/)
    assert.match(jenkins.searchText, /DRY_RUN/)
    assert.ok(documents.find(page => page.slug === 'action-reference').toc.some(item => item.id === 'setting'))
    assert.match(documents.find(page => page.slug === 'action-reference').html, /platform-options/)
    assert.match(documents.find(page => page.slug === 'vite').html, /wotciPlugin/)
  }
})

test('invalid base paths and missing canonical sources fail before deployment', () => {
  assert.equal(normalizeBase(), '/')
  assert.equal(normalizeBase('/ci/'), '/ci/')
  for (const value of ['ci', '/ci', '//host/', '/a/../', '/<script>/'])
    assert.throws(() => normalizeBase(value), /SITE_BASE/)
  assert.throws(() => compileContent({ ...sources, 'docs/guides/getting-started.md': '' }), /Document source missing/)
  assert.throws(() => compileContent({ ...sources, 'docs/support-matrix.md': undefined }), /Document source missing/)
})
