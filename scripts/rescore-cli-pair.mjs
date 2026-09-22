// Offline re-score of a completed CLI pair. Preserves original generation
// evidence; --write creates a separate trace and updates only that board row.
// Run only after the generating sweep stops, so its writer cannot restore an
// older aggregate. No provider calls, caches or generated artifacts are changed.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, renameSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { BENCHMARK_MODELS, BENCHMARK_TASKS } from '../lib/lab/llm-benchmark/registry.ts'
import { aggregateRuns, cleanOutput } from '../lib/lab/llm-benchmark/runners/provider.ts'
import { selectScorer } from '../lib/lab/llm-benchmark/scorers/index.ts'
import { closeSandbox } from '../lib/lab/llm-benchmark/scorers/sandbox.ts'
import { forceSpill, readRunLog, runLogFileName } from '../lib/lab/llm-benchmark/runlog.ts'
import { redactText, redactValue } from '../lib/lab/llm-benchmark/redact.ts'
import { verifyContentAddress } from '../lib/lab/llm-benchmark/content-address.ts'
import { isSafePathSegment, isSafeSpillRef } from '../lib/lab/llm-benchmark/traces.ts'

const args = process.argv.slice(2)
const option = (flag) => args[args.indexOf(flag) + 1]
const runId = args.includes('--run') ? option('--run') : undefined
const model = BENCHMARK_MODELS.find((m) => m.id === option('--model'))
const task = BENCHMARK_TASKS.find((t) => t.id === option('--task'))
if (!runId || !isSafePathSegment(runId) || !model || !task) {
  throw new Error('Usage: tsx scripts/rescore-cli-pair.mjs --run ID --model ID --task ID [--write]')
}
const sourceDir = resolve('sweeps', runId)
const file = runLogFileName(model.id, task.id)
const { header, events } = readRunLog(join(sourceDir, file))
const original = events.findLast((event) => event.type === 'aggregate')?.result
if (!original || original.status !== 'success') throw new Error('A fully completed successful pair is required')
const index = JSON.parse(readFileSync(join(sourceDir, 'artifacts/index.json'), 'utf8')).artifacts
const resolveSpill = (value) => typeof value === 'string' ? value : readFileSync(join(sourceDir, value.spillRef), 'utf8')
const runs = Array.from({ length: original.iterations }, (_, iterationIndex) => {
  const response = events.findLast((event) => event.type === 'response' && event.iterationIndex === iterationIndex)
  const clean = events.findLast((event) => event.type === 'clean' && event.iterationIndex === iterationIndex)
  const artifactName = index[`artifact-${model.id}-${task.id}-${iterationIndex}`]
  if (!response || !clean || !artifactName || !/^[a-f0-9]{16}\.html$/.test(artifactName)) {
    throw new Error(`Missing retained iteration ${iterationIndex}`)
  }
  const artifact = readFileSync(join(sourceDir, 'artifacts', artifactName), 'utf8')
  if (!verifyContentAddress(artifactName, artifact).ok) throw new Error(`Artifact hash mismatch: ${artifactName}`)
  const output = cleanOutput(artifact)
  // Redaction intentionally changes credential-like source text. Use the
  // original retained file, but prove its redacted form is the scored copy.
  if (redactText(output) !== resolveSpill(clean.output)) throw new Error(`Clean artifact mismatch: iteration ${iterationIndex}`)
  return { ...response, output, status: 'success', usageSource: original.usage?.source ?? 'estimated', retries: 0 }
})

try {
  const rescored = await aggregateRuns(runs, original.iterations, model, task, selectScorer(task), original.createdAt)
  for (const key of ['runtimeMs', 'tokensIn', 'tokensOut', 'costUsd', 'promptBundle']) {
    if (rescored[key] !== original[key]) throw new Error(`Generation metadata changed: ${key}`)
  }
  console.log(JSON.stringify({ model: model.id, task: task.id, before: original.iterationScores, after: rescored.iterationScores }))
  if (args.includes('--write')) {
    execFileSync('git', ['diff', '--quiet', 'HEAD', '--', 'lib/lab/llm-benchmark/scorers'])
    const scorerCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    const resultsPath = resolve('lib/lab/llm-benchmark/results.json')
    const baseline = JSON.parse(readFileSync(resultsPath, 'utf8'))
    const position = baseline.findIndex((r) => r.modelId === model.id && r.taskId === task.id)
    if (position < 0 || baseline[position].runLogRef?.runId !== runId) throw new Error('The board no longer points at the source run')
    const now = new Date().toISOString()
    const correctedId = `${now.slice(0, 19).replace(/:/g, '-')}-rescore`
    const correctedDir = resolve('sweeps', correctedId)
    mkdirSync(correctedDir, { recursive: false })
    const result = { ...baseline[position], score: rescored.score, iterationScores: rescored.iterationScores,
      iterationCheckResults: rescored.iterationCheckResults, output: rescored.output,
      runLogRef: { runId: correctedId, file } }
    const keptEvents = events.filter((event) => event.type !== 'check' && event.type !== 'aggregate')
    const copySpills = (value) => {
      if (Array.isArray(value)) return value.forEach(copySpills)
      if (!value || typeof value !== 'object') return
      if (typeof value.spillRef === 'string') {
        if (!isSafeSpillRef(value.spillRef)) throw new Error('Unsafe spill reference')
        mkdirSync(join(correctedDir, 'spill'), { recursive: true })
        copyFileSync(join(sourceDir, value.spillRef), join(correctedDir, value.spillRef))
      }
      Object.values(value).forEach(copySpills)
    }
    keptEvents.forEach(copySpills)
    const correctedHeader = { ...header, runId: correctedId, configSnapshot: { ...header.configSnapshot,
      rescoreOf: { runId, file, scorerCommit } } }
    const checks = result.iterationCheckResults.flatMap((checks, iterationIndex) =>
      checks.map((check) => ({ type: 'check', iterationIndex, check, ts: now })))
    const aggregate = { type: 'aggregate', ts: now, result: { ...result, output: forceSpill(correctedDir, result.output) } }
    const lines = [correctedHeader, ...keptEvents, ...checks, aggregate].map((event, seq) => JSON.stringify(redactValue({ ...event, seq })))
    writeFileSync(join(correctedDir, file), lines.join('\n') + '\n', { flag: 'wx', mode: 0o600 })
    baseline[position] = result
    writeFileSync(resultsPath + '.tmp', JSON.stringify(baseline, null, 2) + '\n')
    renameSync(resultsPath + '.tmp', resultsPath)
    console.log(`Published corrected score under ${correctedId}; source trace preserved at ${runId}`)
  }
} finally {
  await closeSandbox()
}
