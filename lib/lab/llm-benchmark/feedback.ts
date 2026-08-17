import { formatBenchRef, parseBenchRef } from './bench-ref'

/**
 * Curator feedback on published artifacts — a committed sidecar, never a
 * measurement.
 *
 * The behavioural scorer answers "does Space jump?". It cannot answer "is this
 * artifact any good?", and that judgment is the one signal the board lacks.
 * This is that signal, with the smallest honest contract:
 *
 *   the MAINTAINER rates a record during local review  →  the rating is
 *   committed as data  →  the site DISPLAYS it, labelled as curator judgment.
 *
 * SCOPE — read this before adding a rating button to a page. This is NOT
 * reader/visitor feedback. The site is a STATIC EXPORT: a visitor-write rating
 * needs a Cloudflare Worker, a KV namespace, rate limiting and abuse handling
 * — real infrastructure, and none of it can arrive as a side effect of a
 * display feature. Until that exists, every rating on this site is one
 * person's, it is disclosed as one person's, and the UI must never imply a
 * crowd. (Deferred, deliberately: TODO #14.)
 *
 * Modelled on dsh `packages/feedback`'s `message-feedback`, whose contracts
 * carry over exactly:
 *
 *  - per-item `rating: 'positive' | 'negative'` plus an optional short note;
 *  - a VERSIONED sidecar — `version` increments on every write, and a write
 *    REPLACES the entry rather than appending to a history (see `upsertFeedback`);
 *  - `createdAt` is immutable and `updatedAt` is monotonic;
 *  - feedback NEVER enters model context and is never written into
 *    results.json (`layering.test.ts` enforces both directions structurally).
 *
 * DEVIATION from dsh: the key. dsh keys on its own message id; ours is a
 * `bench://` reference string (#32, `bench-ref.ts`) — the name the board
 * already has for a record and one iteration of it. A second key shape would
 * be a second thing to keep in sync with the same data.
 *
 * Everything here is pure and browser-safe. The filesystem lives in
 * `feedback-cli.ts` + `scripts/bench-feedback.mjs`.
 */

/** The two ratings. There is no neutral: an unrated record simply has no entry. */
export type FeedbackRating = 'positive' | 'negative'

export const FEEDBACK_RATINGS: readonly FeedbackRating[] = ['positive', 'negative']

/**
 * Note length cap, in characters. A note is a caption for a rating — a sentence
 * or two a reader can take in beside the score. Anything longer is a write-up
 * and belongs in the task's MDX or a forensics doc, where it can be edited,
 * linked and reviewed.
 */
export const FEEDBACK_NOTE_MAX = 500

/** One curator rating of one record (or one iteration of it). */
export interface CuratorFeedback {
  /** Canonical `bench://<model>/<task>[/<iteration>]` reference. */
  ref: string
  rating: FeedbackRating
  /** Optional caption, <= FEEDBACK_NOTE_MAX characters. Absent, never empty. */
  note?: string
  /** ISO-8601 UTC, set on first rating and never rewritten. */
  createdAt: string
  /** ISO-8601 UTC, non-decreasing, >= createdAt. */
  updatedAt: string
  /** Opaque equality-only counter, 1 on creation, +1 per write. */
  version: number
}

export type FeedbackErrorCode =
  | 'bad-json'
  | 'not-an-array'
  | 'not-an-object'
  | 'bad-ref'
  | 'duplicate-ref'
  | 'bad-rating'
  | 'bad-note'
  | 'note-too-long'
  | 'bad-timestamp'
  | 'time-travel'
  | 'bad-version'
  | 'unknown-field'

export type FeedbackResult<T> = { ok: true; value: T } | { ok: false; code: FeedbackErrorCode; message: string }

export type LoadedFeedback =
  | { ok: true; entries: CuratorFeedback[] }
  | { ok: false; code: FeedbackErrorCode; message: string }

function fail(code: FeedbackErrorCode, message: string): { ok: false; code: FeedbackErrorCode; message: string } {
  return { ok: false, code, message }
}

/** The fields an entry may carry — anything else is a typo, and typos are rejected. */
const ENTRY_FIELDS = new Set(['ref', 'rating', 'note', 'createdAt', 'updatedAt', 'version'])

/**
 * The canonical spelling of a ref, or undefined when it does not parse.
 *
 * Canonicalising through `parseBenchRef`/`formatBenchRef` is what makes "one
 * entry per record" enforceable: ` bench://m/t ` and `bench://m/t` are the same
 * key, and `bench://m/t/01` — which would round-trip to a different string —
 * is refused rather than silently renamed.
 */
export function canonicalFeedbackRef(ref: string): string | undefined {
  const parsed = parseBenchRef(ref)
  if (!parsed.ok) return undefined
  const canonical = formatBenchRef(parsed.ref)
  return canonical === (ref ?? '').trim() ? canonical : undefined
}

/** ISO-8601 UTC in the exact form `toISOString()` produces — comparable as a string. */
function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}

export function validateFeedbackEntry(value: unknown): FeedbackResult<CuratorFeedback> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail('not-an-object', `expected a feedback object, got ${Array.isArray(value) ? 'an array' : typeof value}`)
  }
  const raw = value as Record<string, unknown>

  for (const field of Object.keys(raw)) {
    if (!ENTRY_FIELDS.has(field)) return fail('unknown-field', `unknown field '${field}'`)
  }

  if (typeof raw.ref !== 'string') return fail('bad-ref', 'ref must be a string')
  const ref = canonicalFeedbackRef(raw.ref)
  if (ref === undefined) return fail('bad-ref', `not a canonical bench:// reference: '${raw.ref}'`)

  if (typeof raw.rating !== 'string' || !FEEDBACK_RATINGS.includes(raw.rating as FeedbackRating)) {
    return fail('bad-rating', `rating must be one of ${FEEDBACK_RATINGS.join(' | ')}, got '${String(raw.rating)}'`)
  }

  let note: string | undefined
  if (raw.note !== undefined) {
    if (typeof raw.note !== 'string') return fail('bad-note', 'note must be a string')
    // An empty note is a rating with a caption that says nothing; ABSENCE is
    // how the shape already spells that, so two spellings would be one too many.
    if (raw.note.trim() === '') return fail('bad-note', 'note is empty — omit it instead')
    if (raw.note.length > FEEDBACK_NOTE_MAX) {
      return fail('note-too-long', `note is ${raw.note.length} characters (max ${FEEDBACK_NOTE_MAX})`)
    }
    note = raw.note
  }

  if (!isTimestamp(raw.createdAt)) return fail('bad-timestamp', `createdAt is not an ISO-8601 UTC timestamp: '${String(raw.createdAt)}'`)
  if (!isTimestamp(raw.updatedAt)) return fail('bad-timestamp', `updatedAt is not an ISO-8601 UTC timestamp: '${String(raw.updatedAt)}'`)
  if (raw.createdAt > raw.updatedAt) {
    return fail('time-travel', `createdAt ${raw.createdAt} is after updatedAt ${raw.updatedAt}`)
  }

  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
    return fail('bad-version', `version must be a positive integer, got ${String(raw.version)}`)
  }

  return {
    ok: true,
    value: {
      ref,
      rating: raw.rating as FeedbackRating,
      ...(note === undefined ? {} : { note }),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    },
  }
}

/** Validate a whole sidecar document (already parsed from JSON). */
export function validateFeedbackEntries(value: unknown): LoadedFeedback {
  if (!Array.isArray(value)) {
    return fail('not-an-array', 'the feedback sidecar must be an array of entries')
  }
  const entries: CuratorFeedback[] = []
  const seen = new Set<string>()
  for (const [index, item] of value.entries()) {
    const validated = validateFeedbackEntry(item)
    if (!validated.ok) return fail(validated.code, `entry ${index}: ${validated.message}`)
    if (seen.has(validated.value.ref)) {
      return fail('duplicate-ref', `entry ${index}: two entries for ${validated.value.ref}`)
    }
    seen.add(validated.value.ref)
    entries.push(validated.value)
  }
  return { ok: true, entries }
}

/** Parse + validate the sidecar's TEXT. Never throws — a hand edit is a typed error. */
export function parseFeedbackFile(text: string): LoadedFeedback {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    return fail('bad-json', `not valid JSON: ${err instanceof Error ? err.message : String(err)}`)
  }
  return validateFeedbackEntries(parsed)
}

/** The bytes the CLI writes: sorted by ref, 2-space, newline-terminated. */
export function serializeFeedback(entries: CuratorFeedback[]): string {
  return `${JSON.stringify(sortByRef(entries), null, 2)}\n`
}

function sortByRef(entries: CuratorFeedback[]): CuratorFeedback[] {
  return [...entries].sort((a, b) => a.ref.localeCompare(b.ref))
}

// ---------------------------------------------------------------------------
// lookup
// ---------------------------------------------------------------------------

export function feedbackFor(entries: CuratorFeedback[], ref: string): CuratorFeedback | undefined {
  const key = canonicalFeedbackRef(ref)
  if (key === undefined) return undefined
  return entries.find((e) => e.ref === key)
}

function refOf(entry: CuratorFeedback): { modelId: string; taskId: string } | undefined {
  const parsed = parseBenchRef(entry.ref)
  return parsed.ok ? parsed.ref : undefined
}

/**
 * Every entry on one (model, task) record — the record-level rating AND any
 * iteration-scoped ones, in ref order. A record and one of its iterations are
 * different subjects, so both are shown rather than one shadowing the other.
 */
export function feedbackForRecord(
  entries: CuratorFeedback[],
  modelId: string,
  taskId: string,
): CuratorFeedback[] {
  return sortByRef(
    entries.filter((e) => {
      const ref = refOf(e)
      return ref?.modelId === modelId && ref.taskId === taskId
    }),
  )
}

/** Every entry on one task, across models — what a task page needs in one pass. */
export function feedbackForTask(entries: CuratorFeedback[], taskId: string): CuratorFeedback[] {
  return sortByRef(entries.filter((e) => refOf(e)?.taskId === taskId))
}

/**
 * Rating tallies for one model — narrowed to one task when `taskId` is given.
 *
 * Counts ENTRIES, not readers: with one curator the tally is at most one per
 * ref, and a "3 positive" only ever means three refs this person rated up.
 * Any UI showing this must say whose judgment it is.
 */
export function aggregateFeedback(
  entries: CuratorFeedback[],
  modelId: string,
  taskId?: string,
): { positive: number; negative: number } {
  const tally = { positive: 0, negative: 0 }
  for (const entry of entries) {
    const ref = refOf(entry)
    if (!ref || ref.modelId !== modelId) continue
    if (taskId !== undefined && ref.taskId !== taskId) continue
    tally[entry.rating] += 1
  }
  return tally
}

// ---------------------------------------------------------------------------
// writes
// ---------------------------------------------------------------------------

export interface FeedbackInput {
  ref: string
  rating: FeedbackRating
  note?: string
}

export type UpsertResult =
  | { ok: true; entries: CuratorFeedback[]; entry: CuratorFeedback; previous?: CuratorFeedback }
  | { ok: false; code: FeedbackErrorCode; message: string }

/**
 * Rate a record — creating the entry or REPLACING it wholesale.
 *
 * dsh's `put` semantics, kept honest:
 *  - `createdAt` survives every rewrite (it is when this record was FIRST judged);
 *  - `updatedAt` is monotonic — a machine whose clock went backwards cannot
 *    make an entry appear to get younger;
 *  - `version` increments, and is EQUALITY-ONLY: it says "this is not the entry
 *    you were looking at", nothing about how much changed;
 *  - REPLACE, not accumulate: re-rating without `--note` clears the note. There
 *    is no history, on purpose — a sidecar that accumulates every revision of a
 *    judgment is a log, and nobody would read it.
 *
 * `now` is injected rather than read from the clock so the semantics above are
 * testable without faking time.
 */
export function upsertFeedback(
  entries: CuratorFeedback[],
  input: FeedbackInput,
  now: string,
): UpsertResult {
  const ref = canonicalFeedbackRef(input.ref)
  if (ref === undefined) return fail('bad-ref', `not a bench:// reference: '${input.ref}'`)
  if (!FEEDBACK_RATINGS.includes(input.rating)) {
    return fail('bad-rating', `rating must be one of ${FEEDBACK_RATINGS.join(' | ')}, got '${String(input.rating)}'`)
  }
  if (!isTimestamp(now)) return fail('bad-timestamp', `now is not an ISO-8601 UTC timestamp: '${now}'`)

  const previous = entries.find((e) => e.ref === ref)
  const createdAt = previous?.createdAt ?? now
  // Monotonic in BOTH directions: never before the previous stamp, never
  // before this entry's own birth.
  const updatedAt = [now, previous?.updatedAt ?? now, createdAt].sort().at(-1) as string

  const candidate = {
    ref,
    rating: input.rating,
    ...(input.note === undefined ? {} : { note: input.note }),
    createdAt,
    updatedAt,
    version: (previous?.version ?? 0) + 1,
  }
  // One validator, one set of rules — the CLI cannot write a shape the loader
  // would refuse.
  const validated = validateFeedbackEntry(candidate)
  if (!validated.ok) return validated

  const entry = validated.value
  return {
    ok: true,
    entries: sortByRef([...entries.filter((e) => e.ref !== ref), entry]),
    entry,
    ...(previous ? { previous } : {}),
  }
}

export function removeFeedback(
  entries: CuratorFeedback[],
  ref: string,
): { entries: CuratorFeedback[]; removed?: CuratorFeedback } {
  const key = canonicalFeedbackRef(ref)
  if (key === undefined) return { entries: [...entries] }
  const removed = entries.find((e) => e.ref === key)
  return {
    entries: entries.filter((e) => e.ref !== key),
    ...(removed ? { removed } : {}),
  }
}
