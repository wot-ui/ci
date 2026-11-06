const root = document.documentElement
const themeButton = document.querySelector('[data-theme-toggle]')
const themeLabel = () => themeButton.setAttribute('aria-label', `切换${root.dataset.theme === 'dark' ? '浅色' : '深色'}主题`)
themeLabel()
themeButton.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem('wotci-theme', root.dataset.theme)
  }
  catch { /* Theme still works for this page. */ }
  themeLabel()
})

let toastTimer
function toast(message) {
  const element = document.getElementById('toast')
  element.textContent = message
  element.classList.add('visible')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => element.classList.remove('visible'), 2200)
}

// Copy exactly the visible code, with an explicit failure message when access is blocked.
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy-code], [data-copy-inline]')
  if (!button)
    return
  const code = button.closest('.code-block, .install-command').querySelector('code').textContent
  try {
    if (!navigator.clipboard?.writeText)
      throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(code)
    toast('已复制到剪贴板')
  }
  catch { toast('无法访问剪贴板，请选中代码手动复制') }
})

for (const tablist of document.querySelectorAll('[role="tablist"]')) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')]
  const select = (selected) => {
    for (const tab of tabs) {
      const active = tab === selected
      tab.setAttribute('aria-selected', String(active))
      tab.tabIndex = active ? 0 : -1
      document.getElementById(tab.dataset.tab).hidden = !active
    }
  }
  tabs.forEach(tab => tab.addEventListener('click', () => select(tab)))
  tablist.addEventListener('keydown', (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
      return
    event.preventDefault()
    const current = tabs.indexOf(document.activeElement)
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length
    select(tabs[index])
    tabs[index].focus()
  })
}

const menu = document.querySelector('[data-menu-toggle]')
const scrim = document.querySelector('[data-menu-close]')
const sidebar = document.querySelector('.docs-sidebar')
const mobile = matchMedia('(max-width: 600px)')
function setMenu(open) {
  document.body.classList.toggle('menu-open', open)
  document.body.style.overflow = open ? 'hidden' : ''
  menu?.setAttribute('aria-expanded', String(open))
  menu?.setAttribute('aria-label', open ? '关闭文档目录' : '打开文档目录')
  if (scrim)
    scrim.hidden = !open
  if (sidebar)
    sidebar.inert = mobile.matches && !open
}
setMenu(false)
menu?.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'))
scrim?.addEventListener('click', () => setMenu(false))
mobile.addEventListener('change', () => setMenu(false))

const dialog = document.getElementById('search-dialog')
const input = document.getElementById('search-input')
const results = document.getElementById('search-results')
const status = document.getElementById('search-status')
let indexPromise
let querySequence = 0
async function updateSearch() {
  const sequence = ++querySequence
  const query = input.value.trim().toLocaleLowerCase()
  results.replaceChildren()
  if (!query) {
    status.textContent = '输入关键词，查找命令、配置与平台说明。'
    return
  }
  status.textContent = '正在搜索…'
  try {
    indexPromise ??= fetch(`${document.body.dataset.base}search-index.json`).then((response) => {
      if (!response.ok)
        throw new Error('Search index unavailable')
      return response.json()
    }).catch((error) => {
      indexPromise = undefined
      throw error
    })
    const index = await indexPromise
    if (sequence !== querySequence)
      return
    const words = query.split(/\s+/)
    const matches = index.filter(item => words.every(word => `${item.title} ${item.group} ${item.text}`.toLocaleLowerCase().includes(word)))
      .sort((a, b) => Number(b.title.toLocaleLowerCase().includes(query)) - Number(a.title.toLocaleLowerCase().includes(query)))
      .slice(0, 12)
    status.textContent = matches.length ? `找到 ${matches.length} 篇相关文档` : '没有找到匹配内容，试试“上传”“版本”或“weixin”。'
    for (const match of matches) {
      const li = document.createElement('li')
      const link = document.createElement('a')
      link.href = match.url
      const group = document.createElement('small')
      group.textContent = match.group
      const title = document.createElement('strong')
      title.textContent = match.title
      const excerpt = document.createElement('p')
      const offset = match.text.toLocaleLowerCase().indexOf(words[0])
      excerpt.textContent = offset >= 0 ? `…${match.text.slice(Math.max(0, offset - 24), offset + 100)}…` : match.description
      link.append(group, title, excerpt)
      li.append(link)
      results.append(li)
    }
  }
  catch {
    if (sequence === querySequence)
      status.textContent = '搜索暂时不可用，请通过文档目录浏览。修改关键词可重试。'
  }
}
function openSearch() {
  if (dialog.open)
    return
  setMenu(false)
  dialog.showModal()
  input.focus()
  updateSearch()
}
document.querySelectorAll('[data-search-open]').forEach(button => button.addEventListener('click', openSearch))
document.querySelector('[data-search-close]').addEventListener('click', () => dialog.close())
dialog.addEventListener('click', (event) => {
  const rect = dialog.getBoundingClientRect()
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom))
    dialog.close()
})
input.addEventListener('input', updateSearch)
input.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    results.querySelector('a')?.focus()
  }
  if (event.key === 'Enter')
    results.querySelector('a')?.click()
})
document.addEventListener('keydown', (event) => {
  const editing = event.target.closest('input,textarea,[contenteditable="true"]')
  if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') || (event.key === '/' && !editing)) {
    event.preventDefault()
    openSearch()
  }
  if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {
    setMenu(false)
    menu.focus()
  }
  if (event.key === 'Tab' && document.body.classList.contains('menu-open')) {
    const links = [...sidebar.querySelectorAll('a')]
    if (event.shiftKey && document.activeElement === links[0]) {
      event.preventDefault()
      menu.focus()
    }
    else if (!event.shiftKey && document.activeElement === links.at(-1)) {
      event.preventDefault()
      menu.focus()
    }
    else if (document.activeElement === menu) {
      event.preventDefault()
      const target = event.shiftKey ? links.at(-1) : links[0]
      target.focus()
    }
  }
})

const tocLinks = [...document.querySelectorAll('.doc-toc a[href^="#"]')]
if (tocLinks.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting)
        continue
      tocLinks.forEach(link => link.classList.toggle('active', decodeURIComponent(link.hash.slice(1)) === entry.target.id))
    }
  }, { rootMargin: '-90px 0px -65% 0px' })
  document.querySelectorAll('.prose h2, .prose h3').forEach(heading => observer.observe(heading))
}
