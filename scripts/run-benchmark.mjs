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
//   --resume <run-id>    land in sweeps/<run-id>/ and skip (model, task) pairs
//                        that already have an `aggregate` event there
//   --list-profiles      print the named recipes and exit
//   --dump-config        print the effective config and exit WITHOUT running
//
// PRECEDENCE:  CLI flag  >  env var  >  profile  >  built-in default.
// (`resume` is flag > env ONLY — see ResolvedSweepConfig.resume.)
//
// The env vars (RUN_MODELS, RUN_TASKS, RUN_PLUGINS, RUN_ITERATIONS,
// RUN_CONCURRENCY, RUN_TIMEOUT_MS, RUN_MAX_RETRIES, RUN_BUST_CACHE, RUN_RESUME)
// work as they always have — the Taskfile wrappers and the skill runbook depend
// on it. They are now the middle override layer rather than the only interface.
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
import { resolveCliCommands } from '../lib/lab/llm-benchmark/runners/execution-target.ts'
import { setRunLogDir } from '../lib/lab/llm-benchmark/runlog.ts'
import { redactText } from '../lib/lab/llm-benchmark/redact.ts'
import { sweepRunId } from '../lib/lab/llm-benchmark/sweep.ts'
import { formatQuotaWindow, quotaLockedModels } from '../lib/lab/llm-benchmark/quota.ts'
import {
  SWEEP_PROFILES,
  estimateSweepDuration,
  excludedPluginModelConflicts,
  excludedPluginTaskConflicts,
  filterTasksByPlugins,
  formatDuration,
  parseSweepArgs,
  resolveSweepConfig,
} from '../lib/lab/llm-benchmark/sweep-profiles.ts'
import {
  ResumeError,
  modelsWithPendingPairs,
  pairKey,
  planResume,
  readSweepCheckpoints,
  recoverResultFromAggregate,
  resumeRunDir,
} from '../lib/lab/llm-benchmark/resume.ts'
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
//
// A RESUME is the one case that deliberately lands in an EXISTING tree: the
// whole point is to reuse `sweeps/<run-id>/`'s checkpoints, leave the skipped
// pairs' logs and artifacts untouched, and let openRunLog truncate only the
// pairs actually re-run. `uniqueSweepRoot` suffixing must therefore not apply,
// and an explicit SWEEP_ROOT alongside --resume names two destinations at once
// — a self-contradicting instruction, so it is fatal rather than arbitrated.
const RESUME_RUN_ID = config.resume.value
const SWEEPS_DIR = resolve(process.cwd(), process.env.SWEEPS_DIR ?? 'sweeps')

let RESUME_DIR
if (RESUME_RUN_ID) {
  try {
    RESUME_DIR = resumeRunDir(SWEEPS_DIR, RESUME_RUN_ID)
  } catch (err) {
    console.error(err instanceof ResumeError ? `${err.code}: ${err.message}` : err)
    process.exit(1)
  }
  if (process.env.SWEEP_ROOT) {
    console.error(
      `RESUME_SWEEP_ROOT_CONFLICT: --resume ${RESUME_RUN_ID} lands in ${relative(process.cwd(), RESUME_DIR)}/, but SWEEP_ROOT=${process.env.SWEEP_ROOT} names a different destination.`
    )
    console.error('Unset SWEEP_ROOT, or drop --resume.')
    process.exit(1)
  }
}

const SWEEP_ROOT = RESUME_DIR
  ? RESUME_DIR
  : process.env.SWEEP_ROOT
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
function dumpConfig({ models, tasks, locks, outPath, resumePlan, cliStatus }) {
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
  if (resumePlan) {
    row(
      'resume',
      `${resumePlan.runId}: ${resumePlan.skipped.length} complete, ${resumePlan.rerun.length} to run, ${resumePlan.recover.length} recovered` +
        (resumePlan.bustCacheOverride
          ? ` [bust-cache overrode ${resumePlan.overriddenSkips} skip(s)]`
          : ''),
      config.resume.source
    )
  }
  row(
    'sweep root',
    `${relative(process.cwd(), SWEEP_ROOT)}/`,
    RESUME_RUN_ID ? 'resume' : process.env.SWEEP_ROOT ? 'env' : 'default'
  )
  row('results', relative(process.cwd(), outPath), process.env.RESULTS_OUT_PATH ? 'env' : 'default')
  // Only when a CLI provider is actually targeted — an all-API sweep has no
  // binaries to resolve and an empty row would be noise.
  if (cliStatus && cliStatus.length > 0) {
    row(
      'cli',
      cliStatus
        .map((s) => `${s.command} ${'missing' in s.resolution ? '✗ not found' : `✓ ${s.resolution.path}`}`)
        .join(' · '),
      'PATH'
    )
  }
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
function dumpEstimate({ models, tasks, results, resumePlan }) {
  const pairs = []
  for (const task of tasks) {
    for (const model of models) {
      // A resumed sweep will not run its skipped pairs, so their historical
      // runtimes are not part of what the operator is about to wait for.
      if (resumePlan?.skipKeys.has(pairKey(model.id, task.id))) continue
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
 * The resume decisions, one loud line per pair.
 *
 * Both halves are loud on purpose. A silent skip is indistinguishable from a
 * sweep that quietly ran nothing, and a silent re-run is indistinguishable from
 * one that resumed correctly — the operator has to be able to read the boundary
 * off the transcript.
 */
function reportResumePlan(plan) {
  if (plan.bustCacheOverride) {
    console.log(
      `[harness] resume: bust-cache is on — resume skips overridden, all ${plan.rerun.length} pair(s) re-run` +
        (plan.overriddenSkips > 0 ? ` (${plan.overriddenSkips} had a complete aggregate in run ${plan.runId})` : '')
    )
    return
  }
  for (const { modelId, taskId } of plan.skipped) {
    console.log(`[harness] resume: skipping ${modelId} :: ${taskId} (aggregate found in run ${plan.runId})`)
  }
  for (const { modelId, taskId, reason, events } of plan.rerun) {
    // A 0-success aggregate is COMPLETE and WORTHLESS — the quota-killed pair.
    // It gets its own line rather than being lumped in with "incomplete",
    // because the operator's question ("why is the pair I resumed FOR running
    // again?") has a different answer.
    if (reason === 'failed') {
      console.log(`[harness] resume: re-running ${modelId} :: ${taskId} (aggregate recorded 0 successes)`)
      continue
    }
    const why =
      reason === 'incomplete'
        ? `incomplete: ${events} events, no aggregate`
        : reason === 'unreadable-header'
          ? 'incomplete: run log header is unreadable'
          : 'incomplete: no run log in the target sweep'
    console.log(`[harness] resume: re-running ${modelId} :: ${taskId} (${why})`)
  }
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
  // The model-side twin of the task conflict check below. A plugin's MODEL is
  // merged into the registry unconditionally, so without this `--model echo-1
  // --plugins none` ran the plugin's model and generator while the run log's
  // header snapshotted `plugins: []` — provenance that lies.
  const modelConflicts = excludedPluginModelConflicts(models, ACTIVE_PLUGINS)
  if (modelConflicts.length > 0) {
    for (const { modelId, pluginId } of modelConflicts) {
      console.error(
        `Model "${modelId}" comes from plugin "${pluginId}", which this sweep does not mount (plugins: ${
          ACTIVE_PLUGINS.length === 0 ? 'none — builtins only' : ACTIVE_PLUGINS.join(', ')
        }, from ${config.plugins.source}).`
      )
    }
    console.error('Add the plugin to --plugins, or drop the --model.')
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

  // Resume boundary resolution. Typed rejection, exit 1: an unreadable or
  // absent target must never degrade into "run the whole sweep again", which is
  // the exact spend this flag exists to avoid.
  let resumePlan
  if (RESUME_RUN_ID) {
    try {
      resumePlan = planResume({
        checkpoints: readSweepCheckpoints(SWEEP_ROOT),
        modelIds: models.map((m) => m.id),
        taskIds: tasks.map((t) => t.id),
        recorded: readResults(),
        bustCache: config.bustCache.value,
        runId: RESUME_RUN_ID,
      })
    } catch (err) {
      if (err instanceof ResumeError) {
        console.error(`${err.code}: ${err.message}`)
        console.error(`Check the run id — \`ls ${relative(process.cwd(), SWEEPS_DIR)}/\` lists the sweeps on disk.`)
        process.exit(1)
      }
      throw err
    }
  }

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

  // Crash-window repair. The run log fsyncs its `aggregate` event BEFORE this
  // script merges the record into results.json, so a kill in that gap leaves a
  // pair that is provably complete on disk yet missing from (or stale in) the
  // published file. Re-running it would pay again for bytes already stored, so
  // re-derive the record from the log and merge it through the SAME
  // mergeResults path — which keeps the 0-success protection intact (a dropped
  // quota record is a legitimate absence, and merging it back is a no-op rather
  // than a clobber).
  //
  // RUNS BEFORE THE QUOTA PRE-FLIGHT, deliberately. It is a local file
  // operation that spends nothing, and a model locked out by quota is exactly
  // the case where the log holds an unrecovered record — aborting first meant
  // the free repair never happened on the runs that needed it most. Recovering
  // first also gives the pre-flight better data: a recovered quota failure
  // carries its `quotaNextResetAt`, so the lock it reports is the real one.
  // Skipped under --dump-config, which promises to change nothing.
  if (!args.dumpConfig && resumePlan && resumePlan.recover.length > 0) {
    const recovered = resumePlan.recover.map((entry) => {
      const result = recoverResultFromAggregate(
        SWEEP_ROOT,
        entry.aggregate,
        (warning) => console.warn(`[harness] resume: ${entry.modelId} :: ${entry.taskId} — ${warning}`),
        { quotaNextResetAt: entry.quotaNextResetAt }
      )
      console.log(
        `[harness] resume: recovered ${entry.modelId} :: ${entry.taskId} from its run log` +
          (entry.reason === 'stale' ? ' (results.json held an older run)' : '') +
          (entry.quotaNextResetAt ? ` — quota window ${entry.quotaNextResetAt}` : '')
      )
      return result
    })
    writeResults(recovered)
  }

  // Quota pre-flight: a model whose last run died on a quota error with a
  // stated reset window is guaranteed to fail every call until that window
  // passes. Abort BEFORE creating the runner rather than burning a sweep (and
  // a sweep tree, and log noise) on certain failures.
  //
  // SCOPED TO WHAT THIS RUN WILL CALL. On a resume the model set is the
  // original sweep's shape, not the remaining work: pairs already at their
  // durable boundary are skipped, so a model whose every pair is complete is
  // never called and its quota lock is irrelevant. Pre-flighting it anyway
  // aborted resumes that had nothing to do with the locked model — and made the
  // recovery monitor (which locks over PENDING models only) disagree with the
  // child it spawns, turning a `resume` verdict into a nonzero exit that stops
  // the whole watch. Non-resume sweeps call every model, so the set is unchanged.
  const results = readResults()
  const preflightModelIds = resumePlan
    ? modelsWithPendingPairs(
        models.map((m) => m.id),
        tasks.map((t) => t.id),
        resumePlan.skipKeys
      )
    : models.map((m) => m.id)
  const locks = quotaLockedModels(results, preflightModelIds)

  // CLI pre-flight: resolve every targeted CLI provider's binary on PATH. A
  // missing one used to surface as an ENOENT mid-sweep, AFTER the earlier calls
  // (and their spend) had already happened. Resolution is fs-only and spends
  // nothing, so it runs even under --dump-config — the `cli` row is exactly the
  // rehearsal that catches an uninstalled CLI before committing.
  const cliStatus = await resolveCliCommands(models)

  dumpConfig({ models, tasks, locks, outPath, resumePlan, cliStatus })
  dumpEstimate({ models, tasks, results, resumePlan })
  console.log('')

  if (args.dumpConfig) {
    // --dump-config: show the shape, spend nothing. The resume decisions are
    // part of the shape, so print them here too — this is the rehearsal an
    // operator does before committing to a resumed sweep.
    if (resumePlan) reportResumePlan(resumePlan)
    return
  }

  // Every missing CLI is reported, not just the first: one pre-flight run has
  // to tell the operator the whole install list. Fatal and un-overridable —
  // unlike a quota lock (a provider ESTIMATE that can be stale), "the binary is
  // not on PATH" is a local fact, and proceeding buys nothing but ENOENTs.
  const missingCli = cliStatus.filter((s) => 'missing' in s.resolution)
  if (missingCli.length > 0) {
    for (const { command, modelIds, resolution } of missingCli) {
      console.error(
        `[harness] ${command} CLI not found on PATH — needed by ${modelIds.join(', ')}. Install: ${resolution.hint}`
      )
    }
    process.exit(1)
  }

  setSweepRoot(SWEEP_ROOT)
  // Per-iteration run logs live in the SAME tree: sweeps/<run-id>/<model>-<task>.jsonl
  // (+ a shared content-addressed spill/ store). Replay one with
  // `npx tsx scripts/retrace.mjs --run <run-id>`.
  setRunLogDir(SWEEP_ROOT)
  console.log(`[harness] sweep root: ${relative(process.cwd(), SWEEP_ROOT)}/`)
  if (resumePlan) reportResumePlan(resumePlan)

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

  const pairCount = models.length * tasks.length - (resumePlan?.skipKeys.size ?? 0)
  console.log(
    `Running ${config.iterations.value ?? 'default'} iteration(s) at concurrency ${config.concurrency.value} for: ${models.map((m) => m.name).join(', ')} on ${tasks.length} task(s)` +
      (resumePlan ? ` — ${pairCount} pair(s) after the resume skip` : '')
  )

  if (pairCount === 0) {
    console.log('[harness] resume: every requested pair is already complete — nothing to run.')
  }

  try {
    const fresh = await runBenchmark(recordingRunner, tasks, models, config.iterations.value, {
      concurrency: config.concurrency.value,
      // The pair-level job filter (see RunBenchmarkOptions.skipPairs): a
      // skipped pair costs no call, and — because openRunLog truncates on
      // reopen — its existing run log and artifacts survive untouched.
      skipPairs: resumePlan?.skipKeys,
    })
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
