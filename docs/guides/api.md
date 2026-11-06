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
