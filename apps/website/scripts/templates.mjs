/* eslint-disable no-template-curly-in-string -- GitHub Actions examples intentionally contain literal expressions. */
import { escapeHtml as e } from './content.mjs'

const github = 'https://github.com/wot-ui/ci'
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>'
const external = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>'
const mark = base => `<img class="brand-mark" src="${base}favicon.svg" width="40" height="40" alt="" aria-hidden="true">`
const searchIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>'
const themeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>'
const menuIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'

function header({ base, version }, docs = false) {
  return `<a class="skip-link" href="#main">跳到正文</a><header class="site-header"><div class="header-inner">
    <a href="${base}" class="brand" aria-label="Wot CI 首页">${mark(base)}<span>Wot <b>CI</b></span></a><span class="version">v${e(version)}</span>
    <nav class="main-nav" aria-label="主导航"><a href="${base}docs/getting-started/" ${docs ? 'aria-current="true"' : ''}>文档</a><a href="${base}docs/support/">平台支持</a><a href="${base}docs/roadmap/">路线图</a></nav>
    <div class="header-actions"><button class="search-trigger" data-search-open aria-label="搜索文档">${searchIcon}<span>搜索文档</span><kbd>⌘ K</kbd></button><button class="icon-button" data-theme-toggle aria-label="切换深色主题">${themeIcon}</button><a class="github-link" href="${github}" aria-label="GitHub 源码">GitHub ${external}</a>${docs ? `<button class="icon-button docs-menu" data-menu-toggle aria-expanded="false" aria-controls="docs-sidebar" aria-label="打开文档目录">${menuIcon}</button>` : ''}</div>
  </div></header>`
}

function footer({ base, version }) {
  return `<footer class="site-footer"><div><a class="brand" href="${base}">${mark(base)}<span>Wot <b>CI</b></span></a><p>小程序交付，从这里接上流水线。</p></div><div class="footer-links"><a href="${github}">GitHub ${external}</a><a href="https://www.npmjs.com/package/@wot-ui/ci">npm ${external}</a><a href="https://github.com/wot-ui/open-wot">Wot CLI ${external}</a><span>v${e(version)} · MIT License</span></div></footer>`
}

function shell(context, { title, description, body, docs = false }) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="theme-color" content="#f7f8f4"><meta name="description" content="${e(description)}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:type" content="website"><title>${e(title)}</title><link rel="icon" type="image/svg+xml" href="${context.base}favicon.svg"><script src="${context.base}theme.js"></script><link rel="stylesheet" href="${context.base}styles.css"><script defer src="${context.base}site.js"></script></head>
  <body data-base="${context.base}" class="${docs ? 'docs-page' : 'home-page'}">${header(context, docs)}${body}${footer(context)}
  <dialog id="search-dialog" aria-labelledby="search-title"><div class="search-dialog-head"><span id="search-title" class="sr-only">搜索文档</span>${searchIcon}<input type="search" id="search-input" placeholder="搜索命令、配置或平台…" aria-label="搜索文档" autocomplete="off"><button class="search-close" data-search-close aria-label="关闭搜索">Esc</button></div><div id="search-status" class="search-status" role="status">输入关键词，查找文档。</div><ul id="search-results" aria-label="搜索结果"></ul><div class="search-footer">本地搜索 · 无需外部服务 <span>Tab 选择 · Enter 打开</span></div></dialog>
  <div class="toast" id="toast" role="status"></div></body></html>`
}

function code(text, label = '终端') {
  return `<div class="code-block"><div class="code-label"><span>${e(label)}</span><button type="button" data-copy-code aria-label="复制代码">复制</button></div><pre tabindex="0"><code>${e(text)}</code></pre></div>`
}

export function renderHome(context) {
  const { base } = context
  const body = `<main id="main">
  <section class="hero shell">
    <div class="hero-copy"><div class="eyebrow"><span class="status-dot"></span> THE MINI PROGRAM DELIVERY TOOLKIT</div>
      <h1>把小程序发布，<br>交给<span class="hero-emphasis">流水线。</span></h1>
      <p class="hero-description">从本地构建到多平台上传，让每一次发布<br class="desktop-break">都有配置可循、有结果可查。</p>
      <div class="hero-actions"><a class="button primary" href="${base}docs/getting-started/">开始接入 ${arrow}</a><a class="text-link" href="${base}docs/integration/">接入 GitHub Actions ${external}</a></div>
      <div class="install-box"><div class="install-top"><span>添加到你的项目</span><div role="tablist" aria-label="选择包管理器"><button id="pm-pnpm" role="tab" aria-selected="true" aria-controls="install-pnpm" data-tab="install-pnpm">pnpm</button><button id="pm-npm" role="tab" aria-selected="false" aria-controls="install-npm" tabindex="-1" data-tab="install-npm">npm</button><button id="pm-yarn" role="tab" aria-selected="false" aria-controls="install-yarn" tabindex="-1" data-tab="install-yarn">yarn</button></div></div>
      ${['pnpm', 'npm', 'yarn'].map(pm => `<div id="install-${pm}" role="tabpanel" aria-labelledby="pm-${pm}" ${pm !== 'pnpm' ? 'hidden' : ''}><div class="install-command"><span aria-hidden="true">$</span><code>${pm} ${pm === 'npm' ? 'install' : 'add'} -D @wot-ui/ci</code><button type="button" data-copy-inline aria-label="复制安装命令">复制</button></div></div>`).join('')}
      </div><p class="hero-meta"><span>Node.js ≥ 20</span><i></i><span>CLI / JS API</span><i></i><span>开源 · MIT</span></p>
    </div>
    <div class="pipeline-illustration" aria-label="发布工作流示意，并非实时执行状态">
      <div class="pipeline-caption"><span><i class="status-dot"></i> RELEASE WORKFLOW</span><span class="example-label">流程示意</span></div>
      <div class="pipeline-body"><div class="pipeline-file"><span class="file-symbol">{ }</span><div><strong>wotci.config.ts</strong><small>一份配置，连接你的发布流程</small></div><span class="file-tag">TS</span></div>
        <div class="pipeline-track"><div class="track-step"><span class="step-node">01</span><div><strong>检查配置</strong><code>wotci doctor</code></div><span class="step-note">发现问题</span></div><div class="track-step"><span class="step-node">02</span><div><strong>构建产物</strong><code>your build command</code></div><span class="step-note">复用现有构建</span></div><div class="track-step"><span class="step-node green-node">03</span><div><strong>上传与交付</strong><code>wotci upload --all</code></div><span class="step-note">按目标执行</span></div></div>
        <div class="destination-row"><span><i class="platform-dot weixin"></i>微信</span><span><i class="platform-dot alipay"></i>支付宝</span><span><i class="platform-dot dingtalk"></i>钉钉</span></div>
      </div><div class="pipeline-output"><span>OUTPUT</span><div>JSON 结果 <i>/</i> Step Summary <i>/</i> 发布历史<sup>*</sup></div></div><p class="pipeline-footnote">* 历史记录由 release 编排生成。上传不等于提审或上架。</p>
    </div>
  </section>
  <section class="entry-strip shell" aria-label="文档快捷入口"><span class="strip-label">接上你已有的工具链</span><a href="${base}docs/commands/">终端命令 <span>CLI</span>${arrow}</a><a href="${base}docs/integration/">自动化流水线 <span>ACTIONS</span>${arrow}</a><a href="${base}docs/api/">代码集成 <span>JS / TS</span>${arrow}</a></section>
  <section class="section shell workflow-section"><div class="section-intro"><div><span class="eyebrow">01 / BUILT FOR REPEATABILITY</span><h2>少一点手动操作，<br>多一点发布确定性。</h2></div><p>上传只是其中一步。<br>配置、验证与结果，都应成为流程的一部分。</p></div>
  <div class="feature-grid"><article><div class="feature-number">01 <span>CONFIGURE</span></div><h3>配置跟着项目走</h3><p>JS / TS 配置、环境变量与配置工厂。复用同一套入口，为不同平台提供各自的参数。</p><a href="${base}docs/configuration/">查看配置方式 ${arrow}</a></article><article><div class="feature-number">02 <span>VALIDATE</span></div><h3>先检查，再执行</h3><p>用 doctor 发现配置问题，用 dry-run 检查本地上传计划。真实平台验证单独记录。</p><a href="${base}docs/diagnostics/">了解诊断工具 ${arrow}</a></article><article><div class="feature-number">03 <span>TRACE</span></div><h3>让结果有据可查</h3><p>JSON 接入后续步骤，Markdown 写入构建摘要。版本来源、查询状态与回退原因随结果保留。</p><a href="${base}docs/upload/">读取执行结果 ${arrow}</a></article></div></section>
  <section class="platform-section"><div class="shell platform-layout"><div><span class="eyebrow">02 / PLATFORM CAPABILITIES</span><h2>统一入口，<br>尊重平台差异。</h2><p>用相同的命令组织发布，<br>用明确的边界选择能力。</p><a class="text-link" href="${base}docs/support/">完整支持与验证矩阵 ${arrow}</a></div><div class="platform-table"><div class="platform-table-head"><span>能力 / 平台</span><strong>微信</strong><strong>支付宝</strong><strong>钉钉</strong></div><div><span>代码上传</span><span class="available">支持</span><span class="available">支持</span><span class="available">支持</span></div><div><span>预览二维码</span><span class="available">支持</span><span class="available">支持</span><span class="unavailable">不支持</span></div><div><span>最新版本查询</span><span class="limited">仅插件</span><span class="available">支持</span><span class="unavailable">不支持</span></div><p>此处说明已实现能力；真实平台验收状态请查看支持矩阵。</p></div></div></section>
  <section class="section shell integration-section"><div class="section-intro"><div><span class="eyebrow">03 / FITS YOUR WORKFLOW</span><h2>接入现有流程。<br>不用重做你的流水线。</h2></div><a class="text-link" href="${base}docs/integration/">阅读集成指南 ${arrow}</a></div><div class="integration-layout"><div class="integration-copy"><div class="integration-tabs" role="tablist" aria-label="接入方式"><button id="label-terminal" role="tab" aria-selected="true" aria-controls="example-terminal" data-tab="example-terminal">终端命令 ${arrow}</button><button id="label-actions" role="tab" aria-selected="false" aria-controls="example-actions" tabindex="-1" data-tab="example-actions">GitHub Actions ${arrow}</button><button id="label-api" role="tab" aria-selected="false" aria-controls="example-api" tabindex="-1" data-tab="example-api">JavaScript API ${arrow}</button></div><p>凭据通过环境变量或 CI Secrets 注入。<br>构建完成后，由 Wot CI 接手上传。</p></div><div class="integration-examples">
  <div role="tabpanel" id="example-terminal" aria-labelledby="label-terminal">${code('# 生成配置并按项目填写凭据与产物路径\npnpm exec wotci init\n\n# 运行项目已有的构建命令\npnpm build\n\n# 体检后，先预演上传计划\npnpm exec wotci doctor\npnpm exec wotci upload -p weixin --dry-run\n\n# 确认计划，再执行上传\npnpm exec wotci upload -p weixin', 'TERMINAL')}</div>
  <div role="tabpanel" id="example-actions" aria-labelledby="label-actions" hidden>${code('# 新 inputs 需使用包含本次改动的 Action ref\n# 项目构建完成后，无需 wotci.config.ts\n- uses: wot-ui/ci@v0\n  with:\n    platform: weixin\n    project-path: dist/build/mp-weixin\n    private-key: ${{ secrets.WEIXIN_PRIVATE_KEY }}\n  env:\n    WEIXIN_APPID: ${{ secrets.WEIXIN_APPID }}\n# 上传版本默认读取 package.json', 'WORKFLOW.YML · 步骤片段')}</div>
  <div role="tabpanel" id="example-api" aria-labelledby="label-api" hidden>${code('import { uploadMany } from \'@wot-ui/ci\'\n\n// 读取项目配置，检查本地产物\nconst plan = await uploadMany({\n  platforms: [\'weixin\', \'alipay\'],\n  dryRun: true,\n})\n\nconsole.log(plan.ok)\nconsole.log(plan.versionResolution)', 'JAVASCRIPT · ESM')}</div></div></div></section>
  <section class="start-section shell"><div><span class="eyebrow">READY WHEN YOU ARE</span><h2>从第一次可重复的发布开始。</h2><p>准备配置，检查产物，然后把上传交给 Wot CI。</p></div><a class="button primary" href="${base}docs/getting-started/">打开快速开始 ${arrow}</a></section>
  </main>`
  return shell(context, { title: 'Wot CI — 把小程序发布，交给流水线', description: '面向微信、支付宝、钉钉的小程序 CI 工具。配置体检、多平台上传、预览二维码与版本管理，接入现有发布流程。', body })
}

export function renderDocs(context, page) {
  const { pages, base } = context
  const visiblePages = pages.filter(item => !item.hidden)
  const groups = [...new Set(visiblePages.map(item => item.group))]
  const navigation = groups.map(group => `<div class="sidebar-group"><h2>${group}</h2>${visiblePages.filter(item => item.group === group).map(item => `<a href="${item.url}" ${item.slug === page.slug ? 'aria-current="page"' : ''}>${e(item.title)}</a>`).join('')}</div>`).join('')
  const index = visiblePages.findIndex(item => item.slug === page.slug)
  const previous = visiblePages[index - 1]
  const next = visiblePages[index + 1]
  const body = `<div class="docs-layout"><button class="sidebar-scrim" data-menu-close aria-label="关闭文档目录" hidden></button><aside class="docs-sidebar" id="docs-sidebar" aria-label="文档目录"><a class="sidebar-home" href="${base}">← 返回首页</a>${navigation}<div class="sidebar-note"><span class="status-dot"></span> 文档随代码维护<br><small>版本 ${e(context.version)}</small></div></aside>
  <main class="docs-main" id="main"><div class="doc-breadcrumb">文档 <span>/</span> ${e(page.group)}</div><div class="doc-title"><p class="eyebrow">WOT CI DOCUMENTATION</p><h1>${e(page.title)}</h1><p>${e(page.description)}</p></div><div class="doc-mobile-toc"><details><summary>本页目录</summary>${page.toc.map(item => `<a href="#${e(item.id)}">${e(item.text)}</a>`).join('')}</details></div><article class="prose">${page.html}</article><div class="doc-edit"><a href="${github}/edit/main/${page.source}">在 GitHub 上编辑此页 ${external}</a><span>来源：${e(page.source)}</span></div><nav class="doc-pagination" aria-label="相邻文档">${previous ? `<a href="${previous.url}"><small>← 上一篇</small><strong>${e(previous.title)}</strong></a>` : '<span></span>'}${next ? `<a href="${next.url}"><small>下一篇 →</small><strong>${e(next.title)}</strong></a>` : ''}</nav></main>
  <aside class="doc-toc" aria-label="本页目录"><h2>本页内容</h2>${page.toc.map(item => `<a class="toc-level-${item.level}" href="#${e(item.id)}">${e(item.text)}</a>`).join('')}<a class="toc-top" href="#main">返回顶部 ↑</a></aside></div>`
  return shell(context, { title: `${page.title} · Wot CI 文档`, description: page.description, body, docs: true })
}

export function renderNotFound(context) {
  return shell(context, { title: '页面未找到 · Wot CI', description: '这个页面不存在，请返回首页或搜索文档。', body: `<main id="main" class="not-found shell"><span class="eyebrow">404 / NOT FOUND</span><h1>这条路径没有产物。</h1><p>页面可能已移动。可以搜索文档，或回到起点。</p><a class="button primary" href="${context.base}">返回首页 ${arrow}</a></main>` })
}
