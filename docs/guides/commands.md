# CLI 命令与参数

命令格式为 `wotci [command] [options]`，省略 command 时执行 `upload`。下面列出当前 CLI 的全部命令及参数；配置对象字段见[配置参考](configuration.md)，GitHub Action 的连字符 inputs 见[Action 参数参考](action-reference.md)，两者不能直接当作 CLI 参数使用。

## 命令一览

| 命令 | 作用 | 支持平台 / 边界 |
| --- | --- | --- |
| `upload`（默认） | 上传构建产物 | 微信、支付宝、钉钉 |
| `preview` | 通过 SDK 生成预览 | 微信、支付宝 |
| `release` | 构建 → 上传 → 历史 / PR 评论 | 三平台；不包含审核上架 |
| `init` | 生成配置模板 | 可选一个或多个平台 |
| `doctor` | 检查配置和环境 | 检查配置中的平台；`-p` 不会过滤检查项 |
| `version latest` | 查询最新版本 | 支付宝；微信仅插件类型 |
| `version list` | 查询上传版本列表 | 仅支付宝 |
| `version delete` | 删除指定版本 | 仅支付宝；需 `--version`、`--yes` |
| `experience set` | 设置体验版 | 仅支付宝；需 `--version` |
| `experience cancel` | 取消体验版 | 仅支付宝；需 `--version` |
| `build-npm` | 微信构建 npm | 仅微信 |
| `sourcemap` | 下载 SourceMap | 仅微信 |
| `inspect` | 导出编译产物 | 仅微信 |
| `quality` | 代码质量检查 | 仅微信 |
| `open` | 打开开发者工具 | 微信、支付宝 |
| `close` | 关闭项目或退出 IDE | 仅微信 |
| `auto` | 启动 IDE 自动化 | 仅微信 |
| `ide status` | 查询 IDE 安装与登录状态 | 仅微信 |
| `ide preview` | 通过 IDE CLI 生成预览 | 仅微信；依赖本机 IDE 登录态 |

```sh
wotci upload -p weixin
wotci upload --all --dry-run
wotci preview -p weixin --qr-output artifacts/preview.png
wotci release -p weixin,alipay --skip-build
wotci doctor --json
wotci init --platform weixin
```

## 全部 CLI 参数

参数需要值时使用空格分隔，例如 `--platform weixin`；不支持 `--platform=weixin`。布尔开关直接写参数名，例如 `--dry-run`，不要写 `--dry-run false`。表中“适用命令”是实际消费该参数的命令，解析器能识别一个开关不代表所有命令都会使用它。

### 配置与平台

| 参数 | 类型 / 取值 | 默认值 | 适用命令与说明 |
| --- | --- | --- | --- |
| `-h, --help` | 开关 | 关闭 | 输出帮助，不执行动作 |
| `-c, --config <file>` | 字符串路径 | 自动发现配置文件 | 除 init 外用于加载配置；init 中表示待生成的文件，默认 `wotci.config.ts` |
| `--cwd <dir>` | 字符串路径 | `process.cwd()` | 配置、产物、私钥及输出文件的相对路径基准 |
| `-p, --platform <name>` | `weixin` / `alipay` / `dingtalk` / `dd` | 见下文 | dd 是钉钉别名；upload、preview、release、init 接受逗号列表；其他平台动作只接受单个平台 |
| `--all` | 开关 | 关闭 | upload / preview：选择全部已配置平台；release：忽略 `-p`，仍优先遵循 `release.platforms` |

普通单平台 upload / preview、版本、体验版、诊断和 IDE 命令需要 `-p`。upload / preview 使用 `--all`、`--json`、`--summary`、`--dry-run`、`--concurrency` 或逗号平台列表时进入批量执行分支；该分支不传 `-p` 就执行全部已配置平台。为明确目标，CI 中建议始终指定 `-p` 或 `--all`。

release 不传 `-p` 时用 `release.platforms`，再回退到全部已配置平台。init 不传 `-p` 时探测产物目录，探测不到则生成三平台模板。doctor 始终检查配置中的平台。

### 执行与输出

| 参数 | 类型 / 取值 | 默认值 | 适用命令与说明 |
| --- | --- | --- | --- |
| `--dry-run` | 开关 | 关闭 | upload / preview 本地校验；release 仅生成编排计划；init 只返回配置内容；open / close / auto / ide preview 不执行 IDE 命令 |
| `--json` | 开关 | 关闭 | upload、preview、release、init、doctor、版本 / 体验版、四个微信构建诊断命令输出 JSON；IDE 命令当前没有结构化 JSON 输出 |
| `--summary <file>` | 字符串路径 | 不生成 | upload、preview、release、build-npm、sourcemap、inspect、quality 写 Markdown 摘要；其他命令不消费此参数 |
| `--concurrency <n>` | 整数 ≥ 1 | `1` | upload / preview 的平台并发数；release 始终串行 |
| `--build-npm` | 开关 | 关闭 | upload / preview 在微信动作前执行 packNpm；对非微信目标返回不支持错误；release 当前不消费此参数 |

`--dry-run` 不是所有命令的通用保护开关：版本删除、体验版变更、SourceMap 等没有 dry-run 实现，不应给这些命令加该开关来模拟执行。upload / preview 的计划检查配置对象、目录、私钥与所需版本，不验证平台授权，也不完整校验全部预览选项；release 的计划更不会构建并校验实际产物。可先用 doctor 检查必填字段。

upload / preview / release 的 dry-run 不执行上传动作，但显式传 `--summary` 仍会写摘要，Shell 的 `>` 也会创建文件。`--json` 的日志走 stderr；解析或加载失败时 stdout 可能为空，不保证每一种错误都有完整 JSON。

### 预览参数

| 参数 | 类型 / 取值 | 默认值 / 来源 | 适用命令与说明 |
| --- | --- | --- | --- |
| `--qr-format <type>` | `terminal` / `image` / `base64` | SDK preview 读微信配置，否则 image；IDE 默认 image | 微信 preview / ide preview；支付宝忽略该格式选项 |
| `--qr-output <file>` | 字符串路径 | 微信图片 `.wotci/preview/weixin.png`、base64 `.wotci/preview/weixin.txt`；IDE 文件名为 `weixin-ide.*` | preview / ide preview；支付宝指定后下载远程二维码；微信 terminal 不落盘 |
| `--page <path>` | 字符串 | 平台 preview 配置 | preview，映射微信 `pagePath` / 支付宝 `page` |
| `--page-query <str>` | 字符串 | `alipay.preview.pageQuery` | 支付宝普通单平台 preview；批量分支当前不传递此覆盖值 |
| `--query <str>` | 字符串 | 平台 preview 配置 | preview，映射微信 `searchQuery` / 支付宝 `query` |
| `--scene <value>` | 字符串 | 平台 preview 配置 | preview；微信执行时转成非负整数，支付宝作为字符串 |
| `--desc <text>` | 字符串 | `weixin.preview.desc` → 顶层 `desc` | 微信普通单平台 preview；不用于 upload / release，批量分支当前不传递此覆盖值 |
| `--robot <n>` | 整数 1～30 | 微信 preview 配置 → weixin.robot；sourcemap 再回退 1 | 微信普通单平台 preview、sourcemap、inspect；不覆盖 upload 的 robot，批量 preview 当前不传递此覆盖值 |

当前只要 preview 加上 `--json`、`--summary`、`--dry-run`、`--concurrency`、`--all` 或逗号列表，就进入批量分支，即使仅选一个平台也是如此。在该分支下，请把 `pageQuery`、`desc`、`robot` 写进平台 preview 配置，或使用 JS `previewMany()` 的同名 request 字段；不要依赖上述三个 CLI 覆盖参数。配置方式在单平台和批量模式中均有效。

```ts
// wotci.config.ts 中的配置片段
weixin: {
  // appid、privateKeyPath、projectPath 等必填项略
  preview: { desc: '本次测试', robot: 2 },
},
alipay: {
  // appid、toolId、privateKeyPath、projectPath 等必填项略
  preview: { pageQuery: 'from=ci' },
},
```

同时预览多个平台时，避免给它们传同一个 `--qr-output`，以免互相覆盖；可分次执行、分别归档。

### 发布与版本参数

| 参数 | 类型 / 取值 | 默认值 / 来源 | 适用命令与说明 |
| --- | --- | --- | --- |
| `--build <command>` | Shell 命令字符串 | `release.buildCommand` | release；带空格的命令整体加引号 |
| `--skip-build` | 开关 | 关闭 | release；跳过构建，上传已有产物 |
| `--history-file <file>` | 字符串路径 | `release.historyFile` → `.wotci/history.json` | release 历史文件 |
| `--no-history` | 开关 | 配置默认开启历史 | release；关闭历史写入 |
| `--pr-comment` | 开关 | 配置默认 auto | release；显式尝试评论，无 PR 上下文记录评论错误 |
| `--no-pr-comment` | 开关 | 配置默认 auto | release；关闭 PR 评论 |
| `--version <value>` | 版本字符串 | 无，相关命令必填 | 仅 version delete、experience set / cancel；不是 CLI 自身版本，也不覆盖 upload / release 的版本 |
| `--yes` | 开关 | 关闭 | version delete，显式确认删除 |

上传版本与描述请在配置文件设置 `version` / `desc`，或由配置工厂显式读取 `WOTCI_VERSION` / `WOTCI_DESC`。CLI 没有 `--upload-version`、`--appid`、`--private-key`、`--setting` 参数，这些名称不要与 Action inputs 混用。

### 初始化与微信诊断参数

| 参数 | 类型 / 取值 | 默认值 | 适用命令与说明 |
| --- | --- | --- | --- |
| `--force` | 开关 | 关闭 | init 覆盖已有配置；open / auto / ide preview 允许在 CI 环境启动 GUI |
| `--network` | 开关 | 关闭 | doctor 执行线上版本查询诊断；普通微信小程序不支持该查询，会跳过 |
| `--output <file>` | 字符串路径 | sourcemap：`.wotci/weixin/sourcemap.zip`；inspect：`.wotci/weixin/compiled.zip`；quality 默认不写文件 | 对应三个微信诊断命令的输出路径 |
| `--streaming` | 开关 | 关闭 | sourcemap 流式下载 |
| `--ignores <list>` | 逗号分隔的规则 | `weixin.ignores` | build-npm；如 `'packageA/**/*,packageB/**/*'` |
| `--fail-on-issues` | 开关 | 关闭 | quality 检查出问题时返回退出码 1；不传时仍返回检查结果但不因质量项失败而退出 1 |

### IDE 参数

| 参数 | 类型 / 取值 | 默认值 | 适用命令与说明 |
| --- | --- | --- | --- |
| `--port <n>` | 整数 1～65535 | IDE 决定 | 微信 open / auto / ide status / ide preview；CLI close 当前不转发此参数 |
| `--lang <lang>` | `zh` / `en` | IDE 决定 | 微信 open / auto / ide status / ide preview；CLI close 当前不转发此参数 |
| `--quit` | 开关 | 关闭 | close；退出整个微信 IDE |
| `--info-output <file>` | 字符串路径 | 不设置 | ide preview 的附加信息文件 |
| `--trust-project` | 开关 | 关闭 | auto 信任当前项目 |
| `--ticket <ticket>` | 字符串 | 未设置 | auto 使用的 ticket |

IDE dry-run 仍需存在的产物目录与可定位的 CLI；ide preview 可能创建输出父目录，但不生成二维码。IDE 安装、登录态与 CI GUI 限制见[诊断与开发工具](diagnostics.md#打开开发者工具)。
