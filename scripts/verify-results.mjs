#!/usr/bin/env node
// Verify that results.json and the retained run logs are internally consistent.
//
// The checks (and the WHY behind each) live in
// lib/lab/llm-benchmark/verify-results.ts — this is a thin shell: load the
// results, scan sweeps/ for run logs, run the suite, print the report.
//
// Run: npx tsx scripts/verify-results.mjs [--strict] [--quiet]
//
//   --strict   exit 1 on warnings too (default: warnings are reported, exit 0)
//   --quiet    only print the summary line (and any failures)
//
// RESULTS_OUT_PATH overrides the results file (same env var the sweep script
// writes through). SWEEPS_DIR overrides the run-log root (default <repo>/sweeps).
//
// Exit codes: 0 clean, 1 at least one failure (or a warning under --strict).
// The results-only checks always run; the run-log checks skip naturally when
// no sweeps/ directory exists, which is the normal state of a fresh clone.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readRunLog } from '../lib/lab/llm-benchmark/runlog.ts'
import {
  RESULT_CHECKS,
  summarizeVerdicts,
  verifyResults,
} from '../lib/lab/llm-benchmark/verify-results.ts'

const USAGE = 'Usage: npx tsx scripts/verify-results.mjs [--strict] [--quiet]'

const options = { strict: false, quiet: false }
for (const arg of process.argv.slice(2)) {
  if (arg === '--strict') options.strict = true
  else if (arg === '--quiet') options.quiet = true
  else if (arg === '--help' || arg === '-h') {
    console.log(USAGE)
    process.exit(0)
  } else {
    console.error(`Unknown argument: ${arg}`)
    console.error(USAGE)
    process.exit(1)
  }
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const resultsPath = resolve(root, process.env.RESULTS_OUT_PATH ?? 'lib/lab/llm-benchmark/results.json')
const sweepsDir = resolve(root, process.env.SWEEPS_DIR ?? 'sweeps')

let results
try {
  results = JSON.parse(readFileSync(resultsPath, 'utf8'))
} catch (err) {
  console.error(`[verify-results] cannot read ${resultsPath}: ${err.message}`)
  process.exit(1)
}
if (!Array.isArray(results)) {
  console.error(`[verify-results] ${resultsPath} is not an array of records`)
  process.exit(1)
}

/** Every `sweeps/<run-id>/*.jsonl` on disk. Empty when sweeps/ is absent. */
function findRunLogs(dir) {
  if (!existsSync(dir)) return []
  const found = []
  for (const runId of readdirSync(dir).sort()) {
    const runDir = join(dir, runId)
    let entries
    try {
      if (!statSync(runDir).isDirectory()) continue
      entries = readdirSync(runDir)
    } catch {
      continue
    }
    for (const file of entries.sort()) {
      if (file.endsWith('.jsonl')) found.push({ runId, file, path: join(runDir, file) })
    }
  }
  return found
}

/**
 * Every retained artifact copy under `sweeps/<run-id>/artifacts/`.
 *
 * Content-addressed copies (`<sha256[:16]>.html`, #31) get re-hashed by the
 * `artifact-integrity` check; legacy run-scoped names and the store's own
 * `index.json` come back as skips, which is why they are listed rather than
 * filtered here — a silent filter would hide the day a name stops parsing.
 */
function findArtifacts(dir) {
  if (!existsSync(dir)) return []
  const found = []
  for (const runId of readdirSync(dir).sort()) {
    const artifactsDir = join(dir, runId, 'artifacts')
    try {
      if (!statSync(artifactsDir).isDirectory()) continue
      for (const file of readdirSync(artifactsDir).sort()) found.push({ runId, file })
    } catch {
      continue
    }
  }
  return found
}

/** Reads `sweeps/<runId>/<relPath>`; undefined when it is not on disk. */
function readContent(runId, relPath) {
  try {
    return readFileSync(join(sweepsDir, runId, relPath))
  } catch (err) {
    if (err.code === 'ENOENT') return undefined
    throw err
  }
}

const runLogs = findRunLogs(sweepsDir)
const artifactFiles = findArtifacts(sweepsDir)
const verdicts = verifyResults(results, {
  runLogs,
  readLog: readRunLog,
  artifactFiles,
  readContent,
})
const summary = summarizeVerdicts(verdicts, results.length)

const CHECK_TITLES = new Map(RESULT_CHECKS.map((c) => [c.id, c.title]))

function report(level, heading) {
  const matching = verdicts.filter((v) => v.level === level)
  if (matching.length === 0) return
  console.log('')
  console.log(`${heading} (${matching.length})`)
  const byCheck = new Map()
  for (const v of matching) {
    if (!byCheck.has(v.check)) byCheck.set(v.check, [])
    byCheck.get(v.check).push(v)
  }
  for (const [check, group] of byCheck) {
    console.log('')
    console.log(`  ${check} — ${CHECK_TITLES.get(check) ?? ''} (${group.length})`)
    // The WHY is the point of the report: a failure the reader cannot weigh
    // gets muted rather than fixed.
    if (group[0].why) console.log(`    WHY: ${group[0].why}`)
    for (const v of group) {
      console.log(`    ${v.recordKey ?? '(no key)'}${v.detail ? `: ${v.detail}` : ''}`)
    }
  }
}

if (!options.quiet) {
  console.log(`[verify-results] ${relative(root, resultsPath)} — ${results.length} record(s)`)
  console.log(
    `[verify-results] run logs: ${runLogs.length} file(s)${runLogs.length === 0 ? ` — nothing under ${relative(root, sweepsDir)}/, log checks skip` : ` under ${relative(root, sweepsDir)}/`}`
  )
}

report('fail', 'FAILURES')
report('warn', 'WARNINGS')

console.log('')
console.log(`[verify-results] ${summary.line}`)

const failed = summary.failures > 0 || (options.strict && summary.warnings > 0)
if (failed && options.strict && summary.failures === 0) {
  console.log('[verify-results] --strict: warnings are failures')
}
process.exit(failed ? 1 : 0)
