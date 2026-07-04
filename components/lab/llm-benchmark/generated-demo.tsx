'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BENCHMARK_MODELS, getModel } from '@/lib/lab/llm-benchmark/registry'
import type { BenchmarkResultMeta } from '@/lib/lab/llm-benchmark/results'
import type { BenchmarkTask } from '@/lib/lab/llm-benchmark/types'
import { outputUrl } from '@/lib/lab/llm-benchmark/nav'
import { cn } from '@/lib/utils'
import {
  Monitor,
  FileCode,
  AlertCircle,
  Play,
  Loader2,
  Maximize2,
  Minimize2,
  Fullscreen,
  X,
} from 'lucide-react'
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

/** Whether an output is a self-contained HTML document we can render in a frame
 *  (vs. e.g. a bare React/JSX snippet a model returned instead of a page). */
function isFullHtmlDoc(output: string): boolean {
  return /<!doctype\s+html|<html[\s>]/i.test(output.slice(0, 400))
}

/** A `<script type="text/babel">` block needs a runtime JSX compiler (Babel),
 *  which requires `unsafe-eval` — deliberately absent from the demo sandbox CSP.
 *  Well-formed ones are pre-compiled at build time; any that remain (e.g. a
 *  truncated artifact) can't run here, so we show a note instead of a blank frame. */
function needsRuntimeCompiler(output: string): boolean {
  return /type=["']text\/babel["']/i.test(output)
}

// Injected into the artifact's <head> before its own markup. Two jobs:
//  1. a dark backdrop so the frame isn't a white/black void while the demo's
//     own CSS/scripts load;
//  2. an in-memory localStorage/sessionStorage shim — the frame runs with an
//     opaque origin (sandbox="allow-scripts", no allow-same-origin), where real
//     Storage access throws; without the shim a demo that reads localStorage at
//     startup would crash to a blank page;
//  3. a runtime-error reporter — broken artifacts otherwise fail to a silently
//     blank frame. Only the FIRST error/unhandled rejection is forwarded to the
//     parent via postMessage (the frame's origin is opaque, so '*' is the only
//     usable target); the parent listener validates the payload shape.
const FRAME_PRELUDE = `<style>html,body{margin:0;background:#0c0c10;color:#ececf0;font-family:ui-sans-serif,system-ui}</style>
<script>
(function(){try{window.localStorage.getItem('_');}catch(e){
var m={},s={getItem:function(k){return k in m?m[k]:null;},setItem:function(k,v){m[k]=String(v);},removeItem:function(k){delete m[k];},clear:function(){m={};},key:function(i){return Object.keys(m)[i]||null;}};
Object.defineProperty(s,'length',{get:function(){return Object.keys(m).length;}});
try{Object.defineProperty(window,'localStorage',{value:s,configurable:true});Object.defineProperty(window,'sessionStorage',{value:s,configurable:true});}catch(_){}
}})();
</script>
<script>
(function(){var sent=false;
function report(msg){if(sent)return;sent=true;try{parent.postMessage({__llmDemoError:String(msg).slice(0,200)},'*');}catch(_){}}
window.addEventListener('error',function(e){report((e&&e.message)||'Script error');});
window.addEventListener('unhandledrejection',function(e){var r=e&&e.reason;report(r&&r.message?r.message:(r||'Unhandled promise rejection'));});
})();
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
  const seq = useRef(0)
  // Boot overlay: shown from iframe mount until its 'load' event (+ a short
  // settle) so big artifacts (e.g. 600KB of inlined three.js) don't present as
  // a blank frame while they parse.
  const [booting, setBooting] = useState(true)
  const settleTimer = useRef<number | null>(null)
  // First runtime error reported by the sandboxed frame (via postMessage).
  const [frameError, setFrameError] = useState<string | null>(null)
  // Expand (tall inline frame) + fullscreen (on the frame wrapper, not the
  // iframe — requestFullscreen on the wrapper works regardless of sandbox).
  const [expanded, setExpanded] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const frameWrapRef = useRef<HTMLDivElement | null>(null)

  // Preselect a model from a `?model=` deep link (e.g. a results-table row that
  // navigated here to show one specific run).
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('model')
    if (wanted && BENCHMARK_MODELS.some((m) => m.id === wanted)) setSelectedModelId(wanted)
  }, [])

  // Reset to the idle/gated state whenever the model changes (dropdown OR the
  // ?model deep link) so the demo reloads that model's own artifact.
  useEffect(() => {
    setState({ phase: 'idle' })
  }, [selectedModelId])

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

  // Render the artifact via the iframe `srcdoc` (inline HTML) rather than a
  // blob: URL. Safari/WebKit refuses to execute scripts in a blob-URL document
  // inside a `sandbox="allow-scripts"` (opaque-origin) frame — it wouldn't load
  // at all — whereas srcdoc works across every browser with the same sandbox.
  const frameDoc = useMemo(() => {
    if (
      state.phase !== 'ready' ||
      !runnable ||
      !isFullHtmlDoc(state.output) ||
      needsRuntimeCompiler(state.output)
    ) {
      return undefined
    }
    return withPrelude(state.output)
  }, [state, runnable])

  // Re-arm the boot overlay and clear any stale runtime error whenever the
  // frame document changes (model switch, reload). The fail-safe timeout drops
  // the overlay even if the frame's load event never fires — `load` waits on
  // every subresource, so an artifact pointing at a hanging external URL would
  // otherwise leave the opaque overlay covering the demo forever.
  useEffect(() => {
    setBooting(true)
    setFrameError(null)
    const failSafe = window.setTimeout(() => setBooting(false), 8000)
    return () => {
      window.clearTimeout(failSafe)
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
    }
  }, [frameDoc])

  // Listen for the frame prelude's error reports. The sandboxed frame has an
  // opaque origin (event.origin === 'null'), so we can't match on origin —
  // instead accept ONLY messages carrying the exact __llmDemoError string key,
  // and re-cap the length defensively.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { __llmDemoError?: unknown } | null | undefined
      if (!data || typeof data.__llmDemoError !== 'string') return
      const message = data.__llmDemoError.slice(0, 200)
      setFrameError((prev) => prev ?? message)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Keep fullscreen state in sync with the browser (Esc exits without us).
  useEffect(() => {
    function sync() {
      const doc = document as Document & { webkitFullscreenElement?: Element }
      setIsFullscreen(Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement))
    }
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])

  function handleFrameLoad() {
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(() => setBooting(false), 250)
  }

  function toggleFullscreen() {
    const doc = document as Document & {
      webkitFullscreenElement?: Element
      webkitExitFullscreen?: () => void
    }
    if (doc.fullscreenElement ?? doc.webkitFullscreenElement) {
      const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen
      exit?.call(doc)
      return
    }
    const el = frameWrapRef.current as
      | (HTMLDivElement & { webkitRequestFullscreen?: () => void })
      | null
    if (!el) return
    const request = el.requestFullscreen ?? el.webkitRequestFullscreen
    request?.call(el)
  }

  async function run() {
    if (!hasOutput) return
    const id = ++seq.current
    setState({ phase: 'loading' })
    try {
      const res = await fetch(outputUrl(task.id, selectedModelId, selectedResult?.outputVersion), {
        cache: 'force-cache',
      })
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
          onChange={(e) => setSelectedModelId(e.target.value)}
          className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-project)]"
        >
          {BENCHMARK_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {selectedResult && <ScoreBar score={selectedResult.score} width="w-20" />}
        {runnable && hasOutput && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label="Expand demo"
              aria-pressed={expanded}
              title={expanded ? 'Collapse demo' : 'Expand demo'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-muted transition-colors hover:bg-[var(--color-surface-2)] hover:text-fg"
            >
              {expanded ? (
                <Minimize2 className="h-4 w-4" aria-hidden />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label="Fullscreen demo"
              aria-pressed={isFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen demo'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-muted transition-colors hover:bg-[var(--color-surface-2)] hover:text-fg"
            >
              <Fullscreen className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      <div className="relative min-h-[320px] bg-[var(--color-bg)]" style={{ colorScheme: 'dark' }}>
        {!hasOutput ? (
          <Placeholder
            icon={<AlertCircle className="h-8 w-8 text-muted" aria-hidden />}
            title={`${selectedModel?.name ?? selectedModelId} hasn’t been run on this task yet.`}
            body="Its generated artifact will appear here after the next benchmark run."
          />
        ) : runnable ? (
          state.phase === 'ready' && needsRuntimeCompiler(state.output) ? (
            <Placeholder
              icon={<FileCode className="h-8 w-8 text-muted" aria-hidden />}
              title="Can’t render this artifact in the sandbox."
              body="It compiles JSX in the browser (Babel), which the security sandbox blocks. Its source is in the side-by-side comparison below."
            />
          ) : state.phase === 'ready' && !isFullHtmlDoc(state.output) ? (
            // The task expected a runnable page but the model returned a bare
            // snippet (e.g. a React component) — show the source instead of a
            // broken frame.
            <div className="flex min-h-[320px] flex-col">
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 font-mono text-xs text-muted">
                <FileCode className="h-3.5 w-3.5" aria-hidden />
                {selectedModel?.name ?? selectedModelId} returned a snippet, not a runnable page
              </div>
              <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
                <code>{state.output}</code>
              </pre>
            </div>
          ) : state.phase === 'ready' && frameDoc ? (
            <div
              ref={frameWrapRef}
              className={cn(
                'relative isolate bg-[#0c0c10]',
                isFullscreen && 'flex h-full w-full flex-col'
              )}
              style={{ contain: 'paint layout' }}
            >
              {frameError && (
                <div className="relative z-20 flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider">
                    Artifact error
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-amber-300/80">
                    {frameError}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFrameError(null)}
                    aria-label="Dismiss artifact error"
                    className="shrink-0 rounded p-0.5 text-amber-400/70 transition-colors hover:bg-amber-500/20 hover:text-amber-300"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              )}
              <iframe
                srcDoc={frameDoc}
                title={`${task.title} generated by ${selectedModel?.name ?? selectedModelId}`}
                onLoad={handleFrameLoad}
                className={cn(
                  'w-full border-0 bg-[#0c0c10]',
                  isFullscreen
                    ? 'h-full min-h-0 flex-1'
                    : expanded
                      ? 'h-[75vh]'
                      : 'h-[420px] md:h-[520px]'
                )}
                // No allow-same-origin: the srcdoc runs at an opaque origin, so
                // allow-scripts alone keeps arbitrary model-generated JS walled
                // off from the parent DOM/storage/cookies.
                sandbox="allow-scripts"
              />
              {/* Boot overlay: covers the parse/first-paint gap after the iframe
                  mounts. Fades out ~250ms after the frame's load event; purely
                  visual, so it never intercepts pointer events. */}
              <div
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0c0c10] transition-opacity duration-300',
                  booting ? 'opacity-100' : 'opacity-0'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fg/60 [animation-delay:0ms] motion-reduce:animate-none" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fg/60 [animation-delay:200ms] motion-reduce:animate-none" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fg/60 [animation-delay:400ms] motion-reduce:animate-none" />
                </div>
                <div className="font-mono text-xs uppercase tracking-wider text-fg/80">
                  Booting sandbox
                </div>
                <div className="text-xs text-muted">
                  {selectedModel?.name ?? selectedModelId}
                </div>
              </div>
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
