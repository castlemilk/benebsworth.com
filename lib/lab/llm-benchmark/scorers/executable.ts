import { CODE_FALLBACK_CHECK } from '../types'
import type { BenchmarkTask, IterationCheckResult, Scorer } from '../types'
import { textScorer } from './text'
import { CRYPTO_HASH_RACE_DRIVER } from './crypto-hash-race-driver'
import {
  extractProgram,
  extractPrograms,
  interpreterAvailable,
  runProgram,
  type CodeLanguage,
  type ExecutionResult,
  type ExtractedProgram,
} from './code-runtime'

/**
 * Composite EXECUTABLE scorer — run the code, don't just read it.
 *
 * The structural text scorer answers "does this artifact talk about the right
 * things?". That is a real signal and it stays (30%), but it cannot tell a
 * working module from a plausible one: `gemini-3.6-flash`'s crypto-hash-race
 * answer scored 92.8 structurally while calling `hashlib.pbkdf2_hmac` without
 * ever importing `hashlib` — a `NameError` on the first call. This scorer
 * extracts the model's program, runs it under the code-runtime budget, and
 * takes 70% of the score from what it actually did.
 *
 * The weighting and the fallback discipline are lifted from `behavioral.ts`
 * on purpose — two composite scorers with two different honesty stories would
 * be a worse outcome than one shared, boring one:
 *
 *   score = 0.7 × (executed points / executed max) × 100  +  0.3 × structural
 *
 * ── WHEN IT FALLS BACK (`codeFallback`) ────────────────────────────────────
 *
 * A fallback means THE HARNESS could not judge, so the structural score stands
 * alone at full weight and the reason is carried in the breakdown. Exactly
 * three causes, all harness-side or artifact-shape:
 *
 *   no-probe             the task has no executable probe defined
 *   extraction-failed    there is no program in the artifact to run (every
 *                        equation-solver record on the board today is prose)
 *   runtime-unavailable  no interpreter for the program's language
 *
 * A program that CRASHES, HANGS or ANSWERS WRONG is NOT a fallback — that is
 * the model's result, and it scores accordingly (executed component near 0,
 * with `runtime-error` / `timeout` / `wrong-output` in the failing check's
 * detail). This is a deliberate narrowing of the sketch in TODO #15, which
 * lumped "crashes" in with "can't be extracted": treating a crash as a
 * fallback would hand a broken module its full structural score, which is the
 * exact failure this item exists to remove.
 *
 * The breakdown is `IterationCheckResult[]` — the same shape the behavioural
 * scorer persists — so the UI pills, the failure corpus and the MCP surface
 * consume it unchanged. The checks themselves are node-side, not browser
 * CheckFns, so they are NOT registered in `CHECKS_BY_TASK`; they live in
 * `PROBES` below.
 */

const STRUCTURAL_WEIGHT = 0.3
const EXECUTED_WEIGHT = 0.7

/** Kept in sync with the fallback causes documented above. */
export type CodeFallbackReason = 'no-probe' | 'extraction-failed' | 'runtime-unavailable'

export interface ExecutableScoreResult {
  score: number
  structural: number
  executed: number
  executedMax: number
  checks: IterationCheckResult[]
  /** Present iff the executed component could not be produced at all. */
  fallbackReason?: string
  /** Machine-readable half of `fallbackReason`. */
  fallbackKind?: CodeFallbackReason
  /** What was actually run, when something was. */
  program?: { language: CodeLanguage; origin: string; bytes: number }
}

interface Probe {
  /** Languages to try, in order of preference. */
  languages: CodeLanguage[]
  /** Budget for this probe. */
  timeoutMs: number
  /**
   * Build what actually gets executed. `siblings` are the OTHER accepted
   * blocks of the same origin (a separate test module, typically) — probes
   * that cannot use them ignore the argument.
   */
  plan(
    program: ExtractedProgram,
    siblings: ExtractedProgram[]
  ): {
    entry: ExtractedProgram
    files?: Record<string, string>
  }
  /** Turn one execution into the check breakdown. */
  interpret(result: ExecutionResult): IterationCheckResult[]
}

// ---------------------------------------------------------------------------
// crypto-hash-race
// ---------------------------------------------------------------------------

const RESULT_SENTINEL = '<<<BENCH_RESULT>>>'

/** The checks the driver would have reported, had it got that far. */
const CRYPTO_CHECK_BUDGET: Array<[string, number]> = [
  ['module-executes', 20],
  ['constant-time-compare', 20],
  ['salted-hash-random', 20],
  ['verify-round-trip', 25],
  ['unit-tests-pass', 15],
]

function cryptoFailureBreakdown(detail: string): IterationCheckResult[] {
  return CRYPTO_CHECK_BUDGET.map(([name, maxPoints]) => ({
    name,
    passed: false,
    points: 0,
    maxPoints,
    detail,
  }))
}

const cryptoHashRaceProbe: Probe = {
  languages: ['python'],
  // 30s, not the 5s default, and the reason is the task itself: the prompt
  // asks for PBKDF2, a correct answer uses OWASP-scale iteration counts
  // (600k), and the driver calls the hash ~4 times before the module's own
  // unit tests run. A 5s cap would time out CORRECT modules — the worst
  // possible scoring bug.
  timeoutMs: 30_000,
  plan(program, siblings) {
    // subject_0 is the extractor's top-ranked block; the driver re-ranks by
    // what each block actually PROVIDES once executed, so this order is a hint,
    // not a verdict.
    const files: Record<string, string> = { 'subject_0.py': program.source }
    siblings.slice(0, 4).forEach((extra, i) => {
      files[`subject_${i + 1}.py`] = extra.source
    })
    return {
      entry: { language: 'python', source: CRYPTO_HASH_RACE_DRIVER, origin: program.origin },
      files,
    }
  },
  interpret(result) {
    if (result.failure === 'timeout') {
      return cryptoFailureBreakdown(
        `timeout: the module did not finish within ${cryptoHashRaceProbe.timeoutMs}ms`
      )
    }
    const parsed = parseDriverPayload(result.stdout)
    if (parsed) return parsed
    if (result.failure === 'output-limit') {
      return cryptoFailureBreakdown('output-limit: the module flooded stdout and was stopped')
    }
    // The driver reports module-level crashes itself, so reaching here means
    // the driver process itself died (a syntax error in the subject is caught
    // by `compile`, but e.g. `sys.exit()` at import time is not).
    return cryptoFailureBreakdown(
      `runtime-error: the program exited (${result.exitCode}) without a result — ${lastLine(result.stderr) || 'no stderr'}`
    )
  },
}

/** The LAST non-empty line of a stream — for a traceback that is the actual
 *  error, which is what a reader needs; the first line is just "Traceback". */
function lastLine(text: string): string {
  const lines = text.trim().split('\n').filter(Boolean)
  return (lines[lines.length - 1] ?? '').slice(0, 300)
}

/** The driver's JSON, taken from AFTER the sentinel so the module's own
 *  prints (which are redirected, but belt and braces) cannot be mistaken for
 *  it. */
function parseDriverPayload(stdout: string): IterationCheckResult[] | undefined {
  const index = stdout.lastIndexOf(RESULT_SENTINEL)
  if (index === -1) return undefined
  const payload = stdout.slice(index + RESULT_SENTINEL.length).trim()
  try {
    const parsed = JSON.parse(payload) as { checks?: unknown }
    if (!Array.isArray(parsed.checks)) return undefined
    return parsed.checks.map((c) => {
      const check = c as Record<string, unknown>
      return {
        name: String(check.name),
        passed: Boolean(check.passed),
        points: Number(check.points) || 0,
        maxPoints: Number(check.maxPoints) || 0,
        detail: typeof check.detail === 'string' ? check.detail : undefined,
      }
    })
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// equation-solver
// ---------------------------------------------------------------------------

/**
 * The system from the prompt, verbatim: x² + y² = 25 and x·y = 12. The four
 * real pairs are derived, not asserted — a printed pair is checked by
 * SUBSTITUTION, and the completeness check compares against the closed-form
 * set below (s = x+y satisfies s² = 25 + 2·12 = 49, so s = ±7; t² ∓ 7t + 12
 * gives {3,4} and {-3,-4}).
 */
const EQUATION_SOLUTIONS: Array<[number, number]> = [
  [3, 4],
  [4, 3],
  [-3, -4],
  [-4, -3],
]

const EQUATION_TOLERANCE = 1e-6

function satisfiesSystem(x: number, y: number): boolean {
  return (
    Math.abs(x * x + y * y - 25) <= EQUATION_TOLERANCE && Math.abs(x * y - 12) <= EQUATION_TOLERANCE
  )
}

const NUMBER = String.raw`-?\d+(?:\.\d+)?`
const PAIR_PATTERNS = [
  new RegExp(String.raw`[([]\s*(${NUMBER})\s*,\s*(${NUMBER})\s*[)\]]`, 'g'),
  new RegExp(String.raw`x\s*=\s*(${NUMBER})\b[^\n]{0,40}?y\s*=\s*(${NUMBER})`, 'gi'),
]

/** Solution pairs a program PRINTED, however it chose to format them. */
export function parseSolutionPairs(text: string): Array<[number, number]> {
  const normalized = text.replace(/[−–]/g, '-')
  const pairs: Array<[number, number]> = []
  const seen = new Set<string>()
  for (const pattern of PAIR_PATTERNS) {
    pattern.lastIndex = 0
    for (const match of normalized.matchAll(pattern)) {
      const x = Number(match[1])
      const y = Number(match[2])
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      const key = `${x}|${y}`
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push([x, y])
    }
  }
  return pairs
}

const equationSolverProbe: Probe = {
  // Whatever the model wrote: the prompt names no language, so both are fair.
  languages: ['python', 'javascript'],
  timeoutMs: 10_000,
  plan(program) {
    return { entry: program }
  },
  interpret(result) {
    const ran = result.failure === undefined
    const runDetail = ran
      ? `program exited 0 in ${result.durationMs}ms`
      : `${result.failure}: ${lastLine(result.stderr) || `exit ${result.exitCode}`}`
    const checks: IterationCheckResult[] = [
      { name: 'program-runs', passed: ran, points: ran ? 30 : 0, maxPoints: 30, detail: runDetail },
    ]

    const printed = parseSolutionPairs(result.stdout)
    const valid = printed.filter(([x, y]) => satisfiesSystem(x, y))
    const invalid = printed.filter(([x, y]) => !satisfiesSystem(x, y))
    const missing = EQUATION_SOLUTIONS.filter(
      ([x, y]) => !valid.some(([px, py]) => Math.abs(px - x) < EQUATION_TOLERANCE && Math.abs(py - y) < EQUATION_TOLERANCE)
    )

    // PASS = all four required pairs printed AND each verified by substitution.
    // An extraneous parenthesised pair that does NOT satisfy the system is
    // reported but does NOT fail the check: the parser reads stdout, and stdout
    // legitimately contains derivation intermediates — `(s, p) = (7, 12)`, a
    // quadratic's coefficients, a coordinate in prose. Zeroing 70 points
    // because a correct program showed its working was the harness marking a
    // right answer wrong. The four required pairs are the claim; everything
    // else is listed for the reader and judged by nothing.
    const complete = missing.length === 0
    let detail: string
    const extraneous =
      invalid.length > 0
        ? ` (ignored ${invalid.length} non-verifying pair(s) as derivation intermediates: ${invalid
            .map(([x, y]) => `(${x}, ${y})`)
            .join(' ')})`
        : ''
    if (printed.length === 0) {
      detail = 'wrong-output: the program printed no solution pair'
    } else if (complete) {
      detail = `all four real pairs printed and verified against x²+y²=25, xy=12${extraneous}`
    } else {
      detail =
        `wrong-output: missing ${missing.map(([x, y]) => `(${x}, ${y})`).join(' ')}` + extraneous
    }
    checks.push({
      name: 'solutions-correct',
      passed: complete,
      points: complete ? 70 : 0,
      maxPoints: 70,
      detail,
    })
    return checks
  },
}

const PROBES: Record<string, Probe> = {
  'crypto-hash-race': cryptoHashRaceProbe,
  'equation-solver': equationSolverProbe,
}

/** Task ids this scorer can actually execute (the rest fall back). */
export function executableProbeTaskIds(): string[] {
  return Object.keys(PROBES).sort()
}

// ---------------------------------------------------------------------------
// composite
// ---------------------------------------------------------------------------

function fallback(
  structural: number,
  kind: CodeFallbackReason,
  detail: string
): ExecutableScoreResult {
  return {
    score: Math.round(structural),
    structural,
    executed: 0,
    executedMax: 0,
    // ONE breakdown row, maxPoints 0 so it cannot skew any max sum, carrying
    // the reason — the behavioural scorer returns [] here, which loses the
    // "why" the moment the record is read back out of results.json.
    //
    // `kind: 'fallback'` is what stops that row from being read as a MODEL
    // failure. `passed: false` is honest (nothing was judged), but three
    // consumers treat a named failing check as evidence about the model — the
    // failure corpus would ingest a prose answer as a broken artifact, and
    // `failureSignature` would "relate" every un-runnable artifact in the board
    // to every other one. See `isFallbackCheck` in types.ts.
    checks: [
      {
        name: CODE_FALLBACK_CHECK,
        passed: false,
        points: 0,
        maxPoints: 0,
        kind: 'fallback',
        detail: `${kind}: ${detail}`,
      },
    ],
    fallbackReason: `${kind}: ${detail}`,
    fallbackKind: kind,
  }
}

export async function scoreExecutable(
  output: string,
  task: BenchmarkTask
): Promise<ExecutableScoreResult> {
  const structural = textScorer.score(output, task) as number
  const probe = PROBES[task.id]
  if (!probe) {
    return fallback(structural, 'no-probe', `task '${task.id}' has no executable probe`)
  }

  let program: ExtractedProgram | undefined
  let siblings: ExtractedProgram[] = []
  const extractionDetails: string[] = []
  for (const language of probe.languages) {
    const extracted = extractProgram(output, { prefer: language })
    if (!extracted.ok) {
      extractionDetails.push(extracted.detail)
      continue
    }
    if (!interpreterAvailable(language)) {
      return fallback(
        structural,
        'runtime-unavailable',
        `no interpreter for ${language} on this machine`
      )
    }
    program = extracted.program
    siblings = extractPrograms(output, { prefer: language }).slice(1)
    break
  }

  if (!program) {
    return fallback(structural, 'extraction-failed', extractionDetails.join('; '))
  }

  const { entry, files } = probe.plan(program, siblings)
  const execution = await runProgram(entry, { timeoutMs: probe.timeoutMs, files })
  const checks = probe.interpret(execution)

  const executedMax = checks.reduce((sum, c) => sum + c.maxPoints, 0)
  const executed = checks.reduce((sum, c) => sum + c.points, 0)
  const executedScore = executedMax > 0 ? (executed / executedMax) * 100 : 0
  const score = Math.round(executedScore * EXECUTED_WEIGHT + structural * STRUCTURAL_WEIGHT)

  return {
    score,
    structural,
    executed,
    executedMax,
    checks,
    program: { language: program.language, origin: program.origin, bytes: program.source.length },
  }
}

export const executableScorer: Scorer = {
  score: async (output, task) => (await scoreExecutable(output, task)).score,
  scoreWithBreakdown: async (output, task) => {
    const result = await scoreExecutable(output, task)
    return { score: result.score, checks: result.checks }
  },
}
