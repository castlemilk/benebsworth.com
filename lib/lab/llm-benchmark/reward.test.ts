import { describe, it, expect } from 'vitest'
import {
  calibrateFamilies,
  denseReward,
  failedRewardMass,
  progressTerm,
  recalibrate,
  rewardOutcome,
  successPrioritised,
  type RewardCalibration,
  type VerifierOutcome,
} from './reward.js'

const fixed: RewardCalibration = { divisor: { page: 10 }, divisorPrime: { page: 10 } }

function outcome(over: Partial<VerifierOutcome> = {}): VerifierOutcome {
  return { passed: 5, total: 10, strict: false, family: 'page', ...over }
}

describe('successPrioritised', () => {
  it('keeps every failure below 1 and every success at or above it', () => {
    // The property that motivates the reward: partial progress must never
    // out-earn completion. We measured a page scoring 96 with twelve defects.
    for (const passed of [0, 1, 3, 7, 9, 10]) {
      const failure = successPrioritised(outcome({ passed, strict: false }), fixed)
      const success = successPrioritised(outcome({ passed, strict: true }), fixed)
      expect(failure).toBeLessThan(1)
      expect(success).toBeGreaterThanOrEqual(1)
    }
  })

  it('is worth exactly one more unit for success at matched counts', () => {
    const failure = successPrioritised(outcome({ passed: 6, strict: false }), fixed)
    const success = successPrioritised(outcome({ passed: 6, strict: true }), fixed)
    expect(success - failure).toBeCloseTo(1, 10)
  })

  it('increases with progress but with diminishing returns', () => {
    // g'(P) > 0 and g''(P) < 0. Concavity is about the value of ONE more check,
    // so the per-check gain must strictly fall as P rises.
    const marginal = Array.from({ length: 12 }, (_, index) => {
      const p = index + 1
      return progressTerm(outcome({ passed: p }), fixed) - progressTerm(outcome({ passed: p - 1 }), fixed)
    })
    for (const gain of marginal) expect(gain).toBeGreaterThan(0)
    for (let i = 1; i < marginal.length; i += 1) {
      expect(marginal[i] as number).toBeLessThan(marginal[i - 1] as number)
    }
  })

  it('stays inside [0, 2) however many checks a family exposes', () => {
    const many: RewardCalibration = { divisor: { page: 500 }, divisorPrime: { page: 500 } }
    for (const passed of [0, 250, 499, 500, 5_000]) {
      const reward = successPrioritised(outcome({ passed, strict: true, total: 5_000 }), many)
      expect(reward).toBeGreaterThanOrEqual(0)
      expect(reward).toBeLessThan(2)
    }
  })

  it('does not treat an unevaluated gate as a failed one', () => {
    // `strict` undefined means nobody checked the gate, which is not the same as
    // the gate failing. Scoring it as zero demotes the best pages to failures.
    const unevaluated = rewardOutcome(outcome({ passed: 9, strict: undefined }), fixed)
    expect(unevaluated.strictEvaluated).toBe(false)
    expect(unevaluated.spr).toBeGreaterThan(0)
  })
})

describe('denseReward', () => {
  it('gives constant marginal credit per check', () => {
    const base = denseReward(outcome({ passed: 2 }), fixed)
    const more = denseReward(outcome({ passed: 3 }), fixed)
    expect(more - base).toBeCloseTo(0.1, 10)
  })

  it('cannot tell a finished task from a nearly-finished one', () => {
    // Which is the reason Success-Prioritised Reward exists, and the reason the
    // loop needed one: the dense score alone left both at 1.0.
    const nearly = denseReward(outcome({ passed: 10, strict: false }), fixed)
    const finished = denseReward(outcome({ passed: 10, strict: true }), fixed)
    expect(nearly).toBe(finished)
    expect(successPrioritised(outcome({ passed: 10, strict: false }), fixed)).toBeLessThan(
      successPrioritised(outcome({ passed: 10, strict: true }), fixed)
    )
  })

  it('never hands out more than one unit when a family is under-calibrated', () => {
    const under: RewardCalibration = { divisor: { page: 4 }, divisorPrime: { page: 4 } }
    expect(denseReward(outcome({ passed: 10, total: 10 }), under)).toBeLessThanOrEqual(1)
  })
})

describe('calibrateFamilies', () => {
  it('uses the 90th percentile of a family check count, so bigger verifiers do not pay more', () => {
    const many = Array.from({ length: 9 }, () => outcome({ family: 'big', total: 100 }))
    const few = Array.from({ length: 9 }, () => outcome({ family: 'small', total: 20 }))
    const calibration = calibrateFamilies([...many, ...few])
    expect(calibration.divisor.big).toBe(100)
    expect(calibration.divisor.small).toBe(20)
    // Same fraction of progress, comparable reward across the two families.
    const big = denseReward(outcome({ family: 'big', passed: 50, total: 100 }), calibration)
    const small = denseReward(outcome({ family: 'small', passed: 10, total: 20 }), calibration)
    expect(big).toBeCloseTo(small, 10)
  })

  it('falls back to the outcome own total when a family has no history', () => {
    const calibration = calibrateFamilies([])
    expect(calibration.divisor.page).toBeUndefined()
    const reward = denseReward(outcome({ passed: 5, total: 10 }), calibration)
    expect(reward).toBeCloseTo(0.5, 10)
  })
})

describe('failedRewardMass', () => {
  it('reports the share of reward mass going to failures', () => {
    // The paper's audit: dense reward paid failures 50.09% of the mass.
    const outcomes = [
      outcome({ passed: 9, total: 10, strict: false }),
      outcome({ passed: 8, total: 10, strict: false }),
      outcome({ passed: 10, total: 10, strict: true }),
    ]
    const share = failedRewardMass(outcomes, (o) => denseReward(o, { divisor: { page: 10 }, divisorPrime: { page: 10 } }))
    expect(share).toBeGreaterThan(0.6)
  })

  it('is undefined with nothing to report', () => {
    expect(failedRewardMass([], () => 1)).toBeUndefined()
    expect(failedRewardMass([outcome({ passed: 0, strict: false })], () => 0)).toBeUndefined()
  })
})

describe('recalibrate', () => {
  it('raises the divisor for a family whose failures out-earn their successes', () => {
    // 48 of the paper's failures passed every executed check and still missed
    // the terminal gate: the family was paying for near-misses. Eight near
    // misses and one completion put 72.7% of the reward mass on failures.
    const outcomes = [
      ...Array.from({ length: 8 }, () => outcome({ passed: 10, total: 10, strict: false })),
      outcome({ passed: 10, total: 10, strict: true }),
    ]
    const before = calibrateFamilies(outcomes)
    const after = recalibrate(before, outcomes)
    expect(after.divisorPrime.page).toBeGreaterThan(before.divisorPrime.page as number)
    // Success is untouched: it is added, not scaled.
    const success = successPrioritised(outcome({ passed: 10, strict: true }), after)
    const failure = successPrioritised(outcome({ passed: 10, strict: false }), after)
    expect(success - failure).toBeCloseTo(1, 10)
  })

  it('leaves a family exactly at the ceiling alone', () => {
    // Failures holding exactly half the mass is the documented problem
    // boundary, not a problem. Six near-misses and two completions is 0.50.
    const outcomes = [
      ...Array.from({ length: 6 }, () => outcome({ passed: 10, total: 10, strict: false })),
      ...Array.from({ length: 2 }, () => outcome({ passed: 10, total: 10, strict: true })),
    ]
    const calibration = calibrateFamilies(outcomes)
    expect(failedRewardMass(outcomes, (o) => successPrioritised(o, calibration))).toBeCloseTo(0.5, 10)
    expect(recalibrate(calibration, outcomes).divisorPrime.page).toBe(calibration.divisorPrime.page)
  })

  it('leaves a family alone when too few outcomes exist to price it', () => {
    const outcomes = [outcome({ passed: 10, strict: false }), outcome({ passed: 10, strict: true })]
    const calibration = calibrateFamilies(outcomes)
    const after = recalibrate(calibration, outcomes)
    expect(after.divisorPrime.page).toBe(calibration.divisorPrime.page)
  })
})