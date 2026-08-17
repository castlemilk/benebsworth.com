import { describe, it, expect } from 'vitest'

import { SANDBOX_CONSTRAINTS, withSandboxConstraints } from './prompts'
import {
  PRE_BUNDLE,
  compareBundles,
  composeBundle,
  framePreludeFingerprint,
  promptBundleHash,
  summarizePromptBundles,
} from './prompt-bundle'
import type { BenchmarkResult, BenchmarkTask } from './types'

function task(over: Partial<BenchmarkTask> = {}): BenchmarkTask {
  return {
    id: 'bundle-probe',
    slug: 'bundle-probe',
    title: 'Bundle probe',
    category: 'ui-building',
    blurb: 'probe',
    prompt: 'Build a thing.',
    runtimeHint: '~1 min',
    iterationsDefault: 1,
    methodNotes: 'none',
    ...over,
  } as BenchmarkTask
}

function record(over: Partial<BenchmarkResult> = {}): BenchmarkResult {
  return {
    taskId: 'n-body-field',
    modelId: 'kimi-k2.7',
    score: 50,
    runtimeMs: 1000,
    tokensIn: 10,
    tokensOut: 20,
    costUsd: 0.01,
    iterations: 1,
    iterationsSucceeded: 1,
    status: 'success',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('promptBundleHash', () => {
  it('is a stable 16-char hex digest', () => {
    const t = task()
    expect(promptBundleHash(t)).toMatch(/^[0-9a-f]{16}$/)
    expect(promptBundleHash(t)).toBe(promptBundleHash(t))
  })

  it('changes when the task prompt changes', () => {
    expect(promptBundleHash(task({ prompt: 'A' }))).not.toBe(
      promptBundleHash(task({ prompt: 'B' }))
    )
  })

  it('changes when the sandboxConstraints override changes', () => {
    const inherited = task()
    const custom = task({ sandboxConstraints: 'Return one HTML file.' })
    const none = task({ sandboxConstraints: '' })
    expect(promptBundleHash(inherited)).not.toBe(promptBundleHash(custom))
    expect(promptBundleHash(custom)).not.toBe(promptBundleHash(none))
    expect(promptBundleHash(inherited)).not.toBe(promptBundleHash(none))
    // …and the inherited hash really is the global contract's hash: an
    // HTML-runnable category with no override gets SANDBOX_CONSTRAINTS.
    expect(withSandboxConstraints(inherited).prompt).toContain(SANDBOX_CONSTRAINTS.trim())
  })

  it('changes when the frame-prelude fingerprint changes', () => {
    // The prelude is the ENVIRONMENT the artifact is scored in — a change to
    // it invalidates a stored score just as surely as a prompt edit does.
    const t = task()
    expect(promptBundleHash(t, 'fingerprint-a')).not.toBe(promptBundleHash(t, 'fingerprint-b'))
    expect(promptBundleHash(t)).toBe(promptBundleHash(t, framePreludeFingerprint()))
  })

  it('ignores the task id — the hash covers WHAT THE MODEL SEES, nothing else', () => {
    // DECISION, locked here on purpose: two DIFFERENT tasks whose amended
    // prompt and environment are identical share a bundle hash. The hash
    // answers "was this scored under the same conditions?", and the id is not
    // one of those conditions — a task rename must NOT invalidate its results,
    // and identical prompts genuinely ARE the same bundle. The (model, task)
    // pairing that keeps records apart lives in the record, not in the hash.
    expect(promptBundleHash(task({ id: 'one', slug: 'one' }))).toBe(
      promptBundleHash(task({ id: 'two', slug: 'two' }))
    )
  })

  it('composes prompt and prelude with a separator that cannot be forged by concatenation', () => {
    // Without a separator, prompt 'AB' + fingerprint 'C' and prompt 'A' +
    // fingerprint 'BC' would hash identically.
    expect(composeBundle('AB', 'C')).not.toBe(composeBundle('A', 'BC'))
  })

  it('fingerprints the frame prelude as a stable 16-char digest', () => {
    expect(framePreludeFingerprint()).toMatch(/^[0-9a-f]{16}$/)
    expect(framePreludeFingerprint()).toBe(framePreludeFingerprint())
  })
})

describe('compareBundles', () => {
  it('groups per (model, task) by bundle and reports the delta between them', () => {
    const results = [
      record({ promptBundle: 'aaaaaaaaaaaaaaaa', score: 40, createdAt: '2026-01-01T00:00:00.000Z' }),
      record({ promptBundle: 'aaaaaaaaaaaaaaaa', score: 60, createdAt: '2026-01-02T00:00:00.000Z' }),
      record({ promptBundle: 'bbbbbbbbbbbbbbbb', score: 80, createdAt: '2026-02-01T00:00:00.000Z' }),
    ]
    const [comparison] = compareBundles(results)
    expect(comparison.modelId).toBe('kimi-k2.7')
    expect(comparison.taskId).toBe('n-body-field')
    expect(comparison.groups.map((g) => g.bundle)).toEqual([
      'aaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbb',
    ])
    expect(comparison.groups[0].count).toBe(2)
    expect(comparison.groups[0].meanScore).toBe(50)
    expect(comparison.groups[1].meanScore).toBe(80)
    expect(comparison.deltas).toEqual([
      { from: 'aaaaaaaaaaaaaaaa', to: 'bbbbbbbbbbbbbbbb', deltaScore: 30 },
    ])
  })

  it('keeps unstamped records in a pre-bundle group, ordered first', () => {
    const results = [
      record({ score: 30, createdAt: '2026-03-01T00:00:00.000Z' }),
      record({ promptBundle: 'cccccccccccccccc', score: 45, createdAt: '2026-01-01T00:00:00.000Z' }),
    ]
    const [comparison] = compareBundles(results)
    // pre-bundle sorts FIRST regardless of createdAt: it is the legacy
    // generation by definition, whatever timestamp the record carries.
    expect(comparison.groups.map((g) => g.bundle)).toEqual([PRE_BUNDLE, 'cccccccccccccccc'])
    expect(comparison.deltas).toEqual([
      { from: PRE_BUNDLE, to: 'cccccccccccccccc', deltaScore: 15 },
    ])
  })

  it('reports one group and no deltas when every record is pre-bundle (the ground state)', () => {
    const comparisons = compareBundles([record({ score: 10 }), record({ score: 20 })])
    expect(comparisons).toHaveLength(1)
    expect(comparisons[0].groups.map((g) => g.bundle)).toEqual([PRE_BUNDLE])
    expect(comparisons[0].deltas).toEqual([])
  })

  it('separates model/task pairs and sorts them deterministically', () => {
    const comparisons = compareBundles([
      record({ modelId: 'z-model', taskId: 'b-task' }),
      record({ modelId: 'a-model', taskId: 'b-task' }),
      record({ modelId: 'a-model', taskId: 'a-task' }),
    ])
    expect(comparisons.map((c) => `${c.modelId}|${c.taskId}`)).toEqual([
      'a-model|a-task',
      'a-model|b-task',
      'z-model|b-task',
    ])
  })

  it('returns nothing for an empty result set', () => {
    expect(compareBundles([])).toEqual([])
  })
})

describe('summarizePromptBundles', () => {
  it('counts stamped vs pre-bundle records and the pairs worth comparing', () => {
    const summary = summarizePromptBundles([
      record({ modelId: 'm1' }),
      record({ modelId: 'm2', promptBundle: 'dddddddddddddddd' }),
      record({ modelId: 'm3', promptBundle: 'dddddddddddddddd' }),
      record({ modelId: 'm3', taskId: 'other', promptBundle: 'eeeeeeeeeeeeeeee' }),
    ])
    expect(summary.records).toBe(4)
    expect(summary.stamped).toBe(3)
    expect(summary.preBundle).toBe(1)
    expect(summary.bundles).toEqual(['dddddddddddddddd', 'eeeeeeeeeeeeeeee'])
    expect(summary.pairs).toBe(4)
    expect(summary.multiBundlePairs).toBe(0)
  })

  it('counts a pair that spans two bundles', () => {
    const summary = summarizePromptBundles([
      record({ score: 10 }),
      record({ score: 20, promptBundle: 'ffffffffffffffff' }),
    ])
    expect(summary.pairs).toBe(1)
    expect(summary.multiBundlePairs).toBe(1)
    expect(summary.preBundle).toBe(1)
  })
})
