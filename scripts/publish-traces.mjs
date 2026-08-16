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
// results.json edit), then commit what it wrote. Every wanted trace lands in
// exactly one of three buckets, and the script reports all three:
//
//   refreshed  — the source sweep is on this machine: copy it and rebuild the
//                index entry from its header
//   kept       — the source is gone (`sweep-clean`, or someone else's sweep)
//                but the published JSONL is COMMITTED: carry its existing
//                index entry through verbatim. Rebuilding the index from
//                sources alone used to drop these, leaving committed evidence
//                orphaned on disk and invisible on the site
//   pruned     — no results.json record claims the (runId, file) any more (the
//                pair was re-run under a new run id): delete it, because a
//                trace for a result the site no longer shows is worse than no
//                trace
//
// Note that only WANTEDNESS prunes. A missing source never does.
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
  planTracePublication,
  staleTraceKeys,
  traceKey,
  traceRefsFromResults,
} from '../lib/lab/llm-benchmark/traces.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sweepsDir = resolve(root, process.env.SWEEPS_DIR ?? 'sweeps')
const relativeSweeps = process.env.SWEEPS_DIR ?? 'sweeps'
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

/** The index as it stands, so already-published traces survive a republish. */
function readPublishedIndex() {
  try {
    const parsed = JSON.parse(readFileSync(indexFile, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return [] // never published, or a hand-mangled file — rebuild from scratch
  }
}

const alreadyPublished = publishedKeys()
const publishedIndex = readPublishedIndex()
const stale = staleTraceKeys(alreadyPublished, wanted)

// Which of the wanted traces have a SOURCE on this machine. `sweeps/` is
// gitignored and pruned, so this set shrinks over time while the published
// copies stay committed — which is exactly why the plan below has a "keep"
// bucket rather than treating a missing source as "drop it from the index".
const sourceKeys = wanted
  .filter((ref) => existsSync(join(sweepsDir, ref.runId, ref.file)))
  .map(traceKey)

const plan = planTracePublication({
  wanted,
  publishedIndex,
  publishedKeys: alreadyPublished,
  sourceKeys,
})

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
const missing = plan.missing.map(traceKey)

// Carried through UNTOUCHED from the previous index: the source sweep is gone
// but the published JSONL (and its spill files) are committed and still served.
for (const entry of plan.keep) {
  index.push(entry)
}

for (const ref of plan.refresh) {
  const source = join(sweepsDir, ref.runId, ref.file)

  let log
  try {
    log = readRunLog(source)
  } catch (err) {
    console.warn(`  skipping ${traceKey(ref)}: ${err.message}`)
    // An unreadable SOURCE must not silently delete a good published entry.
    const existing = publishedIndex.find((e) => traceKey(e) === traceKey(ref))
    if (existing && alreadyPublished.includes(traceKey(ref))) index.push(existing)
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
  for (const ref of entry.spillRefs ?? []) set.add(ref)
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
// Three buckets, because "12 traces published" hides the interesting fact that
// 9 of them only still exist because they were committed.
const keptBytes = plan.keep.reduce((sum, entry) => sum + (entry.bytes ?? 0), 0)
const total = logBytes + spillBytes + keptBytes
console.log(
  `[publish-traces] ${index.length} trace(s) in public/lab-data/traces` +
    ` — ${plan.refresh.length} refreshed from ${relativeSweeps}, ${plan.keep.length} kept from the published index` +
    ` (source sweep pruned), ${stale.length} pruned.`
)
console.log(
  `[publish-traces] copied ${formatTraceBytes(logBytes)} of JSONL + ${spillFiles} spill file(s) (${formatTraceBytes(spillBytes)})` +
    `; ${formatTraceBytes(keptBytes)} already committed. ${formatTraceBytes(total)} total.`
)
if (missing.length > 0) {
  console.log(
    `[publish-traces] ${missing.length} referenced log(s) have neither a source under ${sweepsDir} nor a published copy — nothing to serve for them.`
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
