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
  /** The header's sweep run id — what a record's `runLogRef.runId` must match. */
  runId?: string
  /** The header's `createdAt` — the "is the recorded result older than this
   *  log?" comparison for records that predate `runLogRef`. */
  createdAt?: string
  /** Events after the header that parsed (a killed sweep leaves a torn tail). */
  events: number
  /**
   * True iff an `aggregate` event carrying a result object survived — i.e. the
   * pair reached its DURABLE BOUNDARY. Says nothing about whether the pair
   * SUCCEEDED: a quota trip produces a perfectly complete 0-success aggregate.
   * `planResume` is where that distinction is drawn.
   */
  complete: boolean
  /** The aggregate event's `result`, with `output` still in spilled form. */
  aggregate?: Record<string, unknown>
  /**
   * The header's `configSnapshot.plugins` — the plugin bundle scope the sweep
   * ran under (`[]` = builtins only). Absent on logs written before the knob
   * existed, and on library/test use. Surfaced because a RESUME has to be
   * launched under the same scope: a child that mounted every plugin would
   * resolve a task set the original sweep never had.
   */
  plugins?: string[]
  /**
   * The last `quota` event's estimate, if the provider stated one. It lives in
   * its own event precisely because the aggregate is written BEFORE the record
   * is stamped with it (`runners/provider.ts` post-stamps the returned result),
   * so a recovered record would otherwise lose the answer to "when can this run
   * again?" — and with it the next sweep's quota pre-flight.
   */
  quotaNextResetAt?: string
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
      // LAST quota event wins too — the newest estimate is the live one.
      const quota = [...events]
        .reverse()
        .find(
          (event) =>
            event.type === 'quota' &&
            typeof (event as { quotaNextResetAt?: unknown }).quotaNextResetAt === 'string'
        ) as { quotaNextResetAt: string } | undefined
      return {
        file,
        modelId: header.modelId,
        taskId: header.taskId,
        runId: header.runId,
        createdAt: header.createdAt,
        events: events.length,
        complete: aggregate !== undefined,
        aggregate: aggregate?.result,
        plugins: Array.isArray(header.configSnapshot?.plugins)
          ? header.configSnapshot.plugins.filter((id): id is string => typeof id === 'string')
          : undefined,
        quotaNextResetAt: quota?.quotaNextResetAt,
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

/**
 * Why a pair is being re-run rather than skipped.
 *
 * `failed` is the boundary rule's second half: a pair CAN reach its durable
 * boundary and still have produced nothing. The aggregate a quota trip writes is
 * structurally complete and records 0 successes — treating it as "done" made
 * resume re-run everything EXCEPT the pair the quota actually killed, which is
 * the precise opposite of the intent.
 */
export type RerunReason =
  | 'no-checkpoint'
  | 'incomplete'
  | 'unreadable-header'
  | 'bust-cache'
  | 'failed'

/**
 * Did this aggregate record any successful iteration?
 *
 * Two signals, OR'd, because either alone has a hole:
 *  - `iterationsSucceeded === 0` is the direct statement, but the field is
 *    OPTIONAL (types.ts: "absent on older records = all succeeded"), so its
 *    ABSENCE must never be read as zero.
 *  - `status` is always present; 'fail' and 'timeout' both mean "none
 *    succeeded" by definition ('partial' means some did, so it is left alone).
 */
function aggregateSucceededNothing(aggregate: Record<string, unknown>): boolean {
  const succeeded = aggregate.iterationsSucceeded
  if (typeof succeeded === 'number' && succeeded === 0) return true
  const status = aggregate.status
  return status === 'fail' || status === 'timeout'
}

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
  /** The log's quota estimate, if it stated one — restamped on the record. */
  quotaNextResetAt?: string
  /** Why this record is being re-derived, for the transcript. */
  reason: RecoveryReason
}

/**
 * Why a paid result is being re-derived from its log.
 *
 *  - `absent`  — results.json has no record for the pair at all (the original
 *                crash window: aggregate fsynced, process killed before merge).
 *  - `stale`   — results.json HAS a record, but for an OLDER run. A re-swept
 *                pair whose newer aggregate never reached the file is invisible
 *                to an "is the key present?" test, so the paid result rots.
 */
export type RecoveryReason = 'absent' | 'stale'

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

/**
 * What results.json already knows about one (model, task) pair.
 *
 * A KEY SET is not enough. "Is this pair recorded?" answers the crash-window
 * question but not the RE-SWEEP one: a pair swept twice has a record from the
 * first run sitting in results.json while the second run's aggregate — the one
 * that was just paid for — never made it out of the log. So the recorded side
 * has to carry enough to tell WHICH run the record came from.
 */
export interface RecordedResult {
  modelId: string
  taskId: string
  /** ISO timestamp on the record. */
  createdAt?: string
  /** The record's own trace pointer; its `runId` is the discriminator. */
  runLogRef?: { runId?: string; file?: string } | null
}

export interface ResumePlanInput {
  checkpoints: readonly RunLogCheckpoint[]
  modelIds: readonly string[]
  taskIds: readonly string[]
  /**
   * The records already in results.json (pass the parsed file straight in —
   * `BenchmarkResult` satisfies `RecordedResult` structurally).
   */
  recorded?: readonly RecordedResult[]
  /** `--bust-cache` / `RUN_BUST_CACHE=1` — forces every pair to re-run. */
  bustCache?: boolean
  runId?: string
}

/**
 * Is the recorded result older than the checkpoint that is about to be skipped?
 *
 * Two tests, in preference order, because records come from two eras:
 *
 *  1. `runLogRef.runId` — exact, and the only honest answer once run logs exist:
 *     a record pointing at a DIFFERENT run than the one being resumed was
 *     written by an earlier sweep of the same pair, so the resume target's
 *     aggregate never reached results.json.
 *  2. `createdAt` vs the log HEADER's `createdAt` — the fallback for records
 *     written before `runLogRef` existed. Only applied when there is no
 *     runLogRef at all: a ref that names the target run is authoritative, and
 *     timestamps must not be allowed to second-guess it.
 *
 * Unparsable or absent timestamps mean "cannot tell", which resolves to NOT
 * stale — recovery overwrites a record, and a wrong overwrite is worse than a
 * missed one (the operator can always re-run).
 */
function isRecordOlderThan(record: RecordedResult, checkpoint: RunLogCheckpoint): boolean {
  const recordedRunId = record.runLogRef?.runId
  if (typeof recordedRunId === 'string') {
    return typeof checkpoint.runId === 'string' && recordedRunId !== checkpoint.runId
  }
  const logAt = Date.parse(checkpoint.createdAt ?? '')
  const recordAt = Date.parse(record.createdAt ?? '')
  if (Number.isNaN(logAt) || Number.isNaN(recordAt)) return false
  return recordAt < logAt
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
  // key → the record itself, not just its presence (see `RecordedResult`).
  // Last write wins, matching results.json's own de-dup convention.
  const recordedByKey = new Map<string, RecordedResult>()
  for (const record of recorded) recordedByKey.set(pairKey(record.modelId, record.taskId), record)

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
      const aggregate = checkpoint.aggregate!
      const record = recordedByKey.get(key)
      const recovery = (reason: RecoveryReason): ResumeRecovery => ({
        modelId,
        taskId,
        file: checkpoint.file,
        aggregate,
        quotaNextResetAt: checkpoint.quotaNextResetAt,
        reason,
      })

      if (aggregateSucceededNothing(aggregate)) {
        // The boundary was reached, but nothing was produced — a quota trip, an
        // outage, an all-failed pair. Skipping it is how a resumed sweep re-ran
        // everything EXCEPT the pair the quota killed.
        plan.rerun.push({ modelId, taskId, reason: 'failed', events: checkpoint.events, file: checkpoint.file })
        // Still worth recovering when nothing is recorded: a fail record beats a
        // hole (it carries the status, the tokens spent, and — via M1 — the
        // quota window the NEXT pre-flight needs). ORDER: the script recovers
        // before the sweep runs, so the rerun's own merge lands afterwards and
        // mergeResults resolves it normally — a successful rerun REPLACES the
        // recovered fail record, and a rerun that also produces 0 successes is
        // dropped in favour of the record we just restored. Recovering a STALE
        // record here would be strictly worse than the older one it overwrote,
        // so the stale path below is deliberately not applied to failures.
        if (!record) plan.recover.push(recovery('absent'))
        continue
      }

      plan.skipped.push({ modelId, taskId, file: checkpoint.file })
      plan.skipKeys.add(key)
      if (!record) {
        plan.recover.push(recovery('absent'))
      } else if (isRecordOlderThan(record, checkpoint)) {
        plan.recover.push(recovery('stale'))
      }
    }
  }

  return plan
}

/**
 * The models this sweep will ACTUALLY call — those with at least one pair the
 * resume is not skipping.
 *
 * WHY THIS EXISTS. `--resume` narrows the work but not the SHAPE: the child is
 * still launched with the full `--model` set (the monitor derives it from the
 * tree's headers, and a hand-run resume repeats the original knobs), so the
 * quota pre-flight, reading that set verbatim, would abort the whole sweep over
 * a lock on a model whose every pair is already complete — a model this run is
 * never going to call. That disagreed with the recovery monitor, which locks
 * over PENDING models only (`recoveryPlan`): the monitor said `resume`, the
 * child aborted, and the monitor's stop-on-nonzero killed the watch.
 *
 * Pure, and deliberately expressed over the same (model × task) cross product
 * `planResume` walks, keyed by the same `pairKey`, so "pending" means exactly
 * what the plan means by it. Input order is preserved — the pre-flight's
 * messages read in the operator's model order.
 */
export function modelsWithPendingPairs(
  modelIds: readonly string[],
  taskIds: readonly string[],
  skipKeys: ReadonlySet<string>
): string[] {
  return modelIds.filter((modelId) => taskIds.some((taskId) => !skipKeys.has(pairKey(modelId, taskId))))
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
 *
 * `options.quotaNextResetAt` re-attaches the log's `quota` event to the record.
 * The runner POST-STAMPS that field onto the returned result, after the
 * aggregate event has already been written, so the aggregate alone never
 * carries it — and a recovered quota failure without it is a record the next
 * sweep's quota pre-flight cannot see.
 */
export function recoverResultFromAggregate(
  runDir: string,
  aggregate: Record<string, unknown>,
  onWarn: (message: string) => void = () => {},
  options: { quotaNextResetAt?: string } = {}
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
  const recovered = { ...(rest as Omit<BenchmarkResult, 'output'>), output: text }
  // The aggregate wins if it somehow already carries one; otherwise the log's
  // quota event is the only surviving statement of the window.
  if (options.quotaNextResetAt && !recovered.quotaNextResetAt) {
    recovered.quotaNextResetAt = options.quotaNextResetAt
  }
  return recovered
}
