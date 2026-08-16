/**
 * Sweep-root helpers.
 *
 * A sweep writes its forensic residue under `sweeps/<run-id>/`:
 *
 *   sweeps/<run-id>/scratch/<model>-<task>-<n>/     the CLI's working dir
 *   sweeps/<run-id>/artifacts/artifact-<model>-<task>-<n>.html
 *
 * `runners/cli.ts` owns the writing (see `setSweepRoot`); this module owns the
 * naming and the retention policy so both the run script and the prune script
 * agree, and so the policy is unit-testable without touching a filesystem.
 */

/** One `sweeps/<run-id>/` directory, as seen by the prune script. */
export interface SweepEntry {
  name: string
  mtimeMs: number
}

export interface PruneOptions {
  /** Always keep this many newest runs, however old they are. */
  keep: number
  /** Always keep runs younger than this many days, however many there are. */
  olderThanDays: number
  /** Injected for testability. */
  now: number
}

/**
 * Filesystem-safe, lexicographically-sortable run id: `2026-08-16T09-30-12`.
 * ISO 8601 with the colons (illegal on Windows, awkward in shell paths) and
 * the sub-second/zone suffix removed.
 */
export function sweepRunId(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d+Z$/, '').replace(/:/g, '-')
}

/**
 * Runs that may be deleted: a run is prunable only if it is BOTH beyond the
 * newest-`keep` window AND older than the age floor. The conjunction is
 * deliberate — either guard alone has a failure mode (a burst of ten sweeps in
 * one afternoon would evict this morning's evidence under keep-only; a quiet
 * month would evict every run you have under age-only).
 *
 * Returned newest-first, so a dry-run prints in a readable order.
 */
export function selectPrunable(entries: SweepEntry[], options: PruneOptions): SweepEntry[] {
  const floorMs = options.now - options.olderThanDays * 24 * 60 * 60 * 1000
  const newestFirst = [...entries].sort((a, b) => b.mtimeMs - a.mtimeMs)
  return newestFirst.slice(Math.max(0, options.keep)).filter((entry) => entry.mtimeMs < floorMs)
}
