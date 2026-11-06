# 认识 Wot CI

`@wot-ui/ci` 是小程序 CI 工具，在项目构建后完成上传、预览与发布编排，支持微信、支付宝和钉钉。

## 选择接入方式

| 使用场景 | 入口 |
| --- | --- |
| 在 GitHub Actions 中上传或生成预览 | [GitHub Action](github-action.md) |
| 本地命令行、GitLab CI、Jenkins 或自建流水线 | [CLI 快速开始](getting-started.md) |
| 在 JS / TS 脚本中调用 | [JavaScript API](api.md) |
| 在 Vite / uni-app 构建完成后执行 | [Vite 插件](vite.md) |

## 核心能力

- **上传与预览**：单平台或批量上传；微信、支付宝可生成预览二维码。
- **上传前检查**：配置体检、dry-run、微信构建 npm 与包体积预算。
- **版本与发布**：版本策略、构建编排、发布历史与 PR 评论。
- **灵活配置**：JS / TS 配置文件和环境变量；兼容 `uni-mini-ci` 的旧配置。

不同平台的能力有差异，例如钉钉不支持预览、微信普通小程序不支持线上版本查询。具体范围与验证状态见 [平台支持矩阵](../support-matrix.md)。
