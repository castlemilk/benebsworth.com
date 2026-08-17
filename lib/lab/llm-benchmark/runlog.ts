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
 *  - `seq` is writer-owned and contiguous on the healthy path: line i has
 *    `seq === i`. Because seq is assigned at append time and a failed batch is
 *    dropped (below), a rollback leaves a GAP in the on-disk sequence — that
 *    gap is deliberate forensic evidence that events were lost to a write
 *    failure, not silently renumbered away
 *  - append-only — flushed bytes are never rewritten
 *  - appends are coalesced into batches (WRITE_BATCH_MAX_DELAY_MS), each batch
 *    is one write + one fsync; `flush()` bypasses the window
 *  - a failed batch rolls the file back to its last durable length and is
 *    DROPPED (degraded logging must never fail a sweep)
 *  - every string in every record (header included) is value-redacted on the
 *    way in (`redact.ts`), BEFORE spilling — so a credential a model echoed
 *    back never lands in the JSONL or in a spill file
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

import { redactText, redactValue } from './redact'
import { parseRunLog, SPILL_PREVIEW_CHARS } from './runlog-format'
import type {
  RunLogConfigSnapshot,
  RunLogEvent,
  RunLogEventInput,
  RunLogHeader,
  SpilledString,
} from './runlog-format'

// The record shapes and the pure reader live in `runlog-format.ts` — a
// browser-safe module, so the run-trace UI can parse the same bytes without
// pulling node:fs into the client bundle. They are re-exported here so the
// node-side callers keep importing everything from one place, and so there is
// only ever one definition of each record.
export {
  parseRunLog,
  spillPreview,
  SPILL_PREVIEW_CHARS,
  type RunLogConfigSnapshot,
  type RunLogEvent,
  type RunLogEventInput,
  type RunLogHeader,
  type Spillable,
  type SpilledString,
} from './runlog-format'

/** Strings at or above this many bytes are spilled rather than inlined. */
export const SPILL_THRESHOLD_BYTES = 8 * 1024

/**
 * Coalescing window for batched writes (dsh's `writeBatchMaxDelayMs`). A busy
 * iteration emits several events in quick succession; batching turns that into
 * one write + one fsync instead of one per event.
 */
export const WRITE_BATCH_MAX_DELAY_MS = 200

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
 *
 * REDACTS FIRST, exactly like `append` does. This is not belt-and-braces: the
 * caller (`runners/provider.ts`) spills the aggregate's artifact OUTSIDE the
 * append path, so without this the one spill file `publish-traces.mjs` actually
 * serves would be the RAW artifact — breaching "a credential a model echoed
 * back never lands in the JSONL or in a spill file". It also restores the
 * dedupe: redaction is deterministic, so the aggregate's spill is byte-identical
 * to (and therefore the same content-addressed file as) the `clean` event's
 * spill of the same artifact. Skipping it produced TWO files, with the aggregate
 * pointing at the unredacted one.
 */
export function forceSpill(dir: string, content: string): SpilledString {
  return writeSpill(dir, redactText(content))
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
    // Nothing awaits this promise until the first batch (up to
    // WRITE_BATCH_MAX_DELAY_MS later), so a FAST rejection (EACCES, ENOSPC, fd
    // exhaustion) would be an unhandled rejection and, under Node's default
    // --unhandled-rejections=throw, would kill the sweep — exactly the opposite
    // of "degraded logging must never fail a sweep". Attaching a no-op handler
    // to a DERIVED promise marks the rejection handled without consuming it:
    // `.catch()` returns a new promise, and `this.handle` still rejects into
    // writeBatch's try/catch, which reports it and drops the batch.
    void this.handle.catch(() => {})
    // Header is queued like any other line, so it is always byte 0 of the
    // first batch and can never race an event. Redacted like any other record —
    // there is no bypass, and that matters more than it used to:
    // `configSnapshot` has since grown STRING fields (`plugins[]`, the
    // `promptBundle` hash) on top of the original numbers/booleans. Those are
    // ids and a hex digest, so redaction is still a no-op on them in practice;
    // the point is that the next knob (a base URL with an embedded credential,
    // an echoed env value) is covered by construction rather than by someone
    // remembering.
    this.queue.push(JSON.stringify(redactValue(header)) + '\n')
    this.schedule()
  }

  append(event: RunLogEventInput): void {
    if (this.closed) {
      console.warn(`[runlog] dropped a ${event.type} event appended after close (${this.file})`)
      return
    }
    try {
      const record = {
        // Redact BEFORE spilling, so the content-addressed spill files hold
        // redacted bytes too (redaction is deterministic, so addressing still
        // dedupes across the response/clean/aggregate events that share an
        // artifact). Nothing is excluded: raw output, cleaned output, error
        // strings and the aggregate result all pass through. `promptHash` is
        // hex and unaffected by design.
        ...(spillLargeStrings(this.dir, redactValue(event)) as Record<string, unknown>),
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
 * Read a run log back off disk.
 *
 * The parsing (and its crash-recovery semantics) is `parseRunLog` in
 * `runlog-format.ts`; this is the node-side file wrapper, and passes the path
 * as the label so error messages still name the offending file.
 */
export function readRunLog(file: string): { header: RunLogHeader; events: RunLogEvent[] } {
  return parseRunLog(readFileSync(file, 'utf8'), file)
}
