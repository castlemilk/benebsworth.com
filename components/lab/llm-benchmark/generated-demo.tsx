'use client'

import { useEffect, useRef, useState } from 'react'
import { BENCHMARK_MODELS, getModel } from '@/lib/lab/llm-benchmark/registry'
import type { BenchmarkResultMeta } from '@/lib/lab/llm-benchmark/results'
import type { BenchmarkTask } from '@/lib/lab/llm-benchmark/types'
import { outputUrl } from '@/lib/lab/llm-benchmark/nav'
import { cn } from '@/lib/utils'
import { Monitor, FileCode, AlertCircle, Play, Loader2 } from 'lucide-react'
import { ScoreBar } from './score-bar'

interface GeneratedDemoProps {
  task: BenchmarkTask
  /** Per-model result metadata for this task (no output strings). */
  results: BenchmarkResultMeta[]
  className?: string
}

const HTML_CATEGORIES = new Set([
  '3d-physics-animation',
  'advanced-game-building',
  'advanced-physics',
  'advanced-electronics',
  'ui-building',
])

function isHtmlRunnable(task: BenchmarkTask): boolean {
  return HTML_CATEGORIES.has(task.category)
}

// Injected into the artifact's <head> before its own markup. Two jobs:
//  1. a dark backdrop so the frame isn't a white/black void while the demo's
//     own CSS/scripts load;
//  2. an in-memory localStorage/sessionStorage shim — the frame runs with an
//     opaque origin (sandbox="allow-scripts", no allow-same-origin), where real
//     Storage access throws; without the shim a demo that reads localStorage at
//     startup would crash to a blank page.
const FRAME_PRELUDE = `<style>html,body{margin:0;background:#0c0c10;color:#ececf0;font-family:ui-sans-serif,system-ui}</style>
<script>
(function(){try{window.localStorage.getItem('_');}catch(e){
var m={},s={getItem:function(k){return k in m?m[k]:null;},setItem:function(k,v){m[k]=String(v);},removeItem:function(k){delete m[k];},clear:function(){m={};},key:function(i){return Object.keys(m)[i]||null;}};
Object.defineProperty(s,'length',{get:function(){return Object.keys(m).length;}});
try{Object.defineProperty(window,'localStorage',{value:s,configurable:true});Object.defineProperty(window,'sessionStorage',{value:s,configurable:true});}catch(_){}
}})();
</script>`

/** Insert the prelude into the artifact's <head> (falling back to <html> or the
 *  top) so the document keeps standards mode instead of the quirks mode that a
 *  node before <!DOCTYPE> would trigger. */
function withPrelude(html: string): string {
  const head = html.match(/<head[^>]*>/i)
  if (head?.index !== undefined) {
    const at = head.index + head[0].length
    return html.slice(0, at) + FRAME_PRELUDE + html.slice(at)
  }
  const htmlTag = html.match(/<html[^>]*>/i)
  if (htmlTag?.index !== undefined) {
    const at = htmlTag.index + htmlTag[0].length
    return html.slice(0, at) + '<head>' + FRAME_PRELUDE + '</head>' + html.slice(at)
  }
  return FRAME_PRELUDE + html
}

type LoadState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ready'; output: string }
  | { phase: 'error'; message: string }

export function GeneratedDemo({ task, results, className = '' }: GeneratedDemoProps) {
  const [selectedModelId, setSelectedModelId] = useState<string>(BENCHMARK_MODELS[0]?.id ?? '')
  const [state, setState] = useState<LoadState>({ phase: 'idle' })
  const [blobUrl, setBlobUrl] = useState<string | undefined>()
  const seq = useRef(0)

  const byModel = new Map(results.map((r) => [r.modelId, r]))
  const selectedResult = byModel.get(selectedModelId)
  const selectedModel = getModel(selectedModelId)
  const runnable = isHtmlRunnable(task)
  const hasOutput = Boolean(selectedResult?.hasOutput)

  // Auto-run HTML demos as soon as a model with output is selected so the
  // artifact renders without an extra click — except when the visitor prefers
  // reduced motion, where we leave the play gate so they opt in to the
  // WebGL/canvas animation instead of it starting under them.
  useEffect(() => {
    if (!runnable || !hasOutput || state.phase !== 'idle') return
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!reduce) run()
  }, [runnable, hasOutput, selectedModelId, state.phase])

  // Build (and later revoke) the blob URL from the loaded output. Creating the
  // URL in an effect keyed on the output — not inside useMemo — guarantees a
  // matching revoke and avoids leaking object URLs across model switches.
  useEffect(() => {
    if (state.phase !== 'ready' || !runnable) {
      setBlobUrl(undefined)
      return
    }
    const url = URL.createObjectURL(
      new Blob([withPrelude(state.output)], { type: 'text/html' }),
    )
    setBlobUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [state, runnable])

  async function run() {
    if (!hasOutput) return
    const id = ++seq.current
    setState({ phase: 'loading' })
    try {
      const res = await fetch(outputUrl(task.id, selectedModelId), { cache: 'force-cache' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { output?: string }
      if (id !== seq.current) return // a newer request superseded this one
      if (!data.output) throw new Error('empty output')
      setState({ phase: 'ready', output: data.output })
    } catch (err) {
      if (id !== seq.current) return
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'failed to load' })
    }
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]', className)}>
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-3">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted">
          <Monitor className="h-4 w-4" aria-hidden />
          Generated demo
        </div>
        <p className="mt-1 text-sm text-fg/60">
          Render the artifact a model actually produced for “{task.title}”.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <select
          aria-label="Model for generated demo"
          value={selectedModelId}
          onChange={(e) => {
            setSelectedModelId(e.target.value)
            setState({ phase: 'idle' })
          }}
          className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-project)]"
        >
          {BENCHMARK_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {selectedResult && <ScoreBar score={selectedResult.score} width="w-20" />}
      </div>

      <div className="relative min-h-[320px] bg-[var(--color-bg)]" style={{ colorScheme: 'dark' }}>
        {!hasOutput ? (
          <Placeholder
            icon={<AlertCircle className="h-8 w-8 text-muted" aria-hidden />}
            title={`${selectedModel?.name ?? selectedModelId} hasn’t been run on this task yet.`}
            body="Its generated artifact will appear here after the next benchmark run."
          />
        ) : runnable ? (
          state.phase === 'ready' && blobUrl ? (
            <div className="relative isolate" style={{ contain: 'paint layout' }}>
              <iframe
                src={blobUrl}
                title={`${task.title} generated by ${selectedModel?.name ?? selectedModelId}`}
                className="h-[420px] w-full border-0 bg-[#0c0c10] md:h-[520px]"
                // No allow-same-origin: the blob inherits this origin, so
                // allow-scripts + allow-same-origin would let arbitrary
                // model-generated JS reach the parent DOM/storage. Opaque
                // origin keeps scripts sandboxed away from the site.
                sandbox="allow-scripts"
              />
            </div>
          ) : state.phase === 'error' ? (
            <Placeholder
              icon={<AlertCircle className="h-8 w-8 text-rose-500" aria-hidden />}
              title="Couldn’t load this artifact."
              body={state.message}
              action={<RunButton label="Retry" onClick={run} />}
            />
          ) : (
            <Placeholder
              icon={
                state.phase === 'loading' ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted" aria-hidden />
                ) : (
                  <Play className="h-8 w-8 text-muted" aria-hidden />
                )
              }
              title={state.phase === 'loading' ? 'Loading artifact…' : 'Run this model’s artifact'}
              body={
                state.phase === 'loading'
                  ? undefined
                  : 'Renders live in a sandboxed frame. It won’t start until you press run.'
              }
              action={state.phase === 'idle' ? <RunButton label="Run demo" onClick={run} /> : undefined}
            />
          )
        ) : (
          <NonRunnableOutput
            taskId={task.id}
            modelId={selectedModelId}
            state={state}
            onLoad={run}
          />
        )}
      </div>
    </div>
  )
}

function Placeholder({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
      {icon}
      <p className="mt-3 text-sm text-fg/80">{title}</p>
      {body && <p className="mt-1 max-w-xs text-xs text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

function RunButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-surface-2)]"
    >
      <Play className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  )
}

function NonRunnableOutput({
  taskId,
  modelId,
  state,
  onLoad,
}: {
  taskId: string
  modelId: string
  state: LoadState
  onLoad: () => void
}) {
  // Text/code artifacts (maths, security): fetch and show the source on demand.
  useEffect(() => {
    if (state.phase === 'idle') onLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, modelId])

  if (state.phase === 'ready') {
    return (
      <div className="flex min-h-[320px] flex-col">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 font-mono text-xs text-muted">
          <FileCode className="h-3.5 w-3.5" aria-hidden />
          Generated output
        </div>
        <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
          <code>{state.output}</code>
        </pre>
      </div>
    )
  }
  if (state.phase === 'error') {
    return (
      <Placeholder
        icon={<AlertCircle className="h-8 w-8 text-rose-500" aria-hidden />}
        title="Couldn’t load this output."
        body={state.message}
      />
    )
  }
  return (
    <Placeholder
      icon={<Loader2 className="h-8 w-8 animate-spin text-muted" aria-hidden />}
      title="Loading output…"
    />
  )
}
