import { spawnSync } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const repoRoot = path.resolve(import.meta.dirname, '..')
const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

async function fixture() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'wotci json output '))
  temporary.push(cwd)
  await mkdir(path.join(cwd, 'node_modules/.bin'), { recursive: true })
  const runnerTemp = path.join(cwd, 'runner temp')
  await mkdir(runnerTemp)
  const cli = path.join(cwd, 'node_modules/.bin/wotci')
  await writeFile(cli, `#!/usr/bin/env node
const fs = require('node:fs')
fs.writeFileSync('called.json', JSON.stringify(process.argv.slice(2)))
console.error('diagnostic only')
console.log(JSON.stringify({ ok: process.env.CLI_EXIT_CODE === '0' }))
process.exit(Number(process.env.CLI_EXIT_CODE || 0))
`)
  await chmod(cli, 0o755)
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(?:INPUT_|WOTCI_|WEIXIN_|ALIPAY_|DINGTALK_)/.test(key)))
  return {
    cwd,
    runnerTemp,
    run: (extra: Record<string, string>) => spawnSync('bash', [path.join(repoRoot, 'scripts/github-action.sh')], {
      cwd,
      encoding: 'utf8',
      timeout: 20000,
      env: {
        ...inherited,
        RUNNER_TEMP: runnerTemp,
        INPUT_WORKING_DIRECTORY: cwd,
        INPUT_PLATFORM: 'weixin',
        INPUT_PROJECT_PATH: '.',
        INPUT_APPID: 'test-app',
        INPUT_PRIVATE_KEY: 'test-only-inline-key',
        INPUT_UPLOAD_VERSION: '1.0.0',
        ...extra,
      },
    }),
  }
}

it('exposes the JSON output path through the composite environment', async () => {
  const action = parse(await readFile(path.join(repoRoot, 'action.yml'), 'utf8'))
  expect(action.inputs['json-output'].default).toBe('')
  const execution = action.runs.steps.find((step: { run?: string }) => step.run?.includes('github-action.sh'))
  // eslint-disable-next-line no-template-curly-in-string -- GitHub expression, not JavaScript interpolation.
  expect(execution.env.INPUT_JSON_OUTPUT).toBe('${{ inputs.json-output }}')
})

describe.skipIf(process.platform === 'win32')('action JSON artifacts', () => {
  it.each([0, 7])('captures only JSON, keeps CLI exit %i and removes temporary credentials', async (code) => {
    const test = await fixture()
    const result = test.run({ INPUT_JSON_OUTPUT: 'nested evidence/result.json', CLI_EXIT_CODE: String(code) })
    expect(result.status, result.stderr).toBe(code)
    expect(JSON.parse(await readFile(path.join(test.cwd, 'nested evidence/result.json'), 'utf8'))).toEqual({ ok: code === 0 })
    expect(JSON.parse(await readFile(path.join(test.cwd, 'called.json'), 'utf8'))).toContain('--json')
    expect(result.stdout).toContain(JSON.stringify({ ok: code === 0 }))
    expect(result.stderr).toContain('diagnostic only')
    expect(await readdir(test.runnerTemp)).toEqual([])
  })

  it('rejects an unwritable output destination before invoking the CLI', async () => {
    const test = await fixture()
    await writeFile(path.join(test.cwd, 'blocked'), 'a file, not a directory')
    const result = test.run({ INPUT_JSON_OUTPUT: 'blocked/result.json' })
    expect(result.status).not.toBe(0)
    await expect(readFile(path.join(test.cwd, 'called.json'))).rejects.toThrow()
    expect(await readdir(test.runnerTemp)).toEqual([])
  })
})
