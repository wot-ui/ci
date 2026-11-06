import path from 'node:path'
import { Marked } from 'marked'

export const pages = [
  { slug: 'overview', title: '认识 Wot CI', group: '开始使用', description: '从构建产物到多平台上传，让发布过程可重复、结果可追溯。', file: 'docs/guides/overview.md' },
  { slug: 'getting-started', title: '快速开始', group: '开始使用', description: '安装、准备配置、构建产物，完成第一次微信小程序上传。', file: 'docs/guides/getting-started.md' },
  { slug: 'configuration', title: '配置项目', group: '开始使用', description: '配置加载顺序、环境变量与微信、支付宝、钉钉的平台选项。', file: 'docs/guides/configuration.md' },
  { slug: 'commands', title: '命令速查', group: '发布工作流', description: '查找上传、预览、发布和诊断命令，以及通用参数。', file: 'docs/guides/commands.md' },
  { slug: 'upload', title: '上传与结果', group: '发布工作流', description: '单平台与批量上传、dry-run、JSON 结果、Step Summary 和包体积预算。', file: 'docs/guides/upload.md' },
  { slug: 'preview', title: '预览二维码', group: '发布工作流', description: '生成微信与支付宝预览，选择文件、终端或二维码输出。', file: 'docs/guides/preview.md' },
  { slug: 'release', title: '版本与发布', group: '发布工作流', description: '版本解析、严格模式、构建编排、发布历史与 PR 评论。', file: 'docs/guides/release.md' },
  { slug: 'diagnostics', title: '诊断与开发工具', group: '发布工作流', description: '用 doctor 检查配置，使用微信构建与诊断能力，连接本机开发者工具。', file: 'docs/guides/diagnostics.md' },
  { slug: 'integration', title: 'GitHub Action', group: '接入你的工具链', description: '复制 AI 接入提示词和完整工作流，查看 Demo、上传、预览和结果归档。', file: 'docs/guides/github-action.md' },
  { slug: 'action-reference', title: 'Action 参数参考', group: '接入你的工具链', file: 'docs/guides/action-reference.md', description: '查阅全部 inputs、setting / preview 子字段、默认值与平台差异。' },
  { slug: 'vite', title: 'Vite 与 uni-app', group: '接入你的工具链', file: 'docs/guides/vite.md', description: '在 Vite 构建完成后自动生成预览或上传小程序。' },
  { slug: 'api', title: 'JavaScript API', group: '接入你的工具链', description: '通过 ESM API 在 JS / TS 中调用上传、预览、发布和版本管理。', file: 'docs/guides/api.md' },
  { slug: 'migration', title: '从 uni-mini-ci 迁移', group: '接入你的工具链', description: '保留既有配置，逐步迁移到 @wot-ui/ci。', file: 'docs/guides/migration.md' },
  { slug: 'errors', title: '错误模型', group: '参考与边界', description: '辨别配置、平台能力、SDK 执行与 IDE 相关错误。', file: 'docs/guides/errors.md' },
  { slug: 'support', title: '平台支持矩阵', group: '参考与边界', file: 'docs/support-matrix.md', description: '分别查看已实现能力、离线验证与真实平台验证状态。' },
  { slug: 'validation', title: '真实平台验收', group: '参考与边界', file: 'docs/platform-validation.md', description: '真实上传、预览、后台确认和手机扫码的执行与记录方法。' },
  { slug: 'roadmap', title: '后续路线', group: '参考与边界', file: 'docs/roadmap.md', description: '支持基线、执行可靠性与 CI 结果交付的阶段任务。' },
  { slug: 'playground', title: 'Playground', group: '参与开发', description: '使用仓库示例验证构建、上传与配置。', file: 'docs/guides/playground.md' },
  { slug: 'development', title: '开发与贡献', group: '参与开发', description: '本地开发、测试、构建与贡献约定。', file: 'docs/guides/development.md' },
  { slug: 'publishing', title: '维护者发布指南', group: '参与开发', file: 'docs/releasing.md', description: 'CLI 的 npm、GitHub Release 流程与独立 Action 发布入口。' },
  { slug: 'runtime-baseline', title: '运行时验证记录', group: '验证记录', file: 'docs/verification/2026-11-04-runtime-matrix.md', description: '特定提交的运行时与打包消费者验证证据。', hidden: true },
  { slug: 'local-baseline', title: '本地离线基线', group: '验证记录', file: 'docs/verification/2026-11-04-local-baseline.md', description: '2026-11-04 本地离线验证范围与限制。', hidden: true },
]

export const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[character])
export const plainText = value => value.replace(/<[^>]+>/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`]/g, '').trim()
export const slugify = value => plainText(value).toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-')

/** Compile canonical Markdown sources into static documentation pages and a local search index. */
export function compileContent(sources, base = '/') {
  const resolved = pages.map((page) => {
    const markdown = sources[page.file]
    if (typeof markdown !== 'string' || !markdown.trim())
      throw new Error(`Document source missing: ${page.file}`)
    return { ...page, markdown, source: page.file, url: `${base}docs/${page.slug}/` }
  })
  const sourcePages = new Map(resolved.map(page => [page.file, page]))
  const rewriteLink = (href, source) => {
    if (/^(?:https?:|mailto:)/i.test(href))
      return href
    if (/^[a-z][a-z\d+.-]*:/i.test(href))
      return '#'
    const [relative, fragment = ''] = href.split('#')
    const target = relative ? path.posix.normalize(path.posix.join(path.posix.dirname(source), relative)) : source
    const hash = fragment ? `#${fragment}` : ''
    if (sourcePages.has(target))
      return sourcePages.get(target).url + hash
    return `https://github.com/wot-ui/ci/blob/main/${target}${hash}`
  }
  return resolved.map((page) => {
    const toc = []
    const used = new Map()
    let headingIndex = 0
    const parser = new Marked({ gfm: true })
    parser.use({ renderer: {
      heading({ text, tokens, depth }) {
        const original = slugify(text)
        const count = used.get(original) ?? 0
        used.set(original, count + 1)
        const id = count ? `${original}-${count}` : original
        if (headingIndex++ === 0 && depth === 1)
          return `<span class="doc-source-anchor" id="${escapeHtml(id)}" aria-hidden="true"></span>`
        const level = Math.max(2, depth)
        if (level <= 3)
          toc.push({ id, text: plainText(text), level })
        return `<h${level} id="${escapeHtml(id)}"><a class="heading-anchor" href="#${escapeHtml(id)}" aria-label="链接到${escapeHtml(plainText(text))}">#</a>${this.parser.parseInline(tokens)}</h${level}>`
      },
      code({ text, lang }) {
        const label = lang?.split(/\s/)[0] || 'text'
        return `<div class="code-block"><div class="code-label"><span>${escapeHtml(label)}</span><button type="button" data-copy-code aria-label="复制代码">复制</button></div><pre tabindex="0"><code>${escapeHtml(text)}</code></pre></div>`
      },
      link({ href, title, tokens }) {
        return `<a href="${escapeHtml(rewriteLink(href, page.source))}"${title ? ` title="${escapeHtml(title)}"` : ''}>${this.parser.parseInline(tokens)}</a>`
      },
      table(token) {
        const row = cells => cells.map(cell => `<${cell.header ? 'th' : 'td'}>${this.parser.parseInline(cell.tokens)}</${cell.header ? 'th' : 'td'}>`).join('')
        return `<div class="table-scroll" tabindex="0" role="region" aria-label="可横向滚动的表格"><table><thead><tr>${row(token.header)}</tr></thead><tbody>${token.rows.map(cells => `<tr>${row(cells)}</tr>`).join('')}</tbody></table></div>`
      },
    } })
    const html = parser.parse(page.markdown, { async: false })
    return { ...page, html, toc, searchText: plainText(page.markdown).replace(/\s+/g, ' ') }
  })
}
