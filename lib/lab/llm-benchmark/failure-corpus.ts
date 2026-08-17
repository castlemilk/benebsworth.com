/**
 * The failure regression corpus (#25) — production-case ingestion.
 *
 * Every sweep discovers broken artifacts: a platformer with no `<canvas>`, an
 * n-body that never animates, a free-tier model that narrates its plan instead
 * of emitting a document. Until this module existed they were thrown away with
 * the sweep tree, which is exactly backwards — those are the cases a prompt or
 * scorer edit has to be re-tested against. paperclip's Phase 4 calls this
 * "production-case ingestion": the eval suite GROWS from real usage rather than
 * from cases someone imagined.
 *
 * The corpus is two halves, and the split is deliberate:
 *
 *   - `failure-corpus/cases/<addr>.html` — the artifact BYTES, gitignored.
 *     They are model-generated HTML that executes in a browser, they are large,
 *     and they are reproducible from the sweep tree. Content-addressed, so the
 *     same broken artifact ingested from two runs is one file.
 *   - `failure-corpus/provenance.json` — the METADATA, committed. It is what
 *     makes a case a case: which model, which task, which iteration, what it
 *     scored, which checks tripped, under which prompt bundle, from which
 *     sweep. Without it a directory of hashed HTML files says nothing.
 *
 * Everything here is PURE: case selection from an already-parsed run log,
 * provenance merging, and verdict comparison. `scripts/ingest-failures.mjs` and
 * `scripts/probe-corpus.mjs` own the filesystem, the registry lookup and the
 * scorer (Playwright) — the same shape as `rescore.ts` / `rescore-artifact.mjs`,
 * and for the same reason: the interesting logic has to be unit-testable
 * without a browser or a sweeps/ tree.
 */
import { contentAddress, parseContentAddress } from './content-address'
import type { RunLogEvent, RunLogHeader, SpilledString } from './runlog-format'
import type { IterationCheckResult } from './types'

/**
 * The score at or below which an iteration counts as a failure on its own.
 *
 * 40 is the TODO's number and it is the right shape: the behavioural scorer
 * gives 30% of the composite to structural HTML heuristics, so an artifact that
 * is well-formed but behaviourally dead lands around 30 — below 40 means "the
 * checks essentially all tripped, or there is barely an artifact at all".
 * Anything above it only enters the corpus by tripping a NAMED check, which is
 * the stronger evidence anyway.
 */
export const CORPUS_FAIL_SCORE = 40

/** The provenance-bearing half of a case — everything `provenance.json` keeps. */
export interface FailureCaseIdentity {
  /** Content address of the artifact bytes (the corpus filename, sans extension). */
  artifact: string
  modelId: string
  taskId: string
  /** The run's OWN iteration number, not the position within the successes. */
  iterationIndex: number
  /** The score this iteration was given at ingestion time. */
  score: number
  /** Names of the checks that failed for this iteration (empty for text tasks). */
  failedChecks: string[]
  /** The prompt bundle the artifact was generated under, when the log recorded one. */
  promptBundle?: string
  sweepRunId: string
}

/** A selected failure, plus how to get at its bytes. */
export interface FailureCase extends FailureCaseIdentity {
  /** Where the bytes live inside `sweeps/<sweepRunId>/`, when they were spilled. */
  spillRef?: string
  /** The bytes themselves, when the `clean` event was small enough to inline. */
  inline?: string
}

export type FailureSkipReason =
  /** The run never produced a published record (a 0-success job, or a killed sweep). */
  | 'no-aggregate'
  /** Legacy log: no per-iteration scores, so no single iteration can be judged. */
  | 'no-iteration-scores'
  /** The clean events and the scores disagree in count — the pairing would be a guess. */
  | 'unalignable'
  /** The artifact's spill ref carries no content address (a pre-#31 name). */
  | 'unaddressable-artifact'

export interface FailureSkip {
  reason: FailureSkipReason
  detail?: string
}

export interface FailureSelection {
  /** Failing iterations whose artifact bytes are available. */
  cases: FailureCase[]
  /**
   * Failing iterations whose spill file is NOT on disk.
   *
   * Reported rather than dropped, and never thrown on: `sweeps/` is gitignored
   * and pruned, so ingesting an old tree legitimately finds provenance it
   * cannot back with bytes. An ingester that crashed on the first pruned spill
   * would be unable to walk a machine's sweep history at all.
   */
  unavailable: FailureCase[]
  /** Why part (or all) of this log yielded nothing. */
  skipped: FailureSkip[]
}

export interface SelectOptions {
  /**
   * Does this spill ref exist on disk? Injected so selection stays pure.
   * Omitted = assume everything is available (the unit-test default).
   */
  artifactExists?: (spillRef: string) => boolean
}

function spillRefOf(value: unknown): string | undefined {
  if (value && typeof value === 'object' && typeof (value as SpilledString).spillRef === 'string') {
    return (value as SpilledString).spillRef
  }
  return undefined
}

function numbersOf(value: unknown): number[] | undefined {
  return Array.isArray(value) && value.every((n) => typeof n === 'number')
    ? (value as number[])
    : undefined
}

function checkRowsOf(value: unknown): IterationCheckResult[][] | undefined {
  return Array.isArray(value) && value.every((row) => Array.isArray(row))
    ? (value as IterationCheckResult[][])
    : undefined
}

/**
 * Every failing iteration in one parsed run log.
 *
 * ALIGNMENT is the subtle part, and getting it wrong mis-files artifacts under
 * the wrong score. `iterationScores` is built by `aggregateRuns` over the
 * SUCCESSFUL runs in order — so it is index-aligned with the `clean` events,
 * NOT with `iterationIndex`. The real nemotron pendulum run makes the
 * difference visible: iteration 3 timed out, so the clean events are 0,1,2,4
 * against four scores, and `iterationScores[3]` is iteration FOUR's score.
 * That is why the clean event carries the true `iterationIndex` into the case
 * and the score is read positionally.
 *
 * When the two counts disagree the alignment is unknowable (a success whose
 * output was under the 40-char floor is logged as `clean` but never scored), so
 * the whole log is skipped as `unalignable` rather than half-guessed — a corpus
 * case filed under the wrong score is worse than a missing one.
 */
export function selectFailureCases(
  parsed: { header: RunLogHeader; events: RunLogEvent[] },
  options: SelectOptions = {}
): FailureSelection {
  const cases: FailureCase[] = []
  const unavailable: FailureCase[] = []
  const skipped: FailureSkip[] = []

  const aggregate = [...parsed.events].reverse().find((e) => e.type === 'aggregate')
  if (!aggregate || aggregate.type !== 'aggregate') {
    return { cases, unavailable, skipped: [{ reason: 'no-aggregate' }] }
  }
  const result = aggregate.result as Record<string, unknown>

  const iterationScores = numbersOf(result.iterationScores)
  if (!iterationScores || iterationScores.length === 0) {
    return { cases, unavailable, skipped: [{ reason: 'no-iteration-scores' }] }
  }

  const cleans = parsed.events.filter((e) => e.type === 'clean')
  if (cleans.length !== iterationScores.length) {
    return {
      cases,
      unavailable,
      skipped: [
        {
          reason: 'unalignable',
          detail: `${cleans.length} clean event(s) against ${iterationScores.length} iteration score(s)`,
        },
      ],
    }
  }

  const checkRows = checkRowsOf(result.iterationCheckResults)
  const promptBundle =
    typeof result.promptBundle === 'string'
      ? result.promptBundle
      : parsed.header.configSnapshot.promptBundle

  for (const [position, clean] of cleans.entries()) {
    if (clean.type !== 'clean') continue
    const score = iterationScores[position]
    const failedChecks = failedCheckNames(parsed.events, checkRows, position, clean.iterationIndex)
    if (score >= CORPUS_FAIL_SCORE && failedChecks.length === 0) continue

    const spillRef = spillRefOf(clean.output)
    let artifact: string | undefined
    let inline: string | undefined
    if (spillRef !== undefined) {
      artifact = parseContentAddress(spillRef)
    } else if (typeof clean.output === 'string') {
      // A small artifact stays INLINE in the log, so the log itself is the
      // store — address it ourselves, exactly as `rescore.ts` does when tying
      // an inline clean event back to the aggregate's force-spilled copy.
      inline = clean.output
      artifact = contentAddress(clean.output)
    }
    if (artifact === undefined) {
      skipped.push({
        reason: 'unaddressable-artifact',
        detail: `iteration ${clean.iterationIndex}: ${spillRef ?? 'no spill ref and no inline output'}`,
      })
      continue
    }

    const found: FailureCase = {
      artifact,
      modelId: parsed.header.modelId,
      taskId: parsed.header.taskId,
      iterationIndex: clean.iterationIndex,
      score,
      failedChecks,
      ...(promptBundle !== undefined ? { promptBundle } : {}),
      sweepRunId: parsed.header.runId,
      ...(spillRef !== undefined ? { spillRef } : {}),
      ...(inline !== undefined ? { inline } : {}),
    }
    const available = spillRef === undefined || !options.artifactExists || options.artifactExists(spillRef)
    ;(available ? cases : unavailable).push(found)
  }

  return { cases, unavailable, skipped }
}

/**
 * Which checks failed for one iteration.
 *
 * The aggregate's `iterationCheckResults` is authoritative when present — it is
 * built in the same expression as `iterationScores`, so it is aligned by
 * construction. The `check` EVENTS are the fallback, and they key off the true
 * `iterationIndex` rather than the position, which is why both indices are
 * passed in.
 *
 * UNNAMED checks are dropped, and that is not tidying. The real nemotron
 * pendulum run recorded two `{ name: '', maxPoints: 0, detail: 'threw: Attempt
 * to access memory outside buffer bounds' }` rows — a Playwright/WASM crash in
 * the SCORER, not a property of the artifact. A name is the whole identity of a
 * corpus failure (`compareCase` matches on it), so an empty one would make two
 * unrelated cases appear to share a failure and would never be comparable
 * against a future run. The iteration still enters the corpus on its SCORE if
 * it deserves to; it just does not claim a check it cannot name.
 */
function failedCheckNames(
  events: RunLogEvent[],
  checkRows: IterationCheckResult[][] | undefined,
  position: number,
  iterationIndex: number
): string[] {
  const row = checkRows?.[position]
  const failed = row
    ? row.filter((c) => !c.passed).map((c) => c.name)
    : events
        .filter((e) => e.type === 'check' && e.iterationIndex === iterationIndex && !e.check.passed)
        .map((e) => (e.type === 'check' ? e.check.name : ''))
  return failed.filter((name) => typeof name === 'string' && name.length > 0)
}

/** One committed row of `provenance.json`. */
export interface ProvenanceEntry extends FailureCaseIdentity {
  /** When this case FIRST entered the corpus. Preserved across re-ingests. */
  ingestedAt: string
}

/** A case as it is written to `provenance.json` (artifact bytes stripped). */
export function toProvenanceEntry(found: FailureCaseIdentity, ingestedAt: string): ProvenanceEntry {
  return {
    artifact: found.artifact,
    modelId: found.modelId,
    taskId: found.taskId,
    iterationIndex: found.iterationIndex,
    score: found.score,
    failedChecks: [...found.failedChecks],
    ...(found.promptBundle !== undefined ? { promptBundle: found.promptBundle } : {}),
    sweepRunId: found.sweepRunId,
    ingestedAt,
  }
}

/**
 * The stable identity of a case: artifact + model + task + iteration.
 *
 * NOT the artifact alone — two models can emit byte-identical garbage (an empty
 * skeleton, a prompt echo), and collapsing those would lose the fact that both
 * failed. NOT the sweep run either: re-running the same sweep and ingesting
 * again must not double the corpus.
 */
export function provenanceKey(entry: FailureCaseIdentity): string {
  return `${entry.artifact}|${entry.modelId}|${entry.taskId}|${entry.iterationIndex}`
}

function compareEntries(a: ProvenanceEntry, b: ProvenanceEntry): number {
  return (
    a.artifact.localeCompare(b.artifact) ||
    a.modelId.localeCompare(b.modelId) ||
    a.taskId.localeCompare(b.taskId) ||
    // Numeric, not lexical: iteration 10 sorts after 2, so a 10+-iteration
    // sweep does not reshuffle the committed file.
    a.iterationIndex - b.iterationIndex
  )
}

export interface ProvenanceMerge {
  entries: ProvenanceEntry[]
  added: number
  updated: number
  unchanged: number
}

/**
 * Fold newly-ingested cases into the committed provenance.
 *
 * Two properties matter, both because this file is COMMITTED:
 *
 *  - **Idempotent.** Re-ingesting the same sweep must produce a byte-identical
 *    file, so `ingestedAt` is taken from the EXISTING entry (when it was first
 *    seen) rather than from the new one (when the ingester happened to run).
 *  - **Stably ordered.** Entries sort by their key, so the diff of a real
 *    ingestion is the new cases and nothing else — a file whose order depends
 *    on directory-walk order would show a hundred-line diff for one new case
 *    and nobody would read it.
 *
 * A case whose SCORE or CHECKS changed keeps its key and its `ingestedAt` but
 * takes the new values, and is counted as `updated` — that is a re-scored
 * sweep, not a new case.
 */
export function mergeProvenance(
  existing: ProvenanceEntry[],
  incoming: ProvenanceEntry[]
): ProvenanceMerge {
  const byKey = new Map(existing.map((e) => [provenanceKey(e), e]))
  let added = 0
  let updated = 0
  let unchanged = 0

  for (const entry of incoming) {
    const key = provenanceKey(entry)
    const prior = byKey.get(key)
    if (!prior) {
      byKey.set(key, entry)
      added++
      continue
    }
    const merged: ProvenanceEntry = { ...entry, ingestedAt: prior.ingestedAt }
    if (JSON.stringify(merged) === JSON.stringify(prior)) unchanged++
    else updated++
    byKey.set(key, merged)
  }

  return { entries: [...byKey.values()].sort(compareEntries), added, updated, unchanged }
}

/** One side of a corpus comparison: what an artifact scored and what tripped. */
export interface CaseOutcome {
  score: number
  failedChecks: string[]
}

export type CaseVerdict =
  /** The case reproduces: still below the floor, or still failing the same checks. */
  | 'still-broken'
  /** Clears the floor AND nothing that used to fail still fails. */
  | 'now-passing'
  /** A different failure set — new breakage, or a partial fix. */
  | 'changed'

export interface CaseComparison {
  verdict: CaseVerdict
  /** Recorded failures that fail again. */
  stillFailing: string[]
  /** Recorded failures that now pass. */
  fixed: string[]
  /** Failures the case did NOT have when it was ingested. */
  newlyFailing: string[]
  line: string
}

/**
 * Recorded failure vs a fresh run of the CURRENT scorer.
 *
 * `now-passing` deliberately needs BOTH halves: a score over the floor is not
 * enough while a check that was the whole reason for ingestion still trips (the
 * gemini tic-tac-toe shape — 68 with `win-detection` failing would otherwise
 * read as fixed the moment the composite drifted up).
 *
 * `changed` is the interesting verdict and the one `--strict` gates on: the
 * case now fails in a way the recorded provenance does not describe, which is
 * either a partial fix worth noticing or a NEW breakage a check registry should
 * grow to cover (the TODO's #10 pressure).
 */
export function compareCase(recorded: CaseOutcome, current: CaseOutcome): CaseComparison {
  const was = new Set(recorded.failedChecks)
  const now = new Set(current.failedChecks)
  const stillFailing = recorded.failedChecks.filter((n) => now.has(n))
  const fixed = recorded.failedChecks.filter((n) => !now.has(n))
  const newlyFailing = current.failedChecks.filter((n) => !was.has(n))

  let verdict: CaseVerdict
  if (current.score >= CORPUS_FAIL_SCORE && stillFailing.length === 0 && newlyFailing.length === 0) {
    verdict = 'now-passing'
  } else if (fixed.length === 0 && newlyFailing.length === 0) {
    verdict = 'still-broken'
  } else {
    verdict = 'changed'
  }

  const parts = [`recorded ${recorded.score} → current ${current.score}`]
  if (stillFailing.length > 0) parts.push(`still failing: ${stillFailing.join(', ')}`)
  if (fixed.length > 0) parts.push(`fixed: ${fixed.join(', ')}`)
  if (newlyFailing.length > 0) parts.push(`NEW failures: ${newlyFailing.join(', ')}`)

  return { verdict, stillFailing, fixed, newlyFailing, line: `${verdict} — ${parts.join('; ')}` }
}

/** Tally of a probe run, for the summary line. */
export function summarizeVerdictCounts(verdicts: CaseVerdict[]): Record<CaseVerdict, number> {
  return {
    'still-broken': verdicts.filter((v) => v === 'still-broken').length,
    'now-passing': verdicts.filter((v) => v === 'now-passing').length,
    changed: verdicts.filter((v) => v === 'changed').length,
  }
}
