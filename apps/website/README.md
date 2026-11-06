# Wot CI 文档站

参考 open-wot 的首页与文档分层、仓库 Markdown 单一来源设计；使用独立的发布工作流视觉，不复用其终端主题。静态 HTML / CSS / JS，仅构建阶段需要 Node 与 marked，无运行时服务、字体 CDN 或外部搜索依赖。

## 本地开发

在仓库根目录执行：

```sh
pnpm install
pnpm site:dev
# http://127.0.0.1:4173
```

默认仅监听 loopback。可通过 `PORT=4174 pnpm site:dev` 修改端口。开发服务监听 README、package.json、docs 与 public，修改后自动重建，刷新浏览器即可；修改 scripts 后重启服务。

```sh
pnpm site:build
pnpm site:test
pnpm site:preview
```

## 内容维护

- 使用指南仍编辑根目录 `README.md`，构建按二级标题拆分；`scripts/content.mjs` 定义分组、路径与标题。删除或重命名约定标题时构建失败，需同步映射。
- 支持矩阵、验收、路线图与维护者发布指南读取 `docs/` 原文件。验证记录保留历史日期，不展示为实时状态。
- 首页文案、示意流程和示例在 `scripts/templates.mjs`；这些内容是产品介绍，能力变化时需要同步。流程图明确标为示意，不伪装成真实执行记录。
- 版本读取根 `package.json`；代码块保留原文，文档相对链接在构建时转换为站内路径或 GitHub 源码链接。
- `public/` 存放样式、浏览器交互、主题初始化与图标。搜索使用本地生成的 `search-index.json`；支持键盘、空结果、网络失败和重试。
- Markdown 只读取受信任的仓库文件，不接受用户提交的 HTML。

## 静态部署

构建产物为 `apps/website/dist/`，可交给支持目录 index.html 的静态托管服务，不需要 SPA fallback。未知路径使用 `404.html`。本仓库的 Website 工作流构建、校验并归档产物，不自动开通或发布站点。

根域名部署使用默认值；GitHub Pages 等子路径部署可配置：

```sh
SITE_BASE=/ci/ pnpm site:build
SITE_BASE=/ci/ pnpm site:preview
```

路径必须以 `/` 开始和结尾；允许字母、数字、短横线与下划线。部署时应以相同 base 运行 `site:test`，生成的导航、搜索和静态资源均跟随 base。该环境变量仅控制网站，不改变 CLI 包和 Action。
