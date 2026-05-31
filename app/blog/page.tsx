import Link from 'next/link'
import type { Metadata } from 'next'
import { getPublishedPosts } from '@/lib/content'
import { topicFor } from '@/lib/topics'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Reveal } from '@/components/motion/reveal'
import { AnimatedHeading } from '@/components/motion/animated-heading'
import { SpotlightCard } from '@/components/motion/spotlight-card'
import { TopicMarker } from '@/components/blog/topic-marker'

export const metadata: Metadata = { title: 'Blog' }

const BLOG = '#00e0b8'

function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted">
      <span className="text-blog">{index}</span>
      <span>{children}</span>
      <span className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  )
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d
    .toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase()
}

export default function BlogPage() {
  const posts = getPublishedPosts()
  const [lead, ...rest] = posts

  return (
    <>
      <SiteNav />

      <main className="mx-auto w-full max-w-6xl px-6 pb-32 sm:px-8">
        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="pt-14 pb-20 md:pt-20">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-blog">
              Writing · Platform &amp; cloud-native
            </p>
          </Reveal>
          <AnimatedHeading
            text="Notes from the cluster"
            as="h1"
            className="type-h1 mt-4"
          />
          <Reveal delay={160}>
            <p className="mt-7 max-w-2xl font-sans text-[1.2rem] leading-8 text-fg/70">
              Long-form technical writing on Kubernetes, service mesh, CI/CD and the
              developer experience — worked examples, diagrams, and the occasional algorithm.
            </p>
          </Reveal>
        </section>

        {/* ── Posts ──────────────────────────────────────────────── */}
        <section>
          <SectionLabel index="01">{posts.length} posts</SectionLabel>

          {/* Featured / newest — wide card: a tinted topic panel keyed to the
              post's accent alongside large editorial type. Distinct from the
              compact list rows below to give the page rhythm. */}
          {lead && (() => {
            const topic = topicFor(lead)
            return (
              <Reveal>
                <Link href={`/blog/${lead.slug}/`} className="block rounded-2xl">
                  <SpotlightCard accent={topic.accent} className="overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-[0.85fr_1fr]">
                      {/* topic panel */}
                      <div className="relative grid min-h-[19rem] place-items-center overflow-hidden border-b border-[var(--color-border)] bg-surface md:border-b-0 md:border-r">
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
                      </div>

                      {/* editorial column */}
                      <div className="flex flex-col justify-center p-9 sm:p-12">
                        <div className="flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.22em]">
                          <span className="text-blog">Latest</span>
                          <span className="text-muted">·</span>
                          <span className="text-muted">{fmtDate(lead.date)}</span>
                        </div>
                        <h2 className="type-h2 mt-3">
                          {lead.title}
                        </h2>
                        <p className="mt-4 max-w-lg font-sans text-[1.0625rem] leading-7 text-fg/70">
                          {lead.description}
                        </p>
                        {lead.tags.length > 0 && (
                          <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
                            {lead.tags.slice(0, 5).map((t) => (
                              <span key={t}>#{t}</span>
                            ))}
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

          {/* Remaining posts — compact editorial rows. An accent rail keys each
              row to its topic; the marker chip carries the glyph + label inline,
              so the list stays scannable without a repetitive icon grid. */}
          {rest.length > 0 && (
            <div className="mt-6 space-y-4">
              {rest.map((p, i) => {
                const topic = topicFor(p)
                return (
                  <Reveal key={p.slug} delay={Math.min(i, 6) * 50}>
                    <Link href={`/blog/${p.slug}/`} className="block rounded-xl">
                      <SpotlightCard accent={topic.accent} className="p-6 sm:p-8">
                        {/* accent rail */}
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 w-[3px]"
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
                            <h2 className="font-display text-xl font-semibold leading-snug tracking-[-0.01em] transition-colors group-hover/spot:text-blog sm:text-2xl">
                              {p.title}
                            </h2>
                            <p className="mt-2 max-w-2xl font-sans text-base leading-7 text-fg/65">
                              {p.description}
                            </p>
                          </div>
                          <span
                            aria-hidden
                            className="hidden shrink-0 self-center font-mono text-base text-muted transition-all duration-300 group-hover/spot:translate-x-1 sm:block"
                            style={{ color: `color-mix(in srgb, ${topic.accent} 80%, transparent)` }}
                          >
                            →
                          </span>
                        </div>
                      </SpotlightCard>
                    </Link>
                  </Reveal>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
