/**
 * Post-sweep invariant verification for results.json + the run logs.
 *
 * The published leaderboard is a derived artifact: `aggregateRuns`
 * (`runners/provider.ts`) folds N iterations into one record, a backfill script
 * or a hand-merge can touch it later, and a killed sweep can leave it
 * half-written. Nothing in the type system says the aggregate still agrees with
 * the per-iteration data it was computed from — so this module says it, as a
 * runnable checksuite (dsh's `packages/runtime-diagnostics/invariants`).
 *
 * dsh discipline, carried over deliberately: **a check exists only when it
 * names an observable relationship this repo owns and a bug it would have
 * caught.** That reason is the `why` field, and the report prints it on
 * failure — a check nobody can justify is a synthetic check, and synthetic
 * checks get muted rather than fixed.
 *
 * Everything here is pure. The filesystem-dependent checks take an injected
 * list of found run logs plus a reader, so they are unit-testable without a
 * real `sweeps/` tree; `scripts/verify-results.mjs` is the shell that scans the
 * disk and prints the report.
 */
import { promptBundleHash } from './prompt-bundle'
import { BENCHMARK_MODELS, BENCHMARK_TASKS } from './registry'
import type { RunLogEvent, RunLogHeader } from './runlog'
import type { BenchmarkFailureReason, BenchmarkResult } from './types'

export type VerdictLevel = 'pass' | 'warn' | 'fail' | 'skip'

/** One check's outcome for one record (or one run log). */
export interface Verdict {
  /** Check id, from RESULT_CHECKS. */
  check: string
  level: VerdictLevel
  /** `<modelId>|<taskId>`, or the run-log file for log-scoped verdicts. */
  recordKey?: string
  detail?: string
  /** Why this check exists — printed on failure. */
  why?: string
}

export interface CheckDef {
  id: string
  title: string
  /** The bug — shipped or plausible — this check would have caught. */
  why: string
}

export const RESULT_CHECKS: CheckDef[] = [
  {
    id: 'score-mean',
    title: 'score is the aggregation of iterationScores',
    why:
      "The published score is the ONLY number most readers see, and it is derived: aggregateRuns takes Math.round(Math.min(100, Math.max(1, mean(iterationScores))) * 10) / 10 over the SUCCESSFUL iterations. A deepseek record once carried a score that no longer matched the per-iteration scores beside it (a rescore that wrote one field and not the other), which is a silently wrong leaderboard — the sort of drift no typecheck and no unit test on live data can see.",
  },
  {
    id: 'index-alignment',
    title: 'iterationCheckResults is index-aligned with iterationScores',
    why:
      "The UI shows 'iteration 3 scored 30 because check X tripped' by reading iterationScores[i] and iterationCheckResults[i] as the same iteration. If the arrays are different lengths that pairing is a lie — the pills would attribute one iteration's failures to another iteration's score, which is worse than showing nothing.",
  },
  {
    id: 'iteration-counts',
    title: 'succeeded <= ran, and one score per successful iteration',
    why:
      "iterationsSucceeded is what analytics divides by and what mergeResults' never-clobber-good-data protection keys on. A count that exceeds `iterations`, or a scores array shorter than the successes it claims, means iterations were dropped or double-counted somewhere in the retry/empty-body recovery path — the same class of bug as the '22-token iteration' that counted as a success while producing nothing usable.",
  },
  {
    id: 'status-consistency',
    title: 'status agrees with the success count',
    why:
      "status drives the board (a 'success' row is presented as a clean run). aggregateRuns derives it from the same counts, so a disagreement means the record was written by something other than aggregateRuns — a hand edit, a bad merge, or the mid-sweep results.json race where a partially written record is read back as complete.",
  },
  {
    id: 'registry-resolution',
    title: 'taskId and modelId resolve in the registry',
    why:
      'A record whose ids no longer resolve is invisible: pages filter by registry id, so renaming a model or task orphans its history and the board silently loses rows rather than erroring. registry.test.ts checks this statically; this makes it runnable against whatever results.json is about to be pushed.',
  },
  {
    id: 'failure-reason',
    title: 'failureReason is in the taxonomy and consistent with status',
    why:
      "The whole point of BenchmarkFailureReason is separating model capability from infrastructure reliability — a rate-limit storm must not read as a model scoring 40. A 'success' record carrying a real reason, or a reason outside the union (a typo'd string from a backfill script), corrupts exactly that distinction.",
  },
  {
    id: 'runlog-ref',
    title: 'every record with a run log points at it, and the log agrees',
    why:
      "'Model-visible means logged' (#1): a published number with no retained trace cannot be defended a week later. If a sweep wrote sweeps/<run>/<model>-<task>.jsonl but the record has no runLogRef, the stamping path broke and the provenance is gone. In the other direction, a ref whose log names a different model/task, or that never recorded an aggregate, is a trace that does not describe this record. One carve-out: a record OLDER than the log beside it was kept by mergeResults' never-clobber-good-data protection over a 0-success run, so it is legitimately ref-less and skips rather than fails.",
  },
  {
    id: 'telemetry-sanity',
    title: 'telemetry means are measurements, not placeholder zeros',
    why:
      "telemetry's contract is that a MEASUREMENT is absent when unmeasured while a COUNTER is 0 — because a 0ms TTFT is physically impossible and a 0 tok/s decode rate is an infinitely slow model. A producer that 'helpfully' defaults meanTtftMs to 0 (the natural mistake when copying dsh's counter rule onto a latency) would publish an impossible number that reads as the FASTEST model on the board. Likewise a meanTokensPerSec with no rateKind is unreadable: decode rates and wall-clock fallbacks differ by the whole queue time and must never be compared silently.",
  },
  {
    id: 'stale-prompt',
    title: 'the record was scored under the CURRENT prompt bundle',
    why:
      "A score only means something under the prompt that produced it: the task prompt, the sandbox contract appended to it, and the frame prelude the artifact runs inside. tic-tac-toe's stored results were scored under the OLD global contract, and when its task-specific contract landed (#36) nothing marked them stale — the board kept presenting them as current. This check is the release gate for that: WARN, never fail, because a stale result is still an honest result (it is just old) and failing would make an intentional prompt edit break the build before the re-run could possibly exist. `--strict` promotes warnings to failures — THAT is the release-gate switch: run it when you are about to publish and a stale number would be a lie. Records with no promptBundle at all are legacy, not stale, and skip.",
  },
  {
    id: 'usage-sanity',
    title: 'usage agrees with the flat token fields it duplicates',
    why:
      "BenchmarkResult carries token counts TWICE — the legacy flat tokensIn/tokensOut every consumer reads, and the richer `usage` summary that costUsd is actually computed from. aggregateRuns derives both from one summarizeUsage() call, so they cannot disagree unless a record was written by something else (a backfill, a hand edit, a future producer that sets one and forgets the other) — and a disagreement means the published cost was priced off numbers that are not the ones displayed beside it. Also pins `usage.source` to the vocabulary: a stray string there would make the honesty field unreadable. Records with no `usage` are legacy and skip.",
  },
  {
    id: 'budget-sanity',
    title: 'a budgetExceeded stamp describes a trip that could have happened',
    why:
      "`budgetExceeded` (#28) is the record's explanation for an otherwise alarming shape: iterations stopped early with NO failed iteration to blame. If the stamp itself is incoherent — spend below its own cap, a cap of 0 or NaN, a record claiming a budget trip while reporting $0 of its own spend, or a record whose cost exceeds the sweep total it was measured against — then the explanation is worse than none, because a reader will conclude the harness silently dropped iterations. It is a cheap consistency check by design: the ONLY authority on real spend is the run log's per-response costs, and this check does not re-price them.",
  },
  {
    id: 'runlog-seq',
    title: 'run-log seq is strictly increasing (gaps are evidence, not corruption)',
    why:
      "seq is writer-owned and contiguous on the healthy path. A GAP is deliberate forensic evidence that a failed batch was rolled back and dropped (runlog.ts contract) — a warning, never a failure. A DUPLICATE or a decrease is different: it means two writers shared one file or the append-only contract was violated, and the log can no longer be trusted as a replay of what happened.",
  },
]

const CHECK_BY_ID = new Map(RESULT_CHECKS.map((c) => [c.id, c]))

/**
 * Exhaustive over the union by construction — adding a BenchmarkFailureReason
 * without adding it here is a compile error, so this check can never silently
 * reject a newly-introduced reason.
 */
const FAILURE_REASONS: Record<BenchmarkFailureReason, true> = {
  none: true,
  rate_limited: true,
  quota_exhausted: true,
  endpoint_hung: true,
  cli_timeout: true,
  truncated: true,
  empty_body: true,
  auth_error: true,
  invalid_request: true,
  model_error: true,
}

/** A run-log file found on disk (`sweeps/<runId>/<file>`). */
export interface FoundRunLog {
  runId: string
  file: string
  /** Absolute or cwd-relative path passed to the reader. */
  path: string
}

export interface VerifyOptions {
  /** Run logs discovered under sweeps/. Omit to skip the log-backed checks. */
  runLogs?: FoundRunLog[]
  /** Reader for those logs — `readRunLog` in production, a stub in tests. */
  readLog?: (path: string) => { header: RunLogHeader; events: RunLogEvent[] }
  /** Registry override (tests); defaults to BENCHMARK_TASKS/BENCHMARK_MODELS. */
  knownTaskIds?: Iterable<string>
  knownModelIds?: Iterable<string>
  /**
   * The CURRENT prompt bundle for a task id — `undefined` for an unknown task.
   * Defaults to `promptBundleHash` over the registry; injected in tests so the
   * stale-prompt cases don't have to forge a real prompt edit.
   */
  currentPromptBundle?: (taskId: string) => string | undefined
}

export function recordKey(r: Pick<BenchmarkResult, 'modelId' | 'taskId'>): string {
  return `${r.modelId}|${r.taskId}`
}

function verdict(check: string, level: VerdictLevel, recordKey?: string, detail?: string): Verdict {
  const def = CHECK_BY_ID.get(check)
  // The WHY rides along on anything a reader has to act on.
  return level === 'fail' || level === 'warn'
    ? { check, level, recordKey, detail, why: def?.why }
    : { check, level, recordKey, detail }
}

/** The exact aggregation from `aggregateRuns` (runners/provider.ts). */
export function expectedScore(iterationScores: number[]): number {
  if (iterationScores.length === 0) return 0
  const mean = iterationScores.reduce((sum, s) => sum + s, 0) / iterationScores.length
  return Math.round(Math.min(100, Math.max(1, mean)) * 10) / 10
}

/**
 * How many iterations a record claims succeeded. Absent `iterationsSucceeded`
 * means "all of them" on older records (see the field's doc comment in
 * types.ts) — but only when the record also claims success; a legacy non-success
 * record simply does not say, and the counting checks skip it.
 */
function succeeded(r: BenchmarkResult): number | undefined {
  if (r.iterationsSucceeded !== undefined) return r.iterationsSucceeded
  return r.status === 'success' ? r.iterations : undefined
}

function checkScoreMean(r: BenchmarkResult): Verdict {
  const key = recordKey(r)
  if (!r.iterationScores) {
    return verdict('score-mean', 'skip', key, 'no iterationScores (record predates the field)')
  }
  const expected = expectedScore(r.iterationScores)
  if (Math.abs(expected - r.score) > 1e-9) {
    return verdict(
      'score-mean',
      'fail',
      key,
      `score ${r.score} but round(clamp(mean([${r.iterationScores.join(', ')}]))) = ${expected}`
    )
  }
  return verdict('score-mean', 'pass', key)
}

function checkIndexAlignment(r: BenchmarkResult): Verdict {
  const key = recordKey(r)
  const scores = r.iterationScores
  const checks = r.iterationCheckResults
  if (!scores || !checks) return verdict('index-alignment', 'skip', key, 'one of the arrays is absent')
  if (checks.length === scores.length) return verdict('index-alignment', 'pass', key)
  if (checks.length === 1 && scores.length > 1) {
    // Documented shape, not a defect: scripts/backfill-iteration-checks.mjs
    // re-scored the ONE published artifact on records written before the
    // runner captured per-iteration checks, and stored a single breakdown.
    return verdict(
      'index-alignment',
      'skip',
      key,
      `1 breakdown for ${scores.length} scores — the single-artifact backfill shape (scripts/backfill-iteration-checks.mjs)`
    )
  }
  return verdict(
    'index-alignment',
    'fail',
    key,
    `${scores.length} iterationScores vs ${checks.length} iterationCheckResults`
  )
}

function checkIterationCounts(r: BenchmarkResult): Verdict {
  const key = recordKey(r)
  const ok = succeeded(r)
  if (ok === undefined) {
    return verdict('iteration-counts', 'skip', key, 'no iterationsSucceeded (record predates the field)')
  }
  if (ok > r.iterations) {
    return verdict('iteration-counts', 'fail', key, `${ok} succeeded of ${r.iterations} run`)
  }
  if (r.iterationScores && r.iterationScores.length !== ok) {
    return verdict(
      'iteration-counts',
      'fail',
      key,
      `${r.iterationScores.length} iterationScores for ${ok} successful iteration(s)`
    )
  }
  return verdict('iteration-counts', 'pass', key)
}

function checkStatusConsistency(r: BenchmarkResult): Verdict {
  const key = recordKey(r)
  const ok = succeeded(r)
  if (ok === undefined) {
    return verdict('status-consistency', 'skip', key, 'no iterationsSucceeded (record predates the field)')
  }
  const expected =
    r.iterations > 0 && ok === r.iterations ? 'success' : ok > 0 ? 'partial' : 'fail-or-timeout'
  const actual = r.status === 'fail' || r.status === 'timeout' ? 'fail-or-timeout' : r.status
  if (actual !== expected) {
    return verdict(
      'status-consistency',
      'fail',
      key,
      `status '${r.status}' with ${ok}/${r.iterations} succeeded (expected ${expected})`
    )
  }
  return verdict('status-consistency', 'pass', key)
}

function checkRegistry(r: BenchmarkResult, tasks: Set<string>, models: Set<string>): Verdict {
  const key = recordKey(r)
  const missing: string[] = []
  if (!tasks.has(r.taskId)) missing.push(`taskId '${r.taskId}'`)
  if (!models.has(r.modelId)) missing.push(`modelId '${r.modelId}'`)
  if (missing.length > 0) {
    return verdict('registry-resolution', 'fail', key, `${missing.join(' and ')} not in the registry`)
  }
  return verdict('registry-resolution', 'pass', key)
}

function checkFailureReason(r: BenchmarkResult): Verdict {
  const key = recordKey(r)
  const reason = r.failureReason
  if (reason !== undefined && !(reason in FAILURE_REASONS)) {
    return verdict('failure-reason', 'fail', key, `failureReason '${reason}' is not in the taxonomy`)
  }
  if (r.status === 'success' && reason !== undefined && reason !== 'none') {
    return verdict('failure-reason', 'fail', key, `status 'success' with failureReason '${reason}'`)
  }
  return verdict('failure-reason', 'pass', key)
}

function checkTelemetry(r: BenchmarkResult): Verdict {
  const key = recordKey(r)
  const t = r.telemetry
  if (!t) return verdict('telemetry-sanity', 'skip', key, 'no telemetry (record predates the field)')
  if (t.meanTtftMs !== undefined && !(t.meanTtftMs > 0)) {
    return verdict('telemetry-sanity', 'fail', key, `meanTtftMs ${t.meanTtftMs} — present but not a positive latency`)
  }
  if (t.meanTokensPerSec !== undefined && !(t.meanTokensPerSec > 0)) {
    return verdict('telemetry-sanity', 'fail', key, `meanTokensPerSec ${t.meanTokensPerSec} — present but not a positive rate`)
  }
  if ((t.meanTokensPerSec !== undefined) !== (t.rateKind !== undefined)) {
    return verdict(
      'telemetry-sanity',
      'fail',
      key,
      `meanTokensPerSec ${t.meanTokensPerSec ?? '(absent)'} with rateKind ${t.rateKind ?? '(absent)'} — a rate without its kind, or a kind without its rate`
    )
  }
  return verdict('telemetry-sanity', 'pass', key)
}

const USAGE_SOURCES = new Set(['reported', 'estimated', 'mixed'])

function checkUsage(r: BenchmarkResult): Verdict {
  const key = recordKey(r)
  const u = r.usage
  if (!u) return verdict('usage-sanity', 'skip', key, 'no usage summary (record predates the field)')
  if (!USAGE_SOURCES.has(u.source)) {
    return verdict('usage-sanity', 'fail', key, `usage.source '${u.source}' is not reported/estimated/mixed`)
  }
  if (u.inputTokens !== r.tokensIn || u.outputTokens !== r.tokensOut) {
    return verdict(
      'usage-sanity',
      'fail',
      key,
      `usage ${u.inputTokens}/${u.outputTokens} vs tokensIn/tokensOut ${r.tokensIn}/${r.tokensOut}`
    )
  }
  return verdict('usage-sanity', 'pass', key)
}

/**
 * Cheap coherence for the budget stamp. Deliberately NOT a re-pricing: spend
 * is authoritative in the run log's per-response `costUsd` events, and a
 * verifier that re-derived dollars here would just be a second, drifting
 * implementation of `costFromUsage`.
 */
function checkBudget(r: BenchmarkResult): Verdict {
  const key = recordKey(r)
  const budget = r.budgetExceeded
  if (!budget) return verdict('budget-sanity', 'skip', key, 'no budget cap was reached on this record')
  const { spentUsd, capUsd } = budget
  if (!Number.isFinite(capUsd) || capUsd <= 0) {
    return verdict('budget-sanity', 'fail', key, `capUsd ${capUsd} is not a positive number of dollars`)
  }
  if (!Number.isFinite(spentUsd) || spentUsd < capUsd) {
    return verdict(
      'budget-sanity',
      'fail',
      key,
      `spentUsd ${spentUsd} never reached capUsd ${capUsd} — this trip cannot have happened`
    )
  }
  // The record that carries the stamp is the one that was in flight when the
  // cap tripped, so it spent something; and its own cost is one contribution
  // to the model's sweep total, so it cannot exceed it.
  if (!(r.costUsd > 0)) {
    return verdict('budget-sanity', 'fail', key, `costUsd ${r.costUsd} — a budget trip on a record that spent nothing`)
  }
  if (r.costUsd > spentUsd + 1e-9) {
    return verdict(
      'budget-sanity',
      'fail',
      key,
      `costUsd ${r.costUsd} exceeds the model's sweep spend ${spentUsd} it was measured against`
    )
  }
  return verdict('budget-sanity', 'pass', key)
}

function checkStalePrompt(
  r: BenchmarkResult,
  currentBundle: (taskId: string) => string | undefined
): Verdict {
  const key = recordKey(r)
  if (r.promptBundle === undefined) {
    // Legacy, not stale. 183 identical warnings would train the reader to
    // ignore the whole report; the summary line carries the one honest count.
    return verdict('stale-prompt', 'skip', key, 'pre-bundle (record predates promptBundle)')
  }
  const current = currentBundle(r.taskId)
  if (current === undefined) {
    // No task to compare against — registry-resolution already fails this record.
    return verdict('stale-prompt', 'skip', key, `task '${r.taskId}' is not in the registry`)
  }
  if (current !== r.promptBundle) {
    return verdict(
      'stale-prompt',
      'warn',
      key,
      `scored under bundle ${r.promptBundle} (current ${current})`
    )
  }
  return verdict('stale-prompt', 'pass', key)
}

type ParsedLog = { header: RunLogHeader; events: RunLogEvent[] }

function checkSeq(log: FoundRunLog, parsed: ParsedLog): Verdict {
  const key = `${log.runId}/${log.file}`
  let previous: number = parsed.header.seq ?? 0
  const gaps: string[] = []
  for (const event of parsed.events) {
    const seq = event.seq
    if (typeof seq !== 'number') {
      return verdict('runlog-seq', 'fail', key, `a ${event.type} event has no numeric seq`)
    }
    if (seq <= previous) {
      return verdict(
        'runlog-seq',
        'fail',
        key,
        `seq ${seq} follows ${previous} — duplicate or non-monotonic, the append-only contract is broken`
      )
    }
    if (seq > previous + 1) gaps.push(`${previous}->${seq}`)
    previous = seq
  }
  if (gaps.length > 0) {
    return verdict(
      'runlog-seq',
      'warn',
      key,
      `seq gap(s) ${gaps.join(', ')} — evidence a batch was rolled back and dropped, not corruption`
    )
  }
  return verdict('runlog-seq', 'pass', key)
}

export function verifyResults(results: BenchmarkResult[], opts: VerifyOptions = {}): Verdict[] {
  const tasks = new Set(opts.knownTaskIds ?? BENCHMARK_TASKS.map((t) => t.id))
  const models = new Set(opts.knownModelIds ?? BENCHMARK_MODELS.map((m) => m.id))
  const verdicts: Verdict[] = []

  // Hash each task's current bundle at most once — the same task repeats across
  // every model's record.
  const bundleCache = new Map<string, string | undefined>()
  const currentPromptBundle =
    opts.currentPromptBundle ??
    ((taskId: string): string | undefined => {
      if (!bundleCache.has(taskId)) {
        const task = BENCHMARK_TASKS.find((t) => t.id === taskId)
        bundleCache.set(taskId, task ? promptBundleHash(task) : undefined)
      }
      return bundleCache.get(taskId)
    })

  for (const r of results) {
    verdicts.push(checkScoreMean(r))
    verdicts.push(checkIndexAlignment(r))
    verdicts.push(checkIterationCounts(r))
    verdicts.push(checkStatusConsistency(r))
    verdicts.push(checkRegistry(r, tasks, models))
    verdicts.push(checkFailureReason(r))
    verdicts.push(checkTelemetry(r))
    verdicts.push(checkUsage(r))
    verdicts.push(checkBudget(r))
    verdicts.push(checkStalePrompt(r, currentPromptBundle))
  }

  const runLogs = opts.runLogs ?? []
  const readLog = opts.readLog

  // Parse each log at most once: both directions of runlog-ref and the seq
  // check read the same file.
  const parsed = new Map<string, ParsedLog>()
  for (const log of runLogs) {
    if (!readLog) break
    try {
      parsed.set(`${log.runId}/${log.file}`, readLog(log.path))
    } catch (err) {
      // An unreadable log is a logging failure, not a results failure — the
      // sweep it describes may have been killed mid-batch.
      verdicts.push(
        verdict(
          'runlog-ref',
          'warn',
          `${log.runId}/${log.file}`,
          `could not read the run log: ${err instanceof Error ? err.message : String(err)}`
        )
      )
    }
  }

  const byPair = new Map(results.map((r) => [recordKey(r), r]))

  // Direction A — no record without a trace: a log on disk means the record it
  // produced must point back at it.
  for (const log of runLogs) {
    const logKey = `${log.runId}/${log.file}`
    const entry = parsed.get(logKey)
    if (!entry) continue
    const record = byPair.get(`${entry.header.modelId}|${entry.header.taskId}`)
    if (!record) {
      verdicts.push(verdict('runlog-ref', 'skip', logKey, 'no results.json record for this model/task'))
      continue
    }
    if (record.source === 'seeded') {
      verdicts.push(verdict('runlog-ref', 'skip', logKey, 'seeded record — exempt, it never had a run'))
      continue
    }
    if (!record.runLogRef) {
      // A record that PREDATES this log was not produced by it. That happens on
      // exactly one healthy path: the log's run produced 0 successes (quota trip,
      // every iteration failed) and mergeResults (results.ts) deliberately kept
      // the older, good record instead — so the surviving record is legitimately
      // ref-less, and failing here would arm a permanent pre-push failure after
      // the first quota-tripped sweep against legacy records.
      //
      // REJECTED alternative: carrying `runLogRef` forward inside mergeResults'
      // protection branch. That would point a KEPT success record at the FAILED
      // run's trace — false provenance, and worse than no ref at all.
      const recordAt = Date.parse(record.createdAt)
      const logAt = Date.parse(entry.header.createdAt)
      if (Number.isFinite(recordAt) && Number.isFinite(logAt) && recordAt < logAt) {
        verdicts.push(
          verdict(
            'runlog-ref',
            'skip',
            logKey,
            `record predates this log — the log's run produced 0 successes and was merge-protected away`
          )
        )
        continue
      }
      // createdAt >= the log header: the record came from THIS run (or later) and
      // still has no ref — the stamping path genuinely broke.
      verdicts.push(
        verdict('runlog-ref', 'fail', logKey, `run log ${log.file} exists but its record carries no runLogRef`)
      )
      continue
    }
    if (record.runLogRef.runId !== log.runId) {
      verdicts.push(
        verdict(
          'runlog-ref',
          'skip',
          logKey,
          `record points at run ${record.runLogRef.runId} — this log is from an earlier sweep`
        )
      )
      continue
    }
    if (record.runLogRef.file !== log.file) {
      verdicts.push(
        verdict('runlog-ref', 'fail', logKey, `record names ${record.runLogRef.file} in the same run`)
      )
      continue
    }
    verdicts.push(verdict('runlog-ref', 'pass', logKey))
  }

  // Direction B — a ref must describe THIS record. A ref whose file is gone is
  // fine: sweeps/ is gitignored and pruned by scripts/sweep-clean.mjs.
  for (const r of results) {
    const key = recordKey(r)
    const ref = r.runLogRef
    if (!ref) {
      verdicts.push(verdict('runlog-ref', 'skip', key, 'no runLogRef on this record'))
      continue
    }
    const logKey = `${ref.runId}/${ref.file}`
    const entry = parsed.get(logKey)
    if (!entry) {
      verdicts.push(verdict('runlog-ref', 'skip', key, `${logKey} is not present locally (pruned sweep)`))
      continue
    }
    if (entry.header.modelId !== r.modelId || entry.header.taskId !== r.taskId) {
      verdicts.push(
        verdict(
          'runlog-ref',
          'fail',
          key,
          `${logKey} header names ${entry.header.modelId}/${entry.header.taskId}`
        )
      )
      continue
    }
    if (!entry.events.some((e) => e.type === 'aggregate')) {
      verdicts.push(verdict('runlog-ref', 'fail', key, `${logKey} has no aggregate event`))
      continue
    }
    verdicts.push(verdict('runlog-ref', 'pass', key))
  }

  for (const log of runLogs) {
    const entry = parsed.get(`${log.runId}/${log.file}`)
    if (entry) verdicts.push(checkSeq(log, entry))
  }

  return verdicts
}

export interface VerificationSummary {
  checks: number
  records: number
  passes: number
  failures: number
  warnings: number
  skipped: number
  /**
   * Records with no `promptBundle` at all. Reported as ONE number rather than
   * one warning per record: today that is every record in results.json, and a
   * report that is 183 copies of the same legacy fact is a report nobody reads.
   */
  preBundleRecords: number
  line: string
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export function summarizeVerdicts(verdicts: Verdict[], records: number): VerificationSummary {
  const count = (level: VerdictLevel) => verdicts.filter((v) => v.level === level).length
  const summary = {
    checks: RESULT_CHECKS.length,
    records,
    passes: count('pass'),
    failures: count('fail'),
    warnings: count('warn'),
    skipped: count('skip'),
    preBundleRecords: verdicts.filter(
      (v) => v.check === 'stale-prompt' && v.level === 'skip' && v.detail?.startsWith('pre-bundle')
    ).length,
  }
  return {
    ...summary,
    line: [
      plural(summary.checks, 'check'),
      plural(summary.records, 'record'),
      plural(summary.failures, 'failure'),
      plural(summary.warnings, 'warning'),
      `${summary.skipped} skipped`,
      // Always printed, 0 included: "how much of the board predates prompt-bundle
      // provenance" is a fact the reader should see trend to zero, and a line
      // that only appears sometimes is a line nobody notices going away.
      `${summary.preBundleRecords} pre-bundle`,
    ].join(', '),
  }
}
