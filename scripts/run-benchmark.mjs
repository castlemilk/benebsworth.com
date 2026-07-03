import {
  BENCHMARK_MODELS,
  BENCHMARK_TASKS,
  BENCHMARK_RESULTS,
} from '../lib/lab/llm-benchmark/registry.ts'
import { createProviderRunner } from '../lib/lab/llm-benchmark/runners/provider.ts'
import { runBenchmark } from '../lib/lab/llm-benchmark/harness.ts'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const MODELS_TO_RUN = process.env.RUN_MODELS ? process.env.RUN_MODELS.split(',') : ['kimi-k2.7']
const TASKS_TO_RUN = process.env.RUN_TASKS ? process.env.RUN_TASKS.split(',') : undefined
const ITERATIONS = process.env.RUN_ITERATIONS ? Number(process.env.RUN_ITERATIONS) : undefined
const CONCURRENCY = process.env.RUN_CONCURRENCY ? Number(process.env.RUN_CONCURRENCY) : 3
const RUN_BUST_CACHE = process.env.RUN_BUST_CACHE === '1' || process.env.RUN_BUST_CACHE === 'true'

async function main() {
  const models = BENCHMARK_MODELS.filter((m) => MODELS_TO_RUN.includes(m.id))
  if (models.length === 0) {
    console.error(`No matching models found for: ${MODELS_TO_RUN.join(', ')}`)
    process.exit(1)
  }

  const tasks = TASKS_TO_RUN ? BENCHMARK_TASKS.filter((t) => TASKS_TO_RUN.includes(t.id)) : BENCHMARK_TASKS
  if (tasks.length === 0) {
    console.error(`No matching tasks found for: ${TASKS_TO_RUN.join(', ')}`)
    process.exit(1)
  }

  const runner = createProviderRunner({
    moonshot: process.env.MOONSHOT_API_KEY
      ? { apiKey: process.env.MOONSHOT_API_KEY, baseUrl: process.env.MOONSHOT_BASE_URL }
      : undefined,
    openai: process.env.OPENAI_API_KEY ? { apiKey: process.env.OPENAI_API_KEY } : undefined,
    anthropic: process.env.ANTHROPIC_API_KEY ? { apiKey: process.env.ANTHROPIC_API_KEY } : undefined,
    google: process.env.GOOGLE_API_KEY ? { apiKey: process.env.GOOGLE_API_KEY } : undefined,
    // CLI-based providers use the user's locally-authenticated CLIs; no API key needed.
    agy: {},
    codex: {},
    bustCache: RUN_BUST_CACHE,
  })

  // Record every result as it completes so a mid-run failure can still write
  // the partial results collected so far.
  const collected = []
  const recordingRunner = {
    runTask: async (model, task, iterations) => {
      const results = await runner.runTask(model, task, iterations)
      collected.push(...results)
      return results
    },
  }

  // Replace existing results for the (model, task) combinations we just ran; keep everything else.
  const writeResults = (fresh) => {
    const freshKeys = new Set(fresh.map((r) => `${r.modelId}|${r.taskId}`))
    const existing = BENCHMARK_RESULTS.filter((r) => !freshKeys.has(`${r.modelId}|${r.taskId}`))
    const merged = [...existing, ...fresh]

    const outPath = resolve(process.cwd(), process.env.RESULTS_OUT_PATH ?? 'lib/lab/llm-benchmark/results.json')
    writeFileSync(outPath, JSON.stringify(merged, null, 2) + '\n')

    console.log(`Wrote ${merged.length} results to ${outPath}`)
    console.log(`Fresh runs: ${fresh.length}`)
  }

  console.log(
    `Running ${ITERATIONS ?? 'default'} iteration(s) at concurrency ${CONCURRENCY} for: ${models.map((m) => m.name).join(', ')} on ${tasks.length} task(s)`
  )

  try {
    const fresh = await runBenchmark(recordingRunner, tasks, models, ITERATIONS, CONCURRENCY)
    writeResults(fresh)
  } catch (err) {
    console.error(err)
    if (collected.length > 0) {
      console.error(`Run failed; writing ${collected.length} partial result(s) before exiting.`)
      writeResults(collected)
    }
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
