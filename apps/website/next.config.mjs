import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { normalizeBase } from './lib/base.mjs'

const base = normalizeBase(process.env.SITE_BASE)

/** @type {import('next').NextConfig} */
export default {
  basePath: base === '/' ? '' : base.slice(0, -1),
  trailingSlash: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..'),
  env: { NEXT_PUBLIC_SITE_BASE: base },
  webpack(config) {
    // Import repository Markdown as source so Next watches it during development
    // and includes only compiled content, not repository files, at runtime.
    config.module.rules.push({ test: /\.md$/, type: 'asset/source' })
    return config
  },
}
