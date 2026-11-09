import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'
import { getVectorBatches, getAllVectors } from '@/lib/vectors/registry'
import { VectorGalleryView } from '@/components/vectors/vector-gallery-view'

export const metadata: Metadata = {
  title: 'Vector Gallery — Algorithmic, Physics & Platform Icons',
  description:
    'Curated collection of production-ready vector icons across mathematics, quantum physics, algorithms, distributed systems, and RF hardware. Generated with BrandBrain Flow Engine.',
  alternates: { canonical: '/vectors/' },
  openGraph: {
    type: 'website',
    title: 'Vector Gallery · Ben Ebsworth',
    description:
      'Curated collection of production-ready vector icons across mathematics, quantum physics, algorithms, distributed systems, and RF hardware.',
    url: '/vectors/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vector Gallery · Ben Ebsworth',
    creator: '@benebsworth',
    site: '@benebsworth',
  },
}

const PIPELINE_STEPS = [
  { step: '01', title: 'Plan & layout', detail: 'Asset set manifest calculates row-major bounding cells, optical gutters, and spend ceilings.' },
  { step: '02', title: 'Sheet diffusion', detail: 'Unified high-resolution contact sheet generated under strict stylistic consistency rules.' },
  { step: '03', title: 'Split & matting', detail: 'Connected-component layout bounding cuts cells and extracts clean alpha backgrounds.' },
  { step: '04', title: 'Vectorization', detail: 'Multi-color path curve fitting sanitizes output SVG paths for clean web embedding.' },
]

const PIPELINE_FACTS = [
  { term: 'Flow nodes', detail: '8 pipeline stages' },
  { term: 'Tracer engine', detail: 'VTracer 0.6.4' },
  { term: 'Raster kernel', detail: 'resvg 0.47.0' },
  { term: 'Formats', detail: 'SVG · PNG (512px)' },
]

/**
 * The gallery's subject is the marks (#131): a plain heading, one line of
 * provenance instead of a brand badge, the gallery, then the pipeline notes
 * as a ruled section rather than a dossier of tinted cards.
 */
export default function VectorsPage() {
  const batches = getVectorBatches()
  const allVectors = getAllVectors()

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Vectors', url: `${SITE_URL}/vectors/` },
          ]),
          collectionPageLd({
            name: 'Vector Gallery · Ben Ebsworth',
            description:
              'Curated collection of production-ready vector icons across mathematics, quantum physics, algorithms, distributed systems, and RF hardware.',
            url: `${SITE_URL}/vectors/`,
            items: allVectors.map((v) => ({ name: v.name, url: `${SITE_URL}${v.svgPath}` })),
          }),
        ]}
      />

      <div className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
        <SiteNav />

        <main id="main-content" className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-8">
            <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Vectors' }]} />

            <header className="mt-6 mb-10">
              <h1 className="type-h1">Vector Gallery</h1>
              <p className="mt-4 text-sm text-muted-foreground">
                {allVectors.length} technical vectors · SVG + PNG · generated with the BrandBrain Flow Engine
              </p>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                A high-precision suite of algorithmic, physical, and systems vector graphics. Engineered with strict
                optical weight consistency (~2.5px relative), transparent alphas, and multi-scale legibility (24px
                favicon to 512px hero). Copy raw SVG source or React JSX with one click.
              </p>
            </header>

            <VectorGalleryView batches={batches} allVectors={allVectors} />

            <section className="mt-16 border-t border-[var(--color-border)] pt-10" aria-labelledby="pipeline-heading">
              <p className="text-sm text-muted-foreground">Pipeline architecture</p>
              <h2 id="pipeline-heading" className="mt-1 font-display text-2xl font-semibold text-[var(--color-fg)]">
                Automated prompt-to-vector synthesis
              </h2>
              <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  Each batch is synthesized end-to-end via BrandBrain&apos;s canonical{' '}
                  <code className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-sm text-[var(--color-fg)]">icon-set</code>{' '}
                  flow template. The orchestrated pipeline coordinates manifest layout generation, high-density contact
                  sheet diffusion, automated alpha matting, optical normalization, and sub-pixel vector tracing.
                </p>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 self-start text-sm">
                  {PIPELINE_FACTS.map((fact) => (
                    <div key={fact.term} className="contents">
                      <dt className="text-muted-foreground">{fact.term}</dt>
                      <dd className="font-mono text-xs text-[var(--color-fg)]">{fact.detail}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <ol className="mt-8 grid gap-6 border-t border-[var(--color-border)] pt-6 sm:grid-cols-2 lg:grid-cols-4">
                {PIPELINE_STEPS.map((step) => (
                  <li key={step.step}>
                    <p className="font-mono text-xs text-muted-foreground">{step.step}</p>
                    <h3 className="mt-1 font-display text-sm font-semibold text-[var(--color-fg)]">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  )
}
