import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { JsonLd, breadcrumbLd } from '@/components/seo/json-ld'
import { buildKnowledgeGraph } from '@/lib/knowledge/graph'
import { KnowledgeConsole } from '@/components/knowledge/knowledge-console'

export const metadata: Metadata = {
  title: 'Knowledge — the map of everything here',
  description:
    'Every blog post, lab study and packet chapter as one browsable knowledge graph — nodes linked by shared tags, categories and concepts, in a hardware console.',
  alternates: { canonical: '/knowledge/' },
}

export default function KnowledgePage() {
  const graph = buildKnowledgeGraph()
  return (
    <>
      <SiteNav />
      <main id="main-content" className="w-full px-3 pb-6 pt-4 sm:px-5" data-pagefind-body>
        <JsonLd data={breadcrumbLd([{ name: 'home', url: '/' }, { name: 'knowledge', url: '/knowledge/' }])} />
        <h1 className="sr-only">Knowledge</h1>
        <p className="sr-only">
          The whole collection as one explorable map — {graph.nodes.length} nodes, {graph.edges.length} edges.
          Posts, lab studies and packet chapters link through shared tags, lab categories and the concepts the
          study packets define. Search nodes, flip layers, switch between drift, lane and orbit layouts.
        </p>
        <KnowledgeConsole graph={graph} />
      </main>
      <SiteFooter />
    </>
  )
}
