// Run the LLM benchmark harness against live providers (SPENDS MONEY).
//
//   npx tsx scripts/run-benchmark.mjs [--profile <name>] [overrides...]
//
//   --profile <name>     apply a named recipe from lib/lab/llm-benchmark/sweep-profiles.json
//   --model <id>         repeatable, or a comma list (default: kimi-k2.7)
//   --task <id>          repeatable, or a comma list (default: every task)
//   --plugins <a,b>      plugin bundles to mount (default: ALL registered);
//                        `--plugins none` = builtins only. Repeatable/comma list.
//   --iterations <n>     per task x model (default: the task's iterationsDefault)
//   --concurrency <n>    parallel task/model jobs (default: 3)
//   --timeout-ms <n>     per-call cap (default: the runner's 10 minutes)
//   --max-retries <n>    transient-error retries (default: 2; use 0 on slow models)
//   --bust-cache         ignore the response cache and force fresh paid calls
//   --list-profiles      print the named recipes and exit
//   --dump-config        print the effective config and exit WITHOUT running
//
// PRECEDENCE:  CLI flag  >  env var  >  profile  >  built-in default.
//
// The env vars (RUN_MODELS, RUN_TASKS, RUN_PLUGINS, RUN_ITERATIONS,
// RUN_CONCURRENCY, RUN_TIMEOUT_MS, RUN_MAX_RETRIES, RUN_BUST_CACHE) work as they
// always have — the Taskfile wrappers and the skill runbook depend on it. They
// are now the middle override layer rather than the only interface.
//
// The effective config is printed before EVERY run, with the provenance of each
// value, so what is about to be spent is visible before it is spent.
//
// BEHAVIOUR CHANGE (final-review pass): an unknown --model/--task id is now
// FATAL, even when other ids in the same flag matched. It used to run the
// partial set silently, which is how a typo'd id turned into a sweep of the
// wrong shape that nobody noticed until the rows were missing.
import {
  BENCHMARK_MODELS,
  BENCHMARK_TASKS,
} from '../lib/lab/llm-benchmark/registry.ts'
import { BENCHMARK_RESULTS, mergeResults } from '../lib/lab/llm-benchmark/results.ts'
import { createProviderRunner } from '../lib/lab/llm-benchmark/runners/provider.ts'
import { runBenchmark } from '../lib/lab/llm-benchmark/harness.ts'
import { closeSandbox } from '../lib/lab/llm-benchmark/scorers/sandbox.ts'
import { setSweepRoot } from '../lib/lab/llm-benchmark/runners/cli.ts'
import { setRunLogDir } from '../lib/lab/llm-benchmark/runlog.ts'
import { redactText } from '../lib/lab/llm-benchmark/redact.ts'
import { sweepRunId } from '../lib/lab/llm-benchmark/sweep.ts'
import { formatQuotaWindow, quotaLockedModels } from '../lib/lab/llm-benchmark/quota.ts'
import {
  SWEEP_PROFILES,
  estimateSweepDuration,
  excludedPluginTaskConflicts,
  filterTasksByPlugins,
  formatDuration,
  parseSweepArgs,
  resolveSweepConfig,
} from '../lib/lab/llm-benchmark/sweep-profiles.ts'
import { getPlugins } from '../lib/lab/llm-benchmark/plugins/index.ts'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'

function listProfiles() {
  console.log('Sweep profiles (lib/lab/llm-benchmark/sweep-profiles.json):\n')
  const width = Math.max(...Object.keys(SWEEP_PROFILES).map((name) => name.length))
  for (const [name, profile] of Object.entries(SWEEP_PROFILES)) {
    console.log(`  ${name.padEnd(width)}  ${profile.description}`)
  }
  console.log('\nUse: npx tsx scripts/run-benchmark.mjs --profile <name> [--model <id>] [--task <id>]')
}

let args
try {
  args = parseSweepArgs(process.argv.slice(2))
} catch (err) {
  console.error(err.message)
  console.error('Usage: npx tsx scripts/run-benchmark.mjs [--profile <name>] [--model <id>] [--task <id>] ...')
  process.exit(1)
}

if (args.listProfiles) {
  listProfiles()
  process.exit(0)
}

let config
try {
  config = resolveSweepConfig({ flags: args.flags, env: process.env, profile: args.profile })
} catch (err) {
  console.error(err.message)
  // The recipe list is the useful next step ONLY when a profile is in play; a
  // bad --plugins id already prints its own roster, and burying that under 6
  // unrelated lines is how a clear error becomes an unread one.
  if (args.profile !== undefined) {
    console.error('')
    listProfiles()
  }
  process.exit(1)
}

// Plugin bundle selection. `config.plugins.value === undefined` means "every
// registered plugin" — resolved to the concrete roster HERE so the dump, the
// task filter and the run-log snapshot all talk about the same explicit set
// rather than about an absence.
const ALL_PLUGIN_IDS = getPlugins().map((p) => p.id)
const ACTIVE_PLUGINS = config.plugins.value ?? ALL_PLUGIN_IDS

const IGNORE_QUOTA_LOCK =
  process.env.RUN_IGNORE_QUOTA_LOCK === '1' || process.env.RUN_IGNORE_QUOTA_LOCK === 'true'
// CLI file-handoff providers (agy/codex/opencode) write unique per-iteration
// artifact files now, so concurrency > 1 is safe — but each opencode call is
// slow (minutes), so the default of 3 is a reasonable sweep shape.

// Forensic sweep root, computed ONCE at startup so every iteration of this run
// writes under the same tree: sweeps/<run-id>/{scratch,artifacts}/. Gitignored
// and never pruned by the run itself — `node scripts/sweep-clean.mjs` is the
// cleanup path. Override with SWEEP_ROOT (absolute or repo-relative).
//
// The default run id has one-second resolution, so two sweeps started in the
// same second would derive the SAME root and interleave their run logs (one
// file per model×task per sweep — the second writer truncates the first's log
// on open). Suffix -2, -3, … past anything already on disk. An explicit
// SWEEP_ROOT is used verbatim: that is the operator's stated choice, including
// the deliberate "write into that existing tree" case.
const SWEEP_ROOT = process.env.SWEEP_ROOT
  ? resolve(process.cwd(), process.env.SWEEP_ROOT)
  : uniqueSweepRoot(resolve(process.cwd(), `sweeps/${sweepRunId()}`))

/** First free `<base>`, `<base>-2`, `<base>-3`, … (bounded; see above). */
function uniqueSweepRoot(base) {
  if (!existsSync(base)) return base
  for (let n = 2; n < 100; n++) {
    const candidate = `${base}-${n}`
    if (!existsSync(candidate)) return candidate
  }
  // 99 same-second sweeps is not a real scenario; fall back rather than loop.
  return base
}

/**
 * `  label   value   (source)` — one row of the effective-config dump.
 *
 * Every value goes through `redactText`. HONEST NOTE: no row can carry a
 * credential TODAY — the dump prints model names, task ids, integers, booleans
 * and repo-relative paths, and the provider API keys read further down in
 * `main()` are never printed at all. This is not cargo-culted anyway: `row` is
 * the single choke point through which any future knob would be echoed
 * (profiles are data in `sweep-profiles.json` and an operator adding, say, a
 * `baseUrl` row would otherwise print `https://user:pass@host` unredacted), and
 * the cost is one `SECRET_NAME_PATTERN.test` per line.
 */
function row(label, value, source) {
  const text = redactText(String(value))
  console.log(`  ${label.padEnd(14)}${text.padEnd(48)}${source ? `(${source})` : ''}`.trimEnd())
}

/**
 * The dsh `--dump-config` idea: print the booted config, with the provenance of
 * every value, before anything is spent.
 */
function dumpConfig({ models, tasks, locks, outPath }) {
  console.log(
    redactText(
      `\n[harness] effective config${config.profile ? ` — profile "${config.profile}": ${SWEEP_PROFILES[config.profile].description}` : ''}`
    )
  )
  row('models', `${models.length}: ${models.map((m) => m.name).join(', ')}`, config.models.source)
  // The task count can shrink for TWO reasons (--task, and an unmounted
  // plugin). The row's provenance covers only the first, so say the second out
  // loud — "7 of 8 (default)" would otherwise read as a bug.
  const excludedByPlugins = BENCHMARK_TASKS.length - filterTasksByPlugins(BENCHMARK_TASKS, ACTIVE_PLUGINS).length
  row(
    'tasks',
    (tasks.length === BENCHMARK_TASKS.length
      ? `all ${tasks.length}`
      : `${tasks.length} of ${BENCHMARK_TASKS.length}: ${tasks.map((t) => t.id).join(', ')}`) +
      (excludedByPlugins > 0 ? ` [${excludedByPlugins} excluded by plugin set]` : ''),
    config.tasks.source
  )
  row(
    'plugins',
    config.plugins.value === undefined
      ? `all (${ALL_PLUGIN_IDS.length})${ALL_PLUGIN_IDS.length > 0 ? `: ${ALL_PLUGIN_IDS.join(', ')}` : ''}`
      : ACTIVE_PLUGINS.length === 0
        ? 'none — builtins only'
        : `${ACTIVE_PLUGINS.length} of ${ALL_PLUGIN_IDS.length}: ${ACTIVE_PLUGINS.join(', ')}`,
    config.plugins.source
  )
  // With no explicit iterations each task uses its own iterationsDefault; show
  // the distinct values rather than one number per task.
  const perTaskDefaults = [...new Set(tasks.map((t) => t.iterationsDefault))].join('/')
  row(
    'iterations',
    config.iterations.value ?? `per-task default (${perTaskDefaults})`,
    config.iterations.source
  )
  row('concurrency', config.concurrency.value, config.concurrency.source)
  row(
    'timeoutMs',
    config.timeoutMs.value ? `${config.timeoutMs.value} (${formatDuration(config.timeoutMs.value)})` : 'runner default',
    config.timeoutMs.source
  )
  row('maxRetries', config.maxRetries.value ?? 'runner default (2)', config.maxRetries.source)
  row('bustCache', config.bustCache.value, config.bustCache.source)
  row('sweep root', `${relative(process.cwd(), SWEEP_ROOT)}/`, process.env.SWEEP_ROOT ? 'env' : 'default')
  row('results', relative(process.cwd(), outPath), process.env.RESULTS_OUT_PATH ? 'env' : 'default')
  row(
    'quota lock',
    locks.length === 0
      ? 'none'
      : locks.map((l) => `${l.modelId} until ${l.until}`).join('; ') + (IGNORE_QUOTA_LOCK ? ' (IGNORED)' : ''),
    locks.length === 0 ? '' : IGNORE_QUOTA_LOCK ? 'RUN_IGNORE_QUOTA_LOCK' : 'would abort'
  )
}

/**
 * Rough duration estimate from historical mean runtimeMs per (model, task).
 * Omitted entirely when nothing in this sweep has history — a "~0s" line would
 * read as a promise rather than an absence of evidence.
 */
function dumpEstimate({ models, tasks, results }) {
  const pairs = []
  for (const task of tasks) {
    for (const model of models) {
      pairs.push({
        modelId: model.id,
        taskId: task.id,
        iterations: config.iterations.value ?? task.iterationsDefault,
      })
    }
  }
  const estimate = estimateSweepDuration(results, pairs, config.concurrency.value)
  if (estimate.pairsWithHistory === 0) {
    row('est. duration', 'unknown — no historical runtimes for these pairs', 'history')
    return
  }
  const missing =
    estimate.pairsWithoutHistory > 0 ? `, ${estimate.pairsWithoutHistory} pair(s) with no history count as 0` : ''
  row(
    'est. duration',
    `~${formatDuration(estimate.totalMs)} (ROUGH: ${estimate.pairsWithHistory}/${pairs.length} pairs${missing})`,
    'history'
  )
}

/**
 * Ids that matched nothing in the registry. A PARTIAL match used to run
 * silently — `--model kimi-k2.7 --model kimi-k2.8` (typo) would sweep one model
 * while the operator believed they were sweeping two, and the missing rows only
 * surface hours later. parseSweepArgs already treats an unknown FLAG as fatal;
 * an unknown ID is the same class of mistake.
 */
function unknownIds(requested, known) {
  const ids = new Set(known)
  return requested.filter((id) => !ids.has(id))
}

function reportUnknown(kind, unknown, known) {
  console.error(
    `Unknown ${kind} id(s): ${unknown.join(', ')} (known: ${known.slice(0, 6).join(', ')}${known.length > 6 ? `, … ${known.length - 6} more` : ''})`
  )
}

async function main() {
  const modelIds = BENCHMARK_MODELS.map((m) => m.id)
  const unknownModels = unknownIds(config.models.value, modelIds)
  if (unknownModels.length > 0) {
    reportUnknown('model', unknownModels, modelIds)
    process.exit(1)
  }
  const models = BENCHMARK_MODELS.filter((m) => config.models.value.includes(m.id))
  if (models.length === 0) {
    console.error(`No matching models found for: ${config.models.value.join(', ')}`)
    process.exit(1)
  }

  const taskIds = BENCHMARK_TASKS.map((t) => t.id)
  const unknownTasks = config.tasks.value ? unknownIds(config.tasks.value, taskIds) : []
  if (unknownTasks.length > 0) {
    reportUnknown('task', unknownTasks, taskIds)
    process.exit(1)
  }
  // Naming a task whose plugin this sweep does not mount is a self-contradicting
  // instruction — fatal, like an unknown id, rather than a silently smaller run.
  const conflicts = excludedPluginTaskConflicts(config.tasks.value, BENCHMARK_TASKS, ACTIVE_PLUGINS)
  if (conflicts.length > 0) {
    for (const { taskId, pluginId } of conflicts) {
      console.error(
        `Task "${taskId}" comes from plugin "${pluginId}", which this sweep does not mount (plugins: ${
          ACTIVE_PLUGINS.length === 0 ? 'none — builtins only' : ACTIVE_PLUGINS.join(', ')
        }, from ${config.plugins.source}).`
      )
    }
    console.error('Add the plugin to --plugins, or drop the --task.')
    process.exit(1)
  }

  const requested = config.tasks.value
    ? BENCHMARK_TASKS.filter((t) => config.tasks.value.includes(t.id))
    : BENCHMARK_TASKS
  const tasks = filterTasksByPlugins(requested, ACTIVE_PLUGINS)
  if (tasks.length === 0) {
    console.error(`No matching tasks found for: ${config.tasks.value?.join(', ') ?? 'the active plugin set'}`)
    process.exit(1)
  }

  // Where results live. Read here (not just written) because the pre-flight
  // below has to see the CURRENT on-disk state, not the snapshot bundled into
  // BENCHMARK_RESULTS at import time.
  const outPath = resolve(process.cwd(), process.env.RESULTS_OUT_PATH ?? 'lib/lab/llm-benchmark/results.json')
  const readResults = () => {
    try {
      return JSON.parse(readFileSync(outPath, 'utf8'))
    } catch {
      return BENCHMARK_RESULTS // first run or unreadable file
    }
  }

  // Quota pre-flight: a model whose last run died on a quota error with a
  // stated reset window is guaranteed to fail every call until that window
  // passes. Abort BEFORE creating the runner rather than burning a sweep (and
  // a sweep tree, and log noise) on certain failures.
  const results = readResults()
  const locks = quotaLockedModels(results, models.map((m) => m.id))

  dumpConfig({ models, tasks, locks, outPath })
  dumpEstimate({ models, tasks, results })
  console.log('')

  if (args.dumpConfig) return // --dump-config: show the shape, spend nothing.

  setSweepRoot(SWEEP_ROOT)
  // Per-iteration run logs live in the SAME tree: sweeps/<run-id>/<model>-<task>.jsonl
  // (+ a shared content-addressed spill/ store). Replay one with
  // `npx tsx scripts/retrace.mjs --run <run-id>`.
  setRunLogDir(SWEEP_ROOT)
  console.log(`[harness] sweep root: ${relative(process.cwd(), SWEEP_ROOT)}/`)

  if (locks.length > 0) {
    for (const lock of locks) {
      const remainingMs = Date.parse(lock.until) - Date.now()
      console.error(
        `[harness] ${lock.modelId} is quota-locked until ${lock.until} (~${formatQuotaWindow(remainingMs)} from now)`
      )
    }
    if (!IGNORE_QUOTA_LOCK) {
      console.error(
        '[harness] aborting before any calls — set RUN_IGNORE_QUOTA_LOCK=1 to run anyway (the estimate comes from the provider and can be wrong or stale)'
      )
      process.exit(1)
    }
    console.warn('[harness] RUN_IGNORE_QUOTA_LOCK=1 — proceeding despite the lock above')
  }

  const TIMEOUT_MS = config.timeoutMs.value

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
    // CLI-based providers use the user's locally-authenticated CLIs; no API key
    // needed — but each one gets the sweep's timeout explicitly. The outer
    // withTimeout honours config.timeoutMs already; the INNER runCli timer comes
    // from the per-provider config and otherwise stays at cli.ts's 10-minute
    // default, so a --timeout-ms of 25m would be silently capped at 10m by the
    // child-process kill (the slow-model profile promised 25 and delivered 10).
    agy: TIMEOUT_MS ? { timeoutMs: TIMEOUT_MS } : {},
    codex: TIMEOUT_MS ? { timeoutMs: TIMEOUT_MS } : {},
    opencode: TIMEOUT_MS ? { timeoutMs: TIMEOUT_MS } : {},
    bustCache: config.bustCache.value,
    timeoutMs: TIMEOUT_MS,
    maxRetries: config.maxRetries.value,
    // Audit only: stamped into every run log's header snapshot so a trace
    // records the bundle scope it ran under.
    plugins: ACTIVE_PLUGINS,
  })

  // Replace existing results for the (model, task) combinations we just ran;
  // keep everything else. mergeResults protects good baseline records from
  // being overwritten by 0-success quota/outage failures.
  const writeResults = (fresh) => {
    // Re-read the on-disk results on every write so concurrent runs (or a
    // hand edit between iterations) aren't clobbered by the stale snapshot
    // this process loaded at startup.
    const baseline = readResults()
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
    `Running ${config.iterations.value ?? 'default'} iteration(s) at concurrency ${config.concurrency.value} for: ${models.map((m) => m.name).join(', ')} on ${tasks.length} task(s)`
  )

  try {
    const fresh = await runBenchmark(
      recordingRunner,
      tasks,
      models,
      config.iterations.value,
      config.concurrency.value
    )
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
