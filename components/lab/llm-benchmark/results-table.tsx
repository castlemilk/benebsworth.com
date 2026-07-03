'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { BENCHMARK_RESULTS, getCategory, getModel, getTask } from '@/lib/lab/llm-benchmark/registry'
import { modelPath } from '@/lib/lab/llm-benchmark/nav'
import { StatusBadge } from './status-badge'
import { formatScore, formatRuntime, formatCost, formatTokens } from './format'
import { cn } from '@/lib/utils'

type SortKey = 'score' | 'runtimeMs' | 'costUsd' | 'tokens'
type SortDir = 'asc' | 'desc'

export function ResultsTable() {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'score', dir: 'desc' })

  const rows = useMemo(() => {
    const list = [...BENCHMARK_RESULTS].map((r) => ({ ...r, tokens: r.tokensIn + r.tokensOut }))
    list.sort((a, b) => {
      const valA = sort.key === 'tokens' ? a.tokens : a[sort.key]
      const valB = sort.key === 'tokens' ? b.tokens : b[sort.key]
      return sort.dir === 'desc' ? Number(valB) - Number(valA) : Number(valA) - Number(valB)
    })
    return list
  }, [sort])

  const toggle = (key: SortKey) => {
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))
  }

  const Header = ({
    label,
    sortKey,
    align = 'left',
  }: {
    label: string
    sortKey: SortKey
    align?: 'left' | 'right'
  }) => {
    const active = sort.key === sortKey
    const Icon = active ? (sort.dir === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown
    return (
      <th className={cn('pb-3 pt-1', align === 'right' ? 'text-right' : 'text-left')}>
        <button
          onClick={() => toggle(sortKey)}
          className="group inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted transition-colors hover:text-fg"
        >
          {label}
          <Icon
            className={cn(
              'h-3 w-3 transition-colors',
              active ? 'text-fg' : 'text-muted/50 group-hover:text-fg/60',
            )}
            aria-hidden
          />
        </button>
      </th>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="pb-3 pl-5 pt-4 text-left font-mono text-[0.65rem] uppercase tracking-wider text-muted">
              Task
            </th>
            <th className="pb-3 pt-4 text-left font-mono text-[0.65rem] uppercase tracking-wider text-muted">
              Model
            </th>
            <Header label="Score" sortKey="score" align="right" />
            <Header label="Runtime" sortKey="runtimeMs" align="right" />
            <Header label="Tokens" sortKey="tokens" align="right" />
            <Header label="Cost" sortKey="costUsd" align="right" />
            <th className="pb-3 pr-5 pt-4 text-right font-mono text-[0.65rem] uppercase tracking-wider text-muted">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const task = getTask(r.taskId)
            const category = task ? getCategory(task.category) : undefined
            const model = getModel(r.modelId)
            const tokens = r.tokensIn + r.tokensOut
            return (
              <tr
                key={`${r.taskId}-${r.modelId}`}
                className="border-b border-[var(--color-border)]/60 last:border-0 transition-colors hover:bg-[var(--color-surface-2)]/50"
              >
                <td className="py-3 pl-5">
                  <div className="flex items-center gap-2.5">
                    {category && (
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs"
                        style={{ color: category.accent }}
                        aria-hidden
                      >
                        {category.glyph}
                      </span>
                    )}
                    <span className="type-body font-medium">{task?.title ?? r.taskId}</span>
                  </div>
                </td>
                <td className="py-3">
                  {model ? (
                    <Link
                      href={modelPath(model)}
                      className="font-mono text-[0.75rem] text-fg/80 transition-colors hover:text-[var(--color-project)]"
                    >
                      {model.name}
                    </Link>
                  ) : (
                    <span className="font-mono text-[0.75rem] text-fg/80">{r.modelId}</span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <span className="font-mono text-[0.8rem] font-medium tabular-nums">
                    {formatScore(r.score)}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <span className="font-mono text-[0.75rem] tabular-nums text-fg/70">
                    {formatRuntime(r.runtimeMs)}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <span className="font-mono text-[0.75rem] tabular-nums text-fg/70">
                    {formatTokens(tokens)}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <span className="font-mono text-[0.75rem] tabular-nums text-fg/70">
                    {formatCost(r.costUsd)}
                  </span>
                </td>
                <td className="py-3 pr-5 text-right">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
