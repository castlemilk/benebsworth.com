import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'

const resultsPath = resolve(process.cwd(), 'lib/lab/llm-benchmark/results.json')
const modelIds = process.argv.slice(2)

if (modelIds.length === 0) {
  console.error('Usage: node scripts/merge-benchmark-results.mjs <model-id> [<model-id> ...]')
  process.exit(1)
}

const base = JSON.parse(readFileSync(resultsPath, 'utf8'))
const modelSet = new Set(modelIds)

// Remove existing entries for the models we are replacing.
let merged = base.filter((r) => !modelSet.has(r.modelId))

for (const modelId of modelIds) {
  const path = resolve(process.cwd(), `lib/lab/llm-benchmark/results-${modelId}.json`)
  if (!existsSync(path)) {
    console.warn(`Missing result file for ${modelId}: ${path}`)
    continue
  }
  const fresh = JSON.parse(readFileSync(path, 'utf8'))
  const freshForModel = fresh.filter((r) => r.modelId === modelId)
  merged = [...merged, ...freshForModel]
  unlinkSync(path)
  console.log(`Merged ${freshForModel.length} results for ${modelId}`)
}

writeFileSync(resultsPath, JSON.stringify(merged, null, 2) + '\n')
console.log(`Wrote ${merged.length} total results to ${resultsPath}`)
