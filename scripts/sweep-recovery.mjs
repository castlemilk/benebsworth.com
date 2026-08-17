// Quota-recovery monitor: resume killed sweeps once their quota window elapses.
//
//   npx tsx scripts/sweep-recovery.mjs [--go] [--watch [--interval <min>]] [--run <id>]
//
//   (no flags)        one-shot: print the plan for every sweep tree, run nothing
//   --go              actually resume every `resume`-verdict run, newest first,
//                     ONE AT A TIME, stopping at the first failure
//   --watch           poll until every candidate is `complete` (or a resume
//                     fails) — the "start it and walk away" mode
//   --interval <min>  poll interval for --watch (default 15)
//   --run <id>        restrict to one sweep run id
//
// SWEEPS_DIR and RESULTS_OUT_PATH override the sweep root and results.json,
// exactly as `scripts/run-benchmark.mjs` reads them (and they are passed
// through to the child sweep, so a monitor pointed at a fixture stays there).
//
// WHAT IT DOES. For every `sweeps/<run-id>/`, it asks the resume machinery what
// is still pending (`readSweepCheckpoints` + `planResume`, same durable
// boundary as `--resume`) and the quota machinery what is still locked
// (`quotaLockedModels` over results.json's `quotaNextResetAt` stamps).
// Verdicts: `complete` (prune), `resume` (go), `wait` (some pending model is
// locked until T). See lib/lab/llm-benchmark/recovery.ts for why ONE locked
// pending model makes the whole run wait.
//
// WHAT IT SPENDS. Nothing by itself. With `--go` it spawns the real sweep, which
// spends real money — the same money the original sweep was going to spend on
// those pairs before it was killed. The child re-runs its OWN pre-flight (quota
// lock, CLI presence, config dump), so a lock this monitor missed still aborts
// before a call.
//
// THE CHILD'S SHAPE. The resume is launched with `--model`/`--task` (and
// `--plugins`, when the headers recorded a scope) derived from the tree's
// run-log headers, NOT bare `--resume`: the harness would otherwise fall back
// to its default model set and its full plugin roster and sweep something the
// operator never asked for. Same ids in, same `planResume` cross product out —
// the monitor's plan and the child's plan are the same plan. The child's quota
// pre-flight scopes to models with PENDING pairs, matching this plan's own lock
// scope, so a `resume` verdict cannot become an abort in the child.
//
// RUNAWAY BRAKE (--watch --go). A run that keeps failing for a NON-quota reason
// exits its child zero and stays pending, so a naive watch would respawn it
// every interval forever. Per run id, this monitor remembers its attempt count
// and whether the last spawn increased the tree's completed count; `shouldRespawn`
// (recovery.ts) stops a run that made no progress, and caps every run at
// MAX_RESUME_ATTEMPTS spawns per session. A stopped run prints as `stalled` and
// is skipped for the rest of the session; restart the monitor to clear it. The
// one-shot `--go` path needs no such memory: it spawns each ready run once and
// exits, by construction.
//
// LIMITATION (read this). The lockfile (`sweeps/.recovery.lock`) stops two
// MONITORS from racing. It cannot see a sweep you started by hand: that sweep
// holds no lock, and the monitor would happily resume the tree it is writing
// into (`openRunLog` truncates on reopen — you would lose its evidence). Do not
// run the monitor while a hand-started sweep is live.
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BENCHMARK_RESULTS } from '../lib/lab/llm-benchmark/results.ts'
import { formatQuotaWindow } from '../lib/lab/llm-benchmark/quota.ts'
import {
  MAX_RESUME_ATTEMPTS,
  RecoveryLockError,
  acquireRecoveryLock,
  listSweepRunDirs,
  recoveryPlan,
  shouldRespawn,
} from '../lib/lab/llm-benchmark/recovery.ts'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SWEEPS_DIR = resolve(REPO_ROOT, process.env.SWEEPS_DIR ?? 'sweeps')
const RESULTS_PATH = resolve(REPO_ROOT, process.env.RESULTS_OUT_PATH ?? 'lib/lab/llm-benchmark/results.json')
const LOCK_PATH = join(SWEEPS_DIR, '.recovery.lock')
const LOG_PATH = join(SWEEPS_DIR, 'recovery.log')
const DEFAULT_INTERVAL_MIN = 15

/** Repo-relative when it IS inside the repo; absolute otherwise (SWEEPS_DIR
 *  can point at a fixture in /tmp, where `../../../..` helps nobody). */
function display(path) {
  const rel = relative(REPO_ROOT, path)
  return rel.startsWith('..') ? path : rel
}

function parseArgs(argv) {
  const options = { go: false, watch: false, intervalMin: DEFAULT_INTERVAL_MIN, runId: undefined }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--go') options.go = true
    else if (arg === '--watch') options.watch = true
    else if (arg === '--interval') options.intervalMin = Number(argv[++i])
    else if (arg === '--run') options.runId = argv[++i]
    else {
      console.error(`Unknown argument: ${arg}`)
      console.error('Usage: npx tsx scripts/sweep-recovery.mjs [--go] [--watch [--interval <min>]] [--run <id>]')
      process.exit(1)
    }
  }
  if (!Number.isFinite(options.intervalMin) || options.intervalMin <= 0) {
    console.error('--interval must be a positive number of minutes')
    process.exit(1)
  }
  if (options.runId !== undefined && (options.runId === '' || options.runId.includes('/'))) {
    console.error('--run takes a single sweep run id (a directory name under sweeps/)')
    process.exit(1)
  }
  return options
}

const options = parseArgs(process.argv.slice(2))

/**
 * Every line goes to stdout AND to `sweeps/recovery.log`, timestamped.
 *
 * A monitor's whole value is what it decided while nobody was watching, and a
 * `--watch` run in a closed terminal leaves no transcript otherwise. The log is
 * inside `sweeps/`, which is gitignored, so it never reaches a commit.
 */
function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`
  console.log(line)
  try {
    if (existsSync(SWEEPS_DIR)) appendFileSync(LOG_PATH, `${line}\n`)
  } catch {
    // A monitor that cannot write its log still has a job to do.
  }
}

/** results.json as it is RIGHT NOW — a resume rewrites it mid-watch. */
function readResults() {
  try {
    return JSON.parse(readFileSync(RESULTS_PATH, 'utf8'))
  } catch {
    return BENCHMARK_RESULTS
  }
}

function sweepDirs() {
  const all = listSweepRunDirs(SWEEPS_DIR)
  return options.runId ? all.filter((entry) => entry.runId === options.runId) : all
}

function describe(candidate, now) {
  const shape = `${candidate.modelIds.length} model(s) x ${candidate.taskIds.length} task(s)`
  const counts = `${candidate.completed} complete, ${candidate.pending.length} pending`
  const extra = candidate.unreadableLogs > 0 ? `, ${candidate.unreadableLogs} unreadable log(s)` : ''
  if (candidate.verdict === 'complete') return `complete — ${shape}, ${counts}${extra}`
  const blocked = sessions.get(candidate.runId)?.blocked
  if (blocked) {
    // NOT a fourth verdict from `recoveryPlan` — the plan is stateless and still
    // says `resume`/`wait`. `stalled` is this MONITOR SESSION's judgement about
    // a run it has already paid for without moving.
    return `stalled — ${shape}, ${counts}${extra}; ${blocked} after ${sessions.get(candidate.runId).attempts} attempt(s) — not resuming again this session`
  }
  if (candidate.verdict === 'resume') {
    return `resume  — ${shape}, ${counts}${extra}; models ready: ${candidate.runnable.join(', ')}`
  }
  const remaining = formatQuotaWindow(Date.parse(candidate.until) - now)
  const locked = candidate.locks.map((lock) => `${lock.modelId} until ${lock.until}`).join('; ')
  return `wait    — ${shape}, ${counts}${extra}; locked: ${locked} (~${remaining} from now)`
}

/** Print one pass and hand back the plan the caller may act on. */
function report(plan, now) {
  const dirs = plan.candidates.length + plan.unreadable.length
  log(`scanned ${dirs} sweep tree(s) in ${display(SWEEPS_DIR)}/`)
  for (const candidate of plan.candidates) log(`  ${candidate.runId}  ${describe(candidate, now)}`)
  for (const entry of plan.unreadable) log(`  ${entry.runId}  skipped — ${entry.code}: ${entry.message}`)
  if (plan.nextResumeAt) {
    log(`next quota window elapses ${plan.nextResumeAt} (~${formatQuotaWindow(Date.parse(plan.nextResumeAt) - now)} from now)`)
  }
  return plan
}

/**
 * Spawn one `--resume` sweep and wait for it, inheriting stdio.
 *
 * Inherited stdio on purpose: the child's config dump, resume decisions and
 * per-pair lines ARE the monitor's transcript for that run — buffering them to
 * summarise afterwards would hide a sweep in progress behind a spinner.
 */
function runResume(candidate) {
  const tsx = join(REPO_ROOT, 'node_modules/.bin/tsx')
  const [command, prefix] = existsSync(tsx) ? [tsx, []] : ['npx', ['tsx']]
  const args = [
    ...prefix,
    'scripts/run-benchmark.mjs',
    '--resume',
    candidate.runId,
    '--model',
    candidate.modelIds.join(','),
    '--task',
    candidate.taskIds.join(','),
  ]
  // The PLUGIN SCOPE is part of the shape too: the child resolves its task set
  // (and its model set — a plugin can contribute providers) under whatever
  // `--plugins` says, so a resume that mounted everything would run a sweep the
  // original never was. Headers that recorded a scope are replayed verbatim
  // (`[]` = builtins only = `--plugins none`); headers that recorded NOTHING
  // (logs older than the knob) get no flag at all, so the child defaults to
  // every plugin exactly as it did before this passthrough existed.
  if (candidate.plugins) {
    args.push('--plugins', candidate.plugins.length === 0 ? 'none' : candidate.plugins.join(','))
    if (candidate.pluginsMixed) {
      log(
        `WARNING ${candidate.runId}: run-log headers disagree about the plugin scope — resuming under their UNION (${candidate.plugins.join(', ') || 'none'}). Check the tree before trusting this shape.`
      )
    }
  }
  log(`resuming ${candidate.runId}: ${command === 'npx' ? 'npx ' : ''}tsx ${args.slice(prefix.length).join(' ')}`)
  return new Promise((resolveExit) => {
    const child = spawn(command, args, { cwd: REPO_ROOT, stdio: 'inherit' })
    child.on('error', (err) => {
      log(`resume ${candidate.runId} could not be started: ${err.message}`)
      resolveExit(1)
    })
    child.on('close', (code, signal) => {
      log(`resume ${candidate.runId} exited ${signal ? `on ${signal}` : `with code ${code}`}`)
      resolveExit(signal ? 1 : (code ?? 1))
    })
  })
}

/**
 * Cross-pass memory, runId → { attempts, blocked }.
 *
 * MODULE SCOPE, not per-pass, and that is the whole point. A non-quota
 * persistent failure exits the child ZERO (the sweep ran, it just produced
 * 0-success aggregates), so the next poll sees the same `resume` verdict and
 * spawns the same doomed sweep — forever, at real cost. The old per-pass
 * `attempted` set could not see across the sleep. `shouldRespawn` (pure, in
 * recovery.ts) turns this memory into the decision; `blocked` records WHY, for
 * the `stalled` line the report prints from then on.
 *
 * NOTHING IS PERSISTED. Restarting the monitor clears it, which is correct:
 * that is the operator saying "I have looked at it".
 *
 * The one-shot `--go` path needs no memory by construction — it spawns each
 * ready run at most once and exits — but it shares this code, and a session
 * that lives for one pass simply never reaches the second attempt.
 */
const sessions = new Map()

function session(runId) {
  let entry = sessions.get(runId)
  if (!entry) {
    entry = { attempts: 0, completedBefore: undefined, completedAfter: undefined, blocked: undefined }
    sessions.set(runId, entry)
  }
  return entry
}

/**
 * One pass: report, then (with --go) resume every ready run, newest first.
 *
 * The plan is RECOMPUTED after each child, because a finished resume changes
 * both what is pending and what is locked — and because the recomputed
 * completed count is the PROGRESS EVIDENCE `shouldRespawn` judges the spawn by.
 *
 * `attempted` still stops a run from looping inside ONE pass; `sessions` is what
 * stops it looping across passes.
 *
 * Returns { plan, failed } where `plan` is the FIRST report of the pass.
 */
async function pass() {
  const now = Date.now()
  const first = report(recoveryPlan({ sweepDirs: sweepDirs(), results: readResults(), now: new Date(now) }), now)
  if (!options.go) return { plan: first, failed: false }

  const attempted = new Set()
  let plan = first
  for (;;) {
    const next = plan.resumable.find(
      (candidate) => !attempted.has(candidate.runId) && !sessions.get(candidate.runId)?.blocked
    )
    if (!next) return { plan, failed: false }
    attempted.add(next.runId)

    const entry = session(next.runId)
    const decision = shouldRespawn(entry)
    if (!decision.respawn) {
      entry.blocked = decision.reason
      log(
        decision.reason === 'attempt-cap'
          ? `STALLED ${next.runId}: ${entry.attempts} resume attempt(s) is the cap (MAX_RESUME_ATTEMPTS=${MAX_RESUME_ATTEMPTS}) — not resuming it again this monitor session. Investigate the tree, then restart the monitor.`
          : `STALLED ${next.runId}: the last resume completed ${entry.completedAfter} pair(s), the same as before it (${entry.completedBefore}) — this run is failing for a reason a retry cannot fix. Not resuming it again this monitor session.`
      )
      continue
    }

    const completedBefore = next.completed
    entry.attempts++
    const code = await runResume(next)
    if (code !== 0) {
      log(`stopping: ${next.runId} exited nonzero — nothing else will be resumed`)
      return { plan, failed: true }
    }
    plan = recoveryPlan({ sweepDirs: sweepDirs(), results: readResults(), now: new Date() })
    const after = plan.candidates.find((candidate) => candidate.runId === next.runId)
    entry.completedBefore = completedBefore
    entry.completedAfter = after?.completed
    if (after !== undefined && after.completed <= completedBefore) {
      log(
        `NO PROGRESS ${next.runId}: resume ${entry.attempts} finished with ${after.completed} complete pair(s), unchanged from ${completedBefore}. It will not be resumed again this monitor session.`
      )
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** The held lock, at module scope so the signal handler can release it too. */
let lock

async function main() {
  if (!options.go) log('dry run — no sweep will be started (add --go to resume)')

  // The lock is only taken when the monitor can actually SPAWN. A read-only
  // plan is safe to run beside anything, including a live monitor, and refusing
  // to print a report because someone else is watching would be obnoxious.
  if (options.go) {
    try {
      lock = acquireRecoveryLock(LOCK_PATH)
    } catch (err) {
      if (err instanceof RecoveryLockError) {
        console.error(err.message)
        process.exit(1)
      }
      throw err
    }
    log(`holding ${display(LOCK_PATH)} (pid ${lock.pid})`)
  }

  try {
    for (;;) {
      const { plan, failed } = await pass()
      if (failed) {
        process.exitCode = 1
        return
      }
      if (!options.watch) return
      if (plan.done) {
        log('every sweep tree is complete — monitor exiting')
        return
      }
      // A watch whose only remaining work is STALLED will never make progress:
      // no quota window is going to elapse and unblock it, and the whole point
      // of the stall is that respawning it is not allowed. Sleeping forever
      // would look identical to working.
      const stalled = plan.resumable.filter((c) => sessions.get(c.runId)?.blocked)
      if (options.go && plan.waiting.length === 0 && stalled.length === plan.resumable.length) {
        log(
          `nothing left but ${stalled.length} stalled run(s) (${stalled.map((c) => c.runId).join(', ')}) — monitor exiting. Fix them, then restart it.`
        )
        process.exitCode = 1
        return
      }
      log(`sleeping ${options.intervalMin} minute(s)`)
      await sleep(options.intervalMin * 60_000)
    }
  } finally {
    lock?.release()
  }
}

// A Ctrl-C during --watch must not leave the lockfile behind: the next monitor
// would find a pid that is gone and take over anyway (stale detection), but an
// operator reading `sweeps/` should not have to know that. `process.exit` skips
// the `finally`, so the release happens HERE as well.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    log(`received ${signal} — exiting`)
    lock?.release()
    process.exit(130)
  })
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  (err) => {
    console.error(err)
    process.exit(1)
  }
)
