import type { Metadata } from 'next'
import { completedHikes, plannedHikes } from '@/content/hiking'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { Reveal } from '@/components/motion/reveal'
import { AnimatedHeading } from '@/components/motion/animated-heading'
import { HikeCard } from '@/components/hiking/hike-card'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'

export const metadata: Metadata = {
  title: 'Hiking',
  description:
    'Long-distance hikes and treks by Ben Ebsworth — the Walker’s Haute Route, Tasmania’s Overland Track, the Larapinta Trail, the Dolomites, and what’s planned next. Journey maps, stats and galleries.',
  alternates: { canonical: '/hiking/' },
  openGraph: {
    type: 'website',
    title: 'Hiking · Ben Ebsworth',
    description: 'Long-distance hikes & treks — journey maps, stats and galleries.',
    url: '/hiking/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: { card: 'summary_large_image', title: 'Hiking · Ben Ebsworth' },
}

const HIKING_ACCENT = '#5b9e6f'

function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted">
      <span style={{ color: HIKING_ACCENT }}>{index}</span>
      <span>{children}</span>
      <span className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  )
}

export default function HikingPage() {
  return (
    <>
      <JsonLd
        data={[
          collectionPageLd({
            name: 'Hiking',
            description: 'Long-distance hikes and treks by Ben Ebsworth.',
            url: `${SITE_URL}/hiking/`,
            items: [...completedHikes, ...plannedHikes].map((h) => ({
              name: h.name,
              url: `${SITE_URL}/hiking/${h.slug}/`,
            })),
          }),
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Hiking', url: `${SITE_URL}/hiking/` },
          ]),
        ]}
      />
      <SiteNav />

      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-32 sm:px-8">
        <Breadcrumb className="pt-8 sm:pt-10" items={[{ label: 'Home', href: '/' }, { label: 'Hiking' }]} />

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="pt-8 pb-20 md:pt-14">
          <Reveal>
            {/* Trailkit emblem — topographic contour mark (brandbrain-generated) */}
            <img
              src="/trailkit/emblem.webp"
              alt=""
              aria-hidden
              width={84}
              height={84}
              className="mb-6 h-20 w-20 rounded-full ring-1 ring-[var(--color-border)]"
            />
          </Reveal>
          <Reveal delay={60}>
            <p className="font-mono text-xs uppercase tracking-[0.3em]" style={{ color: HIKING_ACCENT }}>
              On foot · long-distance trails
            </p>
          </Reveal>
          <AnimatedHeading text="Hiking" as="h1" className="type-display mt-4" />
          <Reveal delay={160}>
            <p className="mt-6 max-w-2xl type-body text-fg/75">
              The long walks — multi-day traverses across alps, deserts and wilderness. Each one
              has a journey map, the numbers, and a gallery. A record of where my feet have taken
              me, and where they’re headed next.
            </p>
          </Reveal>
        </section>

        {/* ── Completed ────────────────────────────────────────────── */}
        <section className="pb-24">
          <SectionLabel index="01">Completed</SectionLabel>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {completedHikes.map((h, i) => (
              <Reveal key={h.slug} delay={i * 50}>
                <HikeCard hike={h} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Planned ──────────────────────────────────────────────── */}
        <section>
          <SectionLabel index="02">On the list</SectionLabel>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plannedHikes.map((h, i) => (
              <Reveal key={h.slug} delay={i * 50}>
                <HikeCard hike={h} />
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
