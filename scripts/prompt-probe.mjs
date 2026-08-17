// Prompt-regression probes — the cheap narrow gate that runs BEFORE a sweep.
//
//   npx tsx scripts/prompt-probe.mjs [--model <id>] [--probe <id>] [--dry-run]
//
//   --model <id>      repeatable, or a comma list (default: the cheapest
//                     registered free model — see pickDefaultModel)
//   --probe <id>      repeatable, or a comma list (default: every probe)
//   --timeout-ms <n>  per-call cap (default: 60000 — a probe is a short reply;
//                     a model that needs longer is itself the finding)
//   --dry-run         print the probes and their asserts and exit; ZERO calls
//   --list            alias for --dry-run
//   --yes             required once (probes x models) exceeds 20 (spend guard)
//
// WHAT THIS IS. A full sweep is hours and dollars. Editing the sandbox contract
// (lib/lab/llm-benchmark/prompts.ts) or a task prompt has no behavioural gate
// before that spend — the unit tests assert the prompt TEXT, never what a model
// does when it reads it. Each probe is one short prompt plus deterministic
// asserts on the RAW reply (no LLM judge), so the whole set runs in minutes and,
// on the free tier, for nothing.
//
// RUNBOOK:  prompt/contract changed  ->  task bench:probe  ->  sweep.
//
// WHAT THIS IS NOT. Not a measurement. One generation per (probe, model)
// through `generateForProbe` — the real provider seam, with no cache, no
// retries, no scoring, no run log. Nothing here writes results.json, the
// response cache, or a sweep directory: a probe produces a pass/fail and
// exit 0/1, and can never touch the published leaderboard.
//
// Probes run SERIALLY. The set is small, the default model is a CLI provider
// (parallel CLI runs are unreliable — see `task bench:cli`), and a gate that
// prints its rows in a stable order is easier to read than a fast one.
import { BENCHMARK_MODELS } from '../lib/lab/llm-benchmark/registry.ts'
import { PROBES, evaluateProbe, probePrompt } from '../lib/lab/llm-benchmark/probes.ts'
import { generateForProbe } from '../lib/lab/llm-benchmark/runners/provider.ts'

const DEFAULT_TIMEOUT_MS = 60_000
/** Above this many (probe x model) calls, --yes is required. */
const CONFIRM_THRESHOLD = 20
/**
 * Shortest reply that counts as a reply — the same 40-char floor the harness
 * uses for a scoreable artifact (`aggregateRuns`).
 *
 * WITHOUT this, a probe whose asserts are all NEGATIVE (`css-sized-canvas`,
 * `scoped-context`) would PASS on an empty body: nothing to match means nothing
 * matched. "The model said nothing" must read as a failed gate, never as a
 * clean bill of health. The check lives here, not in `evaluateProbe`, because
 * it is a fact about the CALL, not about the assertions.
 */
const MIN_REPLY_CHARS = 40

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { models: [], probes: [], timeoutMs: undefined, dryRun: false, yes: false }
  const list = (raw) => raw.split(',').map((s) => s.trim()).filter(Boolean)
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const need = (name) => {
      const value = argv[++i]
      if (value === undefined || value.startsWith('--')) throw new Error(`${name} needs a value`)
      return value
    }
    switch (arg) {
      case '--model':
        out.models.push(...list(need('--model')))
        break
      case '--probe':
        out.probes.push(...list(need('--probe')))
        break
      case '--timeout-ms': {
        const value = Number(need('--timeout-ms'))
        if (!Number.isFinite(value) || value <= 0) throw new Error('--timeout-ms must be a positive number')
        out.timeoutMs = value
        break
      }
      case '--dry-run':
      case '--list':
        out.dryRun = true
        break
      case '--yes':
      case '-y':
        out.yes = true
        break
      case '--help':
      case '-h':
        out.help = true
        break
      default:
        // Same discipline as parseSweepArgs: an unknown flag is FATAL. A typo
        // that silently runs the default set is how a gate stops gating.
        throw new Error(`unknown argument: ${arg}`)
    }
  }
  return out
}

const USAGE =
  'Usage: npx tsx scripts/prompt-probe.mjs [--model <id>] [--probe <id>] [--timeout-ms <n>] [--dry-run] [--yes]'

let args
try {
  args = parseArgs(process.argv.slice(2))
} catch (err) {
  console.error(err.message)
  console.error(USAGE)
  process.exit(1)
}

if (args.help) {
  console.log(USAGE)
  process.exit(0)
}

// ---------------------------------------------------------------------------
// selection
// ---------------------------------------------------------------------------

/**
 * The cheapest registered free model, read from the REGISTRY rather than
 * hard-coded: a gate that defaults to a paid model gets run less, and a gate
 * that gets run less is not a gate.
 *
 * `deepseek-v4-flash-free` wins when it is registered — it is free, it is fast,
 * and it needs no API key (the locally-authenticated `opencode` CLI). Otherwise
 * the first zero-cost model in registration order is used, and the choice is
 * printed so it is never a surprise.
 */
function pickDefaultModel() {
  const free = BENCHMARK_MODELS.filter(
    (m) => (m.costPer1kInputUsd ?? 0) === 0 && (m.costPer1kOutputUsd ?? 0) === 0
  )
  const preferred = free.find((m) => m.id === 'deepseek-v4-flash-free')
  const chosen = preferred ?? free[0]
  if (!chosen) {
    console.error('No zero-cost model is registered — pass --model <id> explicitly.')
    process.exit(1)
  }
  return chosen
}

function resolveModels(ids) {
  if (ids.length === 0) return [pickDefaultModel()]
  const models = []
  for (const id of ids) {
    const model = BENCHMARK_MODELS.find((m) => m.id === id)
    if (!model) {
      console.error(`Unknown model id: ${id}`)
      console.error(`Registered: ${BENCHMARK_MODELS.map((m) => m.id).join(', ')}`)
      process.exit(1)
    }
    models.push(model)
  }
  return models
}

function resolveProbes(ids) {
  if (ids.length === 0) return PROBES
  const probes = []
  for (const id of ids) {
    const probe = PROBES.find((p) => p.id === id)
    if (!probe) {
      console.error(`Unknown probe id: ${id}`)
      console.error(`Available: ${PROBES.map((p) => p.id).join(', ')}`)
      process.exit(1)
    }
    probes.push(probe)
  }
  return probes
}

const models = resolveModels(args.models)
const probes = resolveProbes(args.probes)
const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS

// ---------------------------------------------------------------------------
// dry run
// ---------------------------------------------------------------------------

function describeAssert(assert) {
  const flags = assert.flags ? ` /${assert.flags}` : ''
  return `${assert.kind.padEnd(12)} ${JSON.stringify(assert.value)}${flags}`
}

if (args.dryRun) {
  console.log(`Probes (lib/lab/llm-benchmark/probes/probes.json) — ${probes.length} of ${PROBES.length}\n`)
  for (const probe of probes) {
    const composed = probePrompt(probe)
    console.log(`${probe.id}`)
    console.log(`  ${probe.description}`)
    console.log(
      `  prompt: ${probe.prompt.length} chars` +
        (probe.appendGlobalContract
          ? ` + the real SANDBOX_CONSTRAINTS (${composed.length - probe.prompt.length} chars, appended at run time)`
          : ' (no global contract)')
    )
    for (const assert of probe.asserts) console.log(`    ${describeAssert(assert)}`)
    console.log('')
  }
  console.log(`Would call: ${models.map((m) => m.id).join(', ')} — ${probes.length * models.length} generation(s), ${timeoutMs}ms cap each.`)
  console.log('Dry run — no calls made.')
  process.exit(0)
}

// ---------------------------------------------------------------------------
// spend guard
// ---------------------------------------------------------------------------

const callCount = probes.length * models.length
if (callCount > CONFIRM_THRESHOLD && !args.yes) {
  console.error(
    `${callCount} calls (${probes.length} probes x ${models.length} models) exceeds the ${CONFIRM_THRESHOLD}-call guard.`
  )
  console.error('Re-run with --yes if that is intended, or narrow it with --probe/--model.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

/**
 * A task-shaped object for the provider seam. `sandboxConstraints: ''` is
 * belt-and-braces: `generateForProbe` never calls `withSandboxConstraints`,
 * and if it ever did, this guarantees the contract is not appended twice —
 * `probePrompt()` already composed the full prompt.
 */
function probeTask(probe) {
  return {
    id: `probe-${probe.id}`,
    slug: `probe-${probe.id}`,
    category: 'prompt-probe',
    title: `probe: ${probe.id}`,
    blurb: probe.description,
    prompt: probePrompt(probe),
    runtimeHint: 'seconds',
    iterationsDefault: 1,
    methodNotes: 'prompt-regression probe (no scoring, not published)',
    demoComponentName: '',
    sandboxConstraints: '',
  }
}

const runnerConfig = {
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
  // CLI providers need no key; give each the probe's cap so the child process
  // dies with the probe rather than at cli.ts's 10-minute default.
  agy: { timeoutMs },
  codex: { timeoutMs },
  opencode: { timeoutMs },
  timeoutMs,
}

console.log(
  `Probing ${probes.length} probe(s) x ${models.length} model(s) = ${callCount} call(s), ${timeoutMs}ms cap each` +
    (args.models.length === 0 ? ` (default model: ${models[0].id})` : '')
)
console.log('')

const rows = []
let failed = 0

for (const model of models) {
  for (const probe of probes) {
    const label = `${probe.id} :: ${model.id}`
    const started = Date.now()
    let reply
    try {
      const response = await generateForProbe(runnerConfig, model, probeTask(probe), timeoutMs)
      reply = response.output ?? ''
    } catch (err) {
      // A call that never produced a reply is a probe failure, not a crash: the
      // gate's job is to say "do not sweep", and an unreachable model is one of
      // the reasons not to.
      const message = err instanceof Error ? err.message : String(err)
      rows.push({ probe: probe.id, model: model.id, ok: false, ms: Date.now() - started, error: message })
      failed++
      console.log(`FAIL ${label} — call failed: ${message}`)
      continue
    }
    if (reply.trim().length < MIN_REPLY_CHARS) {
      const detail = `reply was ${reply.trim().length} chars (< ${MIN_REPLY_CHARS}) — nothing to assert against`
      rows.push({ probe: probe.id, model: model.id, ok: false, ms: Date.now() - started, error: detail })
      failed++
      console.log(`FAIL ${label} — ${detail}`)
      continue
    }
    const evaluation = evaluateProbe(reply, probe)
    rows.push({
      probe: probe.id,
      model: model.id,
      ok: evaluation.passed,
      ms: Date.now() - started,
      failures: evaluation.failures,
      replyLength: reply.length,
    })
    if (!evaluation.passed) failed++
    console.log(
      `${evaluation.passed ? 'PASS' : 'FAIL'} ${label} (${Date.now() - started}ms, ${reply.length} chars)`
    )
  }
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

console.log('')
const probeWidth = Math.max(5, ...rows.map((r) => r.probe.length))
const modelWidth = Math.max(5, ...rows.map((r) => r.model.length))
console.log(`${'probe'.padEnd(probeWidth)}  ${'model'.padEnd(modelWidth)}  result  time`)
console.log(`${'-'.repeat(probeWidth)}  ${'-'.repeat(modelWidth)}  ------  ----`)
for (const row of rows) {
  console.log(
    `${row.probe.padEnd(probeWidth)}  ${row.model.padEnd(modelWidth)}  ${(row.ok ? 'pass' : 'FAIL').padEnd(6)}  ${(row.ms / 1000).toFixed(1)}s`
  )
}

const broken = rows.filter((r) => !r.ok)
if (broken.length > 0) {
  console.log('\nFailures:')
  for (const row of broken) {
    console.log(`\n  ${row.probe} :: ${row.model}`)
    if (row.error) {
      console.log(`    call failed: ${row.error}`)
      continue
    }
    for (const failure of row.failures) {
      const flags = failure.assert.flags ? ` /${failure.assert.flags}` : ''
      console.log(
        `    assert #${failure.index + 1} ${failure.assert.kind} ${JSON.stringify(failure.assert.value)}${flags}`
      )
      console.log(`      ${failure.detail}`)
    }
  }
}

console.log(`\n${rows.length - failed}/${rows.length} passed.`)
if (failed > 0) {
  console.log('Probe failures gate the sweep — fix the prompt/contract before spending on a run.')
  process.exit(1)
}
