import { validateFeedbackEntries } from './feedback'
import type { CuratorFeedback } from './feedback'
import feedbackJson from './feedback.json'

/**
 * The COMMITTED curator-feedback sidecar, validated once at import.
 *
 * Split from `feedback.ts` (which stays pure and data-free) for one operational
 * reason: `scripts/bench-feedback.mjs` is the tool you reach for when the file
 * is wrong, and a module that loads the file at import time would take the
 * repair tool down with it.
 *
 * Unlike results.json this is TINY (a handful of hand-written entries), so
 * unlike `results.ts` there is no server-only rule — a client component may
 * import it directly.
 *
 * THROWS on an invalid document. Deliberate: the site renders these as
 * judgment, and rendering half of a corrupted file — or silently rendering
 * none of it — would present the absence of a rating as a rating of absence.
 * `task bench:verify-results` catches it before a build ever gets here.
 */
function loadCommitted(): CuratorFeedback[] {
  const loaded = validateFeedbackEntries(feedbackJson)
  if (!loaded.ok) {
    throw new Error(
      `lib/lab/llm-benchmark/feedback.json is invalid (${loaded.code}): ${loaded.message}`,
    )
  }
  return loaded.entries
}

export const CURATOR_FEEDBACK: CuratorFeedback[] = loadCommitted()
