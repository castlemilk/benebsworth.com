import { parseBenchRef, resolveBenchRef } from './bench-ref'
import type { BenchBoard } from './bench-ref'
import { FEEDBACK_RATINGS, FEEDBACK_NOTE_MAX, canonicalFeedbackRef } from './feedback'
import type { CuratorFeedback, FeedbackRating } from './feedback'

/**
 * The pure half of `scripts/bench-feedback.mjs` — argument parsing, the
 * resolve gate, and the list rendering.
 *
 * Same split as `transcript.ts` / `retrace.mjs`: the script owns the
 * filesystem and the process, this owns everything that can be decided from
 * values alone, so the rules are unit-testable without writing to the
 * committed sidecar.
 *
 * Imported ONLY by the script (and its tests). Nothing in the model-facing
 * path may reach it — see the feedback isolation rules in `layering.test.ts`.
 */

export const FEEDBACK_USAGE = [
  'Usage: npx tsx scripts/bench-feedback.mjs --ref <bench://…> --rating positive|negative [--note "…"]',
  '       npx tsx scripts/bench-feedback.mjs --list [--model <id>]',
  '       npx tsx scripts/bench-feedback.mjs --rm --ref <bench://…>',
].join('\n')

export type FeedbackCommand =
  | { command: 'upsert'; ref: string; rating: FeedbackRating; note?: string }
  | { command: 'list'; model?: string }
  | { command: 'remove'; ref: string }
  | { command: 'help' }

export type ParsedFeedbackArgs =
  | { ok: true; options: FeedbackCommand }
  | { ok: false; message: string }

function bad(message: string): ParsedFeedbackArgs {
  return { ok: false, message }
}

/**
 * Parse the CLI's arguments into exactly one command.
 *
 * House style (`retrace.mjs`, `verify-results.mjs`): explicit flags, no
 * abbreviations, an unknown argument is fatal rather than ignored. The one
 * addition here is that the MODE is decided before anything is validated, so
 * `--list --rating positive` is a refusal ("--rating is not valid with --list")
 * rather than a silently-ignored flag on a read-only command.
 */
export function parseFeedbackArgs(argv: string[]): ParsedFeedbackArgs {
  const raw: {
    ref?: string
    rating?: string
    note?: string
    model?: string
    list: boolean
    rm: boolean
    help: boolean
  } = { list: false, rm: false, help: false }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--list') raw.list = true
    else if (arg === '--rm') raw.rm = true
    else if (arg === '--help' || arg === '-h') raw.help = true
    else if (arg === '--ref') raw.ref = argv[++i]
    else if (arg === '--rating') raw.rating = argv[++i]
    else if (arg === '--note') raw.note = argv[++i]
    else if (arg === '--model') raw.model = argv[++i]
    else return bad(`Unknown argument: ${arg}`)
  }

  if (raw.help) return { ok: true, options: { command: 'help' } }
  if (raw.list && raw.rm) return bad('--list and --rm are mutually exclusive')

  if (raw.list) {
    if (raw.ref !== undefined) return bad('--ref is not valid with --list (use --model to narrow)')
    if (raw.rating !== undefined) return bad('--rating is not valid with --list')
    if (raw.note !== undefined) return bad('--note is not valid with --list')
    return { ok: true, options: { command: 'list', ...(raw.model ? { model: raw.model } : {}) } }
  }

  if (raw.rm) {
    if (raw.rating !== undefined || raw.note !== undefined) {
      return bad('--rating and --note are not valid with --rm')
    }
    if (!raw.ref) return bad('--rm needs the --ref to remove')
    if (canonicalFeedbackRef(raw.ref) === undefined) {
      return bad(`--ref is not a canonical bench:// reference: '${raw.ref}'`)
    }
    return { ok: true, options: { command: 'remove', ref: raw.ref.trim() } }
  }

  // Default mode: rate. Both flags are required — a rating with no ref has no
  // subject, and a ref with no rating is not a judgment.
  if (raw.model !== undefined) return bad('--model only narrows --list')
  if (!raw.ref && raw.rating === undefined && raw.note === undefined) {
    return bad('nothing to do — pass --ref + --rating, --list, or --rm --ref')
  }
  if (!raw.ref) return bad('--ref is required')
  if (canonicalFeedbackRef(raw.ref) === undefined) {
    return bad(`--ref is not a canonical bench:// reference: '${raw.ref}'`)
  }
  if (raw.rating === undefined) return bad('--rating is required (positive|negative)')
  if (!FEEDBACK_RATINGS.includes(raw.rating as FeedbackRating)) {
    return bad(`--rating must be one of ${FEEDBACK_RATINGS.join('|')}, got '${raw.rating}'`)
  }
  if (raw.note !== undefined) {
    if (raw.note.trim() === '') return bad('--note is empty — omit the flag instead')
    if (raw.note.length > FEEDBACK_NOTE_MAX) {
      return bad(`--note is ${raw.note.length} characters (max ${FEEDBACK_NOTE_MAX})`)
    }
  }

  return {
    ok: true,
    options: {
      command: 'upsert',
      ref: raw.ref.trim(),
      rating: raw.rating as FeedbackRating,
      ...(raw.note === undefined ? {} : { note: raw.note }),
    },
  }
}

/**
 * The resolve gate: a rating may only name a record the board actually has.
 *
 * dsh's feedback keys a message that exists in the session it was written
 * against; ours keys a `bench://` reference, and an unresolvable one is a
 * judgment about nothing — it would render nowhere, verify as a failure, and
 * quietly rot. Catching it at WRITE time is the cheap moment: the curator is
 * looking at the record and can fix the ref in a second.
 */
export function gateFeedbackRef(
  ref: string,
  board: BenchBoard,
): { ok: true } | { ok: false; message: string } {
  const resolved = resolveBenchRef(ref, board)
  if (resolved.ok) return { ok: true }
  return { ok: false, message: `${ref} does not resolve (${resolved.code}): ${resolved.message}` }
}

/**
 * `--list`, as text. One line per entry, ref first (it is the identity), then
 * the rating glyph, the version, and the note.
 */
export function renderFeedbackList(
  entries: CuratorFeedback[],
  options: { model?: string } = {},
): string {
  const matching = entries.filter((entry) => {
    if (!options.model) return true
    const parsed = parseBenchRef(entry.ref)
    return parsed.ok && parsed.ref.modelId === options.model
  })

  if (matching.length === 0) {
    return options.model
      ? `no curator feedback for model '${options.model}'`
      : 'no curator feedback recorded'
  }

  const lines = matching.map((entry) => {
    const glyph = entry.rating === 'positive' ? '+' : '-'
    const head = `${glyph} ${entry.ref}  (v${entry.version}, updated ${entry.updatedAt})`
    return entry.note ? `${head}\n    ${entry.note}` : head
  })
  return [...lines, '', `${matching.length} entr${matching.length === 1 ? 'y' : 'ies'}`].join('\n')
}
