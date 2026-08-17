import type { Crumb } from '@/components/site/breadcrumb'
import { BENCHMARK_TASKS, getCategory, getTask } from './registry'
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

/**
 * Static URL for one published run log (JSONL), written by
 * `scripts/publish-traces.mjs`. Fetched on demand by the run-trace disclosure.
 *
 * No `?v=` cache-buster, unlike the output URLs: the run id is part of the
 * path and a sweep never rewrites a published run's log, so the URL is already
 * content-stable — a re-run gets a new run id and therefore a new URL.
 */
export function traceUrl(runId: string, file: string): string {
  return `/lab-data/traces/${encodeURIComponent(runId)}/${encodeURIComponent(file)}`
}

/**
 * Static URL for one spill file inside a published run — the FULL bytes behind
 * a `{ spillRef, preview, bytes }` field. `spillRef` is already relative to the
 * run dir (`spill/<hash>.txt`).
 */
export function traceSpillUrl(runId: string, spillRef: string): string {
  return `/lab-data/traces/${encodeURIComponent(runId)}/${spillRef
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`
}

/**
 * DOM id of one model's trace disclosure on its task page — the landing spot
 * for a cross-run reference (`bench://<model>/<task>`). Every trace on a page
 * is one model's, so the model id is enough to be unique there.
 */
export function traceAnchorId(modelId: string): string {
  return `trace-${modelId}`
}

/**
 * Where a `bench://` reference points on this site: the target's task page,
 * anchored at that model's trace disclosure (which is where its evidence is).
 * Undefined when the task is not on the board — a reference can outlive the
 * task it names, and a dead link is worse than plain text.
 *
 * Refs carry task IDs; the route is built from the task's SLUG. They coincide
 * for every task shipped so far, and this is the seam that keeps that a
 * coincidence rather than a contract.
 *
 * `anchor: false` for a target with NO published trace: the disclosure that id
 * belongs to is not rendered on that page, and a fragment that matches nothing
 * silently drops the reader at the top with no explanation.
 */
export function benchRefPath(
  ref: { modelId: string; taskId: string },
  options: { anchor?: boolean } = {},
): string | undefined {
  const task = BENCHMARK_TASKS.find((t) => t.id === ref.taskId) ?? getTask(ref.taskId)
  if (!task) return undefined
  return options.anchor === false
    ? taskPath(task)
    : `${taskPath(task)}#${traceAnchorId(ref.modelId)}`
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
