import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd, authorLd } from '@/components/seo/json-ld'
import { BlackHoleStudio } from '@/components/lab/black-hole-sim/black-hole-studio'

export const metadata: Metadata = {
  title: 'Black Hole Ray Tracer · Lab',
  description:
    'A general-relativistic ray tracer running live in your browser: per-pixel null geodesics around a Schwarzschild black hole, a physically-shaded Shakura–Sunyaev accretion disk, Doppler beaming, and live EHT-scale readouts for Sgr A*, M87*, and more.',
  alternates: { canonical: '/lab/black-hole-sim/' },
  openGraph: {
    type: 'website',
    title: 'Black Hole Ray Tracer · Lab · Ben Ebsworth',
    description:
      'Per-pixel null geodesics around a Schwarzschild black hole — lensed accretion disk, photon ring, Doppler beaming, and live EHT-scale readouts.',
    url: '/lab/black-hole-sim/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Black Hole Ray Tracer · Lab',
    creator: '@benebsworth',
    site: '@benebsworth',
  },
}

export default function BlackHoleSimPageRoute() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Lab', url: `${SITE_URL}/lab/` },
            { name: 'Black Hole Ray Tracer', url: `${SITE_URL}/lab/black-hole-sim/` },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Black Hole Ray Tracer',
            description:
              'General-relativistic ray tracer: per-pixel null geodesics around a Schwarzschild black hole, with a physically-shaded accretion disk, Doppler beaming, and live EHT-scale readouts.',
            url: `${SITE_URL}/lab/black-hole-sim/`,
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
            { label: 'Black Hole Ray Tracer' },
          ]}
        />
        <div className="mt-6 flex items-center gap-3">
          <span className="inline-block font-mono text-lg" style={{ color: '#6366f1' }}>✷</span>
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-fg)]/50">
            Cosmology
          </span>
        </div>
        <h1 className="mt-3 type-h1">Black Hole Ray Tracer</h1>
        <p className="mt-3 max-w-prose type-body text-[var(--color-fg)]/70">
          Every pixel fires a photon backwards through curved spacetime: the exact Schwarzschild
          null-geodesic equation, integrated per-pixel with RK4, bends each ray around the hole —
          producing the shadow, the photon ring, and the lensed far side of the accretion disk with
          no tricks. Drag to orbit, scroll to approach, and switch presets to see Sgr A* or M87* at
          the angular size the Event Horizon Telescope actually measured.
        </p>
        <div className="mt-10">
          <BlackHoleStudio />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
