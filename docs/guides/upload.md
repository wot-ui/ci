# 上传

`upload` 是默认命令，下面两种写法等价：

```sh
wotci -p weixin
wotci upload -p weixin
```

- 微信必须有版本号（来自配置或 `package.json`）
- 上传前会自动执行 [版本策略](release.md#版本策略)
- 加 `--build-npm` 可以在上传前执行微信「构建 npm」
- 配置了 [包体积预算](#包体积预算) 时，超限会让该平台判定失败

## 批量上传

```sh
# 执行配置中所有平台
wotci upload --all

# 指定多个平台
wotci upload -p weixin,alipay

# 控制并发（默认 1，串行）
wotci upload --all --concurrency 2

# 只校验，不调用 SDK
wotci upload --all --dry-run

# 批量预览
wotci preview --all

# JSON 输出（stdout 只有 JSON）
wotci upload --all --json

# 写入 GitHub Step Summary
wotci upload --all --summary "$GITHUB_STEP_SUMMARY"
```

- 单个平台失败不中断其它平台，最终退出码为 `1`
- `--dry-run` 只做本地计划校验：配置对象、产物目录、私钥、版本；不调用上传 SDK、不请求网络。显式 `--summary` 仍会写摘要，Shell 重定向也会创建文件；必填字段可另用 doctor 检查
- `--summary` 生成 Markdown 表格，可直接写入 `$GITHUB_STEP_SUMMARY`

## CI 输出 JSON 与 Step Summary

`--json` 时 stdout 只输出 JSON，日志走 stderr；SDK 写到 stdout 的日志会被自动转发到 stderr。

```json
{
  "schemaVersion": 1,
  "command": "upload",
  "dryRun": false,
  "ok": false,
  "durationMs": 12000,
  "results": [
    {
      "platform": "weixin",
      "ok": true,
      "durationMs": 8000,
      "result": {
        "version": "1.2.3",
        "sizes": { "total": 2048000, "main": 1024000 },
        "message": "微信小程序上传成功"
      }
    },
    {
      "platform": "alipay",
      "ok": false,
      "durationMs": 4000,
      "error": { "code": "UPLOAD_ERROR", "message": "支付宝小程序上传失败" }
    }
  ]
}
```

SDK 原始返回值不会进入 JSON，避免循环引用和超大对象。

## 包体积预算

```ts
export default defineConfig({
  budgets: {
    total: '3MB',
    main: '1.5MB',
    warnOnly: false,
  },
})
```

- 数据来源：微信 `subPackageInfo`（总包、主包）
- 支付宝、钉钉不返回包体积，会自动跳过
- 超限且 `warnOnly: false`：该平台判定失败，退出码 `1`
- `warnOnly: true`：只输出告警
- `upload` / `uploadMany` / `release` / `preview` 均会附带 `budget` 结果
- `release` 会读取历史记录，在 PR 评论里展示体积增减

示例输出：

```text
总包 4.00MB 超出预算 3MB；主包 2.00MB 超出预算 1.5MB
```
