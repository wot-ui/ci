'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { External, MenuIcon, SearchIcon, ThemeIcon } from './icons'
import { SearchDialog } from './search'

const MenuContext = createContext({ open: false, close: () => {} })
const github = 'https://github.com/wot-ui/ci'

function Brand({ base }: { base: string }) {
  return (
    <Link href="/" className="brand" aria-label="Wot CI 首页">
      <img className="brand-mark" src={`${base}favicon.svg`} width={40} height={40} alt="" aria-hidden="true" />
      <span>
        Wot
        <b>CI</b>
      </span>
    </Link>
  )
}

export function SiteShell({ children, base, version }: { children: ReactNode, base: string, version: string }) {
  const pathname = usePathname()
  const docs = pathname.startsWith('/docs')
  const [menu, setMenu] = useState({ path: pathname, open: false })
  const menuOpen = menu.open && menu.path === pathname
  const [searchOpen, setSearchOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const menuButton = useRef<HTMLButtonElement>(null)
  const closeMenu = useCallback(() => setMenu({ path: pathname, open: false }), [pathname])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const openSearch = useCallback(() => {
    closeMenu()
    setSearchOpen(true)
  }, [closeMenu])

  // Discard the previous route's open state, including when leaving via the logo.
  useEffect(closeMenu, [closeMenu])

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark')
  }, [])

  useEffect(() => {
    const copy = async (event: MouseEvent) => {
      const button = event.target instanceof Element ? event.target.closest('[data-copy-code], [data-copy-inline]') : null
      if (!button)
        return
      const code = button.closest('.code-block, .install-command')?.querySelector('code')?.textContent
      try {
        if (code === undefined || code === null || !navigator.clipboard?.writeText)
          throw new Error('Clipboard unavailable')
        await navigator.clipboard.writeText(code)
        setToast('已复制到剪贴板')
      }
      catch { setToast('无法访问剪贴板，请选中代码手动复制') }
      clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setToast(''), 2200)
    }
    document.addEventListener('click', copy)
    return () => {
      document.removeEventListener('click', copy)
      clearTimeout(toastTimer.current)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    const onKey = (event: KeyboardEvent) => {
      const editing = event.target instanceof Element && event.target.closest('input,textarea,[contenteditable="true"]')
      if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') || (event.key === '/' && !editing)) {
        event.preventDefault()
        openSearch()
      }
      if (menuOpen && event.key === 'Escape') {
        closeMenu()
        menuButton.current?.focus()
      }
      if (menuOpen && event.key === 'Tab') {
        const links = [...document.querySelectorAll<HTMLAnchorElement>('.docs-sidebar a')]
        if ((event.shiftKey && document.activeElement === links[0]) || (!event.shiftKey && document.activeElement === links.at(-1))) {
          event.preventDefault()
          menuButton.current?.focus()
        }
        else if (document.activeElement === menuButton.current) {
          event.preventDefault()
          const target = event.shiftKey ? links.at(-1) : links[0]
          target?.focus()
        }
      }
    }
    const media = matchMedia('(max-width: 600px)')
    media.addEventListener('change', closeMenu)
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      media.removeEventListener('change', closeMenu)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen, openSearch, closeMenu])

  return (
    <MenuContext.Provider value={{ open: menuOpen, close: closeMenu }}>
      <div className={`${docs ? 'docs-page' : 'home-page'}${menuOpen ? ' menu-open' : ''}`}>
        <a className="skip-link" href="#main">跳到正文</a>
        <header className="site-header">
          <div className="header-inner">
            <Brand base={base} />
            <span className="version">
              v
              {version}
            </span>
            <nav className="main-nav" aria-label="主导航">
              <Link href="/docs/getting-started/" aria-current={docs ? 'true' : undefined}>文档</Link>
              <Link href="/docs/support/">平台支持</Link>
              <Link href="/docs/roadmap/">路线图</Link>
            </nav>
            <div className="header-actions">
              <button type="button" className="search-trigger" onClick={openSearch} aria-label="搜索文档">
                <SearchIcon />
                <span>搜索文档</span>
                <kbd>⌘ K</kbd>
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`切换${dark ? '浅色' : '深色'}主题`}
                onClick={() => {
                  const next = document.documentElement.dataset.theme !== 'dark'
                  document.documentElement.dataset.theme = next ? 'dark' : 'light'
                  setDark(next)
                  try {
                    localStorage.setItem('wotci-theme', next ? 'dark' : 'light')
                  }
                  catch { /* Theme still applies when storage is unavailable. */ }
                }}
              >
                <ThemeIcon />
              </button>
              <a className="github-link" href={github} aria-label="GitHub 源码">
                GitHub
                <External />
              </a>
              {docs && <button ref={menuButton} type="button" className="icon-button docs-menu" aria-expanded={menuOpen} aria-controls="docs-sidebar" aria-label={menuOpen ? '关闭文档目录' : '打开文档目录'} onClick={() => setMenu({ path: pathname, open: !menuOpen })}><MenuIcon /></button>}
            </div>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div>
            <Brand base={base} />
            <p>小程序交付，从这里接上流水线。</p>
          </div>
          <div className="footer-links">
            <a href={github}>
              GitHub
              <External />
            </a>
            <a href="https://www.npmjs.com/package/@wot-ui/ci">
              npm
              <External />
            </a>
            <a href="https://github.com/wot-ui/open-wot">
              Wot CLI
              <External />
            </a>
            <span>
              v
              {version}
              {' '}
              · MIT License
            </span>
          </div>
        </footer>
        <SearchDialog open={searchOpen} close={closeSearch} base={base} />
        <div className={`toast${toast ? ' visible' : ''}`} role="status">{toast}</div>
      </div>
    </MenuContext.Provider>
  )
}

function subscribeMobile(callback: () => void) {
  const media = matchMedia('(max-width: 600px)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

export function DocsSidebar({ navigation, version }: { navigation: { slug: string, title: string, group: string }[], version: string }) {
  const menu = useContext(MenuContext)
  const pathname = usePathname()
  const mobile = useSyncExternalStore(subscribeMobile, () => matchMedia('(max-width: 600px)').matches, () => false)
  return (
    <>
      <button type="button" className="sidebar-scrim" onClick={menu.close} aria-label="关闭文档目录" hidden={!menu.open} />
      <aside className="docs-sidebar" id="docs-sidebar" aria-label="文档目录" inert={mobile && !menu.open}>
        <Link className="sidebar-home" href="/" onClick={menu.close}>← 返回首页</Link>
        {[...new Set(navigation.map(page => page.group))].map(group => (
          <div className="sidebar-group" key={group}>
            <h2>{group}</h2>
            {navigation.filter(page => page.group === group).map(page => <Link key={page.slug} href={`/docs/${page.slug}/`} aria-current={pathname.replace(/\/$/, '') === `/docs/${page.slug}` ? 'page' : undefined} onClick={menu.close}>{page.title}</Link>)}
          </div>
        ))}
        <div className="sidebar-note">
          <span className="status-dot" />
          文档随代码维护
          <br />
          <small>
            版本
            {version}
          </small>
        </div>
      </aside>
    </>
  )
}
