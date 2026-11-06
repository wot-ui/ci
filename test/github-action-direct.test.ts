import { spawnSync } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'

const repoRoot = path.resolve(import.meta.dirname, '..')
const scriptPath = path.join(repoRoot, 'scripts/github-action.sh')
const tempDirs: string[] = []
const privateKey = 'test-only private key\nsecond line with "quotes" and $()\n'

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { force: true, recursive: true })))
})

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wotci action '))
  tempDirs.push(root)
  const cwd = path.join(root, 'workspace')
  const runnerTemp = path.join(root, 'runner temp')
  const bin = path.join(cwd, 'node_modules/.bin')
  await mkdir(bin, { recursive: true })
  await mkdir(runnerTemp)
  await mkdir(path.join(cwd, 'build output'))
  await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ version: '1.2.3', description: 'package description' }))
  const cli = path.join(bin, 'wotci')
  // Observe the actual child process boundary, including key availability and
  // permissions while running. These are synthetic test credentials only.
  await writeFile(cli, `#!/usr/bin/env node
const fs = require('node:fs')
const args = process.argv.slice(2)
const index = args.indexOf('-c')
const configFile = index < 0 ? undefined : args[index + 1]
const config = configFile ? require(configFile) : undefined
const target = config && (config.weixin || config.alipay || config.dingtalk)
const keyFile = target && target.privateKeyPath
fs.writeFileSync(process.env.OUTPUT_FILE, JSON.stringify({
  args, config, configFile,
  configMode: configFile && (fs.statSync(configFile).mode & 0o777),
  keyMode: keyFile && (fs.statSync(keyFile).mode & 0o777),
  key: keyFile && fs.readFileSync(keyFile, 'utf8'),
}))
process.exit(Number(process.env.FAKE_EXIT_CODE || 0))
`)
  await chmod(cli, 0o755)
  const outputFile = path.join(root, 'capture.json')
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(?:INPUT_|WOTCI_|WEIXIN_|ALIPAY_|DINGTALK_)/.test(key)))
  const env = {
    ...inherited,
    INPUT_WORKING_DIRECTORY: cwd,
    OUTPUT_FILE: outputFile,
    RUNNER_TEMP: runnerTemp,
  }
  return {
    cli,
    cwd,
    runnerTemp,
    outputFile,
    run: (extra: Record<string, string> = {}) => spawnSync('bash', [scriptPath], {
      env: { ...env, ...extra },
      encoding: 'utf8',
      timeout: 20000,
    }),
    captured: async () => JSON.parse(await readFile(outputFile, 'utf8')),
  }
}

function weixinInputs() {
  return {
    INPUT_PLATFORM: 'weixin',
    INPUT_PROJECT_PATH: 'build output',
    INPUT_APPID: 'wx-fixture',
    INPUT_PRIVATE_KEY: privateKey,
  }
}

describe.skipIf(process.platform === 'win32')('config-free composite action', () => {
  it.each([0, 7])('with inputs safely materialize credentials and clean up after CLI exit %i', async (exitCode) => {
    const fixture = await createFixture()
    // eslint-disable-next-line no-template-curly-in-string -- Verify user data is never evaluated as code.
    const desc = 'release "quoted"\n${notEvaluated} $(not-executed)'
    const result = fixture.run({
      ...weixinInputs(),
      INPUT_UPLOAD_VERSION: '2.0.0',
      INPUT_UPLOAD_DESC: desc,
      INPUT_ROBOT: '3',
      FAKE_EXIT_CODE: String(exitCode),
      WEIXIN_APPID: 'ignored-env-appid',
      WEIXIN_PRIVATE_KEY_PATH: 'ignored-env-path',
    })
    expect(result.status, result.stderr).toBe(exitCode)
    const captured = await fixture.captured()
    expect(captured.config).toMatchObject({
      version: '2.0.0',
      desc,
      weixin: { appid: 'wx-fixture', projectPath: 'build output', robot: 3, setting: { useProjectConfig: true } },
    })
    expect(captured.key).toBe(privateKey)
    expect(captured.configMode).toBe(0o600)
    expect(captured.keyMode).toBe(0o600)
    expect(captured.configFile.startsWith(fixture.runnerTemp)).toBe(true)
    expect(result.stdout + result.stderr).not.toContain(privateKey)
    expect(await readdir(fixture.runnerTemp)).toEqual([])
    expect(await readdir(fixture.cwd)).not.toContain('wotci.config.cjs')
  })

  it.each(['weixin', 'alipay', 'dingtalk'])('supports env-only configuration for %s', async (platform) => {
    const fixture = await createFixture()
    const prefix = platform.toUpperCase()
    const result = fixture.run({
      WOTCI_PLATFORM: platform,
      WOTCI_VERSION: '2.1.0',
      WOTCI_DESC: 'env description',
      [`${prefix}_APPID`]: 'env-app',
      [`${prefix}_PROJECT_PATH`]: 'build output',
      ...(platform === 'dingtalk'
        ? { DINGTALK_TOKEN: 'test-only-token' }
        : { [`${prefix}_PRIVATE_KEY`]: privateKey }),
      ...(platform === 'alipay' ? { ALIPAY_TOOL_ID: 'env-tool' } : {}),
    })
    expect(result.status, result.stderr).toBe(0)
    const { config, args } = await fixture.captured()
    expect(args.slice(0, 3)).toEqual(['upload', '-p', platform])
    expect(config).toMatchObject({ version: '2.1.0', desc: 'env description', [platform]: { appid: 'env-app', projectPath: 'build output' } })
    if (platform === 'alipay')
      expect(config.alipay.toolId).toBe('env-tool')
    if (platform === 'dingtalk') {
      expect(config.dingtalk.token).toBe('test-only-token')
      expect(result.stdout + result.stderr).not.toContain('test-only-token')
    }
    expect(await readdir(fixture.runnerTemp)).toEqual([])
  })

  it('keeps a caller-owned relative key file intact and gives input credentials precedence', async () => {
    const fixture = await createFixture()
    await writeFile(path.join(fixture.cwd, 'existing key.pem'), privateKey)
    const result = fixture.run({
      ...weixinInputs(),
      INPUT_PRIVATE_KEY: '',
      INPUT_PRIVATE_KEY_PATH: 'existing key.pem',
      WEIXIN_PRIVATE_KEY: 'ignored-env-key',
    })
    expect(result.status, result.stderr).toBe(0)
    expect((await fixture.captured()).config.weixin.privateKeyPath).toBe('existing key.pem')
    expect(await readFile(path.join(fixture.cwd, 'existing key.pem'), 'utf8')).toBe(privateKey)
  })

  it.each(['wotci.config.ts', '.minicirc', 'package.json'])('preserves auto-discovered %s even with platform env credentials', async (file) => {
    const fixture = await createFixture()
    await writeFile(path.join(fixture.cwd, file), file === 'package.json' ? '{"wotci":{}}' : '{}')
    const result = fixture.run({ INPUT_PLATFORM: 'weixin', WEIXIN_APPID: 'env-app', WEIXIN_PROJECT_PATH: 'build output', WEIXIN_PRIVATE_KEY: privateKey })
    expect(result.status, result.stderr).toBe(0)
    expect((await fixture.captured()).args).toEqual(['upload', '-p', 'weixin'])
    expect(await readdir(fixture.runnerTemp)).toEqual([])
  })

  it('explicit direct inputs bypass auto-discovery without executing the project config', async () => {
    const fixture = await createFixture()
    await writeFile(path.join(fixture.cwd, 'wotci.config.cjs'), 'throw new Error("must not run")')
    const result = fixture.run(weixinInputs())
    expect(result.status, result.stderr).toBe(0)
    expect((await fixture.captured()).config.weixin.appid).toBe('wx-fixture')
  })

  it('preserves legacy config selection through passthrough args', async () => {
    const fixture = await createFixture()
    const configFile = path.join(fixture.cwd, 'custom.cjs')
    await writeFile(configFile, 'module.exports = { version: "3.0.0" }')
    const result = fixture.run({
      INPUT_PLATFORM: 'weixin',
      INPUT_ARGS: '--config custom.cjs',
      WEIXIN_APPID: 'legacy-env-app',
    })
    expect(result.status, result.stderr).toBe(0)
    expect((await fixture.captured()).args).toEqual(['upload', '-p', 'weixin', '--config', 'custom.cjs'])
  })

  it('does not intercept a legacy command without direct upload parameters', async () => {
    const fixture = await createFixture()
    const result = fixture.run({ INPUT_COMMAND: 'version latest', INPUT_PLATFORM: 'weixin' })
    expect(result.status, result.stderr).toBe(0)
    expect((await fixture.captured()).args).toEqual(['version', 'latest', '-p', 'weixin'])
  })

  it.each([
    [{ INPUT_APPID: '' }, 'appid'],
    [{ INPUT_PROJECT_PATH: '' }, 'project-path'],
    [{ INPUT_PRIVATE_KEY: '' }, 'private-key'],
    [{ INPUT_PRIVATE_KEY_PATH: 'other.pem' }, '只能提供一个'],
    [{ INPUT_ROBOT: '31' }, '1 到 30'],
    [{ INPUT_ROBOT: 'not-a-number' }, '1 到 30'],
    [{ INPUT_PLATFORM: 'weixin,alipay' }, '一个 platform'],
    [{ INPUT_CONFIG: 'wotci.config.ts' }, '不能与'],
    [{ INPUT_COMMAND: 'release' }, '其他命令'],
    [{ INPUT_ARGS: '--cwd another-project' }, '不能通过 args'],
    [{ INPUT_ARGS: '-c another-config.cjs' }, '不能通过 args'],
    [{ INPUT_ARGS: '--all' }, '不能通过 args'],
    [{ INPUT_TOKEN: 'test-only-token' }, '不匹配'],
    [{ INPUT_PLATFORM: 'alipay' }, 'tool-id'],
    [{ INPUT_PLATFORM: 'dingtalk' }, '钉钉不支持'],
  ] as const)('rejects invalid configuration before invoking the CLI: %j', async (overrides, message) => {
    const fixture = await createFixture()
    const result = fixture.run({ ...weixinInputs(), ...overrides })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(message)
    expect(result.stdout + result.stderr).not.toContain(privateKey)
    await expect(readFile(fixture.outputFile)).rejects.toThrow()
    expect(await readdir(fixture.runnerTemp)).toEqual([])
  })

  it('requires an upload version without package metadata, but allows preview', async () => {
    const fixture = await createFixture()
    await rm(path.join(fixture.cwd, 'package.json'))
    expect(fixture.run(weixinInputs()).stderr).toContain('upload-version')
    const preview = fixture.run({ ...weixinInputs(), INPUT_COMMAND: 'preview' })
    expect(preview.status, preview.stderr).toBe(0)
  })

  it.each(['weixin', 'alipay', 'dingtalk'])('real CLI validates %s upload with no project config or installed package', async (platform) => {
    const fixture = await createFixture()
    const tsxLoader = import.meta.resolve('tsx')
    // Emulate npx's executable boundary using the source CLI, with no registry
    // traffic or SDK calls. No local wotci executable remains in the fixture.
    const fakeNpx = path.join(fixture.cwd, 'npx')
    await writeFile(fakeNpx, `#!/usr/bin/env node
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const args = process.argv.slice(2)
const child = spawnSync(process.execPath, ['--import', ${JSON.stringify(tsxLoader)}, ${JSON.stringify(path.join(repoRoot, 'src/bin.ts'))}, ...args.slice(2)], { encoding: 'utf8', env: process.env })
fs.writeFileSync(process.env.OUTPUT_FILE, child.stdout || '')
process.stderr.write(child.stderr || '')
process.exit(child.status ?? 1)
`)
    await chmod(fakeNpx, 0o755)
    await rm(path.dirname(path.dirname(fixture.cli)), { recursive: true })
    const result = fixture.run({
      INPUT_PLATFORM: platform,
      INPUT_PROJECT_PATH: 'build output',
      INPUT_APPID: 'fixture-app',
      ...(platform === 'dingtalk' ? { INPUT_TOKEN: 'test-only-token' } : { INPUT_PRIVATE_KEY: privateKey }),
      ...(platform === 'alipay' ? { INPUT_TOOL_ID: 'test-tool' } : {}),
      INPUT_JSON: 'true',
      INPUT_DRY_RUN: 'true',
      PATH: `${fixture.cwd}:${process.env.PATH}`,
    })
    expect(result.status, result.stderr).toBe(0)
    const output = await fixture.captured()
    expect(output.ok).toBe(true)
    expect(JSON.stringify(output)).toContain('1.2.3')
    expect(JSON.stringify(output)).toContain(path.join(fixture.cwd, 'build output'))
    expect(await readdir(fixture.runnerTemp)).toEqual([])
  }, 20000)
})
