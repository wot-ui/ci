# Vite 与 uni-app 插件

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

## 插件参数

`wotciPlugin(options?: WotciViteOptions)` 返回 Vite Plugin，options 默认为 `{}`。以下是插件顶层的全部字段：

| 字段 | 类型 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- |
| `action` | `'preview' \| 'upload' \| false` | `'preview'` | 构建后的动作；false 关闭 |
| `cwd` | `string` | Vite `root` | 配置加载与所有相对路径的解析基准 |
| `config` | `UserConfig` | 未设置 | 内联配置对象或同步 / 异步工厂，优先于 configFile |
| `configFile` | `string` | 自动发现 wotci 配置 | 显式配置文件，路径基于 cwd |
| `enabled` | `boolean` | `true` | false 跳过插件动作 |
| `failOnError` | `boolean` | `true` | 批量结果 ok=false 时让 Vite 构建失败；false 不会吞掉配置加载异常或回调异常 |
| `platforms` | `PlatformInput[]` | 从 `UNI_PLATFORM` 推断，不能推断时使用全部已配置平台 | 支持 weixin、alipay、dingtalk、dd；空数组也回退全部已配置平台 |
| `preview` | `Omit<PreviewOptions, 'cwd'>` | 未设置 | 仅 action=preview 时使用；字段见下表 |
| `concurrency` | `number` | `1` | 批量并发数，使用正整数 |
| `dryRun` | `boolean` | `false` | 构建照常完成，之后仅校验上传 / 预览计划，不调用平台 SDK |
| `onResult` | `(result: BatchResult<unknown>) => void` | 无 | 批量执行返回后同步调用；也接收失败结果和 dry-run 计划；发生在 failOnError 判断之前 |

`UNI_PLATFORM` 映射：mp-weixin → weixin，mp-alipay → alipay，mp-dingtalk → dingtalk。钉钉不支持 preview，应显式设 `action: 'upload'`。普通 Vite 项目无法通过该变量推断平台时，建议明确写 platforms，避免执行配置中的所有平台。

插件每个实例仅执行一次 closeBundle 动作；`onResult` 不会被 await，应使用同步回调。顶层没有 buildNpm、summary、version、desc 等字段：版本与描述写入 config，结果归档可在 onResult 中自行处理。

## preview 子参数

以下字段是全部 `preview` 子参数；只有 action=preview 生效，对应 JS [PreviewOptions](api.md#预览选项-previewoptions)。

| 字段 | 类型 | 默认值 / 来源 | 说明 |
| --- | --- | --- | --- |
| `buildNpm` | `boolean` | false | 仅微信，预览前构建 npm；非微信返回不支持错误 |
| `qrFormat` | `'terminal' \| 'image' \| 'base64'` | 微信配置 → image | 仅微信二维码格式 |
| `qrOutput` | `string` | 平台默认输出 | 微信文件路径；支付宝指定后下载二维码 |
| `pagePath` | `string` | 平台 preview 配置 | 微信 pagePath / 支付宝 page |
| `pageQuery` | `string` | alipay.preview.pageQuery | 支付宝页面参数 |
| `query` | `string` | 平台 preview 配置 | 微信 searchQuery / 支付宝全局 query |
| `scene` | `string \| number` | 平台 preview 配置 | 微信非负整数，支付宝转字符串 |
| `desc` | `string` | 微信 preview.desc → 顶层 desc | 微信预览备注 |
| `robot` | `number` | 微信 preview.robot → weixin.robot | 微信机器人，1～30 |

输出路径基于插件 cwd。preview 对应字段覆盖平台配置；微信线程数、编译设置及支付宝域名校验选项仍需写在 config 的平台 preview 对象中。多个平台不要共用一个 qrOutput 文件名。
