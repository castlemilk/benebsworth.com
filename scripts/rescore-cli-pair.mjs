// Offline re-score of a completed CLI pair. Preserves original generation
// evidence; --write creates a separate trace and updates only that board row.
// When writing the board directly, wait until the generating sweep stops.
// RESULTS_OUT_PATH can instead select a separate results file for staging.
// No provider calls, caches or generated artifacts are changed.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, renameSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { BENCHMARK_MODELS, BENCHMARK_TASKS } from '../lib/lab/llm-benchmark/registry.ts'
import { aggregateRuns, cleanOutput } from '../lib/lab/llm-benchmark/runners/provider.ts'
import { selectScorer } from '../lib/lab/llm-benchmark/scorers/index.ts'
import { inlineDependenciesAsync } from '../lib/lab/llm-benchmark/sandbox/inline-dependencies.ts'
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
const requestedOutputRun = args.includes('--output-run') ? option('--output-run') : undefined
if (requestedOutputRun && (!isSafePathSegment(requestedOutputRun) || requestedOutputRun === runId)) throw new Error('Invalid output run id')
const file = runLogFileName(model.id, task.id)
const { header, events } = readRunLog(join(sourceDir, file))
const original = events.findLast((event) => event.type === 'aggregate')?.result
if (!original || !['success', 'partial'].includes(original.status) || !original.iterationsSucceeded) {
  throw new Error('A completed pair with at least one successful artifact is required')
}
const index = JSON.parse(readFileSync(join(sourceDir, 'artifacts/index.json'), 'utf8')).artifacts
const resolveSpill = (value) => typeof value === 'string' ? value : readFileSync(join(sourceDir, value.spillRef), 'utf8')
// Replay the normal dependency pipeline without accepting newer vendor code.
// Every downloaded dependency must already occur in the original normalized
// trace; the check runs again for each iteration even when the inliner caches it.
const dependencyBodies = new Map()
const originalFetch = globalThis.fetch
globalThis.fetch = async (url, options) => {
  const response = await originalFetch(url, options)
  if (response.ok) dependencyBodies.set(String(url), await response.clone().text())
  return response
}
const runs = []
for (let iterationIndex = 0; iterationIndex < original.iterations; iterationIndex++) {
  const response = events.findLast((event) => event.type === 'response' && event.iterationIndex === iterationIndex)
  const clean = events.findLast((event) => event.type === 'clean' && event.iterationIndex === iterationIndex)
  const failure = events.findLast((event) => event.type === 'failure' && event.iterationIndex === iterationIndex)
  if (failure) {
    // Reconstruct the runner's failed entry, retaining its place. A thrown
    // generation has zero recorded usage; an exhausted empty reply retains
    // the last response's usage. Neither receives a new score or artifact.
    const empty = failure.failureReason === 'empty_body'
    runs.push({ output: failure.error, status: 'fail', timedOut: failure.timedOut,
      failureReason: failure.failureReason, tokensIn: empty ? response?.tokensIn ?? 0 : 0,
      tokensOut: empty ? response?.tokensOut ?? 0 : 0, runtimeMs: empty ? response?.runtimeMs ?? 0 : 0,
      usageSource: original.usage?.source ?? 'estimated', retries: 0 })
    continue
  }
  if (!response && !clean) {
    if (events.some((event) => event.iterationIndex > iterationIndex)) throw new Error('Missing iteration before later evidence')
    break // The original runner may have stopped before all requested calls.
  }
  const artifactName = index[`artifact-${model.id}-${task.id}-${iterationIndex}`]
  if (!response || !clean || !artifactName || !/^[a-f0-9]{16}\.html$/.test(artifactName)) {
    throw new Error(`Missing retained iteration ${iterationIndex}`)
  }
  const artifact = readFileSync(join(sourceDir, 'artifacts', artifactName), 'utf8')
  if (!verifyContentAddress(artifactName, artifact).ok) throw new Error(`Artifact hash mismatch: ${artifactName}`)
  let output = cleanOutput(artifact)
  // Prove these are the original generated bytes before applying the current
  // normalization. This permits a documented cleanup correction without ever
  // editing model source or trying to execute redacted forensic copies.
  if (redactText(artifact) !== resolveSpill(response.rawOutput)) throw new Error(`Original artifact mismatch: iteration ${iterationIndex}`)
  if (/<html[\s>]|<!doctype|<head>|<body>|<script\b|<link\b|<style\b|<canvas\b|<svg\b/i.test(output)) {
    const rewritten = await inlineDependenciesAsync(output)
    const originalClean = resolveSpill(clean.output)
    for (const url of rewritten.inlined) {
      const body = dependencyBodies.get(url)
      if (body === undefined || !originalClean.includes(redactText(body))) {
        throw new Error(`Dependency differs from original normalization: ${url}`)
      }
    }
    if (rewritten.failed.length) throw new Error(`Dependency unavailable: ${rewritten.failed.join(', ')}`)
    output = rewritten.output
  }
  runs.push({ ...response, output, status: 'success', usageSource: original.usage?.source ?? 'estimated', retries: 0 })
}
globalThis.fetch = originalFetch

try {
  // Grade one artifact at a time so simultaneous WebGL scenes do not compete
  // for this machine's renderer. Preserve the shared aggregate calculation.
  const scorer = selectScorer(task)
  let queue = Promise.resolve()
  const serial = (fn) => (...args) => {
    const result = queue.then(() => fn(...args))
    queue = result.then(() => {}, () => {})
    return result
  }
  const serialScorer = { score: serial(scorer.score.bind(scorer)),
    ...(scorer.scoreWithBreakdown ? { scoreWithBreakdown: serial(scorer.scoreWithBreakdown.bind(scorer)) } : {}) }
  const rescored = await aggregateRuns(runs, original.iterations, model, task, serialScorer, original.createdAt)
  for (const key of ['runtimeMs', 'tokensIn', 'tokensOut', 'costUsd', 'promptBundle', 'iterationsSucceeded', 'status', 'failureReason']) {
    if (rescored[key] !== original[key]) throw new Error(`Generation metadata changed: ${key}`)
  }
  console.log(JSON.stringify({ model: model.id, task: task.id, before: original.iterationScores, after: rescored.iterationScores }))
  if (args.includes('--write')) {
    execFileSync('git', ['diff', '--quiet', 'HEAD', '--', 'lib/lab/llm-benchmark/scorers', 'lib/lab/llm-benchmark/plugins/visual-games/checks.ts', 'lib/lab/llm-benchmark/sandbox', 'lib/lab/llm-benchmark/runners/provider.ts', 'scripts/rescore-cli-pair.mjs'])
    const scorerCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    const resultsPath = resolve(process.env.RESULTS_OUT_PATH ?? 'lib/lab/llm-benchmark/results.json')
    const baseline = JSON.parse(readFileSync(resultsPath, 'utf8'))
    const position = baseline.findIndex((r) => r.modelId === model.id && r.taskId === task.id)
    if (position < 0 || baseline[position].runLogRef?.runId !== runId) throw new Error('The board no longer points at the source run')
    const now = new Date().toISOString()
    const correctedId = requestedOutputRun ?? `${now.slice(0, 19).replace(/:/g, '-')}-rescore-${task.id}`
    const correctedDir = resolve('sweeps', correctedId)
    mkdirSync(correctedDir, { recursive: true })
    const result = { ...baseline[position], score: rescored.score, iterationScores: rescored.iterationScores,
      iterationCheckResults: rescored.iterationCheckResults, output: rescored.output,
      runLogRef: { runId: correctedId, file } }
    const keptEvents = events.filter((event) => event.type !== 'check' && event.type !== 'aggregate').map((event) =>
      event.type === 'clean' ? { ...event, output: forceSpill(correctedDir, runs[event.iterationIndex].output), ts: now } : event)
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
    keptEvents.filter((event) => event.type !== 'clean').forEach(copySpills)
    const correctedHeader = { ...header, runId: correctedId, configSnapshot: { ...header.configSnapshot,
      rescoreOf: { runId, file, scorerCommit, artifactSource: 'retained-cli-file', artifactConcurrency: 1 } } }
    const successIndices = runs.map((run, index) => ({ run, index })).filter(({ run }) => run.status === 'success').map(({ index }) => index)
    const checks = result.iterationCheckResults.flatMap((checks, successIndex) =>
      checks.map((check) => ({ type: 'check', iterationIndex: successIndices[successIndex], check, ts: now })))
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
