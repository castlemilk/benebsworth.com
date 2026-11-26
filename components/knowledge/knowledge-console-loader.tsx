'use client'

import dynamic from 'next/dynamic'
import type { KnowledgeGraph } from '@/lib/knowledge/graph'

// The console is the heaviest component on the site (canvas + both force
// libs); dynamic ssr:false keeps it out of the route's initial render and
// hydrates it only once its chunk arrives.
const KnowledgeConsole = dynamic(() =>
  import('@/components/knowledge/knowledge-console').then((m) => m.KnowledgeConsole),
  { ssr: false },
)

export function KnowledgeConsoleLoader({ graph }: { graph: KnowledgeGraph }) {
  return <KnowledgeConsole graph={graph} />
}
