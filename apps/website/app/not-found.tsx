import Link from 'next/link'
import { Arrow } from '../components/icons'

export default function NotFound() {
  return (
    <main id="main" className="not-found shell">
      <span className="eyebrow">404 / NOT FOUND</span>
      <h1>这条路径没有产物。</h1>
      <p>页面可能已移动。可以搜索文档，或回到起点。</p>
      <Link className="button primary" href="/">
        返回首页
        <Arrow />
      </Link>
    </main>
  )
}
