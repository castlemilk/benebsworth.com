// Backfill BenchmarkResult.failureReason on every existing record in
// lib/lab/llm-benchmark/results.json by classifying the error message
// stored in `output` (when status !== 'success') using the same
// classifyFailureReason() the runner now uses at write time.
//
// Idempotent: records that already have a failureReason are left alone, so
// the script is safe to run after partial backfills or future sweeps. The one
// exception is the cli_timeout reclassification pass at the bottom, which
// rewrites `endpoint_hung` records that are provably CLI timeouts (see there).
//
// Run: npx tsx scripts/backfill-failure-reasons.mjs
//      (reads results.json in place, writes back atomically)
//
//      --cli-timeouts-only runs ONLY the cli_timeout reclassification pass.
//      Use it when you want a minimal, reviewable diff: the general pass also
//      stamps the implicit defaults ('none' on successes, 'model_error' on old
//      unclassified failures) onto every pre-classification record, which is a
//      no-op for readers (analytics.ts applies the same defaults) but rewrites
//      a hundred-plus rows of a 5 MB file.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BENCHMARK_MODELS } from '../lib/lab/llm-benchmark/registry.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const resultsPath = join(root, 'lib/lab/llm-benchmark/results.json')

// Inline a minimal classifyFailureReason mirroring runners/provider.ts so the
// script stays a single file with no TS build step. Keep these two in sync.
function extractStatus(err) {
  if (typeof err !== 'string') return undefined
  const match = err.match(/(?:error|status)\s*(\d{3})/i) ?? err.match(/\b(\d{3})\b/)
  return match ? Number(match[1]) : undefined
}
function isQuota(msg) {
  const m = msg.toLowerCase()
  return (
    m.includes('access_terminated_error') ||
    m.includes('usage limit') ||
    m.includes('insufficient_quota') ||
    m.includes('exceeded your current quota') ||
    m.includes('credit balance') ||
    m.includes('billing cycle') ||
    m.includes('daily limit') ||
    m.includes('no free model provider')
  )
}
// Providers driven by a locally-spawned agent CLI (mirrors CLI_PROVIDERS in
// runners/provider.ts). Their timeouts are a generation-speed story, not a
// network one.
const CLI_PROVIDERS = new Set(['Agy', 'Codex', 'OpenCode'])
const CLI_MODEL_IDS = new Set(
  BENCHMARK_MODELS.filter((m) => CLI_PROVIDERS.has(m.provider)).map((m) => m.id)
)
function isTimeoutMessage(errMsg) {
  return /\btime(?:d[ -]?|-)?out\b/i.test(errMsg)
}

function classify(errMsg, modelId) {
  const m = errMsg.toLowerCase()
  const s = extractStatus(errMsg)
  if (isQuota(errMsg)) return 'quota_exhausted'
  if (s === 429 || m.includes('rate limit') || m.includes('too many requests') || m.includes('overloaded')) return 'rate_limited'
  if (s === 401 || s === 403) return 'auth_error'
  if (s === 400 || m.includes('invalid request')) return 'invalid_request'
  if (m.includes('fetch failed') || m.includes('econnrefused') || m.includes('econnreset') || m.includes('etimedout') || m.includes('enotfound') || m.includes('socket hang up')) return 'endpoint_hung'
  if (isTimeoutMessage(errMsg)) {
    return CLI_MODEL_IDS.has(modelId) ? 'cli_timeout' : 'endpoint_hung'
  }
  if (m.includes('truncated at the completion-token limit')) return 'truncated'
  if (s !== undefined && s >= 500) return 'model_error'
  return 'model_error'
}

const cliTimeoutsOnly = process.argv.includes('--cli-timeouts-only')

const results = JSON.parse(readFileSync(resultsPath, 'utf8'))
let backfilled = 0
let skipped = 0
const reasonHistogram = {}
for (const r of cliTimeoutsOnly ? [] : results) {
  if (r.failureReason && r.failureReason !== 'none') { skipped++; continue }
  if (r.status === 'success') { r.failureReason = 'none'; continue }
  // Use the stored error message in `output` (runner writes err.message there
  // on failure). Truncate noisy SSE bodies by keeping the first error line.
  const errMsg = (r.output || '').split('\n')[0].slice(0, 500)
  r.failureReason = classify(errMsg, r.modelId)
  reasonHistogram[r.failureReason] = (reasonHistogram[r.failureReason] || 0) + 1
  backfilled++
}

// cli_timeout reclassification: records written before the reason existed
// carry 'endpoint_hung' for what was really a CLI blowing its per-call cap.
// Only rewrite where the evidence survives — the stored `output` IS the raw
// timeout message — so a 'partial' record (whose output is the winning
// artifact, not an error) is never guessed at.
let reclassified = 0
for (const r of results) {
  if (r.failureReason !== 'endpoint_hung') continue
  if (!CLI_MODEL_IDS.has(r.modelId)) continue
  if (!isTimeoutMessage((r.output || '').split('\n')[0].slice(0, 500))) continue
  r.failureReason = 'cli_timeout'
  reclassified++
  console.log(`  reclassified ${r.modelId} :: ${r.taskId} (${r.status}) endpoint_hung -> cli_timeout`)
}
if (reclassified > 0) {
  console.log(`[backfill-failure-reasons] reclassified ${reclassified} CLI timeouts`)
}

writeFileSync(resultsPath, JSON.stringify(results, null, 2) + '\n')
console.log(`[backfill-failure-reasons] classified ${backfilled} records (${skipped} already had reasons)`)
console.log(`[backfill-failure-reasons] reason histogram:`)
for (const [reason, n] of Object.entries(reasonHistogram).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${reason.padEnd(20)} ${n}`)
}
