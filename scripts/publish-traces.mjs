// Publish the run logs results.json points at into the served site.
//
// `sweeps/` is gitignored and pruned, so a trace only exists on the machine
// that ran the sweep. The site is a static export with no server, so the only
// way a reader can inspect "what did iteration 3 emit and why did it score 3?"
// is for the trace to be COPIED INTO THE REPO and committed:
//
//   public/lab-data/traces/index.json          every published (runId, file)
//   public/lab-data/traces/<runId>/<file>      the JSONL, verbatim
//   public/lab-data/traces/<runId>/spill/…     ONLY the spill files that log
//                                              actually references
//
// Idempotent and argument-free: run it after a sweep (and after any
// results.json edit), then commit what it wrote. Stale runs — a trace whose
// (runId, file) no longer matches any record, e.g. because the pair was re-run
// under a new run id — are pruned, because a trace for a result the site no
// longer shows is worse than no trace.
//
// SPILL SIZE IS THE COST. Spill files hold whole artifacts; a full sweep's
// worth can be megabytes of committed, served repo. This script never
// truncates them (a clipped artifact would be evidence you can't trust) — it
// prints the totals and WARNS past a soft budget, and the operator decides
// whether to commit that much.
//
// Run: npx tsx scripts/publish-traces.mjs   (or: task bench:publish-traces)
// SWEEPS_DIR overrides the source directory (default <repo>/sweeps).
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readRunLog } from '../lib/lab/llm-benchmark/runlog.ts'
import {
  TRACE_PUBLISH_SOFT_BUDGET_BYTES,
  collectSpillRefs,
  formatTraceBytes,
  staleTraceKeys,
  traceKey,
  traceRefsFromResults,
} from '../lib/lab/llm-benchmark/traces.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sweepsDir = resolve(root, process.env.SWEEPS_DIR ?? 'sweeps')
const outDir = join(root, 'public/lab-data/traces')
const indexFile = join(outDir, 'index.json')

const results = JSON.parse(
  readFileSync(join(root, 'lib/lab/llm-benchmark/results.json'), 'utf8')
)

const wanted = traceRefsFromResults(results)

/** Every (runId, file) already published, from the destination tree. */
function publishedKeys() {
  if (!existsSync(outDir)) return []
  const keys = []
  for (const runId of readdirSync(outDir, { withFileTypes: true })) {
    if (!runId.isDirectory()) continue
    for (const file of readdirSync(join(outDir, runId.name))) {
      if (file.endsWith('.jsonl')) keys.push(`${runId.name}/${file}`)
    }
  }
  return keys.sort()
}

const stale = staleTraceKeys(publishedKeys(), wanted)

mkdirSync(outDir, { recursive: true })

// ---- prune ---------------------------------------------------------------
for (const key of stale) {
  rmSync(join(outDir, key), { force: true })
  console.log(`  pruned ${key} (no results.json record claims it)`)
}
// A run directory left with no JSONL has nothing to serve — drop it whole,
// spill store included, rather than leaving orphaned artifact bytes committed.
for (const runId of existsSync(outDir) ? readdirSync(outDir, { withFileTypes: true }) : []) {
  if (!runId.isDirectory()) continue
  const dir = join(outDir, runId.name)
  if (readdirSync(dir).some((name) => name.endsWith('.jsonl'))) continue
  rmSync(dir, { recursive: true, force: true })
  console.log(`  pruned empty run dir ${runId.name}/`)
}

// ---- publish -------------------------------------------------------------
const index = []
let logBytes = 0
let spillBytes = 0
let spillFiles = 0
const missing = []

for (const ref of wanted) {
  const source = join(sweepsDir, ref.runId, ref.file)
  if (!existsSync(source)) {
    // Expected and harmless: sweeps are pruned, and a checkout that never ran
    // the sweep has none of them. The published copy (if any) stays as it is.
    missing.push(traceKey(ref))
    continue
  }

  let log
  try {
    log = readRunLog(source)
  } catch (err) {
    console.warn(`  skipping ${traceKey(ref)}: ${err.message}`)
    continue
  }

  const destDir = join(outDir, ref.runId)
  mkdirSync(destDir, { recursive: true })
  copyFileSync(source, join(destDir, ref.file))
  const bytes = statSync(source).size
  logBytes += bytes

  const spillRefs = []
  for (const spillRef of collectSpillRefs(log.events)) {
    const spillSource = join(sweepsDir, ref.runId, spillRef)
    if (!existsSync(spillSource)) continue
    mkdirSync(join(destDir, 'spill'), { recursive: true })
    copyFileSync(spillSource, join(destDir, spillRef))
    spillBytes += statSync(spillSource).size
    spillFiles++
    spillRefs.push(spillRef)
  }

  index.push({
    runId: log.header.runId ?? ref.runId,
    file: ref.file,
    // From the HEADER, never the filename: both ids contain hyphens, so
    // `<modelId>-<taskId>.jsonl` cannot be split back apart reliably.
    modelId: log.header.modelId,
    taskId: log.header.taskId,
    bytes,
    spillRefs,
  })
}

// A pruned trace can leave its spill files behind in a run dir that other,
// still-live logs share — content addressing means the same file may be
// referenced by several logs, so the only safe rule is "keep exactly the union
// of what the surviving logs reference".
let prunedSpill = 0
const keepSpill = new Map()
for (const entry of index) {
  const set = keepSpill.get(entry.runId) ?? new Set()
  for (const ref of entry.spillRefs) set.add(ref)
  keepSpill.set(entry.runId, set)
}
for (const [runId, keep] of keepSpill) {
  const spillDir = join(outDir, runId, 'spill')
  if (!existsSync(spillDir)) continue
  for (const name of readdirSync(spillDir)) {
    if (keep.has(`spill/${name}`)) continue
    rmSync(join(spillDir, name), { force: true })
    prunedSpill++
  }
}

index.sort((a, b) => traceKey(a).localeCompare(traceKey(b)))
writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n')

// ---- report --------------------------------------------------------------
const total = logBytes + spillBytes
console.log(
  `[publish-traces] ${index.length} trace(s) published to public/lab-data/traces` +
    ` — ${formatTraceBytes(logBytes)} of JSONL + ${spillFiles} spill file(s) (${formatTraceBytes(spillBytes)})` +
    `, ${formatTraceBytes(total)} total.`
)
if (missing.length > 0) {
  console.log(
    `[publish-traces] ${missing.length} referenced log(s) are not under ${sweepsDir} (pruned or run elsewhere) — nothing published for them.`
  )
}
if (stale.length > 0 || prunedSpill > 0) {
  console.log(`[publish-traces] pruned ${stale.length} stale trace(s) and ${prunedSpill} unreferenced spill file(s).`)
}
if (total > TRACE_PUBLISH_SOFT_BUDGET_BYTES) {
  console.warn(
    `[publish-traces] WARNING: ${formatTraceBytes(total)} exceeds the ${formatTraceBytes(TRACE_PUBLISH_SOFT_BUDGET_BYTES)} soft budget.` +
      ` These files get COMMITTED and SERVED — review the spill sizes before committing, and consider publishing fewer runs.`
  )
}
