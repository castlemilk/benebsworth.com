import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, ArrowRight, ExternalLink, Cpu, Terminal, ShieldCheck, Zap } from 'lucide-react'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { Reveal } from '@/components/motion/reveal'
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
            <Breadcrumb
              items={[
                { label: 'Home', href: '/' },
                { label: 'Vectors', href: '/vectors/' },
              ]}
            />

            {/* Hero Header */}
            <div className="mb-10 mt-4">
              <Reveal>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 font-mono text-xs font-semibold text-[#00e0b8]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>BrandBrain Flow Engine</span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {allVectors.length} Curated Technical Vectors · SVG + PNG
                  </span>
                </div>
              </Reveal>

              <Reveal delay={60}>
                <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-[var(--color-fg)] sm:text-5xl lg:text-6xl">
                  Vector Gallery
                </h1>
              </Reveal>

              <Reveal delay={120}>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  A high-precision suite of algorithmic, physical, and systems vector graphics.
                  Engineered with strict optical weight consistency (~2.5px relative), transparent alphas,
                  and multi-scale legibility (24px favicon to 512px hero). Copy raw SVG source or React JSX with one click.
                </p>
              </Reveal>
            </div>

            {/* Main Interactive Gallery Studio */}
            <VectorGalleryView batches={batches} allVectors={allVectors} />

            {/* Pipeline Architecture Technical Dossier */}
            <Reveal delay={150}>
              <div className="mt-16 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 sm:p-8 backdrop-blur-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">
                      <Cpu className="h-4 w-4" />
                      <span>Pipeline Architecture</span>
                    </div>
                    <h2 className="mt-2 font-display text-xl font-bold text-[var(--color-fg)] sm:text-2xl">
                      Automated Prompt-to-Vector Synthesis
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Each batch is synthesized end-to-end via BrandBrain&apos;s canonical <code className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-fg)]">icon-set</code> flow template. The orchestrated pipeline coordinates manifest layout generation, high-density contact sheet diffusion, automated alpha matting, optical normalization, and sub-pixel vector tracing.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/80 p-4 text-xs font-mono lg:min-w-[280px]">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Flow Nodes:</span>
                      <span className="font-semibold text-[var(--color-fg)]">8 Pipeline Stages</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Tracer Engine:</span>
                      <span className="font-semibold text-emerald-400">VTracer 0.6.4</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Raster Kernel:</span>
                      <span className="font-semibold text-emerald-400">resvg 0.47.0</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Format Support:</span>
                      <span className="font-semibold text-cyan-400">SVG · PNG (512px)</span>
                    </div>
                  </div>
                </div>

                {/* Steps Matrix */}
                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface-2)]/40 p-4">
                    <div className="font-mono text-xs font-bold text-cyan-400">01 / Plan & Layout</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Asset set manifest calculates row-major bounding cells, optical gutters, and spend ceilings.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface-2)]/40 p-4">
                    <div className="font-mono text-xs font-bold text-violet-400">02 / Sheet Diffusion</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Unified high-resolution contact sheet generated under strict stylistic consistency rules.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface-2)]/40 p-4">
                    <div className="font-mono text-xs font-bold text-amber-400">03 / Split & Matting</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Connected-component layout bounding cuts cells and extracts clean alpha backgrounds.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface-2)]/40 p-4">
                    <div className="font-mono text-xs font-bold text-emerald-400">04 / Vectorization</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Multi-color path curve fitting sanitizes output SVG paths for clean web embedding.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  )
}
