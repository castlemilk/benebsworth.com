import { describe, it, expect } from 'vitest'
import { formatModelLabel, suiteCoverage } from './labels.js'
import { computeSummary } from './merge.mjs'
import type { HarnessModel, HarnessTaskResult } from './types.js'

/**
 * The model list is read by people, so ids are keys and never labels: the
 * rankings used to print `agy+MiniMax-M3+deepseek-v4-pro` and
 * `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free` in its first column.
 */
function model(id: string): HarnessModel {
  const [provider, ...rest] = id.split('/')
  return { id, provider, model: rest.join('/') || id, displayName: rest.join('/') || id }
}

function task(suite: string, id: string, passed: boolean): HarnessTaskResult {
  return {
    task: { id, name: id, title: id, complexity: 'medium', suite },
    passed,
    status: passed ? 'done' : 'failed',
    durationMs: 1000,
    patchBytes: 0,
    hasPatch: false,
  }
}

describe('formatModelLabel', () => {
  it('drops the access provider and keeps the vendor in a routed id', () => {
    expect(formatModelLabel('openrouter/nvidia/nemotron-3-ultra-550b-a55b')).toBe(
      'NVIDIA / Nemotron 3 Ultra 550b A55b',
    )
    expect(formatModelLabel('external/opencode')).toBe('OpenCode')
  })

  it('title-cases the families readers know by name', () => {
    expect(formatModelLabel('deepseek-v4.1-flash-free')).toBe('DeepSeek V4.1 Flash Free')
    expect(formatModelLabel('kimi-k3')).toBe('Kimi K3')
    expect(formatModelLabel('glm-5.3')).toBe('GLM 5.3')
    expect(formatModelLabel('minimax-m3')).toBe('MiniMax M3')
    expect(formatModelLabel('deepseek-v4-pro+qwen3.8-max-preview')).toBe(
      'DeepSeek V4 Pro + Qwen3.8 Max Preview',
    )
  })

  it('spells a :free suffix as a word, because on a free route it is the point', () => {
    expect(formatModelLabel('nvidia/nemotron-3-ultra-550b-a55b:free')).toBe(
      'NVIDIA / Nemotron 3 Ultra 550b A55b Free',
    )
  })

  it('leaves an empty id alone rather than inventing a label', () => {
    expect(formatModelLabel('   ')).toBe('')
  })
})

describe('suiteCoverage', () => {
  const suites = ['fast', 'harder-v2', 'deep-swe']
  const summaries = [
    computeSummary(model('a/one'), [
      task('fast', 't1', true),
      task('fast', 't2', true),
      task('harder-v2', 't3', false),
    ]),
    // A model with a single task: the matrix must make that visible rather
    // than letting a 1/1 look like a 2/2.
    computeSummary(model('b/two'), [task('fast', 't9', true)]),
  ]

  it('reports the measured rate per suite and marks suites a model never ran', () => {
    const rows = suiteCoverage(summaries, suites)
    expect(rows).toHaveLength(2)

    const first = rows[0]!
    expect(first.suitesRun).toBe(2)
    expect(first.tasksRun).toBe(3)
    expect(first.cells.map((c) => [c.suite, c.passRate, c.totalTasks])).toEqual([
      ['fast', 100, 2],
      ['harder-v2', 0, 1],
      ['deep-swe', null, 0],
    ])

    const second = rows[1]!
    expect(second.suitesRun).toBe(1)
    expect(second.cells[0]).toEqual({ suite: 'fast', passRate: 100, passed: 1, totalTasks: 1 })
    expect(second.cells[1]?.passRate).toBeNull()
  })
})
