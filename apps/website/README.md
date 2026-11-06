# Wot CI 文档站

使用 Next.js App Router + React，构建时预渲染首页、22 个文档页面和搜索索引。视觉保持 CI 的发布工作流风格；`docs/` 中的独立 Markdown 文件是文档内容来源，不重复维护正文。

## 本地开发

在仓库根目录执行：

```sh
pnpm install
pnpm site:dev
# http://127.0.0.1:4173
```

Next 开发服务器提供热更新；React 组件、样式和导入的 Markdown 修改后会刷新。主题、搜索、复制、页内目录与移动端菜单由 React 客户端组件负责，正文由服务端组件预渲染。

```sh
pnpm site:test       # Markdown、链接和锚点校验
pnpm site:build      # Next 生产构建（.next）
pnpm site:typecheck
pnpm site:test:build # 启动临时 Next 生产服务，检查所有页面、资源、搜索、跳转与 404
pnpm site:preview    # next start，默认端口 4173
```

网站需要 Node.js >=20.9，已使用 Node.js 22.17.1 验证；CLI 自身的 Node 支持范围不变。pnpm 使用仓库声明的 10.25.0。

## EdgeOne Makers 部署

与 OpenWot 使用相同的 Next 构建入口：

| 字段 | 值 |
| --- | --- |
| 框架预设 | Next |
| 根目录 | apps/website |
| 输出目录 | .next |
| 编译命令 | pnpm build:next |
| 安装命令 | pnpm install --frozen-lockfile |
| Node.js | 22.17.1 |

生产分支必须包含本次网站改动；合并后可以使用 main。普通独立域名不需要环境变量。此构建是标准 Next 产物，应交给 Next 托管适配器处理，不能直接当作普通静态目录上传。

`build:next` 使用 webpack，与 OpenWot 保持一致，并在完成后清理 `.next/cache`。网站工作流构建、检查并归档产物，不自动开通或发布站点。

需要子路径部署时，在构建和运行阶段均设置 `SITE_BASE=/ci/`（本地预览使用 `SITE_BASE=/ci/ pnpm site:preview`）；Next basePath、文档链接、搜索结果和公共资源路径会同步变化。修改 base 后需重新构建。保持 trailingSlash，文档地址为 `/docs/<slug>/`；`/docs/` 自动跳转快速开始，未知地址返回 404，不设置 SPA fallback。

## 内容与结构

- `app/`：Next 路由、metadata、全局样式、文档静态参数、搜索索引 Route Handler 和 404。
- `components/`：首页、共享导航、搜索、主题、标签页、复制反馈与文档目录。内站导航使用 Next Link。
- `lib/documents.ts`：通过 webpack 导入仓库 Markdown 和版本元数据，运行时不需要读取仓库文件。新增独立文档时在这里增加静态导入。
- `lib/content.mjs`：页面分组与 Markdown 渲染；每个页面对应独立文件，缺少或清空正文时校验失败；新增页面需同步映射。仅解析受信任的仓库文件。
- `public/`：Logo 和首屏主题脚本。搜索索引由 Next 构建生成，不依赖外部搜索服务。
- `design/`：Logo 设计参考，不进入网站公共资源。

使用指南编辑 `docs/guides/` 中的对应文件，根目录 `README.md` 保留 CI 工具介绍、快速开始与各接入方式的入口，支持矩阵、验收、路线图与维护者指南编辑 `docs/` 原文件。验证记录保留历史日期，不展示为实时状态。首页产品文案和流程示意维护在 `components/home.tsx`，代码示例维护在 `components/integration.tsx`。
