# Action 参数参考

GitHub Action 的完整参数文档已移到 [wot-ui/ci-action/docs/inputs.md](https://github.com/wot-ui/ci-action/blob/main/docs/inputs.md)，与独立 Action 实现一起维护。

## 常用入口

| 需求 | 参数 |
| --- | --- |
| 选择操作和平台 | `command`、`platform` |
| 无配置上传 | `project-path`、`appid`、`private-key` / `token` |
| 复用项目配置 | `config`、`working-directory` |
| 编译、预览和平台选项 | `setting`、`preview`、`platform-options` |
| 保存执行结果 | `json-output`、`summary` |
| 保存预览二维码 | `qrcode-output` |

字段默认值、环境变量优先级和支持范围以独立仓库的参数文档为准。CLI 平台配置继续在 [配置项目](configuration.md) 中维护。

旧入口和新入口的版本选择规则不同，迁移前请阅读 [迁移指南](https://github.com/wot-ui/ci-action/blob/main/docs/migration.md)。
