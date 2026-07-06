#!/usr/bin/env node
// Hike photo annotator CLI.
//   node tools/hike-annotate/bin/annotate.mjs <slug> [--limit N] [--hint "..."]
//                                              [--concurrency N] [--write] [--yes]
// Default = dry-run: classify + place, write a review report, print a summary.
// --write applies the proposed manifest to GCS (after a local backup); refuses
// on a PARTIAL (limited) run and prompts for confirmation unless --yes.
import { annotateHike } from '../src/pipeline.mjs'
import { writeReport } from '../src/report.mjs'
import { writeManifest, backupManifest } from '../src/manifest.mjs'
import { saveProposal, loadProposal } from '../src/proposal-cache.mjs'
import { createInterface } from 'node:readline/promises'

function parseArgs(argv) {
  const a = { slug: '', limit: Infinity, hint: '', concurrency: 4, write: false, yes: false, apply: false }
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i]
    if (t === '--limit') a.limit = Number(argv[++i])
    else if (t === '--hint') a.hint = argv[++i]
    else if (t === '--concurrency') a.concurrency = Number(argv[++i])
    else if (t === '--write') a.write = true
    else if (t === '--apply') a.apply = true
    else if (t === '--yes' || t === '-y') a.yes = true
    else if (!t.startsWith('-') && !a.slug) a.slug = t
  }
  return a
}

const args = parseArgs(process.argv.slice(2))
if (!args.slug) {
  console.error('usage: annotate <hike-slug> [--limit N] [--hint "Country"] [--concurrency N] [--write|--apply] [--yes]')
  process.exit(1)
}

async function confirmWrite(prompt) {
  if (args.yes) return true
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  const ans = (await rl.question(prompt)).trim()
  rl.close()
  return ans === 'yes'
}

// --apply: write a previously-cached proposal to GCS WITHOUT re-classifying.
if (args.apply) {
  const cached = await loadProposal(args.slug).catch(() => null)
  if (!cached) {
    console.error(`✗ no cached proposal for ${args.slug}. Run a dry-run first.`)
    process.exit(2)
  }
  if (cached.partial) {
    console.error(`✗ cached proposal for ${args.slug} is PARTIAL (limit was set). Re-run without --limit.`)
    process.exit(2)
  }
  console.error(`▸ applying cached proposal for ${args.slug} (${cached.proposal.gallery.length} photos, saved ${cached.savedAt})`)
  if (!(await confirmWrite('Write this cached manifest to GCS (live)? type "yes": '))) {
    console.error('aborted.')
    process.exit(0)
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  await backupManifest(args.slug, cached.manifest, cached.dir, stamp)
  const uri = await writeManifest(args.slug, cached.proposal, cached.dir)
  console.error(`✓ wrote ${uri}\n  live: https://benebsworth.com/hiking/${args.slug}/`)
  process.exit(0)
}

const t0 = Date.now()
console.error(`▸ annotating "${args.slug}"${Number.isFinite(args.limit) ? ` (limit ${args.limit})` : ''} via agy …`)
const run = await annotateHike(args.slug, {
  limit: args.limit,
  hint: args.hint,
  concurrency: args.concurrency,
  onProgress: (done, total, id, cls) =>
    console.error(`  [${String(done).padStart(2)}/${total}] ${id} → ${cls.waypoint || cls.geoWaypoint || '?'}${cls.skip ? ' (skip)' : ''}`),
})

const reportPath = await writeReport(run)
const saved = await saveProposal(args.slug, run, reportPath, new Date().toISOString())
const placed = run.metas.filter((m) => m.slot).length
const skips = run.metas.filter((m) => m.skip).length
const manual = run.metas.filter((m) => m.needsManual).length
const byWp = {}
for (const m of run.metas) byWp[m.slot || '(unplaced)'] = (byWp[m.slot || '(unplaced)'] || 0) + 1

console.error(`\n✓ ${run.metas.length} classified in ${((Date.now() - t0) / 1000).toFixed(0)}s — ${placed} placed, ${skips} skip, ${manual} manual`)
console.error(`  hero: ${run.heroId || 'none'}`)
console.error(`  placement: ${Object.entries(byWp).map(([k, v]) => `${k}:${v}`).join('  ')}`)
console.error(`\n  review report → ${saved.reportPath}`)
console.error(`  open: open "${saved.reportPath}"`)
console.error(`  proposal cached — apply later with: --apply`)

if (!args.write) {
  console.error('\n(dry-run — re-run with --write to apply now, or --apply once reviewed)')
  process.exit(0)
}
if (run.partial) {
  console.error('\n✗ refusing to --write a PARTIAL run (--limit set). Re-run without --limit.')
  process.exit(2)
}
if (!(await confirmWrite('\nWrite this manifest to GCS (live)? type "yes": '))) {
  console.error('aborted.')
  process.exit(0)
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backup = await backupManifest(args.slug, run.manifest, run.tmpDir, stamp)
console.error(`  backup of current manifest → ${backup}`)
const uri = await writeManifest(args.slug, run.proposal, run.tmpDir)
console.error(`✓ wrote ${uri}`)
console.error(`  live: https://${process.env.HIKE_SITE || 'benebsworth.com'}/hiking/${args.slug}/`)
