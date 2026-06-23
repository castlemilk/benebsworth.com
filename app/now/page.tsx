import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { Reveal } from '@/components/motion/reveal'
import { AnimatedHeading } from '@/components/motion/animated-heading'
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld'

// ─────────────────────────────────────────────────────────────────────────────
// A /now page (the nownownow.com convention): what I'm focused on at this point
// in time — not a feed, just the handful of things that are front-of-mind.
// EDIT the entries below and bump UPDATED / UPDATED_ISO whenever your focus moves.
// ─────────────────────────────────────────────────────────────────────────────
const UPDATED = 'June 2026'
const UPDATED_ISO = '2026-06-01'

const link = 'underline decoration-fg/30 underline-offset-4 transition-colors hover:decoration-fg/70'

const NOW: { label: string; accent: string; body: React.ReactNode }[] = [
  {
    label: 'Work',
    accent: 'var(--color-about)',
    body: (
      <>
        Senior Software Engineer at <strong className="font-semibold text-fg/90">Atlassian</strong>, in
        the Micros platform team — building and operating the internal platform, developer tooling and
        orchestration that thousands of Atlassian services deploy and run on, on top of AWS.
      </>
    ),
  },
  {
    label: 'Building',
    accent: 'var(--color-blog)',
    body: (
      <>
        Pouring spare cycles into this site — an{' '}
        <Link href="/lab/" className={link}>interactive lab</Link> of parameterised simulations and a
        from-scratch <Link href="/lab/circuit-sim/" className={link}>circuit simulator</Link>. Each lab
        piece is a working model you can drag, tune and share.
      </>
    ),
  },
  {
    label: 'Going deep on',
    accent: 'var(--color-project)',
    body: (
      <>
        AI-native engineering — treating LLMs, agents and MCP as core toolchain rather than a bolt-on.
        Coding agents, retrieval, and evals, pointed at real production work.
      </>
    ),
  },
  {
    label: 'Writing',
    accent: 'var(--color-about)',
    body: (
      <>
        Long-form essays on the <Link href="/blog/" className={link}>blog</Link> — distributed systems,
        signal processing, and the physics hiding inside everyday things. The lab sketches are usually
        where a post starts.
      </>
    ),
  },
]

export const metadata: Metadata = {
  title: 'Now',
  description:
    "What Ben Ebsworth is focused on right now — current work at Atlassian, what he's building in the lab, going deep on, and writing. A periodically-updated snapshot.",
  alternates: { canonical: '/now/' },
  openGraph: {
    type: 'website',
    title: 'Now · Ben Ebsworth',
    description: "A snapshot of what I'm focused on right now — work, building, learning and writing.",
    url: '/now/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: { card: 'summary_large_image', title: 'Now · Ben Ebsworth', creator: '@benebsworth', site: '@benebsworth' },
}

export default function NowPage() {
  const ld = [
    breadcrumbLd([
      { name: 'Home', url: `${SITE_URL}/` },
      { name: 'Now', url: `${SITE_URL}/now/` },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Now · Ben Ebsworth',
      url: `${SITE_URL}/now/`,
      description: "What Ben Ebsworth is focused on right now — work, building, learning and writing.",
      dateModified: UPDATED_ISO,
    },
  ]

  return (
    <>
      <JsonLd data={ld} />
      <SiteNav />

      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-32 sm:px-8">
        <Breadcrumb className="pt-8 sm:pt-10" items={[{ label: 'Home', href: '/' }, { label: 'Now' }]} />

        <section className="pt-8 pb-12 md:pt-10">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-about">Now · Updated {UPDATED}</p>
          </Reveal>
          <AnimatedHeading text="What I'm doing now" as="h1" className="type-h1 mt-4" />
          <Reveal delay={160}>
            <p className="mt-7 max-w-2xl font-sans text-[1.2rem] leading-8 text-fg/70">
              A snapshot of where my attention is right now — not a status feed, just the handful of
              things that are front-of-mind this season.
            </p>
          </Reveal>
        </section>

        <div className="max-w-2xl">
          {NOW.map((s, i) => (
            <Reveal key={s.label} delay={i * 60}>
              <section className="border-t border-[var(--color-border)] py-7">
                <h2
                  className="accent-ink font-mono text-[0.7rem] uppercase tracking-[0.22em]"
                  style={{ '--ink': s.accent } as React.CSSProperties}
                >
                  {s.label}
                </h2>
                <p className="mt-3 font-sans text-[1.0625rem] leading-8 text-fg/80">{s.body}</p>
              </section>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <p className="mt-12 max-w-2xl border-t border-[var(--color-border)] pt-7 font-sans text-sm leading-7 text-muted">
            This is a{' '}
            <a href="https://nownownow.com/about" target="_blank" rel="noreferrer" className={link}>
              now page
            </a>{' '}
            — an idea from Derek Sivers. Curious what I&rsquo;m building longer-term? See{' '}
            <Link href="/projects/" className={link}>projects</Link>, or{' '}
            <Link href="/uses/" className={link}>what I use</Link> to make it.
          </p>
        </Reveal>
      </main>

      <SiteFooter />
    </>
  )
}
