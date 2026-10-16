import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd, datasetLd } from '@/components/seo/json-ld'
import dataset from '@/lib/lab/local-llm/results.json'
import type { LocalDataset } from '@/lib/lab/local-llm/types'
import { BENCHMARK_RESULTS } from '@/lib/lab/llm-benchmark/results'
import { ModelTable } from '@/components/lab/llm-benchmark/model-table'

const DATA = dataset as unknown as LocalDataset

// Scored results for local ollama models — same harness, same tasks as cloud
const SCORED_LOCAL = BENCHMARK_RESULTS.filter(r => r.modelId.endsWith('-ollama'))

const OG_IMAGE = { url: '/lab/local-llm/opengraph-image.png', width: 1200, height: 630 }

export const metadata: Metadata = {
  title: 'Local LLM Benchmark — M5 Max 128GB',
  description: `On-device LLM speed on Apple M5 Max 128GB: ${DATA.models.map(m => m.id).join(', ')} tokens/sec, TTFT, prompt eval via Ollama Metal.`,
  alternates: { canonical: '/lab/local-llm/' },
  openGraph: {
    type: 'website',
    title: 'Local LLM Benchmark · M5 Max 128GB · Ben Ebsworth',
    description: 'On-device LLM throughput on Apple M5 Max 128GB via Ollama Metal — tokens/sec, TTFT, prompt prefill for Qwen3 and Gemma 3.',
    url: '/lab/local-llm/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
    images: [OG_IMAGE],
  },
  twitter: { card: 'summary_large_image', title: 'Local LLM Benchmark · M5 Max', creator: '@benebsworth', site: '@benebsworth', images: [OG_IMAGE.url] },
}

export default function LocalLlmPage() {
  const maxGen = Math.max(...DATA.models.map(m => m.summary.gen_tps_mean ?? 0), 1)
  const generated = new Date(DATA.generatedAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })
  const hw = DATA.hardware

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Lab', url: `${SITE_URL}/lab/` },
            { name: 'Local LLM', url: `${SITE_URL}/lab/local-llm/` },
          ]),
          collectionPageLd({
            name: 'Local LLM Benchmark · M5 Max 128GB',
            description: 'On-device LLM throughput on Apple M5 Max 128GB via Ollama Metal.',
            url: `${SITE_URL}/lab/local-llm/`,
            items: DATA.models.map(m => ({ name: m.id, url: `${SITE_URL}/lab/local-llm/#${m.id}` })),
          }),
          datasetLd({
            name: 'Local LLM Throughput — M5 Max 128GB',
            description: `Measured tokens/sec, TTFT, prompt eval for ${DATA.models.map(m => m.id).join(', ')} on ${hw.chip} ${hw.mem_gb}GB via Ollama ${hw.ollama_version}.`,
            url: `${SITE_URL}/lab/local-llm/`,
            variableMeasured: ['Generation tokens/sec', 'Prompt eval tokens/sec', 'TTFT (ms)', 'Total wall time (s)'],
            keywords: ['local LLM', 'Ollama', 'M5 Max', 'Qwen3', 'Gemma 3', 'tok/s', 'MLX', 'Apple Silicon'],
          }),
        ]}
      />
      <SiteNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-20 pt-16 sm:px-8">
        <Breadcrumb className="mb-10" items={[{ label: 'Home', href: '/' }, { label: 'Lab', href: '/lab/' }, { label: 'Local LLM' }]} />

        <section className="pb-12">
          <p className="type-label text-muted">01 · local llm · on-device</p>
          <h1 className="mt-3 type-h1">Local LLM throughput</h1>
          <p className="mt-4 max-w-3xl type-body text-fg/70">
            Measured on <strong className="text-fg">{hw.chip}</strong> with Ollama Metal. Generation speed, prompt prefill, TTFT, and scored task results are shown together; expand a model for its prompt-set and task-level breakdown.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted">
            <span>{DATA.models.length} models</span>
            <span>{DATA.rawFiles.length} benchmark files</span>
            <span>{hw.memory_str} unified memory</span>
            <span>generated {generated}</span>
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="type-h2">Benchmark results</h2>
            <span className="hidden font-mono text-xs text-muted sm:block">Click the arrow for details</span>
          </div>
          <p className="mt-2 max-w-prose font-mono text-xs text-muted">
            Sort any column, search models, or filter by family. {SCORED_LOCAL.length > 0 ? 'Score is the average across completed browser tasks.' : 'No scored runs yet.'}
          </p>
          <div className="mt-6">
            <ModelTable models={DATA.models} scoredResults={SCORED_LOCAL} maxGenTps={maxGen} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
