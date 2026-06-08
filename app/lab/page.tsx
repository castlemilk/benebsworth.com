import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { LAB_EFFECTS } from '@/lib/lab/registry'
import { LabCard } from '@/components/lab/lab-card'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'

export const metadata: Metadata = {
  title: 'Lab',
  description:
    'Generative experiments — small interactive canvas animations with live parameter controls. Orbits, flow fields, starfields, cyclic automata and ripple grids.',
  alternates: { canonical: '/lab/' },
  openGraph: {
    type: 'website',
    title: 'Lab · Ben Ebsworth',
    description: 'Generative canvas experiments with live, tweakable controls.',
    url: '/lab/',
  },
  twitter: { card: 'summary_large_image', title: 'Lab · Ben Ebsworth' },
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
            description: 'Generative canvas experiments with live, tweakable controls.',
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
          Small canvas animations, each with live knobs and a note on how it works. Tune them, share a link, steal the idea.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {LAB_EFFECTS.map((e) => (
            <Link key={e.slug} href={`/lab/${e.slug}/`} className="group min-w-0 rounded-2xl border border-[var(--color-border)] bg-surface p-4 transition hover:border-[var(--color-muted)]">
              <LabCard slug={e.slug} />
              <h2 className="mt-4 type-h3">{e.title}</h2>
              <p className="mt-1 type-body text-fg/65">{e.blurb}</p>
              <ul className="mt-3 flex gap-2">{e.tags.map((t) => <li key={t} className="rounded-full border border-[var(--color-border)] px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted">{t}</li>)}</ul>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
