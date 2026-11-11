import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'
import { GenerativeGallery } from '@/components/generative-svg/gallery'
import { studyUrl } from '@/lib/generative-svg/registry'
import { ARTWORK, artworkUrl } from '@/lib/editorial-artwork/registry'
import { STUDIES } from '@/lib/generative-svg/model'

export const metadata: Metadata = {
  title: 'SVG Studies & Editorial Artwork',
  description: 'Tunable mathematical SVG studies and generated editorial PNG artwork, with searchable tags and transparent downloads.',
  alternates: { canonical: '/vectors/' },
  openGraph: { type: 'website', title: 'SVG Studies & Editorial Artwork · Ben Ebsworth', description: `Geometry first, style second. Explore ${STUDIES.length} tunable SVG studies and ${ARTWORK.length} transparent PNG illustrations.`, url: '/vectors/', siteName: 'Ben Ebsworth', locale: 'en_AU' },
  twitter: { card: 'summary_large_image', title: 'SVG Studies & Editorial Artwork · Ben Ebsworth', creator: '@benebsworth', site: '@benebsworth' },
}

export default function VectorsPage() {
  return (
    <>
      <JsonLd data={[
        breadcrumbLd([{ name: 'Home', url: `${SITE_URL}/` }, { name: 'Asset library', url: `${SITE_URL}/vectors/` }]),
        collectionPageLd({ name: 'SVG Studies & Editorial Artwork · Ben Ebsworth', description: metadata.description!, url: `${SITE_URL}/vectors/`, items: [...STUDIES.map(study => ({ name: study.title, url: `${SITE_URL}${studyUrl(study)}` })), ...ARTWORK.map(asset => ({ name: `${asset.title} (PNG artwork)`, url: `${SITE_URL}${artworkUrl(asset)}` }))] }),
      ]} />
      <div className="vectors-library flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
        <SiteNav />
        <main id="main-content" className="flex-1">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Asset library', href: '/vectors/' }]} />
          <GenerativeGallery />
        </main>
        <SiteFooter />
      </div>
    </>
  )
}
