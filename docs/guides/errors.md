# 错误模型

库层不会调用 `process.exit`：

- 配置错误抛出 `ConfigError`
- 上传错误抛出 `UploadError`，原始错误挂在 `cause` 上
- 预览错误抛出 `PreviewError`；平台不支持预览时抛出 `PreviewUnsupportedError`
- 发布编排错误抛出 `ReleaseError`，构建失败抛出 `BuildError`
- 版本查询 / 管理错误抛出 `VersionError`；平台不支持时抛出 `VersionUnsupportedError`
- IDE 相关错误抛出 `IdeError` 的子类：`IdeNotFoundError`（找不到 IDE）、`IdeUnsupportedError`（平台不支持）、`IdeCommandError`（命令执行失败）
- 以上错误都继承 `WotCIError`（带 `code` 字段）
- `formatErrorReport(error)` 可以把 `cause` 链格式化为字符串数组

CLI 会捕获这些错误、打印原因链并返回退出码 `1`，调用方也可以自行决定日志和退出策略。
