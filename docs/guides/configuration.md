# 配置

## 配置加载顺序

按以下优先级从高到低查找，命中即停止：

1. JS API 传入的内联 `config`
2. CLI `--config` 或 JS API 传入的 `configFile`
3. 当前目录下的 `wotci.config.js`
4. `wotci.config.mjs`
5. `wotci.config.cjs`
6. `wotci.config.ts`
7. `wotci.config.mts`
8. `wotci.config.cts`
9. `package.json` 中的 `wotci` 字段
10. 当前目录下的 `.minicirc`（兼容 `uni-mini-ci`，支持 JSON5）
11. `package.json` 中的 `uni-mini-ci` 字段（兼容旧项目）
12. `package.json` 的 `version` / `description` 默认值

`version` 和 `desc` 没有显式配置时，会分别回退到 `package.json` 的 `version` 和 `description`。

## 用 init 生成配置

```sh
wotci init
wotci init --platform weixin,alipay
wotci init --config ci.config.ts
wotci init --force
wotci init --dry-run --json
```

- 自动探测 `dist/build/mp-weixin`、`dist/build/mp-alipay`、`dist/build/mp-dingtalk` 等产物目录
- 探测不到平台时生成三端模板
- 默认写 `wotci.config.ts`，指定 `.js` 时生成 JS 配置
- 已存在配置文件时默认拒绝，`--force` 覆盖
- `--dry-run` 只输出内容，不写文件
- `--json` 输出生成路径、平台与内容

生成后按环境变量注入 appid / 私钥路径即可，例如：

```ts
export default defineConfig(({ env, packageJson }) => ({
  version: env.WOTCI_VERSION ?? packageJson?.version,
  weixin: {
    appid: env.WEIXIN_APPID!,
    projectPath: env.WEIXIN_PROJECT_PATH ?? 'dist/build/mp-weixin',
    privateKeyPath: env.WEIXIN_PRIVATE_KEY_PATH!,
    robot: 1,
    setting: { useProjectConfig: true },
  },
}))
```

## 配置工厂

```ts
import type { AlipayClientType } from '@wot-ui/ci'
import { defineConfig } from '@wot-ui/ci'

export default defineConfig(({ env, packageJson }) => ({
  version: env.WOTCI_VERSION ?? packageJson?.version,
  desc: env.WOTCI_DESC ?? packageJson?.description,
  weixin: {
    appid: env.WEIXIN_APPID!,
    projectPath: env.WEIXIN_PROJECT_PATH || 'dist/build/mp-weixin',
    privateKeyPath: env.WEIXIN_PRIVATE_KEY_PATH!,
    robot: env.WEIXIN_ROBOT ? Number(env.WEIXIN_ROBOT) : 1,
    setting: {
      useProjectConfig: true,
    },
  },
  alipay: {
    appid: env.ALIPAY_APPID!,
    toolId: env.ALIPAY_TOOL_ID!,
    projectPath: env.ALIPAY_PROJECT_PATH || 'dist/build/mp-alipay',
    privateKey: env.ALIPAY_PRIVATE_KEY,
    privateKeyPath: env.ALIPAY_PRIVATE_KEY_PATH,
    clientType: env.ALIPAY_CLIENT_TYPE as AlipayClientType | undefined,
    autoincrement: env.ALIPAY_AUTOINCREMENT === 'true',
  },
  dingtalk: {
    appid: env.DINGTALK_APPID!,
    token: env.DINGTALK_TOKEN!,
    projectPath: env.DINGTALK_PROJECT_PATH || 'dist/build/mp-dingtalk',
    autoincrement: env.DINGTALK_AUTOINCREMENT === 'true',
  },
}))
```

配置工厂会收到：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `cwd` | `string` | 配置解析目录的绝对路径 |
| `env` | `NodeJS.ProcessEnv` | 当前进程环境变量 |
| `packageJson` | `object \| undefined` | 当前目录下的 `package.json` |

> 在 `package.json` 没有 `"type": "module"` 的 CommonJS 项目中，`wotci.config.ts` 也能正确加载；旧版本中 tsx 双层 `default` 包装导致配置丢失的问题已修复。

## 微信 weixin

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `projectPath` | `string` | 是 | 小程序产物目录，例如 `dist/build/mp-weixin` |
| `appid` | `string` | 是 | 小程序 / 小游戏 appid |
| `privateKeyPath` | `string` | 是 | 代码上传密钥文件路径；密钥需在微信公众平台生成并配置 IP 白名单 |
| `type` | `string` | 否 | `miniProgram`（默认）/ `miniGame` / `miniProgramPlugin` / `miniGamePlugin` |
| `ignores` | `string[]` | 否 | 上传时排除的目录或文件 |
| `robot` | `number` | 否 | 使用第几个 CI 机器人，1 ~ 30 |
| `setting` | `object` | 否 | 上传编译设置，透传给 `miniprogram-ci` |
| `ide` | `object` | 否 | 开发者工具配置：`cliPath`、`port`、`lang` |
| `preview` | `object` | 否 | 预览配置：`qrcodeFormat`、`qrcodeOutputDest`、`pagePath`、`searchQuery`、`scene`、`robot` 等 |

`setting` 常用字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `useProjectConfig` | `boolean` | 使用项目 `project.config.json` 中的设置 |
| `es6` | `boolean` | 「es6 转 es5」 |
| `es7` | `boolean` | 「增强编译」 |
| `disableUseStrict` | `boolean` | 增强编译时禁用 JS 严格模式 |
| `minifyJS` | `boolean` | 压缩 JS |
| `minifyWXML` | `boolean` | 压缩 WXML |
| `minifyWXSS` | `boolean` | 压缩 WXSS |
| `minify` | `boolean` | 压缩所有代码 |
| `codeProtect` | `boolean` | 代码保护 |
| `autoPrefixWXSS` | `boolean` | 样式自动补全 |
| `compileWorklet` | `boolean` | 编译 worklet |

微信 CI 文档：<https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html>

## 支付宝 alipay

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `projectPath` | `string` | 是 | 小程序产物目录 |
| `appid` | `string` | 是 | 小程序 appid |
| `toolId` | `string` | 是 | 开放平台工具 ID：<https://open.alipay.com/dev/workspace/key-manage/tool> |
| `privateKey` | `string` | 二选一 | 私钥文本内容 |
| `privateKeyPath` | `string` | 二选一 | 私钥文件路径 |
| `clientType` | `string` | 否 | 上传终端，默认 `alipay` |
| `autoincrement` | `boolean` | 否 | 是否由平台自动递增版本号，默认 `false` |
| `ide` | `object` | 否 | 开发者工具配置：`appPath` |
| `preview` | `object` | 否 | 预览配置：`page`、`pageQuery`、`query`、`scene`、`autoPush` 等 |

`clientType` 可选值：`alipay`、`ampe`、`amap`、`genie`、`alios`、`uc`、`quark`、`koubei`、`alipayiot`、`cainiao`、`alihealth`、`health`。

支付宝 CLI 文档：<https://opendocs.alipay.com/mini/02q29z>

## 钉钉 dingtalk

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `projectPath` | `string` | 是 | 小程序产物目录 |
| `appid` | `string` | 是 | 开放平台 MiniAppId |
| `token` | `string` | 是 | 开放平台 API Token |
| `projectType` | `string` | 否 | 应用类型，当前仅保留字段 |
| `autoincrement` | `boolean` | 否 | 是否由平台自动递增版本号，默认 `false` |

钉钉上传文档：<https://github.com/open-dingtalk/dingtalk-design-cli>

`projectType` 可选值：`dingtalk-personal`、`dingtalk-biz-isv`、`dingtalk-biz`、`dingtalk-biz-custom`、`dingtalk-biz-worktab-plugin`。该字段目前不传给上传 SDK，不能据此切换上传行为。

## 兼容 uni-mini-ci

`.minicirc`（JSON5）可以继续使用：

```jsonc
// .minicirc
{
  "version": "1.0.0",
  "desc": "发布描述",
  "weixin": {
    "appid": "微信小程序 appid",
    "privateKeyPath": "keys/private.appid.key",
    "projectPath": "dist/build/mp-weixin"
  },
  "alipay": {
    "appid": "支付宝小程序 appid",
    "toolId": "支付宝开放平台工具 ID",
    "privateKey": "私钥文本内容",
    "projectPath": "dist/build/mp-alipay",
    "autoincrement": true
  },
  "dd": {
    "appid": "钉钉 MiniAppId",
    "token": "钉钉 API Token",
    "projectPath": "dist/build/mp-dingtalk",
    "autoincrement": true
  }
}
```

`dd` 会在加载后自动归一为 `dingtalk`；同时存在时以 `dingtalk` 为准。`package.json` 里的 `wotci` / `uni-mini-ci` 字段也支持同样的结构。更多差异见 [从 uni-mini-ci 迁移](migration.md#从-uni-mini-ci-迁移)。
