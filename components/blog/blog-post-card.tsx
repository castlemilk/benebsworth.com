'use client'
import Link from 'next/link'
import type { BlogPostSummary } from '@/lib/content'
import { tagColor } from '@/lib/tag-colors'
import { topicFor } from '@/lib/topics'
import { fmtDate } from '@/lib/format'
import { Reveal } from '@/components/motion/reveal'
import { SpotlightCard } from '@/components/motion/spotlight-card'
import { TopicMarker } from '@/components/blog/topic-marker'

export function BlogPostCard({ post, index = 0 }: { post: BlogPostSummary; index?: number }) {
  const topic = topicFor(post)
  return (
    <Reveal delay={Math.min(index, 6) * 50}>
      <Link href={`/blog/${post.slug}/`} className="block rounded-xl">
        <SpotlightCard accent={topic.accent} className="overflow-hidden p-6 sm:p-8">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 z-10 w-[3px]"
            style={{ backgroundColor: topic.accent, opacity: 0.65 }}
          />
          <div className="relative z-10 flex flex-col gap-3 pl-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <TopicMarker topic={topic} />
                <time className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
                  {fmtDate(post.date)}
                </time>
              </div>
              <h2 className="font-display text-xl font-semibold leading-snug tracking-[-0.01em] transition-colors group-hover/spot:text-blog sm:text-2xl">
                {post.title}
              </h2>
              <p className="mt-2 max-w-2xl font-sans text-base leading-7 text-fg/65">
                {post.description}
              </p>
              {post.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {post.tags.slice(0, 4).map((t) => {
                    const c = tagColor(t)
                    return (
                      <span
                        key={t}
                        className="accent-ink rounded-full border px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-wider"
                        style={{
                          '--ink': c,
                          borderColor: `color-mix(in srgb, ${c} 40%, transparent)`,
                          backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)`,
                        } as React.CSSProperties}
                      >
                        {t}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
            {post.heroImage ? (
              <div className="mt-4 shrink-0 sm:ml-6 sm:mt-0">
                <div className="relative h-24 w-32 overflow-hidden rounded-lg border border-[var(--color-border)] bg-black/20 sm:h-28 sm:w-40">
                  <img
                    src={post.heroImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover/spot:scale-110 group-hover/spot:opacity-100"
                  />
                </div>
              </div>
            ) : (
              <span
                aria-hidden
                className="hidden shrink-0 self-center font-mono text-base text-muted transition-all duration-300 group-hover/spot:translate-x-1 sm:block"
                style={{ color: `color-mix(in srgb, ${topic.accent} 80%, transparent)` }}
              >
                →
              </span>
            )}
          </div>
        </SpotlightCard>
      </Link>
    </Reveal>
  )
}
