import type { BenchmarkTask, Scorer } from '../types'

/**
 * Discriminating per-task patterns. Word-boundary regexes so keyword-stuffed
 * garbage ("x y 12 25 = ...") can't collect points that should require the
 * actual implementation. Task-specific points are capped at 60.
 */
const TASK_PATTERNS: Record<string, { pattern: RegExp; points: number }[]> = {
  'crypto-hash-race': [
    { pattern: /\bcompare_digest\b/i, points: 12 },
    { pattern: /\bpbkdf2(?:_hmac)?\b/i, points: 12 },
    { pattern: /\bsalt\b/i, points: 12 },
    { pattern: /\bverify\b/i, points: 12 },
    { pattern: /\bunittest\b|\bpytest\b/i, points: 6 },
    { pattern: /\bhmac\b/i, points: 6 },
  ],
}

/**
 * Real solutions of x² + y² = 25, xy = 12: (3,4), (4,3), (-3,-4), (-4,-3).
 * Match either "(3, 4)" tuples or "x = 3 ... y = 4" assignments.
 */
const EQUATION_SOLUTION_PAIRS: [string, string][] = [
  ['3', '4'],
  ['4', '3'],
  ['-3', '-4'],
  ['-4', '-3'],
]

function countEquationSolutionPairs(text: string): number {
  // Normalize unicode minus/en-dash so "(−3, −4)" counts.
  const t = text.replace(/[−–]/g, '-')
  let count = 0
  for (const [a, b] of EQUATION_SOLUTION_PAIRS) {
    const tuple = new RegExp(`\\(\\s*${a}\\s*,\\s*${b}\\s*\\)`)
    const assigned = new RegExp(`x\\s*=\\s*${a}\\b[^\\n]{0,40}?\\by\\s*=\\s*${b}\\b`)
    if (tuple.test(t) || assigned.test(t)) count++
  }
  return count
}

/**
 * Genuine runtime-error transcript markers only — legitimate code that merely
 * contains the words "error"/"exception" (e.g. `except Exception:`) must not
 * be penalized.
 */
const RUNTIME_ERROR_MARKERS = /traceback \(most recent call last\)|unhandled exception|syntaxerror/i

export const textScorer: Scorer = {
  score(output: string, task: BenchmarkTask): number {
    const text = output.trim()
    if (!text) return 0

    let score = 0

    if (task.id === 'equation-solver') {
      // Require the actual solution pairs, not loose keyword presence.
      const pairs = countEquationSolutionPairs(text)
      if (pairs >= 2) score += 50
      else if (pairs === 1) score += 20

      // Supporting work: references the actual system being solved.
      if (/x\s*(?:\^\s*2|²|\*\*\s*2)/i.test(text)) score += 5
      if (/y\s*(?:\^\s*2|²|\*\*\s*2)/i.test(text)) score += 5
      if (/\b25\b/.test(text)) score += 5
      if (/\b12\b/.test(text)) score += 5
    } else {
      const patterns = TASK_PATTERNS[task.id] ?? []
      if (patterns.length > 0) {
        const matched = patterns.reduce(
          (sum, { pattern, points }) => (pattern.test(text) ? sum + points : sum),
          0
        )
        score += Math.min(60, matched)
      }
    }

    // Generic text/math heuristics
    if (text.includes('=')) score += 10
    if (/[0-9]/.test(text)) score += 10
    if (text.length > 200) score += 10

    // Absence of genuine runtime-error transcript markers
    if (!RUNTIME_ERROR_MARKERS.test(text)) score += 10

    return Math.min(100, score)
  },
}
