#!/usr/bin/env node
/**
 * Measure what the EXECUTABLE scorer (#15) would do to the numbers already on
 * the board — without touching them.
 *
 * `scripts/rescore-artifact.mjs` answers the same question for ONE record, but
 * it reads a sweep run log, and only the two most recent models have one. The
 * published `output` field in results.json IS the artifact for these two text
 * tasks (they are not spilled), so this walks every stored crypto-hash-race /
 * equation-solver record and prints recorded-vs-executable side by side.
 *
 * IT WRITES NOTHING. `verify-results`' stale-prompt check covers a PROMPT
 * change; there is no equivalent for a SCORER change, and building scorer
 * versioning is out of scope for #15. So this is the measurement that stands in
 * for it: a table a maintainer reads before deciding whether to re-score the
 * published records. The decision is theirs; the numbers are here and in
 * docs/lab/llm-benchmark/executable-scoring-impact.md.
 *
 * Run: npx tsx scripts/measure-executable-impact.mjs [--task <id>] [--json]
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BENCHMARK_TASKS } from '../lib/lab/llm-benchmark/registry.ts'
import { scoreExecutable, executableProbeTaskIds } from '../lib/lab/llm-benchmark/scorers/executable.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { default: records } = await import(`${root}/lib/lab/llm-benchmark/results.json`, {
  with: { type: 'json' },
})

const options = { task: undefined, json: false }
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (arg === '--json') options.json = true
  else if (arg === '--task') options.task = process.argv[++i]
  else {
    console.error(`Unknown argument: ${arg}`)
    process.exit(1)
  }
}

const probeTasks = new Set(executableProbeTaskIds())
const wanted = options.task ? new Set([options.task]) : probeTasks
const rows = []

for (const record of records) {
  if (!wanted.has(record.taskId)) continue
  const task = BENCHMARK_TASKS.find((t) => t.id === record.taskId)
  if (!task) continue
  const output = record.output ?? ''
  const result = await scoreExecutable(output, task)
  rows.push({
    modelId: record.modelId,
    taskId: record.taskId,
    recorded: record.score,
    executable: result.score,
    delta: Math.round((result.score - record.score) * 10) / 10,
    structural: Math.round(result.structural),
    executed: result.executedMax > 0 ? `${result.executed}/${result.executedMax}` : '—',
    fallback: result.fallbackKind ?? '',
    failing: result.checks
      .filter((c) => !c.passed && c.maxPoints > 0)
      .map((c) => c.name)
      .join(','),
    origin: result.program ? `${result.program.language}/${result.program.origin}` : '—',
  })
  if (!options.json) {
    process.stderr.write(`. ${record.modelId} ${record.taskId}\n`)
  }
}

rows.sort((a, b) => a.delta - b.delta)

if (options.json) {
  console.log(JSON.stringify(rows, null, 2))
} else {
  const pad = (v, n) => String(v).padEnd(n)
  console.log(
    `\n${pad('model', 30)}${pad('task', 18)}${pad('recorded', 10)}${pad('executable', 12)}${pad('delta', 8)}${pad('executed', 10)}${pad('origin', 22)}notes`
  )
  for (const r of rows) {
    console.log(
      pad(r.modelId, 30) +
        pad(r.taskId, 18) +
        pad(r.recorded, 10) +
        pad(r.executable, 12) +
        pad(r.delta > 0 ? `+${r.delta}` : r.delta, 8) +
        pad(r.executed, 10) +
        pad(r.origin, 22) +
        (r.fallback || r.failing)
    )
  }
  const executedRows = rows.filter((r) => !r.fallback)
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
  console.log(
    `\n${rows.length} record(s): ${executedRows.length} executed, ${rows.length - executedRows.length} codeFallback.`
  )
  console.log(
    `mean recorded ${mean(rows.map((r) => r.recorded)).toFixed(1)} → mean executable ${mean(
      rows.map((r) => r.executable)
    ).toFixed(1)} (executed-only: ${mean(executedRows.map((r) => r.recorded)).toFixed(1)} → ${mean(
      executedRows.map((r) => r.executable)
    ).toFixed(1)})`
  )
}
