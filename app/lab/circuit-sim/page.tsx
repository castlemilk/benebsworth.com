import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd, authorLd } from '@/components/seo/json-ld'
import { CircuitSimPage } from './circuit-sim-page'

export const metadata: Metadata = {
  title: 'Circuit Simulator · Lab',
  description:
    'Drag-and-drop circuit builder with SPICE-style transient simulation and a built-in oscilloscope. Probe any node and watch real-time voltage traces.',
  alternates: { canonical: '/lab/circuit-sim/' },
  openGraph: {
    type: 'website',
    title: 'Circuit Simulator · Lab · Ben Ebsworth',
    description: 'Build circuits with drag-and-drop and run SPICE-style transient simulations.',
    url: '/lab/circuit-sim/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Circuit Simulator · Lab',
    creator: '@benebsworth',
    site: '@benebsworth',
  },
}

export default function CircuitSimPageRoute() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Lab', url: `${SITE_URL}/lab/` },
            { name: 'Circuit Simulator', url: `${SITE_URL}/lab/circuit-sim/` },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Circuit Simulator',
            description: 'Drag-and-drop circuit builder with SPICE-style transient simulation and oscilloscope.',
            url: `${SITE_URL}/lab/circuit-sim/`,
            applicationCategory: 'EducationalApplication',
            applicationSubCategory: 'Electrical Engineering',
            operatingSystem: 'Any (browser-based)',
            inLanguage: 'en-AU',
            isAccessibleForFree: true,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            author: authorLd,
          },
        ]}
      />
      <SiteNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Lab', href: '/lab/' },
            { label: 'Circuit Simulator' },
          ]}
        />
        <div className="mt-6 flex items-center gap-3">
          <span className="inline-block font-mono text-lg" style={{ color: '#00b4d8' }}>Ω</span>
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-fg)]/50">
            Electrical Engineering
          </span>
        </div>
        <h1 className="mt-3 type-h1">Circuit Simulator</h1>
        <p className="mt-3 max-w-prose type-body text-[var(--color-fg)]/70">
          Drag resistors, capacitors, inductors, and voltage sources onto the canvas. Wire them up,
          run a transient simulation, and probe any node with the built-in oscilloscope.
        </p>
        <div className="mt-10">
          <CircuitSimPage />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
