import type { BenchmarkTask, Scorer } from '../types'

const EXPECTED_KEYWORDS: Record<string, string[]> = {
  'crypto-hash-race': [
    'compare_digest',
    'pbkdf2',
    'salt',
    'verify',
    'unittest',
    'hmac',
  ],
  'equation-solver': [
    'x',
    'y',
    'solution',
    '12',
    '25',
    'x^2',
    'y^2',
  ],
}

export const textScorer: Scorer = {
  score(output: string, task: BenchmarkTask): number {
    const text = output.trim()
    if (!text) return 0

    const lower = text.toLowerCase()
    let score = 0

    const keywords = EXPECTED_KEYWORDS[task.id] ?? []
    if (keywords.length > 0) {
      const matches = keywords.filter((kw) => lower.includes(kw.toLowerCase())).length
      score += Math.min(60, matches * 12)
    }

    // Generic text/math heuristics
    if (lower.includes('=')) score += 10
    if (/[0-9]/.test(text)) score += 10
    if (text.length > 200) score += 10

    // Absence of obvious broken/error markers
    if (!/undefined|null|error|exception|traceback/.test(lower)) score += 10

    return Math.min(100, score)
  },
}
