import { describe, it, expect } from 'vitest'
import { computeSummary, mergeModelSummaries, assertNoShrink } from './merge.mjs'
import type { HarnessModel, HarnessModelSummary, HarnessTaskResult } from './types.js'

/**
 * Merge semantics for harness-eval results.json (docs/postmortem/
 * 0005-harness-eval-clobber.md). The contract under test: regeneration is a
 * MERGE, so the accumulated history survives a build on any machine —
 * including one whose ~/.omega/reports is empty.
 */

function model(id: string): HarnessModel {
  const [provider, ...rest] = id.split('/')
  return { id, provider, model: rest.join('/'), displayName: rest.join('/') || id }
}

function taskResult(suite: string, id: string, overrides: Partial<HarnessTaskResult> = {}): HarnessTaskResult {
  return {
    task: { id, name: id, title: id, complexity: 'medium', suite },
    passed: true,
    status: 'done',
    durationMs: 1000,
    patchBytes: 0,
    hasPatch: false,
    ...overrides,
  }
}

function summary(id: string, tasks: HarnessTaskResult[]): HarnessModelSummary {
  return computeSummary(model(id), tasks)
}

describe('mergeModelSummaries', () => {
  it('keeps baseline models absent from the fresh reports untouched', () => {
    // THE regression: a machine with no reports (fresh = []) must not be
    // able to delete history.
    const baseline = [summary('kimi/k3', [taskResult('harder', 't1'), taskResult('harder', 't2')])]
    const merged = mergeModelSummaries(baseline, [])
    expect(merged).toHaveLength(1)
    expect(merged[0].model.id).toBe('kimi/k3')
    expect(merged[0].tasks.map((t) => t.task.id)).toEqual(['t1', 't2'])
  })

  it('replaces a same-key baseline task result with the fresh one (a re-run is an update)', () => {
    const baseline = [summary('kimi/k3', [taskResult('harder', 't1', { passed: true, durationMs: 1000 })])]
    const fresh = [summary('kimi/k3', [taskResult('harder', 't1', { passed: false, status: 'failed', durationMs: 2000 })])]
    const merged = mergeModelSummaries(baseline, fresh)
    expect(merged).toHaveLength(1)
    expect(merged[0].tasks).toHaveLength(1)
    expect(merged[0].tasks[0].passed).toBe(false)
    expect(merged[0].tasks[0].durationMs).toBe(2000)
    // aggregates recomputed from the merged task list, not carried over
    expect(merged[0].passed).toBe(0)
    expect(merged[0].passRate).toBe(0)
  })

  it('keys tasks by suite + task id, so the same task id in different suites is not a collision', () => {
    const baseline = [summary('kimi/k3', [taskResult('harder', 't1')])]
    const fresh = [summary('kimi/k3', [taskResult('deep-swe', 't1')])]
    const merged = mergeModelSummaries(baseline, fresh)
    expect(merged[0].tasks).toHaveLength(2)
    expect(merged[0].tasks.map((t) => t.task.suite).sort()).toEqual(['deep-swe', 'harder'])
  })

  it('appends novel tasks and novel models', () => {
    const baseline = [summary('kimi/k3', [taskResult('harder', 't1')])]
    const fresh = [
      summary('kimi/k3', [taskResult('harder', 't2')]),
      summary('glm/glm-5.2', [taskResult('harder', 't1')]),
    ]
    const merged = mergeModelSummaries(baseline, fresh)
    expect(merged.map((m) => m.model.id).sort()).toEqual(['glm/glm-5.2', 'kimi/k3'])
    expect(merged.find((m) => m.model.id === 'kimi/k3')?.tasks).toHaveLength(2)
  })

  it('never shrinks: the merge output is a superset of the baseline for any inputs', () => {
    // The invariant the gen script's shrink guard asserts. Property-style
    // check over adversarial combinations.
    const baseline = [
      summary('a/one', [taskResult('s', 't1'), taskResult('s', 't2'), taskResult('s2', 't3')]),
      summary('b/two', [taskResult('s', 't1', { passed: false, status: 'failed' })]),
    ]
    const cases: HarnessModelSummary[][] = [
      [],
      [summary('a/one', [])],
      [summary('c/three', [taskResult('s', 't9')])],
      [summary('a/one', [taskResult('s', 't1', { passed: false, status: 'failed' })])],
    ]
    for (const fresh of cases) {
      const merged = mergeModelSummaries(baseline, fresh)
      const baselineTasks = baseline.reduce((acc, m) => acc + m.tasks.length, 0)
      const mergedTasks = merged.reduce((acc, m) => acc + m.tasks.length, 0)
      expect(merged.length, `models, fresh=${JSON.stringify(fresh.map((m) => m.model.id))}`).toBeGreaterThanOrEqual(baseline.length)
      expect(mergedTasks, `tasks, fresh=${JSON.stringify(fresh.map((m) => m.model.id))}`).toBeGreaterThanOrEqual(baselineTasks)
      for (const b of baseline) {
        const m = merged.find((x) => x.model.id === b.model.id)
        expect(m, `baseline model ${b.model.id} survives`).toBeDefined()
      }
    }
  })

  it('recomputes passRate across the merged task list', () => {
    const baseline = [summary('a/one', [taskResult('s', 't1', { passed: true })])]
    const fresh = [summary('a/one', [taskResult('s', 't2', { passed: false, status: 'failed' })])]
    const merged = mergeModelSummaries(baseline, fresh)
    expect(merged[0].totalTasks).toBe(2)
    expect(merged[0].passed).toBe(1)
    expect(merged[0].failed).toBe(1)
    expect(merged[0].passRate).toBe(50)
  })
})

describe('assertNoShrink', () => {
  it('passes when the merged set is a superset of the baseline', () => {
    const baseline = [summary('a/one', [taskResult('s', 't1')])]
    const merged = mergeModelSummaries(baseline, [summary('b/two', [taskResult('s', 't1')])])
    expect(() => assertNoShrink(baseline, merged)).not.toThrow()
  })

  it('throws when the merged set drops a model', () => {
    const baseline = [summary('a/one', [taskResult('s', 't1')]), summary('b/two', [taskResult('s', 't1')])]
    const merged = [summary('a/one', [taskResult('s', 't1')])]
    expect(() => assertNoShrink(baseline, merged)).toThrow(/shrink results\.json.*bug in the merge/s)
  })

  it('throws when the merged set keeps the models but loses task results', () => {
    const baseline = [summary('a/one', [taskResult('s', 't1'), taskResult('s', 't2')])]
    const merged = [summary('a/one', [taskResult('s', 't1')])]
    expect(() => assertNoShrink(baseline, merged)).toThrow(/2→1 task results/)
  })
})

describe('computeSummary', () => {
  it('counts timeouts separately from failures and omits unmeasured aggregates', () => {
    const s = computeSummary(model('a/one'), [
      taskResult('s', 't1', { passed: true }),
      taskResult('s', 't2', { passed: false, status: 'failed' }),
      taskResult('s', 't3', { passed: false, status: 'timeout' }),
    ])
    expect(s.totalTasks).toBe(3)
    expect(s.passed).toBe(1)
    expect(s.failed).toBe(1)
    expect(s.timeouts).toBe(1)
    expect(s.passRate).toBe(33)
    // no cost/turn/tool data anywhere → null, not 0 (0 would imply measured-free)
    expect(s.totalCostUsd).toBeNull()
    expect(s.totalTurns).toBeNull()
    expect(s.totalToolCalls).toBeNull()
  })

  it('aggregates tool calls across tasks', () => {
    const s = computeSummary(model('a/one'), [
      taskResult('s', 't1', { toolCalls: { read: 3, edit: 1 } }),
      taskResult('s', 't2', { toolCalls: { read: 2 } }),
    ])
    expect(s.totalToolCalls).toBe(6)
    expect(s.toolBreakdown).toEqual({ read: 5, edit: 1 })
  })
})
