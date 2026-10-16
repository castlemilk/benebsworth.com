'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, ArrowUpDown, BookOpen, ChevronDown, ChevronRight, ExternalLink, Search } from 'lucide-react'
import type { ModelRanking } from '@/lib/lab/llm-benchmark/analytics'
import type { AggregateStats } from '@/lib/lab/llm-benchmark/harness'
import type { BenchmarkResultMeta } from '@/lib/lab/llm-benchmark/results'
import { BENCHMARK_CATEGORIES, getCategory, getTask } from '@/lib/lab/llm-benchmark/registry'
import { modelPath, taskPath } from '@/lib/lab/llm-benchmark/nav'
import { ScoreBar } from './score-bar'
import { StatusBadge } from './status-badge'
import { formatContextWindow, formatCost, formatPricingPer1M, formatRuntime, formatTokens } from './format'
import { ModelLogoBadge } from './model-logo'
import { cn } from '@/lib/utils'

type SortKey = 'score' | 'runtime' | 'cost' | 'tokens' | 'completion'
type SortDirection = 'asc' | 'desc'

interface CategoryStats extends AggregateStats {
  results: BenchmarkResultMeta[]
}

interface ModelRow {
  ranking: ModelRanking
  stats: AggregateStats
  results: BenchmarkResultMeta[]
}

function aggregate(results: BenchmarkResultMeta[]): AggregateStats {
  if (results.length === 0) {
    return { count: 0, avgScore: 0, avgRuntimeMs: 0, avgCostUsd: 0, totalTokensIn: 0, totalTokensOut: 0, totalIterations: 0, successRate: 0 }
  }
  const successful = results.filter((result) => result.status === 'success').length
  return {
    count: results.length,
    avgScore: results.reduce((sum, result) => sum + result.score, 0) / results.length,
    avgRuntimeMs: results.reduce((sum, result) => sum + result.runtimeMs, 0) / results.length,
    avgCostUsd: results.reduce((sum, result) => sum + result.costUsd, 0) / results.length,
    totalTokensIn: results.reduce((sum, result) => sum + result.tokensIn, 0),
    totalTokensOut: results.reduce((sum, result) => sum + result.tokensOut, 0),
    totalIterations: results.reduce((sum, result) => sum + result.iterations, 0),
    successRate: successful / results.length,
  }
}

function categoryResults(results: BenchmarkResultMeta[]): Map<string, CategoryStats> {
  const grouped = new Map<string, BenchmarkResultMeta[]>()
  for (const result of results) {
    const category = getTask(result.taskId)?.category
    if (!category) continue
    grouped.set(category, [...(grouped.get(category) ?? []), result])
  }
  return new Map([...grouped.entries()].map(([category, categoryRows]) => [category, { ...aggregate(categoryRows), results: categoryRows }]))
}

function sortableValue(row: ModelRow, key: SortKey): number {
  if (key === 'completion') return row.stats.successRate
  return row.stats[key === 'runtime' ? 'avgRuntimeMs' : key === 'cost' ? 'avgCostUsd' : key === 'tokens' ? 'totalTokensIn' : 'avgScore']
}

export function BenchmarkTable({ rankings, rows }: { rankings: ModelRanking[]; rows: BenchmarkResultMeta[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'score', direction: 'desc' })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const modelRows = useMemo<ModelRow[]>(() => rankings.map((ranking) => {
    const modelResults = rows.filter((row) => row.modelId === ranking.model.id)
    const categoryStats = categoryResults(modelResults)
    const selected = category === 'all' ? undefined : categoryStats.get(category)
    return { ranking, stats: selected ?? ranking.stats, results: selected?.results ?? modelResults }
  }), [category, rankings, rows])

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return modelRows
      .filter((row) => {
        if (category !== 'all' && row.results.length === 0) return false
        const model = row.ranking.model
        return !normalizedQuery || [model.name, model.provider, model.company, model.family].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedQuery))
      })
      .sort((a, b) => {
        const difference = sortableValue(b, sort.key) - sortableValue(a, sort.key)
        return sort.direction === 'desc' ? difference : -difference
      })
  }, [category, modelRows, query, sort])

  const toggleSort = (key: SortKey) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
  }))

  const toggleExpanded = (modelId: string) => setExpanded((current) => {
    const next = new Set(current)
    if (next.has(modelId)) next.delete(modelId)
    else next.add(modelId)
    return next
  })

  const selectedCategory = category === 'all' ? undefined : getCategory(category)
  const scoreLabel = selectedCategory ? `${selectedCategory.label} score` : 'Avg score'

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
          <span className="sr-only">Search models</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search models"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 font-mono text-xs text-fg placeholder:text-muted focus:border-fg/30 focus:outline-none"
          />
        </label>
        <label className="sr-only" htmlFor="benchmark-category">Filter by category</label>
        <select
          id="benchmark-category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value)
            setSort({ key: 'score', direction: 'desc' })
          }}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs text-fg focus:border-fg/30 focus:outline-none"
        >
          <option value="all">All categories</option>
          {BENCHMARK_CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
        </select>
        <span className="ml-auto font-mono text-xs text-muted">
          {visibleRows.length} of {modelRows.length} models
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <caption className="sr-only">LLM benchmark model rankings with score, runtime, cost, token usage, completion and expandable task details.</caption>
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th scope="col" className="w-12 py-3 pl-4 text-left font-mono text-[0.65rem] uppercase tracking-wider text-muted">#</th>
              <th scope="col" className="min-w-[240px] py-3 text-left font-mono text-[0.65rem] uppercase tracking-wider text-muted">Model</th>
              <SortHeader label={scoreLabel} sortKey="score" sort={sort} onToggle={toggleSort} />
              <SortHeader label="Runtime" sortKey="runtime" sort={sort} onToggle={toggleSort} />
              <SortHeader label="Avg cost" sortKey="cost" sort={sort} onToggle={toggleSort} />
              <SortHeader label="Tokens" sortKey="tokens" sort={sort} onToggle={toggleSort} />
              <SortHeader label="Completion" sortKey="completion" sort={sort} onToggle={toggleSort} />
              <th scope="col" className="w-12 py-3 pr-3" aria-label="Details" />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const model = row.ranking.model
              const isExpanded = expanded.has(model.id)
              return (
                <ModelTableRow
                  key={model.id}
                  row={row}
                  index={index}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpanded(model.id)}
                  category={category}
                />
              )
            })}
            {visibleRows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center font-mono text-xs text-muted">No models match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SortHeader({ label, sortKey, sort, onToggle }: { label: string; sortKey: SortKey; sort: { key: SortKey; direction: SortDirection }; onToggle: (key: SortKey) => void }) {
  const active = sort.key === sortKey
  const Icon = active ? (sort.direction === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown
  return (
    <th scope="col" aria-sort={active ? (sort.direction === 'desc' ? 'descending' : 'ascending') : 'none'} className="whitespace-nowrap py-3 text-right font-mono text-[0.65rem] uppercase tracking-wider text-muted">
      <button type="button" onClick={() => onToggle(sortKey)} className="group ml-auto inline-flex items-center gap-1 pr-1 hover:text-fg">
        {label}<Icon className={cn('h-3 w-3', active ? 'text-fg' : 'text-muted/50 group-hover:text-fg/60')} aria-hidden />
      </button>
    </th>
  )
}

function ModelTableRow({ row, index, isExpanded, onToggle, category }: { row: ModelRow; index: number; isExpanded: boolean; onToggle: () => void; category: string }) {
  const model = row.ranking.model
  const totalTokens = row.stats.totalTokensIn + row.stats.totalTokensOut
  return (
    <>
      <tr className={cn('border-b border-[var(--color-border)]/60 transition-colors hover:bg-[var(--color-surface-2)]/50', isExpanded && 'bg-[var(--color-surface-2)]/60')}>
        <td className="py-4 pl-4 font-mono text-sm tabular-nums text-muted">{String(index + 1).padStart(2, '0')}</td>
        <td className="py-4">
          <div className="flex items-center gap-3">
            <ModelLogoBadge model={model} size={34} />
            <div className="min-w-0">
              <Link href={modelPath(model)} className="block truncate font-medium hover:text-[var(--color-project)]">{model.name}</Link>
              <div className="truncate font-mono text-[0.62rem] uppercase tracking-wider text-muted">{model.company ?? model.provider} · {model.family ?? model.provider} · {row.stats.count} runs</div>
            </div>
          </div>
        </td>
        <td className="py-4 pl-3"><ScoreBar score={row.stats.avgScore} width="w-16" className="justify-end" /></td>
        <td className="whitespace-nowrap py-4 text-right font-mono text-xs tabular-nums text-fg/70">{formatRuntime(row.stats.avgRuntimeMs)}</td>
        <td className="whitespace-nowrap py-4 text-right font-mono text-xs tabular-nums text-fg/70">{formatCost(row.stats.avgCostUsd)}</td>
        <td className="whitespace-nowrap py-4 text-right font-mono text-xs tabular-nums text-fg/70">{formatTokens(totalTokens)}</td>
        <td className="whitespace-nowrap py-4 text-right font-mono text-xs tabular-nums text-fg/70">{Math.round(row.stats.successRate * 100)}%</td>
        <td className="py-4 pr-3 text-right">
          <button type="button" onClick={onToggle} aria-expanded={isExpanded} aria-label={`${isExpanded ? 'Hide' : 'Show'} task details for ${model.name}`} className="rounded-md p-1.5 text-muted hover:bg-[var(--color-surface)] hover:text-fg">
            {isExpanded ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
          </button>
        </td>
      </tr>
      {isExpanded && <ExpandedModelRow row={row} category={category} />}
    </>
  )
}

function ExpandedModelRow({ row, category }: { row: ModelRow; category: string }) {
  const results = [...row.results].sort((a, b) => a.taskId.localeCompare(b.taskId))
  return (
    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40">
      <td colSpan={8} className="p-0">
              <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--color-border)]/70 pb-3">
            <div className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-wider text-muted">
              <ModelLogoBadge model={row.ranking.model} size={24} />
              <span>{row.ranking.model.company ?? row.ranking.model.provider}</span>
              {row.ranking.model.provider !== (row.ranking.model.company ?? row.ranking.model.provider) && (
                <span className="text-muted/60">via {row.ranking.model.provider}</span>
              )}
            </div>
            <span className="font-mono text-[0.65rem] text-muted">{formatContextWindow(row.ranking.model.contextWindow)} context</span>
            <span className="font-mono text-[0.65rem] text-muted">{formatPricingPer1M(row.ranking.model)}</span>
            {row.ranking.model.params && <span className="font-mono text-[0.65rem] text-muted">{row.ranking.model.params}</span>}
            <div className="ml-auto flex items-center gap-2">
              {row.ranking.model.modelCardUrl && (
                <a href={row.ranking.model.modelCardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[0.65rem] text-muted hover:text-fg">
                  <BookOpen className="h-3 w-3" aria-hidden /> Card
                </a>
              )}
              {row.ranking.model.vendorUrl && (
                <a href={row.ranking.model.vendorUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[0.65rem] text-muted hover:text-fg">
                  <ExternalLink className="h-3 w-3" aria-hidden /> Site
                </a>
              )}
            </div>
          </div>
          {row.ranking.model.blurb && (
            <p className="sm:col-span-2 lg:col-span-3 font-mono text-[0.68rem] leading-relaxed text-muted">{row.ranking.model.blurb}</p>
          )}
           {results.map((result) => {
            const task = getTask(result.taskId)
            const taskCategory = task ? getCategory(task.category) : undefined
            return (
              <Link key={result.taskId} href={task ? `${taskPath(task)}?model=${encodeURIComponent(result.modelId)}#run` : modelPath(row.ranking.model)} className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 hover:border-fg/25">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 truncate font-mono text-xs text-fg/75">{task?.title ?? result.taskId}</span>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">{result.score.toFixed(1)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.62rem] text-muted">
                  {taskCategory && <span style={{ color: taskCategory.accent }}>{taskCategory.label}</span>}
                  <span>{formatRuntime(result.runtimeMs)}</span>
                  <span>{formatCost(result.costUsd)}</span>
                  <StatusBadge status={result.status} />
                </div>
              </Link>
            )
          })}
          {results.length === 0 && <p className="font-mono text-xs text-muted">No results for this category.</p>}
          {category === 'all' && row.ranking.hasSeeded && <p className="sm:col-span-2 lg:col-span-3 font-mono text-[0.65rem] text-muted">Sample data is included for this model and marked in the source results.</p>}
        </div>
      </td>
    </tr>
  )
}
