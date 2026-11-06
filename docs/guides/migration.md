# 从 uni-mini-ci 迁移

| uni-mini-ci | @wot-ui/ci |
| --- | --- |
| `minici --platform weixin` | `wotci --platform weixin` |
| `uni-mini-ci` 包 | `@wot-ui/ci` 包 |
| `.minicirc` | 继续可用（JSON5） |
| `package.json` 的 `uni-mini-ci` 字段 | 继续可用 |
| `dd` 配置 / `--platform dd` | 继续可用，内部归一为 `dingtalk` |
| 库层 `process.exit` | 抛出 `ConfigError` / `UploadError` |
| `miniprogram-ci` 1.x | `miniprogram-ci` 2.x |

需要注意：`autoincrement` 未配置时按 `false` 处理，与旧版行为一致；如果希望平台自动递增版本号，请显式配置 `autoincrement: true`。
