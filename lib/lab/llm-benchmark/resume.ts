/**
 * Sweep resume from run-log checkpoints.
 *
 * A sweep that dies to a quota trip, a timeout, or a kill has already PAID for
 * every (model, task) pair it finished. The run log records that fact durably:
 * `runners/provider.ts` appends an `aggregate` event — the whole
 * `BenchmarkResult`, artifact spilled — as the last act of a completed pair,
 * and flushes at every iteration boundary. So "what did this sweep finish?" is
 * answerable from `sweeps/<run-id>/` alone, without trusting results.json.
 *
 * This is dsh's `Session.fork(source, boundary, childId)` applied to sweeps:
 * resuming is a first-class operation with a DURABLE BOUNDARY and TYPED
 * REJECTIONS, not a heuristic. The boundary is the `aggregate` event, mirroring
 * dsh's `OPEN_TURN` rejection — a pair killed mid-iteration has events but no
 * aggregate, and is re-run FROM SCRATCH rather than stitched together. There is
 * no such thing as resuming halfway through a (model, task) pair here: the
 * iterations of one pair are one unit of paid work.
 *
 * Two failure modes are named rather than shrugged at (`ResumeError.code`):
 *  - `RESUME_TARGET_NOT_FOUND` — no such sweep directory
 *  - `RESUME_NO_CHECKPOINTS`   — the directory holds no readable run-log header,
 *                               so there is nothing to resume FROM. Silently
 *                               running the full sweep would spend the money the
 *                               operator was trying to avoid.
 *  - `RESUME_SWEEP_ROOT_CONFLICT` — an explicit `SWEEP_ROOT` plus `--resume`
 *                               names two different destinations (the script
 *                               raises this one; the code lives here so every
 *                               resume rejection is defined in one place).
 *
 * Everything except `readSweepCheckpoints` / `recoverResultFromAggregate` is
 * pure — `planResume` takes checkpoints and returns sets, so the whole boundary
 * rule is unit-testable without a filesystem. The script is the shell.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { readRunLog, runLogFileName, type SpilledString } from './runlog'
import type { BenchmarkResult } from './types'

export type ResumeErrorCode =
  | 'RESUME_TARGET_NOT_FOUND'
  | 'RESUME_NO_CHECKPOINTS'
  | 'RESUME_SWEEP_ROOT_CONFLICT'

/** A typed rejection: the CLI prints `code` verbatim, so it is greppable. */
export class ResumeError extends Error {
  readonly code: ResumeErrorCode
  constructor(code: ResumeErrorCode, message: string) {
    super(message)
    this.name = 'ResumeError'
    this.code = code
  }
}

/** One run log in the resume target, classified against the boundary rule. */
export interface RunLogCheckpoint {
  /** Basename inside the run dir, e.g. `kimi-k2.7-equation-solver.jsonl`. */
  file: string
  /** From the HEADER — the filename is ambiguous (both ids contain hyphens). */
  modelId?: string
  taskId?: string
  /** Events after the header that parsed (a killed sweep leaves a torn tail). */
  events: number
  /** True iff an `aggregate` event carrying a result object survived. */
  complete: boolean
  /** The aggregate event's `result`, with `output` still in spilled form. */
  aggregate?: Record<string, unknown>
  /** Why the header could not be read. Present = this log describes nothing. */
  headerError?: string
}

/** The key `mergeResults` and the job filter both use. */
export function pairKey(modelId: string, taskId: string): string {
  return `${modelId}|${taskId}`
}

/**
 * `<sweepsDir>/<runId>`, with the run id constrained to a single directory
 * name.
 *
 * A run id is a `sweepRunId()` timestamp — a basename, never a path. Joining an
 * unvalidated one would let `--resume ../..` point the SWEEP ROOT (which the
 * run log and the CLI scratch dirs both write into) anywhere on disk, so the
 * shape is rejected before it becomes a filesystem operation.
 */
export function resumeRunDir(sweepsDir: string, runId: string): string {
  if (runId === '' || runId === '.' || runId === '..' || /[\\/]/.test(runId)) {
    throw new ResumeError(
      'RESUME_TARGET_NOT_FOUND',
      `"${runId}" is not a sweep run id — it must be a single directory name inside ${sweepsDir}`
    )
  }
  return join(sweepsDir, runId)
}

/**
 * Read every run log in a sweep directory and classify it.
 *
 * Throws `RESUME_TARGET_NOT_FOUND` when the directory is missing and
 * `RESUME_NO_CHECKPOINTS` when nothing in it has a readable header — both are
 * "the boundary you named does not exist", which must never degrade into a
 * silent full sweep.
 */
export function readSweepCheckpoints(runDir: string): RunLogCheckpoint[] {
  let entries: string[]
  try {
    entries = readdirSync(runDir)
  } catch (err) {
    throw new ResumeError(
      'RESUME_TARGET_NOT_FOUND',
      `no such sweep run directory: ${runDir} (${err instanceof Error ? err.message : String(err)})`
    )
  }

  const files = entries.filter((name) => name.endsWith('.jsonl')).sort()
  const checkpoints: RunLogCheckpoint[] = files.map((file) => {
    try {
      const { header, events } = readRunLog(join(runDir, file))
      // LAST aggregate wins: the writer truncates on reopen, so a healthy log
      // has at most one — but a hand-concatenated file should still resolve to
      // the newest boundary rather than the oldest.
      const aggregate = [...events]
        .reverse()
        .find(
          (event) =>
            event.type === 'aggregate' &&
            typeof (event as { result?: unknown }).result === 'object' &&
            (event as { result?: unknown }).result !== null
        ) as { result: Record<string, unknown> } | undefined
      return {
        file,
        modelId: header.modelId,
        taskId: header.taskId,
        events: events.length,
        complete: aggregate !== undefined,
        aggregate: aggregate?.result,
      }
    } catch (err) {
      return {
        file,
        events: 0,
        complete: false,
        headerError: err instanceof Error ? err.message : String(err),
      }
    }
  })

  if (!checkpoints.some((checkpoint) => checkpoint.headerError === undefined)) {
    throw new ResumeError(
      'RESUME_NO_CHECKPOINTS',
      files.length === 0
        ? `${runDir} holds no run logs (*.jsonl) — there is no checkpoint to resume from`
        : `${runDir} holds ${files.length} run log(s) but not one readable header — there is no checkpoint to resume from`
    )
  }
  return checkpoints
}

/** Why a pair is being re-run rather than skipped. */
export type RerunReason = 'no-checkpoint' | 'incomplete' | 'unreadable-header' | 'bust-cache'

export interface ResumeSkip {
  modelId: string
  taskId: string
  file: string
}

export interface ResumeRerun {
  modelId: string
  taskId: string
  reason: RerunReason
  /** Events found in the incomplete log (0 when there is no usable log). */
  events: number
  file?: string
}

export interface ResumeRecovery extends ResumeSkip {
  /** The aggregate event's result — feed to `recoverResultFromAggregate`. */
  aggregate: Record<string, unknown>
}

export interface ResumePlan {
  runId?: string
  /** Complete pairs: paid for, already recorded, not run again. */
  skipped: ResumeSkip[]
  rerun: ResumeRerun[]
  /** Skipped pairs MISSING from results.json — re-derivable from the log. */
  recover: ResumeRecovery[]
  /** True when `--bust-cache` suppressed every skip. */
  bustCacheOverride: boolean
  /** How many skips bust-cache overrode (0 when it is off). */
  overriddenSkips: number
  /** `pairKey` set the job filter consumes. Empty under bust-cache. */
  skipKeys: Set<string>
}

export interface ResumePlanInput {
  checkpoints: readonly RunLogCheckpoint[]
  modelIds: readonly string[]
  taskIds: readonly string[]
  /** (model, task) pairs already present in results.json. */
  recorded?: readonly { modelId: string; taskId: string }[]
  /** `--bust-cache` / `RUN_BUST_CACHE=1` — forces every pair to re-run. */
  bustCache?: boolean
  runId?: string
}

/**
 * Decide, for every (model, task) this sweep would run, whether to skip it,
 * re-run it, or recover its record from the log.
 *
 * Pure. The pair→checkpoint match prefers the HEADER's ids; a log whose header
 * is unreadable is matched by its EXPECTED filename instead — which is exact
 * here (unlike parsing a filename blind) because the candidate ids are known,
 * so `runLogFileName(model, task)` can be generated and compared.
 */
export function planResume({
  checkpoints,
  modelIds,
  taskIds,
  recorded = [],
  bustCache = false,
  runId,
}: ResumePlanInput): ResumePlan {
  const byPair = new Map<string, RunLogCheckpoint>()
  const byFile = new Map<string, RunLogCheckpoint>()
  for (const checkpoint of checkpoints) {
    if (checkpoint.modelId && checkpoint.taskId) {
      byPair.set(pairKey(checkpoint.modelId, checkpoint.taskId), checkpoint)
    }
    byFile.set(checkpoint.file, checkpoint)
  }
  const recordedKeys = new Set(recorded.map((r) => pairKey(r.modelId, r.taskId)))

  const plan: ResumePlan = {
    runId,
    skipped: [],
    rerun: [],
    recover: [],
    bustCacheOverride: bustCache,
    overriddenSkips: 0,
    skipKeys: new Set(),
  }

  // Task-major, matching the job order runBenchmark builds.
  for (const taskId of taskIds) {
    for (const modelId of modelIds) {
      const key = pairKey(modelId, taskId)
      const checkpoint = byPair.get(key) ?? byFile.get(runLogFileName(modelId, taskId))

      if (bustCache) {
        if (checkpoint?.complete) plan.overriddenSkips++
        plan.rerun.push({ modelId, taskId, reason: 'bust-cache', events: checkpoint?.events ?? 0, file: checkpoint?.file })
        continue
      }
      if (!checkpoint) {
        plan.rerun.push({ modelId, taskId, reason: 'no-checkpoint', events: 0 })
        continue
      }
      if (checkpoint.headerError !== undefined) {
        plan.rerun.push({ modelId, taskId, reason: 'unreadable-header', events: 0, file: checkpoint.file })
        continue
      }
      if (!checkpoint.complete) {
        plan.rerun.push({ modelId, taskId, reason: 'incomplete', events: checkpoint.events, file: checkpoint.file })
        continue
      }
      plan.skipped.push({ modelId, taskId, file: checkpoint.file })
      plan.skipKeys.add(key)
      if (!recordedKeys.has(key)) {
        plan.recover.push({ modelId, taskId, file: checkpoint.file, aggregate: checkpoint.aggregate! })
      }
    }
  }

  return plan
}

function isSpilled(value: unknown): value is SpilledString {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as SpilledString).spillRef === 'string' &&
    typeof (value as SpilledString).preview === 'string'
  )
}

/**
 * Rebuild a `BenchmarkResult` from an aggregate event, un-spilling the artifact.
 *
 * This is the crash-window repair: the aggregate is fsynced by the run log
 * BEFORE `scripts/run-benchmark.mjs` merges the record into results.json, so a
 * kill in between leaves a pair that is provably complete on disk and yet
 * absent from the published file. Re-running it would spend money to recompute
 * bytes that are already stored.
 *
 * A missing spill file degrades to the inline preview with a warning rather
 * than throwing — a truncated artifact is worse than a full one and better than
 * losing the record's score, tokens and status entirely.
 */
export function recoverResultFromAggregate(
  runDir: string,
  aggregate: Record<string, unknown>,
  onWarn: (message: string) => void = () => {}
): BenchmarkResult & { output: string } {
  const { output, ...rest } = aggregate
  let text = ''
  if (typeof output === 'string') {
    text = output
  } else if (isSpilled(output)) {
    try {
      text = readFileSync(join(runDir, output.spillRef), 'utf8')
    } catch (err) {
      text = output.preview
      onWarn(
        `spill ${output.spillRef} is unreadable (${err instanceof Error ? err.message : String(err)}) — recovered the ${output.preview.length}-char preview of a ${output.bytes}-byte artifact`
      )
    }
  }
  return { ...(rest as Omit<BenchmarkResult, 'output'>), output: text }
}
