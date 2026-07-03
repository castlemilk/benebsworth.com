import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { Reveal } from '@/components/motion/reveal'
import { MdxContent } from '@/components/mdx/mdx-content'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'
import {
  BENCHMARK_CATEGORIES,
  getCategory,
  tasksByCategory,
} from '@/lib/lab/llm-benchmark/registry'
import { resultsForTask } from '@/lib/lab/llm-benchmark/results'
import { aggregateResults } from '@/lib/lab/llm-benchmark/harness'
import { loadCategoryMdx } from '@/lib/lab/llm-benchmark/content'
import { BenchmarkNav } from '@/components/lab/llm-benchmark/benchmark-nav'
import { formatScore, formatRuntime, formatCost } from '@/components/lab/llm-benchmark/format'
import { ArrowRight, Gauge, Clock, DollarSign, Hash } from 'lucide-react'

export function generateStaticParams() {
  return BENCHMARK_CATEGORIES.map((cat) => ({ category: cat.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const cat = getCategory(category)
  const url = `/lab/llm-benchmark/${category}/`
  const description = cat
    ? `${cat.blurb} — ${cat.label} tasks in the LLM benchmark.`
    : 'LLM benchmark category'
  return {
    title: cat ? `${cat.label} · LLM Benchmark` : 'LLM Benchmark',
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: cat ? `${cat.label} · LLM Benchmark · Ben Ebsworth` : 'LLM Benchmark',
      description,
      url,
      siteName: 'Ben Ebsworth',
      locale: 'en_AU',
      images: [{ url: '/lab/llm-benchmark/opengraph-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: cat?.label,
      description: cat?.blurb,
      creator: '@benebsworth',
      site: '@benebsworth',
      images: ['/lab/llm-benchmark/opengraph-image.png'],
    },
  }
}

export default async function BenchmarkCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const cat = getCategory(category)
  if (!cat) notFound()

  const tasks = tasksByCategory(category)
  // The hero already renders the category label as the page h1; strip the
  // MDX's leading "## <Label>" so the title isn't printed twice.
  const body = loadCategoryMdx(category).replace(/^\s*#{1,3}\s+.*\r?\n+/, '')

  const breadcrumb = breadcrumbLd([
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Lab', url: `${SITE_URL}/lab/` },
    { name: 'LLM Benchmark', url: `${SITE_URL}/lab/llm-benchmark/` },
    { name: cat.label, url: `${SITE_URL}/lab/llm-benchmark/${category}/` },
  ])

  const collection = collectionPageLd({
    name: `${cat.label} · LLM Benchmark · Ben Ebsworth`,
    description: cat.blurb,
    url: `${SITE_URL}/lab/llm-benchmark/${category}/`,
    items: tasks.map((t) => ({
      name: t.title,
      url: `${SITE_URL}/lab/llm-benchmark/${category}/${t.slug}/`,
    })),
  })

  return (
    <>
      <JsonLd data={[breadcrumb, collection]} />
      <SiteNav />
      <BenchmarkNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-24 pt-16 sm:px-8">
        <Breadcrumb
          className="mb-10"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Lab', href: '/lab/' },
            { label: 'LLM Benchmark', href: '/lab/llm-benchmark/' },
            { label: cat.label },
          ]}
        />

        <section className="pb-10">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl" style={{ color: cat.accent }} aria-hidden>
                {cat.glyph}
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Benchmark category
              </span>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 type-h1">{cat.label}</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 max-w-prose type-body text-fg/70">{cat.blurb}</p>
          </Reveal>
        </section>

        {body && (
          <Reveal delay={240}>
            <article className="mx-auto mb-16 max-w-3xl">
              <MdxContent source={body} />
            </article>
          </Reveal>
        )}

        <section>
          <Reveal>
            <h2 className="type-h2 mb-6">Tasks</h2>
          </Reveal>

          <div className="grid gap-5">
            {tasks.map((task, i) => {
              const stats = aggregateResults(resultsForTask(task.id))
              return (
                <Reveal key={task.id} delay={i * 60}>
                  <Link
                    href={`/lab/llm-benchmark/${category}/${task.slug}/`}
                    className="group block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-colors hover:bg-[var(--color-surface-2)]"
                  >
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span
                            className="font-mono text-lg"
                            style={{ color: cat.accent }}
                            aria-hidden
                          >
                            {cat.glyph}
                          </span>
                          <h3 className="type-h3">{task.title}</h3>
                        </div>
                        <p className="mt-2 max-w-prose text-fg/70">{task.blurb}</p>
                        <p className="mt-3 font-mono text-xs text-muted">
                          Runtime hint: {task.runtimeHint}
                        </p>
                      </div>
                      <div className="grid shrink-0 grid-cols-2 gap-3 sm:w-72">
                        <MiniStat icon={<Gauge className="h-4 w-4" />} label="Avg score" value={formatScore(stats.avgScore)} />
                        <MiniStat icon={<Clock className="h-4 w-4" />} label="Avg runtime" value={formatRuntime(stats.avgRuntimeMs)} />
                        <MiniStat icon={<DollarSign className="h-4 w-4" />} label="Avg cost" value={formatCost(stats.avgCostUsd)} />
                        <MiniStat icon={<Hash className="h-4 w-4" />} label="Runs" value={stats.count.toString()} />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted group-hover:text-fg transition-colors">
                      Open task
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-1"
                        aria-hidden
                      />
                    </div>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="font-mono text-[0.65rem] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}
