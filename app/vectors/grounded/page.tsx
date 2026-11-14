import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'
import { GroundedCollection } from '@/components/grounded-artwork/collection'
import { GROUNDED_ARTWORK, groundedArtworkUrl, groundedCards } from '@/lib/grounded-artwork/registry'

export const metadata: Metadata = {
  title: 'Grounded Forms · Fixed Authored SVG Plates',
  description: 'Transparent authored SVG plates with light, dark and monochrome palettes, scientific basis, sources and clear limitations.',
  alternates: { canonical: '/vectors/grounded/' },
  openGraph: { title: 'Grounded Forms · Fixed Authored SVG Plates', description: 'Transparent authored SVG plates with scientific basis, sources and clear limitations.', url: '/vectors/grounded/', type: 'website' },
}
export default function GroundedPage() {
  return <>
    <JsonLd data={[
      breadcrumbLd([{ name: 'Home', url: `${SITE_URL}/` }, { name: 'Asset library', url: `${SITE_URL}/vectors/` }, { name: 'Grounded forms', url: `${SITE_URL}/vectors/grounded/` }]),
      collectionPageLd({ name: 'Grounded forms', description: metadata.description!, url: `${SITE_URL}/vectors/grounded/`, items: GROUNDED_ARTWORK.map(a => ({ name: a.title, url: `${SITE_URL}${groundedArtworkUrl(a)}` })) }),
    ]} />
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-fg)]" data-pagefind-ignore><SiteNav /><main id="main-content" className="flex-1"><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Asset library', href: '/vectors/' }, { label: 'Grounded forms', href: '/vectors/grounded/' }]} /><GroundedCollection cards={groundedCards()} /></main><SiteFooter /></div>
  </>
}
