# 配置与参数参考

本页列出 `@wot-ui/ci` 配置对象的全部已声明字段。参数按顶层、平台及嵌套对象分组，类型与行为以当前 [类型定义](../../src/types.ts) 和实现为准。未设置且标为“SDK 决定”的值，表示 Wot CI 不注入默认值；示例中显式填写的值也不等于库的默认值。

| 需要查什么 | 入口 |
| --- | --- |
| appid、私钥、产物、编译与预览配置 | 本页下方各平台参数表 |
| 命令行开关与生效命令 | [CLI 完整参数表](commands.md#全部-cli-参数) |
| JS 调用的 request / options | [JS API 参数参考](api.md#参数参考) |
| Vite 构建插件 | [Vite 插件参数](vite.md#插件参数) |
| GitHub Action inputs | [Action 参数参考](action-reference.md) |
| Jenkins 构建参数和凭据映射 | [Jenkins 接入](jenkins.md) |

## 顶层配置

`defineConfig()` 接收配置对象，或同步 / 异步返回配置对象的工厂函数。以下字段均为可选；执行某个平台的动作时，必须提供该平台所需的配置。

| 字段 | 类型 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- |
| `version` | `string` | `package.json.version` | 上传版本；微信上传必需，支付宝 / 钉钉关闭自动递增时必需 |
| `desc` | `string` | `package.json.description` | 描述；微信传给 SDK，支付宝 / 钉钉当前仅在本地上传结果与消息中使用 |
| `weixin` | `WeixinConfig` | 未配置 | 微信小程序 / 小游戏及插件配置 |
| `alipay` | `AlipayConfig` | 未配置 | 支付宝及其终端配置 |
| `dingtalk` | `DingtalkConfig` | 未配置 | 钉钉上传配置 |
| `dd` | `DingtalkConfig` | 未配置 | 历史别名；与 `dingtalk` 同时存在时后者优先 |
| `versionStrategy` | `VersionStrategy` | 使用加载后的 `version` | 本次上传的版本解析策略，不修改 package.json |
| `budgets` | `BudgetConfig` | 不检查预算 | 根据微信 SDK 返回的包体积检查 |
| `release` | `ReleaseConfig` | 见下方发布参数表 | 仅用于 `release` 构建、上传与记录编排 |

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

配置来源之间不会逐层合并；命中一个来源后，只给值为 `undefined` 的 `version`、`desc` 补上 package.json 默认值。空字符串不会触发此回退。

`projectPath`、`privateKeyPath`、输出路径等相对路径都基于 CLI 的 `--cwd` / JS 的 `cwd`（缺省为进程工作目录），不是配置文件所在目录。库不会自动查找产物目录；`init` 生成模板时才会探测目录。

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
import { defineConfig } from '@wot-ui/ci'

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

官方文档：[微信 miniprogram-ci（上传、预览、密钥与 IP 白名单）](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html) · [project.config.json 配置说明](https://developers.weixin.qq.com/miniprogram/dev/devtools/projectconfig.html)。

以下必填要求针对 SDK 上传 / 预览。仅操作 IDE 时依赖产物路径和 IDE 安装，不使用代码上传私钥。

| 字段 | 类型 | 必填 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- | --- |
| `projectPath` | `string` | 是 | 无 | 小程序产物目录，如 `dist/build/mp-weixin` |
| `appid` | `string` | 是 | 无 | 小程序 / 小游戏 appid，从[微信公众平台](https://mp.weixin.qq.com/)的小程序账号查看 |
| `privateKeyPath` | `string` | 是 | 无 | 代码上传密钥文件路径；按[官方 CI 接入说明](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html)在公众平台生成并配置 CI IP 白名单 |
| `type` | `ProjectType` | 否 | `miniProgram` | 项目类型，见下表 |
| `ignores` | `string[]` | 否 | SDK 决定 | 项目排除规则；也用于上传 / 预览前的构建 npm |
| `robot` | `number` | 否 | SDK 决定 | CI 机器人编号，1～30；模板常显式设置为 1 |
| `setting` | `WeixinUploadSetting` | 否 | SDK 决定 | 上传编译设置，见下表 |
| `preview` | `WeixinPreviewConfig` | 否 | 见预览参数表 | 预览动作的专属配置 |
| `ide` | `WeixinIdeConfig` | 否 | 见 IDE 参数表 | 开发者工具配置 |

### 项目类型 type

| 值 | 含义 |
| --- | --- |
| `miniProgram` | 小程序 |
| `miniGame` | 小游戏 |
| `miniProgramPlugin` | 小程序插件 |
| `miniGamePlugin` | 小游戏插件 |

微信线上版本查询只支持后两种插件类型；普通小程序请使用本地版本或 `fixed` / `package` 策略。

### 编译设置 setting

全部字段可选，Wot CI 原样传给 `miniprogram-ci`，不统一补 `true` 或 `false`。项目设置与 SDK 的合并规则由 SDK 决定。

| 字段 | 类型 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- |
| `useProjectConfig` | `boolean` | SDK 文档默认 false | 读取 [project.config.json](https://developers.weixin.qq.com/miniprogram/dev/devtools/projectconfig.html) 的设置；显式字段可覆盖相应项目设置 |
| `es6` | `boolean` | SDK 决定 | 兼容旧配置；当前 SDK 已标为废弃，与 es7 效果相同 |
| `es7` | `boolean` | SDK 决定 | 将 JS 编译为 ES5，对应旧版开发者工具的“增强编译” |
| `disableUseStrict` | `boolean` | SDK 文档默认 false | 启用增强编译时，是否禁用 JS 文件严格模式 |
| `minifyJS` | `boolean` | SDK 决定 | 上传时压缩 JS，优先级高于 minify |
| `minifyWXML` | `boolean` | SDK 决定 | 上传时压缩 WXML，优先级高于 minify |
| `minifyWXSS` | `boolean` | SDK 决定 | 上传时压缩 WXSS，优先级高于 minify |
| `minify` | `boolean` | SDK 决定 | 对应开发者工具的“上传时压缩代码” |
| `codeProtect` | `boolean` | SDK 决定 | 对应开发者工具的“上传时进行代码保护” |
| `autoPrefixWXSS` | `boolean` | SDK 决定 | 对应开发者工具的“上传时样式自动补全” |
| `compileWorklet` | `boolean` | SDK 决定 | 编译 worklet |

`WeixinUploadSetting` 也允许额外的 SDK 字段（索引签名为 `unknown`）；本表列出 Wot CI 显式声明的字段，额外字段需核对所安装 SDK 的支持范围。底层说明见 [微信 CI 文档](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html)。

需要压缩时建议显式配置：

```ts
setting: {
  useProjectConfig: true,
  minifyJS: true,
  minifyWXML: true,
  minifyWXSS: true,
}
```

### 微信预览 preview

以下字段位于 `weixin.preview`，全部可选。JS 预览 request 中的对应字段优先于配置；CLI 的覆盖范围见[预览参数](commands.md#预览参数)。

| 字段 | 类型 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- |
| `qrcodeFormat` | `'terminal' \| 'image' \| 'base64'` | `image` | 终端二维码、图片或 base64 内容 |
| `qrcodeOutputDest` | `string` | image：`.wotci/preview/weixin.png`；base64：`.wotci/preview/weixin.txt` | 二维码文件路径；terminal 模式不写文件 |
| `pagePath` | `string` | SDK 决定 | 预览启动页面，如 `pages/index/index` |
| `searchQuery` | `string` | 未设置 | 启动参数，如 `from=ci&debug=1` |
| `scene` | `number` | SDK 决定 | 非负整数场景值 |
| `desc` | `string` | 顶层 `desc` | 本次预览备注 |
| `robot` | `number` | `weixin.robot`，再交给 SDK | 1～30 |
| `setting` | `WeixinUploadSetting` | `weixin.setting` | 一旦设置，整个对象替换上传设置，不做字段级合并 |
| `threads` | `number` | SDK 决定 | 本地编译线程数 |
| `bigPackageSizeSupport` | `boolean` | SDK 决定 | 请求 SDK 在预览时将主包、分包上限调整为 4M；不改变正式上传限制 |

预览不执行 `versionStrategy`；传给微信预览 SDK 的版本为顶层 `version`，没有时使用 `0.0.0`。如果单独配置 `preview.setting`，需要在该对象内再次指定所需的压缩选项。

### 微信 IDE ide

| 字段 | 类型 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- |
| `cliPath` | `string` | `WECHAT_DEVTOOLS_CLI` → 系统常见安装路径 | 开发者工具 CLI 路径；显式配置后仅检查该路径 |
| `port` | `number` | 当前配置值未用于执行 | 类型中已声明，但当前 IDE 执行链未读取；请传 CLI `--port` / JS `port` |
| `lang` | `'zh' \| 'en'` | 当前配置值未用于执行 | 类型中已声明，但当前 IDE 执行链未读取；请传 CLI `--lang` / JS `lang` |

## 支付宝 alipay

官方文档：[支付宝 minidev 使用指南](https://opendocs.alipay.com/mini/02q17h) · [CLI 指令列表](https://opendocs.alipay.com/mini/02q29z)。凭据入口：[工具 ID 与工具密钥管理](https://open.alipay.com/dev/workspace/key-manage/tool) · [开发助手与密钥生成说明](https://opendocs.alipay.com/common/02kipl)。

| 字段 | 类型 | 必填 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- | --- |
| `projectPath` | `string` | 是 | 无 | 小程序产物目录 |
| `appid` | `string` | 是 | 无 | 小程序 appid |
| `toolId` | `string` | 是 | 无 | [在工具管理页创建 / 查看并复制 toolId](https://open.alipay.com/dev/workspace/key-manage/tool)，不是小程序 appid |
| `privateKey` | `string` | 二选一 | 无 | 按[密钥生成说明](https://opendocs.alipay.com/common/02kipl)准备的私钥文本；非空时优先于 `privateKeyPath` |
| `privateKeyPath` | `string` | 二选一 | 无 | 使用[支付宝开放平台开发助手](https://opendocs.alipay.com/common/02kipl)生成私钥后保存的本地文件路径 |
| `clientType` | `AlipayClientType` | 否 | `alipay` | 目标终端，完整取值见下表 |
| `autoincrement` | `boolean` | 否 | `false` | true 时传空版本给 SDK，由平台分配；false 时须有版本且大于查询到的最新版本 |
| `preview` | `AlipayPreviewConfig` | 否 | 见下表 | 预览参数 |
| `ide` | `AlipayIdeConfig` | 否 | 未设置 | 开发者工具配置 |

当前上传调用固定传入 `experience: true`，此项不是可配置字段。`autoincrement` 与 `versionStrategy` 是两层行为：开启前者后，最终发送给 SDK 的版本仍为空，不以策略解析出的版本为准。不能把自动递增理解为本地必定执行 patch +1。

### 终端类型 clientType

| 值 | 终端 |
| --- | --- |
| `alipay` | 支付宝 |
| `ampe` | AMPE |
| `amap` | 高德 |
| `genie` | 天猫精灵 |
| `alios` | AliOS |
| `uc` | UC |
| `quark` | 夸克 |
| `koubei` | 口碑 |
| `alipayiot` | 支付宝 IoT |
| `cainiao` | 菜鸟 |
| `alihealth` | 阿里健康 |
| `health` | 阿里医院 |

这些是类型允许的取值，不表示每个终端均完成真实验收。终端行为以平台为准，另见 [支付宝 CLI 文档](https://opendocs.alipay.com/mini/02q29z)。

### 支付宝预览 preview

以下字段位于 `alipay.preview`，全部可选，不传时交给 SDK 处理。

| 字段 | 类型 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- |
| `page` | `string` | SDK 决定 | 预览启动页面 |
| `pageQuery` | `string` | 未设置 | 页面参数 |
| `query` | `string` | 未设置 | 全局启动参数 |
| `scene` | `string` | SDK 决定 | 场景值；JS request 传数字时会转换为字符串 |
| `autoPush` | `boolean` | SDK 决定 | 自动推送到客户端 |
| `ignoreHttpDomainCheck` | `boolean` | SDK 决定 | 忽略 HTTP 请求域名白名单校验 |
| `ignoreWebViewDomainCheck` | `boolean` | SDK 决定 | 忽略 WebView 域名白名单校验 |

支付宝预览默认返回远程二维码 URL。下载到本地通过 CLI `--qr-output` 或 JS `qrOutput` 指定；`alipay.preview` 没有二维码输出字段，也没有微信的 `setting`、`robot`。

### 支付宝 IDE ide

| 字段 | 类型 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- |
| `appPath` | `string` | SDK 决定 | 开发者工具安装路径，仅用于打开 IDE |

## 钉钉 dingtalk

官方文档：[DingTalk Design CLI 仓库](https://github.com/open-dingtalk/dingtalk-design-cli) · [操作指南](https://open.dingtalk.com/document/download/dingtalk-design-introduction)。Wot CI 使用其中的 `dingtalk-miniapp-opensdk` 上传能力，支持范围以本项目平台矩阵为准。

| 字段 | 类型 | 必填 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- | --- |
| `projectPath` | `string` | 是 | 无 | 小程序产物目录，按项目实际构建结果填写 |
| `appid` | `string` | 是 | 无 | 在[钉钉开发者后台](https://open-dev.dingtalk.com/)查看对应小程序的 MiniAppId |
| `token` | `string` | 是 | 无 | 从[钉钉开发者后台](https://open-dev.dingtalk.com/)获取用于上传的 API Token，传给 SDK 的 accessToken |
| `projectType` | `DingtalkProjectType` | 否 | 未使用 | 兼容保留字段，当前不传给上传 SDK |
| `autoincrement` | `boolean` | 否 | `false` | true 时传空版本由平台生成；false 时要求提供顶层版本 |

`projectType` 完整取值：

| 值 | 含义 |
| --- | --- |
| `dingtalk-personal` | 第三方个人应用 |
| `dingtalk-biz-isv` | 第三方企业应用 |
| `dingtalk-biz` | 企业内部应用 |
| `dingtalk-biz-custom` | 企业定制应用 |
| `dingtalk-biz-worktab-plugin` | 工作台组件 |

这些字段值目前不能切换上传行为；钉钉没有预览配置和 IDE 配置，也不支持线上版本查询。上传实现见 [dingtalk.ts](../../src/platforms/dingtalk.ts)。

## 版本策略 versionStrategy

| 字段 | 类型 | 必填 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- | --- |
| `type` | `'fixed' \| 'package' \| 'auto'` | 配置策略时必填 | 未配置策略时直接用顶层版本 | fixed 使用指定值；package 读包版本；auto 查询后递增 |
| `version` | `string` | 否 | 顶层 `version` | 只用于 fixed |
| `bump` | `'major' \| 'minor' \| 'patch'` | auto 必填 | 无 | 自动递增的版本段 |
| `strict` | `boolean` | 否 | `false` | 只用于 auto；联网时要求所有目标查询成功且版本有效 |

auto 查询无有效结果时按 package.json → 配置版本回退；dry-run 不联网，使用本地基础版本生成暂定计划。普通微信小程序和钉钉不能满足严格线上查询要求。完整行为及结果字段见[版本与发布](release.md#版本策略)。

## 包体积预算 budgets

| 字段 | 类型 | 必填 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- | --- |
| `total` | `string \| number` | 否 | 不限制 | 总包上限，数字表示字节，如 `3145728` 或 `'3MB'` |
| `main` | `string \| number` | 否 | 不限制 | 主包上限，如 `'1.5MB'` |
| `warnOnly` | `boolean` | 否 | `false` | true 时超限不令批量 / CLI / release 失败，仍返回预算结果 |

单位支持 B、KB、MB、GB（不区分大小写，1024 进制）；无单位字符串按字节计算，数值需非负。仅在 SDK 返回微信包体积后检查，不能当作上传前门禁；无体积数据时跳过。直接调用单平台 JS API 时需自行读取 `result.budget`，见[上传文档](upload.md#包体积预算)。

## 发布编排 release

以下字段位于配置文件的 `release` 对象。CLI / JS request 对应参数会覆盖这里的值。

| 字段 | 类型 | 必填 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- | --- |
| `buildCommand` | `string \| string[]` | 否 | 空命令列表 | Shell 构建命令；数组按顺序执行；没有命令时直接上传已有产物 |
| `platforms` | `Platform[]` | 否 | 所有已配置平台 | 可选 weixin、alipay、dingtalk；按列表顺序串行上传 |
| `history` | `boolean` | 否 | `true` | 写本地发布历史 |
| `historyFile` | `string` | 否 | `.wotci/history.json` | 历史文件路径 |
| `historyLimit` | `number` | 否 | `50` | 历史保留条数，使用正整数 |
| `prComment` | `boolean \| 'auto'` | 否 | `'auto'` | false 关闭；auto 有 GitHub PR 上下文时评论；true 无上下文时记录评论错误 |

release 不提交审核或上架，不提供跨 Job 的版本锁。构建 / 上传失败影响总体结果，历史和评论失败只记录附加错误。详见[发布编排](release.md#发布编排-release)。

## 环境变量映射

核心配置加载器不会自动把 `WEIXIN_APPID`、`WOTCI_VERSION` 等变量映射到配置，也不会自动加载 `.env` 文件。它把当前 `process.env` 交给配置工厂；必须像本页示例那样显式读取。下表是本页工厂的映射约定，不是额外的 CLI 参数：

| 环境变量 | 配置字段 |
| --- | --- |
| `WOTCI_VERSION` / `WOTCI_DESC` | `version` / `desc` |
| `WEIXIN_APPID` / `WEIXIN_PROJECT_PATH` | `weixin.appid` / `weixin.projectPath` |
| `WEIXIN_PRIVATE_KEY_PATH` / `WEIXIN_ROBOT` | `weixin.privateKeyPath` / `weixin.robot`（转换为数字） |
| `ALIPAY_APPID` / `ALIPAY_TOOL_ID` | `alipay.appid` / `alipay.toolId` |
| `ALIPAY_PROJECT_PATH` / `ALIPAY_CLIENT_TYPE` | `alipay.projectPath` / `alipay.clientType` |
| `ALIPAY_PRIVATE_KEY` / `ALIPAY_PRIVATE_KEY_PATH` | `alipay.privateKey` / `alipay.privateKeyPath` |
| `ALIPAY_AUTOINCREMENT` | `alipay.autoincrement`（字符串 `'true'` 转为布尔值） |
| `DINGTALK_APPID` / `DINGTALK_TOKEN` | `dingtalk.appid` / `dingtalk.token` |
| `DINGTALK_PROJECT_PATH` / `DINGTALK_AUTOINCREMENT` | `dingtalk.projectPath` / `dingtalk.autoincrement`（转换布尔值） |

库直接读取的环境变量包括 IDE 查找的 `WECHAT_DEVTOOLS_CLI`、IDE 启动保护的 `CI`、Vite 平台推断的 `UNI_PLATFORM`，以及[PR 评论](release.md#pr-评论)所用的 GitHub 上下文变量。Jenkins 参数如何传入配置见[Jenkins 示例](jenkins.md)；Playground 的布尔值默认策略以其配置文件为准。

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
