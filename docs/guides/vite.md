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
