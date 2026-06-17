import Link from 'next/link'
import { getPublishedPosts } from '@/lib/content'
import { topicFor } from '@/lib/topics'
import { fmtDate } from '@/lib/format'
import { TopicMarker } from '@/components/blog/topic-marker'

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
    <section className="not-prose mt-16 border-t border-fg/10 pt-8">
      <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight text-fg">
        More from the blog
      </h2>
      <div className="flex flex-col gap-4">
        {related.map(p => {
          const topic = topicFor(p)
          return (
            <Link key={p.slug} href={`/blog/${p.slug}/`} className="group block">
              <div className="relative rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] p-6 transition-all duration-200 hover:border-[color-mix(in_srgb,var(--color-blog)_40%,transparent)] sm:p-8">
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
                  style={{ backgroundColor: topic.accent, opacity: 0.65 }}
                />
                <div className="flex flex-col gap-3 pl-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <TopicMarker topic={topic} />
                      <time className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
                        {fmtDate(p.date)}
                      </time>
                    </div>
                    <h3 className="font-display text-xl font-semibold leading-snug tracking-[-0.01em] transition-colors group-hover:text-blog sm:text-2xl">
                      {p.title}
                    </h3>
                    {p.description && (
                      <p className="mt-2 max-w-2xl font-sans text-base leading-7 text-fg/65">
                        {p.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
