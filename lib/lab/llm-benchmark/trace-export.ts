/**
 * Downloadable run traces — assembling one published trace into a ZIP.
 *
 * A reader can already BROWSE a trace (#9): the disclosure fetches the JSONL
 * and renders it. What they cannot do is take it away — read it offline, diff
 * it against a later run, or re-verify the score without trusting this site's
 * rendering of it. That is what an export is for, and on a static export there
 * is no endpoint to build one: the assembly happens IN THE BROWSER, from the
 * same published files the disclosure reads.
 *
 * The archive is deliberately the WHOLE evidence chain and nothing else:
 *
 *   <model>-<task>.jsonl   the append-only log, verbatim — every request,
 *                          retry, response, cleaned artifact, CHECK-LEVEL
 *                          verdict, and the aggregate that became the row
 *   spill/<hash>.txt       the full bytes of every oversized string the log
 *                          references (the artifact that was actually scored)
 *   README.txt             what this is, the score it backs, and how to
 *                          re-verify it offline
 *
 * Two properties matter more than convenience:
 *
 *  - **The log is the authority on what to include**, not the index entry.
 *    `collectSpillRefs` walks the events, so a spill file the index never
 *    listed still lands in the ZIP; an export whose "view full" bytes are
 *    absent is evidence with a hole in it.
 *  - **A partial export is labelled, never silent.** If a spill file 404s the
 *    archive is still produced (the log is the valuable part) and the README
 *    says INCOMPLETE with the names, because a reader who does not know what
 *    is missing cannot reason about what is present.
 *
 * Browser-safe: `parseRunLog` (runlog-format), `collectSpillRefs` (traces) and
 * `createZip` (zip) are all node-free by construction, and this module adds no
 * imports beyond them. IO is INJECTED (`readFile`) exactly like
 * `verify-results.ts` does it — so the assembly is unit-testable with no
 * network, and the same function drives the UI's `fetch` and the node demo
 * script.
 */
import { parseRunLog } from './runlog-format'
import type { RunLogEvent, RunLogHeader } from './runlog-format'
import { collectSpillRefs, isSafeSpillRef } from './traces'
import type { TraceIndexEntry } from './traces'
import { createZip } from './zip'

/** The generated README's name inside the archive. */
export const TRACE_EXPORT_README = 'README.txt'

export interface BuildTraceExportOptions {
  entry: TraceIndexEntry
  /**
   * Reads one file inside the published run directory, as text. `relPath` is
   * either the log's basename or a `spill/<hash>.txt` ref. Rejects when the
   * file cannot be read — a rejection on the LOG is fatal, one on a spill file
   * is recorded and the export continues.
   */
  readFile: (relPath: string) => Promise<string>
  /** Stamped in the README and on the archive members. Defaults to now. */
  exportedAt?: Date
}

export interface TraceExport {
  /** Suggested download name. */
  filename: string
  /** The archive. `Uint8Array<ArrayBuffer>` so it is a valid `BlobPart`. */
  bytes: Uint8Array<ArrayBuffer>
  /** Member names, in archive order. */
  names: string[]
  /** Spill refs the log named that could not be fetched. */
  missingSpill: string[]
  header: RunLogHeader
  events: RunLogEvent[]
}

/**
 * `trace-<model>-<task>-<run>.zip`.
 *
 * Not the log's own basename: that is `<model>-<task>.jsonl` with no run id, so
 * two exports of the same pair from different sweeps would collide in a
 * downloads folder — which is precisely the comparison an export exists to
 * enable. Every id is sanitised because this string becomes a filename on the
 * reader's machine.
 */
export function traceExportFilename(entry: TraceIndexEntry): string {
  const safe = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-')
  return `trace-${safe(entry.modelId)}-${safe(entry.taskId)}-${safe(entry.runId)}.zip`
}

/** The aggregate event's `result`, or undefined when the log has none. */
export function aggregateResult(events: RunLogEvent[]): Record<string, unknown> | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]
    if (event.type === 'aggregate') return event.result
  }
  return undefined
}

function num(result: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = result?.[key]
  return typeof value === 'number' ? value : undefined
}

export interface TraceExportReadmeInput {
  entry: TraceIndexEntry
  logFile: string
  spillRefs: string[]
  missingSpill: string[]
  aggregate: Record<string, unknown> | undefined
  exportedAt: Date
}

/**
 * The README shipped inside every export.
 *
 * It has one job the ZIP cannot do for itself: tell someone who opens this
 * folder in six months WHAT NUMBER it backs and HOW TO CHECK IT without this
 * website. So it states the aggregate from the log's own bytes (never a number
 * passed in from the page — the archive must describe itself), and it gives two
 * offline commands: the transcript replay, and a content-address check that
 * needs nothing but `shasum`.
 */
export function traceExportReadme(input: TraceExportReadmeInput): string {
  const { entry, logFile, spillRefs, missingSpill, aggregate, exportedAt } = input
  const score = num(aggregate, 'score')
  const succeeded = num(aggregate, 'iterationsSucceeded')
  const iterations = num(aggregate, 'iterations')
  const cost = num(aggregate, 'costUsd')
  const status = typeof aggregate?.status === 'string' ? aggregate.status : undefined

  const lines: string[] = []
  lines.push('Run trace export — benebsworth.com / lab / llm-benchmark')
  lines.push('='.repeat(72))
  lines.push('')
  lines.push(`model     ${entry.modelId}`)
  lines.push(`task      ${entry.taskId}`)
  lines.push(`run       ${entry.runId}`)
  lines.push(`source    /lab-data/traces/${entry.runId}/${entry.file}`)
  lines.push(`exported  ${exportedAt.toISOString()}`)
  lines.push('')
  lines.push('WHAT THIS IS')
  lines.push('')
  lines.push('  The append-only event log one (model, task) run wrote while it ran, plus')
  lines.push('  the full bytes of everything too large to inline. It is the CHECK-LEVEL')
  lines.push('  evidence behind one row of the published results table: the prompt hash')
  lines.push('  that was sent, every retry, what each iteration emitted, what the scorer')
  lines.push('  actually saw, and each check’s pass/fail with its points.')
  lines.push('')
  lines.push('CONTENTS')
  lines.push('')
  lines.push(`  ${logFile}`)
  lines.push('      the run log (JSONL, one event per line, first line is the header)')
  if (spillRefs.length > 0) {
    lines.push(`  spill/  (${spillRefs.length} file${spillRefs.length === 1 ? '' : 's'})`)
    for (const ref of spillRefs) lines.push(`      ${ref}`)
    lines.push('      full bytes of the oversized strings the log references; each name is')
    lines.push('      the first 16 hex chars of the sha256 of its own contents')
  }
  lines.push(`  ${TRACE_EXPORT_README}`)
  lines.push('      this file')
  lines.push('')
  if (missingSpill.length > 0) {
    lines.push('  *** INCOMPLETE EXPORT ***')
    lines.push('')
    lines.push('  These spill files are referenced by the log but could not be fetched, so')
    lines.push('  they are NOT in this archive:')
    for (const ref of missingSpill) lines.push(`      ${ref}`)
    lines.push('')
    lines.push('  Everything else below still applies; the artifacts behind those refs do')
    lines.push('  not. Re-export later, or read them at the source URL above.')
    lines.push('')
  }
  lines.push('THE SCORE THIS BACKS')
  lines.push('')
  if (aggregate === undefined) {
    lines.push('  This log has no aggregate event — the sweep was killed before the run')
    lines.push('  finished, so there is no published row behind it. Everything it did')
    lines.push('  record is still here.')
  } else {
    const parts: string[] = []
    if (score !== undefined) parts.push(`score ${score}`)
    if (status) parts.push(status)
    if (succeeded !== undefined && iterations !== undefined) {
      parts.push(`${succeeded}/${iterations} iterations succeeded`)
    }
    if (cost !== undefined) parts.push(`$${cost}`)
    lines.push(`  ${parts.join('  ·  ')}`)
    lines.push('')
    lines.push('  Taken from this log’s own aggregate event, not from the page you')
    lines.push('  downloaded it from. Publication checks that the two agree on score,')
    lines.push('  status, iterationsSucceeded and costUsd, and refuses to publish a trace')
    lines.push('  that disagrees with the row it backs.')
  }
  lines.push('')
  lines.push('RE-VERIFY IT OFFLINE')
  lines.push('')
  lines.push('  1. Replay the log as a transcript (needs a checkout of the site repo):')
  lines.push('')
  lines.push('       npx tsx scripts/retrace.mjs --dir <this-directory> --full')
  lines.push('')
  lines.push('     --dir reads an extracted export directly; --full inlines the spill')
  lines.push('     files instead of their previews.')
  lines.push('')
  lines.push('  2. Check the artifacts are the ones that were scored — needs nothing but')
  lines.push('     a shell. Every spill file is content-addressed, so its name must be')
  lines.push('     the first 16 hex chars of the sha256 of its bytes:')
  lines.push('')
  lines.push('       for f in spill/*.txt; do')
  lines.push('         printf "%s %s\\n" "$(shasum -a 256 "$f" | cut -c1-16)" "$(basename "$f" .txt)"')
  lines.push('       done')
  lines.push('')
  lines.push('     The two columns must match on every line.')
  lines.push('')
  lines.push('  3. The log is append-only and its `seq` is writer-owned: a GAP is')
  lines.push('     deliberate evidence that a failed batch was rolled back, a DUPLICATE or')
  lines.push('     a decrease would mean the file is not a faithful replay.')
  lines.push('')
  return lines.join('\n')
}

/**
 * Fetch a published trace and assemble the download.
 *
 * Sequential rather than parallel on purpose: a trace has a handful of spill
 * files, the browser is on someone else's connection, and a burst of parallel
 * fetches for a click-to-download buys nothing measurable.
 */
export async function buildTraceExport(options: BuildTraceExportOptions): Promise<TraceExport> {
  const { entry, readFile } = options
  const exportedAt = options.exportedAt ?? new Date()

  // A failure HERE is fatal: without the log there is nothing to export.
  const logText = await readFile(entry.file)
  const { header, events } = parseRunLog(logText, `${entry.runId}/${entry.file}`)

  // Union of what the LOG references and what the index claims, so neither a
  // stale index nor an unlisted ref can silently drop an artifact.
  const refs = [...new Set([...collectSpillRefs(events), ...(entry.spillRefs ?? [])])]
    .filter(isSafeSpillRef)
    .sort()

  const files: Array<{ name: string; data: string }> = [{ name: entry.file, data: logText }]
  const fetched: string[] = []
  const missingSpill: string[] = []
  for (const ref of refs) {
    try {
      files.push({ name: ref, data: await readFile(ref) })
      fetched.push(ref)
    } catch {
      missingSpill.push(ref)
    }
  }

  const aggregate = aggregateResult(events)
  files.push({
    name: TRACE_EXPORT_README,
    data: traceExportReadme({
      entry,
      logFile: entry.file,
      spillRefs: fetched,
      missingSpill,
      aggregate,
      exportedAt,
    }),
  })

  return {
    filename: traceExportFilename(entry),
    bytes: createZip(files, { modifiedAt: exportedAt }),
    names: files.map((file) => file.name),
    missingSpill,
    header,
    events,
  }
}
