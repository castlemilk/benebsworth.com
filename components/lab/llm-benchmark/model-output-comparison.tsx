'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { BENCHMARK_MODELS, getModel } from '@/lib/lab/llm-benchmark/registry'
import type { BenchmarkResult } from '@/lib/lab/llm-benchmark/types'
import { modelPath } from '@/lib/lab/llm-benchmark/nav'
import { formatScore } from './format'
import { cn } from '@/lib/utils'
import { Code2, FileText, CheckCircle2, XCircle, Trophy } from 'lucide-react'

interface ModelOutputComparisonProps {
  results: BenchmarkResult[]
  taskTitle: string
}

function getResultMap(results: BenchmarkResult[]) {
  return new Map(results.map((r) => [r.modelId, r]))
}

export function ModelOutputComparison({ results, taskTitle }: ModelOutputComparisonProps) {
  const byModel = useMemo(() => getResultMap(results), [results])

  const [leftModelId, setLeftModelId] = useState<string>(BENCHMARK_MODELS[0]?.id ?? '')
  const [rightModelId, setRightModelId] = useState<string>(BENCHMARK_MODELS[1]?.id ?? BENCHMARK_MODELS[0]?.id ?? '')

  const leftResult = byModel.get(leftModelId)
  const rightResult = byModel.get(rightModelId)
  const leftModel = getModel(leftModelId)
  const rightModel = getModel(rightModelId)

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-3">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted">
          <Code2 className="h-4 w-4" aria-hidden />
          Model outputs
        </div>
        <p className="mt-1 text-sm text-fg/60">
          Side-by-side generated outputs for “{taskTitle}”. Pick two models to compare their responses.
        </p>
      </div>

      <div className="grid divide-[var(--color-border)] md:grid-cols-2 md:divide-x">
        <OutputPane
          position="left"
          selectedModelId={leftModelId}
          otherModelId={rightModelId}
          onSelect={setLeftModelId}
          result={leftResult}
          opposingResult={rightResult}
          model={leftModel}
        />
        <OutputPane
          position="right"
          selectedModelId={rightModelId}
          otherModelId={leftModelId}
          onSelect={setRightModelId}
          result={rightResult}
          opposingResult={leftResult}
          model={rightModel}
        />
      </div>
    </div>
  )
}

function ScoreBadge({ score, isWinner }: { score: number; isWinner?: boolean }) {
  const widthPct = Math.max(0, Math.min(100, score))
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-muted">Automated score</span>
        <span className={cn('inline-flex items-center gap-1 font-semibold', score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')}>
          {isWinner && <Trophy className="h-3.5 w-3.5" aria-hidden />}
          {formatScore(score)}
          <span className="text-fg/40">/100</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)]">
        <div
          className={cn('h-full transition-all duration-500', score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500')}
          style={{ width: `${widthPct}%` }}
          aria-hidden
        />
      </div>
    </div>
  )
}

interface OutputPaneProps {
  position: 'left' | 'right'
  selectedModelId: string
  otherModelId: string
  onSelect: (modelId: string) => void
  result?: BenchmarkResult
  opposingResult?: BenchmarkResult
  model?: ReturnType<typeof getModel>
}

function OutputPane({ position, selectedModelId, otherModelId, onSelect, result, opposingResult, model }: OutputPaneProps) {
  const hasOutput = Boolean(result?.output && result.output.trim().length > 0)
  const isSuccess = result?.status === 'success'
  const isWinner =
    isSuccess &&
    opposingResult?.status === 'success' &&
    result.score > opposingResult.score

  return (
    <div className="flex min-h-[420px] flex-col">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <select
            aria-label={`${position} model`}
            value={selectedModelId}
            onChange={(e) => onSelect(e.target.value)}
            className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-project)]"
          >
            {BENCHMARK_MODELS.map((m) => (
              <option key={m.id} value={m.id} disabled={m.id === otherModelId}>
                {m.name} — {m.provider}
              </option>
            ))}
          </select>
          {model && (
            <Link
              href={modelPath(model)}
              className="shrink-0 font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:text-fg"
            >
              →
            </Link>
          )}
        </div>

        {result && (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                {isSuccess ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500" aria-hidden />
                )}
                {result.status}
              </span>
              <span>{Math.round(result.runtimeMs).toLocaleString()} ms</span>
              <span>${result.costUsd.toFixed(4)}</span>
            </div>
            <div className="mt-3">
              <ScoreBadge score={result.score} isWinner={isWinner} />
            </div>
          </>
        )}
      </div>

      <div className="flex-1 bg-[var(--color-bg)] p-4">
        {hasOutput ? (
          <pre
            className={cn(
              'h-full max-h-[600px] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 font-mono text-xs leading-relaxed',
              !isSuccess && 'text-red-600 dark:text-red-400'
            )}
          >
            <code>{result!.output}</code>
          </pre>
        ) : (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
            <FileText className="h-8 w-8 text-muted" aria-hidden />
            <p className="mt-3 text-sm text-fg/70">No captured output for this model yet.</p>
            <p className="mt-1 max-w-xs text-xs text-muted">
              Outputs are generated when the harness runs against a live API. Add a valid API key and run{' '}
              <code className="rounded bg-[var(--color-surface-2)] px-1 py-0.5">npm run benchmark:run</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
