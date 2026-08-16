import {
  BENCHMARK_MODELS,
  BENCHMARK_TASKS,
} from '../lib/lab/llm-benchmark/registry.ts'
import { BENCHMARK_RESULTS, mergeResults } from '../lib/lab/llm-benchmark/results.ts'
import { createProviderRunner } from '../lib/lab/llm-benchmark/runners/provider.ts'
import { runBenchmark } from '../lib/lab/llm-benchmark/harness.ts'
import { closeSandbox } from '../lib/lab/llm-benchmark/scorers/sandbox.ts'
import { setSweepRoot } from '../lib/lab/llm-benchmark/runners/cli.ts'
import { sweepRunId } from '../lib/lab/llm-benchmark/sweep.ts'
import { readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'

const MODELS_TO_RUN = process.env.RUN_MODELS ? process.env.RUN_MODELS.split(',') : ['kimi-k2.7']
const TASKS_TO_RUN = process.env.RUN_TASKS ? process.env.RUN_TASKS.split(',') : undefined
const ITERATIONS = process.env.RUN_ITERATIONS ? Number(process.env.RUN_ITERATIONS) : undefined
const CONCURRENCY = process.env.RUN_CONCURRENCY ? Number(process.env.RUN_CONCURRENCY) : 3
const TIMEOUT_MS = process.env.RUN_TIMEOUT_MS ? Number(process.env.RUN_TIMEOUT_MS) : undefined
const MAX_RETRIES = process.env.RUN_MAX_RETRIES !== undefined ? Number(process.env.RUN_MAX_RETRIES) : undefined
const RUN_BUST_CACHE = process.env.RUN_BUST_CACHE === '1' || process.env.RUN_BUST_CACHE === 'true'
// CLI file-handoff providers (agy/codex/opencode) write unique per-iteration
// artifact files now, so concurrency > 1 is safe — but each opencode call is
// slow (minutes), so the default of 3 is a reasonable sweep shape.

// Forensic sweep root, computed ONCE at startup so every iteration of this run
// writes under the same tree: sweeps/<run-id>/{scratch,artifacts}/. Gitignored
// and never pruned by the run itself — `node scripts/sweep-clean.mjs` is the
// cleanup path. Override with SWEEP_ROOT (absolute or repo-relative).
const SWEEP_ROOT = resolve(process.cwd(), process.env.SWEEP_ROOT ?? `sweeps/${sweepRunId()}`)
setSweepRoot(SWEEP_ROOT)
console.log(`[harness] sweep root: ${relative(process.cwd(), SWEEP_ROOT)}/`)

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
    openrouter: process.env.OPENROUTER_API_KEY
      ? {
          apiKey: process.env.OPENROUTER_API_KEY,
          referer: process.env.OPENROUTER_REFERER ?? 'https://benebsworth.com/lab/llm-benchmark',
          title: process.env.OPENROUTER_TITLE ?? 'Ben Ebsworth LLM Benchmark',
        }
      : undefined,
    openai: process.env.OPENAI_API_KEY ? { apiKey: process.env.OPENAI_API_KEY } : undefined,
    anthropic: process.env.ANTHROPIC_API_KEY ? { apiKey: process.env.ANTHROPIC_API_KEY } : undefined,
    google: process.env.GOOGLE_API_KEY ? { apiKey: process.env.GOOGLE_API_KEY } : undefined,
    // CLI-based providers use the user's locally-authenticated CLIs; no API key needed.
    agy: {},
    codex: {},
    opencode: TIMEOUT_MS ? { timeoutMs: TIMEOUT_MS } : {},
    bustCache: RUN_BUST_CACHE,
    timeoutMs: TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  })

  // Replace existing results for the (model, task) combinations we just ran;
  // keep everything else. mergeResults protects good baseline records from
  // being overwritten by 0-success quota/outage failures.
  const outPath = resolve(process.cwd(), process.env.RESULTS_OUT_PATH ?? 'lib/lab/llm-benchmark/results.json')
  const writeResults = (fresh) => {
    // Re-read the on-disk results on every write so concurrent runs (or a
    // hand edit between iterations) aren't clobbered by the stale snapshot
    // this process loaded at startup.
    let baseline = BENCHMARK_RESULTS
    try {
      baseline = JSON.parse(readFileSync(outPath, 'utf8'))
    } catch { /* first run or unreadable file — fall back to the startup snapshot */ }
    const merged = mergeResults(baseline, fresh, (kept, dropped) => {
      console.warn(
        `[harness] kept existing ${kept.modelId} :: ${kept.taskId} (${kept.status}) — fresh run produced 0 successful iterations`
      )
    })

    writeFileSync(outPath, JSON.stringify(merged, null, 2) + '\n')

    console.log(`Wrote ${merged.length} results to ${outPath}`)
    console.log(`Fresh runs: ${fresh.length}`)
  }

  // Record every result as it completes and persist immediately: a long sweep
  // (7 tasks × 5 iterations × 200s/call) must never lose finished work to a
  // timeout, kill, or crash near the end.
  const collected = []
  const recordingRunner = {
    runTask: async (model, task, iterations) => {
      const results = await runner.runTask(model, task, iterations)
      collected.push(...results)
      writeResults(collected)
      return results
    },
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
    process.exitCode = 1
  } finally {
    // Behavioural scoring lazily launches a shared Playwright browser; leaving
    // it open keeps the event loop alive and the process hangs after the last
    // result is written. Close it before exit.
    await closeSandbox()
  }
}

main().then(
  () => {
    // Hard exit: a stray CLI child (opencode server, agy daemon) that escaped
    // its process-group kill would otherwise keep the sweep process alive
    // forever after all results are written. All work (including the
    // synchronous writeResults and the awaited saveQueue flush) is done.
    process.exit(process.exitCode ?? 0)
  },
  (err) => {
    console.error(err)
    process.exit(1)
  }
)
