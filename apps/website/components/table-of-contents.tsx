'use client'

import { useEffect, useState } from 'react'

export function TableOfContents({ items, slug }: { items: { id: string, text: string, level: number }[], slug: string }) {
  const [active, setActive] = useState('')
  useEffect(() => {
    setActive('')
    if (!('IntersectionObserver' in window))
      return
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting)
          setActive(entry.target.id)
      }
    }, { rootMargin: '-90px 0px -65% 0px' })
    document.querySelectorAll('.prose h2, .prose h3').forEach(heading => observer.observe(heading))
    return () => observer.disconnect()
  }, [slug])
  return (
    <aside className="doc-toc" aria-label="本页目录">
      <h2>本页内容</h2>
      {items.map(item => <a key={item.id} className={`toc-level-${item.level}${active === item.id ? ' active' : ''}`} href={`#${item.id}`}>{item.text}</a>)}
      <a className="toc-top" href="#main">返回顶部 ↑</a>
    </aside>
  )
}
