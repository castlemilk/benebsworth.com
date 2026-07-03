import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd, datasetLd } from '@/components/seo/json-ld'
import { Reveal } from '@/components/motion/reveal'
import { MdxContent } from '@/components/mdx/mdx-content'
import { CategoryGrid } from '@/components/lab/llm-benchmark/category-grid'
import { ModelList } from '@/components/lab/llm-benchmark/model-list'
import { ScoreRankings } from '@/components/lab/llm-benchmark/score-rankings'
import { ResultsTable } from '@/components/lab/llm-benchmark/results-table'
import { VerdictStrip } from '@/components/lab/llm-benchmark/verdict-strip'
import { BenchmarkNav } from '@/components/lab/llm-benchmark/benchmark-nav'
import { SectionLabel } from '@/components/lab/llm-benchmark/section-label'
import { BENCHMARK_TASKS, BENCHMARK_MODELS } from '@/lib/lab/llm-benchmark/registry'
import { BENCHMARK_RESULTS, stripOutput } from '@/lib/lab/llm-benchmark/results'
import { rankModels, headlineVerdicts, hasSeededResults } from '@/lib/lab/llm-benchmark/analytics'
import { loadBenchmarkIntro } from '@/lib/lab/llm-benchmark/content'
import { taskPath } from '@/lib/lab/llm-benchmark/nav'

const OG_IMAGE = { url: '/lab/llm-benchmark/opengraph-image.png', width: 1200, height: 630 }

export const metadata: Metadata = {
  title: 'LLM Benchmark · Lab',
  description:
    'Head-to-head benchmark of frontier LLMs — Claude, GPT, Gemini, Kimi, Codex — across coding, physics, security, UI, maths, and electronics tasks, scored for correctness, runtime, and cost.',
  alternates: { canonical: '/lab/llm-benchmark/' },
  openGraph: {
    type: 'website',
    title: 'LLM Benchmark · Lab · Ben Ebsworth',
    description:
      'Head-to-head benchmark of frontier LLMs across coding, physics, security, UI, maths, and electronics tasks.',
    url: '/lab/llm-benchmark/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LLM Benchmark · Lab',
    creator: '@benebsworth',
    site: '@benebsworth',
    images: [OG_IMAGE.url],
  },
}

export default function LlmBenchmarkPage() {
  const rankings = rankModels(BENCHMARK_RESULTS)
  const verdicts = headlineVerdicts(rankings)
  const rows = BENCHMARK_RESULTS.map(stripOutput)
  const intro = loadBenchmarkIntro()
  const seeded = hasSeededResults(BENCHMARK_RESULTS)

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
              'Head-to-head benchmark of frontier LLMs across coding, physics, security, UI, maths, and electronics tasks.',
            url: `${SITE_URL}/lab/llm-benchmark/`,
            items: BENCHMARK_TASKS.map((t) => ({ name: t.title, url: `${SITE_URL}${taskPath(t)}` })),
          }),
          datasetLd({
            name: 'Frontier LLM Benchmark Results',
            description: `Scored results for ${BENCHMARK_MODELS.length} frontier language models across ${BENCHMARK_TASKS.length} runnable tasks (physics, game building, security, UI, mathematics, electronics), measuring correctness, runtime, and cost.`,
            url: `${SITE_URL}/lab/llm-benchmark/`,
            variableMeasured: ['Correctness score (0–100)', 'Inference runtime (ms)', 'Token usage', 'Estimated cost (USD)'],
            keywords: ['LLM benchmark', 'Claude', 'GPT', 'Gemini', 'Kimi', 'code generation', 'model evaluation'],
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
        <section className="pb-12">
          <Reveal>
            <p className="type-label text-muted">00 · llm benchmark</p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 type-h1">Frontier model benchmark</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 max-w-prose type-body text-fg/70">
              Head-to-head evaluations of {BENCHMARK_MODELS.length} frontier models — Claude, GPT,
              Gemini, Kimi and Codex — across physics, game building, security, UI generation,
              mathematics, and electronics. Each task asks for a single self-contained artifact,
              run multiple times and scored for correctness, runtime, and cost.
            </p>
          </Reveal>
        </section>

        {/* ── Verdict ────────────────────────────────────────────── */}
        <section className="pb-24">
          <VerdictStrip verdicts={verdicts} />
        </section>

        {/* ── Rankings ───────────────────────────────────────────── */}
        <section className="pb-24">
          <SectionLabel index="01">Rankings</SectionLabel>
          <ScoreRankings rankings={rankings} />
        </section>

        {/* ── Categories ─────────────────────────────────────────── */}
        <section className="pb-24">
          <SectionLabel index="02">Categories</SectionLabel>
          <CategoryGrid />
        </section>

        {/* ── Models ─────────────────────────────────────────────── */}
        <section className="pb-24">
          <SectionLabel index="03">Models</SectionLabel>
          <ModelList />
        </section>

        {/* ── All results ────────────────────────────────────────── */}
        <section className="pb-16">
          <SectionLabel index="04">All results</SectionLabel>
          <ResultsTable rows={rows} />
        </section>

        {/* ── Methodology ────────────────────────────────────────── */}
        {intro && (
          <section id="about-the-numbers" className="border-t border-[var(--color-border)] pt-16">
            <SectionLabel index="05">About the numbers</SectionLabel>
            <Reveal>
              <article className="mx-auto max-w-3xl">
                {seeded && (
                  <p className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-fg/70">
                    Some rows are marked <span className="font-mono text-xs">sample</span> — hand-authored
                    reference outputs used to scaffold a model before it has a live API run. They are
                    excluded from the headline verdicts and labelled wherever they appear.
                  </p>
                )}
                <MdxContent source={intro} />
              </article>
            </Reveal>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  )
}
