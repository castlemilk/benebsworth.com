import type { Metadata } from 'next'
import Link from 'next/link'
import { GridNav } from '@/components/landing/grid-nav'
import { LabMatrix } from '@/components/landing/lab-matrix'
import { getLatestPost } from '@/lib/content'
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

export default function Home() {
  const latest = getLatestPost()
  return (
    <>
      <JsonLd data={[personLd, websiteLd]} />
      {/* GridNav is a full-viewport hero with its own <main> and the
          theme toggle. The lab matrix sits below it as a normal-flow
          section, so we close GridNav's main and start a new section
          outside it. */}
      <GridNav latest={latest ? { title: latest.title, href: `/blog/${latest.slug}/` } : null} />

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
