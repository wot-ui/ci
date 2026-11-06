import { spawnSync } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
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

async function createRealCliFixture() {
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
  return {
    ...fixture,
    run: (extra: Record<string, string> = {}) => fixture.run({
      INPUT_JSON: 'true',
      INPUT_DRY_RUN: 'true',
      ...extra,
      PATH: `${fixture.cwd}:${process.env.PATH}`,
    }),
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
  it('supports all WeChat optional fields and keeps false values and nested settings', async () => {
    const fixture = await createFixture()
    const options = {
      type: 'miniProgramPlugin',
      ignores: ['node_modules/**/*', 'test fixtures/**'],
      robot: 6,
      setting: { useProjectConfig: false, minifyJS: false, es6: true, futureSDKOption: { enabled: false } },
      preview: {
        qrcodeFormat: 'image',
        qrcodeOutputDest: 'qr output/image.png',
        pagePath: 'pages/index',
        searchQuery: 'name=hello world',
        scene: 1011,
        desc: 'preview',
        robot: 7,
        setting: { minifyJS: true },
        threads: 2,
        bigPackageSizeSupport: false,
      },
      ide: { cliPath: '/path with spaces/cli', port: 9420, lang: 'zh' },
    }
    const result = fixture.run({ ...weixinInputs(), INPUT_PLATFORM_OPTIONS: JSON.stringify(options) })
    expect(result.status, result.stderr).toBe(0)
    expect((await fixture.captured()).config.weixin).toMatchObject(options)
    expect(await readdir(fixture.runnerTemp)).toEqual([])
  })

  it('uses whole-object input/env precedence and dedicated settings over platform options', async () => {
    const fixture = await createFixture()
    const result = fixture.run({
      ...weixinInputs(),
      INPUT_PLATFORM_OPTIONS: '{"robot":6,"setting":{"es6":true},"preview":{"pagePath":"old"}}',
      WEIXIN_OPTIONS: '{"type":"miniGame"}',
      INPUT_SETTING: '{"useProjectConfig":false,"minifyJS":false}',
      WEIXIN_SETTING: '{"minifyJS":true,"es7":true}',
      INPUT_PREVIEW: '{"pagePath":"new","setting":{"minifyWXML":true}}',
      WEIXIN_PREVIEW: '{"pagePath":"ignored"}',
      INPUT_ROBOT: '4',
    })
    expect(result.status, result.stderr).toBe(0)
    const { config } = await fixture.captured()
    expect(config.weixin.setting).toEqual({ useProjectConfig: false, minifyJS: false })
    expect(config.weixin.preview).toEqual({ pagePath: 'new', setting: { minifyWXML: true } })
    expect(config.weixin.robot).toBe(4)
    expect(config.weixin.type).toBeUndefined()
  })

  it.each(['weixin', 'alipay', 'dingtalk'])('loads %s extended options through env only', async (platform) => {
    const fixture = await createFixture()
    const prefix = platform.toUpperCase()
    const options = platform === 'weixin'
      ? { type: 'miniGame', ignores: ['test/**'] }
      : platform === 'alipay'
        ? { clientType: 'amap', autoincrement: false, ide: { appPath: '/Applications/IDE' } }
        : { projectType: 'dingtalk-biz', autoincrement: true }
    const preview = platform === 'weixin'
      ? { pagePath: 'pages/index', scene: 1011 }
      : { page: 'pages/home', pageQuery: 'x=1', query: 'y=2', scene: 'test', autoPush: false, ignoreHttpDomainCheck: true, ignoreWebViewDomainCheck: false }
    const result = fixture.run({
      WOTCI_PLATFORM: platform,
      [`${prefix}_APPID`]: 'env-app',
      [`${prefix}_PROJECT_PATH`]: 'build output',
      [`${prefix}_OPTIONS`]: JSON.stringify(options),
      ...(platform === 'dingtalk' ? { DINGTALK_TOKEN: 'test-token' } : { [`${prefix}_PRIVATE_KEY`]: privateKey, [`${prefix}_PREVIEW`]: JSON.stringify(preview) }),
      ...(platform === 'alipay' ? { ALIPAY_TOOL_ID: 'test-tool' } : {}),
      ...(platform === 'weixin' ? { WEIXIN_SETTING: '{"minifyJS":false}' } : {}),
    })
    expect(result.status, result.stderr).toBe(0)
    const target = (await fixture.captured()).config[platform]
    expect(target).toMatchObject(options)
    if (platform !== 'dingtalk')
      expect(target.preview).toEqual(preview)
    if (platform === 'weixin')
      expect(target.setting).toEqual({ useProjectConfig: true, minifyJS: false })
  })

  it.each<Record<string, string>>([
    { INPUT_SETTING: '{"minifyJS":"false"}' },
    { INPUT_SETTING: '{"minifyJS":null}' },
    { INPUT_SETTING: '[true]' },
    { INPUT_SETTING: '{secret-value-not-to-log' },
    { INPUT_PREVIEW: '{"setting":{"minifyJS":1}}' },
    { INPUT_PREVIEW: '{"robot":31}' },
    { INPUT_PREVIEW: '{"threads":-1}' },
    { INPUT_PREVIEW: '{"qrcodeFormat":"invalid"}' },
    { INPUT_PREVIEW: '{"scene":"1011"}' },
    { INPUT_PLATFORM_OPTIONS: '{"ignores":[1]}' },
    { INPUT_PLATFORM_OPTIONS: '{"type":"invalid"}' },
    { INPUT_PLATFORM_OPTIONS: '{"appid":"secret-value-not-to-log"}' },
    { INPUT_PLATFORM_OPTIONS: '{"privateKey":"secret-value-not-to-log"}' },
    { INPUT_PLATFORM_OPTIONS: '{"clientType":"alipay"}' },
    { INPUT_SETTING: '{"__proto__":{"polluted":true}}' },
    { INPUT_PREVIEW: '{"setting":{"constructor":{"prototype":{}}}}' },
    { INPUT_SETTING: '{}', INPUT_CONFIG: 'wotci.config.ts' },
    { INPUT_SETTING: '{}', INPUT_ARGS: '--config another.cjs' },
  ])('rejects invalid extended options before CLI invocation: %j', async (extra) => {
    const fixture = await createFixture()
    const result = fixture.run({ ...weixinInputs(), ...extra })
    expect(result.status).toBe(1)
    expect(result.stdout + result.stderr).not.toContain('secret-value-not-to-log')
    expect(result.stdout + result.stderr).not.toContain(privateKey)
    await expect(readFile(fixture.outputFile)).rejects.toThrow()
    expect(await readdir(fixture.runnerTemp)).toEqual([])
  })

  it.each([
    ['alipay', { INPUT_SETTING: '{}' }],
    ['alipay', { INPUT_PREVIEW: '{"pagePath":"pages/index"}' }],
    ['alipay', { INPUT_PLATFORM_OPTIONS: '{"autoincrement":"false"}' }],
    ['dingtalk', { INPUT_PREVIEW: '{}' }],
    ['dingtalk', { INPUT_PLATFORM_OPTIONS: '{"clientType":"alipay"}' }],
  ] as const)('rejects fields not supported by %s', async (platform, extra) => {
    const fixture = await createFixture()
    const result = fixture.run({ INPUT_PLATFORM: platform, INPUT_PROJECT_PATH: 'build output', INPUT_APPID: 'test', ...extra })
    expect(result.status).toBe(1)
    await expect(readFile(fixture.outputFile)).rejects.toThrow()
    expect(await readdir(fixture.runnerTemp)).toEqual([])
  })

  it('preserves config discovery with extension env and opts in with a dedicated input', async () => {
    const fixture = await createFixture()
    await writeFile(path.join(fixture.cwd, 'wotci.config.cjs'), 'throw new Error("must not run")')
    const env = { INPUT_PLATFORM: 'weixin', WEIXIN_APPID: 'env-app', WEIXIN_PROJECT_PATH: 'build output', WEIXIN_PRIVATE_KEY: privateKey, WEIXIN_SETTING: '{"minifyJS":true}' }
    expect(fixture.run(env).status).toBe(0)
    expect((await fixture.captured()).args).toEqual(['upload', '-p', 'weixin'])
    const direct = fixture.run({ ...env, INPUT_SETTING: '{"minifyJS":false}' })
    expect(direct.status, direct.stderr).toBe(0)
    expect((await fixture.captured()).config.weixin.setting.minifyJS).toBe(false)
  })

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

  it('falls back to env for blank inputs and ignores credentials for other platforms', async () => {
    const fixture = await createFixture()
    const result = fixture.run({
      ...weixinInputs(),
      INPUT_APPID: '  ',
      INPUT_PRIVATE_KEY: '',
      INPUT_UPLOAD_VERSION: ' ',
      INPUT_UPLOAD_DESC: '',
      WEIXIN_APPID: 'env-app',
      WEIXIN_PRIVATE_KEY: privateKey,
      WEIXIN_ROBOT: '30',
      WOTCI_VERSION: '2.2.0',
      WOTCI_DESC: 'env description',
      ALIPAY_PRIVATE_KEY_PATH: 'unrelated-missing.pem',
      DINGTALK_TOKEN: 'unrelated-token',
    })
    expect(result.status, result.stderr).toBe(0)
    expect((await fixture.captured()).config).toMatchObject({ version: '2.2.0', desc: 'env description', weixin: { appid: 'env-app', robot: 30 } })
    expect(await readdir(fixture.runnerTemp)).toEqual([])
  })

  it('rejects conflicting env key forms before invoking the CLI', async () => {
    const fixture = await createFixture()
    const result = fixture.run({
      ...weixinInputs(),
      INPUT_PRIVATE_KEY: '',
      WEIXIN_PRIVATE_KEY: privateKey,
      WEIXIN_PRIVATE_KEY_PATH: 'existing.pem',
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('只能提供一个')
    expect(result.stdout + result.stderr).not.toContain(privateKey)
    await expect(readFile(fixture.outputFile)).rejects.toThrow()
    expect(await readdir(fixture.runnerTemp)).toEqual([])
  })

  it('cleans materialized credentials when dependency installation fails before the CLI starts', async () => {
    const fixture = await createFixture()
    const npm = path.join(fixture.cwd, 'npm')
    await writeFile(npm, `#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const temporary = fs.readdirSync(process.env.RUNNER_TEMP).find(name => name.startsWith('wotci-action.'))
const key = path.join(process.env.RUNNER_TEMP, temporary, 'private.key')
fs.writeFileSync(path.join(process.cwd(), 'install-observed.json'), JSON.stringify({ keyMode: fs.statSync(key).mode & 0o777 }))
process.exit(17)
`)
    await chmod(npm, 0o755)
    const result = fixture.run({ ...weixinInputs(), INPUT_INSTALL_DEPENDENCIES: 'true', PATH: `${fixture.cwd}:${process.env.PATH}` })
    expect(result.status, result.stderr).toBe(17)
    expect(JSON.parse(await readFile(path.join(fixture.cwd, 'install-observed.json'), 'utf8'))).toEqual({ keyMode: 0o600 })
    await expect(readFile(fixture.outputFile)).rejects.toThrow()
    expect(await readdir(fixture.runnerTemp)).toEqual([])
  })

  it.each([
    { input: '3.0.0', env: '2.0.0', expected: '3.0.0', packagePresent: true },
    { input: '', env: '2.0.0', expected: '2.0.0', packagePresent: true },
    { input: '3.0.0', env: '', expected: '3.0.0', packagePresent: false },
  ])('real CLI resolves upload version through inputs/env/package: %j', async ({ input, env, expected, packagePresent }) => {
    const fixture = await createRealCliFixture()
    if (!packagePresent)
      await rm(path.join(fixture.cwd, 'package.json'))
    const result = fixture.run({ ...weixinInputs(), INPUT_UPLOAD_VERSION: input, WOTCI_VERSION: env })
    expect(result.status, result.stderr).toBe(0)
    expect((await fixture.captured()).results[0].result.version).toBe(expected)
    expect(await readdir(fixture.runnerTemp)).toEqual([])
  }, 20000)

  it.each(['project-inline-key', 'project-owned-key', 'key'])('real CLI reports failure and cleans up for %s', async (missing) => {
    const fixture = await createRealCliFixture()
    const ownedKey = path.join(fixture.cwd, 'owned.key')
    await writeFile(ownedKey, privateKey)
    const summary = path.join(fixture.cwd, 'failure summary.md')
    const result = fixture.run({
      ...weixinInputs(),
      INPUT_SUMMARY: summary,
      ...(missing === 'key'
        ? { INPUT_PRIVATE_KEY: '', INPUT_PRIVATE_KEY_PATH: 'missing.key' }
        : { INPUT_PROJECT_PATH: 'missing output' }),
      ...(missing === 'project-owned-key' ? { INPUT_PRIVATE_KEY: '', INPUT_PRIVATE_KEY_PATH: 'owned.key' } : {}),
    })
    expect(result.status, result.stderr).toBe(1)
    expect((await fixture.captured()).ok).toBe(false)
    expect(await readFile(summary, 'utf8')).toContain('| weixin | ❌ |')
    expect(await readFile(ownedKey, 'utf8')).toBe(privateKey)
    expect(await readdir(fixture.runnerTemp)).toEqual([])
    expect(result.stdout + result.stderr).not.toContain(privateKey)
  }, 20000)

  it('real CLI honors a discovered config factory despite direct-mode env credentials', async () => {
    const fixture = await createRealCliFixture()
    await writeFile(path.join(fixture.cwd, 'owned.key'), privateKey)
    const configFile = path.join(fixture.cwd, 'wotci.config.cjs')
    await writeFile(configFile, `module.exports = ({ env }) => ({
  version: '4.0.0',
  weixin: { appid: env.WEIXIN_APPID, projectPath: 'build output', privateKeyPath: 'owned.key' },
})`)
    const result = fixture.run({ INPUT_PLATFORM: 'weixin', WEIXIN_APPID: 'factory-app', WEIXIN_PROJECT_PATH: 'wrong-output', WEIXIN_PRIVATE_KEY_PATH: 'wrong-key', WOTCI_VERSION: '9.0.0' })
    expect(result.status, result.stderr).toBe(0)
    const output = await fixture.captured()
    expect(await realpath(output.config.sourceFile)).toBe(await realpath(configFile))
    expect(output.results[0].result.version).toBe('4.0.0')
    expect(await readdir(fixture.runnerTemp)).toEqual([])
  }, 20000)

  it('real CLI direct inputs bypass an existing config that would throw', async () => {
    const fixture = await createRealCliFixture()
    await writeFile(path.join(fixture.cwd, 'wotci.config.cjs'), 'throw new Error("project config must not run")')
    const result = fixture.run(weixinInputs())
    expect(result.status, result.stderr).toBe(0)
    expect((await fixture.captured()).ok).toBe(true)
    expect(await readdir(fixture.runnerTemp)).toEqual([])
  }, 20000)

  it.each(['weixin', 'alipay', 'dingtalk'])('real CLI validates %s upload with no project config or installed package', async (platform) => {
    const fixture = await createRealCliFixture()
    const result = fixture.run({
      INPUT_PLATFORM: platform,
      INPUT_PROJECT_PATH: 'build output',
      INPUT_APPID: 'fixture-app',
      ...(platform === 'dingtalk' ? { INPUT_TOKEN: 'test-only-token' } : { INPUT_PRIVATE_KEY: privateKey }),
      ...(platform === 'alipay' ? { INPUT_TOOL_ID: 'test-tool' } : {}),
    })
    expect(result.status, result.stderr).toBe(0)
    const output = await fixture.captured()
    expect(output.ok).toBe(true)
    expect(JSON.stringify(output)).toContain('1.2.3')
    expect(JSON.stringify(output)).toContain(path.join(fixture.cwd, 'build output'))
    expect(await readdir(fixture.runnerTemp)).toEqual([])
  }, 20000)
})
