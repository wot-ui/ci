import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { parseOptions, validatePlatformOptions } from './github-action-options.mjs'

// This adapter ships with the action, not the npm package. Its plain CJS output
// also works with existing CLI releases and projects without @wot-ui/ci installed.
const env = process.env
const directInputs = ['PROJECT_PATH', 'APPID', 'PRIVATE_KEY', 'PRIVATE_KEY_PATH', 'UPLOAD_VERSION', 'UPLOAD_DESC', 'ROBOT', 'TOOL_ID', 'TOKEN', 'SETTING', 'PREVIEW', 'PLATFORM_OPTIONS']
const hasValue = value => typeof value === 'string' && value.trim().length > 0
const input = key => hasValue(env[`INPUT_${key}`]) ? env[`INPUT_${key}`] : undefined
const variable = key => hasValue(env[key]) ? env[key] : undefined
const choose = (key, envKey) => input(key) ?? variable(envKey)
function fail(message) {
  throw new Error(message)
}

function requireValue(value, label) {
  if (!hasValue(value))
    fail(`缺少 ${label}`)
  return value
}

function readPackage() {
  if (!existsSync('package.json'))
    return {}
  try {
    return JSON.parse(readFileSync('package.json', 'utf8'))
  }
  catch {
    fail('无法解析 working-directory 中的 package.json')
  }
}

function hasProjectConfig(pkg) {
  return ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'].some(ext => existsSync(`wotci.config.${ext}`))
    || existsSync('.minicirc')
    || pkg.wotci !== undefined
    || pkg['uni-mini-ci'] !== undefined
}

function prepareConfig(directory) {
  const explicitDirect = directInputs.some(key => input(key) !== undefined)
  if (input('CONFIG')) {
    if (explicitDirect)
      fail('config 不能与无配置文件模式的 inputs 混用；请在配置文件中读取 env，或移除 config')
    return
  }

  const extraArgs = (input('ARGS') ?? '').split(/\s+/)
  // Legacy callers may select a config or another cwd through passthrough args.
  // Keep that route intact unless they explicitly opt into direct inputs.
  if (!explicitDirect && extraArgs.some(arg => /^(?:--config|--cwd|-c)(?:=|$)/.test(arg)))
    return

  const pkg = readPackage()
  // Existing workflows often pass credentials via env into an auto-discovered
  // config. Never replace that config merely because those env vars are present.
  if (!explicitDirect && hasProjectConfig(pkg))
    return
  const platform = input('PLATFORM')?.trim() === 'dd' ? 'dingtalk' : input('PLATFORM')?.trim()
  if (!explicitDirect) {
    const prefix = platform?.toUpperCase()
    const hasPlatformEnv = prefix && ['APPID', 'PROJECT_PATH', 'PRIVATE_KEY', 'PRIVATE_KEY_PATH', 'TOKEN', 'TOOL_ID', 'ROBOT', 'SETTING', 'PREVIEW', 'OPTIONS']
      .some(key => variable(`${prefix}_${key}`))
    if (!hasPlatformEnv)
      return
  }
  if (!['weixin', 'alipay', 'dingtalk'].includes(platform))
    fail('无配置文件模式需要一个 platform（weixin / alipay / dingtalk）；多平台请使用矩阵或配置文件')

  const command = (input('COMMAND') ?? 'upload').trim()
  if (!['upload', 'preview', 'doctor'].includes(command))
    fail('无配置文件模式支持 upload / preview / doctor；其他命令请使用配置文件')
  if (extraArgs.some(arg => /^(?:--config|--cwd|--platform|--all|-c|-p)(?:=|$)/.test(arg)))
    fail('无配置文件模式不能通过 args 覆盖 config、cwd 或 platform；请使用对应 input')

  const prefix = platform.toUpperCase()
  const platformValue = key => choose(key, `${prefix}_${key}`)
  const options = parseOptions(choose('PLATFORM_OPTIONS', `${prefix}_OPTIONS`), 'platform-options') ?? {}
  // Validate even fields later overridden by dedicated inputs: typos and
  // credential fields in the options object should never be silently ignored.
  validatePlatformOptions(platform, options)
  const setting = parseOptions(platformValue('SETTING'), 'setting')
  const preview = parseOptions(platformValue('PREVIEW'), 'preview')
  if (setting !== undefined)
    options.setting = setting
  if (preview !== undefined)
    options.preview = preview
  validatePlatformOptions(platform, options)
  const config = {
    version: choose('UPLOAD_VERSION', 'WOTCI_VERSION'),
    desc: choose('UPLOAD_DESC', 'WOTCI_DESC'),
  }
  const target = {
    ...options,
    appid: requireValue(platformValue('APPID'), `appid / ${prefix}_APPID`).trim(),
    projectPath: requireValue(platformValue('PROJECT_PATH'), `project-path / ${prefix}_PROJECT_PATH`).trim(),
  }

  if (command === 'upload' && !hasValue(config.version) && !hasValue(pkg.version))
    fail('上传需要 upload-version / WOTCI_VERSION，或 package.json 中的 version')

  if (platform === 'dingtalk') {
    if (input('PRIVATE_KEY') || input('PRIVATE_KEY_PATH') || input('TOOL_ID') || input('ROBOT'))
      fail('钉钉不支持 private-key、private-key-path、tool-id 或 robot inputs')
    target.token = requireValue(platformValue('TOKEN'), 'token / DINGTALK_TOKEN')
  }
  else {
    if (input('TOKEN') || (platform === 'weixin' && input('TOOL_ID')) || (platform === 'alipay' && input('ROBOT')))
      fail('存在与所选平台不匹配的 token、tool-id 或 robot input')
    // Treat the credential pair as one source: explicit input credentials take
    // precedence over env credentials, including the alternative key form.
    const explicitKey = input('PRIVATE_KEY') || input('PRIVATE_KEY_PATH')
    const privateKey = explicitKey ? input('PRIVATE_KEY') : variable(`${prefix}_PRIVATE_KEY`)
    const privateKeyPath = explicitKey ? input('PRIVATE_KEY_PATH') : variable(`${prefix}_PRIVATE_KEY_PATH`)
    if (privateKey && privateKeyPath)
      fail('private-key 与 private-key-path 只能提供一个（env 中的对应字段同样互斥）')
    if (!privateKey && !privateKeyPath)
      fail(`缺少 private-key / private-key-path，或 ${prefix}_PRIVATE_KEY / ${prefix}_PRIVATE_KEY_PATH`)

    if (platform === 'weixin') {
      const robot = platformValue('ROBOT') ?? String(target.robot ?? 1)
      if (!/^\d+$/.test(robot) || Number(robot) < 1 || Number(robot) > 30)
        fail('robot / WEIXIN_ROBOT 必须是 1 到 30 的整数')
      target.robot = Number(robot)
      target.setting = { useProjectConfig: true, ...target.setting }
    }
    else {
      target.toolId = requireValue(platformValue('TOOL_ID'), 'tool-id / ALIPAY_TOOL_ID').trim()
    }

    if (privateKey) {
      target.privateKeyPath = path.join(directory, 'private.key')
      writeFileSync(target.privateKeyPath, privateKey, { mode: 0o600, flag: 'wx' })
    }
    else {
      // User-provided paths keep CLI semantics: relative to working-directory.
      target.privateKeyPath = privateKeyPath.trim()
    }
  }

  config[platform] = target
  const configFile = path.join(directory, 'wotci.config.cjs')
  writeFileSync(configFile, `module.exports = ${JSON.stringify(config, null, 2)}\n`, { mode: 0o600, flag: 'wx' })
  return configFile
}

try {
  const file = prepareConfig(path.resolve(process.argv[2]))
  if (file)
    process.stdout.write(file)
}
catch (error) {
  console.error(`[wotci-action] ${error.message}`)
  process.exitCode = 1
}
