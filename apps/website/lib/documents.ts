import process from 'node:process'
import actionReference from '../../../docs/guides/action-reference.md'
import api from '../../../docs/guides/api.md'
import commands from '../../../docs/guides/commands.md'
import configuration from '../../../docs/guides/configuration.md'
import development from '../../../docs/guides/development.md'
import diagnostics from '../../../docs/guides/diagnostics.md'
import errors from '../../../docs/guides/errors.md'
import gettingStarted from '../../../docs/guides/getting-started.md'
import githubAction from '../../../docs/guides/github-action.md'
import migration from '../../../docs/guides/migration.md'
import overview from '../../../docs/guides/overview.md'
import playground from '../../../docs/guides/playground.md'
import preview from '../../../docs/guides/preview.md'
import release from '../../../docs/guides/release.md'
import upload from '../../../docs/guides/upload.md'
import vite from '../../../docs/guides/vite.md'
import validation from '../../../docs/platform-validation.md'
import publishing from '../../../docs/releasing.md'
import roadmap from '../../../docs/roadmap.md'
import support from '../../../docs/support-matrix.md'
import localBaseline from '../../../docs/verification/2026-11-04-local-baseline.md'
import runtimeBaseline from '../../../docs/verification/2026-11-04-runtime-matrix.md'
import packageJson from '../../../package.json'
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
  'docs/guides/overview.md': overview,
  'docs/guides/getting-started.md': gettingStarted,
  'docs/guides/configuration.md': configuration,
  'docs/guides/commands.md': commands,
  'docs/guides/upload.md': upload,
  'docs/guides/preview.md': preview,
  'docs/guides/release.md': release,
  'docs/guides/diagnostics.md': diagnostics,
  'docs/guides/github-action.md': githubAction,
  'docs/guides/action-reference.md': actionReference,
  'docs/guides/vite.md': vite,
  'docs/guides/api.md': api,
  'docs/guides/migration.md': migration,
  'docs/guides/errors.md': errors,
  'docs/support-matrix.md': support,
  'docs/platform-validation.md': validation,
  'docs/roadmap.md': roadmap,
  'docs/guides/playground.md': playground,
  'docs/guides/development.md': development,
  'docs/releasing.md': publishing,
  'docs/verification/2026-11-04-runtime-matrix.md': runtimeBaseline,
  'docs/verification/2026-11-04-local-baseline.md': localBaseline,
}, base)

export const navigation = documents.filter(page => !page.hidden).map(({ slug, title, group }) => ({ slug, title, group }))
export const searchIndex = documents.map(({ title, group, url, searchText, description }) => ({ title, group, url, text: searchText, description }))
