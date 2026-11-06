# CLI 快速开始

下面以微信小程序为例，完成安装、配置和首次上传。使用 GitHub Actions 可直接参考 [Action 接入](github-action.md)。

## 环境与安装

需要 Node.js ≥ 20。包提供 ESM 入口；CommonJS 脚本可以通过 `await import('@wot-ui/ci')` 调用。

```sh
pnpm add -D @wot-ui/ci
# 或 npm i -D @wot-ui/ci
```

## 准备配置

在项目根目录生成配置：

```sh
pnpm exec wotci init --platform weixin
```

检查 `wotci.config.ts`，确认产物路径与项目实际构建目录一致：

```ts
import { defineConfig } from '@wot-ui/ci'

export default defineConfig({
  version: '1.0.0',
  desc: 'CI 上传',
  weixin: {
    appid: process.env.WEIXIN_APPID!,
    privateKeyPath: process.env.WEIXIN_PRIVATE_KEY_PATH!,
    projectPath: 'dist/build/mp-weixin',
    robot: 1,
  },
})
```

通过环境变量提供 appid 和私钥文件路径。私钥从微信公众平台「开发管理 → 开发设置 → 小程序代码上传」生成，上传前需配置 CI 机器的出口 IP 白名单。支付宝、钉钉和配置工厂见 [配置项目](configuration.md)。

## 构建、检查与上传

```sh
# 替换为项目实际的小程序构建命令
pnpm build

# 检查配置、产物和私钥
pnpm exec wotci doctor

# 上传微信小程序
pnpm exec wotci upload -p weixin
```

成功退出码为 `0`，失败为 `1`。`upload` 是默认命令，也可以简写为 `pnpm exec wotci -p weixin`。

需要先看上传计划时，添加 `--dry-run`；需要线上凭据检查时，运行 `wotci doctor --network`。微信网络检查仅支持插件类型项目，普通小程序会跳过并提示 `warn`。

## 下一步

- [命令速查](commands.md)：选择上传、预览、诊断等命令。
- [上传与结果](upload.md)：批量上传、JSON 输出与包体积预算。
- [版本与发布](release.md)：版本策略与构建发布编排。
