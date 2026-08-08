import { describe, it, expect } from 'vitest'
import {
  BENCHMARK_CATEGORIES,
  BENCHMARK_MODELS,
  BENCHMARK_TASKS,
  getCategory,
  getTask,
  getModel,
  tasksByCategory,
} from './registry'
import { BENCHMARK_RESULTS, resultsForTask, resultsForModel } from './results'

describe('llm-benchmark registry', () => {
  it('has unique category slugs', () => {
    const slugs = BENCHMARK_CATEGORIES.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('has unique task slugs', () => {
    const slugs = BENCHMARK_TASKS.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('has unique task ids', () => {
    const ids = BENCHMARK_TASKS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every task has a valid category', () => {
    const categorySlugs = new Set(BENCHMARK_CATEGORIES.map((c) => c.slug))
    for (const task of BENCHMARK_TASKS) {
      expect(categorySlugs.has(task.category), `${task.slug} category`).toBe(true)
    }
  })

  it('every result references a valid task and model', () => {
    const taskIds = new Set(BENCHMARK_TASKS.map((t) => t.id))
    const modelIds = new Set(BENCHMARK_MODELS.map((m) => m.id))
    for (const result of BENCHMARK_RESULTS) {
      expect(taskIds.has(result.taskId), `result taskId ${result.taskId}`).toBe(true)
      expect(modelIds.has(result.modelId), `result modelId ${result.modelId}`).toBe(true)
    }
  })

  it('getters return expected data', () => {
    expect(getCategory('advanced-mathematics')?.label).toBe('Advanced Mathematics')
    expect(getCategory('nope')).toBeUndefined()

    const task = getTask('equation-solver')
    expect(task?.title).toBe('Equation Solver')
    expect(task?.demoComponentName).toBe('EquationSolverDemo')
    expect(getTask('nope')).toBeUndefined()

    expect(getModel('claude-4')?.provider).toBe('Anthropic')
    expect(getModel('nope')).toBeUndefined()

    const mathTasks = tasksByCategory('advanced-mathematics')
    expect(mathTasks.length).toBe(1)
    expect(mathTasks[0].slug).toBe('equation-solver')

    const taskResults = resultsForTask('equation-solver')
    // All models except those legitimately excluded from the sweep (e.g.
    // nemotron-nano-12b-vl's free endpoint hangs) should have a result. We
    // assert >= rather than === so the test tolerates future exclusions
    // without a code change here, while still catching a drop in coverage.
    const excluded = new Set(['nemotron-nano-12b-vl'])
    const expected = BENCHMARK_MODELS.length - excluded.size
    expect(taskResults.length).toBeGreaterThanOrEqual(expected)
    expect(taskResults.every((r) => r.taskId === 'equation-solver')).toBe(true)
    expect(taskResults.every((r) => !excluded.has(r.modelId))).toBe(true)

    const modelResults = resultsForModel('claude-4')
    expect(modelResults.length).toBe(BENCHMARK_TASKS.length)
    expect(modelResults.every((r) => r.modelId === 'claude-4')).toBe(true)
  })
})
