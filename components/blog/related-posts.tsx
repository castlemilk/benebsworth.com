import { getPublishedPosts } from '@/lib/content'
import { ReadingEntry } from '@/components/blog/reading-entry'

export function RelatedPosts({ currentSlug, tags, limit = 3 }: {
  currentSlug: string
  tags: string[]
  limit?: number
}) {
  const allPosts = getPublishedPosts().filter(p => p.slug !== currentSlug)
  
  // Score posts by tag overlap
  const scored = allPosts.map(p => {
    let score = 0
    for (const t of p.tags) {
      if (tags.includes(t)) score++
    }
    return { post: p, score }
  })
  
  // Sort by score desc, then by date desc
  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    return new Date(b.post.date).getTime() - new Date(a.post.date).getTime()
  })
  
  const related = scored.slice(0, limit).map(s => s.post)
  
  if (related.length === 0) return null

  return (
    <section className="related-writing not-prose" aria-labelledby="related-writing-heading">
      <h2 id="related-writing-heading" className="related-writing__title">More from the blog</h2>
      <div className="related-writing__entries">
        {related.map(post => (
          <ReadingEntry key={post.slug} post={post} headingLevel="h3" />
        ))}
      </div>
    </section>
  )
}
