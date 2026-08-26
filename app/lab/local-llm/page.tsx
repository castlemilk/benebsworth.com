import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd, datasetLd } from '@/components/seo/json-ld'
import { Reveal } from '@/components/motion/reveal'
import { Cpu, MemoryStick, Layers, Zap, Clock3, Gauge, HardDrive, ArrowRight, ExternalLink, Activity, Code2 } from 'lucide-react'
import dataset from '@/lib/lab/local-llm/results.json'
import type { LocalDataset } from '@/lib/lab/local-llm/types'
import { BENCHMARK_RESULTS } from '@/lib/lab/llm-benchmark/results'
import { BENCHMARK_MODELS, getModel, getTask } from '@/lib/lab/llm-benchmark/registry'
import { modelPath, taskPath } from '@/lib/lab/llm-benchmark/nav'
import { ModelLogoBadge } from '@/components/lab/llm-benchmark/model-logo'

const DATA = dataset as unknown as LocalDataset

// Scored results for local ollama models — same harness, same tasks as cloud
const SCORED_LOCAL = BENCHMARK_RESULTS.filter(r => r.modelId.endsWith('-ollama'))

function toScoredId(speedId: string): string {
  // speed dataset uses 'qwen3:8b' / 'gemma3:4b' (colon), scored uses 'qwen3-8b-ollama' (dash + suffix)
  return speedId.replace(/:/g, '-') + '-ollama'
}
function scoredForModel(speedId: string) {
  const sid = toScoredId(speedId)
  return SCORED_LOCAL.filter(r => r.modelId === sid)
}
function avgScore(speedId: string) {
  const rs = scoredForModel(speedId)
  if (rs.length === 0) return null
  return rs.reduce((s, r) => s + r.score, 0) / rs.length
}
function scoredModelMeta(speedId: string) {
  const sid = toScoredId(speedId)
  return BENCHMARK_MODELS.find(m => m.id === sid)
}

// Model enrichment — static, keep in sync with ollama list
const MODEL_META: Record<string, { params: string; size: string; quant: string; context: string; blurb: string; family: string; accent: string }> = {
  'gemma3:4b': { params: '4B', size: '3.3GB', quant: 'Q4_K_M', context: '128K', blurb: 'Gemma 3 4B — multimodal, 4B dense, fastest single-GPU model in this bake-off.', family: 'Gemma 3', accent: '#4285f4' },
  'qwen3:8b': { params: '8.2B', size: '5.2GB', quant: 'Q4_K_M', context: '41K', blurb: 'Qwen3 8B — Alibaba 8B dense, 36 layers, thinking-capable, balanced quality/speed.', family: 'Qwen3', accent: '#8b5cf6' },
  'gemma3:12b': { params: '12B', size: '8.1GB', quant: 'Q4_K_M', context: '128K', blurb: 'Gemma 3 12B — 12B dense multimodal, sweet spot for reasoning vs latency.', family: 'Gemma 3', accent: '#0ea5e9' },
  'gemma3:27b': { params: '27B', size: '17GB', quant: 'Q4_K_M', context: '128K', blurb: 'Gemma 3 27B — flagship 27B dense, most capable single-GPU Gemma.', family: 'Gemma 3', accent: '#f59e0b' },
  'qwen3:14b': { params: '14B', size: '9.0GB', quant: 'Q4_K_M', context: '41K', blurb: 'Qwen3 14B — mid-size dense, strong code/reasoning.', family: 'Qwen3', accent: '#10b981' },
  'qwen3:32b': { params: '32B', size: '19GB', quant: 'Q4_K_M', context: '41K', blurb: 'Qwen3 32B — largest dense Qwen3, needs 128GB headroom.', family: 'Qwen3', accent: '#ef4444' },
  'qwen3.8:27b-mlx': { params: '27.8B', size: '18GB', quant: 'nvfp4 · MLX', context: '256K', blurb: 'Qwen3.8 27B MLX — native MLX on M5 Max, 94.7 avg with thinking (31 tok/s), 69.1 without — 256K ctx, multimodal, best local quality.', family: 'Qwen3.8', accent: '#06b6d4' },
  'ornith-1.5:35b': { params: '35B', size: '23GB', quant: 'Q4_K_M', context: '256K', blurb: 'Ornith 1.5 35B — 112 tok/s on M5 Max, 70.3 avg, self-improving, Text+Vision, end-to-end RL.', family: 'Ornith 1.5', accent: '#f43f5e' },
}

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

function formatTps(n: number | null | undefined) {
  if (n == null) return '—'
  return `${n.toFixed(1)} tok/s`
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

        {/* Hero */}
        <section className="pb-10">
          <Reveal>
            <p className="type-label text-muted">01 · local llm · on-device</p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 type-h1">Local LLM throughput</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 max-w-3xl type-body text-fg/70">
              Measured on-device on <strong className="text-fg">{hw.chip}</strong> with {hw.cores_detail}, {hw.mem_gb}GB unified, macOS {hw.macos}, Ollama{' '}
              {hw.ollama_version.replace('ollama version is ', '')}. All models Q4_K_M via Ollama Metal — the Apple Silicon path that keeps weights in unified memory.
              TTFT, prompt prefill, and generation tok/s are streaming-measured; JSON + CSV logs live in <code className="rounded bg-[var(--color-surface)] px-1 py-0.5 font-mono text-xs">results/</code>.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href="https://github.com/anomalyco/opencode"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 font-mono text-xs hover:bg-[var(--color-surface-2)]"
              >
                <Code2 className="h-3.5 w-3.5" /> ollama-bench
              </a>
              <Link
                href="/lab/llm-benchmark/"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 font-mono text-xs hover:bg-[var(--color-surface-2)]"
              >
                Cloud benchmark <ArrowRight className="h-3 w-3" />
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 font-mono text-xs text-muted">
                Generated {generated} · {DATA.models.length} models · {DATA.rawFiles.length} runs
              </span>
            </div>
          </Reveal>
        </section>

        {/* Hardware */}
        <section className="pb-12">
          <Reveal>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted">
                <Cpu className="h-4 w-4" /> Hardware · {hw.chip}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                  <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted">
                    <Layers className="h-3.5 w-3.5" /> SoC
                  </div>
                  <div className="mt-1 font-medium">{hw.chip}</div>
                  <div className="font-mono text-xs text-muted">{hw.cores_detail}</div>
                  <div className="font-mono text-xs text-muted">{hw.cpu_brand}</div>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                  <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted">
                    <MemoryStick className="h-3.5 w-3.5" /> Memory
                  </div>
                  <div className="mt-1 font-medium">{hw.memory_str} unified</div>
                  <div className="font-mono text-xs text-muted">M5 Max · 512-bit bus · ~400 GB/s</div>
                  <div className="font-mono text-xs text-muted">Enough for 32B Q4 + 128K ctx</div>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                  <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted">
                    <HardDrive className="h-3.5 w-3.5" /> Stack
                  </div>
                  <div className="mt-1 font-mono text-sm">{hw.ollama_version.replace('ollama version is ', 'Ollama ')}</div>
                  <div className="font-mono text-xs text-muted">Metal (llama.cpp) · Q4_K_M</div>
                  <div className="font-mono text-xs text-muted">.venv Python {hw.python}</div>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                  <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted">
                    <Activity className="h-3.5 w-3.5" /> Raft
                  </div>
                  <div className="mt-1 font-medium">{DATA.models.length} models · {DATA.rawFiles.length} bench files</div>
                  <div className="font-mono text-xs text-muted">Temp 0.0 · qwen3.8 with thinking (medium, 24K) · 1 warmup</div>
                  <div className="font-mono text-xs text-muted">Streaming + eval_count stats · thinking 31 tok/s vs 50 no-think</div>
                </div>
              </div>
              <p className="mt-4 font-mono text-xs text-muted">
                Note: Ollama Metal already uses Apple Metal; raw MLX via <code className="rounded bg-[var(--color-surface)] px-1">mlx-lm</code> (4-bit) is +5-10% faster and available as{' '}
                <code className="font-mono text-xs">bench --backend mlx --model mlx-community/Qwen3-8B-4bit</code>. With 128GB you can run fp16/BF16 or Q8 for accuracy at ~15% cost.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Leaderboard bars */}
        <section className="pb-12">
          <div className="flex items-baseline justify-between">
            <h2 className="type-h2">Leaderboard — generation tok/s</h2>
            <span className="hidden font-mono text-xs text-muted sm:block">Higher is faster · wall tok/s = with TTFT</span>
          </div>
          <div className="mt-6 grid gap-3">
            {DATA.models.map((m, i) => {
              const meta = MODEL_META[m.id] ?? { accent: '#7c5cff', family: 'Local', size: '—', params: '—', quant: 'Q4_K_M', context: '—', blurb: '' }
              const pct = ((m.summary.gen_tps_mean ?? 0) / maxGen) * 100
              const isTop = i === 0
              const benchModel = getModel(toScoredId(m.id)) ?? BENCHMARK_MODELS.find((x) => x.apiModelId === m.id) ?? null
              return (
                <Reveal key={m.id} delay={i * 60}>
                  <div id={m.id} className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:bg-[var(--color-surface-2)] sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <span className="hidden w-7 shrink-0 text-right font-mono text-sm tabular-nums text-muted sm:block">{String(i + 1).padStart(2, '0')}</span>
                        {benchModel ? (
                          <ModelLogoBadge model={benchModel} size={44} />
                        ) : (
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-mono text-sm"
                            style={{
                              color: meta.accent,
                              borderColor: `color-mix(in srgb, ${meta.accent} 35%, transparent)`,
                              backgroundColor: `color-mix(in srgb, ${meta.accent} 10%, transparent)`,
                            }}
                          >
                            {isTop ? <Zap className="h-4 w-4" /> : i + 1}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="type-h3">{m.id}</h3>
                            <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted">{meta.params} · {meta.size} · {meta.quant}</span>
                            <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted">{meta.context} ctx</span>
                          </div>
                          <p className="mt-1 max-w-xl type-body text-fg/65">{meta.blurb}</p>
                          <div className="mt-2 flex flex-wrap gap-3 font-mono text-xs text-muted">
                            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> TTFT {m.summary.ttft_ms_mean?.toFixed(1)} ms</span>
                            <span className="inline-flex items-center gap-1"><Gauge className="h-3 w-3" /> prompt {formatTps(m.summary.prompt_tps_mean)}</span>
                            <span className="inline-flex items-center gap-1">samples {m.summary.samples}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full lg:w-[420px] lg:shrink-0">
                        <div className="flex items-baseline justify-between font-mono text-xs">
                          <span className="uppercase tracking-wider text-muted">Gen tok/s</span>
                          <span className="font-medium tabular-nums">{m.summary.gen_tps_mean?.toFixed(1)} <span className="text-muted">({m.summary.gen_tps_min?.toFixed(1)}–{m.summary.gen_tps_max?.toFixed(1)})</span></span>
                        </div>
                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: meta.accent }} />
                        </div>
                        <div className="mt-1 flex justify-between font-mono text-[0.6rem] uppercase tracking-wider text-muted">
                          <span>0</span>
                          <span>{maxGen.toFixed(0)} tok/s</span>
                        </div>
                      </div>
                    </div>
                    {/* per-prompt breakdown */}
                    <div className="mt-4 grid gap-2 border-t border-[var(--color-border)] pt-4 sm:grid-cols-3">
                      {m.entries.map(e => (
                        <div key={e.file} className="rounded-xl bg-[var(--color-surface-2)] px-3 py-2">
                          <div className="font-mono text-[0.6rem] uppercase tracking-wider text-muted">{e.prompt_set} · {e.tokens} tok</div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="font-mono text-sm font-medium tabular-nums">{e.aggregate.gen_tps_mean.toFixed(1)}</span>
                            <span className="font-mono text-xs text-muted">tok/s</span>
                            <span className="ml-auto font-mono text-xs text-muted">{e.aggregate.ttft_ms_mean.toFixed(0)}ms TTFT</span>
                          </div>
                          <div className="font-mono text-xs text-muted">prompt {e.aggregate.prompt_tps_mean.toFixed(0)} tok/s · wall {e.aggregate.wall_tps_mean.toFixed(1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* Scored on tasks — same harness as cloud */}
        <section className="pb-12">
          <div className="flex items-baseline justify-between">
            <h2 className="type-h2">Scored on tasks — same harness as cloud</h2>
            <Link href="/lab/llm-benchmark/" className="hidden items-center gap-1 font-mono text-xs text-muted hover:text-fg sm:inline-flex">
              View cloud leaderboard <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="mt-2 max-w-prose font-mono text-xs text-muted">
            Same 7 tasks (crypto, equation, n-body, platformer, landing, pendulum, circuit) · 1 iter · executable/behavioral scorers · local Ollama via <code className="rounded bg-[var(--color-surface)] px-1">runners/ollama.ts</code> · cost $0.
            {SCORED_LOCAL.length === 0 && ' (no scored runs yet — run task bench:run MODELS=... )'}
          </p>
          {SCORED_LOCAL.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                    <th className="py-3 pl-5 text-left">Model</th>
                    <th className="py-3 text-right">Avg score</th>
                    <th className="py-3 pr-5 text-left">Per-task scores (click task for artifact)</th>
                  </tr>
                </thead>
                <tbody>
                  {[...DATA.models]
                    .sort((a, b) => (avgScore(b.id) ?? 0) - (avgScore(a.id) ?? 0))
                    .map(m => {
                      const meta = MODEL_META[m.id] ?? { accent: '#7c5cff', size: '—', params: '—' }
                      const avg = avgScore(m.id)
                      const sid = toScoredId(m.id)
                      const rows = scoredForModel(m.id)
                      return (
                        <tr key={m.id} className="border-b border-[var(--color-border)]/60 last:border-0">
                          <td className="py-3 pl-5">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const mm = scoredModelMeta(m.id)
                                return mm ? <ModelLogoBadge model={mm} size={28} /> : <span className="h-2 w-2 rounded-full" style={{ background: meta.accent }} />
                              })()}
                              {(() => {
                                const mm = scoredModelMeta(m.id)
                                return mm ? (
                                  <Link href={modelPath(mm)} className="font-medium hover:text-[var(--color-project)]">
                                    {mm.name}
                                  </Link>
                                ) : (
                                  <span className="font-medium">{m.id}</span>
                                )
                              })()}
                              <span className="font-mono text-xs text-muted">{meta.size}</span>
                            </div>
                            <div className="ml-9 font-mono text-xs text-muted">{meta.params} · scored {rows.length}/7</div>
                          </td>
                          <td className="py-3 text-right">
                            <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-1 font-mono text-sm font-medium tabular-nums">
                              {avg !== null ? avg.toFixed(1) : '—'}
                            </span>
                          </td>
                          <td className="py-3 pr-5">
                            <div className="flex flex-wrap gap-1.5">
                              {rows
                                .sort((a, b) => a.taskId.localeCompare(b.taskId))
                                .map(r => {
                                  const t = getTask(r.taskId)
                                  const href = t ? `${taskPath(t)}?model=${encodeURIComponent(sid)}#run` : `/lab/llm-benchmark/models/${sid}/`
                                  return (
                                    <Link
                                      key={r.taskId}
                                      href={href}
                                      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-xs hover:bg-[var(--color-surface-2)]"
                                      style={{
                                        borderColor: r.score >= 90 ? '#10b981' : r.score >= 60 ? '#f59e0b' : '#ef4444',
                                        color: r.score >= 90 ? '#10b981' : r.score >= 60 ? '#a16207' : '#dc2626',
                                      }}
                                    >
                                      {r.taskId.replace('circuit-builder-teaser', 'circuit').replace('physics-pendulum-wave', 'pendulum').replace('landing-page-morph', 'landing')} {r.score.toFixed(0)}
                                    </Link>
                                  )
                                })}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
          {SCORED_LOCAL.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs text-muted">
              <span>Tasks: crypto 26–90 · equation 100 · n-body 3–100 · platformer 3–100 · landing 50–100 · pendulum 11–100 · circuit 21–100</span>
              <span>· Qwen3.8 94.7 (thinking) leads; Qwen3 66.7 trails; Gemma 4B 30.3 — honest chromium, BUST=1, no fallback.</span>
            </div>
          )}
        </section>

        {/* Table — Speed */}
        <section className="pb-12">
          <h2 className="type-h2">Table — Speed</h2>
          <p className="mt-2 max-w-prose font-mono text-xs text-muted">Sorted by generation tok/s descending · TTFT warm (cold first load 70–900ms) · prompt eval excludes cached-KV outlier (qwen long-context).</p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                  <th className="py-3 pl-5 text-left">Model</th>
                  <th className="py-3 text-right">Gen tok/s</th>
                  <th className="py-3 text-right">Prompt tok/s</th>
                  <th className="py-3 text-right">TTFT</th>
                  <th className="py-3 pr-5 text-right">Total / sample</th>
                </tr>
              </thead>
              <tbody>
                {DATA.models.map(m => {
                  const meta = MODEL_META[m.id] ?? { accent: '#7c5cff', size: '—', params: '—' }
                  const benchModel = getModel(toScoredId(m.id)) ?? BENCHMARK_MODELS.find((x) => x.apiModelId === m.id) ?? null
                  return (
                    <tr key={m.id} className="border-b border-[var(--color-border)]/60 last:border-0">
                      <td className="py-3 pl-5">
                        <div className="flex items-center gap-2">
                          {benchModel ? (
                            <ModelLogoBadge model={benchModel} size={26} />
                          ) : (
                            <span className="h-2 w-2 rounded-full" style={{ background: meta.accent }} />
                          )}
                          <span className="font-medium">{m.id}</span>
                          <span className="font-mono text-xs text-muted">{meta.size}</span>
                        </div>
                        <div className="ml-8 font-mono text-xs text-muted">{meta.params} · {meta.family ?? 'Local'}</div>
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums font-medium">{m.summary.gen_tps_mean?.toFixed(1)}</td>
                      <td className="py-3 text-right font-mono tabular-nums text-muted">{m.summary.prompt_tps_mean?.toFixed(0)}</td>
                      <td className="py-3 text-right font-mono tabular-nums text-muted">{m.summary.ttft_ms_mean?.toFixed(1)} ms</td>
                      <td className="py-3 pr-5 text-right font-mono text-xs tabular-nums text-muted">{m.entries[0]?.aggregate.total_wall_s_mean.toFixed(2)}s · {m.summary.samples} cfg{m.summary.samples !== 1 ? 's' : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Methodology */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="type-h3">Methodology & how to reproduce</h2>
          <div className="prose prose-sm mt-3 max-w-none prose-zinc dark:prose-invert">
            <p className="font-mono text-xs leading-relaxed text-fg/70">
              Each model is run with <code>temperature 0.0</code> (qwen3.8 with <code>think:true, reasoning_effort:medium, num_predict:24000</code> for best quality — 94.7 avg at ~31 tok/s vs 69.1 at ~50 without; others <code>no_think</code>), 1 warmup (not counted) + 1–3 measured runs per prompt set (<code>general</code>, <code>code</code>, <code>short</code>, <code>long-context</code>). The harness streams <code>/api/chat</code> (MLX) or <code>/api/generate</code> and records TTFT (first <code>response</code> delta),
              wall time, and the ground-truth <code>eval_count/eval_duration</code> and <code>prompt_eval_count/prompt_eval_duration</code> from Ollama final stats (ns). Wall tok/s
              cross-checks. 512 tok is the default <code>num_predict</code> (24000 for thinking).
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-[var(--color-surface-2)] p-4 font-mono text-xs">
              <code>{`cd ~/projects/ollama-bench
source .venv/bin/activate
task info                          # hardware + ollama
task bench MODEL=gemma3:27b        # quick 512tok general
task bench:all-sets MODEL=qwen3:8b # full profile
task bench:report                  # -> results/local-results.json + summary.md
task bench:sync                    # -> benebsworth.com/public/lab-data/local-llm/results.json`}</code>
            </pre>
            <p className="mt-3 font-mono text-xs text-muted">
              See <code>ollama-bench/BENCHMARK_REPORT.md</code> for the streamed-vs-reported rate discussion and MLX notes. Raw JSON/CSV per run stay in{' '}
              <code>results/bench-*.json</code> and are gitignored; <code>local-results.json</code> is the committed, site-consumed rollup.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href="/lab-data/local-llm/results.json" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 font-mono text-xs hover:bg-[var(--color-surface)]">
              Raw JSON <ExternalLink className="h-3 w-3" />
            </a>
            <Link href="/lab/llm-benchmark/" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 font-mono text-xs hover:bg-[var(--color-surface)]">
              Cloud benchmark <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>

        <p className="mt-8 text-center font-mono text-xs text-muted">
          M5 Max 128GB · ollama {hw.ollama_version.replace('ollama version is ', '')} · generated {new Date(DATA.generatedAt).toISOString()} ·{' '}
          <Link href="/lab/llm-benchmark/" className="underline hover:text-fg">
            compare to cloud
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
