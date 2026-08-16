// Prune forensic sweep directories (`sweeps/<run-id>/`).
//
// Every benchmark run keeps its CLI scratch dirs and a copy of each handed-off
// artifact under sweeps/<run-id>/ (see scripts/run-benchmark.mjs and
// lib/lab/llm-benchmark/runners/cli.ts). Nothing deletes them at run time — not
// even on failure, where the residue is most useful — so this script is the
// cleanup path.
//
// Run: npx tsx scripts/sweep-clean.mjs [--keep <n>] [--older-than <days>] [--dry-run]
//
//   --keep <n>          always keep the <n> newest runs (default 5)
//   --older-than <days> always keep runs younger than <days> (default 14)
//   --dry-run           print what would be deleted, delete nothing
//
// SWEEPS_DIR overrides the directory scanned (default <repo>/sweeps).
//
// A run is deleted only when it is BOTH beyond the keep-count AND older than
// the age floor — see selectPrunable() in lib/lab/llm-benchmark/sweep.ts for
// why the conjunction (that helper holds the policy, and is unit-tested).
import { readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { selectPrunable } from '../lib/lab/llm-benchmark/sweep.ts'

const DEFAULT_KEEP = 5
const DEFAULT_OLDER_THAN_DAYS = 14

function parseArgs(argv) {
  const options = { keep: DEFAULT_KEEP, olderThanDays: DEFAULT_OLDER_THAN_DAYS, dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--keep') {
      options.keep = Number(argv[++i])
    } else if (arg === '--older-than') {
      options.olderThanDays = Number(argv[++i])
    } else {
      console.error(`Unknown argument: ${arg}`)
      console.error('Usage: npx tsx scripts/sweep-clean.mjs [--keep <n>] [--older-than <days>] [--dry-run]')
      process.exit(1)
    }
  }
  if (!Number.isFinite(options.keep) || options.keep < 0) {
    console.error('--keep must be a non-negative number')
    process.exit(1)
  }
  if (!Number.isFinite(options.olderThanDays) || options.olderThanDays < 0) {
    console.error('--older-than must be a non-negative number of days')
    process.exit(1)
  }
  return options
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Recursive on-disk size, best-effort (a vanished file just doesn't count). */
function dirSize(path) {
  let total = 0
  let entries = []
  try {
    entries = readdirSync(path, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    const child = join(path, entry.name)
    try {
      total += entry.isDirectory() ? dirSize(child) : statSync(child).size
    } catch {
      // Raced or unreadable — skip.
    }
  }
  return total
}

const options = parseArgs(process.argv.slice(2))
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sweepsDir = resolve(root, process.env.SWEEPS_DIR ?? 'sweeps')

let runs = []
try {
  runs = readdirSync(sweepsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, mtimeMs: statSync(join(sweepsDir, entry.name)).mtimeMs }))
} catch {
  console.log(`No sweeps directory at ${sweepsDir} — nothing to prune.`)
  process.exit(0)
}

const prunable = selectPrunable(runs, { keep: options.keep, olderThanDays: options.olderThanDays, now: Date.now() })

console.log(
  `${runs.length} sweep run(s) in ${sweepsDir}; keeping the ${options.keep} newest and anything under ${options.olderThanDays} day(s) old.`
)

let freed = 0
for (const run of prunable) {
  const path = join(sweepsDir, run.name)
  const size = dirSize(path)
  freed += size
  const ageDays = ((Date.now() - run.mtimeMs) / (24 * 60 * 60 * 1000)).toFixed(1)
  if (options.dryRun) {
    console.log(`  would delete ${run.name}  (${ageDays}d old, ${formatBytes(size)})`)
  } else {
    rmSync(path, { recursive: true, force: true })
    console.log(`  deleted ${run.name}  (${ageDays}d old, ${formatBytes(size)})`)
  }
}

console.log(
  options.dryRun
    ? `Dry run: ${prunable.length} run(s) would be deleted, ${formatBytes(freed)} would be freed. ${runs.length - prunable.length} kept.`
    : `Deleted ${prunable.length} run(s), freed ${formatBytes(freed)}. ${runs.length - prunable.length} kept.`
)
