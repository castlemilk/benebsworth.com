import { renderBlogOgCard, publicDataUri, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'
import { getPublishedPosts, getPost } from '@/lib/content'
import { topicFor } from '@/lib/topics'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
// The `alt` export drives the `og:image:alt` meta tag. Use the post's
// title + topic for a useful screen-reader description.
export const alt = 'Blog post on benebsworth.com'

export function generateStaticParams() {
  return getPublishedPosts().map((p) => ({ slug: p.slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = getPost(slug)
  const topic = p ? topicFor(p) : { label: 'Engineering', accent: '#7c5cff', icon: '/topics/technology.png' }
  const dateText = p
    ? new Date(p.date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''
  return renderBlogOgCard({
    title: p?.title ?? 'Ben Ebsworth',
    description: p?.description,
    topicLabel: topic.label,
    dateText,
    accent: topic.accent,
    iconUri: publicDataUri(topic.icon, 'image/png'),
    authorUri: publicDataUri('about/portrait.jpg', 'image/jpeg'),
  })
}
