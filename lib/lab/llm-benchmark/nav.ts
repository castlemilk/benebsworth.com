import type { Crumb } from '@/components/site/breadcrumb'
import { getCategory } from './registry'
import type { BenchmarkCategory, BenchmarkModel, BenchmarkTask } from './types'

export const BENCHMARK_BASE_PATH = '/lab/llm-benchmark/'

export function benchmarkPath(): string {
  return BENCHMARK_BASE_PATH
}

export function categoryPath(category: BenchmarkCategory): string {
  return `${BENCHMARK_BASE_PATH}${category.slug}/`
}

export function taskPath(task: BenchmarkTask): string {
  return `${BENCHMARK_BASE_PATH}${task.category}/${task.slug}/`
}

export function modelIndexPath(): string {
  return `${BENCHMARK_BASE_PATH}models/`
}

export function modelPath(model: BenchmarkModel): string {
  return `${BENCHMARK_BASE_PATH}models/${model.id}/`
}

/**
 * Static URL for a single result's generated output JSON, published by
 * scripts/gen-benchmark-outputs.mjs. Fetched on demand by the comparison /
 * generated-demo views so the ~2.8 MB of outputs never ships in the bundle
 * or RSC payload.
 *
 * `version` is the output's content hash (BenchmarkResultMeta.outputVersion).
 * The views fetch with `cache: 'force-cache'`, which never revalidates — the
 * `?v=` param changes the cache key exactly when the artifact changes, so a
 * harness rerun is never shadowed by a stale browser copy.
 */
export function outputUrl(taskId: string, modelId: string, version?: string): string {
  const base = `/lab-data/llm-benchmark/outputs/${taskId}/${modelId}.json`
  return version ? `${base}?v=${encodeURIComponent(version)}` : base
}

/**
 * Static URL for the renderable HTML artifact itself, published alongside the
 * JSON by scripts/gen-benchmark-outputs.mjs. Served with a CSP sandbox header
 * (see public/_headers) so it can be iframed or opened full-page without ever
 * touching the site origin. Only exists for outputs that look like HTML.
 * Same `version` cache-busting contract as outputUrl().
 */
export function outputHtmlUrl(taskId: string, modelId: string, version?: string): string {
  // Extensionless on purpose: Cloudflare Pages 308-redirects /x.html → /x.
  const base = `/lab-data/llm-benchmark/outputs/${taskId}/${modelId}`
  return version ? `${base}?v=${encodeURIComponent(version)}` : base
}

const ROOT_CRUMBS: Crumb[] = [
  { label: 'Home', href: '/' },
  { label: 'Lab', href: '/lab/' },
  { label: 'LLM Benchmark', href: BENCHMARK_BASE_PATH },
]

export function benchmarkBreadcrumbs(...tail: Crumb[]): Crumb[] {
  return [...ROOT_CRUMBS, ...tail]
}

export function categoryBreadcrumbs(category: BenchmarkCategory): Crumb[] {
  return benchmarkBreadcrumbs({ label: category.label })
}

export function taskBreadcrumbs(task: BenchmarkTask): Crumb[] {
  const category = getCategory(task.category)
  return benchmarkBreadcrumbs(
    category ? { label: category.label, href: categoryPath(category) } : { label: task.category },
    { label: task.title },
  )
}

export function modelBreadcrumbs(model: BenchmarkModel): Crumb[] {
  return benchmarkBreadcrumbs(
    { label: 'Models', href: modelIndexPath() },
    { label: model.name },
  )
}
