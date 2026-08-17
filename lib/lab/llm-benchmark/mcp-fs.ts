import { readFileSync } from 'node:fs'
import path from 'node:path'

import { BENCHMARK_MODELS, BENCHMARK_TASKS } from './registry'
import { BENCHMARK_RESULTS } from './results'
import { loadTraceIndex } from './traces-server'
import { isSafePathSegment, isSafeSpillRef, type TraceRef } from './traces'
import type { BenchMcpDeps, TraceHandle } from './mcp'

/**
 * The node-only half of the MCP server: where the bytes come from.
 *
 * `mcp.ts` is pure by design, so the one impure question — "where is this run
 * log?" — lives here, with the answer the rest of the harness already gives:
 *
 *  1. `sweeps/<runId>/<file>` — the LOCAL sweep tree. Preferred, because it is
 *     the complete log with its whole spill store; the published copy carries
 *     only the spill files that log references and only for records the site
 *     still shows.
 *  2. `public/lab-data/traces/<runId>/<file>` — the PUBLISHED copy, which is
 *     what a fresh clone (or a machine that never ran the sweep) has.
 *
 * Nothing is fetched over the network: the site's traces are read off disk
 * because this process is the repo, not a browser.
 *
 * READ-ONLY: this module opens files for reading and never for writing, and it
 * refuses any run id / filename / spill ref that is not a safe path segment —
 * the same allow-list trace publication uses, so a hand-edited results.json
 * cannot walk an MCP client out of the repo.
 */

export const SWEEPS_DIR = 'sweeps'
export const PUBLISHED_TRACES_DIR = path.join('public', 'lab-data', 'traces')

function readIfPresent(file: string): string | undefined {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return undefined
  }
}

/** Open a run log from the local sweep tree, else the published copy. */
export function openTraceFromDisk(ref: TraceRef, root = process.cwd()): TraceHandle | undefined {
  if (!isSafePathSegment(ref.runId) || !isSafePathSegment(ref.file)) return undefined

  const dirs: Array<{ dir: string; origin: TraceHandle['origin'] }> = [
    { dir: path.join(root, process.env.SWEEPS_DIR ?? SWEEPS_DIR, ref.runId), origin: 'local-sweep' },
    { dir: path.join(root, PUBLISHED_TRACES_DIR, ref.runId), origin: 'published' },
  ]

  for (const { dir, origin } of dirs) {
    const text = readIfPresent(path.join(dir, ref.file))
    if (text === undefined) continue
    return {
      ...ref,
      origin,
      text,
      readSpill: (spillRef: string) => {
        if (!isSafeSpillRef(spillRef)) throw new Error(`unsafe spill ref: ${spillRef}`)
        return readFileSync(path.join(dir, spillRef), 'utf8')
      },
    }
  }
  return undefined
}

/** The board + trace store the server runs against. */
export function createBenchMcpDeps(root = process.cwd()): BenchMcpDeps {
  return {
    models: BENCHMARK_MODELS,
    tasks: BENCHMARK_TASKS,
    results: BENCHMARK_RESULTS,
    traceIndex: loadTraceIndex(),
    openTrace: (ref) => openTraceFromDisk(ref, root),
  }
}
