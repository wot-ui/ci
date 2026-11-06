import { execFileSync, spawnSync } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { afterEach, expect, it } from 'vitest'
import { parse } from 'yaml'

const repoRoot = path.resolve(import.meta.dirname, '..')
const temporary: string[] = []
const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(?:INPUT_|WOTCI_|WEIXIN_|ALIPAY_|DINGTALK_|GITHUB_OUTPUT|npm_config_registry|NPM_CONFIG_REGISTRY)/.test(key)))

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

async function fixture() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'wotci cache '))
  temporary.push(cwd)
  const output = path.join(cwd, 'outputs')
  const env = { ...inherited, INPUT_WORKING_DIRECTORY: cwd, RUNNER_TEMP: cwd, GITHUB_OUTPUT: output }
  return {
    cwd,
    output,
    env,
    async prepare(extra: Record<string, string> = {}) {
      await writeFile(output, '')
      execFileSync(process.execPath, [path.join(repoRoot, 'scripts/github-action-cache.mjs')], { env: { ...env, ...extra } })
      return Object.fromEntries((await readFile(output, 'utf8')).trim().split('\n').map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1)]
      }))
    },
  }
}

it('keeps cache keys stable but isolates package selectors and registries without exposing credentials', async () => {
  const test = await fixture()
  const first = await test.prepare({ WOTCI_ACTION_REF: 'v0.5.1' })
  expect(first.enabled).toBe('true')
  expect(await test.prepare({ WOTCI_ACTION_REF: 'v0.5.1' })).toEqual(first)
  expect((await test.prepare({ WOTCI_ACTION_REF: 'v0.5.2' })).key).not.toBe(first.key)
  expect((await test.prepare({ INPUT_PACKAGE_VERSION: '1.0.0' })).key).not.toBe(first.key)
  const custom = await test.prepare({ INPUT_REGISTRY: 'https://user:secret@registry.example/' })
  expect(custom.key).not.toBe(first.key)
  expect(JSON.stringify(custom)).not.toContain('secret')
  expect((await test.prepare({ npm_config_registry: 'https://user:secret@registry.example/' })).key).toBe(custom.key)
  await mkdir(path.join(test.cwd, 'node_modules/.bin'), { recursive: true })
  await writeFile(path.join(test.cwd, 'node_modules/.bin/wotci'), '')
  expect((await test.prepare()).enabled).toBe('false')
})

it('saves only npm package caches even after upload failure, without caching logs or credentials', async () => {
  const action = parse(await readFile(path.join(repoRoot, 'action.yml'), 'utf8'))
  const restore = action.runs.steps.find((step: { uses?: string }) => step.uses === 'actions/cache/restore@v4')
  const save = action.runs.steps.find((step: { uses?: string }) => step.uses === 'actions/cache/save@v4')
  expect(save.if).toContain('always()')
  expect(save.if).toContain('steps.wotci-run.outputs.cli-cache-ready == \'true\'')
  expect(save.if).toContain('steps.wotci-cache.outputs.cache-hit != \'true\'')
  expect(save.with.path).toBe(restore.with.path)
  expect(save.with.key).toBe(restore.with.key)
  expect(save.with.path.trim().split('\n').map((value: string) => value.split('/').at(-1))).toEqual(['_cacache', '_npx'])
  expect(save['continue-on-error']).toBe(true)
  expect(restore['continue-on-error']).toBe(true)
})

it.skipIf(process.platform === 'win32')('separates CLI preparation, reuses its cache, and preserves upload failure and JSON output', async () => {
  const test = await fixture()
  const bin = path.join(test.cwd, 'bin')
  await mkdir(bin)
  await writeFile(path.join(test.cwd, '.npmrc'), 'registry=https://slow-project-mirror.example/\n')
  const fakeNpx = path.join(bin, 'npx')
  await writeFile(fakeNpx, `#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const args = process.argv.slice(2)
fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + '\\n')
const cache = args[args.indexOf('--cache') + 1]
const marker = path.join(cache, 'installed')
if (args.includes('--package')) {
  if (process.env.INSTALL_EXIT) process.exit(Number(process.env.INSTALL_EXIT))
  fs.mkdirSync(cache, { recursive: true })
  if (!fs.existsSync(marker)) fs.appendFileSync(process.env.INSTALLS, 'installed\\n')
  fs.writeFileSync(marker, 'ready')
  console.log('installer stdout')
} else {
  if (!fs.existsSync(marker)) process.exit(99)
  console.log(JSON.stringify({ ok: false }))
  process.exit(7)
}
`)
  await chmod(fakeNpx, 0o755)
  const prepared = await test.prepare()
  const calls = path.join(test.cwd, 'calls')
  const installs = path.join(test.cwd, 'installs')
  const run = (extra: Record<string, string> = {}) => spawnSync('bash', [path.join(repoRoot, 'scripts/github-action.sh')], {
    env: { ...test.env, INPUT_COMMAND: 'doctor', INPUT_JSON_OUTPUT: 'result.json', WOTCI_NPM_CACHE: prepared.path, CALLS: calls, INSTALLS: installs, PATH: `${bin}:${process.env.PATH}`, ...extra },
    encoding: 'utf8',
  })
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = run()
    expect(result.status, result.stderr).toBe(7)
    expect(result.stderr).toContain('CLI 准备耗时：')
    expect(result.stderr).toContain('CLI 执行耗时：')
    expect(result.stdout.trim()).toBe('{"ok":false}')
    expect(JSON.parse(await readFile(path.join(test.cwd, 'result.json'), 'utf8'))).toEqual({ ok: false })
    expect(await readFile(test.output, 'utf8')).toContain('cli-cache-ready=true')
  }
  expect(await readFile(installs, 'utf8')).toBe('installed\n')
  const invocations: string[][] = (await readFile(calls, 'utf8')).trim().split('\n').map(line => JSON.parse(line))
  expect(invocations).toHaveLength(4)
  for (const args of invocations) {
    expect(args[args.indexOf('--registry') + 1]).toBe('https://registry.npmjs.org/')
    expect(args[args.indexOf('--cache') + 1]).toBe(prepared.path)
  }
  await writeFile(test.output, '')
  const failure = run({ INSTALL_EXIT: '42', INPUT_REGISTRY: 'https://custom.example/' })
  expect(failure.status).toBe(42)
  expect(await readFile(test.output, 'utf8')).not.toContain('cli-cache-ready=true')
  expect(failure.stderr).not.toContain('CLI 执行耗时：')
  const last = JSON.parse((await readFile(calls, 'utf8')).trim().split('\n').at(-1)!)
  expect(last[last.indexOf('--registry') + 1]).toBe('https://custom.example/')
})
