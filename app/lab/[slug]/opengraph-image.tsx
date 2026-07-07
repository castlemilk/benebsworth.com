import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE, publicDataUri, publicOgImageDataUri } from '@/lib/og'
import { LAB_EFFECTS, getEffect } from '@/lib/lab/registry'
import { labPosterFor } from '@/lib/lab/posters'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
// Default alt for pages where we don't have a slug-specific override.
// The ImageResponse below is the actual generator; alt is a top-level
// export so it can be picked up by Next's metadata pipeline.
export const alt = 'Lab effect on benebsworth.com'

/**
 * Per-lab-effect OpenGraph card. The card uses the effect's title, blurb,
 * category, and category accent. A small SVG glyph (one of the category
 * icons: ∫ ψ Ω ◆) provides a visual marker that lines up with the lab
 * index. We embed a topic-icon PNG as a base64 data URI when available.
 *
 * Each image is a function of the slug, so `generateStaticParams` is
 * required to enumerate them at build time (Next needs this for
 * `output: 'export'`).
 */
export function generateStaticParams() {
  return LAB_EFFECTS.map((e) => ({ slug: e.slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const e = getEffect(slug)
  if (!e) {
    return renderOgCard({
      eyebrow: 'benebsworth.com/lab',
      title: 'Lab',
      footer: 'Interactive simulations · Ben Ebsworth',
      accent: '#7c5cff',
    })
  }

  // Category accent, glyph, and label.
  const accent: Record<string, string> = {
    art: '#00e0b8',
    maths: '#7c5cff',
    physics: '#ff7a59',
    engineering: '#00b4d8',
    ai: '#a855f7',
    cosmology: '#6366f1',
  }
  const glyph: Record<string, string> = {
    art: '◆',
    maths: '∫',
    physics: 'ψ',
    engineering: 'Ω',
    ai: '✦',
    cosmology: '✷',
  }
  const iconPath = 'topics/technology.png'
  const poster = labPosterFor(e.slug)
  const posterUri = poster
    ? await publicOgImageDataUri(poster, { width: 1200, height: 630, fit: 'cover' })
    : undefined

  return renderOgCard({
    eyebrow: `Lab · ${e.category}`,
    title: e.title,
    description: e.blurb,
    footer: 'benebsworth.com/lab',
    accent: accent[e.category] ?? '#7c5cff',
    glyph: glyph[e.category],
    iconDataUri: publicDataUri(iconPath, 'image/png'),
    tags: e.tags.slice(0, 4),
    backgroundUri: posterUri,
  })
}
