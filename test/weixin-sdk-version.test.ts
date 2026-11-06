import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const root = path.resolve(import.meta.dirname, '..')

describe('published WeChat SDK dependency', () => {
  it('pins a compiler-settings fix rather than resolving the npm latest tag', async () => {
    const [workspace, lockfile, packageJson] = await Promise.all([
      readFile(path.join(root, 'pnpm-workspace.yaml'), 'utf8'),
      readFile(path.join(root, 'pnpm-lock.yaml'), 'utf8'),
      readFile(path.join(root, 'package.json'), 'utf8'),
    ])
    const version = parse(workspace).catalog['miniprogram-ci'] as string
    const locked = parse(lockfile).catalogs.default['miniprogram-ci']

    expect(version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(version.localeCompare('2.1.39', undefined, { numeric: true })).toBeGreaterThanOrEqual(0)
    expect(locked.specifier).toBe(version)
    expect(locked.version).toBe(version)
    expect(JSON.parse(packageJson).dependencies['miniprogram-ci']).toBe('catalog:')
  }, 20_000)
})
