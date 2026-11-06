import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import Script from 'next/script'
import { SiteShell } from '../components/site-shell'
import { base, version } from '../lib/documents'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Wot CI — 把小程序发布，交给流水线', template: '%s · Wot CI 文档' },
  description: '面向微信、支付宝、钉钉的小程序 CI 工具。配置体检、多平台上传、预览二维码与版本管理，接入现有发布流程。',
  icons: { icon: `${base}favicon.svg` },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, colorScheme: 'light dark', themeColor: '#f7f8f4' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Script src={`${base}theme.js`} strategy="beforeInteractive" />
        <SiteShell base={base} version={version}>{children}</SiteShell>
      </body>
    </html>
  )
}
