#!/usr/bin/env node
/**
 * Re-score every benchmark result with the behavioral scorer and report
 * the breakdown per model/task. Surfaces "100 but broken" games — records
 * that the structural HTML scorer blessed but the behavioral checks fail.
 *
 * Usage:
 *   node scripts/rescore-behavioral.mjs                # all models, all HTML tasks
 *   node scripts/rescore-behavioral.mjs --model laguna-xs-2.1  # one model
 *   node scripts/rescore-behavioral.mjs --task mini-platformer # one task
 *   node scripts/rescore-behavioral.mjs --limit 5        # first N per model/task
 *
 * Output (stdout):
 *   Per-model breakdown of newScore vs oldScore, sorted by biggest drop,
 *   plus a "BROKEN" section for records where old=100 but new<70.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BENCHMARK_TASKS } from '../lib/lab/llm-benchmark/registry.ts'
import { behavioralTaskIds } from '../lib/lab/llm-benchmark/scorers/index.ts'
import { scoreWithBreakdown } from '../lib/lab/llm-benchmark/scorers/behavioral.ts'
import { closeSandbox } from '../lib/lab/llm-benchmark/scorers/sandbox.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function parseArgs() {
  const args = {}
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--model') args.model = argv[++i]
    else if (a === '--task') args.task = argv[++i]
    else if (a === '--limit') args.limit = Number(argv[++i])
  }
  return args
}

async function main() {
  const args = parseArgs()
  const resultsPath = join(root, 'lib/lab/llm-benchmark/results.json')
  const results = JSON.parse(readFileSync(resultsPath, 'utf8'))

  // Tasks we behavioural-score, DERIVED from the registry (each task row
  // declares its scorer) rather than duplicated here.
  const BEHAVIOURAL_TASK_IDS = behavioralTaskIds(BENCHMARK_TASKS)

  const filtered = results.filter((r) => {
    if (args.model && r.modelId !== args.model) return false
    if (args.task && r.taskId !== args.task) return false
    if (!BEHAVIOURAL_TASK_IDS.has(r.taskId)) return false
    if (!r.output || r.output.trim().length < 40) return false
    return true
  })

  // Per-model, take only the latest record (most recent sweep) to keep
  // the run bounded.
  const byModelTask = new Map()
  for (const r of filtered) {
    const key = `${r.modelId}::${r.taskId}`
    const arr = byModelTask.get(key) ?? []
    arr.push(r)
    byModelTask.set(key, arr)
  }
  const toScore = []
  for (const arr of byModelTask.values()) {
    arr.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    if (args.limit) toScore.push(...arr.slice(0, args.limit))
    else toScore.push(arr[0])
  }

  console.error(`[rescore] scoring ${toScore.length} (model, task) pairs…`)

  const rows = []
  let i = 0
  for (const r of toScore) {
    i++
    const task = BENCHMARK_TASKS.find((t) => t.id === r.taskId)
    if (!r.output || !task) continue
    const breakdown = await scoreWithBreakdown(r.output, task, { perCheckTimeoutMs: 8000 })
    rows.push({
      modelId: r.modelId,
      taskId: r.taskId,
      oldScore: r.score,
      newScore: breakdown.score,
      structural: breakdown.structural,
      behavioural: breakdown.behavioral,
      behaviouralMax: breakdown.behavioralMax,
      delta: breakdown.score - r.score,
      checks: breakdown.checks.map((c) => ({ name: c.name, passed: c.passed, detail: c.detail })),
      fallbackReason: breakdown.fallbackReason,
    })
    if (i % 5 === 0) process.stderr.write(`  ${i}/${toScore.length}\n`)
  }

  await closeSandbox()

  rows.sort((a, b) => a.delta - b.delta)

  console.log('\n═══ Biggest drops (newScore − oldScore, most negative first) ═══\n')
  const top = rows.slice(0, 30)
  console.log('model'.padEnd(24), 'task'.padEnd(24), 'old', 'new', 'Δ', 'behav', '  structural')
  for (const r of top) {
    console.log(
      r.modelId.padEnd(24),
      r.taskId.padEnd(24),
      String(r.oldScore).padStart(3),
      String(r.newScore).padStart(3),
      (r.delta >= 0 ? '+' : '') + String(r.delta).padStart(3),
      `${r.behavioural}/${r.behaviouralMax}`.padStart(5),
      '  ' + r.structural
    )
  }

  const broken = rows.filter((r) => r.oldScore >= 90 && r.newScore < 70)
  if (broken.length > 0) {
    console.log('\n═══ ⚠ "100 but broken" — old score ≥ 90, new score < 70 ═══\n')
    for (const r of broken) {
      console.log(`  ${r.modelId.padEnd(24)} ${r.taskId.padEnd(24)} old=${r.oldScore} new=${r.newScore}`)
      for (const c of r.checks) {
        const icon = c.passed ? '✓' : '✗'
        console.log(`     ${icon} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`)
      }
    }
  } else {
    console.log('\n  (no records with old≥90 and new<70 — all previously-100 games still pass behavioural)')
  }

  const improved = rows.filter((r) => r.newScore > r.oldScore + 5)
  if (improved.length > 0) {
    console.log('\n═══ Improved (new − old > +5) ═══\n')
    for (const r of improved.slice(0, 10)) {
      console.log(`  ${r.modelId.padEnd(24)} ${r.taskId.padEnd(24)} ${r.oldScore} → ${r.newScore}`)
    }
  }
}

main().catch(async (e) => {
  console.error('[rescore] fatal:', e)
  await closeSandbox()
  process.exit(1)
})
