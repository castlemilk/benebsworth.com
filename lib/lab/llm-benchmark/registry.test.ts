import { describe, it, expect } from 'vitest'
import {
  BENCHMARK_CATEGORIES,
  BENCHMARK_MODELS,
  BENCHMARK_TASKS,
  BENCHMARK_RESULTS,
  getCategory,
  getTask,
  getModel,
  tasksByCategory,
  resultsForTask,
  resultsForModel,
} from './registry'

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
    expect(taskResults.length).toBe(BENCHMARK_MODELS.length)
    expect(taskResults.every((r) => r.taskId === 'equation-solver')).toBe(true)

    const modelResults = resultsForModel('claude-4')
    expect(modelResults.length).toBe(BENCHMARK_TASKS.length)
    expect(modelResults.every((r) => r.modelId === 'claude-4')).toBe(true)
  })
})
