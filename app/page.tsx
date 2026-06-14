import type { Metadata } from 'next'
import Link from 'next/link'
import { GridNav } from '@/components/landing/grid-nav'
import { LabMatrix } from '@/components/landing/lab-matrix'
import { getPublishedPosts } from '@/lib/content'
import { topicFor } from '@/lib/topics'
import { JsonLd, personLd, websiteLd } from '@/components/seo/json-ld'

export const metadata: Metadata = {
  description:
    'Ben Ebsworth — software, platform & hardware engineer in Melbourne, Australia. Writing, projects and generative experiments across Kubernetes, distributed systems, embedded hardware and AI.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    title: 'Ben Ebsworth — Software, Platform & Hardware Engineer',
    description: 'Software, platform & hardware engineer · AI-native · Melbourne, Australia.',
    url: '/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ben Ebsworth — Software, Platform & Hardware Engineer',
    description: 'Software, platform & hardware engineer · AI-native · Melbourne, Australia.',
    creator: '@benebsworth',
      site: '@benebsworth',
  },
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

export default function Home() {
  const posts = getPublishedPosts().slice(0, 3)
  const latest = posts[0] ?? null
  return (
    <>
      <JsonLd data={[personLd, websiteLd]} />
      {/* GridNav is a full-viewport hero with its own <main> and the
          theme toggle. The lab matrix sits below it as a normal-flow
          section, so we close GridNav's main and start a new section
          outside it. */}
      <GridNav latest={latest ? { title: latest.title, href: `/blog/${latest.slug}/` } : null} />

      {/* ── Latest writing ──────────────────────────────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-12 sm:px-8">
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="font-display text-[clamp(1.4rem,1.1rem+1vw,1.85rem)] font-semibold tracking-[-0.015em] text-fg/90">
            Latest writing
          </h2>
          <Link
            href="/blog/"
            className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-fg/85"
          >
            All posts →
          </Link>
        </header>
        <div className="space-y-4">
          {posts.map((p) => {
            const topic = topicFor(p)
            return (
              <Link key={p.slug} href={`/blog/${p.slug}/`} className="group block">
                <div className="relative rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] p-6 transition-all duration-200 hover:border-[color-mix(in_srgb,var(--color-blog)_40%,transparent)] hover:shadow-[0_8px_30px_-12px_rgba(0,224,184,0.15)] sm:p-8">
                  {/* accent rail */}
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
                    style={{ backgroundColor: topic.accent, opacity: 0.65 }}
                  />
                  <div className="relative z-10 flex flex-col gap-3 pl-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <span
                          className="inline-flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.18em]"
                          style={{ color: topic.accent }}
                        >
                          {topic.label}
                        </span>
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
                    {p.heroImage ? (
                      <div className="mt-4 shrink-0 sm:ml-6 sm:mt-0">
                        <div className="relative h-24 w-32 overflow-hidden rounded-lg border border-[var(--color-border)] bg-black/20 sm:h-28 sm:w-40">
                          <img
                            src={p.heroImage}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-110 group-hover:opacity-100"
                          />
                        </div>
                      </div>
                    ) : (
                      <span
                        aria-hidden
                        className="hidden shrink-0 self-center font-mono text-base text-muted transition-all duration-300 group-hover:translate-x-1 sm:block"
                        style={{ color: `color-mix(in srgb, ${topic.accent} 80%, transparent)` }}
                      >
                        →
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── Lab matrix ─────────────────────────────────────────────
          A 2x3 grid of randomly selected, fully working lab effects,
          rotated daily. Each tile is a click-through to its full lab
          page. The matrix serves as a portfolio of the kinds of
          physics/math/engineering simulations the site hosts. */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-24 pt-12 sm:px-8">
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="font-display text-[clamp(1.4rem,1.1rem+1vw,1.85rem)] font-semibold tracking-[-0.015em] text-fg/90">
            From the lab
          </h2>
          <Link
            href="/lab/"
            className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-fg/85"
          >
            All 30+ effects →
          </Link>
        </header>
        <p className="mb-6 max-w-2xl font-sans text-[0.95rem] leading-6 text-fg/65">
          Small, working simulations — drag the controls on the full pages, or just watch the previews cycle here. The selection rotates daily.
        </p>
        <LabMatrix count={6} />
      </section>
    </>
  )
}
