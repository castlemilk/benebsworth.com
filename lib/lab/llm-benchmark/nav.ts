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
 */
export function outputUrl(taskId: string, modelId: string): string {
  return `/lab-data/llm-benchmark/outputs/${taskId}/${modelId}.json`
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
