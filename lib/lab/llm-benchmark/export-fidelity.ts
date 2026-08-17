/**
 * Export fidelity — does the PUBLISHED copy still back the number it claims?
 *
 * Publication (`publish-traces.mjs`) is a copy, and a copy is where divergence
 * is introduced: results.json is edited by hand and by merge scripts, a trace
 * is carried through from a previous index when its source sweep is gone, a
 * spill file gets rewritten or truncated, an artifact is "tidied". None of that
 * is loud. The site would keep serving a trace whose aggregate says 71 next to
 * a table row that says 78, and the trace — the thing that exists to make the
 * number checkable — would be the lie.
 *
 * So this runs at PUBLISH TIME, over the bytes that were just written, and the
 * publish FAILS on divergence. Three questions, all answerable from the
 * published tree alone:
 *
 *   1. does the published JSONL still parse as a run log?
 *   2. does its aggregate event agree with the results.json record it backs, on
 *      the fields a reader compares — score, status, iterationsSucceeded,
 *      costUsd?
 *   3. is every spill file it references actually published, and does each one
 *      still hash to the content address in its own name?
 *
 * Deliberately NOT in `verify-results.ts`: that verifier reads `sweeps/` (which
 * is pruned, so most checks SKIP on a fresh clone) and answers "is results.json
 * internally consistent?". This one reads the COMMITTED, SERVED tree, which is
 * always present, and answers "is the evidence we serve the evidence we
 * claim?". Same discipline though — pure, with IO injected, so it is testable
 * with no filesystem.
 */
import { verifyContentAddress } from './content-address'
import { parseRunLog } from './runlog-format'
import { collectSpillRefs } from './traces'
import type { TraceIndexEntry, TraceRef } from './traces'
import { traceKey } from './traces'

/** One divergence found in the published tree. */
export interface FidelityProblem {
  /** `<runId>/<file>` of the trace it was found in. */
  trace: string
  /** The aggregate field that diverged, when the problem is a field mismatch. */
  field?: string
  detail: string
}

export interface FidelityReport {
  /** Traces examined. */
  traces: number
  /** Spill files re-read and re-hashed. */
  spillChecked: number
  problems: FidelityProblem[]
}

/** The subset of a results.json record this check compares against. */
export interface FidelityRecord {
  modelId: string
  taskId: string
  score?: number
  status?: string
  iterationsSucceeded?: number
  costUsd?: number
  runLogRef?: TraceRef | null
}

export interface VerifyPublishedTracesInput {
  /** Entries of the published `index.json`. */
  index: readonly TraceIndexEntry[]
  results: readonly FidelityRecord[]
  /**
   * Reads a file inside `public/lab-data/traces/<runId>/`, or `undefined` when
   * it is not there. Injected so this module stays pure — the publish script
   * passes a `readFileSync` wrapper, tests pass a map.
   */
  readPublished: (runId: string, relPath: string) => string | undefined
}

/**
 * The aggregate fields a reader can see on the site, and therefore the ones a
 * divergence would mislead them about. `iterations` is deliberately absent:
 * a budget/quota stop legitimately leaves the record's requested count and the
 * aggregate's completed count describing different things (#28), and folding
 * that into a fidelity failure would make the check cry wolf.
 */
const COMPARED_FIELDS = ['score', 'status', 'iterationsSucceeded', 'costUsd'] as const

/**
 * Float slack for `costUsd` only.
 *
 * The record and the aggregate come from the same computation, so they should
 * be bit-identical — but they take different JSON round trips, and a fidelity
 * check that fails on the last bit of a double would be noise that trains
 * people to ignore it. 1e-9 USD is a hundred-millionth of a cent: far below any
 * real divergence, far above any serialisation artefact.
 */
const COST_EPSILON = 1e-9

export function verifyPublishedTraces(input: VerifyPublishedTracesInput): FidelityReport {
  const { index, results, readPublished } = input
  const problems: FidelityProblem[] = []
  let spillChecked = 0

  const recordByTrace = new Map<string, FidelityRecord>()
  for (const record of results) {
    const ref = record.runLogRef
    if (!ref || typeof ref.runId !== 'string' || typeof ref.file !== 'string') continue
    recordByTrace.set(traceKey(ref), record)
  }

  for (const entry of index) {
    const trace = traceKey(entry)
    const fail = (detail: string, field?: string) => problems.push({ trace, field, detail })

    const text = readPublished(entry.runId, entry.file)
    if (text === undefined) {
      fail('the published JSONL could not be read — index.json lists a file that is not there')
      continue
    }

    let events
    try {
      events = parseRunLog(text, trace).events
    } catch (err) {
      fail(`the published JSONL does not parse: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }

    // ---- spill refs: published, and still hashing to their own names --------
    // Union of the log's refs and the index's, so neither a stale index entry
    // nor an unlisted ref escapes the check.
    const refs = [...new Set([...collectSpillRefs(events), ...(entry.spillRefs ?? [])])].sort()
    for (const ref of refs) {
      const content = readPublished(entry.runId, ref)
      if (content === undefined) {
        fail(`${ref} is referenced by the log but missing from the published tree`)
        continue
      }
      spillChecked++
      const check = verifyContentAddress(ref, content)
      if (check && !check.ok) {
        fail(
          `${ref} no longer matches its own content address — name says ${check.expected}, bytes hash to ${check.actual}`
        )
      }
    }

    // ---- the aggregate vs the record it backs ------------------------------
    const record = recordByTrace.get(trace)
    if (!record) {
      fail('no results.json record claims this trace, but it is published and served')
      continue
    }

    const aggregate = lastAggregate(events)
    if (!aggregate) {
      fail('the published log has no aggregate event, so the row it backs cannot be checked')
      continue
    }

    for (const field of COMPARED_FIELDS) {
      const published = aggregate[field]
      const expected = record[field]
      if (published === undefined && expected === undefined) continue
      if (field === 'costUsd' && typeof published === 'number' && typeof expected === 'number') {
        if (Math.abs(published - expected) <= COST_EPSILON) continue
      } else if (published === expected) {
        continue
      }
      fail(
        `aggregate ${field} is ${format(published)} but the results.json record it backs says ${format(expected)}`,
        field
      )
    }
  }

  return { traces: index.length, spillChecked, problems }
}

function lastAggregate(
  events: ReturnType<typeof parseRunLog>['events']
): Record<string, unknown> | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]
    if (event.type === 'aggregate') return event.result
  }
  return undefined
}

function format(value: unknown): string {
  if (value === undefined) return '(absent)'
  return typeof value === 'string' ? `"${value}"` : String(value)
}
