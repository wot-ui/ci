# Wot CI · @wot-ui/ci

[![CI](https://github.com/wot-ui/ci/actions/workflows/ci.yml/badge.svg)](https://github.com/wot-ui/ci/actions/workflows/ci.yml)
[![Marketplace](https://img.shields.io/badge/Marketplace-wot--ui--ci--action-blue?logo=github)](https://github.com/marketplace/actions/wot-ui-ci-action)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/wot-ui/ci/blob/main/LICENSE.md)

面向微信、支付宝、钉钉小程序的 CI 工具。在项目构建后完成上传、预览、配置检查与发布编排，支持 CLI、JavaScript API、Vite 插件和 GitHub Action。

[使用文档](https://github.com/wot-ui/ci/blob/main/docs/README.md) · [配置参考](https://github.com/wot-ui/ci/blob/main/docs/guides/configuration.md) · [GitHub Action](https://github.com/wot-ui/ci/blob/main/docs/guides/github-action.md) · [平台支持](https://github.com/wot-ui/ci/blob/main/docs/support-matrix.md)

## 能做什么

- **上传与预览**：单平台或批量上传，生成微信 / 支付宝预览二维码。
- **上传前检查**：配置体检、dry-run、微信构建 npm 与包体积预算。
- **版本与发布**：版本策略、构建编排、发布历史与 PR 评论。
- **接入现有工程**：JS / TS 配置和环境变量，兼容 `uni-mini-ci` 旧配置。

## 快速开始

需要 Node.js ≥ 20，在项目中安装：

```sh
pnpm add -D @wot-ui/ci
pnpm exec wotci init --platform weixin
```

检查生成的 `wotci.config.ts`，将产物路径改成项目实际目录，通过环境变量提供凭据：

```ts
import { defineConfig } from '@wot-ui/ci'

export default defineConfig({
  version: '1.0.0',
  weixin: {
    appid: process.env.WEIXIN_APPID!,
    privateKeyPath: process.env.WEIXIN_PRIVATE_KEY_PATH!,
    projectPath: 'dist/build/mp-weixin',
  },
})
```

先构建小程序，再检查配置并上传：

```sh
pnpm build # 替换为项目实际的小程序构建命令
pnpm exec wotci doctor
pnpm exec wotci upload -p weixin
```

微信上传前需在公众平台生成代码上传私钥并配置 CI IP 白名单。完整步骤与其他平台配置见 [快速开始](https://github.com/wot-ui/ci/blob/main/docs/guides/getting-started.md)。

## 选择接入方式

| 场景 | 入口 |
| --- | --- |
| 本地命令行、GitLab CI、Jenkins、自建流水线 | [CLI 命令速查](https://github.com/wot-ui/ci/blob/main/docs/guides/commands.md) |
| 在 JS / TS 脚本中调用上传和预览 | [JavaScript API](https://github.com/wot-ui/ci/blob/main/docs/guides/api.md) |
| 在 Vite / uni-app 构建完成后执行 | [Vite 插件](https://github.com/wot-ui/ci/blob/main/docs/guides/vite.md) |
| 在 GitHub Actions 中上传与生成预览 | [GitHub Action 指南](https://github.com/wot-ui/ci/blob/main/docs/guides/github-action.md) |

## GitHub Action

Action 已独立到 [wot-ui/ci-action](https://github.com/wot-ui/ci-action)。旧 `wot-ui/ci@v0` 与历史精确标签保留兼容，新接入使用独立仓库。

在工作流完成构建后添加以下步骤，无需额外配置文件：

```yaml
- uses: wot-ui/ci-action@v2
  with:
    platform: weixin
    project-path: dist/build/mp-weixin
    appid: ${{ secrets.WEIXIN_APPID }}
    private-key: ${{ secrets.WEIXIN_PRIVATE_KEY }}
```

上传版本默认读取 `package.json.version`。支付宝额外传 `tool-id`；钉钉使用 `token`，不传私钥。完整工作流、预览与结果归档见 [Action 指南](https://github.com/wot-ui/ci/blob/main/docs/guides/github-action.md)，全部 inputs 见 [参数参考](https://github.com/wot-ui/ci/blob/main/docs/guides/action-reference.md)。

## 更多文档

[上传与结果](https://github.com/wot-ui/ci/blob/main/docs/guides/upload.md) · [版本与发布](https://github.com/wot-ui/ci/blob/main/docs/guides/release.md) · [迁移指南](https://github.com/wot-ui/ci/blob/main/docs/guides/migration.md) · [路线图](https://github.com/wot-ui/ci/blob/main/docs/roadmap.md) · [参与贡献](https://github.com/wot-ui/ci/blob/main/CONTRIBUTING.md)

MIT © wot-ui
