# 版本与发布

## 版本策略

```ts
export default defineConfig({
  versionStrategy: { type: 'auto', bump: 'patch' },
  // 要求全部目标查询成功：{ type: 'auto', bump: 'patch', strict: true }
  // 或 { type: 'fixed', version: '1.2.3' }
  // 或 { type: 'package' }
})
```

- `fixed`：使用配置版本
- `package`：读取 `package.json` 的 version；缺失时使用配置版本，并输出回退警告
- `auto`：只查询本次实际上传的目标，取查询成功的最高版本递增；无有效查询结果时按 `package.json` → 配置版本回退，不会修改 `package.json`
- 微信取 `getLatestVersion`，但仅 `miniProgramPlugin` / `miniGamePlugin` 项目支持；普通小程序请用 `fixed` / `package` 策略，支付宝取 `getUploadedVersion`
- 钉钉没有版本查询能力；单独上传时回退到 `package.json` / 配置版本，多平台时可使用其它目标查询成功的版本
- 默认允许查询失败或部分查询成功，输出警告和 `tentative: true`。`strict: true` 要求所有目标均返回有效数字版本；失败、不支持、空值或无效版本都会在上传前终止，`release` 也会在构建前终止
- `--dry-run` 时 `auto` 不发起网络请求，使用 `package.json` / 配置版本递增，查询状态为 `skipped`、版本为暂定；严格模式也允许生成离线计划，实际执行时仍须查询通过

版本策略会应用到 `upload`、`uploadMany`、`release`（以及 Vite 上传），只影响本次上传的版本号。单平台 CLI 加上 `--json` / `--summary` 不会改变查询目标或版本选择。底层 `uploadPlatform` / 各平台上传函数直接使用传入版本，不执行版本策略。

高层 JS API 结果、上传/发布 JSON 的顶层以及发布历史记录包含可选字段 `versionResolution`；CLI、Vite 日志和 Step Summary 展示同一份依据。JSON 与历史 schema 版本仍为 1，旧字段保持不变；旧历史记录可以没有此字段。

| 字段 | 含义 |
| --- | --- |
| `source` / `version` | 保留原有策略名称与最终版本的语义；`source: 'auto'` 不表示查询一定成功 |
| `baseSource` / `baseVersion` | `auto` / `package` 的实际基础来源（`platform`、`package`、`config`；无版本时为 `none`）与递增前版本 |
| `queries` | `auto` 的目标平台、查询状态及成功取得的版本；状态为 `success`、`failed`、`unsupported`、`empty`、`invalid`、`skipped` |
| `tentative` / `warnings` | 是否有任一目标未取得有效线上版本（含离线 dry-run 与部分成功；未选择查询目标时也为暂定），以及查询/回退警告；不保存 SDK 原始异常或凭据 |

自动递增不提供跨进程锁，也不保证版本全局唯一。严格模式只能保证本次查询完整，不能消除并发发布竞争。

各平台版本号规则：

- 微信：必须提供 `version`（可以来自配置或 `package.json`）
- 支付宝、钉钉：`autoincrement` 默认 `false`
  - `autoincrement: false`：必须提供 `version`；支付宝还会校验版本号必须大于线上最新版本
  - `autoincrement: true`：上传时传空版本号，由平台生成，结果版本从接口返回值读取

## 版本查询

```sh
wotci version latest -p weixin
wotci version latest -p alipay
wotci version list -p alipay
wotci version latest -p weixin --json
```

微信的 `version latest` 仅支持插件类型项目；普通小程序会返回 `VersionUnsupportedError`，请以 `package.json` 或配置里的版本为准。支付宝支持 `latest` 和 `list`。

## 体验版与版本删除

仅支付宝支持：

```sh
wotci experience set    -p alipay --version 1.2.3
wotci experience cancel -p alipay --version 1.2.3
wotci version delete    -p alipay --version 1.2.3 --yes
```

- `set` 会把指定版本设为体验版，并返回体验版二维码
- `cancel` 取消体验版
- `delete` 删除线上版本，属于破坏性操作，必须显式 `--yes`
- 微信、钉钉返回 `VersionUnsupportedError`
- 所有操作都支持 `--json`

## 发布编排 release

`release` 把「构建 → 多平台上传 → 记录历史 → 评论 PR」串成一条命令：

```sh
# 构建并发布配置中的所有平台
wotci release

# 覆盖构建命令
wotci release --build "uni build -p mp-weixin"

# 只发布指定平台
wotci release -p weixin,alipay

# 跳过构建，直接上传已有产物
wotci release --skip-build

# 只看计划
wotci release --dry-run

# 关闭历史 / PR 评论
wotci release --no-history --no-pr-comment
```

配置：

```ts
export default defineConfig({
  version: '1.2.3',
  release: {
    buildCommand: 'uni build -p mp-weixin',
    platforms: ['weixin', 'alipay'],
    history: true,
    historyFile: '.wotci/history.json',
    historyLimit: 50,
    prComment: 'auto',
  },
})
```

`release` 的行为：

- 构建命令失败：不再上传，返回构建错误
- 单个平台上传失败：继续其它平台，最后以退出码 `1` 结束
- 历史写入失败、PR 评论失败：只告警，不影响发布结果
- `--dry-run`：不执行构建、不上传、不写历史、不评论

### 发布历史

默认写入 `.wotci/history.json`：

```json
{
  "version": 1,
  "records": [
    {
      "id": "uuid",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "version": "1.2.3",
      "ok": true,
      "git": { "branch": "main", "commit": "abc1234" },
      "build": { "commands": ["uni build -p mp-weixin"], "ok": true, "skipped": false },
      "platforms": [{ "platform": "weixin", "ok": true, "version": "1.2.3" }]
    }
  ]
}
```

- 自动限制条数（`historyLimit`）
- 原子写入，避免并发写坏文件
- `.wotci/` 已在 `.gitignore` 中

### PR 评论

在 GitHub Actions 中设置：

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
```

`release` 会自动读取：

- `GITHUB_TOKEN` / `GH_TOKEN`
- `GITHUB_REPOSITORY`
- PR 编号：`GITHUB_EVENT_PATH` 中的 `pull_request.number`，或 `GITHUB_REF=refs/pull/<n>/merge`
- 可选 `GITHUB_API_URL`（GitHub Enterprise）

`GITHUB_TOKEN` / `GH_TOKEN` 需由 workflow 显式注入步骤环境，发布编排请在普通 `run` 步骤执行 `pnpm exec wotci release`；独立 Action 的命令范围见 [接入指南](github-action.md)。没有 token 或 PR 上下文时，默认的自动评论会跳过。

评论内容包含平台结果、版本、包体积、耗时、构建命令、commit 和运行链接；同一 PR 使用 marker 更新已有评论，不会重复刷屏。
