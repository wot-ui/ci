# @wot-ui/ci

[![CI](https://github.com/wot-ui/ci/actions/workflows/ci.yml/badge.svg)](https://github.com/wot-ui/ci/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

面向微信、支付宝、钉钉小程序的多平台 CI 工具：在构建之后完成上传、预览、版本管理与配置体检。由 `uni-mini-ci` 迁移而来，既可以作为 CLI（`wotci`）使用，也可以作为 ESM 库在 JS/TS 中调用。

```text
wotci.config.ts + 构建产物
        │
        ├── doctor    配置 / 产物 / 私钥体检
        ├── upload    上传（支持批量、dry-run、包体积预算）
        ├── preview   预览二维码
        └── release   构建 → 多平台上传 → 历史记录 → PR 评论
```

> 正在把小程序上传接进 GitHub Actions？可以先看 [快速开始](#快速开始) 和 [GitHub Action](#github-action)。

## 目录

- [特性](#特性)
- [环境要求](#环境要求)
- [安装](#安装)
- [快速开始](#快速开始)
  - [准备配置文件](#准备配置文件)
  - [构建并上传](#构建并上传)
  - [上传前先体检](#上传前先体检)
- [CLI 命令速查](#cli-命令速查)
  - [常用参数](#常用参数)
- [配置](#配置)
  - [配置加载顺序](#配置加载顺序)
  - [用 init 生成配置](#用-init-生成配置)
  - [配置工厂](#配置工厂)
  - [微信 weixin](#微信-weixin)
  - [支付宝 alipay](#支付宝-alipay)
  - [钉钉 dingtalk](#钉钉-dingtalk)
  - [兼容 uni-mini-ci](#兼容-uni-mini-ci)
- [上传](#上传)
  - [批量上传](#批量上传)
  - [CI 输出 JSON 与 Step Summary](#ci-输出-json-与-step-summary)
  - [包体积预算](#包体积预算)
- [预览二维码](#预览二维码)
- [版本与发布](#版本与发布)
  - [版本策略](#版本策略)
  - [版本查询](#版本查询)
  - [体验版与版本删除](#体验版与版本删除)
  - [发布编排 release](#发布编排-release)
- [诊断与工具](#诊断与工具)
  - [配置体检 doctor](#配置体检-doctor)
  - [微信构建与诊断](#微信构建与诊断)
  - [打开开发者工具](#打开开发者工具)
- [CI 集成](#ci-集成)
  - [GitHub Action](#github-action)
  - [能力自检](#能力自检)
  - [Vite 与 uni-app 插件](#vite-与-uni-app-插件)
- [JS API](#js-api)
- [错误模型](#错误模型)
- [从 uni-mini-ci 迁移](#从-uni-mini-ci-迁移)
- [Playground](#playground)
- [开发](#开发)
- [路线图](#路线图)
- [License](#license)

## 特性

- **多平台**：微信、支付宝、钉钉小程序上传；微信链路基于 `miniprogram-ci` 2.x
- **两种入口**：CLI `wotci` 与 ESM JS API，另有 [GitHub Action](#github-action) 和 [Vite 插件](#vite-与-uni-app-插件)
- **配置灵活**：支持 `wotci.config.ts/js/mjs/cjs/mts/cts`，可用工厂函数读取 `process.env`；兼容 `.minicirc`、`package.json` 字段与 `dd` 别名
- **上传前可控**：`doctor` 体检、`--dry-run` 本地校验、`--build-npm`、包体积预算
- **预览**：微信 / 支付宝预览二维码，支持文件、终端、URL、base64
- **版本管理**：线上版本查询（微信仅插件类型项目支持），`fixed` / `package` / `auto` 版本策略，支付宝体验版与版本删除
- **发布编排**：`release` 串联构建、多平台上传、历史记录与 PR 评论
- **微信诊断**：构建 npm、SourceMap、编译产物导出、代码质量检查
- **IDE 联动**：打开 / 关闭微信、支付宝开发者工具，支持自动化端口与 IDE 预览
- **工程质量**：ESM 与类型声明；库层不调用 `process.exit`，错误可被调用方捕获

## 环境要求

- Node.js >= 20
- 包本身只提供 ESM 入口；CommonJS 脚本可通过 `await import('@wot-ui/ci')` 调用

## 安装

```sh
# 项目内安装（推荐）
pnpm add -D @wot-ui/ci

# 或
# npm i -D @wot-ui/ci
# yarn add -D @wot-ui/ci
```

也可以全局安装后直接使用 `wotci` 命令：

```sh
pnpm add -g @wot-ui/ci
```

不安装也可以在项目里临时运行：

```sh
npx wotci -p weixin
```

> **交给 AI Agent 一键接入**：把下面这行原样发给你项目里的 Agent，它会装依赖、生成配置，并按你项目现有的发布方式接好上传（GitHub Actions、GitLab CI、Jenkins、自建流水线或纯 npm scripts 都适用）：
>
> ```text
> 给这个项目接入 @wot-ui/ci 小程序 CI：用项目现有包管理器把 @wot-ui/ci 装成 devDependency，执行 wotci init 生成 wotci.config.ts，再把上传接到项目现有的发布方式里——已有 CI 就在它原有的流水线文件里加一个上传步骤，没有就用 npm scripts；appid 与私钥路径一律用环境变量或 CI secrets 注入，不要写进仓库，最后跑 wotci doctor 自检。文档见 https://github.com/wot-ui/ci
> ```

## 快速开始

下面以微信小程序为例，三步完成第一次 CI 上传。

### 准备配置文件

在项目根目录创建 `wotci.config.ts`：

```ts
import { defineConfig } from '@wot-ui/ci'

export default defineConfig({
  version: '1.0.0',
  desc: 'CI 上传',
  weixin: {
    appid: process.env.WEIXIN_APPID!,
    privateKeyPath: process.env.WEIXIN_PRIVATE_KEY_PATH ?? 'keys/weixin.private.key',
    projectPath: 'dist/build/mp-weixin',
    robot: 1,
  },
})
```

私钥是微信公众平台「开发管理 → 开发设置 → 小程序代码上传」生成的密钥文件。上传前需要把 CI 机器的出口 IP 加入白名单（或在公众平台关闭 IP 白名单）。

支付宝、钉钉的配置见 [配置](#配置)。

### 构建并上传

```sh
# 先构建小程序产物
pnpm build

# 上传（wotci 的默认命令就是 upload）
pnpm exec wotci -p weixin
```

通常会把构建和上传组合成 npm scripts：

```json
{
  "scripts": {
    "upload:mp-weixin": "uni build -p mp-weixin && wotci -p weixin",
    "upload:mp-alipay": "uni build -p mp-alipay && wotci -p alipay",
    "upload:mp-dingtalk": "uni build -p mp-dingtalk && wotci -p dingtalk"
  }
}
```

上传成功退出码为 `0`，失败为 `1`，可以直接作为 CI 步骤使用。

### 上传前先体检

```sh
pnpm exec wotci doctor
```

`doctor` 会检查 Node 版本、配置来源、产物目录、`project.config.json` / `app.json`、私钥权限与 PEM 格式。加上 `--network` 还会调用线上接口，提前暴露 appid、私钥或 IP 白名单问题：

```sh
pnpm exec wotci doctor --network
```

注意：`miniprogram-ci` 的 `getLatestVersion` 只支持插件类型项目（`miniProgramPlugin` / `miniGamePlugin`）。普通小程序会跳过微信网络校验并给出 `warn`，不会阻塞上传。

## CLI 命令速查

| 场景 | 命令 |
| --- | --- |
| 上传单平台 | `wotci -p weixin` |
| 上传所有已配置平台 | `wotci upload --all` |
| 只校验、不上传 | `wotci upload --all --dry-run` |
| 生成预览二维码 | `wotci preview -p weixin` |
| 构建并发布 | `wotci release` |
| 查询线上版本 | `wotci version latest -p weixin` |
| 配置体检 | `wotci doctor` |
| 微信构建 npm | `wotci build-npm -p weixin` |
| 微信 SourceMap | `wotci sourcemap -p weixin` |
| 打开开发者工具 | `wotci open -p weixin` |
| 生成配置文件 | `wotci init` |

各命令的专属参数见对应章节，`wotci --help` 可以查看当前版本支持的全部参数。

### 常用参数

| 参数 | 说明 |
| --- | --- |
| `-p, --platform <name>` | 目标平台：`weixin`、`alipay`、`dingtalk`，`dd` 是 `dingtalk` 的别名 |
| `-c, --config <file>` | 显式指定配置文件，相对路径基于 `--cwd` 解析 |
| `--cwd <dir>` | 配置解析目录，默认 `process.cwd()` |
| `--json` | stdout 只输出 JSON，日志走 stderr |
| `--summary <file>` | 生成 Markdown 摘要，可直接写入 `$GITHUB_STEP_SUMMARY` |
| `--dry-run` | 只做本地校验，不调用 SDK |
| `--concurrency <n>` | 批量上传 / 预览的并发数，默认 `1`（串行） |
| `--build-npm` | 上传 / 预览前执行微信「构建 npm」 |
| `--output <file>` | `sourcemap` / `inspect` / `quality` 的输出路径 |
| `--streaming` | `sourcemap` 使用流式下载 |
| `--ignores <list>` | `build-npm` 的排除规则，逗号分隔 |
| `-h, --help` | 查看帮助 |

## 配置

### 配置加载顺序

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

### 用 init 生成配置

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

### 配置工厂

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

### 微信 weixin

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

微信 CI 文档：<https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html>

### 支付宝 alipay

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

### 钉钉 dingtalk

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `projectPath` | `string` | 是 | 小程序产物目录 |
| `appid` | `string` | 是 | 开放平台 MiniAppId |
| `token` | `string` | 是 | 开放平台 API Token |
| `projectType` | `string` | 否 | 应用类型，当前仅保留字段 |
| `autoincrement` | `boolean` | 否 | 是否由平台自动递增版本号，默认 `false` |

钉钉上传文档：<https://github.com/open-dingtalk/dingtalk-design-cli>

### 兼容 uni-mini-ci

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

`dd` 会在加载后自动归一为 `dingtalk`；同时存在时以 `dingtalk` 为准。`package.json` 里的 `wotci` / `uni-mini-ci` 字段也支持同样的结构。更多差异见 [从 uni-mini-ci 迁移](#从-uni-mini-ci-迁移)。

## 上传

`upload` 是默认命令，下面两种写法等价：

```sh
wotci -p weixin
wotci upload -p weixin
```

- 微信必须有版本号（来自配置或 `package.json`）
- 上传前会自动执行 [版本策略](#版本策略)
- 加 `--build-npm` 可以在上传前执行微信「构建 npm」
- 配置了 [包体积预算](#包体积预算) 时，超限会让该平台判定失败

### 批量上传

```sh
# 执行配置中所有平台
wotci upload --all

# 指定多个平台
wotci upload -p weixin,alipay

# 控制并发（默认 1，串行）
wotci upload --all --concurrency 2

# 只校验，不调用 SDK
wotci upload --all --dry-run

# 批量预览
wotci preview --all

# JSON 输出（stdout 只有 JSON）
wotci upload --all --json

# 写入 GitHub Step Summary
wotci upload --all --summary "$GITHUB_STEP_SUMMARY"
```

- 单个平台失败不中断其它平台，最终退出码为 `1`
- `--dry-run` 只做本地校验：配置、产物目录、私钥、版本；不调用 SDK、不请求网络、不写文件
- `--summary` 生成 Markdown 表格，可直接写入 `$GITHUB_STEP_SUMMARY`

### CI 输出 JSON 与 Step Summary

`--json` 时 stdout 只输出 JSON，日志走 stderr；SDK 写到 stdout 的日志会被自动转发到 stderr。

```json
{
  "schemaVersion": 1,
  "command": "upload",
  "dryRun": false,
  "ok": false,
  "durationMs": 12000,
  "results": [
    {
      "platform": "weixin",
      "ok": true,
      "durationMs": 8000,
      "result": {
        "version": "1.2.3",
        "sizes": { "total": 2048000, "main": 1024000 },
        "message": "微信小程序上传成功"
      }
    },
    {
      "platform": "alipay",
      "ok": false,
      "durationMs": 4000,
      "error": { "code": "UPLOAD_ERROR", "message": "支付宝小程序上传失败" }
    }
  ]
}
```

SDK 原始返回值不会进入 JSON，避免循环引用和超大对象。

### 包体积预算

```ts
export default defineConfig({
  budgets: {
    total: '3MB',
    main: '1.5MB',
    warnOnly: false,
  },
})
```

- 数据来源：微信 `subPackageInfo`（总包、主包）
- 支付宝、钉钉不返回包体积，会自动跳过
- 超限且 `warnOnly: false`：该平台判定失败，退出码 `1`
- `warnOnly: true`：只输出告警
- `upload` / `uploadMany` / `release` / `preview` 均会附带 `budget` 结果
- `release` 会读取历史记录，在 PR 评论里展示体积增减

示例输出：

```text
总包 4.00MB 超出预算 3MB；主包 2.00MB 超出预算 1.5MB
```

## 预览二维码

```sh
# 微信：默认生成 PNG 到 .wotci/preview/weixin.png
wotci preview -p weixin

# 指定页面、参数、场景值和备注
wotci preview -p weixin \
  --page pages/index/index \
  --query "from=ci" \
  --scene 1011 \
  --desc "PR 预览"

# 终端二维码（不落盘）
wotci preview -p weixin --qr-format terminal

# 支付宝：默认输出远程二维码 URL
wotci preview -p alipay

# 支付宝下载二维码到本地
wotci preview -p alipay --qr-output dist/preview-alipay.png
```

| 参数 | 说明 |
| --- | --- |
| `--qr-format <type>` | `terminal`、`image`、`base64`，默认 `image`（微信） |
| `--qr-output <file>` | 二维码输出路径；微信缺省 `.wotci/preview/weixin.png`，支付宝传入后会下载 |
| `--page <path>` | 预览页面路径 |
| `--page-query <str>` | 支付宝页面参数 |
| `--query <str>` | 微信 `searchQuery` / 支付宝全局 `query` |
| `--scene <value>` | 场景值；微信要求整数 |
| `--desc <text>` | 微信预览备注 |
| `--robot <1-30>` | 指定 CI 机器人 |

平台差异：

- **微信**：支持 `terminal` / `image` / `base64`；`image` 返回本地文件路径，`base64` 会把内容读入结果
- **支付宝**：返回远程 `qrcodeUrl`；传 `--qr-output` 时下载到本地
- **钉钉**：SDK 未暴露预览能力，返回明确的不支持错误

## 版本与发布

### 版本策略

```ts
export default defineConfig({
  versionStrategy: { type: 'auto', bump: 'patch' },
  // 要求全部目标查询成功：{ type: 'auto', bump: 'patch', strict: true }
  // 或 { type: 'fixed', version: '1.2.3' }
  // 或 { type: 'package' }
})
```

- `fixed`：使用配置版本
- `package`：读取 `package.json` 的 version；缺失时使用配置版本，并输出回退警告
- `auto`：只查询本次实际上传的目标，取查询成功的最高版本递增；无有效查询结果时按 `package.json` → 配置版本回退，不会修改 `package.json`
- 微信取 `getLatestVersion`，但仅 `miniProgramPlugin` / `miniGamePlugin` 项目支持；普通小程序请用 `fixed` / `package` 策略，支付宝取 `getUploadedVersion`
- 钉钉没有版本查询能力；单独上传时回退到 `package.json` / 配置版本，多平台时可使用其它目标查询成功的版本
- 默认允许查询失败或部分查询成功，输出警告和 `tentative: true`。`strict: true` 要求所有目标均返回有效数字版本；失败、不支持、空值或无效版本都会在上传前终止，`release` 也会在构建前终止
- `--dry-run` 时 `auto` 不发起网络请求，使用 `package.json` / 配置版本递增，查询状态为 `skipped`、版本为暂定；严格模式也允许生成离线计划，实际执行时仍须查询通过

版本策略会应用到 `upload`、`uploadMany`、`release`（以及 Vite 上传），只影响本次上传的版本号。单平台 CLI 加上 `--json` / `--summary` 不会改变查询目标或版本选择。底层 `uploadPlatform` / 各平台上传函数直接使用传入版本，不执行版本策略。

高层 JS API 结果、上传/发布 JSON 的顶层以及发布历史记录包含可选字段 `versionResolution`；CLI、Vite 日志和 Step Summary 展示同一份依据。JSON 与历史 schema 版本仍为 1，旧字段保持不变；旧历史记录可以没有此字段。

| 字段 | 含义 |
| --- | --- |
| `source` / `version` | 保留原有策略名称与最终版本的语义；`source: 'auto'` 不表示查询一定成功 |
| `baseSource` / `baseVersion` | `auto` / `package` 的实际基础来源（`platform`、`package`、`config`；无版本时为 `none`）与递增前版本 |
| `queries` | `auto` 的目标平台、查询状态及成功取得的版本；状态为 `success`、`failed`、`unsupported`、`empty`、`invalid`、`skipped` |
| `tentative` / `warnings` | 是否有任一目标未取得有效线上版本（含离线 dry-run 与部分成功；未选择查询目标时也为暂定），以及查询/回退警告；不保存 SDK 原始异常或凭据 |

自动递增不提供跨进程锁，也不保证版本全局唯一。严格模式只能保证本次查询完整，不能消除并发发布竞争。

各平台版本号规则：

- 微信：必须提供 `version`（可以来自配置或 `package.json`）
- 支付宝、钉钉：`autoincrement` 默认 `false`
  - `autoincrement: false`：必须提供 `version`；支付宝还会校验版本号必须大于线上最新版本
  - `autoincrement: true`：上传时传空版本号，由平台生成，结果版本从接口返回值读取

### 版本查询

```sh
wotci version latest -p weixin
wotci version latest -p alipay
wotci version list -p alipay
wotci version latest -p weixin --json
```

微信的 `version latest` 仅支持插件类型项目；普通小程序会返回 `VersionUnsupportedError`，请以 `package.json` 或配置里的版本为准。支付宝支持 `latest` 和 `list`。

### 体验版与版本删除

仅支付宝支持：

```sh
wotci experience set    -p alipay --version 1.2.3
wotci experience cancel -p alipay --version 1.2.3
wotci version delete    -p alipay --version 1.2.3 --yes
```

- `set` 会把指定版本设为体验版，并返回体验版二维码
- `cancel` 取消体验版
- `delete` 删除线上版本，属于破坏性操作，必须显式 `--yes`
- 微信、钉钉返回 `VersionUnsupportedError`
- 所有操作都支持 `--json`

### 发布编排 release

`release` 把「构建 → 多平台上传 → 记录历史 → 评论 PR」串成一条命令：

```sh
# 构建并发布配置中的所有平台
wotci release

# 覆盖构建命令
wotci release --build "uni build -p mp-weixin"

# 只发布指定平台
wotci release -p weixin,alipay

# 跳过构建，直接上传已有产物
wotci release --skip-build

# 只看计划
wotci release --dry-run

# 关闭历史 / PR 评论
wotci release --no-history --no-pr-comment
```

配置：

```ts
export default defineConfig({
  version: '1.2.3',
  release: {
    buildCommand: 'uni build -p mp-weixin',
    platforms: ['weixin', 'alipay'],
    history: true,
    historyFile: '.wotci/history.json',
    historyLimit: 50,
    prComment: 'auto',
  },
})
```

`release` 的行为：

- 构建命令失败：不再上传，返回构建错误
- 单个平台上传失败：继续其它平台，最后以退出码 `1` 结束
- 历史写入失败、PR 评论失败：只告警，不影响发布结果
- `--dry-run`：不执行构建、不上传、不写历史、不评论

#### 发布历史

默认写入 `.wotci/history.json`：

```json
{
  "version": 1,
  "records": [
    {
      "id": "uuid",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "version": "1.2.3",
      "ok": true,
      "git": { "branch": "main", "commit": "abc1234" },
      "build": { "commands": ["uni build -p mp-weixin"], "ok": true, "skipped": false },
      "platforms": [{ "platform": "weixin", "ok": true, "version": "1.2.3" }]
    }
  ]
}
```

- 自动限制条数（`historyLimit`）
- 原子写入，避免并发写坏文件
- `.wotci/` 已在 `.gitignore` 中

#### PR 评论

在 GitHub Actions 中设置：

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
```

`release` 会自动读取：

- `GITHUB_TOKEN` / `GH_TOKEN`
- `GITHUB_REPOSITORY`
- PR 编号：`GITHUB_EVENT_PATH` 中的 `pull_request.number`，或 `GITHUB_REF=refs/pull/<n>/merge`
- 可选 `GITHUB_API_URL`（GitHub Enterprise）

`GITHUB_TOKEN` / `GH_TOKEN` 需由 workflow 显式注入步骤环境，完整 Action 步骤见 [复用配置文件](#复用配置文件)。没有 token 或 PR 上下文时，默认的自动评论会跳过。

评论内容包含平台结果、版本、包体积、耗时、构建命令、commit 和运行链接；同一 PR 使用 marker 更新已有评论，不会重复刷屏。

## 诊断与工具

### 配置体检 doctor

```sh
wotci doctor
wotci doctor --network
wotci doctor --json
```

检查项：

- Node.js 版本（>= 20）
- 配置来源与多个配置文件冲突
- 各平台必填字段（appid、toolId、token 等）
- 产物目录、`project.config.json` / `app.json`
- 私钥存在性、权限、PEM 格式
- 微信 / 支付宝开发者工具路径
- release 构建命令与 GitHub PR 评论环境
- `--network` 时调用线上版本接口，校验 appid、私钥和 IP 白名单；微信普通小程序不支持该查询，会自动跳过

退出码：有 `error` 时为 `1`，只有 `warn` 时为 `0`。`--json` 输出结构化检查结果，适合 CI。

### 微信构建与诊断

以下能力仅支持微信小程序，底层对应 `miniprogram-ci` 的 `packNpm`、`getDevSourceMap`、`getCompiledResult`、`checkCodeQuality`。所有命令都支持 `--json`，`--summary <file>` 可写入 CI Step Summary。

#### 构建 npm

```sh
wotci build-npm -p weixin
wotci build-npm -p weixin --ignores "packageA/**/*,packageB/**/*"
```

上传 / 预览前也可以自动构建：

```sh
wotci upload  -p weixin --build-npm
wotci preview -p weixin --build-npm
```

`build-npm` 使用配置里的 `weixin.ignores`，`--ignores` 会覆盖它；返回 `warnings` 数组，失败抛 `WeixinDiagnosticError`。

#### SourceMap

```sh
wotci sourcemap -p weixin
wotci sourcemap -p weixin --output dist/sm.zip --robot 2 --streaming
```

默认输出 `.wotci/weixin/sourcemap.zip`，`robot` 缺省取 `weixin.robot`，再回退到 `1`。

#### 编译产物

```sh
wotci inspect -p weixin
wotci inspect -p weixin --output dist/compiled.zip
```

导出最近一次上传的编译产物 zip，默认 `.wotci/weixin/compiled.zip`；`version` 取配置版本，缺省 `0.0.0`。

#### 代码质量

```sh
wotci quality -p weixin
wotci quality -p weixin --output report.json
```

结果包含 `checks`（检查项总数）、`issues`（未通过项）和 `ok`；传 `--output` 时把完整检查结果写入 JSON。默认退出码为 `0`，加 `--fail-on-issues` 可在有未通过项时以退出码 `1` 结束，直接作为 CI 质量门禁。质量检查仍会按配置初始化 `Project`，需要私钥文件存在，但 SDK 不会读取私钥内容。

#### JS 调用示例

```ts
import {
  buildNpm,
  checkCodeQuality,
  downloadCompiledResult,
  downloadSourceMap,
} from '@wot-ui/ci'

const npm = await buildNpm('weixin', {
  cwd: process.cwd(),
  ignores: ['packageA/**/*'],
})
console.log(npm.warnings)

await downloadSourceMap('weixin', {
  cwd: process.cwd(),
  output: 'dist/sm.zip',
  robot: 2,
  streaming: true,
})

await downloadCompiledResult('weixin', {
  cwd: process.cwd(),
  output: 'dist/compiled.zip',
})

const quality = await checkCodeQuality('weixin', {
  cwd: process.cwd(),
  output: 'report.json',
})
console.log(quality.ok, quality.issues)
```

非微信平台会抛 `CapabilityError`（`code: UNSUPPORTED_CAPABILITY`）。

### 打开开发者工具

除了 CI 上传 / 预览，`wotci` 也可以直接打开微信、支付宝开发者工具：

```sh
wotci open -p weixin
wotci open -p weixin --port 9420 --lang zh
wotci open -p alipay

wotci close -p weixin
wotci close -p weixin --quit

# 查询安装与登录状态
wotci ide status -p weixin

# 开启自动化端口，配合 miniprogram-automator
wotci auto -p weixin --port 9420 --trust-project

# 使用 IDE 自身 CLI 生成预览二维码
wotci ide preview -p weixin --qr-output dist/ide-preview.png
```

| 参数 | 说明 |
| --- | --- |
| `--dry-run` | 只打印将要执行的命令，不真正启动 IDE |
| `--force` | 在 `CI=true` 环境下显式允许打开 GUI |
| `--port <number>` | 微信开发者工具 HTTP server 端口 |
| `--lang <zh 或 en>` | 微信开发者工具语言 |
| `--quit` | `close` 时退出整个 IDE，而不是只关闭项目 |
| `--info-output <file>` | `ide preview` 时输出 IDE 的附加信息 |
| `--trust-project` | `auto` 时信任当前项目 |
| `--ticket <ticket>` | `auto` 时使用的 ticket |

平台差异：

- **微信**：通过开发者工具自带 CLI 执行 `open` / `close` / `quit` / `auto` / `preview` / `islogin`，会自动探测 macOS / Windows / Linux 的常见安装路径；也可以用 `weixin.ide.cliPath` 或环境变量 `WECHAT_DEVTOOLS_CLI` 指定
- **支付宝**：通过 `minidev.startIde` 打开，`alipay.ide.appPath` 可指定 IDE 安装路径；暂不支持命令行关闭、状态查询、自动化与 IDE 预览
- **钉钉**：`dingtalk-miniapp-opensdk` 未暴露 IDE 能力，会返回明确的不支持错误

`wotci ide status` 通过 `cli islogin` 判断登录状态；如果 IDE 未启动，该命令可能会启动 IDE。`wotci ide preview` 与 `wotci preview` 的区别是：前者走 IDE 自身 CLI、依赖本机登录态，后者走 `miniprogram-ci`、适合 CI。

为避免 CI 卡在 GUI 上，`CI=true` 时 `open` 默认拒绝执行；`--dry-run` 不受此限制。

## CI 集成

### GitHub Action

仓库根目录提供 composite action。上传可以直接通过 `with` / `env` 配置，无需 `wotci.config.ts`，也不需要为 Action 单独安装 `@wot-ui/ci`。构建仍由项目自己的命令完成。

> 下方示例要求所选 Action ref 已包含无配置文件模式及所用 inputs（如 `json-output`）。`v0` 是维护者更新的主版本标签，不会自动包含所有 `v0.x` 标签；新能力需发布并更新该标签后才能通过 `@v0` 使用。

#### 无配置文件上传

下面以微信为例，将私钥的完整多行文本存入 `WEIXIN_PRIVATE_KEY` Secret，Action 会临时写入权限为 `600` 的文件，执行结束后清理。示例假定项目已通过 `packageManager` 指定 pnpm 版本，且 `pnpm build` 会生成 `dist/build/mp-weixin`；请替换为项目实际构建命令和产物路径：

```yaml
name: Upload

on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - uses: wot-ui/ci@v0
        with:
          platform: weixin
          project-path: dist/build/mp-weixin
          private-key: ${{ secrets.WEIXIN_PRIVATE_KEY }}
          # 上传版本默认读取 package.json，也可设置 upload-version
        env:
          WEIXIN_APPID: ${{ secrets.WEIXIN_APPID }}
```

也可以全部使用环境变量（无配置文件时生效）：

```yaml
- uses: wot-ui/ci@v0
  env:
    WOTCI_PLATFORM: weixin
    WOTCI_VERSION: 1.2.3
    WEIXIN_PROJECT_PATH: dist/build/mp-weixin
    WEIXIN_APPID: ${{ secrets.WEIXIN_APPID }}
    WEIXIN_PRIVATE_KEY: ${{ secrets.WEIXIN_PRIVATE_KEY }}
```

若已有落盘的私钥，可用 `private-key-path` / `WEIXIN_PRIVATE_KEY_PATH` 替代 `private-key` / `WEIXIN_PRIVATE_KEY`。路径相对 `working-directory` 解析，文件必须提前存在；Action 不会修改或删除调用者提供的私钥文件。

无配置文件模式支持微信、支付宝、钉钉的单平台上传，以及平台原有的 `preview` / `doctor` 能力（钉钉不支持预览）。支付宝额外需要 `tool-id` / `ALIPAY_TOOL_ID`，钉钉使用 `token` / `DINGTALK_TOKEN`，不传私钥。多平台使用多个步骤、GitHub Actions 矩阵或配置文件；此模式不会自动构建产物。

支付宝与钉钉可分别使用以下步骤，放在各自产物构建完成之后；`upload-version` 省略时同样读取当前执行目录的 `package.json`：

```yaml
# 支付宝
- uses: wot-ui/ci@v0
  with:
    platform: alipay
    project-path: dist/build/mp-alipay
    appid: ${{ secrets.ALIPAY_APPID }}
    private-key: ${{ secrets.ALIPAY_PRIVATE_KEY }}
    tool-id: ${{ secrets.ALIPAY_TOOL_ID }}

# 钉钉（这里使用 uni-app 的支付宝构建产物，请按实际项目调整）
- uses: wot-ui/ci@v0
  with:
    platform: dingtalk
    project-path: dist/build/mp-alipay
    appid: ${{ secrets.DINGTALK_APPID }}
    token: ${{ secrets.DINGTALK_TOKEN }}
```

| `with` 输入 | `env` 回退 | 说明 |
| --- | --- | --- |
| `platform` | `WOTCI_PLATFORM` | 单个平台：`weixin` / `alipay` / `dingtalk` |
| `project-path` | `WEIXIN_PROJECT_PATH` / `ALIPAY_PROJECT_PATH` / `DINGTALK_PROJECT_PATH` | 必填，构建产物目录 |
| `appid` | `WEIXIN_APPID` / `ALIPAY_APPID` / `DINGTALK_APPID` | 必填，平台应用 ID |
| `private-key` | `WEIXIN_PRIVATE_KEY` / `ALIPAY_PRIVATE_KEY` | 私钥原文，与私钥路径二选一 |
| `private-key-path` | `WEIXIN_PRIVATE_KEY_PATH` / `ALIPAY_PRIVATE_KEY_PATH` | 已存在的私钥文件路径 |
| `upload-version` | `WOTCI_VERSION` | 上传版本，未传则读取 `package.json` 的 `version` |
| `upload-desc` | `WOTCI_DESC` | 上传描述，未传则读取 `package.json` 的 `description` |
| `robot` | `WEIXIN_ROBOT` | 微信机器人编号，1–30，默认 1 |
| `tool-id` | `ALIPAY_TOOL_ID` | 支付宝必填 |
| `token` | `DINGTALK_TOKEN` | 钉钉必填 |

配置方式与优先级：

- 显式 `config` 保留原配置文件行为；不能同时传上表中除 `platform` 外的无配置文件 inputs。配置文件可以照常读取 `env`。
- 不传 `config`，但传了任一无配置文件 input 时，直接使用 Action 参数，不加载项目里的配置文件。
- 只传 `env` 时，优先保留已有的配置文件自动发现逻辑（含 `package.json` 和 `.minicirc`）；项目没有配置时才使用环境变量生成配置。
- 无配置文件模式中，非空 `with` 值优先于对应 `env`；显式提供任一种私钥 input 后，不再读取环境变量里的两种私钥字段。选定来源中的私钥文本和私钥路径不能同时提供。
- `upload-version` 设置上传版本；原有 `version` input 仍只用于体验版和版本删除命令。
- 微信默认使用 `miniProgram` 项目类型及 `setting.useProjectConfig: true`；支付宝、钉钉默认关闭平台版本自动递增。插件、小游戏、自定义编译选项、版本策略等高级配置继续使用配置文件。
- Action 生成的配置与私钥放在临时目录，正常结束或 CLI 报错时均清理。不会把私钥或 token 拼入命令行日志。

#### 复用配置文件

已有项目可以继续显式选择配置文件，或省略 `config` 让 CLI 自动发现。下例要求配置文件读取对应环境变量，且私钥已提前写入 `keys/weixin.private.key`：

```yaml
- uses: wot-ui/ci@v0
  with:
    command: upload
    platform: weixin
    config: wotci.config.ts
  env:
    WEIXIN_APPID: ${{ secrets.WEIXIN_APPID }}
    WEIXIN_PRIVATE_KEY_PATH: keys/weixin.private.key
```

使用 `release` 编排多平台发布时，仍在项目配置文件中维护发布规则。以下是已有 job 的步骤片段：依赖、配置及平台凭据需提前准备，构建可由配置中的 `release.buildCommand` 执行。需要 PR 评论时，在 workflow 或 job 上配置 `pull-requests: write`、`issues: write` 和 `contents: read`，同时注入 token；`auto` 只在检测到 token、仓库和 PR 编号时发表评论，手动运行且没有 PR 上下文时跳过。

```yaml
- uses: wot-ui/ci@v0
  with:
    command: release
    platform: weixin,alipay
    config: wotci.config.ts
    summary: ${{ runner.temp }}/release-summary.md
    pr-comment: auto
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    # 此处继续提供项目配置读取的平台凭据环境变量

- name: Publish release summary
  if: always()
  shell: bash
  run: |
    if [ -f "$RUNNER_TEMP/release-summary.md" ]; then
      cat "$RUNNER_TEMP/release-summary.md" >> "$GITHUB_STEP_SUMMARY"
    fi
```

#### 完整 inputs 参考

下表列出 `action.yml` 的全部 26 个 inputs。默认值是 Action 层的默认值，`空` 表示未显式传入；环境变量、配置文件和 CLI 仍可能提供回退值。元数据中的 inputs 均非必填，但无配置模式仍须满足所选平台的凭据与路径要求。布尔值建议写成字符串 `'true'` / `'false'`。

| input | 默认值 | 用途与生效范围 |
| --- | --- | --- |
| `command` | `upload` | CLI 命令，如 `upload`、`preview`、`doctor`、`release`、`build-npm`、`sourcemap`、`inspect`、`quality`、`version latest`、`version list`、`version delete`、`experience set`、`experience cancel`；完整列表见 [CLI 命令速查](#cli-命令速查)。无配置模式仅支持 `upload` / `preview` / `doctor` |
| `platform` | 空 | 回退到 `WOTCI_PLATFORM`；无配置模式必须选单个平台，配置文件模式可用逗号分隔多个平台（是否支持取决于命令） |
| `config` | 空 | 配置文件路径，相对 `working-directory`；省略时按前述规则选择无配置模式或自动发现 |
| `project-path` | 空 | 无配置模式的构建产物目录，相对 `working-directory`；与对应平台环境变量至少提供一个 |
| `appid` | 空 | 无配置模式的平台应用 ID；与对应平台环境变量至少提供一个 |
| `private-key` | 空 | 无配置模式的微信 / 支付宝私钥原文，建议来自 Secret；与 `private-key-path` 互斥 |
| `private-key-path` | 空 | 无配置模式的微信 / 支付宝私钥文件，相对 `working-directory`；必须提前存在 |
| `upload-version` | 空 | 无配置模式上传版本：input → `WOTCI_VERSION` → 当前执行目录的 `package.json.version`；上传时必须能取得版本 |
| `upload-desc` | 空 | 无配置模式上传描述：input → `WOTCI_DESC` → 当前执行目录的 `package.json.description` |
| `robot` | 空 | 无配置模式的微信机器人编号：input → `WEIXIN_ROBOT` → `1`，有效范围 1–30 |
| `tool-id` | 空 | 无配置模式的支付宝工具 ID；与 `ALIPAY_TOOL_ID` 至少提供一个 |
| `token` | 空 | 无配置模式的钉钉 API token；与 `DINGTALK_TOKEN` 至少提供一个。不是 GitHub 评论用的 token |
| `working-directory` | `.` | CLI 执行目录，同时决定配置、产物、私钥、结果文件的相对路径及本地 CLI / package.json 的查找位置 |
| `summary` | 空 | Markdown 结果文件；仅传递给 `upload`、`preview`、`release`、`build-npm`、`sourcemap`、`inspect`、`quality`，其他命令忽略此 input；写入文件后可由后续步骤发布到 Job Summary |
| `json` | `false` | 传递 `--json`，在 CLI stdout 输出 JSON；不自动创建 artifact，也不代表 Action 整个步骤的日志只有 JSON |
| `json-output` | 空 | 保存 CLI JSON stdout，并自动启用 `json`；相对 `working-directory`，自动创建父目录并覆盖已有文件。CLI 的失败退出码继续传递 |
| `dry-run` | `false` | 传递 `--dry-run`，对支持该选项的命令生成计划 / 校验而不执行真实操作；不能替代独立的 `doctor --network`，也不能证明平台上传成功 |
| `network` | `false` | 传递 `--network`，用于 `doctor` 的网络检查；失败默认使步骤失败，如需只做诊断可在调用步骤设置 `continue-on-error: true` |
| `yes` | `false` | 传递 `--yes`，用于确认 `version delete` 等要求确认的操作 |
| `version` | 空 | `experience set`、`experience cancel`、`version delete` 的目标版本；不用于设置上传版本 |
| `pr-comment` | `auto` | 仅用于 `release`。`auto` 沿用配置（未配置时自动检测 PR 上下文）；`true` 显式请求评论，缺少上下文会记录评论错误；`false` 禁用评论 |
| `history` | `auto` | 仅用于 `release`。`false` 禁用历史；`auto` 和 `true` 均沿用配置（未配置时开启），`true` 不会覆盖配置中的 `history: false`。默认写入 `.wotci/history.json`，跨运行保留需自行归档 / 恢复 |
| `args` | 空 | 追加 CLI 参数，例如 `--concurrency 2`；按空白拆分，不支持 shell 引号分组、变量展开或命令替换。无配置模式禁止通过它覆盖 `--config` / `-c`、`--cwd`、`--platform` / `-p`、`--all` |
| `package-version` | 空 | 仅在没有本地 CLI、使用 npx 时生效；显式值优先，否则精确 Action 版本 ref 映射到同版本 npm 包，其他 ref 回退到 `latest` |
| `install-dependencies` | `false` | 在 `working-directory` 安装依赖后再运行 CLI，不负责构建；包管理器选择规则见下文 |
| `node-version` | `20` | 传给 Action 内部的 `actions/setup-node`。即使此前 job 已安装其他 Node 版本，Action 仍执行此设置；需要保持一致时显式指定 |

执行与版本规则：

- Action 优先使用 `working-directory/node_modules/.bin/wotci`；存在时 `package-version` 不会替换它。不存在时调用 `npx --yes @wot-ui/ci@<version>`。
- npx 的版本优先取 `package-version`，其次取精确 Action ref（如 `@v0.4.1` → `0.4.1`）；`@v0`、`@main`、分支和提交 SHA 等不能映射到 npm 版本的 ref 均回退到 `latest`。固定 Action SHA 时，如需同时固定 CLI 版本，应安装并锁定本地依赖或设置 `package-version`。
- 配置文件中使用 `import { defineConfig } from '@wot-ui/ci'` 时，需在项目中安装该依赖以便解析；无配置模式不要求安装。
- `install-dependencies: 'true'` 按顺序检查当前目录：`pnpm-lock.yaml` → `pnpm install --frozen-lockfile`（缺少 pnpm 时尝试 `corepack enable`）；存在 `yarn.lock` 且 yarn 可用 → `yarn install --frozen-lockfile`；`package-lock.json` → `npm ci`；存在 `bun.lockb` 且 bun 可用 → `bun install --frozen-lockfile`；其余情况 → `npm install`。仅有 `bun.lock` 不会匹配 bun 分支。需要特定包管理器或 monorepo 根目录安装时，建议在前面的独立步骤完成安装。
- 使用私钥文件路径时，由调用方提前落盘并负责清理；建议写入 `$RUNNER_TEMP`、设置 `chmod 600` 并在 `if: always()` 的步骤删除。传 `private-key` 原文时则由 Action 创建和清理临时文件。

#### 预演、预览与结果归档

上传前可以用相同的 `with` / `env` 执行 `command: doctor` 检查配置，再用 `command: upload` 加 `dry-run: 'true'` 验证上传计划；真实上传时移除 `dry-run` 或设为 `'false'`。这些步骤仍需要准备相应配置、凭据和构建产物。

以下片段放在微信产物构建完成之后，执行真实预览，并在失败时也尽量收集已有结果。支付宝将平台、路径及凭据替换为前述支付宝输入即可；钉钉不支持 `preview`。示例使用 `ubuntu-latest`，二维码路径通过 `args` 传递，应避免包含空白。

```yaml
- name: Preview WeChat
  uses: wot-ui/ci@v0
  with:
    command: preview
    platform: weixin
    project-path: dist/build/mp-weixin
    private-key: ${{ secrets.WEIXIN_PRIVATE_KEY }}
    json-output: ${{ runner.temp }}/wotci/preview.json
    summary: ${{ runner.temp }}/wotci/preview-summary.md
    args: --qr-output ${{ runner.temp }}/wotci/preview.png
  env:
    WEIXIN_APPID: ${{ secrets.WEIXIN_APPID }}

- name: Publish preview summary
  if: always()
  shell: bash
  run: |
    if [ -f "$RUNNER_TEMP/wotci/preview-summary.md" ]; then
      cat "$RUNNER_TEMP/wotci/preview-summary.md" >> "$GITHUB_STEP_SUMMARY"
    fi

- name: Archive preview results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: wotci-preview-${{ github.run_id }}
    path: |
      ${{ runner.temp }}/wotci/preview.json
      ${{ runner.temp }}/wotci/preview-summary.md
      ${{ runner.temp }}/wotci/preview.png
    if-no-files-found: warn
```

`summary` 接收实际文件路径，不能写成 `${{ env.GITHUB_STEP_SUMMARY }}`：GitHub 默认环境变量不在 `env` context 中；直接传字面量 `$GITHUB_STEP_SUMMARY` 也不会由 Action 二次展开。上例先写明确路径，再在 `run` 的 shell 中读取 `$GITHUB_STEP_SUMMARY`，参见 [GitHub 变量说明](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)。

Action 当前不声明结构化 `outputs`，不能使用 `steps.<id>.outputs.json` 读取结果。请使用 `json-output` 文件；失败发生在 CLI 生成 JSON 之前时，该文件可能为空或不存在，应先检查内容再解析。文件存在不代表成功，需同时检查步骤状态和 JSON 的 `ok`；Action 保留 CLI 非零退出码。`json-output` 不包含包装脚本和 SDK 的诊断日志，也不会自动上传 artifact。

多平台可分别调用上述步骤，或在 job 上使用 `strategy.matrix.include` 为每个平台设置构建命令、产物路径和 Secret 名称，再通过 `${{ matrix.platform }}`、`${{ secrets[matrix.appid_secret] }}` 等传入。每个无配置模式调用只选一个平台；矩阵归档时在 artifact 名称中加入 `${{ matrix.platform }}` 避免重名。需要在一次发布中统一编排多个平台时使用配置文件模式的 `release`。

仓库自身的完整工作流见 [upload-playground.yml](.github/workflows/upload-playground.yml)：它通过 `uses: ./` 验证当前提交的 Action，并显式绑定当前构建的 CLI；外部项目使用 `wot-ui/ci@<ref>`。

维护者发布流程（含 Marketplace 上架的人工那一步）见 [docs/releasing.md](docs/releasing.md)。

### 能力自检

仓库里的 [verify-capabilities.yml](.github/workflows/verify-capabilities.yml) 会在 PR 上逐项验证 CLI 能力：帮助与参数校验、配置加载（TS 工厂 / `-c` / `.minicirc`）、`init`、`doctor`、`upload`（单平台、逗号列表、`--all`、并发、summary、`--dry-run` 校验失败）、`preview`（含钉钉不支持）、`release`、版本与体验版参数校验、IDE 联动的参数透传、微信构建与诊断（`build-npm` / `quality` / 平台守卫），以及 JS API、Vite 插件与发包产物。整套验证离线执行，不需要真实 appid 与私钥；真实上传仍由 [upload-playground.yml](.github/workflows/upload-playground.yml) 覆盖。

本地跑同一套验证（会构建、打包，并在临时项目里 `npm install` 后逐项执行）：

```sh
pnpm verify:capabilities
```

### Vite 与 uni-app 插件

```ts
// vite.config.ts
import uni from '@dcloudio/vite-plugin-uni'
import { wotciPlugin } from '@wot-ui/ci/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    uni(),
    wotciPlugin({
      action: 'preview', // 默认 preview；可改为 upload
      preview: {
        qrFormat: 'image',
      },
    }),
  ],
})
```

- `apply: 'build'`，只在构建时执行，`dev` 不会触发
- 从 `UNI_PLATFORM` 自动推断平台（`mp-weixin` / `mp-alipay` / `mp-dingtalk`）
- 也可以用 `platforms` 显式指定
- 默认 `action: 'preview'`，避免构建时误发布；需要自动上传时设 `action: 'upload'`
- `failOnError` 默认 `true`，失败会让构建失败
- 支持 `configFile`、`config`、`concurrency`、`dryRun`、`onResult`
- 插件入口：`@wot-ui/ci/vite`

## JS API

### 一步上传

```ts
import { upload } from '@wot-ui/ci'

const result = await upload('weixin', {
  cwd: process.cwd(),
})

console.log(result.platform) // 'weixin'
console.log(result.version)
console.log(result.message)
```

`upload` 会自动加载配置，因此支持与 CLI 相同的配置来源。也可以直接传内联配置或指定配置文件：

```ts
await upload('alipay', { config: { alipay: { /* ... */ } } })
await upload('dingtalk', { configFile: './custom.config.ts' })
```

### 先加载配置，再上传

```ts
import { loadConfig, uploadPlatform } from '@wot-ui/ci'

const loaded = await loadConfig({ cwd: process.cwd() })
const result = await uploadPlatform('weixin', loaded.config, { cwd: loaded.cwd })

console.log(loaded.source) // 'file' | 'package-json' | 'minicirc' | 'inline' | 'defaults'
```

### 直接调用单平台上传

```ts
import { uploadAlipay, uploadDingTalk, uploadWeixin } from '@wot-ui/ci'

const result = await uploadWeixin({
  version: '1.0.0',
  desc: 'release',
  weixin: {
    appid: 'wx123',
    projectPath: 'dist/build/mp-weixin',
    privateKeyPath: 'keys/private.key',
  },
}, { cwd: process.cwd() })
```

三个平台函数都会返回统一结构：

```ts
interface UploadResult {
  platform: 'weixin' | 'alipay' | 'dingtalk'
  version: string
  desc?: string
  message: string
  raw: unknown // SDK 原始返回值
}
```

### 查询线上版本

```ts
import { getLatestVersion, getVersionList, resolveVersion } from '@wot-ui/ci'

const latest = await getLatestVersion('weixin', { cwd: process.cwd() })
const list = await getVersionList('alipay', { cwd: process.cwd() })

const resolution = await resolveVersion(loaded.config, {
  cwd: loaded.cwd,
  packageJson: loaded.packageJson,
  platforms: ['alipay'], // 只查询本次准备上传的平台；省略时读取全部已配置平台
})
console.log(resolution.version, resolution.baseSource, resolution.queries, resolution.warnings)
```

### 体验版与版本管理

```ts
import { cancelExperience, deleteVersion, setExperience } from '@wot-ui/ci'

const experience = await setExperience('alipay', {
  cwd: process.cwd(),
  version: '1.2.3',
})
console.log(experience.qrCodeUrl)

await cancelExperience('alipay', { cwd: process.cwd(), version: '1.2.3' })

await deleteVersion('alipay', {
  confirm: true,
  cwd: process.cwd(),
  version: '1.2.3',
})
```

### 批量上传与预览

```ts
import { previewMany, uploadMany } from '@wot-ui/ci'

const result = await uploadMany({
  cwd: process.cwd(),
  platforms: ['weixin', 'alipay'],
  concurrency: 1,
})

console.log(result.ok)
console.log(result.results)

const dryRun = await uploadMany({
  cwd: process.cwd(),
  dryRun: true,
})

const previews = await previewMany({
  cwd: process.cwd(),
  platforms: ['weixin'],
  qrFormat: 'image',
})
```

### 发布编排

```ts
import { release } from '@wot-ui/ci'

const result = await release({
  cwd: process.cwd(),
  buildCommand: 'uni build -p mp-weixin',
  platforms: ['weixin', 'alipay'],
  prComment: 'auto',
})

console.log(result.ok)
console.log(result.historyFile)
console.log(result.commentUrl)
```

### 生成预览二维码

```ts
import { preview } from '@wot-ui/ci'

const result = await preview('weixin', {
  cwd: process.cwd(),
  qrFormat: 'image',
  qrOutput: 'dist/preview.png',
  pagePath: 'pages/index/index',
  query: 'from=ci',
  scene: 1011,
})

console.log(result.qrCode.kind) // 'file'
console.log(result.qrCode.value) // /abs/dist/preview.png
console.log(result.message)
```

支付宝返回远程链接：

```ts
const result = await preview('alipay', { cwd: process.cwd() })
console.log(result.qrCode.kind) // 'url'
console.log(result.qrCode.url)
```

### 打开 / 关闭开发者工具

```ts
import { closeIde, openIde } from '@wot-ui/ci'

const result = await openIde('weixin', {
  cwd: process.cwd(),
  port: 9420,
  lang: 'zh',
})

console.log(result.message)
// 已在微信开发者工具中打开：/path/to/dist/build/mp-weixin

await closeIde('weixin', { cwd: process.cwd(), quit: true })
```

状态、自动化与 IDE 预览：

```ts
import { autoIde, getIdeStatus, previewIde } from '@wot-ui/ci'

const status = await getIdeStatus('weixin', { cwd: process.cwd() })
console.log(status.installed, status.loggedIn)

await autoIde('weixin', {
  cwd: process.cwd(),
  port: 9420,
  trustProject: true,
})

const preview = await previewIde('weixin', {
  cwd: process.cwd(),
  qrOutput: 'dist/ide-preview.png',
})
console.log(preview.qrCode?.value)
```

`openIde` 同样会加载 `wotci.config.*`，因此可以用配置里的 `projectPath` 和 `ide.cliPath`；也可以直接传内联配置：

```ts
await openIde('alipay', {
  config: {
    alipay: {
      appid: '2021...',
      toolId: '...',
      privateKey: '...',
      projectPath: 'dist/build/mp-alipay',
      ide: { appPath: '/Applications/支付宝小程序开发者工具.app' },
    },
  },
})
```

### 默认导出

```ts
import wotci from '@wot-ui/ci'

await wotci.upload('weixin')
```

## 错误模型

库层不会调用 `process.exit`：

- 配置错误抛出 `ConfigError`
- 上传错误抛出 `UploadError`，原始错误挂在 `cause` 上
- 预览错误抛出 `PreviewError`；平台不支持预览时抛出 `PreviewUnsupportedError`
- 发布编排错误抛出 `ReleaseError`，构建失败抛出 `BuildError`
- 版本查询 / 管理错误抛出 `VersionError`；平台不支持时抛出 `VersionUnsupportedError`
- IDE 相关错误抛出 `IdeError` 的子类：`IdeNotFoundError`（找不到 IDE）、`IdeUnsupportedError`（平台不支持）、`IdeCommandError`（命令执行失败）
- 以上错误都继承 `WotCIError`（带 `code` 字段）
- `formatErrorReport(error)` 可以把 `cause` 链格式化为字符串数组

CLI 会捕获这些错误、打印原因链并返回退出码 `1`，调用方也可以自行决定日志和退出策略。

## 从 uni-mini-ci 迁移

| uni-mini-ci | @wot-ui/ci |
| --- | --- |
| `minici --platform weixin` | `wotci --platform weixin` |
| `uni-mini-ci` 包 | `@wot-ui/ci` 包 |
| `.minicirc` | 继续可用（JSON5） |
| `package.json` 的 `uni-mini-ci` 字段 | 继续可用 |
| `dd` 配置 / `--platform dd` | 继续可用，内部归一为 `dingtalk` |
| 库层 `process.exit` | 抛出 `ConfigError` / `UploadError` |
| `miniprogram-ci` 1.x | `miniprogram-ci` 2.x |

需要注意：`autoincrement` 未配置时按 `false` 处理，与旧版行为一致；如果希望平台自动递增版本号，请显式配置 `autoincrement: true`。

## Playground

仓库内的 [playground/wotci.config.ts](playground/wotci.config.ts) 通过环境变量注入三端配置：

- `WOTCI_VERSION`、`WOTCI_DESC`：上传版本号和描述
- `WEIXIN_APPID`、`WEIXIN_PRIVATE_KEY_PATH`、`WEIXIN_PROJECT_PATH`、`WEIXIN_ROBOT`
- `ALIPAY_APPID`、`ALIPAY_TOOL_ID`、`ALIPAY_PRIVATE_KEY` 或 `ALIPAY_PRIVATE_KEY_PATH`、`ALIPAY_PROJECT_PATH`、`ALIPAY_CLIENT_TYPE`、`ALIPAY_AUTOINCREMENT`
- `DINGTALK_APPID`、`DINGTALK_TOKEN`、`DINGTALK_PROJECT_PATH`、`DINGTALK_AUTOINCREMENT`

本地示例：

```sh
WOTCI_VERSION=1.0.0 pnpm upload:playground:weixin
ALIPAY_PRIVATE_KEY="$(cat keys/alipay.private.key)" pnpm upload:playground:alipay
DINGTALK_APPID=xxx DINGTALK_TOKEN=xxx pnpm upload:playground:dingtalk
```

GitHub Actions 可参考 [.github/workflows/upload-playground.yml](.github/workflows/upload-playground.yml)。

工作流会先构建 CLI 与 playground 产物，再通过 `uses: ./` 调用当前提交的 GitHub Action，执行 `doctor`、所选命令的 `--dry-run` 和真实上传或预览。Action 绑定本次构建的 CLI，并继续读取 `playground/wotci.config.ts`，保留支付宝 / 钉钉的自动递增等配置。通过 `json-output` 和 `summary` 保存结果，同时存档二维码、环境与 SDK 精确版本及 Step Summary。微信 / 支付宝私钥从 Secrets 写入 `$RUNNER_TEMP` 并设置 `chmod 600`，执行结束后会删除。能力边界见 [支持矩阵](docs/support-matrix.md)，操作步骤和记录模板见 [平台验收指南](docs/platform-validation.md)。

需要在仓库 Secrets 中配置：

- 微信：`WEIXIN_APPID`、`WEIXIN_PRIVATE_KEY`（小程序代码上传密钥）
- 支付宝：`ALIPAY_APPID`、`ALIPAY_TOOL_ID`、`ALIPAY_PRIVATE_KEY`
- 钉钉：`DINGTALK_APPID`、`DINGTALK_TOKEN`

支持手动触发并选择 `command=upload/preview`、平台、版本、描述、上传机器人（1-30）以及 `dry-run`；preview 支持微信和支付宝，扫码结果需另外记录。push 到 `main` 且改动涉及 CLI / playground 时只跑 dry-run 冒烟测试，不会消耗上传版本。微信上传要求调用方 IP 在白名单内，GitHub 托管 Runner 的出口 IP 不固定，需要在微信公众平台关闭 IP 白名单（或改用自建 Runner）。

## 开发

```sh
pnpm install
pnpm typecheck
pnpm test:run
pnpm test:coverage
pnpm build
pnpm verify:capabilities
```

`pnpm verify:capabilities` 会构建、打包，并在临时项目里安装后逐项验证 CLI / JS API 能力，见 [能力自检](#能力自检)。

测试覆盖率由 vitest 统计，并对 statements / branches / functions / lines 设置 95% 阈值；CI 在 Linux Node 24 执行覆盖率门禁并存档报告，其余组合运行常规测试。`src/bin.ts` 是进程入口，依赖 `process.exit`，不纳入覆盖率统计。运行时验证覆盖 Linux Node 20/22/24/26 与 Windows/macOS Node 20/24，实际通过证据见 [支持矩阵](docs/support-matrix.md)。

开发约定、提交信息规范与 PR 流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

文档网站位于 `apps/website`，使用 Next.js App Router 从本 README 与 `docs/` 预渲染页面。使用 `pnpm site:dev` 本地开发，`pnpm site:build` 输出 `.next`；EdgeOne 选择 Next 预设、根目录 `apps/website`、构建命令 `pnpm build:next`。维护和部署说明见 [网站 README](apps/website/README.md)。

## 路线图

后续按「支持范围与质量基线 → 执行可靠性 → CI 接入与结果交付」推进；多应用、持续预览和 monorepo 按真实需求安排。阶段任务、验收条件与 1.0 门槛见 [docs/roadmap.md](docs/roadmap.md)。

## License

MIT
