# 开发

```sh
pnpm install
pnpm typecheck
pnpm test:run
pnpm test:coverage
pnpm build
pnpm verify:capabilities
```

`pnpm verify:capabilities` 会构建、打包，并在临时项目里安装后逐项验证 CLI / JS API 能力，见 [能力自检](#能力自检)。

测试覆盖率由 vitest 统计，并对 statements / branches / functions / lines 设置 95% 阈值；CI 在 Linux Node 24 执行覆盖率门禁并存档报告，其余组合运行常规测试。`src/bin.ts` 是进程入口，依赖 `process.exit`，不纳入覆盖率统计。运行时验证覆盖 Linux Node 20/22/24/26 与 Windows/macOS Node 20/24，实际通过证据见 [支持矩阵](../support-matrix.md)。

开发约定、提交信息规范与 PR 流程见 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

文档网站位于 `apps/website`，使用 Next.js App Router 从 `docs/` 的独立 Markdown 文件预渲染页面。使用 `pnpm site:dev` 本地开发，`pnpm site:build` 输出 `.next`；EdgeOne 选择 Next 预设、根目录 `apps/website`、构建命令 `pnpm build:next`。维护和部署说明见 [网站 README](../../apps/website/README.md)。

## 能力自检

仓库里的 [verify-capabilities.yml](../../.github/workflows/verify-capabilities.yml) 会在 PR 上逐项验证 CLI 能力：帮助与参数校验、配置加载（TS 工厂 / `-c` / `.minicirc`）、`init`、`doctor`、`upload`（单平台、逗号列表、`--all`、并发、summary、`--dry-run` 校验失败）、`preview`（含钉钉不支持）、`release`、版本与体验版参数校验、IDE 联动的参数透传、微信构建与诊断（`build-npm` / `quality` / 平台守卫），以及 JS API、Vite 插件与发包产物。整套验证离线执行，不需要真实 appid 与私钥；真实上传仍由 [upload-playground.yml](../../.github/workflows/upload-playground.yml) 覆盖。

本地跑同一套验证（会构建、打包，并在临时项目里 `npm install` 后逐项执行）：

```sh
pnpm verify:capabilities
```

## 同步 Action 文档

Action 用法与参数统一在 [ci-action README](https://github.com/wot-ui/ci-action#readme) 维护。更新后执行 `pnpm docs:action:sync`，会生成本站的 GitHub Action 和 Action 参数参考两页，并修正跨页锚点；提交生成文件即可。不要直接修改这两页。

`pnpm docs:action:check` 对照独立仓库最新 README 检查一致性，Website CI 会运行该检查；生成页面参与站内目录、搜索和链接验证。网站运行和本地构建仍读取仓库内的 Markdown，无需在线获取 README。离线验证可使用 `pnpm docs:action:check --source /path/to/ci-action/README.md`。
