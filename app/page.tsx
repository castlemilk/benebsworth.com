import type { Metadata } from 'next'
import Link from 'next/link'
import { GridNav } from '@/components/landing/grid-nav'
import { LabMatrix } from '@/components/landing/lab-matrix'
import { LAB_DEMO_EFFECTS } from '@/lib/lab/registry'
import { getPublishedPosts } from '@/lib/content'
import { ReadingEntry } from '@/components/blog/reading-entry'
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
  const posts = getPublishedPosts().slice(0, 3)
  const latest = posts[0] ?? null
  return (
    <>
      <JsonLd data={[personLd, websiteLd]} />
      {/* One <main> owns the whole page so the layout's skip link lands on
          real content. GridNav is the full-viewport letter-grid hero (with the
          theme toggle); the two entry sections below share the editorial
          heading + archive-link hierarchy so home reads as one system. */}
      <main id="main-content">
      <GridNav latest={latest ? { title: latest.title, href: `/blog/${latest.slug}/` } : null} />

      {/* ── Latest writing ──────────────────────────────────────── */}
      <section className="latest-writing relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-12 sm:px-8" aria-labelledby="latest-writing-heading">
        <header className="latest-writing__header">
          <h2 id="latest-writing-heading" className="latest-writing__title">Latest writing</h2>
          <Link href="/blog/" className="latest-writing__archive-link">All posts →</Link>
        </header>
        <div className="latest-writing__entries">
          {posts.map((post) => (
            <ReadingEntry key={post.slug} post={post} headingLevel="h3" showImage />
          ))}
        </div>
      </section>

      {/* ── Lab matrix ─────────────────────────────────────────────
          A 2x3 grid of randomly selected, fully working lab effects,
          rotated daily. Each tile is a click-through to its full lab
          page. The matrix serves as a portfolio of the kinds of
          physics/math/engineering simulations the site hosts. */}
      <section className="latest-writing relative z-10 mx-auto w-full max-w-5xl px-6 pb-24 pt-12 sm:px-8" aria-labelledby="from-the-lab-heading">
        <header className="latest-writing__header">
          <h2 id="from-the-lab-heading" className="latest-writing__title">From the lab</h2>
          <Link href="/lab/" className="latest-writing__archive-link">All {LAB_DEMO_EFFECTS.length} effects →</Link>
        </header>
        <p className="latest-writing__lede">
          Small, working simulations. Drag the controls on the full pages, or just watch the previews cycle here. The selection rotates daily.
        </p>
        <LabMatrix count={6} />
      </section>
      </main>
    </>
  )
}
