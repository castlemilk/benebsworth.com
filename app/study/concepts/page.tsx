import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { getGlossaryIndex, chapterHref } from '@/lib/study/load'
import { renderMarkdown } from '@/lib/study/markdown'

export const metadata: Metadata = {
  title: 'Concept index — Machine Learning Systems study',
  description:
    'Every glossary term defined across the MLSys study packets, linked back to its chapter.',
  alternates: { canonical: '/study/concepts/' },
}

export default async function ConceptsPage() {
  const entries = getGlossaryIndex()
  // Terms recur across chapters (each packet defines its own copy); group by
  // normalized term so the index reads as one entry per concept.
  const grouped = new Map<string, typeof entries>()
  for (const e of entries) {
    const k = e.term.toLowerCase()
    grouped.set(k, [...(grouped.get(k) ?? []), e])
  }
  const terms = await Promise.all(
    [...grouped.values()].map(async (group) => ({
      term: group[0].term,
      defHtml: await renderMarkdown(group[0].def),
      sources: group,
    })),
  )
  terms.sort((a, b) => a.term.localeCompare(b.term))
  const letters = [...new Set(terms.map((t) => t.term[0]?.toUpperCase() ?? '#'))]

  return (
    <>
      <SiteNav />
      <main id="main-content" className="mx-auto w-full max-w-4xl px-6 pb-20 sm:px-8">
        <Breadcrumb
          className="mb-8"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Learning', href: '/learning/' },
            { label: 'Machine Learning Systems', href: '/learning/ml-systems/' },
            { label: 'Concept index' },
          ]}
        />

        <header className="mb-10 max-w-3xl">
          <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            learning · reference
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Concept index</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Every term the packets define, across chapters: {terms.length} terms so far. Each
            links back to the packet glossary that owns it.
          </p>
        </header>

        <nav aria-label="Jump to letter" className="mb-8 flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm">
          {letters.map((l) => (
            <a key={l} href={`#c-${l}`} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {l}
            </a>
          ))}
        </nav>

        <dl className="space-y-8">
          {letters.map((l) => (
            <section key={l} id={`c-${l}`} className="scroll-mt-24">
              <h2 className="mb-3 border-b border-border/60 pb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {l}
              </h2>
              {terms
                .filter((t) => (t.term[0]?.toUpperCase() ?? '#') === l)
                .map((t) => (
                  <div key={t.term} className="grid gap-1 py-2 sm:grid-cols-[14rem_1fr] sm:gap-6">
                    <dt className="font-medium">
                      <a
                        href={`${chapterHref({ volumeId: t.sources[0].volume, slug: t.sources[0].slug })}#glossary`}
                        className="underline-offset-4 hover:underline"
                      >
                        {t.term}
                      </a>
                    </dt>
                    <dd className="text-sm leading-relaxed text-muted-foreground">
                      <span dangerouslySetInnerHTML={{ __html: t.defHtml }} />{' '}
                      <span className="font-mono text-xs">
                        {t.sources.map((s) => `${s.volume} · ${s.title}`).join(', ')}
                      </span>
                    </dd>
                  </div>
                ))}
            </section>
          ))}
        </dl>
      </main>
      <SiteFooter />
    </>
  )
}
