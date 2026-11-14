import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld'
import { GroundedDetail } from '@/components/grounded-artwork/detail'
import { GROUNDED_ARTWORK, getGroundedArtwork, groundedArtworkUrl } from '@/lib/grounded-artwork/registry'

export const dynamicParams = false
export function generateStaticParams() { return GROUNDED_ARTWORK.map(a => ({ slug: a.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const artwork = getGroundedArtwork((await params).slug)
  if (!artwork) notFound()
  return { title: `${artwork.title} · Grounded Forms`, description: artwork.caption, alternates: { canonical: groundedArtworkUrl(artwork) }, openGraph: { title: artwork.title, description: artwork.caption, url: groundedArtworkUrl(artwork), type: 'website', images: [{ url: artwork.variants.light.preview, width: 960, height: 960, alt: artwork.title }] }, twitter: { card: 'summary_large_image', title: artwork.title, description: artwork.caption, images: [artwork.variants.light.preview] } }
}
export default async function GroundedArtworkPage({ params }: { params: Promise<{ slug: string }> }) {
  const artwork = getGroundedArtwork((await params).slug)
  if (!artwork) notFound()
  const url = `${SITE_URL}${groundedArtworkUrl(artwork)}`
  return <>
    <JsonLd data={[
      breadcrumbLd([{ name: 'Home', url: `${SITE_URL}/` }, { name: 'Asset library', url: `${SITE_URL}/vectors/` }, { name: 'Grounded forms', url: `${SITE_URL}/vectors/grounded/` }, { name: artwork.title, url }]),
      { '@context': 'https://schema.org', '@type': 'VisualArtwork', name: artwork.title, description: artwork.caption, url, image: `${SITE_URL}${artwork.variants.light.preview}`, artform: 'SVG illustration', identifier: artwork.sourceId, version: String(artwork.revision), citation: artwork.sources.map(s => s.url) },
    ]} />
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-fg)] print:bg-white print:text-black" data-pagefind-ignore><div className="print:hidden"><SiteNav /></div><main id="main-content" className="flex-1"><div className="print:hidden"><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Asset library', href: '/vectors/' }, { label: 'Grounded forms', href: '/vectors/grounded/' }, { label: artwork.title, href: groundedArtworkUrl(artwork) }]} /></div><GroundedDetail artwork={artwork} /></main><div className="print:hidden"><SiteFooter /></div></div>
  </>
}
