/**
 * Quota-recovery planning: which killed sweeps can be resumed RIGHT NOW, and
 * which are still waiting on a provider's quota window.
 *
 * A quota lockout does not just kill a sweep, it kills the OPERATOR's attention
 * — the recovery is "wait 57 hours, then remember to relaunch with the same
 * knobs". paperclip's heartbeat solves the same problem for review runs
 * (`providerQuotaRetryNotBefore` persisted on the run, a monitor resumes the
 * paused stage once the wait elapses). This is that idea for sweeps, composed
 * out of machinery that already exists rather than reimplemented:
 *
 *   - `readSweepCheckpoints` + `planResume` (#18) decide what is PENDING in a
 *     sweep tree, under the same durable-boundary rule the resume itself uses.
 *     If the monitor and `--resume` ever disagreed about "what is left", the
 *     monitor would be lying; sharing the function makes that impossible.
 *   - `quotaLockedModels` (#7) decides what is still LOCKED, from the same
 *     `quotaNextResetAt` stamps the sweep pre-flight aborts on.
 *
 * The verdict per run is one of three:
 *
 *   `complete` — nothing pending. Prune it from the watch set.
 *   `resume`   — pairs are pending and NO pending model is locked. Go.
 *   `wait`     — at least one pending pair's model is still locked; `until` is
 *                the LATEST such window.
 *
 * WHY A SINGLE LOCKED MODEL BLOCKS THE WHOLE RUN. A resume re-runs EVERY
 * pending pair in the tree — there is no "resume only these pairs" flag, and
 * inventing one here would fork the boundary rule. So resuming a run that still
 * has a locked pending model would burn that model's pairs against a quota that
 * is provably not back yet, writing fresh 0-success aggregates over the
 * evidence. Waiting for the last window is the only honest verdict.
 *
 * Everything here is pure except `listSweepRunDirs` / the checkpoint read (the
 * filesystem is the state) and the lockfile. Spawning lives in
 * `scripts/sweep-recovery.mjs`: this module never starts a process.
 */
import { existsSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

import { quotaLockedModels, type QuotaLock } from './quota'
import {
  ResumeError,
  planResume,
  readSweepCheckpoints,
  type ResumeErrorCode,
  type ResumeRerun,
} from './resume'
import type { BenchmarkResult } from './types'

/** One sweep tree on disk: `sweeps/<runId>/`. */
export interface SweepRunDir {
  runId: string
  dir: string
}

/**
 * Every `sweeps/<run-id>/` directory, NEWEST FIRST.
 *
 * Run ids are `sweepRunId()` timestamps (`2026-08-16T09-30-12`), so a reverse
 * lexicographic sort is a reverse chronological one — no stat needed, and a
 * hand-renamed dir sorts where its name says rather than where its mtime
 * happens to fall. Non-directories are skipped: the recovery LOCKFILE and LOG
 * live in the same `sweeps/` root.
 *
 * A missing `sweeps/` is "no sweeps yet", not an error — the monitor is meant to
 * be safe to run on a cold machine (and from cron).
 */
export function listSweepRunDirs(sweepsDir: string): SweepRunDir[] {
  let entries: string[]
  try {
    entries = readdirSync(sweepsDir)
  } catch {
    return []
  }
  return entries
    .filter((name) => {
      try {
        return statSync(join(sweepsDir, name)).isDirectory()
      } catch {
        return false
      }
    })
    .sort()
    .reverse()
    .map((name) => ({ runId: name, dir: join(sweepsDir, name) }))
}

export type RecoveryVerdict = 'complete' | 'resume' | 'wait'

export interface RecoveryCandidate {
  runId: string
  dir: string
  verdict: RecoveryVerdict
  /**
   * The RESUME SHAPE: the distinct model / task ids named by the run logs'
   * headers. The child sweep is launched with exactly these, so its
   * `planResume` sees the same cross product this plan did — a resume without
   * them would silently fall back to the harness's DEFAULT model set and sweep
   * the wrong thing (at real cost).
   */
  modelIds: string[]
  taskIds: string[]
  /** Pairs a resume would run, straight from `planResume().rerun`. */
  pending: ResumeRerun[]
  /** Pairs already at their durable boundary with a success recorded. */
  completed: number
  /** Quota locks among the PENDING models only. */
  locks: QuotaLock[]
  /** Pending models with no lock — informational; they cannot run alone. */
  runnable: string[]
  /** The latest lock window; the moment the whole run becomes resumable. */
  until?: string
  /**
   * Run logs whose header would not parse AND whose filename matched no
   * derivable pair. They are invisible to `planResume` here (there is no id to
   * name), so they are counted rather than silently dropped.
   */
  unreadableLogs: number
}

export interface RecoveryUnreadable {
  runId: string
  dir: string
  code: ResumeErrorCode
  message: string
}

export interface RecoveryPlanResult {
  /** Newest first. */
  candidates: RecoveryCandidate[]
  resumable: RecoveryCandidate[]
  waiting: RecoveryCandidate[]
  /** Directories that hold no readable checkpoint at all. */
  unreadable: RecoveryUnreadable[]
  /** The EARLIEST window across waiting runs — when the monitor next acts. */
  nextResumeAt?: string
  /** True when nothing is pending anywhere: the watch loop can exit. */
  done: boolean
}

export interface RecoveryPlanInput {
  sweepDirs: readonly SweepRunDir[]
  /** results.json as loaded from disk — the source of the quota stamps. */
  results: readonly BenchmarkResult[]
  now?: Date
}

/**
 * Classify every sweep tree into `complete` / `resume` / `wait`.
 *
 * Reads each tree's run logs (the only I/O) and defers every DECISION to
 * `planResume` and `quotaLockedModels`.
 */
export function recoveryPlan({
  sweepDirs,
  results,
  now = new Date(),
}: RecoveryPlanInput): RecoveryPlanResult {
  const candidates: RecoveryCandidate[] = []
  const unreadable: RecoveryUnreadable[] = []

  for (const { runId, dir } of sweepDirs) {
    let checkpoints
    try {
      checkpoints = readSweepCheckpoints(dir)
    } catch (err) {
      if (err instanceof ResumeError) {
        unreadable.push({ runId, dir, code: err.code, message: err.message })
        continue
      }
      throw err
    }

    // The sweep's own config (which models × which tasks) is not recorded
    // anywhere durable, so the SHAPE is reconstructed from the headers: every
    // model seen × every task seen. That is what a resume of this tree would
    // cover, including pairs the sweep died before reaching (`no-checkpoint`).
    // A deliberately ragged sweep (model A on task 1, model B on task 2) is
    // therefore over-reported — documented in the runbook, and cheap: the
    // phantom pairs are ones the operator asked for in the original cross
    // product often enough that the pessimistic read is the safe one.
    const modelIds = [...new Set(checkpoints.map((c) => c.modelId).filter((id): id is string => !!id))].sort()
    const taskIds = [...new Set(checkpoints.map((c) => c.taskId).filter((id): id is string => !!id))].sort()
    const unreadableLogs = checkpoints.filter((c) => c.headerError !== undefined).length

    const plan = planResume({ checkpoints, modelIds, taskIds, recorded: results, runId })
    const pendingModels = [...new Set(plan.rerun.map((entry) => entry.modelId))]
    const locks = quotaLockedModels(results, pendingModels, now)
    const lockedIds = new Set(locks.map((lock) => lock.modelId))
    const until = locks
      .map((lock) => lock.until)
      .sort()
      .at(-1)

    candidates.push({
      runId,
      dir,
      verdict: plan.rerun.length === 0 ? 'complete' : locks.length > 0 ? 'wait' : 'resume',
      modelIds,
      taskIds,
      pending: plan.rerun,
      completed: plan.skipped.length,
      locks,
      runnable: pendingModels.filter((id) => !lockedIds.has(id)).sort(),
      until: locks.length > 0 ? until : undefined,
      unreadableLogs,
    })
  }

  const resumable = candidates.filter((c) => c.verdict === 'resume')
  const waiting = candidates.filter((c) => c.verdict === 'wait')
  return {
    candidates,
    resumable,
    waiting,
    unreadable,
    nextResumeAt: waiting
      .map((c) => c.until!)
      .sort()
      .at(0),
    done: resumable.length === 0 && waiting.length === 0,
  }
}

export class RecoveryLockError extends Error {
  readonly code = 'RECOVERY_LOCK_HELD' as const
  readonly holderPid: number
  constructor(holderPid: number, path: string) {
    super(
      `RECOVERY_LOCK_HELD: ${path} is held by pid ${holderPid}, which is still running — another recovery monitor is active. Stop it, or delete the file if you know it is dead.`
    )
    this.name = 'RecoveryLockError'
    this.holderPid = holderPid
  }
}

export interface RecoveryLock {
  path: string
  pid: number
  /** Delete the file, but only while it still names US. Idempotent. */
  release(): void
}

export interface AcquireLockOptions {
  pid?: number
  /** Liveness probe; the default is a real signal-0 `process.kill`. */
  isAlive?: (pid: number) => boolean
}

/** Signal 0: "does this pid exist and may I signal it?" — no signal delivered. */
function pidIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    // EPERM = the process exists but belongs to someone else. That is ALIVE,
    // and treating it as stale is how two monitors end up resuming the same
    // sweep into the same tree.
    return (err as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Take the recovery lock, or refuse.
 *
 * WHY. The monitor's whole job is spawning a paid sweep. Two monitors (a watch
 * loop plus a cron tick that overlapped it, the usual way this goes wrong) would
 * both see the same `resume` verdict and both spawn — two sweeps writing into
 * ONE `sweeps/<run-id>/` tree, where `openRunLog` truncates on reopen, i.e. the
 * second one destroys the first one's evidence while both pay.
 *
 * A pid file rather than a flock: it survives a `kill -9` (the file stays, the
 * pid does not), and STALE-PID DETECTION is what makes that safe — a crashed
 * monitor must not lock the machine out of recovery until someone notices a
 * stray file. `isAlive` is injected so the refusal path is testable without
 * spawning anything.
 *
 * HONEST LIMITATION: this sees other MONITORS, not sweeps. A sweep started by
 * hand in another terminal is invisible here, and the monitor may resume the
 * very tree that sweep is writing into. Do not run both.
 */
export function acquireRecoveryLock(path: string, options: AcquireLockOptions = {}): RecoveryLock {
  const pid = options.pid ?? process.pid
  const isAlive = options.isAlive ?? pidIsAlive
  const write = () => {
    writeFileSync(path, `${pid}\n`)
    return {
      path,
      pid,
      release() {
        // Only ours: a lock we already released and someone else re-took must
        // survive a second release() (a `finally` that runs twice, a signal
        // handler racing the normal exit).
        try {
          if (existsSync(path) && readHolder(path) === pid) unlinkSync(path)
        } catch {
          // Already gone / unreadable — releasing is best-effort by design.
        }
      },
    }
  }

  const holder = readHolder(path)
  if (holder === undefined) return write() // absent, empty, or not a pid
  if (holder !== pid && isAlive(holder)) throw new RecoveryLockError(holder, path)
  // Stale (the holder is gone) or already ours — take it over and restamp.
  return write()
}

function readHolder(path: string): number | undefined {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return undefined
  }
  const pid = Number(text.trim())
  return Number.isInteger(pid) && pid > 0 ? pid : undefined
}
