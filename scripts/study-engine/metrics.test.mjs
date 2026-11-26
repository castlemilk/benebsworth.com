import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeRun } from './metrics.mjs'

test('report separates incremental and reused work, prices provider-cached input once and includes failed calls', () => {
  const usage = { input: 1000, cachedInput: 600, output: 20 }
  const receipt = { status: 'blocked', profile: 'lean', liveCalls: 1, usageIncomplete: false, sections: [],
    calls: [{ model: 'a', cached: true, originalUsage: usage, usage: { input: 0, cachedInput: 0, output: 0 } }, { model: 'a', error: 'Invalid JSON', usage }],
  }
  const summary = summarizeRun(receipt, { a: { input: 2, cachedInput: 0.5, output: 10 } })
  assert.equal(summary.acceptedSections, 0)
  assert.equal(summary.incremental.total, 1020)
  assert.equal(summary.incremental.estimatedUsd, 0.0013)
  assert.equal(summary.includingOriginalCallsBehindCacheHits.total, 2040)
  assert.throws(() => summarizeRun(receipt, {}), /Missing USD/)
})
