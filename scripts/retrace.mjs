// Replay a benchmark run log as a human transcript.
//
// Every sweep writes one append-only JSONL per (model, task) under
// sweeps/<run-id>/ (see lib/lab/llm-benchmark/runlog.ts). This script turns one
// back into the story it recorded: the prompt that was sent, every attempt and
// retry, the response, the artifact that was actually scored, each check's
// verdict, and the aggregate that landed in results.json.
//
// Run: npx tsx scripts/retrace.mjs (--run <run-id> | --dir <path>)
//                                  [--model <id>] [--task <id>]
//                                  [--iteration <n>] [--full]
//
//   --run <run-id>    sweep directory under sweeps/
//   --dir <path>      ANY directory shaped like a run: `<model>-<task>.jsonl`
//                     files plus a `spill/` store beside them. That is exactly
//                     the shape of an extracted trace export ZIP from the site
//                     (lib/lab/llm-benchmark/trace-export.ts), so a reader who
//                     downloads a trace can replay it here without a sweeps/
//                     tree, without a run id, and without the network. Exactly
//                     one of --run / --dir is required.
//   --model <id>      only logs for this model id
//   --task <id>       only logs for this task id
//   --iteration <n>   only this iteration index (0-based)
//   --full            inline full spilled content instead of the preview
//
// SWEEPS_DIR overrides the directory --run resolves in (default <repo>/sweeps).
//
// The TRANSCRIPT FORMATTING itself lives in
// lib/lab/llm-benchmark/transcript.ts, so the MCP server (`bench_get_trace`)
// serves the same reading of a log rather than a second, drifting one. This
// script owns the CLI: arguments, run discovery, and the filesystem.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readRunLog } from '../lib/lab/llm-benchmark/runlog.ts'
import { renderTranscript } from '../lib/lab/llm-benchmark/transcript.ts'

const USAGE =
  'Usage: npx tsx scripts/retrace.mjs (--run <run-id> | --dir <path>) [--model <id>] [--task <id>] [--iteration <n>] [--full]'

function parseArgs(argv) {
  const options = {
    run: undefined,
    dir: undefined,
    model: undefined,
    task: undefined,
    iteration: undefined,
    full: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--full') {
      options.full = true
    } else if (arg === '--run') {
      options.run = argv[++i]
    } else if (arg === '--dir') {
      options.dir = argv[++i]
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
  // Exactly one source: taking both would silently ignore one, and the whole
  // point of --dir is replaying a tree that has no run id to disagree with.
  if (options.run && options.dir) {
    console.error('--run and --dir are mutually exclusive')
    console.error(USAGE)
    process.exit(1)
  }
  if (!options.run && !options.dir) {
    console.error('one of --run <run-id> or --dir <path> is required')
    console.error(USAGE)
    process.exit(1)
  }
  if (options.iteration !== undefined && !Number.isInteger(options.iteration)) {
    console.error('--iteration must be an integer (0-based)')
    process.exit(1)
  }
  return options
}

function transcribe(runDir, file, options) {
  const path = join(runDir, file)
  const { header, events } = readRunLog(path)
  console.log(
    renderTranscript(
      { header, events },
      {
        full: options.full,
        iteration: options.iteration,
        file,
        readSpill: (spillRef) => readFileSync(join(runDir, spillRef), 'utf8'),
      }
    )
  )
}

const options = parseArgs(process.argv.slice(2))
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// --dir resolves against the CWD (it names a place on the reader's machine —
// an extracted export, a copied run tree); --run against the sweeps root.
const runDir = options.dir
  ? resolve(process.cwd(), options.dir)
  : resolve(root, process.env.SWEEPS_DIR ?? 'sweeps', options.run)

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
