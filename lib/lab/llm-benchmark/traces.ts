/**
 * Published run traces — the pure half.
 *
 * A run log only exists on the machine that ran the sweep: `sweeps/` is
 * gitignored and pruned (`sweep-clean.mjs`), so a CI build, a fresh clone, or
 * anyone else's checkout has no trace data at all. For the trace to be
 * READABLE ON THE SITE it therefore has to be PUBLISHED — copied into
 * `public/lab-data/traces/<runId>/` and committed — exactly like the generated
 * artifacts are, except that these ones are the evidence rather than the
 * output.
 *
 * This module holds the decisions that publication makes, as pure functions
 * over data, so they can be unit-tested without a filesystem:
 *
 *   - which (runId, file) pairs a results.json deserves published
 *     (`traceRefsFromResults`)
 *   - which spill files one log actually references (`collectSpillRefs`)
 *   - which already-published entries are now stale (`staleTraceKeys`)
 *   - what is safe to turn into a path (`isSafePathSegment`, `isSafeSpillRef`)
 *
 * The fs/copy side is `scripts/publish-traces.mjs`; the build-time index read
 * is `traces-server.ts`. Nothing here imports node — the run-trace UI imports
 * `TraceIndexEntry` and `traceKey` from this module in the browser.
 */

/** One published trace, as listed in `public/lab-data/traces/index.json`. */
export interface TraceIndexEntry {
  runId: string
  /** JSONL basename inside the run directory (`<modelId>-<taskId>.jsonl`). */
  file: string
  /** From the log HEADER, not the filename — both ids contain hyphens. */
  modelId: string
  taskId: string
  /** Byte size of the published JSONL, for the disclosure's summary line. */
  bytes?: number
  /** Spill files published alongside it (paths relative to the run dir). */
  spillRefs?: string[]
}

/** The (runId, file) locator a `BenchmarkResult.runLogRef` carries. */
export interface TraceRef {
  runId: string
  file: string
}

/** Stable identity of a published trace: `<runId>/<file>`. */
export function traceKey(ref: TraceRef): string {
  return `${ref.runId}/${ref.file}`
}

/**
 * Safe as a single path segment: no separators, no `..`, no dotfiles, no
 * anything that would let a results.json record (or a run id) escape the
 * publication directory. Deliberately the same shape of allow-list
 * `gen-benchmark-outputs.mjs` uses on task/model ids, widened only by `:`,
 * which sweep run ids contain (`2026-08-16T09-30-12`).
 */
export function isSafePathSegment(value: string): boolean {
  return /^[a-z0-9][a-z0-9._:-]*$/i.test(value) && !value.includes('..')
}

/** A spill locator is always `spill/<hex>.txt` relative to the run dir. */
export function isSafeSpillRef(ref: string): boolean {
  return /^spill\/[a-f0-9]{4,64}\.txt$/.test(ref)
}

/**
 * Every distinct trace a results.json refers to, in stable key order.
 *
 * Deduped because several records can (in principle) name the same log, and
 * filtered by `isSafePathSegment` because these strings become paths. A record
 * with no `runLogRef` — every record written before the run log existed —
 * simply contributes nothing; that is the whole of the backwards story.
 */
export function traceRefsFromResults(
  results: Array<{ runLogRef?: TraceRef | null }>
): TraceRef[] {
  const byKey = new Map<string, TraceRef>()
  for (const result of results) {
    const ref = result.runLogRef
    if (!ref || typeof ref.runId !== 'string' || typeof ref.file !== 'string') continue
    if (!isSafePathSegment(ref.runId) || !isSafePathSegment(ref.file)) continue
    byKey.set(traceKey(ref), { runId: ref.runId, file: ref.file })
  }
  return [...byKey.values()].sort((a, b) => traceKey(a).localeCompare(traceKey(b)))
}

/**
 * Spill files one log references, sorted and deduped.
 *
 * Recursive over the whole event, not just the known `rawOutput`/`output`
 * fields: the writer spills ANY string over the threshold wherever it sits
 * (an aggregate result's `output`, a check's `detail`), so the reader has to
 * find them the same way. Missing one would publish a trace whose "view full"
 * link 404s.
 */
export function collectSpillRefs(events: unknown[]): string[] {
  const refs = new Set<string>()
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    const ref = record.spillRef
    if (typeof ref === 'string' && isSafeSpillRef(ref)) refs.add(ref)
    for (const item of Object.values(record)) walk(item)
  }
  walk(events)
  return [...refs].sort()
}

/**
 * Published trace keys that no results.json record claims any more — a rerun
 * that produced a new run id leaves the old trace behind, and a stale trace is
 * worse than no trace: it is evidence for a result the site no longer shows.
 */
export function staleTraceKeys(publishedKeys: string[], wanted: TraceRef[]): string[] {
  const keep = new Set(wanted.map(traceKey))
  return publishedKeys.filter((key) => !keep.has(key)).sort()
}

/**
 * The published entry for a record's `runLogRef`, or undefined.
 *
 * The index is the ONLY authority on whether a trace exists: the site is a
 * static export, so a "does this file exist?" probe would be a 404 in the
 * console on every historical record. A record whose ref is absent from the
 * index (never published, published then pruned, or predating the run log)
 * simply has no trace, and the UI says so once rather than guessing.
 */
export function findTraceEntry(
  index: TraceIndexEntry[],
  ref: TraceRef | null | undefined
): TraceIndexEntry | undefined {
  if (!ref) return undefined
  const key = traceKey(ref)
  return index.find((entry) => traceKey(entry) === key)
}

/** Soft ceiling on total published trace bytes before the script warns. */
export const TRACE_PUBLISH_SOFT_BUDGET_BYTES = 2 * 1024 * 1024

/** `1.4 MB` / `812 B` — shared by the publish script and the UI. */
export function formatTraceBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
