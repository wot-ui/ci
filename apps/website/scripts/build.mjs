import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { loadContent } from './content.mjs'
import { renderDocs, renderHome, renderNotFound } from './templates.mjs'

export const siteRoot = fileURLToPath(new URL('../', import.meta.url))
export const repoRoot = path.resolve(siteRoot, '../..')
export const output = path.join(siteRoot, 'dist')

/** Build portable static pages; SITE_BASE supports hosting below a repository path. */
export async function build() {
  const base = process.env.SITE_BASE || '/'
  if (!/^\/(?:[\w-]+\/)*$/.test(base))
    throw new Error('SITE_BASE must be a path such as / or /ci/')
  const pkg = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'))
  const pages = await loadContent(repoRoot, base)
  await rm(output, { recursive: true, force: true })
  await mkdir(output, { recursive: true })
  await cp(path.join(siteRoot, 'public'), output, { recursive: true })
  const context = { base, version: pkg.version, pages }
  await writeFile(path.join(output, 'index.html'), renderHome(context))
  await mkdir(path.join(output, 'docs'), { recursive: true })
  await writeFile(path.join(output, 'docs/index.html'), renderDocs(context, pages.find(page => page.slug === 'getting-started')))
  for (const page of pages) {
    const dir = path.join(output, 'docs', page.slug)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'index.html'), renderDocs(context, page))
  }
  await writeFile(path.join(output, 'search-index.json'), JSON.stringify(pages.map(({ title, group, url, searchText, description }) => ({ title, group, url, text: searchText, description }))))
  await writeFile(path.join(output, '404.html'), renderNotFound(context))
  console.log(`Built home + ${pages.length} documentation pages → ${output} (base: ${base})`)
  return pages
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await build()
