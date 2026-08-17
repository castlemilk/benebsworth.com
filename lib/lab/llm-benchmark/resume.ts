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
  /**
   * The last `budget` event's stamp, if the sweep's spend cap tripped on this
   * pair. Extracted for exactly the reason the quota stamp is: the aggregate is
   * written BEFORE the runner post-stamps `budgetExceeded` onto the result, so
   * a recovered record would otherwise lose the only evidence that an OPERATOR
   * POLICY — not the model, not the provider — ended the run.
   */
  budgetExceeded?: { spentUsd: number; capUsd: number }
  /**
   * The header's `configSnapshot.budgetMaxUsd` — the per-model spend cap the
   * sweep ran under. Absent = uncapped, or a log written before the field
   * existed. Surfaced because a RESUME must be launched under the same cap: the
   * pairs a budget stop skipped have NO run log, so they resume as
   * `no-checkpoint`, and a child spawned without the flag would spend freely.
   */
  budgetMaxUsd?: number
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
      // ...and the last `budget` event, for the same reason: the newest trip is
      // the live one, and the aggregate never carries the stamp itself.
      const budget = [...events]
        .reverse()
        .find(
          (event) =>
            event.type === 'budget' &&
            typeof (event as { spentUsd?: unknown }).spentUsd === 'number' &&
            typeof (event as { capUsd?: unknown }).capUsd === 'number'
        ) as { spentUsd: number; capUsd: number } | undefined
      const cap = header.configSnapshot?.budgetMaxUsd
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
        budgetExceeded: budget ? { spentUsd: budget.spentUsd, capUsd: budget.capUsd } : undefined,
        budgetMaxUsd: typeof cap === 'number' && Number.isFinite(cap) ? cap : undefined,
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
  /** The log's budget trip, if the cap fired — restamped on the record. */
  budgetExceeded?: { spentUsd: number; capUsd: number }
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
        budgetExceeded: checkpoint.budgetExceeded,
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

/** What a tree's run-log headers say about the spend cap it ran under. */
export interface BudgetScope {
  /**
   * The cap to relaunch under, in USD per model. `undefined` means the headers
   * recorded NO cap — either the sweep was uncapped or its logs predate the
   * field — and the caller must then pass no `--budget-max-usd` at all rather
   * than invent one.
   */
  budgetMaxUsd?: number
  /**
   * The headers disagreed. `budgetMaxUsd` is then their MINIMUM — the only
   * choice that cannot spend more than some part of the tree was authorised to
   * — and the caller warns, mirroring `derivePluginScope`'s mixed handling. The
   * union is the safe direction for a task set; the floor is the safe direction
   * for money.
   */
  mixed: boolean
}

/**
 * Derive the spend cap to resume a tree under from its run-log headers.
 *
 * Pure. Headers that stated nothing contribute nothing — a legacy log cannot
 * vote a cap into existence, and it must not vote one away either: a tree with
 * one capped header and one legacy header resumes CAPPED, because the recorded
 * cap is real evidence and the silence is not.
 */
export function deriveBudgetScope(
  checkpoints: readonly { budgetMaxUsd?: number }[]
): BudgetScope {
  const stated = checkpoints
    .map((c) => c.budgetMaxUsd)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (stated.length === 0) return { mixed: false }
  const min = Math.min(...stated)
  return { budgetMaxUsd: min, mixed: new Set(stated).size > 1 }
}

/**
 * The warning a HAND-RUN `--resume` prints when the target tree's headers
 * record a cap that this invocation does not carry.
 *
 * NOT an error and NOT a silent injection, deliberately. Raising a cap on a
 * resume is a legitimate operator decision ("finish it, I'll pay"), so forcing
 * the recorded value would override a choice the operator may have made on
 * purpose. Dropping it silently is the failure this exists to prevent: the
 * pairs a budget stop skipped have no run log, they resume as `no-checkpoint`,
 * and an uncapped child spends without the limit that stopped the parent.
 *
 * Returns `undefined` when there is nothing to say — no recorded cap, or an
 * invocation that already carries one (whatever its value).
 */
export function budgetResumeWarning({
  runId,
  recorded,
  invocation,
}: {
  runId?: string
  recorded: BudgetScope
  invocation?: number
}): string | undefined {
  if (recorded.budgetMaxUsd === undefined) return undefined
  if (invocation !== undefined) return undefined
  return (
    `[harness] resume: the run logs in ${runId ?? 'the resume target'} record a per-model spend cap of ` +
    `$${recorded.budgetMaxUsd.toFixed(2)}${recorded.mixed ? ' (the MINIMUM — headers disagree)' : ''}, ` +
    `but this invocation has no --budget-max-usd. This resume will run UNCAPPED. ` +
    `Add --budget-max-usd ${recorded.budgetMaxUsd} to keep the original limit.`
  )
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
 *
 * `options.budgetExceeded` is the exact twin of that, for the `budget` event.
 * It is post-stamped the same way and lost the same way, and a recovered
 * budget-stopped record without it reads as an ordinary failure — erasing the
 * fact that an OPERATOR POLICY stopped the run.
 */
export function recoverResultFromAggregate(
  runDir: string,
  aggregate: Record<string, unknown>,
  onWarn: (message: string) => void = () => {},
  options: { quotaNextResetAt?: string; budgetExceeded?: { spentUsd: number; capUsd: number } } = {}
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
  // Same rule for the budget stamp: the aggregate wins if it somehow carries
  // one, otherwise the log's `budget` event is the only surviving statement.
  if (options.budgetExceeded && !recovered.budgetExceeded) {
    recovered.budgetExceeded = options.budgetExceeded
  }
  return recovered
}
