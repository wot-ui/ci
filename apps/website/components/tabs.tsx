'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'

interface TabItem {
  id: string
  label: ReactNode
  content: ReactNode
}

export function Tabs({ items, label, className, children }: { items: TabItem[], label: string, className: string, children?: ReactNode }) {
  const [selected, setSelected] = useState(0)
  return (
    <div className={className}>
      <div className="tabs-controls">
        <div
          role="tablist"
          aria-label={label}
          onKeyDown={(event) => {
            if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
              return
            event.preventDefault()
            const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (selected + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + items.length) % items.length
            setSelected(index)
            event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index]?.focus()
          }}
        >
          {items.map((item, index) => <button type="button" key={item.id} id={`label-${item.id}`} role="tab" aria-selected={index === selected} aria-controls={item.id} tabIndex={index === selected ? 0 : -1} onClick={() => setSelected(index)}>{item.label}</button>)}
        </div>
        {children}
      </div>
      <div className="tabs-panels">
        {items.map((item, index) => <div key={item.id} role="tabpanel" id={item.id} aria-labelledby={`label-${item.id}`} hidden={index !== selected}>{item.content}</div>)}
      </div>
    </div>
  )
}

export function Code({ text, label }: { text: string, label: string }) {
  return (
    <div className="code-block">
      <div className="code-label">
        <span>{label}</span>
        <button type="button" data-copy-code aria-label="复制代码">复制</button>
      </div>
      <pre tabIndex={0}><code>{text}</code></pre>
    </div>
  )
}

export function InstallCommand() {
  return (
    <div className="install-box">
      <span className="install-caption">添加到你的项目</span>
      <Tabs
        label="选择包管理器"
        className="install-tabs"
        items={['pnpm', 'npm', 'yarn'].map(pm => ({
          id: `install-${pm}`,
          label: pm,
          content: (
            <div className="install-command">
              <span aria-hidden="true">$</span>
              <code>{`${pm} ${pm === 'npm' ? 'install' : 'add'} -D @wot-ui/ci`}</code>
              <button type="button" data-copy-inline aria-label="复制安装命令">复制</button>
            </div>
          ),
        }))}
      />
    </div>
  )
}
