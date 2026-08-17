'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronRight, ExternalLink } from 'lucide-react'

import { parseRunLog } from '@/lib/lab/llm-benchmark/runlog-format'
import type { RunLogEvent, Spillable } from '@/lib/lab/llm-benchmark/runlog-format'
import { traceSpillUrl, traceUrl } from '@/lib/lab/llm-benchmark/nav'
import { formatTraceBytes } from '@/lib/lab/llm-benchmark/traces'
import type { TraceIndexEntry } from '@/lib/lab/llm-benchmark/traces'
import type { IterationCheckResult } from '@/lib/lab/llm-benchmark/types'
import { cn } from '@/lib/utils'
import { IterationChecks } from './iteration-checks'

/**
 * The run log, rendered.
 *
 * `results.json` keeps one row per (model, task): the aggregate score and the
 * BEST iteration's artifact. Everything that explains that number — the prompt
 * that was sent, each retry, what iteration 3 actually emitted, which check
 * failed and why — lives only in the append-only run log. This component is the
 * browser-side twin of `scripts/retrace.mjs`, and deliberately keeps its
 * information hierarchy (one block per iteration, one line per event, artifacts
 * as bounded excerpts) so the two readings of the same file agree.
 *
 * Three properties it must hold:
 *
 *  - **Lazy.** A published trace is tens of KB and most visitors never open
 *    one, so nothing is fetched until the disclosure is expanded (and it is
 *    fetched once).
 *  - **Bounded.** Artifacts are shown as the log's own 2 KB preview, never
 *    inlined whole — the full bytes are one click away in the spill store, and
 *    the demo above already renders the artifact.
 *  - **Quiet when absent.** It is only mounted for a record whose `runLogRef`
 *    is in the published index (`traces-server.ts`), so a pre-event-log record
 *    adds no per-row noise; the page states once, in one muted line, how many
 *    of its models have no trace.
 */

/** Longest artifact excerpt rendered inline, in characters. */
const EXCERPT_CHARS = 2000

interface RunTraceProps {
  entry: TraceIndexEntry
  /** Display name for the heading — the model id is the fallback. */
  modelName?: string
}

type TraceState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ready'; events: RunLogEvent[]; iterations: number }
  | { phase: 'error'; message: string }

export function RunTrace({ entry, modelName }: RunTraceProps) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<TraceState>({ phase: 'idle' })
  // One fetch per mount: the file is immutable (a re-run gets a new run id and
  // therefore a new URL), so re-expanding must not re-request it.
  const requested = useRef(false)

  useEffect(() => {
    if (!open || requested.current) return
    requested.current = true
    setState({ phase: 'loading' })
    const url = traceUrl(entry.runId, entry.file)
    fetch(url, { cache: 'force-cache' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        const { header, events } = parseRunLog(text, url)
        setState({ phase: 'ready', events, iterations: header.configSnapshot?.iterations ?? 0 })
      })
      .catch((err: unknown) => {
        requested.current = false // let a retry happen on the next expand
        setState({
          phase: 'error',
          message: err instanceof Error ? err.message : 'could not load this trace',
        })
      })
  }, [open, entry.runId, entry.file])

  const groups = state.phase === 'ready' ? groupByIteration(state.events) : []
  const aggregates = state.phase === 'ready' ? state.events.filter(isAggregate) : []

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 font-mono text-xs text-fg/80 marker:content-none">
        <ChevronRight
          className={cn('h-3.5 w-3.5 shrink-0 text-muted transition-transform', open && 'rotate-90')}
          aria-hidden
        />
        <span className="font-medium">{modelName ?? entry.modelId}</span>
        <span className="text-muted">iteration trace</span>
        <span className="ml-auto truncate text-[0.65rem] text-muted" title={`${entry.runId}/${entry.file}`}>
          run {entry.runId}
          {typeof entry.bytes === 'number' && ` · ${formatTraceBytes(entry.bytes)}`}
        </span>
      </summary>

      <div className="border-t border-[var(--color-border)] px-4 py-3">
        {state.phase === 'loading' && <p className="font-mono text-xs text-muted">Loading trace…</p>}
        {state.phase === 'error' && (
          <p className="font-mono text-xs text-rose-600 dark:text-rose-400">
            Couldn’t load this trace ({state.message}).
          </p>
        )}
        {state.phase === 'ready' && (
          <>
            {groups.length === 0 && aggregates.length === 0 && (
              <p className="font-mono text-xs text-muted">
                This log holds a header and no events — the sweep was killed before its first
                iteration.
              </p>
            )}
            {groups.map(([index, events]) => (
              <section key={index} className="mb-4 last:mb-0">
                <h4 className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">
                  Iteration #{index + 1}
                  {state.iterations > 0 && <span className="normal-case"> of {state.iterations}</span>}
                </h4>
                <div className="mt-1.5 space-y-1.5">
                  {events.map((event, i) => (
                    <EventLine key={`${event.seq ?? i}`} event={event} runId={entry.runId} />
                  ))}
                  <ChecksRow events={events} />
                </div>
              </section>
            ))}
            {aggregates.map((event, i) => (
              <AggregateLine key={i} result={event.result} />
            ))}
          </>
        )}
      </div>
    </details>
  )
}

/**
 * The task page's trace section: one disclosure per model that HAS a published
 * trace, and one muted line for the rest.
 *
 * Nothing renders at all when no model on this task has one — every record
 * predates the run log today, and a "no trace" notice on every historical task
 * page would be pure noise. The count is stated once, here, only when there is
 * at least one trace to contrast it with.
 */
export function RunTraceList({
  items,
  untracedCount,
}: {
  items: Array<{ entry: TraceIndexEntry; modelName?: string }>
  untracedCount: number
}) {
  if (items.length === 0) return null
  return (
    <div className="space-y-2">
      {items.map(({ entry, modelName }) => (
        <RunTrace key={`${entry.runId}/${entry.file}`} entry={entry} modelName={modelName} />
      ))}
      {untracedCount > 0 && (
        <p className="font-mono text-xs text-muted">
          {untracedCount} other {untracedCount === 1 ? 'run' : 'runs'} on this task have no trace
          recorded (pre-event-log, or the sweep’s logs were pruned).
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------

function isAggregate(event: RunLogEvent): event is Extract<RunLogEvent, { type: 'aggregate' }> {
  return event.type === 'aggregate'
}

/**
 * Events bucketed by iteration, in iteration order. `aggregate` is the one
 * event with no iteration and is rendered separately, at the end, exactly as
 * the transcript does.
 */
function groupByIteration(events: RunLogEvent[]): Array<[number, RunLogEvent[]]> {
  const groups = new Map<number, RunLogEvent[]>()
  for (const event of events) {
    if (event.type === 'aggregate') continue
    const index = event.iterationIndex ?? -1
    const bucket = groups.get(index)
    if (bucket) bucket.push(event)
    else groups.set(index, [event])
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0])
}

function Label({ children, tone }: { children: string; tone?: 'bad' | 'warn' }) {
  return (
    <span
      className={cn(
        'w-[4.5rem] shrink-0 font-mono text-[0.65rem] uppercase tracking-wider',
        tone === 'bad'
          ? 'text-rose-600 dark:text-rose-400'
          : tone === 'warn'
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-muted'
      )}
    >
      {children}
    </span>
  )
}

function Row({
  label,
  tone,
  children,
}: {
  label: string
  tone?: 'bad' | 'warn'
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2 font-mono text-xs leading-relaxed text-fg/80">
      <Label tone={tone}>{label}</Label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function EventLine({ event, runId }: { event: RunLogEvent; runId: string }) {
  switch (event.type) {
    case 'request':
      return (
        <Row label="request">
          prompt {Number(event.promptLength ?? 0).toLocaleString()} chars · sha256{' '}
          <span title={event.promptHash}>{String(event.promptHash ?? '').slice(0, 12)}…</span>
        </Row>
      )

    case 'retry':
      return (
        <Row label="retry" tone="warn">
          attempt {event.attempt} ({event.kind}) after {event.delayMs.toLocaleString()} ms —{' '}
          <span className="text-fg/60">{oneLine(event.error)}</span>
        </Row>
      )

    case 'response':
      return (
        <Row label="response">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {event.cacheHit ? (
              <span className="rounded-full border border-[var(--color-border)] px-1.5 py-px text-[0.65rem] text-muted">
                cache hit
              </span>
            ) : (
              <span className="text-muted">live</span>
            )}
            <span className="tabular-nums">
              {event.tokensIn.toLocaleString()} in / {event.tokensOut.toLocaleString()} out
            </span>
            <span className="tabular-nums">{Math.round(event.runtimeMs).toLocaleString()} ms</span>
            {/* Telemetry is optional by contract, and a rate is meaningless
                without its kind — print them together or not at all. */}
            {event.ttftMs !== undefined && (
              <span className="tabular-nums">ttft {Math.round(event.ttftMs).toLocaleString()} ms</span>
            )}
            {event.tokensPerSec !== undefined && (
              <span className="tabular-nums">
                {event.tokensPerSec} tok/s ({event.rateKind})
              </span>
            )}
          </div>
          <Artifact value={event.rawOutput} runId={runId} note="raw" />
        </Row>
      )

    case 'clean':
      return (
        <Row label="clean">
          <span className="text-muted">the bytes the scorer saw</span>
          <Artifact value={event.output} runId={runId} note="scored" />
        </Row>
      )

    case 'failure':
      return (
        <Row label="failure" tone="bad">
          {event.failureReason}
          {event.timedOut && ' (timed out)'} — <span className="text-fg/60">{oneLine(event.error)}</span>
        </Row>
      )

    case 'quota':
      return (
        <Row label="quota" tone="warn">
          provider stated the next window ≈ {event.quotaNextResetAt}
        </Row>
      )

    // An operator policy, not a provider failure — worded so nobody reads it
    // as the model or the endpoint giving up.
    case 'budget':
      return (
        <Row label="budget" tone="warn">
          per-model spend cap reached — ${event.spentUsd.toFixed(4)} of $
          {event.capUsd.toFixed(4)}; the sweep stopped this model here
        </Row>
      )

    // `check` events are aggregated into one pill row per iteration below, so
    // they never render as individual lines.
    case 'check':
      return null

    default:
      return null
  }
}

/** Every check of one iteration, as the same pills the results views use. */
function ChecksRow({ events }: { events: RunLogEvent[] }) {
  const checks = events
    .filter((e): e is Extract<RunLogEvent, { type: 'check' }> => e.type === 'check')
    .map((e) => e.check)
    .filter((c): c is IterationCheckResult => Boolean(c))
  if (checks.length === 0) return null
  return (
    <div className="flex items-start gap-2">
      <Label>checks</Label>
      <IterationChecks results={[checks]} className="mt-0 min-w-0 flex-1" />
    </div>
  )
}

/**
 * A possibly-spilled artifact: always the BOUNDED preview, plus a link to the
 * full bytes when the spill file was published. Inlining a 400 KB artifact
 * here would defeat the point of the spill store and of the demo above.
 */
function Artifact({ value, runId, note }: { value: Spillable; runId: string; note: string }) {
  const spilled = value && typeof value === 'object' ? value : undefined
  const text = typeof value === 'string' ? value : (spilled?.preview ?? '')
  // An inline field is the whole string, so its size is measurable here; a
  // spilled one reports the ORIGINAL size, not the preview's.
  const bytes = spilled ? spilled.bytes : new TextEncoder().encode(text).length
  const excerpt = text.slice(0, EXCERPT_CHARS)

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-x-2 text-[0.65rem] text-muted">
        <span>
          {note} · {formatTraceBytes(bytes)}
          {spilled ? ' spilled' : ' inline'}
        </span>
        {spilled && (
          <a
            href={traceSpillUrl(runId, spilled.spillRef)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 transition-colors hover:text-fg"
          >
            view full
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        )}
        {excerpt.length < text.length && <span>excerpt</span>}
      </div>
      {excerpt.trim() !== '' && (
        <pre className="mt-1 max-h-40 overflow-auto rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-[0.7rem] leading-relaxed text-fg/70">
          <code>{excerpt}</code>
        </pre>
      )}
    </div>
  )
}

/** The record that landed in results.json, as one line. */
function AggregateLine({ result }: { result: Record<string, unknown> }) {
  const num = (key: string): number | undefined =>
    typeof result[key] === 'number' ? (result[key] as number) : undefined
  const score = num('score')
  const scores = Array.isArray(result.iterationScores) ? (result.iterationScores as number[]) : []
  const cost = num('costUsd')

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3 font-mono text-xs text-fg/80">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[0.65rem] uppercase tracking-wider text-muted">aggregate</span>
        {score !== undefined && <span className="tabular-nums">score {score}</span>}
        {typeof result.status === 'string' && <span>{result.status}</span>}
        {num('iterationsSucceeded') !== undefined && (
          <span className="tabular-nums">
            {num('iterationsSucceeded')}/{num('iterations')} succeeded
          </span>
        )}
        {/* `failureReason` is 'none' on a successful aggregate — rendering that
            in failure red says "something went wrong" about a clean run. Only a
            real reason is worth the ink (and the colour). */}
        {typeof result.failureReason === 'string' && result.failureReason !== 'none' && (
          <span className="text-rose-600 dark:text-rose-400">{result.failureReason}</span>
        )}
        {cost !== undefined && <span className="tabular-nums">${cost.toFixed(4)}</span>}
      </div>
      {scores.length > 0 && (
        <div className="mt-1 text-[0.7rem] text-muted">
          per-iteration scores: [{scores.join(', ')}]
        </div>
      )}
    </div>
  )
}

/**
 * Errors arrive as multi-line provider dumps; the trace wants one line. Takes
 * `unknown` because the events come from a fetched file, and one malformed
 * record must not throw the whole panel away — the log's own reader is
 * crash-tolerant for exactly the same reason.
 */
function oneLine(text: unknown): string {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim()
  return flat.length > 220 ? `${flat.slice(0, 220)}…` : flat
}
