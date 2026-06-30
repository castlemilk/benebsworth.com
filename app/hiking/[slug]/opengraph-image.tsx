import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE, repoFileDataUri } from '@/lib/og'
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
  // per-hike painterly art (brandbrain) if present, else the stat-card fallback
  const backgroundUri = repoFileDataUri(`og-art/hike/${slug}.jpg`, 'image/jpeg')
  return renderOgCard({
    eyebrow: h ? (h.status === 'planned' ? 'Hiking · Planned' : `Hiking · ${h.year}`) : 'Hiking',
    title: h?.name ?? 'Hike',
    description: h ? `${h.region} · ${h.country}` : undefined,
    footer: h ? `${h.distanceKm} km · ${h.days} days · ${h.maxAltitudeM.toLocaleString()} m` : 'benebsworth.com',
    accent: h?.accent ?? '#5b9e6f',
    glyph: backgroundUri ? undefined : '⛰',
    backgroundUri,
  })
}
