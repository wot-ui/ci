# 诊断与工具

## 配置体检 doctor

```sh
wotci doctor
wotci doctor --network
wotci doctor --json
```

检查项：

- Node.js 版本（>= 20）
- 配置来源与多个配置文件冲突
- 各平台必填字段（appid、toolId、token 等）
- 产物目录、`project.config.json` / `app.json`
- 私钥存在性、权限、PEM 格式
- 微信 / 支付宝开发者工具路径
- release 构建命令与 GitHub PR 评论环境
- `--network` 时调用线上版本接口，校验 appid、私钥和 IP 白名单；微信普通小程序不支持该查询，会自动跳过

退出码：有 `error` 时为 `1`，只有 `warn` 时为 `0`。`--json` 输出结构化检查结果，适合 CI。

## 微信构建与诊断

以下能力仅支持微信小程序，底层对应 `miniprogram-ci` 的 `packNpm`、`getDevSourceMap`、`getCompiledResult`、`checkCodeQuality`。所有命令都支持 `--json`，`--summary <file>` 可写入 CI Step Summary。

### 构建 npm

```sh
wotci build-npm -p weixin
wotci build-npm -p weixin --ignores "packageA/**/*,packageB/**/*"
```

上传 / 预览前也可以自动构建：

```sh
wotci upload  -p weixin --build-npm
wotci preview -p weixin --build-npm
```

`build-npm` 使用配置里的 `weixin.ignores`，`--ignores` 会覆盖它；返回 `warnings` 数组，失败抛 `WeixinDiagnosticError`。

### SourceMap

```sh
wotci sourcemap -p weixin
wotci sourcemap -p weixin --output dist/sm.zip --robot 2 --streaming
```

默认输出 `.wotci/weixin/sourcemap.zip`，`robot` 缺省取 `weixin.robot`，再回退到 `1`。

### 编译产物

```sh
wotci inspect -p weixin
wotci inspect -p weixin --output dist/compiled.zip
```

导出最近一次上传的编译产物 zip，默认 `.wotci/weixin/compiled.zip`；`version` 取配置版本，缺省 `0.0.0`。

### 代码质量

```sh
wotci quality -p weixin
wotci quality -p weixin --output report.json
```

结果包含 `checks`（检查项总数）、`issues`（未通过项）和 `ok`；传 `--output` 时把完整检查结果写入 JSON。默认退出码为 `0`，加 `--fail-on-issues` 可在有未通过项时以退出码 `1` 结束，直接作为 CI 质量门禁。质量检查仍会按配置初始化 `Project`，需要私钥文件存在，但 SDK 不会读取私钥内容。

### JS 调用示例

```ts
import {
  buildNpm,
  checkCodeQuality,
  downloadCompiledResult,
  downloadSourceMap,
} from '@wot-ui/ci'

const npm = await buildNpm('weixin', {
  cwd: process.cwd(),
  ignores: ['packageA/**/*'],
})
console.log(npm.warnings)

await downloadSourceMap('weixin', {
  cwd: process.cwd(),
  output: 'dist/sm.zip',
  robot: 2,
  streaming: true,
})

await downloadCompiledResult('weixin', {
  cwd: process.cwd(),
  output: 'dist/compiled.zip',
})

const quality = await checkCodeQuality('weixin', {
  cwd: process.cwd(),
  output: 'report.json',
})
console.log(quality.ok, quality.issues)
```

非微信平台会抛 `CapabilityError`（`code: UNSUPPORTED_CAPABILITY`）。

## 打开开发者工具

除了 CI 上传 / 预览，`wotci` 也可以直接打开微信、支付宝开发者工具：

```sh
wotci open -p weixin
wotci open -p weixin --port 9420 --lang zh
wotci open -p alipay

wotci close -p weixin
wotci close -p weixin --quit

# 查询安装与登录状态
wotci ide status -p weixin

# 开启自动化端口，配合 miniprogram-automator
wotci auto -p weixin --port 9420 --trust-project

# 使用 IDE 自身 CLI 生成预览二维码
wotci ide preview -p weixin --qr-output dist/ide-preview.png
```

| 参数 | 说明 |
| --- | --- |
| `--dry-run` | 只打印将要执行的命令，不真正启动 IDE |
| `--force` | 在 `CI=true` 环境下显式允许打开 GUI |
| `--port <number>` | 微信开发者工具 HTTP server 端口 |
| `--lang <zh 或 en>` | 微信开发者工具语言 |
| `--quit` | `close` 时退出整个 IDE，而不是只关闭项目 |
| `--info-output <file>` | `ide preview` 时输出 IDE 的附加信息 |
| `--trust-project` | `auto` 时信任当前项目 |
| `--ticket <ticket>` | `auto` 时使用的 ticket |

平台差异：

- **微信**：通过开发者工具自带 CLI 执行 `open` / `close` / `quit` / `auto` / `preview` / `islogin`，会自动探测 macOS / Windows / Linux 的常见安装路径；也可以用 `weixin.ide.cliPath` 或环境变量 `WECHAT_DEVTOOLS_CLI` 指定
- **支付宝**：通过 `minidev.startIde` 打开，`alipay.ide.appPath` 可指定 IDE 安装路径；暂不支持命令行关闭、状态查询、自动化与 IDE 预览
- **钉钉**：`dingtalk-miniapp-opensdk` 未暴露 IDE 能力，会返回明确的不支持错误

`wotci ide status` 通过 `cli islogin` 判断登录状态；如果 IDE 未启动，该命令可能会启动 IDE。`wotci ide preview` 与 `wotci preview` 的区别是：前者走 IDE 自身 CLI、依赖本机登录态，后者走 `miniprogram-ci`、适合 CI。

为避免 CI 卡在 GUI 上，`CI=true` 时 `open` 默认拒绝执行；`--dry-run` 不受此限制。
