import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'
import { LAB_EFFECTS, getEffect } from '@/lib/lab/registry'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'Lab experiment · Ben Ebsworth'

export function generateStaticParams() {
  return LAB_EFFECTS.map((e) => ({ slug: e.slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const e = getEffect(slug)
  return renderOgCard({
    eyebrow: 'Lab · Experiment',
    title: e?.title ?? 'Experiment',
    footer: e?.tags?.join('  ·  ') || 'Generative',
    accent: '#7c5cff',
  })
}
