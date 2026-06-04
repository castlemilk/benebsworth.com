import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'
import { getPublishedPosts, getPost } from '@/lib/content'
import { topicFor } from '@/lib/topics'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'Blog post'

export function generateStaticParams() {
  return getPublishedPosts().map((p) => ({ slug: p.slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = getPost(slug)
  const topic = p ? topicFor(p) : { label: 'Engineering', accent: '#7c5cff' }
  const date = p
    ? new Date(p.date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''
  return renderOgCard({
    eyebrow: topic.label,
    title: p?.title ?? 'Ben Ebsworth',
    footer: date,
    accent: topic.accent,
  })
}
