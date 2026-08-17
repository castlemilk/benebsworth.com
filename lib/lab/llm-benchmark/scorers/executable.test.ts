import { describe, it, expect } from 'vitest'

import { BENCHMARK_TASKS } from '../registry'
import { BENCHMARK_RESULTS } from '../results'
import { selectScorer } from './index'
import { executableScorer, parseSolutionPairs, scoreExecutable } from './executable'
import { textScorer } from './text'
import { interpreterAvailable } from './code-runtime'

const cryptoTask = BENCHMARK_TASKS.find((t) => t.id === 'crypto-hash-race')!
const equationTask = BENCHMARK_TASKS.find((t) => t.id === 'equation-solver')!
const hasPython = interpreterAvailable('python')

// A module that genuinely satisfies the prompt: constant-time comparison,
// PBKDF2 with a random salt, verify, unit tests. Iterations are kept low so the
// fixture is fast — the executed checks are about BEHAVIOUR, and the task
// prompt fixes no iteration count.
const GOOD_CRYPTO = `import hashlib
import hmac
import os
import unittest


def constant_time_compare(a, b):
    if isinstance(a, str):
        a = a.encode()
    if isinstance(b, str):
        b = b.encode()
    return hmac.compare_digest(a, b)


def hash_password(password, iterations=1000):
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, iterations)
    return f"pbkdf2_sha256\${iterations}\${salt.hex()}\${digest.hex()}"


def verify_password(password, stored):
    try:
        _, iterations, salt_hex, digest_hex = stored.split('$')
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt_hex), int(iterations))
    return constant_time_compare(digest.hex(), digest_hex)


class TestHashing(unittest.TestCase):
    def test_round_trip(self):
        stored = hash_password('hunter2')
        self.assertTrue(verify_password('hunter2', stored))
        self.assertFalse(verify_password('hunter3', stored))


if __name__ == '__main__':
    unittest.main()
`

// Right SHAPE, wrong VALUES: the salt is a constant, so two hashes of the same
// password are identical, and the comparison short-circuits on the first byte.
const SUBTLY_WRONG_CRYPTO = `import hashlib
import unittest

SALT = b'static-salt-value'


def constant_time_compare(a, b):
    return a[:1] == b[:1]


def hash_password(password, iterations=1000):
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), SALT, iterations)
    return digest.hex()


def verify_password(password, stored):
    return hash_password(password) == stored


class TestHashing(unittest.TestCase):
    def test_round_trip(self):
        self.assertTrue(verify_password('hunter2', hash_password('hunter2')))
`

// The real failure mode this scorer exists for: reads perfectly, raises
// NameError on the first call because `hashlib` was never imported.
const MISSING_IMPORT_CRYPTO = `import hmac
import os


def constant_time_compare(a, b):
    return hmac.compare_digest(a.encode(), b.encode())


def hash_password(password, iterations=1000):
    salt = os.urandom(16)
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt, iterations).hex()


def verify_password(password, stored):
    return constant_time_compare(hash_password(password), stored)
`

const PROSE_ONLY_EQUATION = `Let s = x + y and p = xy = 12.
Then x^2 + y^2 = s^2 - 2p = 25, so s^2 = 49 and s = 7 or s = -7.
For s = 7 the roots of t^2 - 7t + 12 are 3 and 4, giving (3, 4) and (4, 3).
For s = -7 they are -3 and -4, giving (-3, -4) and (-4, -3).`

const GOOD_EQUATION = `\`\`\`python
import math

p = 12
for s in (7, -7):
    disc = math.sqrt(s * s - 4 * p)
    x = (s + disc) / 2
    y = (s - disc) / 2
    print(f"({x:.0f}, {y:.0f})")
    print(f"({y:.0f}, {x:.0f})")
\`\`\``

const WRONG_EQUATION = `\`\`\`javascript
// Right shape, wrong values: solves xy = 10 by mistake.
const pairs = [[2, 5], [5, 2], [-2, -5], [-5, -2]]
for (const [x, y] of pairs) console.log(\`(\${x}, \${y})\`)
\`\`\``

describe('executable scorer registration', () => {
  it('is what both text tasks now resolve to', () => {
    expect(selectScorer(cryptoTask)).toBe(executableScorer)
    expect(selectScorer(equationTask)).toBe(executableScorer)
  })
})

describe('parseSolutionPairs', () => {
  it('reads tuple and assignment spellings, including unicode minus', () => {
    expect(parseSolutionPairs('(3, 4) and [−4, −3]')).toEqual([
      [3, 4],
      [-4, -3],
    ])
    expect(parseSolutionPairs('x = 3, y = 4')).toEqual([[3, 4]])
  })
})

describe.runIf(hasPython)('crypto-hash-race executable scoring', () => {
  it('scores a genuinely working module high', async () => {
    const result = await scoreExecutable(GOOD_CRYPTO, cryptoTask)
    expect(result.fallbackReason).toBeUndefined()
    expect(result.executed).toBe(result.executedMax)
    expect(result.score).toBeGreaterThanOrEqual(90)
    expect(result.checks.map((c) => c.name)).toEqual([
      'module-executes',
      'constant-time-compare',
      'salted-hash-random',
      'verify-round-trip',
      'unit-tests-pass',
    ])
  }, 60_000)

  it('scores a subtly-wrong module low with wrong-output reasons', async () => {
    const result = await scoreExecutable(SUBTLY_WRONG_CRYPTO, cryptoTask)
    expect(result.fallbackReason).toBeUndefined()
    const byName = Object.fromEntries(result.checks.map((c) => [c.name, c]))
    expect(byName['salted-hash-random'].passed).toBe(false)
    expect(byName['salted-hash-random'].detail).toMatch(/^wrong-output/)
    expect(byName['constant-time-compare'].passed).toBe(false)
    expect(byName['constant-time-compare'].detail).toMatch(/^wrong-output/)
    // The structural scorer likes it (it says all the right words); executing
    // it does not.
    const structural = textScorer.score(SUBTLY_WRONG_CRYPTO, cryptoTask) as number
    expect(structural).toBeGreaterThan(60)
    expect(result.score).toBeLessThan(structural)
  }, 60_000)

  it('reports runtime-error for a module that raises on first call', async () => {
    const result = await scoreExecutable(MISSING_IMPORT_CRYPTO, cryptoTask)
    expect(result.fallbackReason).toBeUndefined()
    const byName = Object.fromEntries(result.checks.map((c) => [c.name, c]))
    expect(byName['salted-hash-random'].passed).toBe(false)
    expect(byName['salted-hash-random'].detail).toMatch(/^runtime-error/)
    expect(byName['salted-hash-random'].detail).toMatch(/hashlib/)
  }, 60_000)

  it('falls back to structural with a codeFallback reason on prose', async () => {
    const prose = 'You should use PBKDF2 with a random salt and compare_digest to verify. Add unit tests.'
    const result = await scoreExecutable(prose, cryptoTask)
    expect(result.fallbackKind).toBe('extraction-failed')
    expect(result.score).toBe(Math.round(result.structural))
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0].name).toBe('code-fallback')
    expect(result.checks[0].maxPoints).toBe(0)
    expect(result.checks[0].detail).toMatch(/^extraction-failed/)
  })
})

describe('equation-solver executable scoring', () => {
  it('scores a program that prints all four pairs high', async () => {
    const result = await scoreExecutable(GOOD_EQUATION, equationTask)
    expect(result.fallbackReason).toBeUndefined()
    expect(result.executed).toBe(result.executedMax)
    expect(result.score).toBeGreaterThanOrEqual(80)
  }, 30_000)

  it('scores a right-shape wrong-values program low with wrong-output', async () => {
    const result = await scoreExecutable(WRONG_EQUATION, equationTask)
    const byName = Object.fromEntries(result.checks.map((c) => [c.name, c]))
    expect(byName['program-runs'].passed).toBe(true)
    expect(byName['solutions-correct'].passed).toBe(false)
    expect(byName['solutions-correct'].detail).toMatch(/^wrong-output/)
    // 30/100 executed → 0.7 × 30 + 0.3 × structural.
    expect(result.score).toBeLessThan(50)
  }, 30_000)

  it('falls back to structural for the prose-only answers on the board', async () => {
    const result = await scoreExecutable(PROSE_ONLY_EQUATION, equationTask)
    expect(result.fallbackKind).toBe('extraction-failed')
    expect(result.score).toBe(Math.round(result.structural))
  })
})

describe('composite arithmetic', () => {
  it('locks the 70/30 split', async () => {
    const result = await scoreExecutable(WRONG_EQUATION, equationTask)
    const executedScore = (result.executed / result.executedMax) * 100
    expect(result.score).toBe(Math.round(executedScore * 0.7 + result.structural * 0.3))
  }, 30_000)

  it('emits IterationCheckResult-shaped breakdowns', async () => {
    const { score, checks } = await executableScorer.scoreWithBreakdown!(
      WRONG_EQUATION,
      equationTask
    )
    expect(typeof score).toBe('number')
    for (const check of checks) {
      expect(Object.keys(check).sort()).toEqual(['detail', 'maxPoints', 'name', 'passed', 'points'])
      expect(typeof check.name).toBe('string')
      expect(typeof check.passed).toBe('boolean')
      expect(typeof check.points).toBe('number')
      expect(typeof check.maxPoints).toBe('number')
    }
  }, 30_000)
})

describe('real stored artifacts', () => {
  // Not asserting SCORES — the numbers belong to
  // docs/lab/llm-benchmark/executable-scoring-impact.md, which measures them
  // over the whole corpus. This asserts the scorer RUNS what models actually
  // emitted (HTML-wrapped code, bare modules, prose) without throwing.
  const stored = BENCHMARK_RESULTS.filter(
    (r) => r.taskId === 'crypto-hash-race' && (r.output ?? '').length > 500
  ).slice(0, 3)

  it('finds real crypto-hash-race artifacts to score', () => {
    expect(stored.length).toBeGreaterThan(0)
  })

  it.runIf(hasPython)('scores them end to end', async () => {
    for (const record of stored) {
      const result = await scoreExecutable(record.output ?? '', cryptoTask)
      expect(result.score, record.modelId).toBeGreaterThanOrEqual(0)
      expect(result.score, record.modelId).toBeLessThanOrEqual(100)
      expect(result.checks.length, record.modelId).toBeGreaterThan(0)
    }
  }, 120_000)
})
