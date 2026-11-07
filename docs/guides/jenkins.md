# Jenkins 小程序 CI/CD

Jenkins 负责拉取代码、安装依赖、构建、保管凭据与归档；Wot CI 通过 CLI 检查产物、上传代码或生成预览二维码。示例中的 CD 交付到小程序平台的代码版本或预览二维码，不包含提交审核、正式上架和线上回滚。

## 选择示例

| 场景 | Jenkinsfile | 配置 |
| --- | --- | --- |
| 给现有 pnpm / uni-app 项目接入微信上传与预览 | [微信项目模板](../../examples/jenkins/weixin/Jenkinsfile) | [wotci.config.mjs](../../examples/jenkins/weixin/wotci.config.mjs) |
| 用本仓库验证微信、支付宝、钉钉链路 | [Playground 三平台示例](../../examples/jenkins/playground/Jenkinsfile) | 复用 [playground/wotci.config.ts](../../playground/wotci.config.ts) |

微信项目模板默认 `DRY_RUN=false`，检查通过后实际上传或生成预览，适合日常持续交付。Playground 默认 `DRY_RUN=true`，适合演示和接入验证。两份流水线均先执行本地检查，顺序如下：

```text
清理工作区 → checkout → 锁文件安装 → 小程序构建
  → 绑定所选平台凭据 → doctor → dry-run 计划
  → 若 DRY_RUN=false：上传或预览
  → 无论成功失败都尝试归档 → 清理工作区
```

构建、doctor 或计划失败会停止后续上传；CLI 退出码直接决定 stage 是否失败。真实上传不自动重试，避免网络超时后重复创建版本。

## Jenkins 与 Agent 准备

1. 准备支持 Declarative Pipeline 的 Jenkins，安装 Pipeline、Git、Credentials Binding 插件。示例使用标准 `sh`、`checkout scm`、`archiveArtifacts` 和 `deleteDir` 步骤，不依赖 Docker 或 NodeJS 插件。
2. 准备标签为 `miniapp` 的 Linux Agent，预装 Git、Node.js 22 和 pnpm；也可把 `agent { label 'miniapp' }` 改为自己的节点标签。Node 组合的验证范围见[支持矩阵](../support-matrix.md)。
3. 按应用 `package.json.packageManager` 固定 pnpm 版本并提交 `pnpm-lock.yaml`。本仓库使用 `pnpm@10.25.0`；在 Agent 镜像或节点初始化时安装好，流水线不执行全局升级。
4. Agent 要能访问依赖源和目标小程序平台。微信真实上传前，在公众平台配置代码上传密钥和 Agent 的出口 IP 白名单；优先使用固定出口 IP 的节点。
5. 为该 Job 配置下表凭据。私钥上传为 **Secret file**，内容使用平台要求的完整 PEM 文件，直接读取 Jenkins 提供的文件路径。

| 平台 | Jenkins Credential ID | 类型 | 注入变量 |
| --- | --- | --- | --- |
| 微信 | `miniapp-weixin-appid` | Secret text | `WEIXIN_APPID` |
| 微信 | `miniapp-weixin-private-key` | Secret file | `WEIXIN_PRIVATE_KEY_PATH` |
| 支付宝 | `miniapp-alipay-appid` | Secret text | `ALIPAY_APPID` |
| 支付宝 | `miniapp-alipay-tool-id` | Secret text | `ALIPAY_TOOL_ID` |
| 支付宝 | `miniapp-alipay-private-key` | Secret file | `ALIPAY_PRIVATE_KEY_PATH` |
| 钉钉 | `miniapp-dingtalk-appid` | Secret text | `DINGTALK_APPID` |
| 钉钉 | `miniapp-dingtalk-token` | Secret text | `DINGTALK_TOKEN` |

只需准备所选平台的凭据。示例的 dry-run 也使用这些凭据检查文件与字段，但不会调用平台 SDK；本地检查成功不能证明密钥有效、IP 白名单可用或扫码正常。

凭据仅在交付 stage 注入。Shell 使用 Groovy 三单引号，避免 Groovy 插值凭据，并关闭命令回显。Playground 在 `withCredentials` 内才进入 `dir('playground')`，让临时密钥留在子工作区之外，由 Jenkins 管理释放。具体规则见 [Jenkins Credentials Binding 文档](https://www.jenkins.io/doc/pipeline/steps/credentials-binding/)。

仅对受信任仓库与分支运行带凭据的 Job；能修改 Jenkinsfile、配置文件或依赖代码的人可以访问该 Job 的凭据。外部 PR 的构建应使用独立、无发布凭据的 Job 和 Agent。

## 示例一：现有微信项目

在自己的应用目录中安装 CLI，提交更新后的依赖与锁文件：

```sh
pnpm add -D --save-exact @wot-ui/ci@0.5.3
```

把[微信 Jenkinsfile](../../examples/jenkins/weixin/Jenkinsfile) 和[配置模板](../../examples/jenkins/weixin/wotci.config.mjs)复制到应用根目录。若已有 wotci 配置，合并环境变量和微信编译设置，并同步修改 Jenkinsfile 中的 `--config` 路径。

- 构建命令默认 `pnpm build:mp-weixin`，产物目录默认 `dist/build/mp-weixin`，按项目实际情况一起修改。
- 配置默认开启 `minifyJS`、`minifyWXML`、`minifyWXSS`；预览复用上传设置。如另设 `preview.setting`，也需在其中开启这三个字段，因为它会整体替换上传设置。
- 微信版本优先读构建参数 `WOTCI_VERSION`，留空读应用 `package.json.version`；描述默认包含 Jenkins 构建号和 Git 提交号。不使用普通微信小程序不支持的线上版本自动查询。
- 原生小程序可替换构建命令和 `projectPath`；需要构建 npm 时按[诊断指南](diagnostics.md#微信构建与诊断)增加对应步骤。

在 Jenkins 新建 **Pipeline → Pipeline script from SCM → Git**，选择应用仓库和受信任分支，Script Path 填 `Jenkinsfile`。在 **Build with Parameters** 中选择：

| 参数 | 默认值 | 用途 |
| --- | --- | --- |
| `COMMAND` | `upload` | `upload` 上传代码；`preview` 生成预览 |
| `DRY_RUN` | `false` | 默认调用真实 SDK；勾选后仅做本地检查 |
| `WOTCI_VERSION` | 空 | 本次上传版本号 |
| `WOTCI_DESC` | 空 | 本次上传 / 预览描述 |

首次接入建议主动勾选 `DRY_RUN`。若新建 Job 尚未显示参数页面，先将 Jenkinsfile 中该参数的 `defaultValue` 临时改为 `true` 再触发首次构建；首次构建也会执行流水线，并非只加载参数。在构建页面的 Artifacts 中查看 `doctor.json`、`plan.json`、`plan.md`，确认平台、产物和版本；验证完成后恢复 `defaultValue: false`，后续运行取消勾选即可实际上传或预览。真实 preview 成功后可下载 `preview.png` 扫码。

## 示例二：本仓库三平台 Playground

Fork 或使用受信任的本仓库分支，在 Jenkins 创建 **Pipeline script from SCM**，Script Path 填：

```text
examples/jenkins/playground/Jenkinsfile
```

此示例在仓库根目录安装依赖和执行 `pnpm build`，随后构建 Playground。在 `playground` 目录中直接调用 `node ../dist/bin.mjs`，使用当前提交构建出的 CLI，避免误用 npm 中的其他版本。

额外提供 `PLATFORM=weixin/alipay/dingtalk` 参数，默认保留 `DRY_RUN=true`；每次构建只绑定所选平台凭据。确认计划后取消勾选 `DRY_RUN`，才会实际上传或预览。三个平台分别运行，便于定位结果：

| 平台 | 构建命令 | 可选动作 | 版本行为 |
| --- | --- | --- | --- |
| 微信 | `pnpm --dir playground build:mp-weixin` | upload / preview | 参数优先，否则用 Playground 的 package 版本 |
| 支付宝 | `pnpm --dir playground build:mp-alipay` | upload / preview | 复用 Playground 的 `autoincrement: true` |
| 钉钉 | `pnpm --dir playground build:mp-alipay` | upload | 复用 Playground 的 `autoincrement: true` |

钉钉复用该 uni-app 示例的支付宝产物。选择钉钉 preview 会在安装依赖前失败。支付宝、钉钉自动递增时，`WOTCI_VERSION` 不决定最终版本；若需固定版本，在节点环境或配置中将对应 `ALIPAY_AUTOINCREMENT` / `DINGTALK_AUTOINCREMENT` 设为 `false`，再提供合规版本，规则见[版本与发布](release.md)。

Monorepo 接入可参考此结构：在工作区根绑定凭据后进入应用目录，令配置与 CLI 的 cwd 对齐，并在归档路径中加上应用前缀。不要把密钥复制进应用或产物目录。

## 归档、失败与持续交付

示例只归档 `artifacts/*.json`、`*.md`、`*.png`（Playground 加 `playground/` 前缀），不会打包整个工作区。`--json` 的 stdout 重定向到结果文件，日志保留在 Jenkins Console；`--summary` 写独立 Markdown。dry-run 只有计划，不生成可扫码二维码。

`post { always { ... } }` 会在失败时也尝试归档；失败得较早时文件可能不存在或 JSON 不完整，`allowEmptyArchive: true` 允许无文件。应结合失败 stage、退出码和 Console 排查，不能把“有归档”当成成功。每次构建前清空工作区，结束后再次清理，避免旧二维码混入新结果。保留最近 20 次日志、10 次归档，可按团队需要调整。归档步骤说明见 [Jenkins archiveArtifacts](https://www.jenkins.io/doc/pipeline/steps/core/#archiveartifacts-archive-the-artifacts)。

模板默认通过手动构建参数控制交付。接入 Webhook 时，建议让普通提交进入构建 / dry-run Job，另设受信任分支的上传 Job；按团队权限配置上传资格，二维码归档用于测试验收，正式审核上架在平台侧完成。

`disableConcurrentBuilds()` 只让同一个 Job 排队，不会串行化其他 Job 或 Multibranch 的其他分支；多个 Job 使用同一个 appid 时，应统一到一个上传 Job，或使用 Jenkins Lockable Resources 按 appid 加锁。超时和失败都不代表远端没有收到上传，重跑前先检查平台后台。Pipeline 选项说明见 [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)。

## 验证范围

这些文件是接入模板。仓库内的 CLI 离线检查不能替代 Jenkins Declarative Pipeline 校验及真实平台验收。部署前在自己的 Jenkins 上用 [Declarative Linter](https://www.jenkins.io/doc/book/pipeline/development/#linter) 校验所选 Jenkinsfile，再执行 dry-run；真实上传后核对后台版本，预览后手机扫码，按[平台验收指南](../platform-validation.md)记录结果。
