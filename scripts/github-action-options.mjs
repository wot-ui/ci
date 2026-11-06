// JSON inputs retain the public platform configuration field names. This module
// has no package dependencies because the action also runs without a local CLI.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const boolean = value => typeof value === 'boolean'
const string = value => typeof value === 'string'
const integer = value => Number.isInteger(value) && value >= 0
const robot = value => Number.isInteger(value) && value >= 1 && value <= 30
const oneOf = values => value => values.includes(value)

function check(value, schema, label, allowUnknown = false) {
  if (!object(value))
    throw new Error(`${label} 必须是 JSON 对象`)
  for (const [key, item] of Object.entries(value)) {
    if (!Object.hasOwn(schema, key)) {
      if (allowUnknown)
        continue
      throw new Error(`${label} 包含不支持的字段；请使用该平台的扩展字段，凭据和路径使用专用 inputs`)
    }
    if (!schema[key](item))
      throw new Error(`${label}.${key} 类型或取值无效`)
  }
  return true
}

/** Parse JSON without echoing potentially sensitive input in parser errors. */
export function parseOptions(value, label) {
  if (value === undefined)
    return undefined
  let parsed
  try {
    parsed = JSON.parse(value, (key, item) => {
      if (['__proto__', 'prototype', 'constructor'].includes(key))
        throw new Error('unsafe key')
      return item
    })
  }
  catch {
    throw new Error(`${label} 必须是有效 JSON，且不能包含原型相关字段`)
  }
  if (!object(parsed))
    throw new Error(`${label} 必须是 JSON 对象`)
  return parsed
}

function setting(value) {
  return check(value, Object.fromEntries([
    'useProjectConfig',
    'es6',
    'es7',
    'disableUseStrict',
    'minifyJS',
    'minifyWXML',
    'minifyWXSS',
    'minify',
    'codeProtect',
    'autoPrefixWXSS',
    'compileWorklet',
  ].map(key => [key, boolean])), 'setting', true)
}

function weixinPreview(value) {
  return check(value, {
    qrcodeFormat: oneOf(['terminal', 'image', 'base64']),
    qrcodeOutputDest: string,
    pagePath: string,
    searchQuery: string,
    scene: integer,
    desc: string,
    robot,
    setting,
    threads: integer,
    bigPackageSizeSupport: boolean,
  }, 'preview')
}

function alipayPreview(value) {
  return check(value, {
    page: string,
    pageQuery: string,
    query: string,
    scene: string,
    autoPush: boolean,
    ignoreHttpDomainCheck: boolean,
    ignoreWebViewDomainCheck: boolean,
  }, 'preview')
}

/** Validate the platform-specific optional fields before any CLI/SDK is run. */
export function validatePlatformOptions(platform, options) {
  const schemas = {
    weixin: {
      type: oneOf(['miniProgram', 'miniGame', 'miniProgramPlugin', 'miniGamePlugin']),
      ignores: value => Array.isArray(value) && value.every(string),
      robot,
      setting,
      preview: weixinPreview,
      ide: value => check(value, { cliPath: string, port: value => Number.isInteger(value) && value > 0 && value <= 65535, lang: oneOf(['zh', 'en']) }, 'ide'),
    },
    alipay: {
      clientType: oneOf(['alipay', 'ampe', 'amap', 'genie', 'alios', 'uc', 'quark', 'koubei', 'alipayiot', 'cainiao', 'alihealth', 'health']),
      autoincrement: boolean,
      preview: alipayPreview,
      ide: value => check(value, { appPath: string }, 'ide'),
    },
    dingtalk: {
      projectType: oneOf(['dingtalk-personal', 'dingtalk-biz-isv', 'dingtalk-biz', 'dingtalk-biz-custom', 'dingtalk-biz-worktab-plugin']),
      autoincrement: boolean,
    },
  }
  check(options, schemas[platform], 'platform-options')
}
