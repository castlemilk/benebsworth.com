'use client'

import { useMemo, useState, Fragment } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  flexRender,
  createColumnHelper,
  type SortingState,
  type FilterFn,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import Link from 'next/link'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react'
import type { BenchmarkResult, BenchmarkModel } from '@/lib/lab/llm-benchmark/types'
import type { LocalModelResult } from '@/lib/lab/local-llm/types'
import { BENCHMARK_MODELS, getModel, getTask } from '@/lib/lab/llm-benchmark/registry'
import { taskPath } from '@/lib/lab/llm-benchmark/nav'
import { ModelLogoBadge } from './model-logo'
import { scoreColors } from './bench-theme'
import { cn } from '@/lib/utils'

interface ModelMeta {
  params: string
  size: string
  quant: string
  context: string
  blurb: string
  family: string
  accent: string
}

const MODEL_META: Record<string, ModelMeta> = {
  'gemma3:4b': { params: '4B', size: '3.3GB', quant: 'Q4_K_M', context: '128K', blurb: 'Gemma 3 4B — multimodal, 4B dense, fastest single-GPU model.', family: 'Gemma 3', accent: '#4285f4' },
  'qwen3:8b': { params: '8.2B', size: '5.2GB', quant: 'Q4_K_M', context: '41K', blurb: 'Qwen3 8B — Alibaba 8B dense, 36 layers, thinking-capable.', family: 'Qwen3', accent: '#8b5cf6' },
  'gemma3:12b': { params: '12B', size: '8.1GB', quant: 'Q4_K_M', context: '128K', blurb: 'Gemma 3 12B — 12B dense multimodal, sweet spot.', family: 'Gemma 3', accent: '#0ea5e9' },
  'gemma3:27b': { params: '27B', size: '17GB', quant: 'Q4_K_M', context: '128K', blurb: 'Gemma 3 27B — flagship 27B dense.', family: 'Gemma 3', accent: '#f59e0b' },
  'qwen3:14b': { params: '14B', size: '9.0GB', quant: 'Q4_K_M', context: '41K', blurb: 'Qwen3 14B — mid-size dense, strong code/reasoning.', family: 'Qwen3', accent: '#10b981' },
  'qwen3:32b': { params: '32B', size: '19GB', quant: 'Q4_K_M', context: '41K', blurb: 'Qwen3 32B — largest dense Qwen3.', family: 'Qwen3', accent: '#ef4444' },
  'qwen3.8:27b-mlx': { params: '27.8B', size: '18GB', quant: 'nvfp4 · MLX', context: '256K', blurb: 'Qwen3.8 27B MLX — native MLX, 94.7 avg with thinking.', family: 'Qwen3.8', accent: '#06b6d4' },
  'ornith-1.5:35b': { params: '35B', size: '23GB', quant: 'Q4_K_M', context: '256K', blurb: 'Ornith 1.5 35B — 112 tok/s, self-improving.', family: 'Ornith 1.5', accent: '#f43f5e' },
}

function toScoredId(speedId: string): string {
  return speedId.replace(/:/g, '-') + '-ollama'
}

function scoredForModel(speedId: string, results: BenchmarkResult[]) {
  const sid = toScoredId(speedId)
  return results.filter(r => r.modelId === sid)
}

function avgScore(speedId: string, results: BenchmarkResult[]) {
  const rs = scoredForModel(speedId, results)
  if (rs.length === 0) return null
  return rs.reduce((s, r) => s + r.score, 0) / rs.length
}

const fuzzyFilter: FilterFn<RowData> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value as string)
  addMeta({ itemRank })
  return itemRank.passed
}

interface RowData {
  id: string
  rank: number
  model: LocalModelResult
  meta: ModelMeta
  benchModel: BenchmarkModel | undefined
  genTps: number
  promptTps: number
  ttftMs: number
  avgScore: number | null
  scoredCount: number
  scoredRows: BenchmarkResult[]
  family: string
  params: string
  size: string
  context: string
}

const col = createColumnHelper<RowData>()

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="font-mono text-xs text-muted">—</span>
  const { text } = scoreColors(score)
  return (
    <span className={cn('font-mono text-sm font-semibold tabular-nums', text)}>
      {score.toFixed(1)}
    </span>
  )
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="h-3 w-3 text-[var(--color-accent)]" />
  if (sorted === 'desc') return <ArrowDown className="h-3 w-3 text-[var(--color-accent)]" />
  return <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
}

function FacetedFilter({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string
  options: { label: string; value: string; count?: number }[]
  selected: Set<string>
  onSelect: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs transition-colors',
          selected.size > 0
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
            : 'border-[var(--color-border)] text-muted hover:border-fg/20 hover:text-fg',
        )}
      >
        <SlidersHorizontal className="h-3 w-3" />
        {title}
        {selected.size > 0 && (
          <span className="ml-0.5 rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[0.55rem] font-semibold text-white">
            {selected.size}
          </span>
        )}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-xl">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => onSelect(opt.value)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-xs transition-colors',
                  selected.has(opt.value)
                    ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : 'text-fg/70 hover:bg-[var(--color-surface-2)]',
                )}
              >
                <span
                  className={cn(
                    'flex h-3.5 w-3.5 items-center justify-center rounded border',
                    selected.has(opt.value)
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                      : 'border-[var(--color-border)]',
                  )}
                >
                  {selected.has(opt.value) && (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </span>
                {opt.label}
                {opt.count != null && (
                  <span className="ml-auto text-muted">{opt.count}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ExpandedRowContent({ row }: { row: RowData }) {
  const { model, scoredRows, meta } = row
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <div className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Speed breakdown</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {model.entries.map(e => (
            <div key={e.file} className="rounded-lg bg-[var(--color-surface)] p-2.5">
              <div className="font-mono text-[0.6rem] uppercase tracking-wider text-muted">{e.prompt_set} · {e.tokens} tok</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-mono text-sm font-medium tabular-nums">{e.aggregate.gen_tps_mean.toFixed(1)}</span>
                <span className="font-mono text-[0.6rem] text-muted">tok/s</span>
              </div>
              <div className="font-mono text-[0.6rem] text-muted">
                TTFT {e.aggregate.ttft_ms_mean.toFixed(0)}ms · prompt {e.aggregate.prompt_tps_mean.toFixed(0)} tok/s
              </div>
            </div>
          ))}
        </div>
      </div>
      {scoredRows.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <div className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Per-task scores</div>
          <div className="grid gap-1.5">
            {scoredRows
              .sort((a, b) => a.taskId.localeCompare(b.taskId))
              .map(r => {
                const t = getTask(r.taskId)
                const sid = toScoredId(model.id)
                const href = t ? `${taskPath(t)}?model=${encodeURIComponent(sid)}#run` : `/lab/llm-benchmark/models/${sid}/`
                const { text } = scoreColors(r.score)
                return (
                  <Link
                    key={r.taskId}
                    href={href}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 font-mono text-xs transition-colors hover:bg-[var(--color-surface)]"
                  >
                    <span className="text-fg/70">
                      {r.taskId.replace('circuit-builder-teaser', 'circuit').replace('physics-pendulum-wave', 'pendulum').replace('landing-page-morph', 'landing').replace('crypto-hash-race', 'crypto').replace('equation-solver', 'equation').replace('n-body-field', 'n-body').replace('mini-platformer', 'platformer')}
                    </span>
                    <span className={cn('font-semibold tabular-nums', text)}>{r.score.toFixed(1)}</span>
                  </Link>
                )
              })}
          </div>
        </div>
      )}
      <div className="sm:col-span-2">
        <p className="max-w-prose text-sm leading-relaxed text-fg/65">{meta.blurb}</p>
      </div>
    </div>
  )
}

interface ModelTableProps {
  models: LocalModelResult[]
  scoredResults: BenchmarkResult[]
  maxGenTps: number
}

export function ModelTable({ models, scoredResults, maxGenTps }: ModelTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'genTps', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const data = useMemo<RowData[]>(() =>
    models.map((m, i) => {
      const meta = MODEL_META[m.id] ?? { accent: '#7c5cff', family: 'Local', size: '—', params: '—', quant: 'Q4_K_M', context: '—', blurb: '' }
      const benchModel = getModel(toScoredId(m.id)) ?? BENCHMARK_MODELS.find((x) => x.apiModelId === m.id) ?? undefined
      const avg = avgScore(m.id, scoredResults)
      const rows = scoredForModel(m.id, scoredResults)
      return {
        id: m.id,
        rank: i + 1,
        model: m,
        meta,
        benchModel,
        genTps: m.summary.gen_tps_mean ?? 0,
        promptTps: m.summary.prompt_tps_mean ?? 0,
        ttftMs: m.summary.ttft_ms_mean ?? 0,
        avgScore: avg,
        scoredCount: rows.length,
        scoredRows: rows,
        family: meta.family,
        params: meta.params,
        size: meta.size,
        context: meta.context,
      }
    }),
    [models, scoredResults],
  )

  const columns = useMemo(() => [
    col.accessor('rank', {
      id: 'rank',
      header: '#',
      enableSorting: true,
      cell: info => (
        <span className="font-mono text-sm tabular-nums text-muted">{String(info.getValue()).padStart(2, '0')}</span>
      ),
      size: 40,
    }),
    col.accessor('id', {
      id: 'model',
      header: 'Model',
      enableSorting: true,
      cell: info => {
        const row = info.row.original
        return (
          <div className="flex items-center gap-3">
            {row.benchModel ? (
              <ModelLogoBadge model={row.benchModel} size={36} />
            ) : (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-mono text-xs"
                style={{
                  color: row.meta.accent,
                  borderColor: `color-mix(in srgb, ${row.meta.accent} 35%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${row.meta.accent} 10%, transparent)`,
                }}
              >
                {row.rank}
              </span>
            )}
            <div className="min-w-0">
              <div className="font-medium leading-tight">{row.model.displayName || row.id}</div>
              <div className="font-mono text-[0.6rem] text-muted">{row.size} · {row.meta.quant}</div>
            </div>
          </div>
        )
      },
      size: 220,
      filterFn: 'includesString',
    }),
    col.accessor('family', {
      id: 'family',
      header: 'Family',
      enableSorting: true,
      cell: info => (
        <span className="font-mono text-xs" style={{ color: info.row.original.meta.accent }}>
          {info.getValue()}
        </span>
      ),
      size: 100,
      filterFn: (row, columnId, filterValue: string[]) => {
        const val = row.getValue<string>(columnId)
        return filterValue.length === 0 || filterValue.includes(val)
      },
    }),
    col.accessor('params', {
      id: 'params',
      header: 'Params',
      enableSorting: true,
      cell: info => <span className="font-mono text-xs tabular-nums text-fg/70">{info.getValue()}</span>,
      size: 80,
    }),
    col.accessor('genTps', {
      id: 'genTps',
      header: 'Gen tok/s',
      enableSorting: true,
      cell: info => {
        const val = info.getValue()
        const pct = maxGenTps > 0 ? (val / maxGenTps) * 100 : 0
        const accent = info.row.original.meta.accent
        return (
          <div className="flex items-center gap-2.5">
            <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${pct}%`, backgroundColor: accent }}
              />
            </div>
            <span className="font-mono text-sm font-medium tabular-nums">{val > 0 ? val.toFixed(1) : '—'}</span>
          </div>
        )
      },
      size: 140,
    }),
    col.accessor('promptTps', {
      id: 'promptTps',
      header: 'Prompt tok/s',
      enableSorting: true,
      cell: info => (
        <span className="font-mono text-xs tabular-nums text-muted">
          {info.getValue() > 0 ? info.getValue().toFixed(0) : '—'}
        </span>
      ),
      size: 100,
    }),
    col.accessor('ttftMs', {
      id: 'ttftMs',
      header: 'TTFT',
      enableSorting: true,
      cell: info => (
        <span className="font-mono text-xs tabular-nums text-muted">
          {info.getValue() > 0 ? `${info.getValue().toFixed(1)}ms` : '—'}
        </span>
      ),
      size: 80,
    }),
    col.accessor('avgScore', {
      id: 'avgScore',
      header: 'Score',
      enableSorting: true,
      sortingFn: (a, b, columnId) => {
        // Sort nulls last
        const aVal = a.getValue<number | null>(columnId)
        const bVal = b.getValue<number | null>(columnId)
        if (aVal === null && bVal === null) return 0
        if (aVal === null) return 1
        if (bVal === null) return -1
        return aVal - bVal
      },
      cell: info => <ScorePill score={info.getValue()} />,
      size: 80,
    }),
    col.accessor('context', {
      id: 'context',
      header: 'Ctx',
      enableSorting: true,
      cell: info => (
        <span className="font-mono text-xs tabular-nums text-muted">{info.getValue()}</span>
      ),
      size: 60,
    }),
  ], [maxGenTps])

  const uniqueFamilies = useMemo(() => {
    const set = new Set(models.map(m => MODEL_META[m.id]?.family ?? 'Local'))
    return [...set].sort()
  }, [models])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const familyFilter = columnFilters.find(f => f.id === 'family')
  const selectedFamilies = useMemo(() => new Set<string>(
    (familyFilter?.value as string[]) ?? []
  ), [familyFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search models..."
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 font-mono text-xs text-fg placeholder:text-muted focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/30"
          />
          {globalFilter && (
            <button
              onClick={() => setGlobalFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted hover:text-fg"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <FacetedFilter
          title="Family"
          options={uniqueFamilies.map(f => ({
            label: f,
            value: f,
            count: models.filter(m => (MODEL_META[m.id]?.family ?? 'Local') === f).length,
          }))}
          selected={selectedFamilies}
          onSelect={val => {
            setColumnFilters(prev => {
              const existing = prev.find(f => f.id === 'family')
              const current = new Set<string>((existing?.value as string[]) ?? [])
              if (current.has(val)) current.delete(val)
              else current.add(val)
              if (current.size === 0) return prev.filter(f => f.id !== 'family')
              return [...prev.filter(f => f.id !== 'family'), { id: 'family', value: [...current] }]
            })
          }}
        />

        <button
          onClick={() => setColumnVisibility({})}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1 font-mono text-xs text-muted transition-colors hover:border-fg/20 hover:text-fg"
        >
          Reset
        </button>

        {(globalFilter || selectedFamilies.size > 0) && (
          <div className="flex items-center gap-1.5">
            {selectedFamilies.size > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-0.5 font-mono text-[0.6rem] text-[var(--color-accent)]">
                {selectedFamilies.size} {selectedFamilies.size === 1 ? 'family' : 'families'}
                <button
                  onClick={() => setColumnFilters(prev => prev.filter(f => f.id !== 'family'))}
                  className="ml-0.5 rounded-full hover:bg-[var(--color-accent)]/20"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            {globalFilter && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-0.5 font-mono text-[0.6rem] text-[var(--color-accent)]">
                &ldquo;{globalFilter}&rdquo;
                <button
                  onClick={() => setGlobalFilter('')}
                  className="ml-0.5 rounded-full hover:bg-[var(--color-accent)]/20"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
          </div>
        )}

        <span className="ml-auto font-mono text-xs text-muted">
          {table.getFilteredRowModel().rows.length} of {models.length} models
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-[var(--color-border)]">
                {headerGroup.headers.map(header => {
                  const canSort = header.column.getCanSort()
                  const sortHandler = header.column.getToggleSortingHandler()
                  const isSorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'p-0 text-left font-mono text-[0.65rem] uppercase tracking-wider text-muted',
                        canSort && 'cursor-pointer',
                      )}
                      style={{ width: header.column.getSize() }}
                      scope="col"
                      aria-sort={isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : 'none'}
                    >
                      <button
                        type="button"
                        onClick={canSort ? sortHandler : undefined}
                        className={cn(
                          'group flex w-full items-center gap-1.5 px-4 py-3 text-left transition-colors',
                          canSort && 'hover:bg-[var(--color-surface-2)] hover:text-fg',
                          isSorted && 'text-[var(--color-accent)]',
                        )}
                        title={canSort ? `Sort by ${header.column.columnDef.header}` : undefined}
                      >
                        <span className="truncate">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {canSort && <SortIcon sorted={isSorted} />}
                      </button>
                    </th>
                  )
                })}
                <th className="w-8" />
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => {
              const isExpanded = expandedRows.has(row.original.id)
              return (
                <Fragment key={row.id}>
                  <tr
                    className={cn(
                      'border-b border-[var(--color-border)]/60 transition-colors hover:bg-[var(--color-surface-2)]',
                      isExpanded && 'bg-[var(--color-surface-2)]',
                    )}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                    <td className="px-2 py-3">
                      <button
                        onClick={() => toggleRow(row.original.id)}
                        className="rounded p-1 text-muted transition-colors hover:bg-[var(--color-surface)] hover:text-fg"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={row.getVisibleCells().length + 1} className="border-b border-[var(--color-border)]">
                        <ExpandedRowContent row={row.original} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center font-mono text-xs text-muted">
                  No models match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}