import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd, authorLd } from '@/components/seo/json-ld'
import { CarbonEmbed } from './carbon-embed'

export const metadata: Metadata = {
  title: 'Carbon Capture Research · Lab',
  description:
    'A live research platform mapping the carbon-capture pathway landscape: 24 pathways across five settings, compared on cited cost, energy, and TRL ranges.',
  alternates: { canonical: '/lab/carbon/' },
  openGraph: {
    type: 'website',
    title: 'Carbon Capture Research · Lab · Ben Ebsworth',
    description:
      'The carbon-capture landscape compared on cited cost, energy, and TRL ranges. Live literature and a decision workspace included.',
    url: '/lab/carbon/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carbon Capture Research · Lab',
    creator: '@benebsworth',
    site: '@benebsworth',
  },
}

export default function CarbonLabPageRoute() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Lab', url: `${SITE_URL}/lab/` },
            { name: 'Carbon Capture Research', url: `${SITE_URL}/lab/carbon/` },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Carbon Capture Research',
            description:
              'Research platform mapping the carbon-capture pathway landscape: 24 pathways with cited metric ranges, live OpenAlex literature, AlphaFold structures, and a shortlist/journal convergence workspace.',
            url: `${SITE_URL}/lab/carbon/`,
            applicationCategory: 'EducationalApplication',
            applicationSubCategory: 'Climate Technology',
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
            { label: 'Carbon Capture Research' },
          ]}
        />
        <div className="mt-6 flex items-center gap-3">
          <span className="inline-block font-mono text-lg" style={{ color: '#34d399' }}>◍</span>
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-fg)]/50">
            Climate Technology
          </span>
        </div>
        <h1 className="mt-3 type-h1">Carbon Capture Research</h1>
        <p className="mt-3 max-w-prose type-body text-[var(--color-fg)]/70">
          A living map of the carbon-capture landscape: every pathway — from MEA
          scrubbing to MOF sorbents, electro-sorption, ocean alkalinity, and
          enzymatic capture — plotted against its peers with{' '}
          <em>cited</em> cost, energy, and technology-readiness ranges rather
          than single-point claims. Drill into any pathway for the mechanism,
          the materials behind it (including AlphaFold-predicted enzyme
          structures), and its recent literature. The Decision Space at the
          bottom of the sidebar exists to converge: shortlist what survives,
          record why the rest were eliminated.
        </p>
        <p className="mt-2 max-w-prose type-body text-sm text-[var(--color-fg)]/50">
          Embedded below in microfrontend mode. It also runs standalone. Your
          shortlist and notes persist server-side, not in this browser.
        </p>
        <div className="mt-10">
          <CarbonEmbed />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
