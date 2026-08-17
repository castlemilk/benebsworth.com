#!/usr/bin/env node
/**
 * Ingest failing iterations from the local sweep trees into the failure
 * regression corpus (#25) — paperclip's Phase 4 "production-case ingestion".
 *
 * A sweep discovers broken artifacts every time it runs, and until this script
 * existed they lived only as long as `sweeps/` did (gitignored, pruned). They
 * are the regression cases: the exact inputs a prompt or scorer edit should be
 * re-tested against. This walks the run logs, selects the iterations that
 * FAILED — score < 40, or any tripped behavioural check — and files them.
 *
 * Run: npx tsx scripts/ingest-failures.mjs [--run <id>] [--dry-run] [--quiet]
 *
 *   --run <id>   only ingest sweeps/<id> (default: every local sweep tree)
 *   --dry-run    report what WOULD be written; touch nothing
 *   --quiet      summary only
 *
 * Writes, under `lib/lab/llm-benchmark/failure-corpus/`:
 *
 *   cases/<addr>.html   the artifact bytes — GITIGNORED. Model-generated HTML
 *                       that executes in a browser, large, and reproducible
 *                       from the sweep tree. Content-addressed, so the same
 *                       broken artifact from two runs is one file and re-ingest
 *                       is free.
 *   provenance.json     the metadata — COMMITTED. Which model, task, iteration,
 *                       score, failed checks, prompt bundle, sweep run. This is
 *                       the only durable record that a case exists; the bytes
 *                       beside it are recoverable, the story is not.
 *
 * Idempotent by construction: the case key is artifact+model+task+iteration and
 * `mergeProvenance` preserves the original `ingestedAt`, so re-running over the
 * same trees leaves provenance.json byte-identical.
 *
 * SWEEPS_DIR overrides the run-log root; CORPUS_DIR the corpus root.
 * Exit 0 always unless an argument is wrong or the corpus cannot be written —
 * this is an ingester, not a gate. `scripts/probe-corpus.mjs` re-runs the cases.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readRunLog } from '../lib/lab/llm-benchmark/runlog.ts'
import {
  mergeProvenance,
  selectFailureCases,
  toProvenanceEntry,
} from '../lib/lab/llm-benchmark/failure-corpus.ts'

const USAGE = 'Usage: npx tsx scripts/ingest-failures.mjs [--run <id>] [--dry-run] [--quiet]'

const options = { run: undefined, dryRun: false, quiet: false }
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]
  if (arg === '--run') options.run = argv[++i]
  else if (arg === '--dry-run') options.dryRun = true
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
if (options.run === undefined && argv.includes('--run')) {
  console.error('--run needs a sweep run id')
  process.exit(1)
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sweepsDir = resolve(root, process.env.SWEEPS_DIR ?? 'sweeps')
const corpusDir = resolve(root, process.env.CORPUS_DIR ?? 'lib/lab/llm-benchmark/failure-corpus')
const casesDir = join(corpusDir, 'cases')
const provenancePath = join(corpusDir, 'provenance.json')

/** Every `sweeps/<run-id>/*.jsonl`, filtered to `--run` when given. */
function findRunLogs() {
  if (!existsSync(sweepsDir)) return []
  const found = []
  for (const runId of readdirSync(sweepsDir).sort()) {
    if (options.run !== undefined && runId !== options.run) continue
    const runDir = join(sweepsDir, runId)
    try {
      if (!statSync(runDir).isDirectory()) continue
      for (const file of readdirSync(runDir).sort()) {
        if (file.endsWith('.jsonl')) found.push({ runId, file, path: join(runDir, file) })
      }
    } catch {
      continue
    }
  }
  return found
}

function log(...args) {
  if (!options.quiet) console.log(...args)
}

const runLogs = findRunLogs()
if (runLogs.length === 0) {
  console.log(
    `[ingest-failures] no run logs under ${relative(root, sweepsDir)}/${options.run ? `${options.run}/` : ''} — nothing to ingest`
  )
  process.exit(0)
}

const ingestedAt = new Date().toISOString()
const incoming = []
/** artifact address → bytes, so each blob is written once even across logs. */
const bytesByArtifact = new Map()
const totals = { logs: 0, cases: 0, unavailable: 0, skipped: 0 }
const skipDetail = new Map()

for (const entry of runLogs) {
  let parsed
  try {
    parsed = readRunLog(entry.path)
  } catch (err) {
    // A log with no header describes nothing; that is a sweep-tree problem, not
    // an ingestion problem, so it is reported and stepped over.
    log(`  ! ${entry.runId}/${entry.file}: ${err.message}`)
    continue
  }
  totals.logs++

  const selection = selectFailureCases(parsed, {
    artifactExists: (ref) => existsSync(join(sweepsDir, entry.runId, ref)),
  })

  for (const skip of selection.skipped) {
    totals.skipped++
    skipDetail.set(skip.reason, (skipDetail.get(skip.reason) ?? 0) + 1)
  }
  totals.unavailable += selection.unavailable.length

  for (const found of selection.cases) {
    // Read against the DIRECTORY the log was found in, not the header's runId:
    // they agree today, and if a tree were ever moved or renamed the directory
    // is the one that says where the bytes actually are (it is also what
    // `artifactExists` above just probed, so the two can never disagree).
    const bytes = found.inline ?? readFileSync(join(sweepsDir, entry.runId, found.spillRef), 'utf8')
    bytesByArtifact.set(found.artifact, bytes)
    incoming.push(toProvenanceEntry(found, ingestedAt))
    totals.cases++
  }

  if (selection.cases.length > 0 || selection.unavailable.length > 0) {
    log(
      `  ${entry.runId}/${entry.file}: ${selection.cases.length} case(s)` +
        (selection.unavailable.length > 0 ? `, ${selection.unavailable.length} unavailable` : '') +
        (selection.cases.length > 0
          ? ` — ${selection.cases.map((c) => `#${c.iterationIndex}@${c.score}${c.failedChecks.length > 0 ? ` [${c.failedChecks.join(',')}]` : ''}`).join(' ')}`
          : '')
    )
  }
}

const existing = existsSync(provenancePath) ? JSON.parse(readFileSync(provenancePath, 'utf8')) : []
const merged = mergeProvenance(existing, incoming)

if (!options.dryRun) {
  mkdirSync(casesDir, { recursive: true })
  for (const [artifact, bytes] of bytesByArtifact) {
    const casePath = join(casesDir, `${artifact}.html`)
    // Content-addressed: an existing file with this name already holds these
    // bytes (verify-results re-hashes them), so a rewrite would be a no-op that
    // only risks a torn write.
    if (!existsSync(casePath)) writeFileSync(casePath, bytes)
  }
  writeFileSync(provenancePath, `${JSON.stringify(merged.entries, null, 2)}\n`)
}

log('')
console.log(
  `[ingest-failures] ${totals.logs} log(s), ${totals.cases} failing iteration(s): ` +
    `${merged.added} new, ${merged.updated} updated, ${merged.unchanged} unchanged ` +
    `(corpus now ${merged.entries.length} case(s), ${bytesByArtifact.size} artifact(s) this run)`
)
if (totals.unavailable > 0) {
  console.log(
    `[ingest-failures] ${totals.unavailable} failing iteration(s) had no artifact on disk (pruned sweep) — not ingested`
  )
}
if (totals.skipped > 0) {
  console.log(
    `[ingest-failures] skipped: ${[...skipDetail].map(([reason, n]) => `${reason} ×${n}`).join(', ')}`
  )
}
if (options.dryRun) console.log('[ingest-failures] --dry-run: nothing written')
else console.log(`[ingest-failures] wrote ${relative(root, provenancePath)}`)
