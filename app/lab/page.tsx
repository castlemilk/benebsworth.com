import type { Metadata } from 'next'
import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { CATEGORIES, effectsByCategory, LAB_EFFECTS } from '@/lib/lab/registry'
import type { CategoryNavItem } from '@/components/lab/category-nav'
import { LabContent } from '@/components/lab/lab-content'
import { Reveal } from '@/components/motion/reveal'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'
import { Terminal } from 'lucide-react'

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
  const navItems: CategoryNavItem[] = CATEGORIES.map((cat) => ({
    key: cat.key,
    label: cat.label,
    glyph: cat.glyph,
    accent: CATEGORY_ACCENT[cat.key] ?? '#7c5cff',
    count: effectsByCategory(cat.key).length,
  }))

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
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-8">
        <Breadcrumb className="mb-10" items={[{ label: 'Home', href: '/' }, { label: 'Lab' }]} />

        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="pb-20">
          <Reveal>
            <p className="type-label text-muted">00 · the lab</p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 type-h1">Generative experiments</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 max-w-prose type-body text-fg/70">
              Small canvas animations spanning generative art, mathematics, and physics — each with
              live knobs and a note on how it works. Tune them, share a link, steal the idea.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <Link
              href="/lab/llm-benchmark/"
              className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-muted)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-fg)]">
                <BarChart3 className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="type-label text-fg">LLM Benchmark</p>
                <p className="mt-0.5 type-body text-sm text-fg/60">
                  Frontier models tested across code generation, reasoning, and UI tasks.
                </p>
              </div>
            </Link>
          </Reveal>
          <Reveal delay={300}>
            <Link
              href="/lab/harness-eval/"
              className="mt-4 inline-flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-muted)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-fg)]">
                <Terminal className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="type-label text-fg">Harness Eval</p>
                <p className="mt-0.5 type-body text-sm text-fg/60">
                  Per-model code-generation benchmarks across fast, deep, and hard suites.
                </p>
              </div>
            </Link>
            <Link
              href="/lab/cost-dashboard/"
              className="mt-4 inline-flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-muted)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-fg)]">
                <BarChart3 className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="type-label text-fg">Cost &amp; Model Dashboard</p>
                <p className="mt-0.5 type-body text-sm text-fg/60">
                  Per-model token, cost, and duration across all benchmark suites — with budget alerts.
                </p>
              </div>
            </Link>
          </Reveal>
        </section>

        <LabContent navItems={navItems} />
      </main>
      <SiteFooter />
    </>
  )
}
