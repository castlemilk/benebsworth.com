// Publish each benchmark result's generated output as a small static JSON
// file so client components can fetch outputs on demand instead of shipping
// the whole 2.8 MB results.json in the bundle / RSC payload.
//
// Runs in prebuild (see package.json). Output files land in
// public/lab-data/llm-benchmark/outputs/<taskId>/<modelId>.json and are
// served by the static export with correct JSON content-type.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const results = JSON.parse(readFileSync(join(root, 'lib/lab/llm-benchmark/results.json'), 'utf8'))
const outDir = join(root, 'public/lab-data/llm-benchmark/outputs')

// Regenerate from scratch so removed task/model combinations don't linger.
rmSync(outDir, { recursive: true, force: true })

const safe = (s) => /^[a-z0-9][a-z0-9._-]*$/i.test(s)
let written = 0
for (const r of results) {
  if (!r.output || !r.output.trim()) continue
  if (!safe(r.taskId) || !safe(r.modelId)) {
    console.warn(`[gen-benchmark-outputs] skipping unsafe id: ${r.taskId}/${r.modelId}`)
    continue
  }
  const file = join(outDir, r.taskId, `${r.modelId}.json`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify({ taskId: r.taskId, modelId: r.modelId, output: r.output }))
  written++
}
console.log(`[gen-benchmark-outputs] wrote ${written} output files to public/lab-data/llm-benchmark/outputs`)
