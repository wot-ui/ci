import process from 'node:process'
import validation from '../../../docs/platform-validation.md'
import publishing from '../../../docs/releasing.md'
import roadmap from '../../../docs/roadmap.md'
import support from '../../../docs/support-matrix.md'
import localBaseline from '../../../docs/verification/2026-11-04-local-baseline.md'
import runtimeBaseline from '../../../docs/verification/2026-11-04-runtime-matrix.md'
import packageJson from '../../../package.json'
import readme from '../../../README.md'
import { compileContent } from './content.mjs'

export interface DocumentPage {
  slug: string
  title: string
  group: string
  description: string
  source: string
  url: string
  html: string
  searchText: string
  hidden?: boolean
  toc: { id: string, text: string, level: number }[]
}

export const base = process.env.NEXT_PUBLIC_SITE_BASE || '/'
export const version = packageJson.version
export const documents: DocumentPage[] = compileContent({
  'README.md': readme,
  'docs/platform-validation.md': validation,
  'docs/releasing.md': publishing,
  'docs/roadmap.md': roadmap,
  'docs/support-matrix.md': support,
  'docs/verification/2026-11-04-local-baseline.md': localBaseline,
  'docs/verification/2026-11-04-runtime-matrix.md': runtimeBaseline,
}, base)

export const navigation = documents.filter(page => !page.hidden).map(({ slug, title, group }) => ({ slug, title, group }))
export const searchIndex = documents.map(({ title, group, url, searchText, description }) => ({ title, group, url, text: searchText, description }))
