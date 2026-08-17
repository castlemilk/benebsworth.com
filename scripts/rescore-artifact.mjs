#!/usr/bin/env node
// Re-score ONE stored artifact with the CURRENT scorer and compare against the
// score the run log recorded (#31, the expensive half of artifact verification).
//
// The cheap half — "are the stored bytes still the bytes that were scored?" —
// is the `artifact-integrity` check in `task bench:verify-results`, which
// re-hashes every content-addressed blob on every run. This script answers the
// OTHER question: does the scorer we ship TODAY still produce the number on the
// board? A drifted scorer (a check tightened, a heuristic changed) and a
// tampered artifact both show up here as a DRIFT line.
//
// COST, and why this is opt-in and never in the pre-push gate:
//   - a text-scored task (equation-solver, crypto-hash-race) is pure string
//     matching — milliseconds, no browser;
//   - a behaviourally-scored task launches headless Chromium via Playwright and
//     drives real key/scroll/click events — seconds to ~30s per artifact, and
//     it needs the browser binary installed.
// Re-scoring a whole sweep is therefore minutes of browser time, which is why
// nothing runs this automatically.
//
// Run: npx tsx scripts/rescore-artifact.mjs --run <run-id> --model <id> --task <id>
//
//   --run <run-id>   sweep directory under sweeps/ (required)
//   --model <id>     model id (required)
//   --task <id>      task id (required)
//   --json           print the comparison as JSON instead of prose
//
// SWEEPS_DIR overrides the directory scanned (default <repo>/sweeps).
//
// Exit codes: 0 match (or no recorded score to compare against), 1 drift, 2 the
// artifact could not be located/read at all.
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { compareRescore, locateScoredArtifact } from '../lib/lab/llm-benchmark/rescore.ts'
import { BENCHMARK_TASKS } from '../lib/lab/llm-benchmark/registry.ts'
import { readRunLog, runLogFileName } from '../lib/lab/llm-benchmark/runlog.ts'
import { selectScorer } from '../lib/lab/llm-benchmark/scorers/index.ts'
import { closeSandbox } from '../lib/lab/llm-benchmark/scorers/sandbox.ts'
import { verifyContentAddress } from '../lib/lab/llm-benchmark/content-address.ts'

const USAGE =
  'Usage: npx tsx scripts/rescore-artifact.mjs --run <run-id> --model <id> --task <id> [--json]'

function parseArgs(argv) {
  const options = { run: undefined, model: undefined, task: undefined, json: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--json') options.json = true
    else if (arg === '--run') options.run = argv[++i]
    else if (arg === '--model') options.model = argv[++i]
    else if (arg === '--task') options.task = argv[++i]
    else if (arg === '--help' || arg === '-h') {
      console.log(USAGE)
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${arg}`)
      console.error(USAGE)
      process.exit(1)
    }
  }
  for (const required of ['run', 'model', 'task']) {
    if (!options[required]) {
      console.error(`--${required} is required`)
      console.error(USAGE)
      process.exit(1)
    }
  }
  return options
}

const options = parseArgs(process.argv.slice(2))
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sweepsDir = resolve(root, process.env.SWEEPS_DIR ?? 'sweeps')
const runDir = join(sweepsDir, options.run)
const logPath = join(runDir, runLogFileName(options.model, options.task))

let parsed
try {
  parsed = readRunLog(logPath)
} catch (err) {
  console.error(`[rescore] cannot read ${logPath}: ${err.message}`)
  process.exit(2)
}

let located
try {
  located = locateScoredArtifact(parsed)
} catch (err) {
  console.error(`[rescore] ${err.message}`)
  process.exit(2)
}

let bytes
try {
  bytes = readFileSync(join(runDir, located.spillRef), 'utf8')
} catch (err) {
  console.error(`[rescore] cannot read the artifact ${located.spillRef}: ${err.message}`)
  process.exit(2)
}

// Content addressing first: if the bytes are not what the name claims, the
// re-score would be scoring something other than what was published, and
// reporting THAT as scorer drift would be a lie.
const integrity = verifyContentAddress(located.spillRef, bytes)
if (integrity && !integrity.ok) {
  console.error(
    `[rescore] ${located.spillRef} is stored as ${integrity.expected} but hashes to ${integrity.actual} — ` +
      `the file is not the artifact that was scored (run \`task bench:verify-results\`)`
  )
  process.exit(2)
}

const task = BENCHMARK_TASKS.find((t) => t.id === located.taskId)
if (!task) {
  console.error(`[rescore] task '${located.taskId}' is no longer in the registry`)
  process.exit(2)
}

const scorer = selectScorer(task)
let current
try {
  current = await scorer.score(bytes, task)
} finally {
  // Behavioural scoring leaves a browser open; a text task never opened one and
  // this is a no-op.
  await closeSandbox()
}

const comparison = compareRescore(located.recordedScore, current, located.basis)

if (options.json) {
  console.log(
    JSON.stringify(
      {
        runId: parsed.header.runId,
        modelId: located.modelId,
        taskId: located.taskId,
        scorer: task.scorer ?? '(category default)',
        spillRef: located.spillRef,
        bytes: Buffer.byteLength(bytes),
        iterationIndex: located.iterationIndex,
        ...comparison,
      },
      null,
      2
    )
  )
} else {
  console.log(`[rescore] ${located.modelId} / ${located.taskId} (run ${parsed.header.runId})`)
  console.log(
    `[rescore] artifact ${located.spillRef} — ${Buffer.byteLength(bytes)} bytes, content address verified` +
      (located.iterationIndex !== undefined ? `, iteration ${located.iterationIndex}` : '')
  )
  console.log(`[rescore] scorer: ${task.scorer ?? '(category default)'}`)
  console.log(`[rescore] ${comparison.line}`)
}

process.exit(comparison.drifted ? 1 : 0)
