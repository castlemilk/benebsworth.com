#!/usr/bin/env node
/**
 * Backfill BenchmarkResult.iterationCheckResults on every behavioural-scored
 * record in lib/lab/llm-benchmark/results.json.
 *
 * The runner now captures per-iteration checks at sweep time
 * (runners/provider.ts → scorer.scoreWithBreakdown). Records written before
 * this feature only persist the BEST iteration's artifact (r.output), so the
 * backfill scores that artifact and stores its checks as a single-iteration
 * breakdown — honest for "which check tripped for this artifact", while new
 * sweeps carry the full per-iteration alignment.
 *
 * Idempotent: records that already have iterationCheckResults are left alone.
 *
 * Run: npx tsx scripts/backfill-iteration-checks.mjs
 *      (no flags; reads results.json in place, writes back atomically)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BENCHMARK_TASKS } from '../lib/lab/llm-benchmark/registry.ts'
import { behavioralTaskIds } from '../lib/lab/llm-benchmark/scorers/index.ts'
import { scoreWithBreakdown } from '../lib/lab/llm-benchmark/scorers/behavioral.ts'
import { closeSandbox } from '../lib/lab/llm-benchmark/scorers/sandbox.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const resultsPath = join(root, 'lib/lab/llm-benchmark/results.json')

// Derived from the scorer registry (each task row declares its scorer), so
// adding a behavioural task never leaves this script behind.
const BEHAVIOURAL_TASK_IDS = behavioralTaskIds(BENCHMARK_TASKS)

async function main() {
  const results = JSON.parse(readFileSync(resultsPath, 'utf8'))

  const candidates = results.filter(
    (r) =>
      BEHAVIOURAL_TASK_IDS.has(r.taskId) &&
      r.output &&
      r.output.trim().length >= 40 &&
      !r.iterationCheckResults
  )

  console.log(`[backfill-iteration-checks] scoring ${candidates.length} records…`)

  let done = 0
  const skipped = results.length - candidates.length
  for (const r of candidates) {
    const task = BENCHMARK_TASKS.find((t) => t.id === r.taskId)
    if (!task) continue
    const breakdown = await scoreWithBreakdown(r.output, task)
    // Only the best iteration's artifact is persisted on old records — store
    // its checks as a single-entry breakdown aligned with that artifact.
    r.iterationCheckResults = [breakdown.checks.map((c) => ({
      name: c.name,
      passed: c.passed,
      points: c.points,
      maxPoints: c.maxPoints,
      detail: c.detail,
    }))]
    done++
    if (done % 5 === 0) process.stderr.write(`  ${done}/${candidates.length}\n`)
  }

  await closeSandbox()

  writeFileSync(resultsPath, JSON.stringify(results, null, 2) + '\n')
  console.log(
    `[backfill-iteration-checks] backfilled ${done} records (${skipped} untouched: already present, non-behavioural, or no stored artifact)`
  )
}

main().catch(async (e) => {
  console.error('[backfill-iteration-checks] fatal:', e)
  await closeSandbox()
  process.exit(1)
})
