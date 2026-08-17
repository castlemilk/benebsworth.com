/**
 * Prompt-bundle provenance — "under which prompt was this score produced?"
 *
 * The board compares MODELS, but the biggest lever on a score is the PROMPT
 * BUNDLE: the task prompt, the sandbox contract appended to it, and the frame
 * prelude injected into the artifact before it is rendered and scored. Change
 * any of those and last month's numbers describe an experiment that no longer
 * exists — silently, because nothing in the record says which bundle it ran
 * under. That is not hypothetical: tic-tac-toe's stored results were scored
 * under the OLD global sandbox contract, and when its task-specific contract
 * landed (#36) nothing marked them stale.
 *
 * So a record gets stamped with `promptBundle` — the short hash computed here.
 *
 * WHAT GOES IN THE HASH, and why exactly this:
 *
 *  1. **The AMENDED prompt** — `withSandboxConstraints(task).prompt`, i.e. the
 *     task prompt PLUS whatever contract `appliedSandboxConstraints` resolved
 *     (global, task-specific, or none). This is the exact byte string the model
 *     received; it is already what keys the response cache and what the run log
 *     records as `promptHash`.
 *  2. **The frame-prelude fingerprint** — a digest of `FRAME_PRELUDE`, the
 *     markup injected ahead of the artifact in both the live frame and the
 *     published .html. It is not shown to the model, but it IS the environment
 *     the artifact executes and is scored in (the storage shim, the error
 *     reporter, the CSS reset, the viewport meta). A prelude edit can flip a
 *     behavioural check without a single prompt byte changing.
 *
 * The rule, in one line: **anything that changes what the model sees OR the
 * environment its artifact is scored in belongs in the hash; nothing else
 * does.**
 *
 * Deliberately NOT in the hash:
 *  - the task id/slug/title (see the id test in prompt-bundle.test.ts — the
 *    hash answers "same conditions?", and a rename changes no condition);
 *  - the model, its provider, temperature or token limits (those are the axis
 *    the board already compares, and they live in the record);
 *  - the scorer or its checks (a scoring change is real, but it is a different
 *    kind of staleness and would make every bundle churn on a check tweak —
 *    keep this hash about the INPUT and the RUNTIME, not the ruler).
 *
 * Node-only by construction (`node:crypto`): imported from the scripts layer,
 * from `verify-results.ts`, and from SERVER components. Never from a client
 * component — the run-trace UI parses bytes in the browser and must not pull
 * this in.
 */
import { createHash } from 'node:crypto'

import { FRAME_PRELUDE } from './frame-prelude'
import { withSandboxConstraints } from './prompts'
import type { BenchmarkResult, BenchmarkTask } from './types'

/** Hex characters kept from the sha256 — matches the cache's `hashPrompt`. */
export const BUNDLE_HASH_CHARS = 16

/**
 * Separator between the two hashed parts. Without one, prompt `'AB'` +
 * fingerprint `'C'` and prompt `'A'` + fingerprint `'BC'` would collide; the
 * newline-delimited label also makes a dumped composition readable.
 */
const BUNDLE_SEPARATOR = '\n--- frame-prelude ---\n'

/** The group name for records written before `promptBundle` existed. */
export const PRE_BUNDLE = 'pre-bundle'

function shortSha256(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, BUNDLE_HASH_CHARS)
}

/**
 * Digest of the frame prelude — the artifact's execution environment.
 *
 * Hashing the SOURCE CONSTANT rather than a hand-maintained version number is
 * the point: a version number is only correct while someone remembers to bump
 * it, and the one time it is forgotten is the one time it mattered.
 */
export function framePreludeFingerprint(): string {
  return shortSha256(FRAME_PRELUDE)
}

/**
 * The exact string that gets hashed. Exported so a test can vary one half at a
 * time (and so the composition is inspectable rather than implied).
 */
export function composeBundle(amendedPrompt: string, preludeFingerprint: string): string {
  return `${amendedPrompt}${BUNDLE_SEPARATOR}${preludeFingerprint}`
}

/**
 * The bundle hash for a task, as of RIGHT NOW (current prompt + current
 * contract + current prelude).
 *
 * `preludeFingerprint` is injectable for tests only; production always passes
 * the real one.
 */
export function promptBundleHash(
  task: BenchmarkTask,
  preludeFingerprint: string = framePreludeFingerprint()
): string {
  return shortSha256(composeBundle(withSandboxConstraints(task).prompt, preludeFingerprint))
}

/** Records sharing one bundle within a (model, task) pair. */
export interface BundleGroup {
  /** The bundle hash, or `PRE_BUNDLE` for unstamped records. */
  bundle: string
  count: number
  /** Mean published score across the group's records, to 1 decimal. */
  meanScore: number
  /** Oldest and newest `createdAt` in the group (the ordering key). */
  earliestAt: string
  latestAt: string
}

/** Score movement from one bundle to the next, in chronological order. */
export interface BundleDelta {
  from: string
  to: string
  /** `to.meanScore - from.meanScore`, to 1 decimal. Positive = the change helped. */
  deltaScore: number
}

/** Every bundle a single (model, task) pair has been scored under. */
export interface BundleComparison {
  modelId: string
  taskId: string
  /** `PRE_BUNDLE` first (it is the legacy generation), then oldest-first. */
  groups: BundleGroup[]
  /** One delta per consecutive pair of groups; empty when there is only one. */
  deltas: BundleDelta[]
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Group results per (model, task) by `promptBundle` and report the score delta
 * across bundles — the "did the prompt change help, for this model?" question.
 *
 * Pure: no registry lookups, no current-bundle comparison. It reports what the
 * records SAY, which is what an audit of stored data has to do.
 */
export function compareBundles(results: BenchmarkResult[]): BundleComparison[] {
  const pairs = new Map<string, Map<string, BenchmarkResult[]>>()
  for (const r of results) {
    const key = `${r.modelId}|${r.taskId}`
    let byBundle = pairs.get(key)
    if (!byBundle) {
      byBundle = new Map()
      pairs.set(key, byBundle)
    }
    const bundle = r.promptBundle ?? PRE_BUNDLE
    const bucket = byBundle.get(bundle)
    if (bucket) bucket.push(r)
    else byBundle.set(bundle, [r])
  }

  const comparisons: BundleComparison[] = []
  for (const [key, byBundle] of [...pairs.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const [modelId, taskId] = key.split('|')
    const groups: BundleGroup[] = [...byBundle.entries()].map(([bundle, records]) => {
      const times = records.map((r) => r.createdAt).sort()
      return {
        bundle,
        count: records.length,
        meanScore: round1(records.reduce((sum, r) => sum + r.score, 0) / records.length),
        earliestAt: times[0],
        latestAt: times[times.length - 1],
      }
    })
    // pre-bundle first whatever its timestamps — it is the legacy generation by
    // definition, and a legacy record re-merged yesterday must not sort after a
    // stamped one. Everything else is oldest-first, so the deltas read forward
    // in time.
    groups.sort((a, b) => {
      if (a.bundle === PRE_BUNDLE) return -1
      if (b.bundle === PRE_BUNDLE) return 1
      return a.earliestAt < b.earliestAt ? -1 : a.earliestAt > b.earliestAt ? 1 : a.bundle < b.bundle ? -1 : 1
    })
    const deltas: BundleDelta[] = []
    for (let i = 1; i < groups.length; i++) {
      deltas.push({
        from: groups[i - 1].bundle,
        to: groups[i].bundle,
        deltaScore: round1(groups[i].meanScore - groups[i - 1].meanScore),
      })
    }
    comparisons.push({ modelId, taskId, groups, deltas })
  }
  return comparisons
}

/** Corpus-level counts — what the audit prints before the per-pair detail. */
export interface PromptBundleSummary {
  records: number
  /** Records carrying a `promptBundle`. */
  stamped: number
  /** Records without one (legacy — the ground state today). */
  preBundle: number
  /** Distinct bundle hashes seen, sorted. Excludes `PRE_BUNDLE`. */
  bundles: string[]
  /** Distinct (model, task) pairs. */
  pairs: number
  /** Pairs scored under more than one bundle — the only ones with a delta. */
  multiBundlePairs: number
}

export function summarizePromptBundles(results: BenchmarkResult[]): PromptBundleSummary {
  const comparisons = compareBundles(results)
  const bundles = new Set<string>()
  for (const r of results) if (r.promptBundle) bundles.add(r.promptBundle)
  const stamped = results.filter((r) => r.promptBundle !== undefined).length
  return {
    records: results.length,
    stamped,
    preBundle: results.length - stamped,
    bundles: [...bundles].sort(),
    pairs: comparisons.length,
    multiBundlePairs: comparisons.filter((c) => c.groups.length > 1).length,
  }
}
