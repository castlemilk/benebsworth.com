'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { BENCHMARK_MODELS, getModel } from '@/lib/lab/llm-benchmark/registry'
import type { BenchmarkResultMeta } from '@/lib/lab/llm-benchmark/results'
import { modelPath, outputUrl } from '@/lib/lab/llm-benchmark/nav'
import { ScoreBar } from './score-bar'
import { cn } from '@/lib/utils'
import { Code2, FileText, CheckCircle2, XCircle, Trophy, Loader2, ArrowRight } from 'lucide-react'

interface ModelOutputComparisonProps {
  taskId: string
  results: BenchmarkResultMeta[]
  taskTitle: string
}

export function ModelOutputComparison({ taskId, results, taskTitle }: ModelOutputComparisonProps) {
  const byModel = useMemo(() => new Map(results.map((r) => [r.modelId, r])), [results])

  const [leftModelId, setLeftModelId] = useState<string>(BENCHMARK_MODELS[0]?.id ?? '')
  const [rightModelId, setRightModelId] = useState<string>(
    BENCHMARK_MODELS[1]?.id ?? BENCHMARK_MODELS[0]?.id ?? '',
  )

  // Preselect the left pane from a `?model=` deep link (a results-table row).
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('model')
    if (!wanted || !BENCHMARK_MODELS.some((m) => m.id === wanted)) return
    setLeftModelId(wanted)
    setRightModelId((r) => (r === wanted ? BENCHMARK_MODELS.find((m) => m.id !== wanted)?.id ?? r : r))
  }, [])

  const leftResult = byModel.get(leftModelId)
  const rightResult = byModel.get(rightModelId)

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
          taskId={taskId}
          selectedModelId={leftModelId}
          otherModelId={rightModelId}
          onSelect={setLeftModelId}
          result={leftResult}
          opposingResult={rightResult}
        />
        <OutputPane
          position="right"
          taskId={taskId}
          selectedModelId={rightModelId}
          otherModelId={leftModelId}
          onSelect={setRightModelId}
          result={rightResult}
          opposingResult={leftResult}
        />
      </div>
    </div>
  )
}

interface OutputPaneProps {
  position: 'left' | 'right'
  taskId: string
  selectedModelId: string
  otherModelId: string
  onSelect: (modelId: string) => void
  result?: BenchmarkResultMeta
  opposingResult?: BenchmarkResultMeta
}

type OutputState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ready'; output: string }
  | { phase: 'error' }

function OutputPane({
  position,
  taskId,
  selectedModelId,
  otherModelId,
  onSelect,
  result,
  opposingResult,
}: OutputPaneProps) {
  const model = getModel(selectedModelId)
  const [state, setState] = useState<OutputState>({ phase: 'idle' })
  const seq = useRef(0)

  const hasOutput = Boolean(result?.hasOutput)
  const isSuccess = result?.status === 'success'
  const isWinner =
    isSuccess && opposingResult?.status === 'success' && (result?.score ?? 0) > (opposingResult?.score ?? 0)

  // Fetch the output on demand whenever the selected model (with an output) changes.
  useEffect(() => {
    if (!hasOutput) {
      setState({ phase: 'idle' })
      return
    }
    const id = ++seq.current
    setState({ phase: 'loading' })
    fetch(outputUrl(taskId, selectedModelId, result?.outputVersion), { cache: 'force-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json()
      })
      .then((data: { output?: string }) => {
        if (id !== seq.current) return
        setState(data.output ? { phase: 'ready', output: data.output } : { phase: 'error' })
      })
      .catch(() => {
        if (id !== seq.current) return
        setState({ phase: 'error' })
      })
  }, [taskId, selectedModelId, hasOutput, result?.outputVersion])

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
              aria-label={`${model.name} details`}
              className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:text-fg"
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
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
                  <XCircle className="h-3.5 w-3.5 text-rose-500" aria-hidden />
                )}
                {result.status}
              </span>
              <span>{Math.round(result.runtimeMs).toLocaleString()} ms</span>
              <span>${result.costUsd.toFixed(4)}</span>
              {result.source === 'seeded' && <span className="text-muted/70">sample data</span>}
            </div>
            <div className="mt-3 flex items-center gap-2">
              {isWinner && <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />}
              <ScoreBar score={result.score} className="flex-1" />
            </div>
          </>
        )}
      </div>

      <div className="flex-1 bg-[var(--color-bg)] p-4">
        {!hasOutput ? (
          <EmptyPane />
        ) : state.phase === 'ready' ? (
          <pre
            className={cn(
              'h-full max-h-[600px] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 font-mono text-xs leading-relaxed',
              !isSuccess && 'text-rose-600 dark:text-rose-400',
            )}
          >
            <code>{state.output}</code>
          </pre>
        ) : state.phase === 'error' ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
            <FileText className="h-8 w-8 text-muted" aria-hidden />
            <p className="mt-3 text-sm text-fg/70">Couldn’t load this output.</p>
          </div>
        ) : (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted" aria-hidden />
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyPane() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
      <FileText className="h-8 w-8 text-muted" aria-hidden />
      <p className="mt-3 text-sm text-fg/70">This model hasn’t been run on this task yet.</p>
      <p className="mt-1 max-w-xs text-xs text-muted">
        Its output will appear here after the next benchmark run.
      </p>
    </div>
  )
}
