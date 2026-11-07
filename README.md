# Wot CI · @wot-ui/ci

[![CI](https://github.com/wot-ui/ci/actions/workflows/ci.yml/badge.svg)](https://github.com/wot-ui/ci/actions/workflows/ci.yml)
[![Marketplace](https://img.shields.io/badge/Marketplace-wot--ui--ci--action-blue?logo=github)](https://github.com/marketplace/actions/wot-ui-ci-action)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/wot-ui/ci/blob/main/LICENSE.md)

面向微信、支付宝、钉钉小程序的持续集成工具。项目完成构建后，通过一份配置完成代码上传、预览二维码生成、配置检查与发布编排，适用于 uni-app 和原生小程序工程。

支持本地命令行、Jenkins、GitHub Actions 和自建流水线，也提供 JavaScript API 与 Vite 插件。兼容 `uni-mini-ci` 的 `.minicirc`、`package.json` 配置和 `dd` 平台别名。

[安装](#安装) · [配置](#配置) · [构建与上传](#构建与上传) · [参数参考](#参数参考) · [Jenkins](#jenkins) · [GitHub Action](#github-action) · [完整文档](https://github.com/wot-ui/ci/blob/main/docs/README.md)

## 特性

- **多平台上传**：微信、支付宝、钉钉统一入口，支持单平台或批量执行。
- **预览交付**：微信、支付宝生成预览二维码，支持文件归档与页面参数。
- **检查与诊断**：配置体检、dry-run、微信构建 npm、SourceMap 和代码质量检查。
- **版本与发布**：固定 / 包版本 / 自动版本策略，串联构建、上传、历史记录和 PR 评论。
- **结果可追溯**：JSON、Markdown 摘要及微信包体积预算结果。
- **多种接入方式**：JS / TS 配置、配置工厂、CLI、JS API、Vite 插件与独立 GitHub Action。

## 平台能力

| 能力 | 微信 | 支付宝 | 钉钉 |
| --- | --- | --- | --- |
| 上传代码 | 支持 | 支持 | 支持 |
| SDK 预览二维码 | 支持 | 支持 | 不支持 |
| 查询最新版本 | 仅插件类型 | 支持 | 不支持 |
| 体验版设置、取消及版本删除 | 不支持 | 支持 | 不支持 |
| 包体积预算 | SDK 返回体积时可检查 | 无体积数据 | 无体积数据 |

这里的发布指构建和代码上传编排，不包含提交审核、正式上架或线上回滚。各运行时和平台的验证情况见[平台支持矩阵](https://github.com/wot-ui/ci/blob/main/docs/support-matrix.md)。

## 安装

需要 Node.js ≥ 20。在小程序项目中安装开发依赖，并提交锁文件：

```sh
pnpm add -D @wot-ui/ci
# 或 npm install -D @wot-ui/ci
# 或 yarn add -D @wot-ui/ci
```

下面以 pnpm 和 uni-app 为例。npm 用户可用 `npx wotci` 调用 CLI，用 `npm run <script>` 执行项目脚本；构建命令和产物目录需按实际工程调整。

## 配置

### 微信小程序

在应用根目录生成配置：

```sh
pnpm exec wotci init --platform weixin
```

编辑 `wotci.config.ts`，通过配置工厂读取环境变量，并显式开启微信代码压缩：

```ts
import { defineConfig } from '@wot-ui/ci'

export default defineConfig(({ env, packageJson }) => ({
  version: env.WOTCI_VERSION?.trim() || packageJson?.version,
  desc: env.WOTCI_DESC?.trim() || packageJson?.description,
  weixin: {
    appid: env.WEIXIN_APPID!,
    privateKeyPath: env.WEIXIN_PRIVATE_KEY_PATH!,
    projectPath: 'dist/build/mp-weixin',
    robot: 1,
    setting: {
      useProjectConfig: true,
      minifyJS: true,
      minifyWXML: true,
      minifyWXSS: true,
    },
  },
}))
```

本地可先设置环境变量；CI 中通过 Jenkins Credentials、GitHub Secrets 等注入：

```sh
# macOS / Linux Shell 示例，替换为自己的 appid 和私钥文件路径
export WEIXIN_APPID='你的小程序 appid'
export WEIXIN_PRIVATE_KEY_PATH='/absolute/path/to/private.key'
```

微信私钥需在[微信公众平台](https://mp.weixin.qq.com/)生成，并配置执行机器的出口 IP 白名单；具体步骤见[官方 CI 接入说明](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html)。私钥文件不要提交到仓库。配置加载器不会自动加载 `.env`，也不会自动把任意环境变量转成配置字段；上方映射由配置工厂明确完成。

### 支付宝与钉钉

支付宝 / 钉钉项目可以使用下面的 `wotci.config.ts`；多平台项目可将这些字段与上面的 weixin 配置合并，只保留实际使用的平台：

```ts
import { defineConfig } from '@wot-ui/ci'

export default defineConfig(({ env, packageJson }) => ({
  version: env.WOTCI_VERSION?.trim() || packageJson?.version,
  desc: env.WOTCI_DESC?.trim() || packageJson?.description,
  alipay: {
    appid: env.ALIPAY_APPID!,
    toolId: env.ALIPAY_TOOL_ID!,
    privateKeyPath: env.ALIPAY_PRIVATE_KEY_PATH!,
    projectPath: 'dist/build/mp-alipay',
    clientType: 'alipay',
    autoincrement: false,
  },
  dingtalk: {
    appid: env.DINGTALK_APPID!,
    token: env.DINGTALK_TOKEN!,
    projectPath: 'dist/build/mp-dingtalk',
    autoincrement: false,
  },
}))
```

支付宝使用[工具管理页](https://open.alipay.com/dev/workspace/key-manage/tool)中的 toolId 与按[官方说明](https://opendocs.alipay.com/common/02kipl)生成的私钥；钉钉使用[开发者后台](https://open-dev.dingtalk.com/)中的 MiniAppId 与 API Token。产物目录由项目构建方式决定；本仓库 Playground 的钉钉示例复用 `dist/build/mp-alipay`。配置字段、取值和环境变量映射见下方[参数参考](#参数参考)。

## 构建与上传

先构建，再检查和上传。以下假设应用已有 `build:mp-weixin` 脚本：

```sh
pnpm build:mp-weixin
pnpm exec wotci doctor
pnpm exec wotci upload -p weixin
```

上传默认使用配置中的版本，缺省读取应用 `package.json.version`。首次接入需要只检查计划时，使用 `pnpm exec wotci upload -p weixin --dry-run`；不加该开关就执行真实上传。

### 添加项目脚本

将以下 scripts 合并到应用的 `package.json`，保留项目已有的构建命令：

```json
{
  "scripts": {
    "ci:check": "wotci doctor",
    "upload:weixin": "wotci upload -p weixin",
    "upload:alipay": "wotci upload -p alipay",
    "upload:dingtalk": "wotci upload -p dingtalk",
    "preview:weixin": "wotci preview -p weixin",
    "deploy:weixin": "pnpm build:mp-weixin && wotci upload -p weixin"
  }
}
```

`pnpm upload:weixin` 上传已有产物，`pnpm deploy:weixin` 先构建再上传。支付宝、钉钉同样先执行各自的构建命令；`upload` 本身不负责应用构建。

### 批量上传与结果归档

```sh
# 先完成所有目标平台的构建，再上传
pnpm exec wotci upload -p weixin,alipay
pnpm exec wotci upload --all

# 只做本地校验
pnpm exec wotci upload --all --dry-run

# 供流水线归档的 JSON 和 Markdown
mkdir -p artifacts
pnpm exec wotci upload -p weixin --json \
  --summary artifacts/upload.md > artifacts/upload.json
```

普通上传成功退出码为 `0`，失败为 `1`；批量模式下单个平台失败不会中断其他平台，最终返回失败。dry-run 不验证真实平台授权或 IP 白名单。预算检查发生在 SDK 返回包体积后，不能作为上传前阻断机制。

## 预览二维码

```sh
# 微信预览图片
pnpm exec wotci preview -p weixin --qr-output artifacts/weixin-preview.png

# 指定启动页面与参数
pnpm exec wotci preview -p weixin \
  --page pages/index/index --query 'from=ci'

# 支付宝预览并下载二维码
pnpm exec wotci preview -p alipay --qr-output artifacts/alipay-preview.png
```

钉钉不支持预览。二维码输出格式、预览字段和 CLI 覆盖限制见[预览指南](https://github.com/wot-ui/ci/blob/main/docs/guides/preview.md)。

## 参数参考

### 顶层配置

| 参数 | 类型 | 默认值 / 说明 |
| --- | --- | --- |
| `version` | `string` | 缺省读取 package.json.version；用于上传版本 |
| `desc` | `string` | 缺省读取 package.json.description；微信上传描述，其他平台用于本地结果 |
| `weixin` | `WeixinConfig` | 微信配置，只在需要该平台时填写 |
| `alipay` | `AlipayConfig` | 支付宝配置 |
| `dingtalk` | `DingtalkConfig` | 钉钉配置 |
| `dd` | `DingtalkConfig` | 兼容旧配置；与 dingtalk 同时存在时后者优先 |
| `versionStrategy` | `VersionStrategy` | fixed / package / auto，本次上传的版本解析策略 |
| `budgets` | `BudgetConfig` | total / main / warnOnly，微信包体积预算 |
| `release` | `ReleaseConfig` | 构建命令、目标平台、历史记录和 PR 评论配置 |

### 平台配置

#### 微信 weixin

官方文档：[微信 miniprogram-ci（上传、预览、密钥与 IP 白名单）](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html) · [project.config.json 配置说明](https://developers.weixin.qq.com/miniprogram/dev/devtools/projectconfig.html)。

| 参数 | 类型 | 必填 / 默认值与说明 |
| --- | --- | --- |
| `appid` | `string` | 必填，小程序 / 小游戏 appid，从[微信公众平台](https://mp.weixin.qq.com/)的小程序账号查看 |
| `privateKeyPath` | `string` | 必填，代码上传私钥文件路径；按[官方 CI 接入说明](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html)在公众平台生成并配置出口 IP 白名单 |
| `projectPath` | `string` | 必填，构建产物目录，如 `dist/build/mp-weixin` |
| `type` | `ProjectType` | 默认 miniProgram；也支持 miniGame、miniProgramPlugin、miniGamePlugin |
| `ignores` | `string[]` | 可选，排除规则 |
| `robot` | `number` | 可选，1～30；未传由 SDK 决定 |
| `setting` | `WeixinUploadSetting` | 可选，编译设置，见下表 |
| `preview` | `WeixinPreviewConfig` | 可选，二维码、页面、参数、机器人及编译设置 |
| `ide` | `WeixinIdeConfig` | 可选，开发者工具配置；当前配置中的 port/lang 不用于执行 |

#### 微信编译设置 setting

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `useProjectConfig` | `boolean` | 是否读取 [project.config.json](https://developers.weixin.qq.com/miniprogram/dev/devtools/projectconfig.html) 的设置；SDK 文档默认 false，显式字段可覆盖相应项目设置 |
| `es6` | `boolean` | 兼容旧配置；当前 SDK 已标为废弃，与 es7 效果相同 |
| `es7` | `boolean` | 将 JS 编译为 ES5，对应旧版开发者工具的“增强编译” |
| `disableUseStrict` | `boolean` | 启用增强编译时，是否禁用 JS 文件的严格模式；SDK 文档默认 false |
| `minifyJS` | `boolean` | 上传时压缩 JS，优先级高于 minify |
| `minifyWXML` | `boolean` | 上传时压缩 WXML，优先级高于 minify |
| `minifyWXSS` | `boolean` | 上传时压缩 WXSS，优先级高于 minify |
| `minify` | `boolean` | 上传时压缩所有代码，对应开发者工具的“上传时压缩代码” |
| `codeProtect` | `boolean` | 对应开发者工具的“上传时进行代码保护” |
| `autoPrefixWXSS` | `boolean` | 对应开发者工具的“上传时样式自动补全” |
| `compileWorklet` | `boolean` | 编译 worklet 代码，对应开发者工具的 worklet 编译选项 |

以上编译字段均可选；Wot CI 原样传给 SDK，不统一补默认值。README 示例显式开启了 JS、WXML、WXSS 压缩；如果另设 `weixin.preview.setting`，该对象会整体替换上传设置，需要再次写入所需压缩字段。

#### 支付宝 alipay

官方文档：[支付宝 minidev 使用指南](https://opendocs.alipay.com/mini/02q17h) · [CLI 指令列表](https://opendocs.alipay.com/mini/02q29z)。凭据入口：[工具 ID 与工具密钥管理](https://open.alipay.com/dev/workspace/key-manage/tool) · [开发助手与密钥生成说明](https://opendocs.alipay.com/common/02kipl)。

| 参数 | 类型 | 必填 / 默认值与说明 |
| --- | --- | --- |
| `appid` | `string` | 必填，小程序 appid，从[支付宝开放平台](https://open.alipay.com/)对应小程序查看 |
| `toolId` | `string` | 必填，[在工具管理页创建 / 查看并复制 toolId](https://open.alipay.com/dev/workspace/key-manage/tool)，不是小程序 appid |
| `projectPath` | `string` | 必填，构建产物目录，如 `dist/build/mp-alipay` |
| `privateKey` | `string` | 私钥文本，与 privateKeyPath 至少填一个；按[密钥生成说明](https://opendocs.alipay.com/common/02kipl)准备，非空文本优先 |
| `privateKeyPath` | `string` | 私钥文件路径；使用[支付宝开放平台开发助手](https://opendocs.alipay.com/common/02kipl)生成，填写保存后的本地路径 |
| `clientType` | `AlipayClientType` | 默认 alipay；其他终端取值见完整配置参考 |
| `autoincrement` | `boolean` | 默认 false；true 时由平台分配版本 |
| `preview` | `AlipayPreviewConfig` | 可选，页面、启动参数及域名校验选项 |
| `ide` | `AlipayIdeConfig` | 可选，通过 appPath 指定开发者工具 |

#### 钉钉 dingtalk

官方文档：[DingTalk Design CLI 仓库](https://github.com/open-dingtalk/dingtalk-design-cli) · [操作指南](https://open.dingtalk.com/document/download/dingtalk-design-introduction)。Wot CI 使用其中的 `dingtalk-miniapp-opensdk` 上传能力，支持范围以本项目平台矩阵为准。

| 参数 | 类型 | 必填 / 默认值与说明 |
| --- | --- | --- |
| `appid` | `string` | 必填，在[钉钉开发者后台](https://open-dev.dingtalk.com/)查看对应小程序的 MiniAppId |
| `token` | `string` | 必填，从[钉钉开发者后台](https://open-dev.dingtalk.com/)获取用于上传的 API Token；传给 SDK 的 accessToken |
| `projectPath` | `string` | 必填，构建产物目录，如 `dist/build/mp-dingtalk`，以实际项目为准 |
| `autoincrement` | `boolean` | 默认 false；true 时由平台分配版本 |
| `projectType` | `DingtalkProjectType` | 兼容保留字段，当前不传给上传 SDK |

### 完整参数与使用限制

| 查询内容 | 文档 |
| --- | --- |
| 全部配置、嵌套字段、终端类型、默认值及路径规则 | [配置与参数参考](https://github.com/wot-ui/ci/blob/main/docs/guides/configuration.md) |
| 全部命令行开关及生效命令 | [CLI 命令与参数](https://github.com/wot-ui/ci/blob/main/docs/guides/commands.md) |
| JS request / options | [JavaScript API](https://github.com/wot-ui/ci/blob/main/docs/guides/api.md#参数参考) |
| Vite 插件顶层及 preview 字段 | [Vite 参数](https://github.com/wot-ui/ci/blob/main/docs/guides/vite.md#插件参数) |
| GitHub Action inputs | [Action 参数参考](https://github.com/wot-ui/ci/blob/main/docs/guides/action-reference.md) |

相对路径基于 CLI `--cwd` / JS `cwd`，默认是当前工作目录，不是配置文件所在目录。CLI 的 `--version` 用于体验版和版本删除操作，不会覆盖上传版本。

支付宝、钉钉的 `autoincrement` 默认为 false，需提供版本；开启后向 SDK 传空版本，由平台分配，不保证本地 patch +1。普通微信小程序不支持线上版本查询，请用本地版本或 fixed / package 策略。详见[版本与发布](https://github.com/wot-ui/ci/blob/main/docs/guides/release.md)。

## Jenkins

提供两套可复制的 Declarative Pipeline：

| 示例 | 用途 | 默认执行方式 |
| --- | --- | --- |
| [微信项目 Jenkinsfile](https://github.com/wot-ui/ci/blob/main/examples/jenkins/weixin/Jenkinsfile) | 现有项目构建、检查、上传 / 预览和归档 | 检查通过后真实上传或预览 |
| [三平台 Playground Jenkinsfile](https://github.com/wot-ui/ci/blob/main/examples/jenkins/playground/Jenkinsfile) | 使用本仓库验证三平台流程 | dry-run，取消勾选才真实执行 |

节点准备、Credentials 映射、参数和第一次运行步骤见 [Jenkins 接入指南](https://github.com/wot-ui/ci/blob/main/docs/guides/jenkins.md)。

## GitHub Action

Action 已独立到 [wot-ui/ci-action](https://github.com/wot-ui/ci-action)。新接入使用独立仓库；旧 `wot-ui/ci@v0` 与历史精确标签保留兼容。

完成 checkout、安装依赖和小程序构建后，添加以下步骤即可上传，无需另写 wotci 配置文件：

```yaml
- uses: wot-ui/ci-action@v2
  with:
    platform: weixin
    project-path: dist/build/mp-weixin
    appid: ${{ secrets.WEIXIN_APPID }}
    private-key: ${{ secrets.WEIXIN_PRIVATE_KEY }}
    setting: '{"useProjectConfig":true,"minifyJS":true,"minifyWXML":true,"minifyWXSS":true}'
```

上传版本默认读取 package.json.version。支付宝额外传 tool-id；钉钉使用 token，不传私钥。完整工作流、预览和结果归档见 [Action 指南](https://github.com/wot-ui/ci/blob/main/docs/guides/github-action.md)。

## JavaScript API 与 Vite

在 Node.js 脚本中复用项目配置：

```ts
import { preview, upload } from '@wot-ui/ci'

const result = await upload('weixin', { configFile: 'wotci.config.ts' })
console.log(result.version)

const previewResult = await preview('weixin', { qrOutput: 'artifacts/preview.png' })
console.log(previewResult.qrCode)
```

也可在现有 Vite plugins 数组中加入 `wotciPlugin({ action: 'upload', platforms: ['weixin'] })`，入口为 `@wot-ui/ci/vite`。插件只在构建后执行；不写 action 时默认生成预览。详细接入见 [JS API](https://github.com/wot-ui/ci/blob/main/docs/guides/api.md) 与 [Vite 插件](https://github.com/wot-ui/ci/blob/main/docs/guides/vite.md)。

## 从 uni-mini-ci 迁移

安装 `@wot-ui/ci` 后，将命令 `minici` 改为 `wotci`；现有 `.minicirc`、`package.json` 的 `uni-mini-ci` 字段与 `dd` 别名可以继续使用。若同时存在新的 wotci 配置，会按配置加载优先级选取来源。完整差异见[迁移指南](https://github.com/wot-ui/ci/blob/main/docs/guides/migration.md)。

## 文档与贡献

[文档目录](https://github.com/wot-ui/ci/blob/main/docs/README.md) · [Playground](https://github.com/wot-ui/ci/blob/main/docs/guides/playground.md) · [平台验收](https://github.com/wot-ui/ci/blob/main/docs/platform-validation.md) · [路线图](https://github.com/wot-ui/ci/blob/main/docs/roadmap.md) · [参与贡献](https://github.com/wot-ui/ci/blob/main/CONTRIBUTING.md)

MIT © wot-ui
