/**
 * What the verifier said, and what that is worth.
 *
 * Adapted from Terminal-RSI (arXiv:2610.22192), §2.2 "Reward evolution", for a
 * system that prompts rather than trains. The paper's contribution here is not
 * the algebra; it is the observation that started it. Auditing 4,352 terminal
 * trajectories, failures collected 50.09% of the dense reward mass, and 48
 * failures passed every executed check while missing the terminal gate — a
 * proxy that out-earned the outcome it was standing in for. Rescoring with a
 * success-prioritised reward cut the failure share to 28.72% without relabelling
 * a single outcome.
 *
 * We have the same pathology, measured rather than audited: a landing page
 * scored 96 on the rubric while the design rules found twelve defects, and the
 * rubric then sat at 62 for every loop while those defects fell 15 → 3. A single
 * number cannot separate "made progress" from "finished", so this module keeps
 * them separate and says which is which.
 *
 * What did not come across, and cannot: TB-GAE, the critic handoff, PPO, and
 * the stage-specific learning rates are credit assignment over token positions
 * inside a trained value network. We have no weights to update. The loop's turn
 * clock is a prompt, not a policy gradient, so this module supplies the reward
 * shape and the strict/partial separation — which is the part that transfers.
 */

/** One verifier's verdict on one artefact. */
export interface VerifierOutcome {
  /** Checks passed, P in the paper's notation. */
  passed: number;
  /** Checks the verifier exposes for this outcome, N. */
  total: number;
  /**
   * Strict success, S: the complete gate, not a subset of checks and not the
   * agent's own say-so. Undefined means "not evaluated", which is not the same
   * as false and must not be scored as one.
   */
  strict?: boolean;
  /** Task family, f. Calibrators are per family. */
  family: string;
}

/** Divisors, frozen for a phase — the paper freezes them within a phase too. */
export interface RewardCalibration {
  /** D_f: dense divisor per family. */
  divisor: Record<string, number>;
  /** D'_f: success-prioritised divisor per family. */
  divisorPrime: Record<string, number>;
}

/**
 * The paper's fallback when a family has no calibration history.
 *
 * It uses 82 for its check counts. Ours are smaller — a landing page exposes 65
 * behavioural points — so borrowing its constant would under-credit every task
 * we have. With no history, a family's own check total is the honest divisor: it
 * turns progress into a fraction of what that family could possibly ask, which
 * is what "dense" means before any calibration exists.
 */
const FALLBACK_DIVISOR = 82;

/** The 90th percentile, which is the paper's D_f estimator. */
function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(q * sorted.length) - 1),
  );
  return sorted[index] as number;
}

/**
 * Calibrate one divisor per family from observed outcomes.
 *
 * D_f is the 90th percentile of the family's total check count, so a family whose
 * verifier simply exposes more checks does not collect more reward for the same
 * fraction of progress — which is the whole point of a family term.
 */
export function calibrateFamilies(
  outcomes: VerifierOutcome[],
): RewardCalibration {
  const totals = new Map<string, number[]>();
  for (const outcome of outcomes) {
    if (!Number.isFinite(outcome.total) || outcome.total <= 0) continue;
    const bucket = totals.get(outcome.family) ?? [];
    bucket.push(outcome.total);
    totals.set(outcome.family, bucket);
  }
  const divisor: Record<string, number> = {};
  for (const [family, values] of totals)
    divisor[family] = quantile(values, 0.9) || FALLBACK_DIVISOR;
  return { divisor, divisorPrime: { ...divisor } };
}

/**
 * Family Dense Reward.
 *
 * R_FDR = max(P / D_f, 0) on a valid report, else S.
 *
 * Constant marginal credit: every check is worth 1/D_f, with no completion bonus
 * and no upper bound tied to how many checks a family happens to expose. It
 * cannot tell a finished task from a nearly-finished one, which is exactly why
 * Success-Prioritised Reward exists.
 */
export function denseReward(
  outcome: VerifierOutcome,
  calibration: RewardCalibration,
): number {
  if (
    !Number.isFinite(outcome.passed) ||
    !Number.isFinite(outcome.total) ||
    outcome.total <= 0
  ) {
    return outcome.strict ? 1 : 0;
  }
  const divisor =
    calibration.divisor[outcome.family] ?? outcome.total ?? FALLBACK_DIVISOR;
  const progress = Math.max(outcome.passed, 0) / divisor;
  if (!Number.isFinite(progress)) return outcome.strict ? 1 : 0;
  // A family calibrated below its own check count would hand out more than one
  // unit per check; the progress term is bounded at 1 by construction and the
  // report being valid is what licenses it.
  return Math.min(progress, 1);
}

/**
 * Success-Prioritized Reward.
 *
 * R_SPR = S + P / (P + D'_f), with S ∈ {0,1}.
 *
 * The properties that matter, all of which fall out of the form rather than from
 * tuning:
 *
 * - every failure scores strictly below 1 and every success at least 1, so
 *   partial progress can never out-earn completion;
 * - the progress term g(P) = P/(P + D'_f) is increasing (g' > 0) and concave
 *   (g'' < 0), so the tenth check is worth less than the first and never
 *   negative — credit keeps flowing to partial progress without rewarding
 *   stalling just short of done;
 * - at matched counts, family and report validity, success is worth exactly one
 *   more unit than failure;
 * - 0 ≤ R_SPR < 2, so reward variance is bounded regardless of how many checks
 *   a family exposes.
 *
 * A loop with no strict evaluation is scored on progress alone and says so, via
 * `strictEvaluated`: an unevaluated gate is not a failed gate, and treating it
 * as one would quietly demote the best pages to failures.
 */
export function successPrioritised(
  outcome: VerifierOutcome,
  calibration: RewardCalibration,
): number {
  const progress = progressTerm(outcome, calibration);
  return (outcome.strict ? 1 : 0) + progress;
}

/** The bounded progress term g(P) = P / (P + D'_f). */
export function progressTerm(
  outcome: VerifierOutcome,
  calibration: RewardCalibration,
): number {
  if (!Number.isFinite(outcome.passed) || outcome.passed <= 0) return 0;
  const divisor =
    calibration.divisorPrime[outcome.family] ??
    outcome.total ??
    FALLBACK_DIVISOR;
  const denominator = outcome.passed + Math.max(divisor, Number.EPSILON);
  if (!Number.isFinite(denominator) || denominator <= 0) return 0;
  return outcome.passed / denominator;
}

/**
 * The share of total reward mass going to strict failures.
 *
 * The paper's diagnostic, and the one that justifies preferring SPR: at 50.09%
 * the dense reward was paying failures almost as much as successes. Reported
 * rather than acted on, because the number is only meaningful with enough
 * outcomes behind it to not be three pages.
 */
export function failedRewardMass(
  outcomes: VerifierOutcome[],
  reward: (outcome: VerifierOutcome) => number,
): number | undefined {
  if (outcomes.length === 0) return undefined;
  const scored = outcomes.map((outcome) => ({
    outcome,
    value: reward(outcome),
  }));
  const total = scored.reduce((sum, entry) => sum + entry.value, 0);
  if (total <= 0) return undefined;
  const failures = scored.filter((entry) => !entry.outcome.strict);
  return failures.reduce((sum, entry) => sum + entry.value, 0) / total;
}

/**
 * Suppress failure credit in families where it dominates.
 *
 * The paper's offline recalibration doubled divisors for high-reward-failure
 * families and quartered them for long, low-reward ones, with failure
 * suppression taking precedence. The mechanism is the point; the constants are
 * theirs and are applied here only when a family is measurably mispriced.
 */
export function recalibrate(
  calibration: RewardCalibration,
  outcomes: VerifierOutcome[],
  { failureShareCeiling = 0.5 }: { failureShareCeiling?: number } = {},
): RewardCalibration {
  const divisor = { ...calibration.divisor };
  const divisorPrime = { ...calibration.divisorPrime };
  const families = [...new Set(outcomes.map((o) => o.family))];
  for (const family of families) {
    const inFamily = outcomes.filter((o) => o.family === family);
    if (inFamily.length < 4) continue; // too few outcomes to price a family
    const share = failedRewardMass(inFamily, (o) =>
      successPrioritised(o, calibration),
    );
    if (share === undefined || share <= failureShareCeiling) continue;
    // Failures are over-earning in this family: push their progress term down by
    // raising the divisor. Success is unaffected, because it is added, not scaled.
    const factor = 1 + Math.min(1, share - failureShareCeiling);
    divisor[family] = (divisor[family] ?? 1) * factor;
    divisorPrime[family] = (divisorPrime[family] ?? 1) * factor;
  }
  return { divisor, divisorPrime };
}

/** Convenience: score one outcome under both rewards, for the record. */
export function rewardOutcome(
  outcome: VerifierOutcome,
  calibration: RewardCalibration,
) {
  return {
    family: outcome.family,
    passed: outcome.passed,
    total: outcome.total,
    strict: outcome.strict,
    strictEvaluated: outcome.strict !== undefined,
    fdr: denseReward(outcome, calibration),
    spr: successPrioritised(outcome, calibration),
  };
}
