/**
 * Re-score verification — "does the artifact we stored still score what we
 * published?" (#31, the expensive half).
 *
 * `artifact-integrity` in `verify-results.ts` answers the CHEAP question: are
 * the stored bytes the bytes that were scored? It cannot answer the second
 * question, which is whether the CURRENT scorer still agrees with the number on
 * the board. That one requires actually running the scorer — Playwright and a
 * headless Chromium for behavioural tasks, seconds to tens of seconds per
 * artifact — so it is a deliberate opt-in tool (`scripts/rescore-artifact.mjs`)
 * and is never wired into the pre-push gate.
 *
 * Everything here is PURE: locating the artifact inside a parsed run log, and
 * comparing two numbers. The script owns the filesystem, the registry lookup
 * and the scorer invocation, so this half is unit-testable without a browser.
 */
import { contentAddressedName } from './content-address'
import type { RunLogEvent, RunLogHeader, SpilledString } from './runlog-format'

/** The scored artifact inside one run log, and the score to compare against. */
export interface ScoredArtifact {
  modelId: string
  taskId: string
  /** Spill ref of the PUBLISHED artifact (`aggregate.result.output`). */
  spillRef: string
  /**
   * The recorded score this artifact should reproduce.
   *
   * NOT always the aggregate `score`: the aggregate is the MEAN over
   * iterations, while `output` is the BEST iteration's artifact
   * (`aggregateRuns` in `runners/provider.ts`). Comparing a single artifact's
   * fresh score against a mean would manufacture a "drift" out of ordinary
   * iteration variance, so `basis` says which number this is.
   */
  recordedScore: number | undefined
  basis: ScoreBasis
  /** The iteration whose `clean` event spilled these exact bytes, if known. */
  iterationIndex?: number
}

export type ScoreBasis =
  /** Matched a `clean` event by content address — this iteration's own score. */
  | 'iteration'
  /** No `clean` match; the published artifact is the best iteration by construction. */
  | 'best-iteration'
  /** No per-iteration scores at all — falling back to the aggregate mean. */
  | 'aggregate-mean'
  /** The log records no score to compare against. */
  | 'none'

/** Thrown when a log cannot yield a scored artifact to re-score. */
export class NoScoredArtifactError extends Error {}

function spillRefOf(value: unknown): string | undefined {
  if (value && typeof value === 'object' && typeof (value as SpilledString).spillRef === 'string') {
    return (value as SpilledString).spillRef
  }
  return undefined
}

/**
 * Does this `clean` event's output live at `spillRef`?
 *
 * Two shapes, because the two writers differ: a `clean` output over
 * SPILL_THRESHOLD_BYTES is already a `{ spillRef }` locator, while a SMALL one
 * stays INLINE — but the aggregate's copy of the same artifact is force-spilled
 * regardless of size. So for a small artifact the only way to tie the published
 * bytes back to an iteration is to address the inline string ourselves. That
 * works precisely because both sides redact before addressing (`runlog.ts`),
 * so the two paths agree byte-for-byte.
 */
function cleanMatches(output: unknown, spillRef: string): boolean {
  const ref = spillRefOf(output)
  if (ref !== undefined) return ref === spillRef
  if (typeof output !== 'string') return false
  return `spill/${contentAddressedName(output, '.txt')}` === spillRef
}

function numbersOf(value: unknown): number[] | undefined {
  return Array.isArray(value) && value.every((n) => typeof n === 'number')
    ? (value as number[])
    : undefined
}

/**
 * Find the published artifact in a parsed run log, plus the score it should
 * reproduce.
 *
 * The `clean`-event match is the payoff of content addressing: the aggregate's
 * artifact and the iteration that produced it spill to the SAME file, so the
 * ref alone identifies the iteration — no index, no heuristics, no second
 * record to keep in sync.
 */
export function locateScoredArtifact(parsed: {
  header: RunLogHeader
  events: RunLogEvent[]
}): ScoredArtifact {
  const aggregate = [...parsed.events].reverse().find((e) => e.type === 'aggregate')
  if (!aggregate || aggregate.type !== 'aggregate') {
    throw new NoScoredArtifactError(
      'this run log has no aggregate event — the run never produced a published record'
    )
  }
  const result = aggregate.result as Record<string, unknown>
  const spillRef = spillRefOf(result.output)
  if (spillRef === undefined) {
    throw new NoScoredArtifactError(
      'the aggregate event carries no spilled `output` — nothing to re-score (a 0-success run, or a log written before the artifact was force-spilled)'
    )
  }

  const iterationScores = numbersOf(result.iterationScores)
  const matched = parsed.events.find((e) => e.type === 'clean' && cleanMatches(e.output, spillRef))
  const iterationIndex =
    matched && matched.type === 'clean' ? matched.iterationIndex : undefined

  let recordedScore: number | undefined
  let basis: ScoreBasis
  if (iterationScores && iterationIndex !== undefined && iterationScores[iterationIndex] !== undefined) {
    recordedScore = iterationScores[iterationIndex]
    basis = 'iteration'
  } else if (iterationScores && iterationScores.length > 0) {
    recordedScore = Math.max(...iterationScores)
    basis = 'best-iteration'
  } else if (typeof result.score === 'number') {
    recordedScore = result.score
    basis = 'aggregate-mean'
  } else {
    recordedScore = undefined
    basis = 'none'
  }

  return {
    modelId: parsed.header.modelId,
    taskId: parsed.header.taskId,
    spillRef,
    recordedScore,
    basis,
    ...(iterationIndex !== undefined ? { iterationIndex } : {}),
  }
}

/** Recorded vs freshly-computed score for one artifact. */
export interface RescoreComparison {
  recorded: number | undefined
  current: number
  /** `current - recorded`, absent when there is no recorded score. */
  delta: number | undefined
  /** True when the two disagree beyond `tolerance`. Never true with no baseline. */
  drifted: boolean
  /** One-line human summary, printed by the script. */
  line: string
}

/**
 * Compare a recorded score with a fresh one.
 *
 * `tolerance` defaults to 0.05 — scores are published to one decimal, so
 * anything smaller is float noise rather than a scorer that changed its mind.
 */
export function compareRescore(
  recorded: number | undefined,
  current: number,
  basis: ScoreBasis = 'iteration',
  tolerance = 0.05
): RescoreComparison {
  if (recorded === undefined) {
    return {
      recorded,
      current,
      delta: undefined,
      drifted: false,
      line: `current ${current} (no recorded score in the log to compare against)`,
    }
  }
  const delta = Math.round((current - recorded) * 1000) / 1000
  const drifted = Math.abs(delta) > tolerance
  const sign = delta > 0 ? '+' : ''
  return {
    recorded,
    current,
    delta,
    drifted,
    line: drifted
      ? `DRIFT: recorded ${recorded} (${basis}) vs current ${current} — ${sign}${delta}`
      : `MATCH: recorded ${recorded} (${basis}) == current ${current}`,
  }
}
