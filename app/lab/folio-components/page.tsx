import type { Metadata } from 'next'
import { FolioWorkbench } from '@/components/editorial-workbench/workbench'

export const metadata: Metadata = {
  title: 'Folio components — editorial workbench',
  description: 'An isolated study of source-backed reading components, states and graph presentation contracts.',
  robots: { index: false, follow: false },
}

export default function FolioComponentsPage() {
  return <FolioWorkbench />
}
