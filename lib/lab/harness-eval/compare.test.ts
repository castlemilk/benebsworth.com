import { describe, it, expect } from 'vitest'
import { buildComparison, compareCandidates } from './compare.js'
import type { HarnessModel, HarnessTaskResult } from './types.js'

function model(id: string): HarnessModel {
  const [provider, ...rest] = id.split('/')
  return { id, provider, model: rest.join('/') || id, displayName: id }
}

function task(
  suite: string,
  id: string,
  passed: boolean,
  overrides: Partial<HarnessTaskResult> = {}
): HarnessTaskResult {
  return {
    task: { id, name: id, title: `${suite} ${id}`, complexity: 'medium', suite },
    passed,
    status: passed ? 'done' : 'failed',
    durationMs: 1000,
    patchBytes: 100,
    hasPatch: true,
    ...overrides,
  }
}

function summary(id: string, tasks: HarnessTaskResult[]) {
  const measured = tasks.filter((t) => typeof t.durationMs === 'number' && t.durationMs > 0);
  return {
    model: model(id),
    passed: tasks.filter((t) => t.passed).length,
    failed: tasks.filter((t) => !t.passed && t.status !== 'timeout').length,
    timeouts: tasks.filter((t) => t.status === 'timeout').length,
    totalTasks: tasks.length,
    passRate: tasks.length === 0 ? 0 : Math.round((tasks.filter((t) => t.passed).length / tasks.length) * 100),
    totalTokens: tasks.reduce((a, t) => a + (t.tokens ?? 0), 0),
    totalDurationMs: tasks.reduce((a, t) => a + (t.durationMs ?? 0), 0),
    avgDurationMs:
      measured.length === 0
        ? 0
        : Math.round(measured.reduce((a, t) => a + (t.durationMs ?? 0), 0) / measured.length),
    totalCostUsd: null,
    totalTurns: null,
    totalToolCalls: null,
    tasks,
  }
}

describe('buildComparison', () => {
  const left = summary('a/left', [
    task('fast', 't1', true),
    task('fast', 't2', false),
    task('harder', 't3', true),
  ])
  const right = summary('b/right', [task('fast', 't1', false), task('harder', 't3', false)])

  it('pairs tasks across models and flags the ones that disagree', () => {
    const cmp = buildComparison(left, right)
    expect(cmp).not.toBeNull()
    expect(cmp!.sharedTasks).toBe(2)
    expect(cmp!.contestedTasks).toBe(2)
    expect(cmp!.leftOnlyTasks).toBe(1)
    expect(cmp!.rightOnlyTasks).toBe(0)

    const shared = cmp!.rows.filter((r) => r.left && r.right)
    expect(shared.map((r) => r.taskId).sort()).toEqual(['t1', 't3'])
    expect(shared.every((r) => r.divergent)).toBe(true)
  })

  it('shows a task only one model ran as an explicit gap, not a loss', () => {
    const cmp = buildComparison(left, right)!
    // t2 is in the left model's set only (and it failed there): the row must
    // show the failure, not quietly drop it or imply the right model lost it.
    const gap = cmp.rows.find((r) => r.taskId === 't2')!
    expect(gap.left?.passed).toBe(false)
    expect(gap.right).toBeNull()
    expect(gap.divergent).toBe(false)
  })

  it('sorts shared and contested rows above coverage gaps', () => {
    const cmp = buildComparison(left, right)!
    const firstGap = cmp.rows.findIndex((r) => !r.left || !r.right)
    const lastShared = cmp.rows.map((r) => Boolean(r.left && r.right)).lastIndexOf(true)
    expect(lastShared).toBeLessThan(firstGap)
  })

  it('excludes timeouts from the duration average', () => {
    const withTimeout = summary('a/slow', [
      task('fast', 't1', true, { durationMs: 1000 }),
      task('fast', 't9', false, { durationMs: 600_000, status: 'timeout', passed: false }),
    ])
    const cmp = buildComparison(withTimeout, summary('b/fast', [task('fast', 't1', true)]))!
    expect(cmp.left.totals.avgDurationMs).toBe(1000)
  })

  it('refuses to compare a model with itself, or with a missing model', () => {
    expect(buildComparison(left, left)).toBeNull()
    expect(buildComparison(left, undefined)).toBeNull()
  })
})

describe('compareCandidates', () => {
  const subject = summary('a/subject', [task('fast', 't1', true), task('fast', 't2', false)])
  const solvesMissed = summary('b/solver', [task('fast', 't1', false), task('fast', 't2', true)])
  const sameRate = summary('c/same', [task('fast', 't1', false), task('fast', 't2', true)])
  const disjoint = summary('d/disjoint', [task('other', 't9', true)])

  it('prefers a model that solved what the subject missed', () => {
    const ranked = compareCandidates(subject, [sameRate, disjoint, solvesMissed])
    expect(ranked[0]?.model.id).toBe('b/solver')
  })

  it('omits models with no tasks in common — that comparison teaches nothing', () => {
    const ranked = compareCandidates(subject, [disjoint])
    expect(ranked).toHaveLength(0)
  })

  it('never suggests the subject itself', () => {
    const ranked = compareCandidates(subject, [subject, solvesMissed])
    expect(ranked.map((s) => s.model.id)).not.toContain('a/subject')
  })
})
