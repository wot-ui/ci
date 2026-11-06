# Playground

仓库内的 [playground/wotci.config.ts](../../playground/wotci.config.ts) 通过环境变量注入三端配置：

- `WOTCI_VERSION`、`WOTCI_DESC`：上传版本号和描述
- `WEIXIN_APPID`、`WEIXIN_PRIVATE_KEY_PATH`、`WEIXIN_PROJECT_PATH`、`WEIXIN_ROBOT`
- `ALIPAY_APPID`、`ALIPAY_TOOL_ID`、`ALIPAY_PRIVATE_KEY` 或 `ALIPAY_PRIVATE_KEY_PATH`、`ALIPAY_PROJECT_PATH`、`ALIPAY_CLIENT_TYPE`、`ALIPAY_AUTOINCREMENT`
- `DINGTALK_APPID`、`DINGTALK_TOKEN`、`DINGTALK_PROJECT_PATH`、`DINGTALK_AUTOINCREMENT`

本地示例：

```sh
WOTCI_VERSION=1.0.0 pnpm upload:playground:weixin
ALIPAY_PRIVATE_KEY="$(cat keys/alipay.private.key)" pnpm upload:playground:alipay
DINGTALK_APPID=xxx DINGTALK_TOKEN=xxx pnpm upload:playground:dingtalk
```

GitHub Actions 可参考 [.github/workflows/upload-playground.yml](../../.github/workflows/upload-playground.yml)。

工作流会先构建 CLI 与 playground 产物，再通过 `uses: ./` 调用当前提交的 GitHub Action，执行 `doctor`、所选命令的 `--dry-run` 和真实上传或预览。Action 绑定本次构建的 CLI，并继续读取 `playground/wotci.config.ts`，保留支付宝 / 钉钉的自动递增等配置。通过 `json-output` 和 `summary` 保存结果，同时存档二维码、环境与 SDK 精确版本及 Step Summary。微信 / 支付宝私钥从 Secrets 写入 `$RUNNER_TEMP` 并设置 `chmod 600`，执行结束后会删除。能力边界见 [支持矩阵](../support-matrix.md)，操作步骤和记录模板见 [平台验收指南](../platform-validation.md)。

需要在仓库 Secrets 中配置：

- 微信：`WEIXIN_APPID`、`WEIXIN_PRIVATE_KEY`（小程序代码上传密钥）
- 支付宝：`ALIPAY_APPID`、`ALIPAY_TOOL_ID`、`ALIPAY_PRIVATE_KEY`
- 钉钉：`DINGTALK_APPID`、`DINGTALK_TOKEN`

支持手动触发并选择 `command=upload/preview`、平台、版本、描述、上传机器人（1-30）以及 `dry-run`；preview 支持微信和支付宝，扫码结果需另外记录。push 到 `main` 且改动涉及 CLI / playground 时只跑 dry-run 冒烟测试，不会消耗上传版本。微信上传要求调用方 IP 在白名单内，GitHub 托管 Runner 的出口 IP 不固定，需要在微信公众平台关闭 IP 白名单（或改用自建 Runner）。
