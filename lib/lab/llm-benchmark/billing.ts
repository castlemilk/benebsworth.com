/**
 * Usage summarization + cost inference — the ONE place token counts become
 * dollars.
 *
 * WHY this module exists: the harness collects token counts from providers that
 * cannot agree on what they know. Streaming APIs hand back a real `usage`
 * block; codex prints a bare TOTAL; opencode and agy print nothing at all and
 * we fall back to a ~4-chars-per-token estimate. `estimateCost` used to
 * multiply whatever number arrived by a flat per-1k rate, which quietly
 * presented an estimate and a measurement as the same kind of fact.
 *
 * The fix is not better estimation — it is PROVENANCE. `summarizeUsage` folds a
 * record's iterations into one `UsageSummary` whose `source` says where the
 * numbers came from, and `costFromUsage` is the only pricing math in the tree.
 * (Inspired by paperclip's `adapter-utils/src/billing.ts`
 * `inferOpenAiCompatibleBiller`: per-adapter usage+cost inference over one
 * shared summary shape.)
 *
 * Pure and dependency-free by design: it imports only types, so the layering
 * guard keeps it usable from anywhere (including the browser bundle).
 */
import type { BenchmarkModel, UsageProvenance, UsageSource, UsageSummary } from './types'

// The shapes live in `types.ts` because `BenchmarkResult` persists one and
// types.ts must stay a leaf (layering.test.ts). This module is their documented
// home for everything else: construction, roll-up and pricing.
export type { UsageProvenance, UsageSource, UsageSummary }

/**
 * One call's contribution to a summary — structurally the token fields of
 * `GenerationResponse` / `IterationRun`, so both can be passed straight in.
 */
export interface UsageContribution {
  tokensIn: number
  tokensOut: number
  /** Absent = unknown provenance, which is read as `'estimated'`. */
  usageSource?: UsageProvenance
  cachedReadTokens?: number
  cachedWriteTokens?: number
}

/** Non-negative finite number, or 0. Guards against NaN/undefined arithmetic. */
function safe(n: number | undefined): number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Fold per-call token counts into one `UsageSummary`.
 *
 * Provenance rules (each exists to stop a specific lie):
 *  - An UNSTAMPED contribution counts as `'estimated'`. Absence means "we don't
 *    know", and the honest reading of "don't know" is never "the provider said
 *    so".
 *  - Only contributions that actually carried tokens vote on `source`. A failed
 *    iteration records 0/0; letting its stamp drag a fully-reported record to
 *    `'mixed'` would describe tokens that do not exist.
 *  - No voters (empty list, or every contribution at zero) → `'estimated'`.
 *    There is nothing reported to point at, so claiming `'reported'` for a zero
 *    would be the strongest claim over the weakest evidence.
 *  - Two different kinds among the voters → `'mixed'`, never a majority winner:
 *    the point of the field is that the reader knows part of it is a guess.
 */
export function summarizeUsage(runs: readonly UsageContribution[]): UsageSummary {
  let inputTokens = 0
  let outputTokens = 0
  let cachedReadTokens = 0
  let cachedWriteTokens = 0
  const kinds = new Set<UsageProvenance>()

  for (const run of runs) {
    const tin = safe(run.tokensIn)
    const tout = safe(run.tokensOut)
    const cread = safe(run.cachedReadTokens)
    const cwrite = safe(run.cachedWriteTokens)
    inputTokens += tin
    outputTokens += tout
    cachedReadTokens += cread
    cachedWriteTokens += cwrite
    if (tin + tout + cread + cwrite > 0) kinds.add(run.usageSource ?? 'estimated')
  }

  const source: UsageSource =
    kinds.size === 0 ? 'estimated' : kinds.size > 1 ? 'mixed' : [...kinds][0]

  return {
    inputTokens,
    outputTokens,
    // Conditional spread: nothing produces cached counts today, so emitting
    // `cachedReadTokens: 0` on every record would be noise claiming a
    // measurement. Absent = "no cached tokens in this record".
    ...(cachedReadTokens > 0 ? { cachedReadTokens } : {}),
    ...(cachedWriteTokens > 0 ? { cachedWriteTokens } : {}),
    source,
  }
}

/**
 * Price a usage summary against a model's published rates. TOTAL spend for the
 * whole summary, in USD.
 *
 * CACHED TOKENS: `BenchmarkModel` carries exactly two rates — input and output
 * — and no cached-read/cached-write rate fields. Until it does, cached tokens
 * bill at the NORMAL INPUT RATE. That is deliberately the conservative
 * direction: cached reads are typically discounted (often ~10% of the input
 * rate), so this OVER-states spend rather than under-stating it, and a
 * benchmark that publishes costs should never flatter its own bill. Because the
 * counters are additive to `inputTokens` and nothing sets them today, this
 * changes no existing number.
 *
 * `source` deliberately does NOT affect the math: an estimated token still
 * costs money. Provenance travels beside the cost, it does not discount it.
 */
export function costFromUsage(usage: UsageSummary, model: BenchmarkModel): number {
  const billedInput = safe(usage.inputTokens) + safe(usage.cachedReadTokens) + safe(usage.cachedWriteTokens)
  const billedOutput = safe(usage.outputTokens)
  return (
    (billedInput / 1000) * model.costPer1kInputUsd + (billedOutput / 1000) * model.costPer1kOutputUsd
  )
}
