# JS API

## 一步上传

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

## 先加载配置，再上传

```ts
import { loadConfig, uploadPlatform } from '@wot-ui/ci'

const loaded = await loadConfig({ cwd: process.cwd() })
const result = await uploadPlatform('weixin', loaded.config, { cwd: loaded.cwd })

console.log(loaded.source) // 'file' | 'package-json' | 'minicirc' | 'inline' | 'defaults'
```

## 直接调用单平台上传

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

## 查询线上版本

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

## 体验版与版本管理

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

## 批量上传与预览

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

## 发布编排

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

## 生成预览二维码

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

## 打开 / 关闭开发者工具

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

## 默认导出

```ts
import wotci from '@wot-ui/ci'

await wotci.upload('weixin')
```

## 参数参考

参数名区分大小写；JS 使用 `configFile`、`qrOutput`、`buildNpm` 等驼峰命名，不使用 CLI 的 `--config`、`--qr-output`。以下表格列出公共调用入口的输入；完整返回类型可查 [src/types.ts](../../src/types.ts)。配置对象本身的字段见[配置参考](configuration.md)。

### 入口与调用签名

下表中的 request / options 不标必填时均可省略，默认 `{}`。`platform` 必填，类型为 `PlatformInput`（weixin、alipay、dingtalk、历史别名 dd），具体操作支持范围见[命令一览](commands.md#命令一览)。

| 函数 | 参数 | 返回值 |
| --- | --- | --- |
| `defineConfig` | 必填 `config: WotciConfig` 或 `ConfigFactory` | 原样返回对象或工厂，提供类型提示 |
| `loadConfig` | `options: LoadConfigOptions` | `Promise<LoadedConfig>` |
| `upload` | `platform, request: UploadRequest` | `Promise<AnyUploadResult>`；执行版本策略 |
| `preview` | `platform, request: PreviewRequest` | `Promise<AnyPreviewResult>` |
| `uploadMany` | `request: BatchRequest` | 批量上传结果；dryRun 时各项为 `PlatformPlan` |
| `previewMany` | `request: BatchRequest` | 批量预览结果；dryRun 时各项为 `PlatformPlan` |
| `release` | `request: ReleaseRequest` | `Promise<ReleaseResult>` |
| `initProject` | `options: InitOptions` | `Promise<InitResult>` |
| `runDoctor` | `request: DoctorRequest` | `Promise<DoctorResult>` |
| `getLatestVersion` / `getVersionList` | `platform, request: VersionRequest` | `Promise<VersionInfo>` |
| `setExperience` / `cancelExperience` / `deleteVersion` | `platform, request: VersionMutationRequest`（必填） | `Promise<VersionMutationResult>` |
| `buildNpm` | `platform, request: WeixinBuildNpmRequest` | `Promise<WeixinBuildNpmResult>` |
| `downloadSourceMap` / `downloadCompiledResult` | `platform, request: WeixinSourceMapRequest / WeixinCompiledResultRequest` | `Promise<WeixinDiagnosticResult>` |
| `checkCodeQuality` | `platform, request: WeixinQualityRequest` | `Promise<WeixinQualityResult>` |
| `openIde` / `closeIde` / `autoIde` | `platform, request: IdeRequest` | `Promise<IdeResult>` |
| `getIdeStatus` | `platform, request: IdeRequest` | `Promise<IdeStatusResult>` |
| `previewIde` | `platform, request: IdePreviewRequest` | `Promise<IdePreviewResult>` |

### 配置加载与基础选项

`LoadConfigOptions` 包含以下前三项；`UploadRequest`、`PreviewRequest`、`BatchRequest`、`ReleaseRequest`、诊断、版本、IDE 请求也接受这些配置加载参数。init 的参数单独列出。

| 字段 | 类型 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- |
| `cwd` | `string` | `process.cwd()` | 路径解析和配置查找基准 |
| `config` | `UserConfig` | 未设置 | 内联配置对象或工厂；设置后优先于 configFile 与自动发现 |
| `configFile` | `string` | 自动发现 | 显式配置文件，路径基于 cwd；为空字符串会报错 |
| `buildNpm` | `boolean` | `false` | 上传 / 预览前构建微信 npm；具体生效入口见下文 |

`buildNpm` 的当前实现边界：

- `uploadMany`、`preview`、`previewMany`、`uploadPlatform`、`previewPlatform` 会传递该开关；对非微信目标返回不支持错误。
- 底层 `uploadWeixin` / `previewWeixin` 支持该开关。
- 高层 `upload()` 和 `release()` 虽然请求类型继承了该字段，目前没有传到上传实现；需要时使用 `uploadMany({ platforms: ['weixin'], buildNpm: true })` 或显式先调用 `buildNpm()`。
- doctor、init、版本、IDE 和微信诊断请求因类型继承也能看到 `buildNpm`，这些操作不消费该字段；独立 `buildNpm()` 函数直接执行构建，无需再传开关。

单平台 `upload()` / `preview()` 没有 dryRun 参数；需要离线计划时调用对应的 `uploadMany()` / `previewMany()` 并传 `dryRun: true`。

### 预览选项 PreviewOptions

`PreviewRequest` 在以下字段之外还接受 `config`、`configFile`、`cwd`、`buildNpm`。`previewMany` 也支持这些字段，且不受 CLI 批量分支的覆盖限制影响。

| 字段 | 类型 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- |
| `qrFormat` | `'terminal' \| 'image' \| 'base64'` | 微信 preview 配置 → image | 仅微信；支付宝返回 URL 或下载文件 |
| `qrOutput` | `string` | 微信配置 → `.wotci/preview/weixin.png` 或 `.txt` | 输出路径；支付宝传入后下载二维码；微信 terminal 忽略输出路径 |
| `pagePath` | `string` | 平台 preview 配置 | 微信 `pagePath` / 支付宝 `page` |
| `pageQuery` | `string` | `alipay.preview.pageQuery` | 仅支付宝页面参数 |
| `query` | `string` | 平台 preview 配置 | 微信 `searchQuery` / 支付宝 `query` |
| `scene` | `string \| number` | 平台 preview 配置 | 微信转成非负整数；支付宝转成字符串 |
| `desc` | `string` | `weixin.preview.desc` → 顶层 `desc` | 仅微信预览备注 |
| `robot` | `number` | `weixin.preview.robot` → `weixin.robot` | 仅微信，1～30 |

对应字段使用 request → 平台 preview 配置 → 内置默认值的优先级，`undefined` 表示继续回退。threads、编译设置、域名检查等专属参数请写在平台 preview 配置中，不能直接放到 request。

### 批量选项 BatchRequest

继承基础配置加载、`buildNpm` 和全部预览选项；预览选项仅 `previewMany` 使用，`uploadMany` 的描述、机器人等仍取配置。

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `platforms` | `PlatformInput[]` | 全部已配置平台 | 去重后执行；空数组也回退到全部已配置平台 |
| `concurrency` | `number` | `1` | 平台并发数，使用正整数 |
| `dryRun` | `boolean` | `false` | 本地计划，不调用上传 / 预览 SDK |
| `redirectStdoutToStderr` | `boolean` | `false` | 将执行期间 SDK stdout 日志转到 stderr，便于调用方输出纯 JSON |

单个平台失败记录在 `results`，继续其他平台；检查 `result.ok` 及各项 `ok`。配置加载、严格版本解析等在平台执行前失败仍会抛错。dryRun 当前只做基础计划检查，不会完整检查 request 中每个预览覆盖选项。

### 发布选项 ReleaseRequest

除 `cwd`、`config`、`configFile` 外，还支持下表。`buildNpm` 虽在类型中继承但当前不生效，见前文。

| 字段 | 类型 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- |
| `buildCommand` | `string \| string[]` | `config.release.buildCommand` → 空列表 | 覆盖构建命令；数组串行执行 |
| `skipBuild` | `boolean` | `false` | 跳过构建 |
| `platforms` | `PlatformInput[]` | `config.release.platforms` → 全部已配置平台 | 顺序串行上传；空数组按配置回退 |
| `dryRun` | `boolean` | `false` | 只返回编排计划，不构建、上传、写历史或评论 |
| `history` | `boolean` | `config.release.history` → true | 是否写历史 |
| `historyFile` | `string` | 配置 → `.wotci/history.json` | 历史文件路径 |
| `prComment` | `boolean \| 'auto'` | 配置 → auto | 是否评论 PR；含义见[发布配置](configuration.md#发布编排-release) |

`historyLimit` 只在 `config.release` 中配置，不是 request 字段；release 没有 concurrency 参数。release 的 dryRun 不校验产物是否存在，不能替代构建后的 doctor / uploadMany dryRun。

### 初始化与体检

| 函数 | 字段 | 类型 | 默认值 / 说明 |
| --- | --- | --- | --- |
| `initProject` | `cwd` | `string` | 进程工作目录 |
| `initProject` | `configFile` | `string` | `wotci.config.ts`；表示输出文件，非加载来源 |
| `initProject` | `platforms` | `PlatformInput[]` | 自动探测；未探测到产物则生成三平台模板 |
| `initProject` | `force` | `boolean` | false；允许覆盖已有文件 |
| `initProject` | `dryRun` | `boolean` | false；true 仅返回内容，不写配置文件；文件已存在时仍需 force |
| `runDoctor` | `cwd` / `config` / `configFile` | 同基础选项 | 使用统一配置加载规则 |
| `runDoctor` | `network` | `boolean` | false；开启线上版本查询诊断，无法查询的平台会跳过 |

`initProject` 不接受内联 config。两个请求类型继承的 `buildNpm` 不生效。doctor 结果含 `ok`、`checks`，仅告警不判失败。

### 版本与体验版

`VersionRequest` 使用 `cwd`、`config`、`configFile`。版本变更额外支持：

| 字段 | 类型 | 必填 | 默认值 / 说明 |
| --- | --- | --- | --- |
| `version` | `string` | 是 | 指定待设置体验版、取消体验版或删除的版本；不自动读取配置中的 version |
| `confirm` | `boolean` | 删除时必须为 true | false / 缺省拒绝删除；setExperience / cancelExperience 不消费该值 |

只有支付宝支持这些变更；查询最新微信版本限插件类型。此组 API 不提供 dryRun，继承的 buildNpm 不生效。

`resolveVersion(config, options)` 使用显式配置对象，并要求传入 options：

| 字段 | 类型 | 必填 | 默认值 / 说明 |
| --- | --- | --- | --- |
| `cwd` | `string` | 是 | 线上查询所需配置路径的解析基准 |
| `packageJson` | `{ version?: string }` | 否 | package / auto 策略的包版本来源；函数不会自行读取 package.json |
| `platforms` | `Platform[]` | 否 | 所有已配置平台；限定本次查询范围；此类型不包含 dd |
| `allowNetwork` | `boolean` | 否 | true；false 时禁止 auto 查询网络并产生暂定结果 |

### 微信构建与诊断

各函数都接受基础 `cwd`、`config`、`configFile`，并要求 `platform='weixin'`。额外字段如下：

| 函数 | 字段 | 类型 | 默认值 / 说明 |
| --- | --- | --- | --- |
| `buildNpm` | `ignores` | `string[]` | `weixin.ignores`；覆盖 packNpm 排除规则 |
| `downloadSourceMap` | `output` | `string` | `.wotci/weixin/sourcemap.zip` |
| `downloadSourceMap` | `robot` | `number` | `weixin.robot` → 1；使用 1～30 |
| `downloadSourceMap` | `streaming` | `boolean` | false；是否流式下载 |
| `downloadCompiledResult` | `output` | `string` | `.wotci/weixin/compiled.zip` |
| `downloadCompiledResult` | `robot` | `number` | `weixin.robot`，未设置交给 SDK |
| `checkCodeQuality` | `output` | `string` | 不写文件；设置后另存结果 JSON |

这些 API 没有 dryRun、summary、failOnIssues 请求字段；`checkCodeQuality()` 的质量问题通过 `result.ok` / `result.issues` 返回，由调用方决定是否阻断。

### IDE 选项

`IdeRequest` 使用基础 `cwd`、`config`、`configFile`，并接受以下字段；`IdePreviewRequest` 再增加最后三个二维码字段。`buildNpm` 仅因类型继承存在，不用于 IDE。

| 字段 | 类型 | 默认值 | 生效操作 / 说明 |
| --- | --- | --- | --- |
| `dryRun` | `boolean` | false | open / close / auto / preview，不执行 IDE 命令；getIdeStatus 不支持 dryRun |
| `force` | `boolean` | false | open / auto / preview，在 CI 环境显式允许启动 GUI |
| `lang` | `'zh' \| 'en'` | IDE 决定 | 微信 open / close / auto / status / preview；quit 忽略 |
| `port` | `number` | IDE 决定 | 同上；使用 1～65535；配置中的 ide.port 不作为回退值 |
| `quit` | `boolean` | false | closeIde 退出整个微信 IDE |
| `trustProject` | `boolean` | false | autoIde 信任项目 |
| `ticket` | `string` | 未设置 | autoIde 的 ticket |
| `qrFormat` | `'terminal' \| 'image' \| 'base64'` | image | previewIde；不读取 SDK preview 配置 |
| `qrOutput` | `string` | `.wotci/preview/weixin-ide.png` 或 `.txt` | previewIde 输出；terminal 不落盘 |
| `infoOutput` | `string` | 不设置 | previewIde 的 info-output 路径 |

JS `closeIde()` 会传递 port / lang，CLI close 当前不会。支付宝只支持 open，微信支持以上各操作。getIdeStatus 虽接受 IdeRequest，实际只用配置、cwd、port 和 lang。

### 底层入口与输出辅助

底层函数需要调用方提供已解析的 `WotciConfig`，不会自动读配置文件、补 package.json 默认值或执行版本策略；`uploadPlatform` 会额外归一 dd 别名，直接 `uploadDingTalk` 请使用 dingtalk 字段。

| 函数 | 参数 | 说明 |
| --- | --- | --- |
| `uploadPlatform` | 必填 `platform, config`；可选 `options: UploadOptions` | options 为 cwd / buildNpm |
| `uploadWeixin` / `uploadAlipay` / `uploadDingTalk` | 必填 `config`；可选 `options: UploadOptions` | buildNpm 仅 uploadWeixin 使用 |
| `previewPlatform` | 必填 `platform, config`；可选 `options: PreviewOptions` | 使用上文预览选项 |
| `previewWeixin` / `previewAlipay` | 必填 `config`；可选 `options: PreviewOptions` | 使用各平台支持的预览选项 |
| `runWeixinIde` / `runAlipayIde` | 必填 `action: IdeAction, config`；可选 `options: IdeOptions` | action 为 open / close / auto / quit；自动化请调用专门的 autoWeixinIde；支付宝只允许 open |
| `autoWeixinIde` / `getWeixinIdeStatus` | 必填 `config`；可选 `options: IdeOptions` | 不经过高层 CI GUI 启动保护 |
| `previewWeixinIde` | 必填 `config`；可选 `options: IdePreviewOptions` | 不经过高层 CI GUI 启动保护 |
| `normalizePlatform` | 必填平台字符串 | 校验并将 dd 归一为 dingtalk |
| `compareVersion` | 必填 `left: string, right: string` | 数字段版本比较，返回 -1 / 0 / 1，不接受预发布标签 |
| `bumpVersion` | 必填 `version: string, bump: 'major' \| 'minor' \| 'patch'` | 递增数字段版本，不写文件 |
| `applyVersion` | 必填 `config: WotciConfig, resolution: VersionResolution` | resolution 有版本时返回覆盖 version 的配置 |
| `renderBatchJson` | 必填 `result: BatchResult, command: 'upload' \| 'preview'`；可选 `config: { source: string, sourceFile?: string }` | 返回 JSON 字符串，不写文件，不序列化 SDK raw |
| `renderBatchSummary` | 必填 `result: BatchResult, command: 'upload' \| 'preview'` | 返回 Markdown 字符串，不写文件 |

直接单平台 JS 调用返回的预算结果由调用方检查，不会仅因预算超限自动抛错；批量 API 和 release 会据此计算 `ok`。API 成功返回不等于正式上架或客户端验收完成。

通过 `@wot-ui/ci/cli` 导出的 `runCli(argv, options)` 可嵌入 CLI：argv 默认为 `process.argv.slice(2)`，options 支持 `cwd?: string`、`stdout?: (message: string) => void`、`stderr?: (message: string) => void`；返回 `Promise<number>` 退出码。`parseCliArgs(argv)` 只解析命令参数，不执行动作。
