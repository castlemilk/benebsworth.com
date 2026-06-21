'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { TOPIC, topicFor } from '@/lib/topics'
import type { BlogPostSummary } from '@/lib/content'
import { tagColor } from '@/lib/tag-colors'
import { fmtDate } from '@/lib/format'
import { Reveal } from '@/components/motion/reveal'
import { SpotlightCard } from '@/components/motion/spotlight-card'
import { BlogFilter, type BlogFilterItem } from '@/components/blog/blog-filter'
import { BlogPostCard } from '@/components/blog/blog-post-card'

const TOPIC_ACCENT_REVERSE: Record<string, string> = {}
for (const [key, t] of Object.entries(TOPIC)) {
  TOPIC_ACCENT_REVERSE[t.label] = key
}

function topicKey(post: BlogPostSummary): string {
  const t = topicFor(post)
  return TOPIC_ACCENT_REVERSE[t.label] ?? 'technology'
}

export function BlogContent({ posts }: { posts: BlogPostSummary[] }) {
  const [query, setQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState<string | null>(null)

  const navItems: BlogFilterItem[] = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of posts) {
      const k = topicKey(p)
      counts[k] = (counts[k] ?? 0) + 1
    }
    return Object.entries(TOPIC)
      .filter(([key]) => counts[key] > 0)
      .map(([key, t]) => ({
        key,
        label: t.label,
        accent: t.accent,
        count: counts[key] ?? 0,
      }))
      .sort((a, b) => b.count - a.count)
  }, [posts])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let results = posts
    if (q) {
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    if (topicFilter) {
      results = results.filter((p) => topicKey(p) === topicFilter)
    }
    if (!q && !topicFilter) return null
    return results
  }, [query, topicFilter, posts])

  const filterLabel = (() => {
    const parts: string[] = []
    if (query) parts.push(`"${query}"`)
    if (topicFilter) {
      const t = Object.values(TOPIC).find((t) => TOPIC_ACCENT_REVERSE[t.label] === topicFilter)
      if (t) parts.push(t.label)
    }
    return parts.join(' · ')
  })()

  const [lead, ...rest] = posts

  return (
    <>
      <BlogFilter
        topics={navItems}
        searchQuery={query}
        onSearchChange={setQuery}
        activeTopic={topicFilter}
        onTopicChange={setTopicFilter}
      />

      {filtered !== null ? (
        <section className="pt-16">
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              {filterLabel && <> for {filterLabel}</>}
            </p>
          </div>
          {filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((p, i) => (
                <BlogPostCard key={p.slug} post={p} index={i} />
              ))}
            </div>
          ) : (
            <p className="font-sans text-base leading-7 text-muted">
              No posts match your search. Try a different term or topic.
            </p>
          )}
        </section>
      ) : (
        <section>
          {lead && (() => {
            const topic = topicFor(lead)
            return (
              <Reveal>
                <Link href={`/blog/${lead.slug}/`} className="block rounded-2xl">
                  <SpotlightCard accent={topic.accent} className="overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-[0.85fr_1fr]">
                      <div className="relative grid min-h-[19rem] place-items-center overflow-hidden border-b border-[var(--color-border)] bg-surface md:border-b-0 md:border-r">
                        {lead.heroImage ? (
                          <img
                            src={lead.heroImage}
                            alt={lead.title}
                            fetchPriority="high"
                            loading="eager"
                            decoding="async"
                            className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-500 group-hover/spot:scale-105 group-hover/spot:opacity-100"
                          />
                        ) : (
                          <>
                            <span
                              aria-hidden
                              className="absolute inset-0"
                              style={{
                                background: `radial-gradient(75% 70% at 50% 36%, color-mix(in srgb, ${topic.accent} 22%, transparent), transparent 72%)`,
                              }}
                            />
                            <span
                              aria-hidden
                              className="absolute inset-0 opacity-[0.4]"
                              style={{
                                backgroundImage:
                                  'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
                                backgroundSize: '28px 28px',
                                maskImage:
                                  'radial-gradient(70% 70% at 50% 50%, black, transparent 75%)',
                              }}
                            />
                            <div className="relative flex flex-col items-center gap-4">
                              <img
                                src={topic.icon}
                                alt=""
                                aria-hidden
                                width={112}
                                height={112}
                                className="object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
                                style={{ width: 112, height: 112 }}
                              />
                              <span
                                className="accent-ink font-mono text-[0.62rem] uppercase tracking-[0.28em]"
                                style={{ '--ink': topic.accent } as React.CSSProperties}
                              >
                                {topic.label}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col justify-center p-9 sm:p-12">
                        <div className="flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.22em]">
                          <span className="text-blog">Latest</span>
                          <span className="text-muted">·</span>
                          <span className="text-muted">{fmtDate(lead.date)}</span>
                          {lead.readingTime ? (
                            <>
                              <span className="text-muted">·</span>
                              <span className="text-muted">{lead.readingTime} min read</span>
                            </>
                          ) : null}
                        </div>
                        <h2 className="type-h2 mt-3">
                          {lead.title}
                        </h2>
                        <p className="mt-4 max-w-lg font-sans text-[1.0625rem] leading-7 text-fg/70">
                          {lead.description}
                        </p>
                        {lead.tags.length > 0 && (
                          <div className="mt-5 flex flex-wrap gap-1.5">
                            {lead.tags.slice(0, 5).map((t) => {
                              const c = tagColor(t)
                              return (
                                <span
                                  key={t}
                                  className="accent-ink rounded-full border px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider"
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
                        <span className="mt-7 inline-flex items-center gap-2 font-mono text-sm text-blog">
                          Read post
                          <span className="transition-transform duration-300 group-hover/spot:translate-x-1">
                            →
                          </span>
                        </span>
                      </div>
                    </div>
                  </SpotlightCard>
                </Link>
              </Reveal>
            )
          })()}

          {rest.length > 0 && (
            <div className="mt-6 space-y-4">
              {rest.map((p, i) => (
                <BlogPostCard key={p.slug} post={p} index={i} />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  )
}
