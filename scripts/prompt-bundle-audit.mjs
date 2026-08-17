#!/usr/bin/env node
// Compare stored results ACROSS PROMPT BUNDLES — "did the prompt change help,
// per model?".
//
// The board compares models. This compares the other axis: the prompt bundle
// (task prompt + applied sandbox contract + frame prelude) each score was
// produced under, stamped on every record as `promptBundle` by aggregateRuns.
// Records are grouped per (model, task) by that hash, and the mean score of
// each bundle is reported with the delta to the next one, oldest first.
//
// Run: npx tsx scripts/prompt-bundle-audit.mjs [--model <id>] [--task <id>]
//
//   --model <id>   only this model id (repeatable)
//   --task <id>    only this task id (repeatable)
//   --all          list every pair, including single-bundle ones
//
// RESULTS_OUT_PATH overrides the results file (same env var the sweep writes
// through).
//
// GROUND STATE: every record written before #21 lacks the field and groups as
// `pre-bundle`. Until a sweep runs under the new code, this script correctly
// reports one bundle group everywhere and no deltas. That is the honest answer,
// not an error — it exits 0.
//
// The grouping and delta arithmetic live in
// lib/lab/llm-benchmark/prompt-bundle.ts (pure, unit-tested); this is a shell
// that loads the file, filters, and prints.
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PRE_BUNDLE,
  compareBundles,
  summarizePromptBundles,
} from '../lib/lab/llm-benchmark/prompt-bundle.ts'

const USAGE =
  'Usage: npx tsx scripts/prompt-bundle-audit.mjs [--model <id>] [--task <id>] [--all]'

const options = { models: [], tasks: [], all: false }
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]
  if (arg === '--model') options.models.push(argv[++i])
  else if (arg === '--task') options.tasks.push(argv[++i])
  else if (arg === '--all') options.all = true
  else if (arg === '--help' || arg === '-h') {
    console.log(USAGE)
    process.exit(0)
  } else {
    console.error(`Unknown argument: ${arg}`)
    console.error(USAGE)
    process.exit(1)
  }
}
if (options.models.includes(undefined) || options.tasks.includes(undefined)) {
  console.error('--model and --task each take a value')
  process.exit(1)
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const resultsPath = resolve(
  root,
  process.env.RESULTS_OUT_PATH ?? 'lib/lab/llm-benchmark/results.json'
)

let results
try {
  results = JSON.parse(readFileSync(resultsPath, 'utf8'))
} catch (err) {
  console.error(`[prompt-bundle-audit] cannot read ${resultsPath}: ${err.message}`)
  process.exit(1)
}
if (!Array.isArray(results)) {
  console.error(`[prompt-bundle-audit] ${resultsPath} is not an array of records`)
  process.exit(1)
}

const filtered = results.filter(
  (r) =>
    (options.models.length === 0 || options.models.includes(r.modelId)) &&
    (options.tasks.length === 0 || options.tasks.includes(r.taskId))
)

const summary = summarizePromptBundles(filtered)
const comparisons = compareBundles(filtered)

console.log(`[prompt-bundle-audit] ${relative(root, resultsPath)} — ${results.length} record(s)`)
if (options.models.length > 0 || options.tasks.length > 0) {
  const scope = [
    options.models.length > 0 ? `models ${options.models.join(', ')}` : null,
    options.tasks.length > 0 ? `tasks ${options.tasks.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  console.log(`[prompt-bundle-audit] filtered to ${scope} — ${filtered.length} record(s)`)
}

if (filtered.length === 0) {
  console.log('[prompt-bundle-audit] nothing matched — no bundles to compare')
  process.exit(0)
}

const bundleList =
  summary.bundles.length === 0 ? 'none' : summary.bundles.join(', ')
console.log(
  `[prompt-bundle-audit] ${summary.stamped} stamped, ${summary.preBundle} pre-bundle · bundles: ${bundleList}`
)
console.log(
  `[prompt-bundle-audit] ${summary.pairs} (model, task) pair(s), ${summary.multiBundlePairs} scored under more than one bundle`
)

const interesting = options.all ? comparisons : comparisons.filter((c) => c.groups.length > 1)

if (interesting.length === 0) {
  console.log('')
  console.log(
    summary.multiBundlePairs === 0
      ? `[prompt-bundle-audit] every pair sits in a single bundle group${summary.stamped === 0 ? ` (${PRE_BUNDLE} — no sweep has run since promptBundle shipped)` : ''} — no deltas to report. Re-run with --all to list them.`
      : '[prompt-bundle-audit] nothing to report.'
  )
  process.exit(0)
}

const sign = (n) => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1))

for (const c of interesting) {
  console.log('')
  console.log(`  ${c.modelId} :: ${c.taskId}`)
  for (const g of c.groups) {
    console.log(
      `    ${g.bundle.padEnd(16)}  mean ${g.meanScore.toFixed(1)}  (${g.count} record${g.count === 1 ? '' : 's'}, ${g.earliestAt.slice(0, 10)}${g.latestAt === g.earliestAt ? '' : `..${g.latestAt.slice(0, 10)}`})`
    )
  }
  for (const d of c.deltas) {
    console.log(`    Δ ${d.from} → ${d.to}: ${sign(d.deltaScore)}`)
  }
}

console.log('')
console.log(
  `[prompt-bundle-audit] ${interesting.length} pair(s) reported${options.all ? '' : ' (multi-bundle only; --all for the rest)'}`
)
