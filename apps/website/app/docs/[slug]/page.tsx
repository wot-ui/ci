import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { External } from '../../../components/icons'
import { TableOfContents } from '../../../components/table-of-contents'
import { documents, navigation } from '../../../lib/documents'

export const dynamicParams = false

export function generateStaticParams() {
  return documents.map(page => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = documents.find(page => page.slug === slug)
  if (!page)
    notFound()
  return { title: page.title, description: page.description, openGraph: { title: `${page.title} · Wot CI 文档`, description: page.description, type: 'website' } }
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = documents.find(page => page.slug === slug)
  if (!page)
    notFound()
  const index = navigation.findIndex(item => item.slug === slug)
  const previous = index >= 0 ? navigation[index - 1] : undefined
  const next = index >= 0 ? navigation[index + 1] : undefined
  return (
    <>
      <main className="docs-main" id="main">
        <div className="doc-breadcrumb">
          文档
          <span>/</span>
          {page.group}
        </div>
        <div className="doc-title">
          <p className="eyebrow">WOT CI DOCUMENTATION</p>
          <h1>{page.title}</h1>
          <p>{page.description}</p>
        </div>
        <div className="doc-mobile-toc">
          <details key={slug}>
            <summary>本页目录</summary>
            {page.toc.map(item => <a key={item.id} href={`#${item.id}`}>{item.text}</a>)}
          </details>
        </div>
        <article className="prose" dangerouslySetInnerHTML={{ __html: page.html }} />
        <div className="doc-edit">
          <a href={`https://github.com/wot-ui/ci/edit/main/${page.source}`}>
            在 GitHub 上编辑此页
            <External />
          </a>
          <span>
            来源：
            {page.source}
          </span>
        </div>
        <nav className="doc-pagination" aria-label="相邻文档">
          {previous
            ? (
                <Link href={`/docs/${previous.slug}/`}>
                  <small>← 上一篇</small>
                  <strong>{previous.title}</strong>
                </Link>
              )
            : <span />}
          {next && (
            <Link href={`/docs/${next.slug}/`}>
              <small>下一篇 →</small>
              <strong>{next.title}</strong>
            </Link>
          )}
        </nav>
      </main>
      <TableOfContents items={page.toc} slug={slug} />
    </>
  )
}
