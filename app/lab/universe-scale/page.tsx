import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd, authorLd } from '@/components/seo/json-ld'
import { UniverseScaleStudio } from '@/components/lab/universe-scale/universe-scale-studio'

export const metadata: Metadata = {
  title: 'Universe Scale · Lab',
  description:
    'An interactive logarithmic zoom from the Planck length to the observable universe — ant, human, whale, skyscraper, Mount Everest, Earth, Sun, galaxy, and beyond. Scroll or drag to travel 62 orders of magnitude.',
  alternates: { canonical: '/lab/universe-scale/' },
  openGraph: {
    type: 'website',
    title: 'Universe Scale · Lab · Ben Ebsworth',
    description: 'Zoom from the Planck length to the observable universe — 62 orders of magnitude on one slider.',
    url: '/lab/universe-scale/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Universe Scale · Lab',
    creator: '@benebsworth',
    site: '@benebsworth',
  },
}

export default function UniverseScalePageRoute() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Lab', url: `${SITE_URL}/lab/` },
            { name: 'Universe Scale', url: `${SITE_URL}/lab/universe-scale/` },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Universe Scale',
            description:
              'Interactive logarithmic zoom across 62 orders of magnitude, from the Planck length to the observable universe.',
            url: `${SITE_URL}/lab/universe-scale/`,
            applicationCategory: 'EducationalApplication',
            applicationSubCategory: 'Cosmology',
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
            { label: 'Universe Scale' },
          ]}
        />
        <div className="mt-6 flex items-center gap-3">
          <span className="inline-block font-mono text-lg" style={{ color: '#6366f1' }}>✷</span>
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-fg)]/50">
            Cosmology
          </span>
        </div>
        <h1 className="mt-3 type-h1">Universe Scale</h1>
        <p className="mt-3 max-w-prose type-body text-[var(--color-fg)]/70">
          Sixty-two orders of magnitude on one slider. Scroll, drag, or hit play to travel from the
          Planck length up through an ant, a whale, Mount Everest, the Earth, the Sun, and out to the
          edge of the observable universe. Watch for the ◇ markers, where the scale touches the
          physics behind the black-hole-universe essay.
        </p>
        <div className="mt-10">
          <UniverseScaleStudio height={560} />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
