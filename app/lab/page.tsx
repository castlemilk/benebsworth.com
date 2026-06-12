import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { CATEGORIES, effectsByCategory, LAB_EFFECTS } from '@/lib/lab/registry'
import { LabCard } from '@/components/lab/lab-card'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'

const CATEGORY_ACCENT: Record<string, string> = {
  art: '#00e0b8',
  maths: '#7c5cff',
  physics: '#ff7a59',
  engineering: '#00b4d8',
}

export const metadata: Metadata = {
  title: 'Lab',
  description:
    'Interactive experiments in generative art, mathematics, physics, and electrical engineering — canvas animations with live parameter controls.',
  alternates: { canonical: '/lab/' },
  openGraph: {
    type: 'website',
    title: 'Lab · Ben Ebsworth',
    description: 'Interactive experiments in generative art, mathematics, physics, and electrical engineering.',
    url: '/lab/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: { card: 'summary_large_image', title: 'Lab · Ben Ebsworth', creator: '@benebsworth', site: '@benebsworth' },
}

export default function LabPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Lab', url: `${SITE_URL}/lab/` },
          ]),
          collectionPageLd({
            name: 'Lab · Ben Ebsworth',
            description: 'Interactive experiments in generative art, mathematics, and physics.',
            url: `${SITE_URL}/lab/`,
            items: LAB_EFFECTS.map((e) => ({ name: e.title, url: `${SITE_URL}/lab/${e.slug}/` })),
          }),
        ]}
      />
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-10 sm:px-8">
        <Breadcrumb className="mb-10" items={[{ label: 'Home', href: '/' }, { label: 'Lab' }]} />
        <p className="type-label text-muted">00 · the lab</p>
        <h1 className="mt-3 type-h1">Generative experiments</h1>
        <p className="mt-4 max-w-prose type-body text-fg/70">
          Small canvas animations spanning generative art, mathematics, and physics — each with
          live knobs and a note on how it works. Tune them, share a link, steal the idea.
        </p>

        {CATEGORIES.map((cat) => {
          const effects = effectsByCategory(cat.key)
          if (effects.length === 0) return null
          const accent = CATEGORY_ACCENT[cat.key] ?? '#7c5cff'

          return (
            <section
              key={cat.key}
              className="mt-16 border-l-2 pl-6 sm:pl-8"
              style={{ borderColor: accent }}
            >
              <div className="mb-8">
                <h2 className="type-h2">
                  <span
                    className="accent-ink mr-2 inline-block text-[0.85em]"
                    style={{ '--ink': accent } as React.CSSProperties}
                  >
                    {cat.glyph}
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="ml-2">{cat.label}</span>
                </h2>
                <p className="mt-2 max-w-prose type-body text-fg/60">{cat.blurb}</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {effects.map((e) => (
                  <Link
                    key={e.slug}
                    href={`/lab/${e.slug}/`}
                    className="group min-w-0 rounded-2xl border border-[var(--color-border)] bg-surface p-4 transition hover:border-[var(--color-muted)]"
                  >
                    <LabCard slug={e.slug} />
                    <h3 className="mt-4 type-h3">{e.title}</h3>
                    <p className="mt-1 type-body text-fg/65">{e.blurb}</p>
                    <ul className="mt-3 flex gap-2">
                      {e.tags.map((t) => (
                        <li
                          key={t}
                          className="rounded-full border border-[var(--color-border)] px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </main>
      <SiteFooter />
    </>
  )
}
