'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { SearchIcon } from './icons'

interface SearchItem {
  title: string
  group: string
  url: string
  text: string
  description: string
}

export function SearchDialog({ open, close, base }: { open: boolean, close: () => void, base: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const results = useRef<HTMLUListElement>(null)
  const index = useRef<Promise<SearchItem[]> | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<SearchItem[]>([])
  const [status, setStatus] = useState('输入关键词，查找命令、配置与平台说明。')

  useEffect(() => {
    if (open && !dialog.current?.open) {
      dialog.current?.showModal()
      input.current?.focus()
    }
    else if (!open) {
      dialog.current?.close()
    }
  }, [open])

  useEffect(() => {
    if (!open)
      return
    let active = true
    const normalized = query.trim().toLocaleLowerCase()
    setMatches([])
    if (!normalized) {
      setStatus('输入关键词，查找命令、配置与平台说明。')
      return
    }
    setStatus('正在搜索…')
    index.current ??= fetch(`${base}search-index.json`).then((response) => {
      if (!response.ok)
        throw new Error('Search unavailable')
      return response.json() as Promise<SearchItem[]>
    }).catch((error) => {
      index.current = undefined
      throw error
    })
    index.current.then((items) => {
      if (!active)
        return
      const words = normalized.split(/\s+/)
      const found = items.filter(item => words.every(word => `${item.title} ${item.group} ${item.text}`.toLocaleLowerCase().includes(word)))
        .sort((a, b) => Number(b.title.toLocaleLowerCase().includes(normalized)) - Number(a.title.toLocaleLowerCase().includes(normalized)))
        .slice(0, 12)
      setMatches(found)
      setStatus(found.length ? `找到 ${found.length} 篇相关文档` : '没有找到匹配内容，试试“上传”“版本”或“weixin”。')
    }).catch(() => {
      if (active)
        setStatus('搜索暂时不可用，请通过文档目录浏览。修改关键词可重试。')
    })
    return () => {
      active = false
    }
  }, [query, open, base])

  return (
    <dialog
      ref={dialog}
      id="search-dialog"
      aria-labelledby="search-title"
      onCancel={close}
      onClose={close}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.target === event.currentTarget && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom))
          close()
      }}
    >
      <div className="search-dialog-head">
        <span id="search-title" className="sr-only">搜索文档</span>
        <SearchIcon />
        <input
          ref={input}
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="搜索命令、配置或平台…"
          aria-label="搜索文档"
          autoComplete="off"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              results.current?.querySelector('a')?.focus()
            }
            if (event.key === 'Enter')
              results.current?.querySelector('a')?.click()
          }}
        />
        <button type="button" className="search-close" onClick={close} aria-label="关闭搜索">Esc</button>
      </div>
      <div className="search-status" role="status">{status}</div>
      <ul ref={results} id="search-results" aria-label="搜索结果">
        {matches.map((match) => {
          const word = query.trim().toLocaleLowerCase().split(/\s+/)[0]
          const offset = match.text.toLocaleLowerCase().indexOf(word)
          return (
            <li key={match.url}>
              <Link href={`/${match.url.slice(base.length)}`} onClick={close}>
                <small>{match.group}</small>
                <strong>{match.title}</strong>
                <p>{offset >= 0 ? `…${match.text.slice(Math.max(0, offset - 24), offset + 100)}…` : match.description}</p>
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="search-footer">
        本地搜索 · 无需外部服务
        <span>Tab 选择 · Enter 打开</span>
      </div>
    </dialog>
  )
}
