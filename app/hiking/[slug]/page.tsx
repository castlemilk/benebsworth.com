import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { hikes, getHike } from '@/content/hiking'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { Reveal } from '@/components/motion/reveal'
import { HikeJourney } from '@/components/hiking/hike-journey'
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld'

// Only hikes with a PUBLISHED trail guide. The Overland guide exists but is
// kept unpublished (release: false), so it is intentionally not linked here.
const GUIDE_SLUG: Record<string, string> = { 'haute-route': 'haute-route-guide' }

export function generateStaticParams() {
  return hikes.map((h) => ({ slug: h.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const h = getHike(slug)
  const url = `/hiking/${slug}/`
  return {
    title: h ? h.name : 'Hike',
    description: h?.summary,
    alternates: { canonical: url },
    openGraph: { type: 'article', title: h?.name, description: h?.summary, url, siteName: 'Ben Ebsworth', locale: 'en_AU' },
    twitter: { card: 'summary_large_image', title: h?.name, description: h?.summary },
  }
}

export default async function HikePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hike = getHike(slug)
  if (!hike) notFound()

  const accent = hike.accent || '#5b9e6f'
  const planned = hike.status === 'planned'
  const url = `${SITE_URL}/hiking/${slug}/`
  const guide = GUIDE_SLUG[slug]

  return (
    <>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'CreativeWork',
            name: hike.name,
            description: hike.summary,
            url,
            keywords: [hike.region, hike.country, 'hiking', 'trek'].join(', '),
          },
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Hiking', url: `${SITE_URL}/hiking/` },
            { name: hike.name, url },
          ]),
        ]}
      />
      <SiteNav />

      <main id="main-content" className="mx-auto w-full max-w-5xl px-6 pb-32 sm:px-8">
        <Breadcrumb
          className="pt-8 sm:pt-10"
          items={[{ label: 'Home', href: '/' }, { label: 'Hiking', href: '/hiking/' }, { label: hike.name }]}
        />

        {/* ── Art banner ──────────────────────────────────────────── */}
        {hike.hero && (
          <Reveal>
            <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hike.hero} alt={hike.name} className="aspect-[2/1] w-full object-cover sm:aspect-[12/5]" />
            </div>
          </Reveal>
        )}

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <header className="pt-8 pb-10 md:pt-10">
          <Reveal>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-[0.25em]" style={{ color: accent }}>
              <span>{planned ? 'Planned' : `Completed · ${hike.year}`}</span>
              <span className="text-muted">·</span>
              <span className="text-muted">{hike.region} · {hike.country}</span>
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="type-display mt-4">{hike.name}</h1>
          </Reveal>
          <Reveal delay={150}>
            <p className="mt-5 max-w-2xl type-body text-fg/80">{hike.summary}</p>
          </Reveal>
          {hike.highlights.length > 0 && (
            <Reveal delay={220}>
              <ul className="mt-6 flex flex-wrap gap-2">
                {hike.highlights.map((h) => (
                  <li
                    key={h}
                    className="rounded-full border px-3 py-1 font-mono text-[0.7rem]"
                    style={{ borderColor: `color-mix(in srgb, ${accent} 40%, transparent)`, backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`, color: `color-mix(in srgb, ${accent} 85%, var(--color-fg))` }}
                  >
                    {h}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </header>

        {/* ── Journey map + gallery (client) ───────────────────────── */}
        <Reveal>
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-muted">
            <span style={{ color: accent }}>▸</span> {planned ? 'Planned route' : 'The journey'}
          </p>
          <HikeJourney hike={hike} />
        </Reveal>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4">
          <Link href="/hiking/" className="font-mono text-sm text-muted underline decoration-fg/20 underline-offset-4 hover:text-fg">
            ← all hikes
          </Link>
          {guide && (
            <Link
              href={`/blog/${guide}/`}
              className="font-mono text-sm underline decoration-current/40 underline-offset-4 transition-colors hover:decoration-current"
              style={{ color: accent }}
            >
              Read the trail guide →
            </Link>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
