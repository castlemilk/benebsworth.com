import { parseRunLog } from './runlog-format'
import type { RunLogEvent, RunLogHeader, Spillable } from './runlog-format'

/**
 * A run log, rendered as the human transcript `scripts/retrace.mjs` prints.
 *
 * Extracted FROM that script rather than written beside it: the MCP server
 * (`mcp.ts`) has to answer "what happened in this run?" with the same reading a
 * human gets from `retrace`, and two renderers of one forensic log would drift
 * — the exact failure mode `runlog-format.ts` was split out to prevent on the
 * parse side. So retrace keeps the CLI (argument parsing, file discovery, fs)
 * and this module owns the FORMATTING, byte-for-byte.
 *
 * Nothing node-only here: the caller supplies `readSpill`, so the same function
 * serves a local sweeps tree, a published trace directory, and (in principle) a
 * browser. The UI twin, `components/lab/llm-benchmark/run-trace.tsx`, stays its
 * own JSX rendering — it lays the same information out as elements, not lines,
 * and folding both into one string builder would help neither.
 */

export interface TranscriptOptions {
  /** Inline full spilled content (resolving `readSpill`) instead of a preview. */
  full?: boolean
  /** Render only this iteration index (0-based). */
  iteration?: number
  /** The log's filename, for the provenance line. */
  file?: string
  /**
   * Resolve a spill ref (`spill/<hash>.txt`) to its full text. Only called
   * under `full`. A throw is caught and reported inline — a missing spill file
   * degrades the transcript, it does not fail it.
   */
  readSpill?: (spillRef: string) => string
}

/**
 * The aggregate event's `result` is a bag of unknowns on the wire (the writer
 * stores whatever `BenchmarkResult` it aggregated, including legacy shapes), so
 * the transcript names only the fields it prints — everything optional, because
 * an older log may carry none of them.
 */
interface AggregateFields {
  score?: number
  status?: string
  failureReason?: string
  iterations?: number
  iterationsSucceeded?: number
  iterationScores?: number[]
  tokensIn?: number
  tokensOut?: number
  runtimeMs?: number
  costUsd?: number
  runLogRef?: { runId: string; file: string }
  output?: Spillable
}

/** `1.4 MB` / `812 B` — retrace's own formatter (not `formatTraceBytes`, which rounds differently). */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const EXCERPT_LINES = 8
const EXCERPT_LINE_CHARS = 140

function indent(text: string, prefix = '        '): string {
  return text
    .split('\n')
    .map((line) => prefix + line)
    .join('\n')
}

/**
 * Bounded excerpt for the default transcript: enough to recognise the artifact,
 * short enough that a 5-iteration task still fits on a screen. `full` prints
 * the whole thing (resolving the spill file).
 */
function excerpt(text: string, options: TranscriptOptions): string {
  if (options.full) return text
  const lines = text.split('\n')
  const shown = lines
    .slice(0, EXCERPT_LINES)
    .map((line) => (line.length > EXCERPT_LINE_CHARS ? `${line.slice(0, EXCERPT_LINE_CHARS)}…` : line))
  if (lines.length > EXCERPT_LINES) shown.push(`… (+${lines.length - EXCERPT_LINES} more lines)`)
  return shown.join('\n')
}

/** Render a possibly-spilled string field: preview by default, full with `full`. */
function renderValue(
  value: Spillable | undefined,
  options: TranscriptOptions,
): { summary: string; body: string } {
  if (typeof value === 'string') {
    return { summary: `${formatBytes(Buffer.byteLength(value))} inline`, body: value }
  }
  if (!value || typeof value !== 'object') return { summary: '(none)', body: '' }
  let body = value.preview ?? ''
  if (options.full) {
    try {
      body = options.readSpill?.(value.spillRef) ?? body
    } catch (err) {
      body = `${value.preview ?? ''}\n[retrace] could not read ${value.spillRef}: ${(err as Error).message}`
    }
  }
  return {
    summary: `${formatBytes(value.bytes)} spilled -> ${value.spillRef}${options.full ? '' : ' (preview)'}`,
    body,
  }
}

/**
 * The transcript for ONE parsed run log, as a string (no trailing newline).
 *
 * Same order, same wording and same indentation retrace has always printed —
 * `retrace-cli.test.ts` asserts several of these lines verbatim through the
 * real script, so this is the definition, not a paraphrase of it.
 */
export function renderTranscript(
  parsed: { header: RunLogHeader; events: RunLogEvent[] },
  options: TranscriptOptions = {},
): string {
  const { header, events } = parsed
  const lines: string[] = []
  const emit = (line = ''): void => {
    lines.push(line)
  }

  const cfg = header.configSnapshot ?? ({} as RunLogHeader['configSnapshot'])
  emit('='.repeat(78))
  emit(`${header.modelId} :: ${header.taskId}`)
  emit(`  run ${header.runId}  file ${options.file ?? ''}  created ${header.createdAt}`)
  emit(
    `  config: iterations=${cfg.iterations} timeoutMs=${cfg.timeoutMs} maxRetries=${cfg.maxRetries} bustCache=${cfg.bustCache}`,
  )
  emit(`  ${events.length} event(s)`)

  // Run-level, not per-iteration: the sandbox policy (#12) has no
  // iterationIndex, so it is pulled out here rather than falling into the
  // "index -1" bucket the iteration grouping would invent for it.
  for (const event of events) {
    if (event.type !== 'sandboxPolicy') continue
    emit(
      `  sandbox: backend=${event.backend} enforcement=${event.enforcement}` +
        ` preludeParity=${event.preludeParity}` +
        (event.enforcement === 'partial' ? '  (checks ran with partial enforcement)' : ''),
    )
  }

  const iterations = new Map<number, RunLogEvent[]>()
  const aggregates: Extract<RunLogEvent, { type: 'aggregate' }>[] = []
  for (const event of events) {
    if (event.type === 'sandboxPolicy') continue
    if (event.type === 'aggregate') {
      aggregates.push(event)
      continue
    }
    const key = (event as { iterationIndex?: number }).iterationIndex ?? -1
    if (!iterations.has(key)) iterations.set(key, [])
    iterations.get(key)!.push(event)
  }

  for (const [index, group] of [...iterations.entries()].sort((a, b) => a[0] - b[0])) {
    if (options.iteration !== undefined && index !== options.iteration) continue
    emit('')
    emit(`--- iteration #${index + 1} (index ${index}) ---`)
    for (const event of group) {
      const ts = event.ts ?? ''
      switch (event.type) {
        case 'request':
          emit(`  [${ts}] request  prompt ${event.promptLength} chars  sha256 ${event.promptHash}`)
          break
        case 'retry':
          emit(
            `  [${ts}] retry    attempt ${event.attempt} (${event.kind}) after ${event.delayMs}ms: ${event.error}`,
          )
          break
        case 'response': {
          const raw = renderValue(event.rawOutput, options)
          // Telemetry is optional by contract (absent = not measured), and the
          // rate is meaningless without its kind — so print them together or
          // not at all rather than showing a bare number.
          const ttft = event.ttftMs !== undefined ? `  ttft ${event.ttftMs}ms` : ''
          const rate =
            event.tokensPerSec !== undefined ? `  ${event.tokensPerSec} tok/s (${event.rateKind})` : ''
          emit(
            `  [${ts}] response ${event.cacheHit ? 'CACHE HIT' : 'live'}  ${event.tokensIn} in / ${event.tokensOut} out tokens  ${event.runtimeMs}ms${ttft}${rate}  raw: ${raw.summary}`,
          )
          if (raw.body) emit(indent(excerpt(raw.body, options)))
          break
        }
        case 'clean': {
          const cleaned = renderValue(event.output, options)
          emit(`  [${ts}] clean    scored artifact: ${cleaned.summary}`)
          if (cleaned.body) emit(indent(excerpt(cleaned.body, options)))
          break
        }
        case 'quota':
          emit(`  [${ts}] quota    next window ~${event.quotaNextResetAt}`)
          break
        case 'budget':
          emit(
            `  [${ts}] BUDGET   cap reached for ${event.modelId}: $${Number(event.spentUsd).toFixed(4)} of $${Number(event.capUsd).toFixed(4)} per-model — run stopped by operator policy`,
          )
          break
        case 'failure':
          emit(
            `  [${ts}] FAILURE  ${event.failureReason}${event.timedOut ? ' (timed out)' : ''}: ${event.error}`,
          )
          break
        case 'check': {
          const check = event.check ?? ({} as (typeof event)['check'])
          const detail = check.detail ? ` — ${check.detail}` : ''
          emit(
            `  [${ts}] check    ${check.passed ? 'PASS' : 'FAIL'} ${check.name} ${check.points}/${check.maxPoints}${detail}`,
          )
          break
        }
        default:
          emit(`  [${ts}] ${(event as RunLogEvent).type} ${JSON.stringify(event)}`)
      }
    }
  }

  for (const event of aggregates) {
    const result = (event.result ?? {}) as AggregateFields
    emit('')
    emit(`--- aggregate ---`)
    emit(
      `  score ${result.score}  status ${result.status}  failureReason ${result.failureReason}  ` +
        `${result.iterationsSucceeded}/${result.iterations} iteration(s) succeeded`,
    )
    if (result.iterationScores) emit(`  iterationScores: [${result.iterationScores.join(', ')}]`)
    emit(`  ${result.tokensIn} in / ${result.tokensOut} out tokens  mean ${result.runtimeMs}ms  $${result.costUsd}`)
    if (result.runLogRef) emit(`  runLogRef: ${result.runLogRef.runId}/${result.runLogRef.file}`)
    if (result.output) {
      const published = renderValue(result.output, options)
      emit(`  published artifact: ${published.summary}`)
      if (options.full && published.body) emit(indent(published.body))
    }
  }

  return lines.join('\n')
}

/** `renderTranscript` over raw JSONL text — parse and render in one call. */
export function transcribeRunLog(text: string, options: TranscriptOptions = {}): string {
  return renderTranscript(parseRunLog(text, options.file ?? 'run log'), options)
}
