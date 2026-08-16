// Replay a benchmark run log as a human transcript.
//
// Every sweep writes one append-only JSONL per (model, task) under
// sweeps/<run-id>/ (see lib/lab/llm-benchmark/runlog.ts). This script turns one
// back into the story it recorded: the prompt that was sent, every attempt and
// retry, the response, the artifact that was actually scored, each check's
// verdict, and the aggregate that landed in results.json.
//
// Run: npx tsx scripts/retrace.mjs --run <run-id> [--model <id>] [--task <id>]
//                                  [--iteration <n>] [--full]
//
//   --run <run-id>    sweep directory under sweeps/ (required)
//   --model <id>      only logs for this model id
//   --task <id>       only logs for this task id
//   --iteration <n>   only this iteration index (0-based)
//   --full            inline full spilled content instead of the preview
//
// SWEEPS_DIR overrides the directory scanned (default <repo>/sweeps).
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readRunLog } from '../lib/lab/llm-benchmark/runlog.ts'

const USAGE =
  'Usage: npx tsx scripts/retrace.mjs --run <run-id> [--model <id>] [--task <id>] [--iteration <n>] [--full]'

function parseArgs(argv) {
  const options = { run: undefined, model: undefined, task: undefined, iteration: undefined, full: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--full') {
      options.full = true
    } else if (arg === '--run') {
      options.run = argv[++i]
    } else if (arg === '--model') {
      options.model = argv[++i]
    } else if (arg === '--task') {
      options.task = argv[++i]
    } else if (arg === '--iteration') {
      options.iteration = Number(argv[++i])
    } else {
      console.error(`Unknown argument: ${arg}`)
      console.error(USAGE)
      process.exit(1)
    }
  }
  if (!options.run) {
    console.error('--run <run-id> is required')
    console.error(USAGE)
    process.exit(1)
  }
  if (options.iteration !== undefined && !Number.isInteger(options.iteration)) {
    console.error('--iteration must be an integer (0-based)')
    process.exit(1)
  }
  return options
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const EXCERPT_LINES = 8
const EXCERPT_LINE_CHARS = 140

function indent(text, prefix = '        ') {
  return text
    .split('\n')
    .map((line) => prefix + line)
    .join('\n')
}

/**
 * Bounded excerpt for the default transcript: enough to recognise the artifact,
 * short enough that a 5-iteration task still fits on a screen. `--full` prints
 * the whole thing (resolving the spill file).
 */
function excerpt(text, options) {
  if (options.full) return text
  const lines = text.split('\n')
  const shown = lines
    .slice(0, EXCERPT_LINES)
    .map((line) => (line.length > EXCERPT_LINE_CHARS ? `${line.slice(0, EXCERPT_LINE_CHARS)}…` : line))
  if (lines.length > EXCERPT_LINES) shown.push(`… (+${lines.length - EXCERPT_LINES} more lines)`)
  return shown.join('\n')
}

/** Render a possibly-spilled string field: preview by default, full with --full. */
function renderValue(runDir, value, options) {
  if (typeof value === 'string') {
    return { summary: `${formatBytes(Buffer.byteLength(value))} inline`, body: value }
  }
  if (!value || typeof value !== 'object') return { summary: '(none)', body: '' }
  let body = value.preview ?? ''
  if (options.full) {
    try {
      body = readFileSync(join(runDir, value.spillRef), 'utf8')
    } catch (err) {
      body = `${value.preview ?? ''}\n[retrace] could not read ${value.spillRef}: ${err.message}`
    }
  }
  return {
    summary: `${formatBytes(value.bytes)} spilled -> ${value.spillRef}${options.full ? '' : ' (preview)'}`,
    body,
  }
}

function transcribe(runDir, file, options) {
  const path = join(runDir, file)
  const { header, events } = readRunLog(path)

  const cfg = header.configSnapshot ?? {}
  console.log('='.repeat(78))
  console.log(`${header.modelId} :: ${header.taskId}`)
  console.log(`  run ${header.runId}  file ${file}  created ${header.createdAt}`)
  console.log(
    `  config: iterations=${cfg.iterations} timeoutMs=${cfg.timeoutMs} maxRetries=${cfg.maxRetries} bustCache=${cfg.bustCache}`
  )
  console.log(`  ${events.length} event(s)`)

  const iterations = new Map()
  const aggregates = []
  for (const event of events) {
    if (event.type === 'aggregate') {
      aggregates.push(event)
      continue
    }
    const key = event.iterationIndex ?? -1
    if (!iterations.has(key)) iterations.set(key, [])
    iterations.get(key).push(event)
  }

  for (const [index, group] of [...iterations.entries()].sort((a, b) => a[0] - b[0])) {
    if (options.iteration !== undefined && index !== options.iteration) continue
    console.log('')
    console.log(`--- iteration #${index + 1} (index ${index}) ---`)
    for (const event of group) {
      const ts = event.ts ?? ''
      switch (event.type) {
        case 'request':
          console.log(`  [${ts}] request  prompt ${event.promptLength} chars  sha256 ${event.promptHash}`)
          break
        case 'retry':
          console.log(
            `  [${ts}] retry    attempt ${event.attempt} (${event.kind}) after ${event.delayMs}ms: ${event.error}`
          )
          break
        case 'response': {
          const raw = renderValue(runDir, event.rawOutput, options)
          console.log(
            `  [${ts}] response ${event.cacheHit ? 'CACHE HIT' : 'live'}  ${event.tokensIn} in / ${event.tokensOut} out tokens  ${event.runtimeMs}ms  raw: ${raw.summary}`
          )
          if (raw.body) console.log(indent(excerpt(raw.body, options)))
          break
        }
        case 'clean': {
          const cleaned = renderValue(runDir, event.output, options)
          console.log(`  [${ts}] clean    scored artifact: ${cleaned.summary}`)
          if (cleaned.body) console.log(indent(excerpt(cleaned.body, options)))
          break
        }
        case 'failure':
          console.log(
            `  [${ts}] FAILURE  ${event.failureReason}${event.timedOut ? ' (timed out)' : ''}: ${event.error}`
          )
          break
        case 'check': {
          const check = event.check ?? {}
          const detail = check.detail ? ` — ${check.detail}` : ''
          console.log(
            `  [${ts}] check    ${check.passed ? 'PASS' : 'FAIL'} ${check.name} ${check.points}/${check.maxPoints}${detail}`
          )
          break
        }
        default:
          console.log(`  [${ts}] ${event.type} ${JSON.stringify(event)}`)
      }
    }
  }

  for (const event of aggregates) {
    const result = event.result ?? {}
    console.log('')
    console.log(`--- aggregate ---`)
    console.log(
      `  score ${result.score}  status ${result.status}  failureReason ${result.failureReason}  ` +
        `${result.iterationsSucceeded}/${result.iterations} iteration(s) succeeded`
    )
    if (result.iterationScores) console.log(`  iterationScores: [${result.iterationScores.join(', ')}]`)
    console.log(
      `  ${result.tokensIn} in / ${result.tokensOut} out tokens  mean ${result.runtimeMs}ms  $${result.costUsd}`
    )
    if (result.runLogRef) console.log(`  runLogRef: ${result.runLogRef.runId}/${result.runLogRef.file}`)
    if (result.output) {
      const published = renderValue(runDir, result.output, options)
      console.log(`  published artifact: ${published.summary}`)
      if (options.full && published.body) console.log(indent(published.body))
    }
  }
}

const options = parseArgs(process.argv.slice(2))
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runDir = resolve(root, process.env.SWEEPS_DIR ?? 'sweeps', options.run)

let files
try {
  files = readdirSync(runDir).filter((name) => name.endsWith('.jsonl')).sort()
} catch {
  console.error(`No such run: ${runDir}`)
  process.exit(1)
}

// The filename is `<modelId>-<taskId>.jsonl`, but both ids contain hyphens, so
// filter on the HEADER rather than on the name.
const matching = files.filter((file) => {
  try {
    const { header } = readRunLog(join(runDir, file))
    if (options.model && header.modelId !== options.model) return false
    if (options.task && header.taskId !== options.task) return false
    return true
  } catch (err) {
    console.warn(`[retrace] skipping ${file}: ${err.message}`)
    return false
  }
})

if (matching.length === 0) {
  console.error(
    `No run logs in ${runDir}${options.model ? ` for model ${options.model}` : ''}${options.task ? ` task ${options.task}` : ''}.`
  )
  process.exit(1)
}

for (const file of matching) transcribe(runDir, file, options)
console.log('')
console.log(`${matching.length} run log(s) from ${runDir}`)
