import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'
import { Reveal } from '@/components/motion/reveal'
import { CategoryGrid } from '@/components/lab/llm-benchmark/category-grid'
import { ModelList } from '@/components/lab/llm-benchmark/model-list'
import { ScoreRankings } from '@/components/lab/llm-benchmark/score-rankings'
import { ResultsTable } from '@/components/lab/llm-benchmark/results-table'
import { BenchmarkNav } from '@/components/lab/llm-benchmark/benchmark-nav'
import { BENCHMARK_TASKS } from '@/lib/lab/llm-benchmark/registry'
import { taskPath } from '@/lib/lab/llm-benchmark/nav'

export const metadata: Metadata = {
  title: 'LLM Benchmark · Lab',
  description:
    'Head-to-head benchmark of frontier LLMs across coding, physics, security, UI, math, and electronics tasks.',
  alternates: { canonical: '/lab/llm-benchmark/' },
  openGraph: {
    type: 'website',
    title: 'LLM Benchmark · Lab · Ben Ebsworth',
    description:
      'Head-to-head benchmark of frontier LLMs across coding, physics, security, UI, math, and electronics tasks.',
    url: '/lab/llm-benchmark/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LLM Benchmark · Lab',
    creator: '@benebsworth',
    site: '@benebsworth',
  },
}

export default function LlmBenchmarkPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Lab', url: `${SITE_URL}/lab/` },
            { name: 'LLM Benchmark', url: `${SITE_URL}/lab/llm-benchmark/` },
          ]),
          collectionPageLd({
            name: 'LLM Benchmark · Lab · Ben Ebsworth',
            description:
              'Head-to-head benchmark of frontier LLMs across coding, physics, security, UI, math, and electronics tasks.',
            url: `${SITE_URL}/lab/llm-benchmark/`,
            items: BENCHMARK_TASKS.map((t) => ({
              name: t.title,
              url: `${SITE_URL}${taskPath(t)}`,
            })),
          }),
        ]}
      />
      <SiteNav />
      <BenchmarkNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-20 pt-16 sm:px-8">
        <Breadcrumb
          className="mb-10"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Lab', href: '/lab/' },
            { label: 'LLM Benchmark' },
          ]}
        />

        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="pb-20">
          <Reveal>
            <p className="type-label text-muted">00 · llm benchmark</p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 type-h1">Frontier model benchmark</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 max-w-prose type-body text-fg/70">
              Head-to-head evaluations of Claude, GPT, and Gemini across physics, game building,
              security, UI generation, mathematics, and electronics tasks. Each task is run multiple
              times and scored for correctness, runtime, and cost.
            </p>
          </Reveal>
        </section>

        {/* ── Categories ─────────────────────────────────────────── */}
        <section className="pb-24">
          <Reveal>
            <h2 className="type-h2 mb-8">Categories</h2>
          </Reveal>
          <CategoryGrid />
        </section>

        {/* ── Models ─────────────────────────────────────────────── */}
        <section className="pb-24">
          <Reveal>
            <h2 className="type-h2 mb-8">Models</h2>
          </Reveal>
          <ModelList />
        </section>

        {/* ── Rankings ───────────────────────────────────────────── */}
        <section className="pb-24">
          <Reveal>
            <h2 className="type-h2 mb-8">Rankings</h2>
          </Reveal>
          <ScoreRankings />
        </section>

        {/* ── All results ────────────────────────────────────────── */}
        <section>
          <Reveal>
            <h2 className="type-h2 mb-8">All results</h2>
          </Reveal>
          <ResultsTable />
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
