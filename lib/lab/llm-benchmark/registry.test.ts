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
import { behavioralTaskIds } from './scorers'
import { getChecksForTask } from './scorers/checks'

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

  it('every task in an HTML-runnable category declares scorer: behavioral', () => {
    // The "added a task, forgot it needs checks" net. A task in one of these
    // categories renders as a live page and MUST be behaviourally scored; the
    // category heuristic would still get it right, but leaving the row
    // unstamped means the registry no longer tells the whole story and the
    // check-coverage assertion below can't see the intent.
    const HTML_RUNNABLE_CATEGORIES = new Set([
      '3d-physics-animation',
      'advanced-game-building',
      'advanced-physics',
      'advanced-electronics',
      'ui-building',
    ])
    for (const task of BENCHMARK_TASKS) {
      if (!HTML_RUNNABLE_CATEGORIES.has(task.category)) continue
      expect(task.scorer, `${task.id} must declare its scorer`).toBe('behavioral')
    }
  })

  it('every behaviourally-scored task has at least one check defined', () => {
    // `getChecksForTask` returns [] for an unknown task id, and the behavioral
    // scorer treats that as "fall back to the structural HTML score" — quiet,
    // plausible-looking, and exactly the failure this test exists to catch: a
    // new HTML task would score 100 on structurally-valid markup that doesn't
    // actually react to input. There is no generic default check set, so an
    // empty list is unambiguously a missing-checks bug, and we assert
    // non-empty rather than assert against a hardcoded id list.
    const behavioral = behavioralTaskIds(BENCHMARK_TASKS)
    expect(behavioral.size).toBeGreaterThan(0)
    for (const id of behavioral) {
      expect(getChecksForTask(id).length, `${id} checks`).toBeGreaterThan(0)
    }
  })

  it('every declared scorer name is one the registry knows about', () => {
    const known = new Set(['behavioral', 'html', 'text'])
    for (const task of BENCHMARK_TASKS) {
      if (task.scorer === undefined) continue
      expect(known.has(task.scorer), `${task.id} scorer ${task.scorer}`).toBe(true)
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
    // All models except those legitimately excluded from the sweep should
    // have a result. Exclusions are derived two ways so the assertion stays
    // stable while models join/leave the board:
    //   - documentedExcluded: models with a known reason not to sweep
    //     (nemotron-nano-12b-vl: free endpoint hangs; gemini-3.6-flash:
    //     OpenRouter 402 — no credits).
    //   - unswept: models with NO results anywhere yet (registered ahead of
    //     their first sweep — e.g. a freshly added provider). Auto-excluding
    //     them means adding a model mid-sweep never breaks this test.
    // We assert >= (never ===) so the test tolerates future exclusions
    // without a code change here, while still catching a drop in coverage
    // below the current floor.
    const documentedExcluded = new Set([
      'nemotron-nano-12b-vl',     // free endpoint hangs
      'gemini-3.6-flash',         // OpenRouter 402 (no credits)
    ])
    const hasAnyResult = new Set(resultsForModelCoverage())
    const expected =
      BENCHMARK_MODELS.length -
      documentedExcluded.size -
      BENCHMARK_MODELS.filter((m) => !documentedExcluded.has(m.id) && !hasAnyResult.has(m.id)).length
    expect(taskResults.length).toBeGreaterThanOrEqual(expected)
    expect(taskResults.every((r) => r.taskId === 'equation-solver')).toBe(true)
    expect(taskResults.every((r) => !documentedExcluded.has(r.modelId))).toBe(true)

    // Data-loss floor: every task must keep a substantial board. This is the
    // regression net for a bad merge/regen wiping records — it fires long
    // before per-model assertions notice a missing row.
    for (const task of BENCHMARK_TASKS) {
      expect(
        resultsForTask(task.id).length,
        `${task.id} board size`,
      ).toBeGreaterThanOrEqual(20)
    }

    const modelResults = resultsForModel('claude-4')
    expect(modelResults.length).toBe(BENCHMARK_TASKS.length)
    expect(modelResults.every((r) => r.modelId === 'claude-4')).toBe(true)
  })
})

/** All model ids that have at least one result record (server-side only). */
function resultsForModelCoverage(): string[] {
  const seen = new Set<string>()
  for (const r of BENCHMARK_RESULTS) seen.add(r.modelId)
  return [...seen]
}
