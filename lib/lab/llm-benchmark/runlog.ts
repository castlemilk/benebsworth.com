/**
 * Append-only per-iteration run log (JSONL).
 *
 * The invariant, borrowed wholesale from the dsh session log: **model-visible
 * means logged**. Anything that reached a model request — the exact prompt, the
 * raw response, every retry, the cleaned artifact that was actually scored,
 * each check's verdict, and the aggregate that lands in results.json — must be
 * reconstructable from this file alone. A `BenchmarkResult` keeps only the best
 * iteration's artifact and the aggregate score; without the run log, "what did
 * iteration 3 emit and why did it score 3?" is unanswerable a week later, let
 * alone six months.
 *
 * On-disk contract (`session-persistence-jsonl` in dsh):
 *  - line 0 is an immutable header record; every later line is one event
 *  - `seq` is contiguous and writer-owned: line i has `seq === i`
 *  - append-only — flushed bytes are never rewritten
 *  - appends are coalesced into batches (WRITE_BATCH_MAX_DELAY_MS), each batch
 *    is one write + one fsync; `flush()` bypasses the window
 *  - a failed batch rolls the file back to its last durable length and is
 *    DROPPED (degraded logging must never fail a sweep)
 *  - strings over SPILL_THRESHOLD_BYTES are content-addressed into `spill/`
 *    and replaced in-line by `{ spillRef, preview, bytes }`
 *  - readers keep the complete prefix and stop at the first unparsable line
 *    (a killed sweep leaves a half-written tail)
 *
 * Read one back with `npx tsx scripts/retrace.mjs --run <run-id>`.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { open, type FileHandle } from 'node:fs/promises'
import { basename, join } from 'node:path'

import type { BenchmarkFailureReason, IterationCheckResult } from './types'

/** Strings at or above this many bytes are spilled rather than inlined. */
export const SPILL_THRESHOLD_BYTES = 8 * 1024

/** How much of a spilled string stays inline as a preview. */
export const SPILL_PREVIEW_CHARS = 2048

/**
 * Coalescing window for batched writes (dsh's `writeBatchMaxDelayMs`). A busy
 * iteration emits several events in quick succession; batching turns that into
 * one write + one fsync instead of one per event.
 */
export const WRITE_BATCH_MAX_DELAY_MS = 200

/** The knobs in effect for this (model, task) job, captured at open time. */
export interface RunLogConfigSnapshot {
  iterations: number
  timeoutMs: number
  maxRetries: number
  bustCache: boolean
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
      /** The aggregated BenchmarkResult, with `output` always spilled. */
      type: 'aggregate'
      result: Record<string, unknown>
    }

/** One event as persisted: the input plus the writer-owned envelope. */
export type RunLogEvent = RunLogEventInput & { seq: number; ts: string }

export interface RunLog {
  /** Sweep run id (basename of the run-log dir). */
  readonly runId: string
  /** Directory the log (and its `spill/` store) lives in. */
  readonly dir: string
  /** File basename inside the run-log dir. */
  readonly file: string
  /** Absolute path to the JSONL file. */
  readonly path: string
  /** Queue an event; written with the next batch. Never throws. */
  append(event: RunLogEventInput): void
  /** Write and fsync everything queued, bypassing the batch window. */
  flush(): Promise<void>
  /** Flush, fsync, and close the handle. Further appends are dropped. */
  close(): Promise<void>
}

/**
 * Directory this run's logs are written to — `sweeps/<run-id>/`, the SAME root
 * `runners/cli.ts` retains scratch dirs and artifacts under.
 *
 * Module-level rather than a runner-config field, following the `setSweepRoot`
 * / `setBustCache` precedent: the log directory is a property of the RUN, not
 * of any one provider. When it is unset (unit tests, ad-hoc library use)
 * `openRunLog` returns undefined and every call site no-ops via `?.`.
 */
let runLogDir: string | undefined

/** Set (or clear, with `undefined`) the directory run logs are written to. */
export function setRunLogDir(dir: string | undefined): void {
  runLogDir = dir
}

export function getRunLogDir(): string | undefined {
  return runLogDir
}

/** `<modelId>-<taskId>.jsonl` — one file per (model, task) per sweep. */
export function runLogFileName(modelId: string, taskId: string): string {
  return `${modelId}-${taskId}.jsonl`
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** SHA-256 hex of a prompt, for the `request` event. */
export function hashPrompt(prompt: string): string {
  return sha256(prompt)
}

/**
 * Write `content` to `<dir>/spill/<first-16-hex-of-sha256>.txt` and return the
 * locator. Content-addressed, so the same artifact referenced by a `response`,
 * a `clean` and an `aggregate` event costs one file. `wx` never clobbers: an
 * EEXIST means those exact bytes are already stored.
 */
function writeSpill(dir: string, content: string): SpilledString {
  const ref = `spill/${sha256(content).slice(0, 16)}.txt`
  const target = join(dir, ref)
  try {
    mkdirSync(join(dir, 'spill'), { recursive: true })
    writeFileSync(target, content, { flag: 'wx', mode: 0o600 })
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'EEXIST') {
      console.warn(
        `[runlog] could not spill ${ref}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
  return {
    spillRef: ref,
    preview: content.slice(0, SPILL_PREVIEW_CHARS),
    bytes: Buffer.byteLength(content),
  }
}

/**
 * Replace every string anywhere in `value` that would exceed the threshold
 * with its spill locator. Recursive so nested payloads (an `aggregate`
 * result's `output`, a check's `detail`) are covered by the same rule.
 */
function spillLargeStrings(dir: string, value: unknown): unknown {
  if (typeof value === 'string') {
    return Buffer.byteLength(value) > SPILL_THRESHOLD_BYTES ? writeSpill(dir, value) : value
  }
  if (Array.isArray(value)) return value.map((item) => spillLargeStrings(dir, item))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = spillLargeStrings(dir, item)
    }
    return out
  }
  return value
}

/**
 * Force a string into the spill store regardless of size, and return the
 * locator. Used for the aggregate event's artifact: the JSONL must stay small
 * enough to serve, and the bytes are already in the spill store (content
 * addressing dedupes with the `clean` event that produced them).
 */
export function forceSpill(dir: string, content: string): SpilledString {
  return writeSpill(dir, content)
}

class JsonlRunLog implements RunLog {
  readonly runId: string
  readonly file: string
  readonly path: string
  readonly dir: string

  private readonly handle: Promise<FileHandle>
  private queue: string[] = []
  private seq = 1
  private timer: ReturnType<typeof setTimeout> | undefined
  /** Serializes batches: two writes can never interleave. */
  private chain: Promise<void> = Promise.resolve()
  /** Bytes known to be on disk — the rollback target for a failed batch. */
  private durableBytes = 0
  private closed = false

  constructor(dir: string, header: RunLogHeader) {
    this.dir = dir
    this.runId = header.runId
    this.file = runLogFileName(header.modelId, header.taskId)
    this.path = join(dir, this.file)

    mkdirSync(dir, { recursive: true })
    // OVERWRITE on reopen: one file describes the latest run of this
    // (model, task) pair in this sweep. Truncate up front so a re-run never
    // leaves a stale tail after the new header.
    writeFileSync(this.path, '', { mode: 0o600 })
    this.handle = open(this.path, 'a')
    // Header is queued like any other line, so it is always byte 0 of the
    // first batch and can never race an event.
    this.queue.push(JSON.stringify(header) + '\n')
    this.schedule()
  }

  append(event: RunLogEventInput): void {
    if (this.closed) {
      console.warn(`[runlog] dropped a ${event.type} event appended after close (${this.file})`)
      return
    }
    try {
      const record = {
        ...(spillLargeStrings(this.dir, event) as Record<string, unknown>),
        seq: this.seq++,
        ts: new Date().toISOString(),
      }
      this.queue.push(JSON.stringify(record) + '\n')
      this.schedule()
    } catch (err) {
      // Degraded logging must never crash a sweep.
      console.warn(
        `[runlog] could not encode a ${event.type} event: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  flush(): Promise<void> {
    this.clearTimer()
    return this.writeBatch()
  }

  async close(): Promise<void> {
    await this.flush()
    this.closed = true
    try {
      const handle = await this.handle
      await handle.close()
    } catch (err) {
      console.warn(
        `[runlog] could not close ${this.file}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  private schedule(): void {
    if (this.timer !== undefined) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      void this.writeBatch()
    }, WRITE_BATCH_MAX_DELAY_MS)
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
  }

  private writeBatch(): Promise<void> {
    const batch = this.queue
    this.queue = []
    this.chain = this.chain.then(async () => {
      if (batch.length === 0) return
      const payload = batch.join('')
      let handle: FileHandle
      try {
        handle = await this.handle
      } catch (err) {
        console.warn(
          `[runlog] ${this.file} is not writable, dropping ${batch.length} event(s): ${err instanceof Error ? err.message : String(err)}`
        )
        return
      }
      try {
        await handle.write(payload)
        await handle.sync()
        this.durableBytes += Buffer.byteLength(payload)
      } catch (err) {
        // Roll back to the last known-durable length so a partial write can
        // never leave a corrupt record in the middle of the file, and DROP the
        // batch — re-queueing would risk an unbounded retry loop inside a
        // sweep whose real work already succeeded.
        console.warn(
          `[runlog] batch write failed for ${this.file}, rolled back to ${this.durableBytes} bytes and dropped ${batch.length} event(s): ${err instanceof Error ? err.message : String(err)}`
        )
        try {
          await handle.truncate(this.durableBytes)
        } catch (truncateErr) {
          console.warn(
            `[runlog] rollback truncate failed for ${this.file}: ${truncateErr instanceof Error ? truncateErr.message : String(truncateErr)}`
          )
        }
      }
    })
    return this.chain
  }
}

/**
 * Open the run log for one (model, task) job.
 *
 * Returns `undefined` when no run-log dir is set — logging is opt-in, and every
 * call site is written as `log?.append(...)` so the harness behaves byte-for-byte
 * as it did before when it is off.
 *
 * The same (model, task) pair never runs concurrently (jobs are per model×task),
 * so one file per pair needs no locking. Different pairs DO run concurrently,
 * which is why the log instance is threaded through explicitly rather than kept
 * in module state.
 */
export function openRunLog(meta: {
  /** Defaults to the basename of the run-log dir (the sweep's run id). */
  runId?: string
  modelId: string
  taskId: string
  configSnapshot: RunLogConfigSnapshot
}): RunLog | undefined {
  const dir = runLogDir
  if (!dir) return undefined
  const header: RunLogHeader = {
    type: 'header',
    seq: 0,
    version: 1,
    runId: meta.runId ?? basename(dir),
    modelId: meta.modelId,
    taskId: meta.taskId,
    createdAt: new Date().toISOString(),
    configSnapshot: meta.configSnapshot,
  }
  try {
    return new JsonlRunLog(dir, header)
  } catch (err) {
    console.warn(
      `[runlog] could not open a run log in ${dir}: ${err instanceof Error ? err.message : String(err)}`
    )
    return undefined
  }
}

/**
 * Read a run log back.
 *
 * Crash-recovery semantics: parsing stops at the FIRST unparsable or
 * non-record line and everything after it is ignored, because a sweep killed
 * mid-batch leaves a truncated tail. Only a missing/invalid HEADER throws —
 * without it the file describes nothing.
 */
export function readRunLog(file: string): { header: RunLogHeader; events: RunLogEvent[] } {
  const lines = readFileSync(file, 'utf8').split('\n')

  let header: RunLogHeader
  try {
    header = JSON.parse(lines[0] ?? '') as RunLogHeader
  } catch {
    throw new Error(`${file}: missing or unparsable run-log header on line 1`)
  }
  if (!header || header.type !== 'header') {
    throw new Error(`${file}: first line is not a run-log header record`)
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
