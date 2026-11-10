import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'
import { GenerativeGallery } from '@/components/generative-svg/gallery'
import { STUDIES } from '@/lib/generative-svg/model'

export const metadata: Metadata = {
  title: 'Generative SVG Studies',
  description: 'Mathematical curves, graph constructions and illustrative geometry with configurable ink and transparent SVG export.',
  alternates: { canonical: '/vectors/' },
  openGraph: { type: 'website', title: 'Generative SVG Studies · Ben Ebsworth', description: 'Geometry first, style second. Explore 25 deterministic SVG studies in a tunable drawing lab.', url: '/vectors/', siteName: 'Ben Ebsworth', locale: 'en_AU' },
  twitter: { card: 'summary_large_image', title: 'Generative SVG Studies · Ben Ebsworth', creator: '@benebsworth', site: '@benebsworth' },
}

export default function VectorsPage() {
  return (
    <>
      <JsonLd data={[
        breadcrumbLd([{ name: 'Home', url: `${SITE_URL}/` }, { name: 'SVG studies', url: `${SITE_URL}/vectors/` }]),
        collectionPageLd({ name: 'Generative SVG Studies · Ben Ebsworth', description: metadata.description!, url: `${SITE_URL}/vectors/`, items: STUDIES.map(study => ({ name: study.title, url: `${SITE_URL}/vectors/#${study.id}` })) }),
      ]} />
      <div className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
        <SiteNav />
        <main id="main-content" className="flex-1">
          <div className="mx-auto max-w-[1440px] px-6 pt-6 sm:px-8"><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'SVG studies', href: '/vectors/' }]} /></div>
          <GenerativeGallery />
        </main>
        <SiteFooter />
      </div>
    </>
  )
}
