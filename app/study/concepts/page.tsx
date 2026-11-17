import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { getGlossaryIndex, chapterHref } from '@/lib/study/load'

export const metadata: Metadata = {
  title: 'Concept index — Machine Learning Systems study',
  description:
    'Every glossary term defined across the MLSys study packets, linked back to its chapter.',
  alternates: { canonical: '/study/concepts/' },
}

export default function ConceptsPage() {
  const entries = getGlossaryIndex()
  const letters = [...new Set(entries.map((e) => e.term[0]?.toUpperCase() ?? '#'))]

  return (
    <>
      <SiteNav />
      <main id="main-content" className="mx-auto w-full max-w-4xl px-6 pb-20 sm:px-8">
        <Breadcrumb
          className="mb-8"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Study', href: '/study/' },
            { label: 'Concept index' },
          ]}
        />

        <header className="mb-10 max-w-3xl">
          <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            study · reference
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Concept index</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Every term the packets define, across chapters — {entries.length} entries so far. Each
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
              {entries
                .filter((e) => (e.term[0]?.toUpperCase() ?? '#') === l)
                .map((e) => (
                  <div key={`${e.volume}-${e.slug}-${e.term}`} className="grid gap-1 py-2 sm:grid-cols-[14rem_1fr] sm:gap-6">
                    <dt className="font-medium">
                      <a
                        href={`${chapterHref({ volumeId: e.volume, slug: e.slug })}#glossary`}
                        className="underline-offset-4 hover:underline"
                      >
                        {e.term}
                      </a>
                    </dt>
                    <dd className="text-sm leading-relaxed text-muted-foreground">
                      {e.def}{' '}
                      <span className="font-mono text-xs">
                        — {e.volume} · {e.title}
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
