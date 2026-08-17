#!/usr/bin/env node
/**
 * Re-run the failure regression corpus (#25) through the CURRENT scorer.
 *
 * `scripts/ingest-failures.mjs` files every broken artifact a sweep found, with
 * the score and the checks that tripped at the time. This asks the follow-up
 * question, and it is the reason the corpus exists: **after a prompt or scorer
 * edit, which of those cases got fixed and which still reproduce?**
 *
 * Run: npx tsx scripts/probe-corpus.mjs [--task <id>] [--model <id>]
 *                                       [--limit <n>] [--strict] [--quiet]
 *
 * Verdicts, per case:
 *
 *   still-broken  reproduces — below the floor again, or failing the same
 *                 checks. The EXPECTED verdict for an unchanged harness, and
 *                 not a failure of anything.
 *   now-passing   clears the floor AND nothing that used to fail still fails.
 *                 The point of a prompt/scorer edit.
 *   changed       a DIFFERENT failure set: a partial fix, or breakage the
 *                 recorded provenance does not describe. This is the finding —
 *                 either the check registry should grow to cover it, or the
 *                 edit broke something it did not mean to.
 *
 * THIS IS A REPORT, NOT A GATE. Exit is 0 whatever the verdicts, because
 * "still-broken" is the normal steady state of a regression corpus and a gate
 * that failed on it would be red forever. `--strict` exits 1 on any `changed`
 * case — that is the release-gate use: run it AFTER a prompt/scorer edit, where
 * a new, undescribed failure mode is exactly what you want the build to stop
 * for. Fixed-vs-still-broken is read off the summary, not the exit code.
 *
 * COST: behaviourally-scored tasks launch headless Chromium and drive real
 * input events — seconds to ~30s per case. Nothing runs this automatically; use
 * `--task` / `--model` / `--limit` to bound a run.
 *
 * CORPUS_DIR overrides the corpus root. Exit 2 = the corpus is unreadable.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BENCHMARK_TASKS } from '../lib/lab/llm-benchmark/registry.ts'
import { selectScorer, behavioralScorer } from '../lib/lab/llm-benchmark/scorers/index.ts'
import { scoreWithBreakdown } from '../lib/lab/llm-benchmark/scorers/behavioral.ts'
import { closeSandbox } from '../lib/lab/llm-benchmark/scorers/sandbox.ts'
import { compareCase, summarizeVerdictCounts } from '../lib/lab/llm-benchmark/failure-corpus.ts'

const USAGE =
  'Usage: npx tsx scripts/probe-corpus.mjs [--task <id>] [--model <id>] [--limit <n>] [--strict] [--quiet]'

const options = { task: undefined, model: undefined, limit: undefined, strict: false, quiet: false }
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]
  if (arg === '--task') options.task = argv[++i]
  else if (arg === '--model') options.model = argv[++i]
  else if (arg === '--limit') options.limit = Number(argv[++i])
  else if (arg === '--strict') options.strict = true
  else if (arg === '--quiet') options.quiet = true
  else if (arg === '--help' || arg === '-h') {
    console.log(USAGE)
    process.exit(0)
  } else {
    console.error(`Unknown argument: ${arg}`)
    console.error(USAGE)
    process.exit(1)
  }
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const corpusDir = resolve(root, process.env.CORPUS_DIR ?? 'lib/lab/llm-benchmark/failure-corpus')
const provenancePath = join(corpusDir, 'provenance.json')

let provenance
try {
  provenance = JSON.parse(readFileSync(provenancePath, 'utf8'))
} catch (err) {
  console.error(`[probe-corpus] cannot read ${relative(root, provenancePath)}: ${err.message}`)
  console.error('[probe-corpus] run `npx tsx scripts/ingest-failures.mjs` first')
  process.exit(2)
}
if (!Array.isArray(provenance)) {
  console.error(`[probe-corpus] ${relative(root, provenancePath)} is not an array of cases`)
  process.exit(2)
}

const selected = provenance.filter(
  (e) => (!options.task || e.taskId === options.task) && (!options.model || e.modelId === options.model)
)

const runnable = []
let missingBytes = 0
let unknownTask = 0
for (const entry of selected) {
  const casePath = join(corpusDir, 'cases', `${entry.artifact}.html`)
  if (!existsSync(casePath)) {
    // The bytes are gitignored, so a fresh clone has provenance and no cases.
    // That is expected, not a failure — re-ingest from the sweep tree.
    missingBytes++
    continue
  }
  const task = BENCHMARK_TASKS.find((t) => t.id === entry.taskId)
  if (!task) {
    unknownTask++
    continue
  }
  runnable.push({ entry, task, casePath })
}
const bounded = options.limit ? runnable.slice(0, options.limit) : runnable

if (!options.quiet) {
  console.log(
    `[probe-corpus] ${provenance.length} case(s) in the corpus, ${selected.length} selected, ${bounded.length} runnable`
  )
  if (missingBytes > 0) {
    console.log(
      `[probe-corpus] ${missingBytes} case(s) have provenance but no local artifact (gitignored bytes) — re-ingest to probe them`
    )
  }
  if (unknownTask > 0) {
    console.log(
      `[probe-corpus] ${unknownTask} case(s) name a task that is not in the registry — \`bench:verify-results\` fails on those`
    )
  }
}

const rows = []
for (const [i, item] of bounded.entries()) {
  const html = readFileSync(item.casePath, 'utf8')
  const scorer = selectScorer(item.task)
  let current
  if (scorer === behavioralScorer) {
    const breakdown = await scoreWithBreakdown(html, item.task, { perCheckTimeoutMs: 8000 })
    current = {
      score: breakdown.score,
      failedChecks: breakdown.checks.filter((c) => !c.passed).map((c) => c.name),
      fallbackReason: breakdown.fallbackReason,
    }
  } else {
    // Text-scored tasks have no per-check breakdown: the verdict rests on the
    // score alone, which is why a text case only ever enters the corpus by
    // scoring below the floor.
    current = { score: await scorer.score(html, item.task), failedChecks: [] }
  }
  const comparison = compareCase(
    { score: item.entry.score, failedChecks: item.entry.failedChecks ?? [] },
    current
  )
  rows.push({ entry: item.entry, current, comparison })
  if (!options.quiet) {
    console.log(
      `  [${i + 1}/${bounded.length}] ${item.entry.modelId} ${item.entry.taskId} #${item.entry.iterationIndex} ` +
        `(${item.entry.artifact}) — ${comparison.line}`
    )
    if (current.fallbackReason) {
      // A structural-only fallback score is NOT a behavioural verdict; saying so
      // is the difference between "the checks pass now" and "the checks did not run".
      console.log(`      ! behavioural scorer fell back: ${current.fallbackReason}`)
    }
  }
}

await closeSandbox()

const counts = summarizeVerdictCounts(rows.map((r) => r.comparison.verdict))
console.log('')
console.log(
  `[probe-corpus] ${rows.length} probed — ${counts['still-broken']} still-broken, ` +
    `${counts['now-passing']} now-passing, ${counts.changed} changed`
)

const changed = rows.filter((r) => r.comparison.verdict === 'changed')
if (changed.length > 0) {
  console.log('')
  console.log('CHANGED — the case fails in a way its provenance does not describe:')
  for (const r of changed) {
    console.log(`  ${r.entry.modelId} ${r.entry.taskId} #${r.entry.iterationIndex}: ${r.comparison.line}`)
  }
}

if (options.strict && changed.length > 0) {
  console.log('[probe-corpus] --strict: a changed case is a failure')
  process.exit(1)
}
process.exit(0)
