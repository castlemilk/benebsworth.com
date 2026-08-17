/**
 * The run log's ON-DISK FORMAT — record shapes plus the pure reader.
 *
 * Split out of `runlog.ts` for one reason: the writer is irreducibly node-only
 * (`node:fs`, `node:crypto`, fsync, spill files) and the run-trace UI
 * (`components/lab/llm-benchmark/run-trace.tsx`) is a client component that
 * must parse the SAME bytes in a browser. Importing `runlog.ts` from that
 * component would drag `node:fs` into the client bundle; duplicating the types
 * there would let the reader drift from the writer, which is the one thing a
 * forensic log cannot afford.
 *
 * So the rule for this module is: **nothing node-only, ever** — no imports
 * beyond `import type` from `types.ts` (the leaf). `runlog.ts` imports and
 * re-exports everything here, so `from './runlog'` keeps working for the
 * node-side callers and there is still exactly one definition of each record.
 *
 * The on-disk contract itself (append-only, batched writes, rollback-and-drop,
 * redaction, spill) is documented in `runlog.ts`.
 */
import type { BenchmarkFailureReason, IterationCheckResult } from './types'

/** How much of a spilled string stays inline as a preview. */
export const SPILL_PREVIEW_CHARS = 2048

/** The knobs in effect for this (model, task) job, captured at open time. */
export interface RunLogConfigSnapshot {
  iterations: number
  timeoutMs: number
  maxRetries: number
  bustCache: boolean
  /**
   * The plugin bundles mounted for this sweep (`[]` = builtins only), when the
   * caller supplies them. Audit-only: it records the scope a run was resolved
   * under, which the task list alone cannot show (a sweep can mount a plugin
   * and run none of its tasks). Absent on library/test use and on logs written
   * before the knob existed.
   */
  plugins?: string[]
  /**
   * The prompt bundle this job ran under (`promptBundleHash(task)`), matching
   * the `promptBundle` stamped on the record it produced. Audit-only, and
   * deliberately redundant with the record: a trace has to be readable on its
   * own, and "which prompt bundle was this?" is the first question asked of a
   * trace whose numbers no longer match the current board. Absent on library
   * use and on logs written before the field existed.
   */
  promptBundle?: string
}

/** Immutable first line of every run log. */
export interface RunLogHeader {
  type: 'header'
  seq: 0
  version: 1
  runId: string
  modelId: string
  taskId: string
  createdAt: string
  configSnapshot: RunLogConfigSnapshot
}

/** A string too large to inline: full bytes live at `spillRef`. */
export interface SpilledString {
  /** Path relative to the run-log dir, e.g. `spill/9f86d081884c7d65.txt`. */
  spillRef: string
  /** First SPILL_PREVIEW_CHARS characters of the original string. */
  preview: string
  /** Byte length of the original string. */
  bytes: number
}

/** A field that is inlined when small and spilled when large. */
export type Spillable = string | SpilledString

/** Human-readable text for a possibly-spilled field. */
export function spillPreview(value: Spillable): string {
  return typeof value === 'string' ? value : value.preview
}

/** One event, as passed to `append` (the writer owns `seq` and `ts`). */
export type RunLogEventInput =
  | {
      /** Emitted once per iteration attempt sequence, before the first provider call. */
      type: 'request'
      iterationIndex: number
      /** SHA-256 of the exact prompt sent (post `withSandboxConstraints`). */
      promptHash: string
      promptLength: number
    }
  | {
      /** Every response that came back, including cache replays. */
      type: 'response'
      iterationIndex: number
      rawOutput: Spillable
      tokensIn: number
      tokensOut: number
      runtimeMs: number
      cacheHit: boolean
      /**
       * Time to first observable output, ms from the same start `runtimeMs`
       * is measured from. ABSENT when unmeasurable (non-streaming API
       * providers) or meaningless (cache replays generated nothing) — never
       * 0, which would be a physically impossible TTFT. See
       * `GenerationResponse.ttftMs` for the per-provider story.
       */
      ttftMs?: number
      /**
       * Output tokens per second, computed at the append site from
       * `tokensOut`/`runtimeMs`/`ttftMs`. Absent on cache replays and when no
       * positive window exists. ALWAYS read alongside `rateKind`.
       */
      tokensPerSec?: number
      /** Which rate `tokensPerSec` is. Present iff `tokensPerSec` is. */
      rateKind?: 'decode' | 'wall-clock'
      /**
       * What THIS response's tokens cost, in USD — `costFromUsage` over the
       * response's own token counts at the model's published rates (the
       * paperclip `cost_events` idea, folded into the event that already
       * exists rather than a second stream).
       *
       * The per-response costs of a run sum to the record's `costUsd`, so
       * spend is auditable from the log alone with no external math. Cache
       * replays are priced identically even though they spend nothing: the
       * aggregate counts their tokens too, so pricing them keeps the log's sum
       * equal to the published cost — and for a SPEND CAP, over-counting is
       * the safe direction.
       *
       * Absent on logs written before this shipped.
       */
      costUsd?: number
    }
  | {
      /**
       * A retried attempt. `transient` retries happen inside `generateOne`
       * (network/429/timeout); `empty_body` retries happen in the runTask loop
       * (HTTP 200 with no usable content, which is not an error).
       */
      type: 'retry'
      iterationIndex: number
      attempt: number
      error: string
      delayMs: number
      kind: 'transient' | 'empty_body'
    }
  | {
      /** The post-cleanOutput / inline-deps artifact that was actually scored. */
      type: 'clean'
      iterationIndex: number
      output: Spillable
    }
  | {
      /** A failed iteration (terminal — retries are their own events). */
      type: 'failure'
      iterationIndex: number
      error: string
      failureReason: BenchmarkFailureReason
      timedOut: boolean
    }
  | {
      /** One scorer check for one iteration. */
      type: 'check'
      iterationIndex: number
      check: IterationCheckResult
    }
  | {
      /**
       * The provider stated a quota reset window while tripping this model's
       * breaker. The same estimate is post-stamped onto the aggregate as
       * `quotaNextResetAt`, but a 0-success run's record can be dropped by
       * mergeResults — so without this event the ONLY surviving evidence of
       * "when can this run again?" would live outside the log, breaching
       * "reconstructable from the log alone".
       */
      type: 'quota'
      iterationIndex: number
      /** ISO timestamp of the estimated next window. */
      quotaNextResetAt: string
    }
  | {
      /**
       * The sweep's per-model spend cap tripped this model's breaker (#28) —
       * paperclip's `budget_incidents` row, as an event.
       *
       * Same reasoning as the `quota` event: the aggregate is post-stamped
       * with `budgetExceeded`, but that record can be dropped by mergeResults,
       * so without this event the only evidence that an OPERATOR POLICY (not
       * the model, not the provider) ended the run would live outside the log.
       *
       * `iterationIndex` is the LAST iteration that ran — the check happens at
       * an iteration boundary, never mid-call — and it is present so the
       * replay tools can file the event under the iteration it followed.
       */
      type: 'budget'
      iterationIndex: number
      modelId: string
      /** Cumulative USD spent by this model across the sweep, at the trip. */
      spentUsd: number
      /** The cap it crossed. */
      capUsd: number
    }
  | {
      /** The aggregated BenchmarkResult, with `output` always spilled. */
      type: 'aggregate'
      result: Record<string, unknown>
    }

/** One event as persisted: the input plus the writer-owned envelope. */
export type RunLogEvent = RunLogEventInput & { seq: number; ts: string }

/**
 * Parse run-log JSONL text.
 *
 * Crash-recovery semantics, identical whether the bytes came from disk or from
 * a fetch: parsing stops at the FIRST unparsable or non-record line and
 * everything after it is ignored, because a sweep killed mid-batch leaves a
 * truncated tail. Only a missing/invalid HEADER throws — without it the file
 * describes nothing.
 *
 * `label` only names the source in error messages (a path on the node side, a
 * URL in the browser).
 */
export function parseRunLog(
  text: string,
  label = 'run log'
): { header: RunLogHeader; events: RunLogEvent[] } {
  const lines = text.split('\n')

  let header: RunLogHeader
  try {
    header = JSON.parse(lines[0] ?? '') as RunLogHeader
  } catch {
    throw new Error(`${label}: missing or unparsable run-log header on line 1`)
  }
  if (!header || header.type !== 'header') {
    throw new Error(`${label}: first line is not a run-log header record`)
  }

  const events: RunLogEvent[] = []
  for (const line of lines.slice(1)) {
    if (line.trim() === '') break
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      break // truncated tail from a killed sweep — keep the complete prefix
    }
    if (!parsed || typeof parsed !== 'object' || typeof (parsed as RunLogEvent).type !== 'string') {
      break
    }
    events.push(parsed as RunLogEvent)
  }

  return { header, events }
}
