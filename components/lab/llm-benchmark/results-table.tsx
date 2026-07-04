'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { getCategory, getModel, getTask } from '@/lib/lab/llm-benchmark/registry'
import type { BenchmarkResultMeta } from '@/lib/lab/llm-benchmark/results'
import { taskPath, modelPath } from '@/lib/lab/llm-benchmark/nav'
import { StatusBadge } from './status-badge'
import { ScoreBar } from './score-bar'
import { formatRuntime, formatCost, formatTokens } from './format'
import { cn } from '@/lib/utils'

type SortKey = 'score' | 'runtimeMs' | 'costUsd' | 'tokens'
type SortDir = 'asc' | 'desc'
type View = 'byTask' | 'flat'
type Row = BenchmarkResultMeta & { tokens: number }

/**
 * The full results table. Rows are result METADATA (no generated output),
 * passed from the server page, so this component ships none of the heavy
 * results.json. Default view groups rows by task (the only ordering where a
 * score comparison is meaningful — you can't compare a maths score to a
 * physics score); a flat sortable view is available for cross-cutting scans.
 */
export function ResultsTable({ rows }: { rows: BenchmarkResultMeta[] }) {
  const [view, setView] = useState<View>('byTask')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'score', dir: 'desc' })

  const withTokens = useMemo<Row[]>(
    () => rows.map((r) => ({ ...r, tokens: r.tokensIn + r.tokensOut })),
    [rows],
  )

  const flatRows = useMemo(() => {
    const list = [...withTokens]
    list.sort((a, b) => {
      const valA = sort.key === 'tokens' ? a.tokens : a[sort.key]
      const valB = sort.key === 'tokens' ? b.tokens : b[sort.key]
      return sort.dir === 'desc' ? Number(valB) - Number(valA) : Number(valA) - Number(valB)
    })
    return list
  }, [withTokens, sort])

  const groups = useMemo(() => {
    const byTask = new Map<string, Row[]>()
    for (const r of withTokens) {
      const arr = byTask.get(r.taskId) ?? []
      arr.push(r)
      byTask.set(r.taskId, arr)
    }
    return [...byTask.entries()]
      .map(([taskId, list]) => ({
        taskId,
        task: getTask(taskId),
        rows: [...list].sort((a, b) => b.score - a.score),
      }))
      .sort((a, b) => (a.task?.title ?? a.taskId).localeCompare(b.task?.title ?? b.taskId))
  }, [withTokens])

  const toggle = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 font-mono text-[0.65rem] uppercase tracking-wider">
          {(['byTask', 'flat'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                'rounded-md px-3 py-1.5 transition-colors',
                view === v ? 'bg-[var(--color-surface-2)] text-fg' : 'text-muted hover:text-fg',
              )}
            >
              {v === 'byTask' ? 'By task' : 'All rows'}
            </button>
          ))}
        </div>
        <p className="hidden font-mono text-[0.65rem] text-muted sm:block">
          {rows.length} results · scores are heuristic 0–100
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">
            Benchmark results, one row per task and model, showing score, runtime, tokens, cost and status.
          </caption>
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th scope="col" className="whitespace-nowrap py-3 pl-5 text-left font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                {view === 'byTask' ? 'Model' : 'Task · Model'}
              </th>
              <SortHeader label="Score" sortKey="score" sort={sort} onToggle={toggle} view={view} />
              <SortHeader label="Runtime" sortKey="runtimeMs" sort={sort} onToggle={toggle} view={view} />
              <SortHeader label="Tokens" sortKey="tokens" sort={sort} onToggle={toggle} view={view} />
              <SortHeader label="Cost" sortKey="costUsd" sort={sort} onToggle={toggle} view={view} />
              <th scope="col" className="whitespace-nowrap py-3 pr-5 text-right font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                Status
              </th>
            </tr>
          </thead>

          {view === 'byTask' ? (
            groups.map((g) => {
              const category = g.task ? getCategory(g.task.category) : undefined
              return (
                <tbody key={g.taskId}>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60">
                    <th scope="colgroup" colSpan={6} className="py-2.5 pl-5 text-left">
                      <span className="inline-flex items-center gap-2">
                        {category && (
                          <span className="font-mono text-sm" style={{ color: category.accent }} aria-hidden>
                            {category.glyph}
                          </span>
                        )}
                        {g.task ? (
                          <Link href={taskPath(g.task)} className="font-medium hover:text-[var(--color-project)]">
                            {g.task.title}
                          </Link>
                        ) : (
                          <span className="font-medium">{g.taskId}</span>
                        )}
                      </span>
                    </th>
                  </tr>
                  {g.rows.map((r) => (
                    <ResultRow key={`${r.taskId}-${r.modelId}`} row={r} showTask={false} />
                  ))}
                </tbody>
              )
            })
          ) : (
            <tbody>
              {flatRows.map((r) => (
                <ResultRow key={`${r.taskId}-${r.modelId}`} row={r} showTask />
              ))}
            </tbody>
          )}
        </table>
      </div>
    </div>
  )
}

function SortHeader({
  label,
  sortKey,
  sort,
  onToggle,
  view,
}: {
  label: string
  sortKey: SortKey
  sort: { key: SortKey; dir: SortDir }
  onToggle: (k: SortKey) => void
  view: View
}) {
  const active = sort.key === sortKey
  const disabled = view === 'byTask'
  const Icon = active ? (sort.dir === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown
  return (
    <th
      scope="col"
      aria-sort={disabled ? undefined : active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none'}
      className="whitespace-nowrap py-3 text-right font-mono text-[0.65rem] uppercase tracking-wider text-muted"
    >
      {disabled ? (
        <span className="pr-1">{label}</span>
      ) : (
        <button
          type="button"
          onClick={() => onToggle(sortKey)}
          className="group ml-auto inline-flex items-center gap-1.5 pr-1 transition-colors hover:text-fg"
        >
          {label}
          <Icon
            className={cn('h-3 w-3', active ? 'text-fg' : 'text-muted/50 group-hover:text-fg/60')}
            aria-hidden
          />
        </button>
      )}
    </th>
  )
}

function ResultRow({ row, showTask }: { row: Row; showTask: boolean }) {
  const task = getTask(row.taskId)
  const category = task ? getCategory(task.category) : undefined
  const model = getModel(row.modelId)
  // The whole row navigates to this run: the task page with this model
  // preselected in the demo/comparison (see GeneratedDemo's ?model handling).
  const runHref = task ? `${taskPath(task)}?model=${encodeURIComponent(row.modelId)}#run` : undefined
  return (
    <tr className="group relative cursor-pointer border-b border-[var(--color-border)]/60 transition-colors last:border-0 hover:bg-[var(--color-surface-2)]/50">
      <td className="py-3 pl-5">
        <div className="flex items-center gap-2.5">
          {showTask && category && (
            <span className="shrink-0 font-mono text-xs" style={{ color: category.accent }} aria-hidden>
              {category.glyph}
            </span>
          )}
          <div className="flex min-w-0 flex-col">
            {/* Stretched link: covers the whole row (tr is relative) so any cell
                click opens the run. Named links below sit above it via z-10. */}
            {runHref && (
              <Link
                href={runHref}
                aria-label={`See ${model?.name ?? row.modelId} on ${task?.title ?? row.taskId}`}
                // z-[5] sits above cell content (score bar is a positioned div)
                // but below the named links (z-10), which stay independently clickable.
                className="absolute inset-0 z-[5]"
              />
            )}
            {showTask &&
              (task ? (
                <Link href={taskPath(task)} className="relative z-10 truncate font-medium hover:text-[var(--color-project)]">
                  {task.title}
                </Link>
              ) : (
                <span className="truncate font-medium">{row.taskId}</span>
              ))}
            {model ? (
              <Link
                href={modelPath(model)}
                className="relative z-10 w-fit truncate font-mono text-[0.72rem] text-fg/70 transition-colors hover:text-[var(--color-project)]"
              >
                {model.name}
                {row.source === 'seeded' && <span className="ml-1.5 text-[0.6rem] text-muted">· sample</span>}
              </Link>
            ) : (
              <span className="truncate font-mono text-[0.72rem] text-fg/70">{row.modelId}</span>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 pl-4">
        <ScoreBar score={row.score} width="w-16" className="justify-end" />
      </td>
      <td className="whitespace-nowrap py-3 text-right font-mono text-[0.72rem] tabular-nums text-fg/70">
        {formatRuntime(row.runtimeMs)}
      </td>
      <td className="whitespace-nowrap py-3 text-right font-mono text-[0.72rem] tabular-nums text-fg/70">
        {formatTokens(row.tokens)}
      </td>
      <td className="whitespace-nowrap py-3 text-right font-mono text-[0.72rem] tabular-nums text-fg/70">
        {formatCost(row.costUsd)}
      </td>
      <td className="py-3 pr-5 text-right">
        <StatusBadge status={row.status} />
      </td>
    </tr>
  )
}
