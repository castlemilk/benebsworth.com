import type {
  BenchmarkModel,
  BenchmarkResult,
  BenchmarkTask,
  IterationCheckResult,
} from './types'

/**
 * Cross-run references — `bench://` URIs and failure-signature neighbours.
 *
 * A run trace answers "what happened in THIS run". It cannot answer the
 * question a reader actually has in front of a 0/100: "did anything else fail
 * the same way?" — nor can an agent writing a report point at another run's
 * evidence. Both need a NAME for a run (and for one iteration of it), and a
 * cheap way to find runs that tripped the same checks.
 *
 * Two halves, both pure and browser-safe (the trace UI is a client component
 * and imports the tokenizer):
 *
 *  - **The URI.** `bench://<modelId>/<taskId>[/<iterationIndex>][?run=<runId>]`
 *    with `formatBenchRef` / `parseBenchRef` / `resolveBenchRef`.
 *  - **The neighbourhood.** `failureSignature` (which checks failed) and
 *    `relatedRuns` (who else failed them, ranked).
 *
 * DEVIATION from the dsh `session-reference` scheme this is modelled on
 * (`dsh-session:<base64url(json)>`): ours is PLAIN TEXT, not base64. dsh's
 * payload is arbitrary JSON — a cwd, a capture seq, a message window — so it
 * needed an envelope. Ours is three URL-safe slugs that already exist as ids,
 * and a reference a reader can eyeball in a log line ("oh, that's nemotron on
 * the platformer") is worth more here than encodable arbitrariness. If a
 * future ref ever needs structured payload, that is a new scheme, not base64
 * bolted onto this one.
 *
 * NOTHING EMITS THESE YET. The format exists so an agent (or a hand-written
 * note) can cite one and the trace UI will render it as a link; the harness
 * itself writes no `bench://` strings into run logs.
 */

/** The URI scheme, separator included — the one place the literal lives. */
export const BENCH_REF_SCHEME = 'bench://'

/** A pointer at one record on the board, optionally at one iteration of it. */
export interface BenchRef {
  modelId: string
  taskId: string
  /** 0-based index into the record's successful iterations. */
  iterationIndex?: number
  /** The sweep run that produced it — `runLogRef.runId`. */
  runId?: string
}

export type BenchRefParseCode =
  | 'empty'
  | 'bad-scheme'
  | 'bad-shape'
  | 'bad-model-id'
  | 'bad-task-id'
  | 'bad-iteration'
  | 'bad-run-id'
  | 'bad-query'

export type ParsedBenchRef =
  | { ok: true; ref: BenchRef }
  | { ok: false; code: BenchRefParseCode; message: string }

/**
 * Model/task ids as the rest of the harness already constrains them
 * (`traces.isSafePathSegment`): these strings end up in URLs and, via the
 * trace publication, in paths — so no separators, no traversal, no dotfiles.
 */
const ID = /^[a-z0-9][a-z0-9._-]*$/i
/** Run ids additionally contain `:`-free timestamp punctuation (`2026-08-16T09-30-12`). */
const RUN_ID = /^[a-z0-9][a-z0-9._:-]*$/i

function bad(code: BenchRefParseCode, message: string): ParsedBenchRef {
  return { ok: false, code, message }
}

function isId(value: string): boolean {
  return ID.test(value) && !value.includes('..')
}

export function formatBenchRef(ref: BenchRef): string {
  const iteration = ref.iterationIndex === undefined ? '' : `/${ref.iterationIndex}`
  const run = ref.runId ? `?run=${ref.runId}` : ''
  return `${BENCH_REF_SCHEME}${ref.modelId}/${ref.taskId}${iteration}${run}`
}

/**
 * Parse a `bench://` URI. NEVER throws: a ref can arrive from a fetched run
 * log, a URL bar, or an agent's prose, so every rejection is a typed code the
 * caller can render (or ignore, as the trace UI does — an unparseable ref
 * stays plain text there).
 */
export function parseBenchRef(uri: string): ParsedBenchRef {
  const trimmed = (uri ?? '').trim()
  if (trimmed === '') return bad('empty', 'empty reference')
  if (!trimmed.toLowerCase().startsWith(BENCH_REF_SCHEME)) {
    return bad('bad-scheme', `not a ${BENCH_REF_SCHEME} reference`)
  }

  const rest = trimmed.slice(BENCH_REF_SCHEME.length)
  const queryAt = rest.indexOf('?')
  const path = queryAt === -1 ? rest : rest.slice(0, queryAt)
  const query = queryAt === -1 ? '' : rest.slice(queryAt + 1)

  const segments = path.split('/')
  if (segments.length < 2 || segments.length > 3) {
    return bad('bad-shape', 'expected <modelId>/<taskId>[/<iterationIndex>]')
  }

  const [modelId, taskId, iterationSegment] = segments
  if (!isId(modelId)) return bad('bad-model-id', `not a model id: '${modelId}'`)
  if (!isId(taskId)) return bad('bad-task-id', `not a task id: '${taskId}'`)

  const ref: BenchRef = { modelId, taskId }

  if (iterationSegment !== undefined) {
    // Integer, non-negative, canonical: `01` and `1.0` name the same iteration
    // as `1` and would break round-tripping, so they are refusals.
    if (!/^\d+$/.test(iterationSegment) || String(Number(iterationSegment)) !== iterationSegment) {
      return bad('bad-iteration', `not an iteration index: '${iterationSegment}'`)
    }
    ref.iterationIndex = Number(iterationSegment)
  }

  if (query !== '') {
    const [key, ...valueParts] = query.split('=')
    const value = valueParts.join('=')
    if (key !== 'run') return bad('bad-query', `unknown query parameter: '${key}'`)
    if (!RUN_ID.test(value) || value.includes('..')) {
      return bad('bad-run-id', `not a run id: '${value}'`)
    }
    ref.runId = value
  }

  return { ok: true, ref }
}

/**
 * Split free text into plain runs and parsed `bench://` refs — what the trace
 * UI needs to linkify an error/detail string without an HTML parser. A token
 * that LOOKS like a ref but does not parse is returned as text, so a malformed
 * citation degrades to exactly what it already was: characters on the screen.
 */
export function tokenizeBenchRefs(
  text: string,
): Array<{ kind: 'text'; value: string } | { kind: 'ref'; value: string; ref: BenchRef }> {
  const parts: Array<{ kind: 'text'; value: string } | { kind: 'ref'; value: string; ref: BenchRef }> = []
  const pattern = /bench:\/\/\S+/gi
  let last = 0
  let pending = ''
  for (const match of text.matchAll(pattern)) {
    const start = match.index
    const raw = match[0]
    const parsed = parseBenchRef(raw)
    if (!parsed.ok) continue // leave it in the surrounding text run
    pending += text.slice(last, start)
    if (pending !== '') {
      parts.push({ kind: 'text', value: pending })
      pending = ''
    }
    parts.push({ kind: 'ref', value: raw, ref: parsed.ref })
    last = start + raw.length
  }
  const tail = pending + text.slice(last)
  if (tail !== '') parts.push({ kind: 'text', value: tail })
  return parts
}

// ---------------------------------------------------------------------------
// resolution
// ---------------------------------------------------------------------------

/** The board a ref is resolved against — passed in, so this module stays pure. */
export interface BenchBoard {
  models: BenchmarkModel[]
  tasks: BenchmarkTask[]
  results: BenchmarkResult[]
}

export type BenchRefMissCode =
  | BenchRefParseCode
  | 'unknown-model'
  | 'unknown-task'
  | 'no-result'
  | 'run-mismatch'
  | 'iteration-out-of-range'

export type ResolvedBenchRef =
  | {
      ok: true
      ref: BenchRef
      model: BenchmarkModel
      task: BenchmarkTask
      result: BenchmarkResult
      /** Present only when the ref named an iteration AND the record recorded one. */
      iterationScore?: number
      iterationChecks?: IterationCheckResult[]
    }
  | { ok: false; code: BenchRefMissCode; message: string }

/** The record a ref points at, or undefined. One record per (model, task). */
export function findResultForRef(
  results: BenchmarkResult[],
  ref: Pick<BenchRef, 'modelId' | 'taskId'>,
): BenchmarkResult | undefined {
  return results.find((r) => r.modelId === ref.modelId && r.taskId === ref.taskId)
}

/**
 * How many iterations a record can be indexed by. `iterationScores` is the
 * authority (it is the list of SUCCESSFUL iterations, which is what the
 * per-iteration views enumerate); the check lists are the fallback for records
 * that predate it; `iterations` — the CONFIGURED count — is the last resort and
 * is deliberately last, because it counts attempts, not evidence.
 */
function iterationCount(result: BenchmarkResult): number {
  return result.iterationScores?.length ?? result.iterationCheckResults?.length ?? result.iterations
}

/**
 * Resolve a `bench://` URI against a board. A miss is typed and never thrown:
 * refs outlive the data they name (a model is retired, a sweep replaces a
 * record with one from a different run) and "this citation no longer resolves"
 * is a fact worth rendering, not an exception.
 */
export function resolveBenchRef(uri: string, board: BenchBoard): ResolvedBenchRef {
  const parsed = parseBenchRef(uri)
  if (!parsed.ok) return parsed
  const { ref } = parsed

  const model = board.models.find((m) => m.id === ref.modelId)
  if (!model) return { ok: false, code: 'unknown-model', message: `no model '${ref.modelId}'` }
  const task = board.tasks.find((t) => t.id === ref.taskId)
  if (!task) return { ok: false, code: 'unknown-task', message: `no task '${ref.taskId}'` }

  const result = findResultForRef(board.results, ref)
  if (!result) {
    return {
      ok: false,
      code: 'no-result',
      message: `no recorded run of '${ref.taskId}' by '${ref.modelId}'`,
    }
  }

  // A run-pinned ref cites SPECIFIC evidence. The board keeps one record per
  // (model, task), so a later sweep silently replaces it — resolving the pin to
  // whatever is there now would hand back different numbers under the same
  // citation, which is the failure mode the pin exists to prevent.
  if (ref.runId && result.runLogRef?.runId !== ref.runId) {
    return {
      ok: false,
      code: 'run-mismatch',
      message: `the board's record for this pair is from run '${result.runLogRef?.runId ?? 'unknown'}', not '${ref.runId}'`,
    }
  }

  if (ref.iterationIndex !== undefined && ref.iterationIndex >= iterationCount(result)) {
    return {
      ok: false,
      code: 'iteration-out-of-range',
      message: `iteration ${ref.iterationIndex} of ${iterationCount(result)}`,
    }
  }

  return {
    ok: true,
    ref,
    model,
    task,
    result,
    iterationScore:
      ref.iterationIndex === undefined ? undefined : result.iterationScores?.[ref.iterationIndex],
    iterationChecks:
      ref.iterationIndex === undefined ? undefined : result.iterationCheckResults?.[ref.iterationIndex],
  }
}

// ---------------------------------------------------------------------------
// failure signatures + related runs
// ---------------------------------------------------------------------------

/**
 * The set of behavioural checks this record failed in AT LEAST ONE iteration,
 * deduped and sorted — its failure signature.
 *
 * "Any iteration", not "every iteration", on purpose: a check that passed 4/5
 * still describes a real, reproducible defect, and flaky-in-the-same-place is
 * exactly the correspondence a reader is looking for. Empty for text-only
 * tasks, for legacy records with no `iterationCheckResults`, and for a clean
 * sweep — an empty signature means "nothing to relate", never "unknown".
 *
 * Unnamed checks are dropped: a scorer that crashed records `name: ''`, and an
 * empty name would match every other crash as if it were a shared behaviour.
 */
export function failureSignature(result: BenchmarkResult): string[] {
  const failed = new Set<string>()
  for (const iteration of result.iterationCheckResults ?? []) {
    for (const check of iteration) {
      if (!check.passed && check.name) failed.add(check.name)
    }
  }
  return [...failed].sort()
}

/** Which relationship earned a candidate its place — same task, same model, or neither. */
export type RelatedRunTier = 'same-task' | 'same-model' | 'other'

export interface RelatedRun {
  ref: BenchRef
  /** Checks failed by BOTH runs, sorted. Never empty. */
  sharedChecks: string[]
  tier: RelatedRunTier
}

const TIER_ORDER: Record<RelatedRunTier, number> = { 'same-task': 0, 'same-model': 1, other: 2 }

/**
 * Runs that failed at least one of the same checks as `target`, ranked.
 *
 * The ranking is dsh's `listCandidates` shape (proximity first, then strength):
 * same task beats same model beats everything else, because "who else failed
 * to make the platformer jump" is a sharper question than "what else did this
 * model break"; within a tier the larger shared signature wins, and ties break
 * newest-first.
 *
 * Excluded: the target itself, and SEEDED records — hand-authored sample data
 * has hand-authored checks, and citing it as corroborating evidence would be
 * citing a fixture.
 */
export function relatedRuns(
  target: BenchmarkResult,
  all: BenchmarkResult[],
  options: { limit?: number } = {},
): RelatedRun[] {
  const limit = options.limit ?? 5
  if (limit <= 0) return []
  const signature = failureSignature(target)
  if (signature.length === 0) return []
  const wanted = new Set(signature)

  const rows: Array<RelatedRun & { createdAt: string }> = []
  for (const candidate of all) {
    if (candidate.modelId === target.modelId && candidate.taskId === target.taskId) continue
    if (candidate.source === 'seeded') continue
    const shared = failureSignature(candidate).filter((name) => wanted.has(name))
    if (shared.length === 0) continue
    rows.push({
      ref: {
        modelId: candidate.modelId,
        taskId: candidate.taskId,
        ...(candidate.runLogRef ? { runId: candidate.runLogRef.runId } : {}),
      },
      sharedChecks: shared,
      tier:
        candidate.taskId === target.taskId
          ? 'same-task'
          : candidate.modelId === target.modelId
            ? 'same-model'
            : 'other',
      createdAt: candidate.createdAt,
    })
  }

  rows.sort(
    (a, b) =>
      TIER_ORDER[a.tier] - TIER_ORDER[b.tier] ||
      b.sharedChecks.length - a.sharedChecks.length ||
      b.createdAt.localeCompare(a.createdAt) ||
      // Last resort: a stable, data-independent order, so the same board always
      // renders the same panel (a static build must be reproducible).
      `${a.ref.modelId}/${a.ref.taskId}`.localeCompare(`${b.ref.modelId}/${b.ref.taskId}`),
  )

  return rows.slice(0, limit).map(({ createdAt: _createdAt, ...row }) => row)
}
