import fs from 'node:fs'
import path from 'node:path'
import type { TraceIndexEntry } from './traces'

/**
 * Published run-trace index — SERVER-SIDE ONLY (reads the repo at build time),
 * the same rule `results.ts` states for results.json.
 *
 * `scripts/publish-traces.mjs` writes `public/lab-data/traces/index.json` from
 * the headers of the logs it published. Pages read it here and pass the one
 * matching entry down as a prop, so the client component never has to probe
 * for a file that may not exist.
 *
 * A missing or unparsable index is NOT an error: a fresh clone that has never
 * run a sweep, or a checkout made before the first publication, legitimately
 * has no traces, and the UI degrades to showing none.
 */
export const TRACE_INDEX_PATH = 'public/lab-data/traces/index.json'

let cached: TraceIndexEntry[] | undefined

export function loadTraceIndex(): TraceIndexEntry[] {
  if (cached) return cached
  const file = path.join(process.cwd(), TRACE_INDEX_PATH)
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'))
    cached = Array.isArray(parsed) ? (parsed as TraceIndexEntry[]) : []
  } catch {
    cached = []
  }
  return cached
}
