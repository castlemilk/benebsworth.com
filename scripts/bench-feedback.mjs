#!/usr/bin/env node
// Record the CURATOR's judgment of a published artifact.
//
// The behavioural scorer says whether the board plays; it cannot say whether
// the artifact is any good. This writes that judgment into a committed sidecar
// (lib/lab/llm-benchmark/feedback.json) keyed by a `bench://` reference, which
// the site then DISPLAYS labelled as one person's opinion.
//
//   npx tsx scripts/bench-feedback.mjs --ref bench://<model>/<task>[/<n>] \
//                                      --rating positive|negative [--note "…"]
//   npx tsx scripts/bench-feedback.mjs --list [--model <id>]
//   npx tsx scripts/bench-feedback.mjs --rm --ref bench://<model>/<task>
//
// This is NOT reader feedback. The site is a static export — visitor-writable
// ratings would need a Worker + KV + abuse handling, which is deferred (TODO
// #14). Every entry this writes is the maintainer's, and the UI says so.
//
// The rules live in lib/lab/llm-benchmark/feedback.ts (shape, versioning,
// timestamps) and feedback-cli.ts (arguments, the resolve gate, --list
// rendering). This is the shell: the filesystem and the process.
//
// A ref must RESOLVE against results.json before anything is written — a
// rating of a record that does not exist would render nowhere and rot.
//
// FEEDBACK_PATH overrides the sidecar (used by the CLI tests, so they never
// touch the committed file). RESULTS_OUT_PATH overrides the board it is gated
// against, exactly as in verify-results.mjs.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BENCHMARK_MODELS, BENCHMARK_TASKS } from '../lib/lab/llm-benchmark/registry.ts'
import {
  parseFeedbackFile,
  removeFeedback,
  serializeFeedback,
  upsertFeedback,
} from '../lib/lab/llm-benchmark/feedback.ts'
import {
  FEEDBACK_USAGE,
  gateFeedbackRef,
  parseFeedbackArgs,
  renderFeedbackList,
} from '../lib/lab/llm-benchmark/feedback-cli.ts'

const parsed = parseFeedbackArgs(process.argv.slice(2))
if (!parsed.ok) {
  console.error(parsed.message)
  console.error(FEEDBACK_USAGE)
  process.exit(1)
}
const options = parsed.options
if (options.command === 'help') {
  console.log(FEEDBACK_USAGE)
  process.exit(0)
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const feedbackPath = resolve(root, process.env.FEEDBACK_PATH ?? 'lib/lab/llm-benchmark/feedback.json')
const resultsPath = resolve(root, process.env.RESULTS_OUT_PATH ?? 'lib/lab/llm-benchmark/results.json')

/** Repo-relative when it IS in the repo; absolute otherwise (a FEEDBACK_PATH
 *  temp file printed as `../../../../tmp/…` is a path nobody can read). */
function show(path) {
  const rel = relative(root, path)
  return rel.startsWith('..') ? path : rel
}

// An ABSENT sidecar is an empty one, not an error: this script is how the file
// comes into existence.
const loaded = parseFeedbackFile(existsSync(feedbackPath) ? readFileSync(feedbackPath, 'utf8') : '[]')
if (!loaded.ok) {
  console.error(`[bench-feedback] ${show(feedbackPath)} is invalid (${loaded.code}): ${loaded.message}`)
  process.exit(1)
}
const entries = loaded.entries

if (options.command === 'list') {
  console.log(renderFeedbackList(entries, options.model ? { model: options.model } : {}))
  process.exit(0)
}

if (options.command === 'remove') {
  const { entries: next, removed } = removeFeedback(entries, options.ref)
  if (!removed) {
    console.error(`[bench-feedback] no entry for ${options.ref}`)
    process.exit(1)
  }
  writeFileSync(feedbackPath, serializeFeedback(next))
  console.log(`[bench-feedback] removed ${removed.ref} (was v${removed.version}, ${removed.rating})`)
  process.exit(0)
}

// --- rate ------------------------------------------------------------------

let results
try {
  results = JSON.parse(readFileSync(resultsPath, 'utf8'))
} catch (err) {
  console.error(`[bench-feedback] cannot read ${show(resultsPath)}: ${err.message}`)
  process.exit(1)
}
if (!Array.isArray(results)) {
  console.error(`[bench-feedback] ${show(resultsPath)} is not an array of records`)
  process.exit(1)
}

const gate = gateFeedbackRef(options.ref, {
  models: BENCHMARK_MODELS,
  tasks: BENCHMARK_TASKS,
  results,
})
if (!gate.ok) {
  console.error(`[bench-feedback] ${gate.message}`)
  process.exit(1)
}

const written = upsertFeedback(
  entries,
  { ref: options.ref, rating: options.rating, ...(options.note === undefined ? {} : { note: options.note }) },
  new Date().toISOString(),
)
if (!written.ok) {
  console.error(`[bench-feedback] ${written.code}: ${written.message}`)
  process.exit(1)
}

writeFileSync(feedbackPath, serializeFeedback(written.entries))
const verb = written.previous ? `updated (v${written.previous.version} → v${written.entry.version})` : 'created (v1)'
console.log(`[bench-feedback] ${verb} ${written.entry.rating} on ${written.entry.ref}`)
if (written.previous && written.previous.note && !written.entry.note) {
  // Replace-not-accumulate, said out loud: silently dropping a note the
  // curator wrote earlier is exactly the surprise worth one line of output.
  console.log('[bench-feedback] note cleared (a write replaces the entry — pass --note to keep one)')
}
console.log(`[bench-feedback] ${show(feedbackPath)} now holds ${written.entries.length} entr${written.entries.length === 1 ? 'y' : 'ies'}`)
