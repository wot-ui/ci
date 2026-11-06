import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import { parse } from 'yaml'

interface Step {
  'name': string
  'run'?: string
  'if'?: string
  'uses'?: string
  'with'?: Record<string, string>
  'continue-on-error'?: boolean
}

const repoRoot = path.resolve(import.meta.dirname, '..')
const workflow = parse(await readFile(path.join(repoRoot, '.github/workflows/upload-playground.yml'), 'utf8'))
const steps = workflow.jobs.upload.steps as Step[]
const tempDirs: string[] = []

/**
 * 按名称取得工作流中的可执行步骤，供测试直接运行其 shell 脚本。
 * @throws 当步骤不存在或未配置 run 脚本时抛错，避免测试静默跳过。
 */
function step(name: string): Step {
  const found = steps.find(item => item.name === name)
  if (!found?.run)
    throw new Error(`缺少工作流脚本：${name}`)
  return found
}

async function fixture() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'wotci-playground-'))
  tempDirs.push(cwd)
  const env = {
    ...process.env,
    EVENT_NAME: 'workflow_dispatch',
    GITHUB_ENV: path.join(cwd, 'env'),
    GITHUB_OUTPUT: path.join(cwd, 'output'),
    RUNNER_TEMP: cwd,
    WOTCI_DESC: 'workflow test',
  }
  return { cwd, env }
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { force: true, recursive: true })))
})

describe.skipIf(process.platform === 'win32')('playground workflow', () => {
  it.each([
    ['push', 'upload', 'weixin', 'false', 'true'],
    ['workflow_dispatch', 'upload', 'dingtalk', 'false', 'false'],
    ['workflow_dispatch', 'preview', 'weixin', 'true', 'true'],
    ['workflow_dispatch', 'preview', 'alipay', 'false', 'false'],
  ])('解析 %s / %s / %s，dry-run=%s', async (event, command, platform, inputDryRun, dryRun) => {
    const { cwd, env } = await fixture()
    execFileSync('bash', ['-c', step('Resolve run inputs').run!], {
      cwd,
      env: { ...env, EVENT_NAME: event, INPUT_COMMAND: command, INPUT_PLATFORM: platform, INPUT_DRY_RUN: inputDryRun },
    })
    const output = await readFile(env.GITHUB_OUTPUT, 'utf8')
    expect(output).toContain(`command=${command}\n`)
    expect(output).toContain(`platform=${platform}\n`)
    expect(output).toContain(`dry_run=${dryRun}\n`)
  })

  it.each([
    ['preview', 'dingtalk'],
    ['release', 'weixin'],
  ])('拒绝未接入的命令组合 %s / %s', async (command, platform) => {
    const { cwd, env } = await fixture()
    expect(() => execFileSync('bash', ['-c', step('Resolve run inputs').run!], {
      cwd,
      env: { ...env, INPUT_COMMAND: command, INPUT_PLATFORM: platform },
      stdio: 'pipe',
    })).toThrow()
  })

  it('独立 Action 使用当前构建的 CLI，入口保留参数和退出码', async () => {
    const { cwd, env } = await fixture()
    await mkdir(path.join(cwd, 'dist'))
    await writeFile(path.join(cwd, 'dist/bin.mjs'), `import fs from 'node:fs'
fs.writeFileSync(process.env.ARGS_FILE, JSON.stringify(process.argv.slice(2)))
process.exit(Number(process.env.CLI_EXIT_CODE || 0))
`)
    const argsFile = path.join(cwd, 'args')
    const testEnv = { ...env, GITHUB_WORKSPACE: cwd, ARGS_FILE: argsFile }
    execFileSync('bash', ['-c', step('Use workspace CLI in the action').run!], { cwd, env: testEnv })
    const binary = path.join(cwd, 'playground/node_modules/.bin/wotci')
    const args = ['upload', '--config', 'config with spaces.ts', '--dry-run']
    execFileSync(binary, args, { cwd, env: testEnv })
    expect(JSON.parse(await readFile(argsFile, 'utf8'))).toEqual(args)
    expect(() => execFileSync(binary, args, { cwd, env: { ...testEnv, CLI_EXIT_CODE: '7' } }))
      .toThrow(expect.objectContaining({ status: 7 }))
  })

  it.each(['upload', 'preview'])('独立 Action 接收 %s 配置并分别归档预演与执行结果', (command) => {
    const plan = steps.find(item => item.name === 'Capability plan (dry-run)')!
    const execution = steps.find(item => item.name === (command === 'upload' ? 'Upload' : 'Preview'))!
    for (const selected of [plan, execution]) {
      expect(selected.uses).toBe('wot-ui/ci-action@v1.0.0')
      expect(selected.run).toBeUndefined()
      expect(selected.with?.config).toBe('wotci.config.ts')
      expect(selected.with?.['working-directory']).toBe('playground')
      expect(selected.with?.platform).toBe(`\${{ steps.inputs.outputs.platform }}`)
    }
    expect(plan.with?.['dry-run']).toBe('true')
    expect(plan.with?.['json-output']).toBe(`\${{ runner.temp }}/plan.json`)
    expect(execution.with?.command).toBe(command)
    expect(execution.with?.['dry-run']).toBeUndefined()
    expect(execution.with?.['json-output']).toBe(`\${{ runner.temp }}/${command}.json`)
    expect(execution.with?.summary).toBe(`\${{ runner.temp }}/${command}-summary.md`)
    expect(execution['continue-on-error']).not.toBe(true)
    expect(execution.if).toContain('dry_run != \'true\'')
    expect(execution.if).toContain(`command == '${command}'`)
    if (command === 'preview')
      expect(execution.with?.args).toBe(`--qr-output \${{ runner.temp }}/preview.png`)
  })

  it('doctor 使用独立 Action，网络诊断失败不阻塞上传', () => {
    const doctor = steps.find(item => item.name === 'Doctor')!
    const network = steps.find(item => item.name === 'Doctor network check')!
    expect(doctor.uses).toBe('wot-ui/ci-action@v1.0.0')
    expect(doctor.with).toMatchObject({ 'command': 'doctor', 'config': 'wotci.config.ts', 'working-directory': 'playground' })
    expect(network.uses).toBe('wot-ui/ci-action@v1.0.0')
    expect(network.with).toMatchObject({ command: 'doctor', network: 'true' })
    expect(network['continue-on-error']).toBe(true)
    expect(network.if).toContain('dry_run != \'true\'')
  })

  it('记录精确版本与失败 outcome，缺依赖记 null，环境凭证不进入元数据', async () => {
    const { cwd, env } = await fixture()
    await writeFile(path.join(cwd, 'package.json'), '{"version":"0.4.1"}')
    await mkdir(path.join(cwd, 'node_modules/miniprogram-ci'), { recursive: true })
    await writeFile(path.join(cwd, 'node_modules/miniprogram-ci/package.json'), '{"version":"2.1.31"}')
    execFileSync('bash', ['-c', step('Record validation context').run!], {
      cwd,
      env: {
        ...env,
        COMMAND: 'preview',
        PLATFORM: 'weixin',
        DRY_RUN: 'false',
        GITHUB_SHA: 'test-commit',
        GITHUB_SERVER_URL: 'https://github.com',
        GITHUB_REPOSITORY: 'wot-ui/ci',
        GITHUB_RUN_ID: '123',
        GITHUB_RUN_ATTEMPT: '2',
        PLAN_OUTCOME: 'success',
        UPLOAD_OUTCOME: 'skipped',
        PREVIEW_OUTCOME: 'failure',
        WEIXIN_PRIVATE_KEY: 'sentinel-private-key',
        DINGTALK_TOKEN: 'sentinel-token',
      },
    })
    const raw = await readFile(path.join(cwd, 'validation-context.json'), 'utf8')
    const context = JSON.parse(raw)
    expect(context).toMatchObject({
      cliVersion: '0.4.1',
      commit: 'test-commit',
      mode: 'real',
      node: process.version,
      projectType: 'miniProgram',
      runUrl: 'https://github.com/wot-ui/ci/actions/runs/123',
      runAttempt: '2',
      sdks: { 'miniprogram-ci': '2.1.31', 'minidev': null, 'dingtalk-miniapp-opensdk': null },
      outcomes: { plan: 'success', upload: 'skipped', preview: 'failure' },
    })
    expect(raw).not.toContain('sentinel')
    expect(raw).not.toContain('PRIVATE_KEY')
  })
})
