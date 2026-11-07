# Wot CI 文档

按使用方式选择入口。GitHub Action 可直接传入构建产物和凭据；CLI、JS API 与 Vite 共用项目配置。

## 开始使用

- [认识 Wot CI](guides/overview.md)
- [CLI 快速开始](guides/getting-started.md)
- [配置与参数参考：三平台及全部嵌套字段](guides/configuration.md)
- [从 uni-mini-ci 迁移](guides/migration.md)

## GitHub Action 与工具集成

- [GitHub Action：上传、预览与结果归档](guides/github-action.md)
- [Jenkins：微信项目模板与三平台 Playground](guides/jenkins.md)
- [Action 参数参考](guides/action-reference.md)
- [Vite 与 uni-app 插件](guides/vite.md)
- [JavaScript API](guides/api.md)

## 发布工作流

- [CLI 命令与完整参数表](guides/commands.md)
- [上传与结果](guides/upload.md)
- [预览二维码](guides/preview.md)
- [版本与发布](guides/release.md)
- [诊断与开发工具](guides/diagnostics.md)

## 参考与维护

- [错误模型](guides/errors.md) · [平台支持矩阵](support-matrix.md)
- [真实平台验收](platform-validation.md) · [后续路线](roadmap.md)
- [Playground](guides/playground.md) · [开发与贡献](guides/development.md)
- [维护者发布指南](releasing.md) · [文档站维护](../apps/website/README.md)

使用指南的正文维护在 `guides/`，由文档站直接读取；根 README 提供安装、配置示例、项目脚本、常用参数表和各接入方式入口；完整嵌套参数及行为限制统一维护在对应指南中。
