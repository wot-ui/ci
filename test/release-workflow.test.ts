import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'

const repoRoot = path.resolve(import.meta.dirname, '..')
const releaseScript = path.join(repoRoot, 'scripts/verify-release.mjs')
const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { force: true, recursive: true })))
})

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'wotci-release-'))
  tempDirs.push(dir)
  return dir
}

function run(script: string, args: string[] = []): { code: number, stdout: string, stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], { encoding: 'utf8' })
    return { code: 0, stdout, stderr: '' }
  }
  catch (error) {
    const failure = error as { status?: number, stdout?: string, stderr?: string }
    return {
      code: failure.status ?? 1,
      stdout: failure.stdout ?? '',
      stderr: failure.stderr ?? '',
    }
  }
}

describe('verify-release', () => {
  it('tag 与版本一致时通过', async () => {
    const dir = await createTempDir()
    const pkg = path.join(dir, 'package.json')
    await writeFile(pkg, JSON.stringify({ name: 'demo', version: '1.4.0' }))

    const result = run(releaseScript, ['v1.4.0', pkg])
    expect(result.code).toBe(0)
  })

  it('tag 与版本不一致时失败', async () => {
    const dir = await createTempDir()
    const pkg = path.join(dir, 'package.json')
    await writeFile(pkg, JSON.stringify({ name: 'demo', version: '1.4.0' }))

    const result = run(releaseScript, ['v1.4.1', pkg])
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('不一致')
  })

  it('浮动主版本 tag 不是可发布版本号', async () => {
    const dir = await createTempDir()
    const pkg = path.join(dir, 'package.json')
    await writeFile(pkg, JSON.stringify({ name: 'demo', version: '1.4.0' }))

    const result = run(releaseScript, ['v1', pkg])
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('不是可发布的版本号')
  })
})

describe('cli release is independent of the standalone Action', () => {
  it('publishes release notes without requiring Marketplace publication', async () => {
    const config = JSON.parse(await readFile(path.join(repoRoot, 'changelogithub.config.json'), 'utf8'))
    const workflow = await readFile(path.join(repoRoot, '.github/workflows/release.yml'), 'utf8')
    expect(config.draft).not.toBe(true)
    expect(workflow).not.toContain('--draft')
    expect(workflow).not.toContain('Publish this Action to the GitHub Marketplace')
    expect(workflow).toContain('Verify published release')
  })
})
