import probesJson from './probes/probes.json'
import { SANDBOX_CONSTRAINTS } from './prompts'

/**
 * Prompt-regression probes — the cheap narrow evals that gate a sweep.
 *
 * A full sweep is hours and dollars. Editing the sandbox contract
 * (`prompts.ts`) or a task prompt used to have NO behavioural gate between the
 * edit and that spend: the unit tests assert the prompt TEXT, never what a
 * model does when it reads it. A probe is one short prompt plus deterministic
 * assertions on the raw reply — a handful of seconds and (on the free tier)
 * zero dollars, run before the expensive path.
 *
 * DECLARATIVE BY CONSTRUCTION. The upstream inspiration (paperclip's
 * promptfoo stage-1 evals) allows inline JavaScript assertions in the case
 * files. This repo PUBLISHES its harness, so probes are pure data
 * (`probes/probes.json`, inert like `sweep-profiles.json`) and this module is
 * the only thing that interprets them: five assert kinds, no `eval`, no
 * function values. The cost is expressiveness — a probe cannot compute; the
 * gain is that a probe file is auditable at a glance and can never execute.
 *
 * Assert what the model must NOT do as much as what it must: half the shipped
 * asserts are negative (`not-contains` / `not-matches`), because a contract
 * violation (a CDN <script src>, an attribute-sized <canvas>, a `window.alert`)
 * is exactly what a contract edit regresses.
 *
 * CONTRACT TEXT IS NEVER COPIED INTO THE DATA. A probe that tests the global
 * contract sets `appendGlobalContract: true` and `probePrompt()` appends the
 * REAL `SANDBOX_CONSTRAINTS` at run time. A copy in the JSON would drift from
 * `prompts.ts` silently, and a probe that tests a stale contract is worse than
 * no probe at all.
 *
 * Pure by design: no filesystem, no clock, no network. The runner
 * (`scripts/prompt-probe.mjs`) supplies the model call; everything here is
 * decidable offline and unit-tested offline.
 */

/** The assertion vocabulary. Regex kinds compile `value` (with `flags`). */
export const ASSERT_KINDS = [
  'starts-with',
  'contains',
  'not-contains',
  'matches',
  'not-matches',
] as const

export type AssertKind = (typeof ASSERT_KINDS)[number]

/** Regex kinds — the two that compile `value` and accept `flags`. */
const REGEX_KINDS = new Set<AssertKind>(['matches', 'not-matches'])

export interface ProbeAssert {
  kind: AssertKind
  /** Substring for the literal kinds; regex SOURCE for `matches`/`not-matches`. */
  value: string
  /**
   * Regex flags, e.g. `"i"`. Only meaningful — and only ALLOWED — on the regex
   * kinds: silently ignoring `flags` on a `contains` would let a probe author
   * believe they had asked for case-insensitivity when they had not.
   */
  flags?: string
}

export interface Probe {
  id: string
  /** One line: what behaviour this probe pins. Required — an unexplained gate rots. */
  description: string
  /** The prompt, MINUS any global contract (see `appendGlobalContract`). Keep it short. */
  prompt: string
  /**
   * Append the real `SANDBOX_CONSTRAINTS` to `prompt` at run time. Required and
   * explicit: whether a probe is testing the global contract or a bare prompt
   * is the single most important fact about it, and a default would hide it.
   */
  appendGlobalContract: boolean
  asserts: ProbeAssert[]
}

const PROBE_KEYS = new Set<string>([
  'id',
  'description',
  'prompt',
  'appendGlobalContract',
  'asserts',
])
const ASSERT_KEYS = new Set<string>(['kind', 'value', 'flags'])

/**
 * Validate a raw probes document (the parsed JSON) into typed probes.
 *
 * Strict on purpose, and every message names the probe: a probe file is edited
 * rarely and read under time pressure (a sweep is waiting on it), so "unknown
 * key" beats a silent shrug and `probe "no-cdn": assert #1 ...` beats a stack
 * trace. Regexes are compiled HERE rather than at match time, so a typo'd
 * pattern fails at import — before any model call is paid for.
 */
export function parseProbes(raw: unknown): Probe[] {
  if (!Array.isArray(raw)) {
    throw new Error('probes: document must be an array of probes')
  }
  const out: Probe[] = []
  const seen = new Set<string>()
  raw.forEach((value, i) => {
    const where = `probe #${i + 1}`
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`${where}: must be an object`)
    }
    const entry = value as Record<string, unknown>
    const id = entry.id
    if (typeof id !== 'string' || id.trim() === '') {
      throw new Error(`${where}: id must be a non-empty string`)
    }
    const named = `probe "${id}"`
    if (seen.has(id)) throw new Error(`${named}: duplicate probe id "${id}"`)
    seen.add(id)

    for (const key of Object.keys(entry)) {
      if (!PROBE_KEYS.has(key)) {
        throw new Error(
          `${named}: unknown key "${key}" (allowed: ${[...PROBE_KEYS].sort().join(', ')})`
        )
      }
    }
    if (typeof entry.description !== 'string' || entry.description.trim() === '') {
      throw new Error(`${named}: description must be a non-empty string`)
    }
    if (typeof entry.prompt !== 'string' || entry.prompt.trim() === '') {
      throw new Error(`${named}: prompt must be a non-empty string`)
    }
    if (typeof entry.appendGlobalContract !== 'boolean') {
      throw new Error(`${named}: appendGlobalContract must be a boolean (state it explicitly)`)
    }
    if (!Array.isArray(entry.asserts) || entry.asserts.length === 0) {
      throw new Error(`${named}: asserts must list at least one assert`)
    }

    const asserts = entry.asserts.map((a, j) => parseAssert(a, `${named}: assert #${j + 1}`))
    out.push({
      id,
      description: entry.description,
      prompt: entry.prompt,
      appendGlobalContract: entry.appendGlobalContract,
      asserts,
    })
  })
  return out
}

function parseAssert(raw: unknown, where: string): ProbeAssert {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${where}: must be an object`)
  }
  const entry = raw as Record<string, unknown>
  for (const key of Object.keys(entry)) {
    if (!ASSERT_KEYS.has(key)) {
      throw new Error(`${where}: unknown key "${key}" (allowed: ${[...ASSERT_KEYS].sort().join(', ')})`)
    }
  }
  const kind = entry.kind
  if (typeof kind !== 'string' || !(ASSERT_KINDS as readonly string[]).includes(kind)) {
    throw new Error(
      `${where}: unknown kind ${JSON.stringify(kind)} (allowed: ${ASSERT_KINDS.join(', ')})`
    )
  }
  const value = entry.value
  if (typeof value !== 'string' || value === '') {
    throw new Error(`${where}: value must be a non-empty string`)
  }
  const flags = entry.flags
  if (flags !== undefined) {
    if (typeof flags !== 'string') throw new Error(`${where}: flags must be a string`)
    if (!REGEX_KINDS.has(kind as AssertKind)) {
      throw new Error(
        `${where}: flags are only valid on ${[...REGEX_KINDS].join('/')} (kind is "${kind}")`
      )
    }
  }
  if (REGEX_KINDS.has(kind as AssertKind)) {
    // Compile now: a bad pattern must fail at load, never mid-sweep-gate.
    try {
      new RegExp(value, typeof flags === 'string' ? flags : undefined)
    } catch (err) {
      throw new Error(
        `${where}: ${kind} value ${JSON.stringify(value)} is not a valid regex — ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
  return {
    kind: kind as AssertKind,
    value,
    ...(typeof flags === 'string' ? { flags } : {}),
  }
}

/** The shipped probes. Validated at import — a malformed file fails loudly. */
export const PROBES: Probe[] = parseProbes(probesJson)

/** Look a probe up by id, or `undefined`. */
export function findProbe(id: string): Probe | undefined {
  return PROBES.find((p) => p.id === id)
}

/**
 * The exact prompt this probe sends — the probe's own text plus, when it asks
 * for it, the REAL global sandbox contract from `prompts.ts`.
 *
 * `SANDBOX_CONSTRAINTS` already leads with a blank line, and is trimmed +
 * re-separated here so the composition is identical whether or not the
 * constant's leading whitespace ever changes.
 */
export function probePrompt(probe: Probe): string {
  if (!probe.appendGlobalContract) return probe.prompt
  return `${probe.prompt}\n\n${SANDBOX_CONSTRAINTS.trim()}`
}

export interface ProbeAssertFailure {
  /** 0-based position in `probe.asserts` — the failure names the assert that tripped. */
  index: number
  assert: ProbeAssert
  /** Human-readable "what actually happened", including the offending text when there is one. */
  detail: string
}

export interface ProbeEvaluation {
  probeId: string
  passed: boolean
  /** EVERY failing assert, in order. Never first-only. */
  failures: ProbeAssertFailure[]
}

/** Short, single-line excerpt of a reply for a failure message. */
function excerpt(text: string, max = 80): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

/**
 * Evaluate a probe's asserts against the RAW model reply.
 *
 * RAW is deliberate: the sweep's `cleanOutput` strips fences and prose
 * preambles, and a probe that ran on the cleaned text could not see the very
 * regression it exists to catch ("the model narrated before the DOCTYPE").
 * Where a tolerance is wanted, the probe states it in its own pattern.
 *
 * CAVEAT — "raw" is only raw on the API path. `generateForProbe` goes through
 * the same providers a sweep uses, and the CLI providers (`runners/cli.ts`,
 * i.e. agy/codex/opencode — including the DEFAULT probe model) do not return a
 * raw HTTP reply at all: they return the file-handoff artifact, or
 * `extractLikelyCode(stdout)`, which strips narration before the DOCTYPE as
 * part of getting an artifact out of a chatty terminal session. So a
 * PREAMBLE-SENSITIVE probe (`doctype-first`, whose first assert is
 * `starts-with <!DOCTYPE`) cannot fail on a CLI model — it is asserting against
 * text the extractor already cleaned. Run those against an API-provider model
 * (`--model <api-model>`) for the assert to mean anything. Every NEGATIVE
 * assert ("did not emit a CDN link", "did not call fetch") bites everywhere,
 * because extraction removes prose, not code. The extraction is deliberately
 * left alone: it is what makes CLI models usable in the sweep at all.
 *
 * Returns ALL failures. A prompt edit usually breaks several behaviours at
 * once, and fixing them one round-trip at a time is the expensive way.
 */
export function evaluateProbe(reply: string, probe: Probe): ProbeEvaluation {
  const failures: ProbeAssertFailure[] = []
  probe.asserts.forEach((assert, index) => {
    const detail = failureDetail(reply, assert)
    if (detail !== undefined) failures.push({ index, assert, detail })
  })
  return { probeId: probe.id, passed: failures.length === 0, failures }
}

/** `undefined` when the assert holds; the failure detail when it does not. */
function failureDetail(reply: string, assert: ProbeAssert): string | undefined {
  switch (assert.kind) {
    case 'starts-with':
      return reply.startsWith(assert.value)
        ? undefined
        : `reply starts "${excerpt(reply.slice(0, 60))}"`
    case 'contains':
      return reply.includes(assert.value) ? undefined : 'absent from the reply'
    case 'not-contains': {
      const at = reply.indexOf(assert.value)
      return at === -1 ? undefined : `present at offset ${at}: "${excerpt(reply.slice(at, at + 60))}"`
    }
    case 'matches':
      // A fresh RegExp per call: a `g`-flagged pattern carries `lastIndex`
      // across calls, so a shared instance would make the SECOND evaluation of
      // the same probe disagree with the first.
      return regex(assert).test(reply) ? undefined : 'no match in the reply'
    case 'not-matches': {
      const found = regex(assert).exec(reply)
      return found === null
        ? undefined
        : `matched at offset ${found.index}: "${excerpt(found[0], 60)}"`
    }
  }
}

function regex(assert: ProbeAssert): RegExp {
  return new RegExp(assert.value, assert.flags)
}
