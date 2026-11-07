import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { hikes, getHike, guideForHike } from '@/content/hiking'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { Reveal } from '@/components/motion/reveal'
import { HikeCover } from '@/components/hiking/hike-cover'
import { HikeJourney } from '@/components/hiking/hike-journey'
import trail from '@/components/hiking/trail-journal.module.css'
import { JsonLd, SITE_URL, breadcrumbLd, hikeLd } from '@/components/seo/json-ld'

export function generateStaticParams() {
  return hikes.map((h) => ({ slug: h.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const h = getHike(slug)
  const url = `/hiking/${slug}/`
  const title = h ? `${h.name} · Hiking` : 'Hike'
  return {
    title,
    description: h?.summary,
    keywords: h ? [h.name, h.region, h.country, 'hiking', 'trek', 'trail guide'] : undefined,
    alternates: { canonical: url },
    openGraph: { type: 'article', title: h ? h.name : undefined, description: h?.summary, url, siteName: 'Ben Ebsworth', locale: 'en_AU' },
    twitter: { card: 'summary_large_image', title: h?.name, description: h?.summary },
  }
}

export default async function HikePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hike = getHike(slug)
  if (!hike) notFound()

  const planned = hike.status === 'planned'
  const url = `${SITE_URL}/hiking/${slug}/`
  const guide = guideForHike(slug)

  return (
    <>
      <JsonLd
        data={[
          hikeLd(hike, guide),
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Hiking', url: `${SITE_URL}/hiking/` },
            { name: hike.name, url },
          ]),
        ]}
      />
      <SiteNav />

      <main id="main-content" data-hiking-page="detail" className={`${trail.page} mx-auto w-full max-w-5xl px-6 pb-32 sm:px-8`}>
        <Breadcrumb
          className="pt-8 sm:pt-10"
          items={[{ label: 'Home', href: '/' }, { label: 'Hiking', href: '/hiking/' }, { label: hike.name }]}
        />

        {/* ── Art banner ──────────────────────────────────────────── */}
        <div className="mt-6"><HikeCover hike={hike} priority banner /></div>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <header className={`${trail.detailHero} pt-8 pb-10 md:pt-10`}>
          <Reveal>
            <p className={trail.detailMeta}>
              <span>{planned ? 'Planned' : `Completed · ${hike.year}`}</span>
              <span className="text-muted">·</span>
              <span className="text-muted">{hike.region} · {hike.country}</span>
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className={`${trail.title} mt-4`}>{hike.name}</h1>
          </Reveal>
          <Reveal delay={150}>
            <p className={`${trail.summary} mt-5 max-w-3xl`}>{hike.summary}</p>
          </Reveal>
          {hike.highlights.length > 0 && (
            <Reveal delay={220}>
              <ul className={`${trail.highlights} mt-6`}>
                {hike.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </Reveal>
          )}
        </header>

        {/* ── Journey map + gallery (client) ───────────────────────── */}
        <Reveal>
          <h2 className={trail.journeyHeading}>{planned ? 'Planned route' : 'The journey'}</h2>
          <HikeJourney hike={hike} guideSlug={guide} />
        </Reveal>

        <div className={`${trail.returnLinks} mt-16`}>
          <Link href="/hiking/">
            ← all hikes
          </Link>
          {guide && (
            <Link
              href={`/blog/${guide}/`}
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
