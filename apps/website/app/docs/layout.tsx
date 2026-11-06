import type { ReactNode } from 'react'
import { DocsSidebar } from '../../components/site-shell'
import { navigation, version } from '../../lib/documents'

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="docs-layout">
      <DocsSidebar navigation={navigation} version={version} />
      {children}
    </div>
  )
}
