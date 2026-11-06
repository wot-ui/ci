import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

// Only package downloads and npx installations are cached. Generated config,
// credentials, project files and npm logs must never enter this cache.
const env = process.env
const cwd = path.resolve(env.INPUT_WORKING_DIRECTORY || '.')
const registry = env.INPUT_REGISTRY || env.npm_config_registry || env.NPM_CONFIG_REGISTRY || 'https://registry.npmjs.org/'
const digest = createHash('sha256').update(JSON.stringify({
  platform: process.platform,
  arch: process.arch,
  node: process.version,
  registry,
  version: env.INPUT_PACKAGE_VERSION || env.WOTCI_ACTION_REF || 'latest',
  // Moving Action tags receive a fresh cache when a new release changes SDKs.
  manifest: readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  script: readFileSync(new URL('./github-action.sh', import.meta.url), 'utf8'),
})).digest('hex')
const cachePath = path.join(env.RUNNER_TEMP || os.tmpdir(), 'wotci-npm', digest)
const enabled = !existsSync(path.join(cwd, 'node_modules/.bin/wotci'))
const outputs = { enabled: String(enabled), path: cachePath, key: `wotci-npm-v1-${digest}` }
if (env.GITHUB_OUTPUT) {
  for (const [key, value] of Object.entries(outputs)) {
    if (/[\r\n]/.test(value))
      throw new Error('Invalid cache output path')
    appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`)
  }
}
