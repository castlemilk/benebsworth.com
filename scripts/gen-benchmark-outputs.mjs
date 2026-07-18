// Publish each benchmark result's generated output as a small static JSON
// file so client components can fetch outputs on demand instead of shipping
// the whole 2.8 MB results.json in the bundle / RSC payload.
//
// Full HTML documents are ALSO published as standalone .html artifacts (with
// the shared frame prelude injected) so the demo can link "Open full page" /
// "Download" without re-fetching and re-wrapping the output client-side. The
// outputs directory is served with a CSP sandbox header (public/_headers), so
// these pages run at an opaque origin even when opened top-level.
//
// Runs in prebuild (see package.json) under tsx. Output files land in
// public/lab-data/llm-benchmark/outputs/<taskId>/<modelId>.{json,html}.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isFullHtmlDoc,
  needsRuntimeCompiler,
  withPrelude,
} from '../lib/lab/llm-benchmark/frame-prelude.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const results = JSON.parse(readFileSync(join(root, 'lib/lab/llm-benchmark/results.json'), 'utf8'))
const outDir = join(root, 'public/lab-data/llm-benchmark/outputs')

// Regenerate from scratch so removed task/model combinations don't linger.
rmSync(outDir, { recursive: true, force: true })

const safe = (s) => /^[a-z0-9][a-z0-9._-]*$/i.test(s)
let written = 0
let htmlWritten = 0
for (const r of results) {
  if (!r.output || !r.output.trim()) continue
  if (!safe(r.taskId) || !safe(r.modelId)) {
    console.warn(`[gen-benchmark-outputs] skipping unsafe id: ${r.taskId}/${r.modelId}`)
    continue
  }
  const dir = join(outDir, r.taskId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${r.modelId}.json`), JSON.stringify({ taskId: r.taskId, modelId: r.modelId, output: r.output }))
  written++
  // Only artifacts that can actually run standalone get a public .html page —
  // bare snippets and browser-Babel artifacts stay JSON/source-only.
  if (isFullHtmlDoc(r.output) && !needsRuntimeCompiler(r.output)) {
    writeFileSync(join(dir, `${r.modelId}.html`), withPrelude(r.output))
    htmlWritten++
  }
}
console.log(`[gen-benchmark-outputs] wrote ${written} output JSON files (${htmlWritten} HTML artifacts) to public/lab-data/llm-benchmark/outputs`)
