import { describe, it, expect } from 'vitest'

import { buildCacheKey } from './cache'
import { framePreludeFingerprint } from './prompt-bundle'

// These tests never touch the on-disk cache (`.cache/llm-benchmark-responses.json`
// is a real developer's paid-for corpus). The KEY is the whole behaviour under
// test, and it is pure.

describe('buildCacheKey', () => {
  it('is stable for identical inputs', () => {
    expect(buildCacheKey('kimi-k2.7', 'landing-page', 'prompt', 0, 'fp')).toBe(
      buildCacheKey('kimi-k2.7', 'landing-page', 'prompt', 0, 'fp')
    )
  })

  it('separates model, task, prompt and iteration', () => {
    const base = buildCacheKey('kimi-k2.7', 'landing-page', 'prompt', 0, 'fp')
    expect(buildCacheKey('claude-opus-5', 'landing-page', 'prompt', 0, 'fp')).not.toBe(base)
    expect(buildCacheKey('kimi-k2.7', 'equation-solver', 'prompt', 0, 'fp')).not.toBe(base)
    expect(buildCacheKey('kimi-k2.7', 'landing-page', 'prompt!', 0, 'fp')).not.toBe(base)
    expect(buildCacheKey('kimi-k2.7', 'landing-page', 'prompt', 1, 'fp')).not.toBe(base)
  })

  it('changes when ONLY the frame-prelude fingerprint changes', () => {
    // The bug this closes: a prelude edit stales every stored record (the
    // bundle hash covers the prelude) but left the cache reachable, so the
    // re-sweep the stale marker asked for replayed the OLD bytes and got
    // stamped with the NEW bundle. Warnings cleared, nothing regenerated.
    const before = buildCacheKey('kimi-k2.7', 'landing-page', 'unchanged prompt', 0, 'prelude-v1')
    const after = buildCacheKey('kimi-k2.7', 'landing-page', 'unchanged prompt', 0, 'prelude-v2')
    expect(after).not.toBe(before)
  })

  it('defaults to the real prelude fingerprint', () => {
    expect(buildCacheKey('m', 't', 'p', 0)).toBe(buildCacheKey('m', 't', 'p', 0, framePreludeFingerprint()))
    // ...and the default is not some other fingerprint.
    expect(buildCacheKey('m', 't', 'p', 0)).not.toBe(buildCacheKey('m', 't', 'p', 0, 'something-else'))
  })

  it('keeps the fingerprint in its own field rather than folding it into the prompt hash', () => {
    // Regression guard for a collision-by-concatenation fix: two different
    // (prompt, fingerprint) splits of the same character stream must differ.
    expect(buildCacheKey('m', 't', 'ab', 0, 'c')).not.toBe(buildCacheKey('m', 't', 'a', 0, 'bc'))
  })
})
