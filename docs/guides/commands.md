# CLI 命令速查

| 场景 | 命令 |
| --- | --- |
| 上传单平台 | `wotci -p weixin` |
| 上传所有已配置平台 | `wotci upload --all` |
| 只校验、不上传 | `wotci upload --all --dry-run` |
| 生成预览二维码 | `wotci preview -p weixin` |
| 构建并发布 | `wotci release` |
| 查询线上版本 | `wotci version latest -p weixin` |
| 配置体检 | `wotci doctor` |
| 微信构建 npm | `wotci build-npm -p weixin` |
| 微信 SourceMap | `wotci sourcemap -p weixin` |
| 打开开发者工具 | `wotci open -p weixin` |
| 生成配置文件 | `wotci init` |

各命令的专属参数见对应章节，`wotci --help` 可以查看当前版本支持的全部参数。

## 常用参数

| 参数 | 说明 |
| --- | --- |
| `-p, --platform <name>` | 目标平台：`weixin`、`alipay`、`dingtalk`，`dd` 是 `dingtalk` 的别名 |
| `-c, --config <file>` | 显式指定配置文件，相对路径基于 `--cwd` 解析 |
| `--cwd <dir>` | 配置解析目录，默认 `process.cwd()` |
| `--json` | stdout 只输出 JSON，日志走 stderr |
| `--summary <file>` | 生成 Markdown 摘要，可直接写入 `$GITHUB_STEP_SUMMARY` |
| `--dry-run` | 只做本地校验，不调用 SDK |
| `--concurrency <n>` | 批量上传 / 预览的并发数，默认 `1`（串行） |
| `--build-npm` | 上传 / 预览前执行微信「构建 npm」 |
| `--output <file>` | `sourcemap` / `inspect` / `quality` 的输出路径 |
| `--streaming` | `sourcemap` 使用流式下载 |
| `--ignores <list>` | `build-npm` 的排除规则，逗号分隔 |
| `-h, --help` | 查看帮助 |
