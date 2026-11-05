import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE, publicOgImageDataUri } from '@/lib/og'
import { hikeImagery } from '@/content/hiking-imagery'
import { hikes, getHike } from '@/content/hiking'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'Hike · Ben Ebsworth'

export function generateStaticParams() {
  return hikes.map((h) => ({ slug: h.slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const h = getHike(slug)
  // The same verified photograph or explicitly illustrated cover as the page.
  const backgroundUri = h ? await publicOgImageDataUri(hikeImagery(h).src, { width: 1200, height: 630, fit: 'cover' }) : undefined
  return renderOgCard({
    eyebrow: h ? (h.status === 'planned' ? 'Hiking · Planned' : `Hiking · ${h.year}`) : 'Hiking',
    title: h?.name ?? 'Hike',
    description: h ? `${h.region} · ${h.country} · ${hikeImagery(h).kind === 'photograph' ? 'Photograph' : 'Illustration'}` : undefined,
    footer: h ? `${h.distanceKm} km · ${h.days} days · ${h.maxAltitudeM.toLocaleString()} m` : 'benebsworth.com',
    accent: h?.accent ?? '#5b9e6f',
    glyph: backgroundUri ? undefined : '⛰',
    backgroundUri,
  })
}
