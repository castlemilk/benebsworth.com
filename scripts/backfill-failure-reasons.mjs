// Backfill BenchmarkResult.failureReason on every existing record in
// lib/lab/llm-benchmark/results.json by classifying the error message
// stored in `output` (when status !== 'success') using the same
// classifyFailureReason() the runner now uses at write time.
//
// Idempotent: records that already have a failureReason are left alone, so
// the script is safe to run after partial backfills or future sweeps.
//
// Run: node scripts/backfill-failure-reasons.mjs
//      (no flags; reads results.json in place, writes back atomically)
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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
function classify(errMsg) {
  const m = errMsg.toLowerCase()
  const s = extractStatus(errMsg)
  if (isQuota(errMsg)) return 'quota_exhausted'
  if (s === 429 || m.includes('rate limit') || m.includes('too many requests') || m.includes('overloaded')) return 'rate_limited'
  if (s === 401 || s === 403) return 'auth_error'
  if (s === 400 || m.includes('invalid request')) return 'invalid_request'
  if (m.includes('fetch failed') || m.includes('econnrefused') || m.includes('econnreset') || m.includes('etimedout') || m.includes('enotfound') || m.includes('socket hang up')) return 'endpoint_hung'
  if (/\btime(?:d[ -]?|-)?out\b/i.test(errMsg)) return 'endpoint_hung'
  if (m.includes('truncated at the completion-token limit')) return 'truncated'
  if (s !== undefined && s >= 500) return 'model_error'
  return 'model_error'
}

const results = JSON.parse(readFileSync(resultsPath, 'utf8'))
let backfilled = 0
let skipped = 0
const reasonHistogram = {}
for (const r of results) {
  if (r.failureReason && r.failureReason !== 'none') { skipped++; continue }
  if (r.status === 'success') { r.failureReason = 'none'; continue }
  // Use the stored error message in `output` (runner writes err.message there
  // on failure). Truncate noisy SSE bodies by keeping the first error line.
  const errMsg = (r.output || '').split('\n')[0].slice(0, 500)
  r.failureReason = classify(errMsg)
  reasonHistogram[r.failureReason] = (reasonHistogram[r.failureReason] || 0) + 1
  backfilled++
}

writeFileSync(resultsPath, JSON.stringify(results, null, 2) + '\n')
console.log(`[backfill-failure-reasons] classified ${backfilled} records (${skipped} already had reasons)`)
console.log(`[backfill-failure-reasons] reason histogram:`)
for (const [reason, n] of Object.entries(reasonHistogram).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${reason.padEnd(20)} ${n}`)
}
