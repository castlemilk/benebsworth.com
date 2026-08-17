import { describe, it, expect } from 'vitest'

import {
  formatBenchRef,
  parseBenchRef,
  tokenizeBenchRefs,
  resolveBenchRef,
  failureSignature,
  relatedRuns,
} from './bench-ref'
import type { BenchmarkModel, BenchmarkResult, BenchmarkTask } from './types'
import { BENCHMARK_RESULTS } from './results'
import { BENCHMARK_MODELS, BENCHMARK_TASKS } from './registry'

// ---------------------------------------------------------------------------
// fixtures — shaped like the real results.json records (per-iteration check
// lists, `source`, `runLogRef`), because every ranking rule below reads those
// exact fields.
// ---------------------------------------------------------------------------

function check(name: string, passed: boolean) {
  return { name, passed, points: passed ? 10 : 0, maxPoints: 10 }
}

function record(over: Partial<BenchmarkResult> & Pick<BenchmarkResult, 'modelId' | 'taskId'>): BenchmarkResult {
  return {
    score: 50,
    runtimeMs: 1000,
    tokensIn: 100,
    tokensOut: 100,
    costUsd: 0.01,
    iterations: 2,
    status: 'success',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...over,
  }
}

const MODELS: BenchmarkModel[] = [
  { id: 'nemotron-3-nano-30b', name: 'Nemotron 3 Nano 30B', provider: 'nvidia' },
  { id: 'gpt-oss-20b', name: 'GPT-OSS 20B', provider: 'openai' },
] as unknown as BenchmarkModel[]

const TASKS: BenchmarkTask[] = [
  { id: 'mini-platformer', slug: 'mini-platformer', category: 'advanced-game-building', title: 'Mini Platformer' },
  { id: 'n-body-field', slug: 'n-body-field', category: '3d-physics-animation', title: 'N-Body Field' },
] as unknown as BenchmarkTask[]

const TARGET = record({
  modelId: 'gpt-oss-20b',
  taskId: 'mini-platformer',
  iterationScores: [30, 40],
  iterationCheckResults: [
    [check('platformer-jump', false), check('platformer-move', true), check('no-runtime-errors', false)],
    [check('platformer-jump', false), check('platformer-move', false), check('no-runtime-errors', true)],
  ],
  runLogRef: { runId: '2026-08-16T09-30-12', file: 'gpt-oss-20b-mini-platformer.jsonl' },
})

describe('formatBenchRef / parseBenchRef', () => {
  it('round-trips the bare model/task form', () => {
    const uri = formatBenchRef({ modelId: 'gpt-oss-20b', taskId: 'mini-platformer' })
    expect(uri).toBe('bench://gpt-oss-20b/mini-platformer')
    const parsed = parseBenchRef(uri)
    expect(parsed).toEqual({ ok: true, ref: { modelId: 'gpt-oss-20b', taskId: 'mini-platformer' } })
  })

  it('round-trips an iteration-scoped ref', () => {
    const ref = { modelId: 'gpt-oss-20b', taskId: 'mini-platformer', iterationIndex: 2 }
    expect(formatBenchRef(ref)).toBe('bench://gpt-oss-20b/mini-platformer/2')
    expect(parseBenchRef(formatBenchRef(ref))).toEqual({ ok: true, ref })
  })

  it('round-trips iteration 0 (a falsy index is still an index)', () => {
    const ref = { modelId: 'gpt-oss-20b', taskId: 'mini-platformer', iterationIndex: 0 }
    expect(formatBenchRef(ref)).toBe('bench://gpt-oss-20b/mini-platformer/0')
    expect(parseBenchRef('bench://gpt-oss-20b/mini-platformer/0')).toEqual({ ok: true, ref })
  })

  it('round-trips a run-pinned ref, with and without an iteration', () => {
    const withRun = { modelId: 'gpt-oss-20b', taskId: 'mini-platformer', runId: '2026-08-16T09-30-12' }
    expect(formatBenchRef(withRun)).toBe('bench://gpt-oss-20b/mini-platformer?run=2026-08-16T09-30-12')
    expect(parseBenchRef(formatBenchRef(withRun))).toEqual({ ok: true, ref: withRun })

    const both = { ...withRun, iterationIndex: 1 }
    expect(formatBenchRef(both)).toBe('bench://gpt-oss-20b/mini-platformer/1?run=2026-08-16T09-30-12')
    expect(parseBenchRef(formatBenchRef(both))).toEqual({ ok: true, ref: both })
  })

  it('returns a typed error for garbage rather than throwing', () => {
    const codes = (uri: string) => {
      const parsed = parseBenchRef(uri)
      expect(parsed.ok).toBe(false)
      return parsed.ok ? '' : parsed.code
    }
    expect(codes('')).toBe('empty')
    expect(codes('   ')).toBe('empty')
    expect(codes('https://example.com/a/b')).toBe('bad-scheme')
    expect(codes('dsh-session:eyJhIjoxfQ')).toBe('bad-scheme')
    expect(codes('bench://gpt-oss-20b')).toBe('bad-shape')
    expect(codes('bench://gpt-oss-20b/mini-platformer/1/extra')).toBe('bad-shape')
    expect(codes('bench:///mini-platformer')).toBe('bad-model-id')
    expect(codes('bench://../etc-passwd')).toBe('bad-model-id')
    // Deeper traversal is caught one step earlier, by the segment count.
    expect(codes('bench://../../etc/passwd')).toBe('bad-shape')
    expect(codes('bench://gpt-oss-20b/..')).toBe('bad-task-id')
    expect(codes('bench://gpt-oss-20b/mini platformer')).toBe('bad-task-id')
    expect(codes('bench://gpt-oss-20b/mini-platformer/-1')).toBe('bad-iteration')
    expect(codes('bench://gpt-oss-20b/mini-platformer/1.5')).toBe('bad-iteration')
    expect(codes('bench://gpt-oss-20b/mini-platformer/last')).toBe('bad-iteration')
    expect(codes('bench://gpt-oss-20b/mini-platformer?run=../secrets')).toBe('bad-run-id')
    // A garbage query key is not a run pin; refuse rather than silently drop it.
    expect(codes('bench://gpt-oss-20b/mini-platformer?iteration=3')).toBe('bad-query')
  })
})

describe('tokenizeBenchRefs', () => {
  it('splits a log line into text and parsed refs', () => {
    const parts = tokenizeBenchRefs(
      'same failure as bench://gpt-oss-20b/mini-platformer/1 — see also bench://nope',
    )
    expect(parts).toEqual([
      { kind: 'text', value: 'same failure as ' },
      {
        kind: 'ref',
        value: 'bench://gpt-oss-20b/mini-platformer/1',
        ref: { modelId: 'gpt-oss-20b', taskId: 'mini-platformer', iterationIndex: 1 },
      },
      { kind: 'text', value: ' — see also bench://nope' },
    ])
  })

  it('leaves ref-free text as one text part', () => {
    expect(tokenizeBenchRefs('nothing to see')).toEqual([{ kind: 'text', value: 'nothing to see' }])
    expect(tokenizeBenchRefs('')).toEqual([])
  })
})

describe('resolveBenchRef', () => {
  const board = { models: MODELS, tasks: TASKS, results: [TARGET] }

  it('resolves a record and, when named, its iteration', () => {
    const hit = resolveBenchRef('bench://gpt-oss-20b/mini-platformer/1', board)
    expect(hit.ok).toBe(true)
    if (!hit.ok) return
    expect(hit.model.name).toBe('GPT-OSS 20B')
    expect(hit.task.title).toBe('Mini Platformer')
    expect(hit.result).toBe(TARGET)
    expect(hit.iterationScore).toBe(40)
    expect(hit.iterationChecks?.map((c) => c.name)).toEqual([
      'platformer-jump',
      'platformer-move',
      'no-runtime-errors',
    ])
  })

  it('misses with a typed code for an unknown model, task, or pairing', () => {
    const code = (uri: string) => {
      const r = resolveBenchRef(uri, board)
      expect(r.ok).toBe(false)
      return r.ok ? '' : r.code
    }
    expect(code('bench://who-dis/mini-platformer')).toBe('unknown-model')
    expect(code('bench://gpt-oss-20b/who-dis')).toBe('unknown-task')
    expect(code('bench://nemotron-3-nano-30b/mini-platformer')).toBe('no-result')
    expect(code('not a ref')).toBe('bad-scheme')
  })

  it('bounds the iteration by the record’s own iteration count', () => {
    // iterationScores has two entries, so #2 is off the end.
    const miss = resolveBenchRef('bench://gpt-oss-20b/mini-platformer/2', board)
    expect(miss.ok).toBe(false)
    if (miss.ok) return
    expect(miss.code).toBe('iteration-out-of-range')
  })

  it('refuses a ref pinned to a run the board no longer holds', () => {
    const miss = resolveBenchRef('bench://gpt-oss-20b/mini-platformer?run=2020-01-01T00-00-00', board)
    expect(miss.ok).toBe(false)
    if (miss.ok) return
    expect(miss.code).toBe('run-mismatch')
  })
})

describe('failureSignature', () => {
  it('is every check that failed in ANY iteration, deduped and sorted', () => {
    expect(failureSignature(TARGET)).toEqual(['no-runtime-errors', 'platformer-jump', 'platformer-move'])
  })

  it('is empty for an all-pass record', () => {
    expect(
      failureSignature(
        record({
          modelId: 'gpt-oss-20b',
          taskId: 'n-body-field',
          iterationCheckResults: [[check('nbody-renders', true)], [check('nbody-renders', true)]],
        }),
      ),
    ).toEqual([])
  })

  it('is empty for a text task / legacy record with no check results', () => {
    expect(failureSignature(record({ modelId: 'gpt-oss-20b', taskId: 'n-body-field' }))).toEqual([])
    expect(
      failureSignature(record({ modelId: 'gpt-oss-20b', taskId: 'n-body-field', iterationCheckResults: [] })),
    ).toEqual([])
  })

  it('drops the code-fallback row — it is not a defect to relate runs by (I1)', () => {
    // Every artifact the executable scorer could not run carries this same row.
    // Counting it would give a prose equation-solver answer and a prose crypto
    // answer an identical "shared failure", and `relatedRuns` would offer each
    // as evidence about the other. A signature must only hold statements about
    // the MODEL.
    expect(
      failureSignature(
        record({
          modelId: 'gpt-oss-20b',
          taskId: 'equation-solver',
          iterationCheckResults: [
            [{ name: 'code-fallback', passed: false, points: 0, maxPoints: 0, kind: 'fallback' }],
          ],
        }),
      ),
    ).toEqual([])
    // ...by NAME alone too, for any row written before `kind` existed.
    expect(
      failureSignature(
        record({
          modelId: 'gpt-oss-20b',
          taskId: 'equation-solver',
          iterationCheckResults: [[{ name: 'code-fallback', passed: false, points: 0, maxPoints: 0 }]],
        }),
      ),
    ).toEqual([])
  })

  it('keeps a real failing check that shares an iteration with a fallback row', () => {
    expect(
      failureSignature(
        record({
          modelId: 'gpt-oss-20b',
          taskId: 'equation-solver',
          iterationCheckResults: [
            [
              { name: 'code-fallback', passed: false, points: 0, maxPoints: 0, kind: 'fallback' },
              check('solutions-correct', false),
            ],
          ],
        }),
      ),
    ).toEqual(['solutions-correct'])
  })

  it('drops unnamed checks (a scorer crash records one with an empty name)', () => {
    expect(
      failureSignature(
        record({
          modelId: 'gpt-oss-20b',
          taskId: 'n-body-field',
          iterationCheckResults: [[{ name: '', passed: false, points: 0, maxPoints: 0 }]],
        }),
      ),
    ).toEqual([])
  })
})

describe('relatedRuns', () => {
  const sameTask = record({
    modelId: 'nemotron-3-nano-30b',
    taskId: 'mini-platformer',
    createdAt: '2026-08-02T00:00:00.000Z',
    iterationCheckResults: [[check('platformer-jump', false)]],
  })
  const sameModel = record({
    modelId: 'gpt-oss-20b',
    taskId: 'n-body-field',
    createdAt: '2026-08-03T00:00:00.000Z',
    iterationCheckResults: [[check('no-runtime-errors', false)]],
  })
  const other = record({
    modelId: 'nemotron-3-nano-30b',
    taskId: 'n-body-field',
    createdAt: '2026-08-04T00:00:00.000Z',
    iterationCheckResults: [[check('no-runtime-errors', false)]],
  })

  it('ranks same-task above same-model above everything else', () => {
    const rows = relatedRuns(TARGET, [TARGET, other, sameModel, sameTask])
    expect(rows.map((r) => r.tier)).toEqual(['same-task', 'same-model', 'other'])
    expect(rows.map((r) => r.ref.modelId)).toEqual([
      'nemotron-3-nano-30b',
      'gpt-oss-20b',
      'nemotron-3-nano-30b',
    ])
    expect(rows[0].sharedChecks).toEqual(['platformer-jump'])
  })

  it('breaks a tier tie by intersection size, then by recency', () => {
    const weak = record({
      modelId: 'nemotron-3-nano-30b',
      taskId: 'mini-platformer',
      createdAt: '2026-08-09T00:00:00.000Z',
      iterationCheckResults: [[check('platformer-jump', false)]],
    })
    const strong = record({
      modelId: 'ling-3.0-tiny',
      taskId: 'mini-platformer',
      createdAt: '2026-08-05T00:00:00.000Z',
      iterationCheckResults: [[check('platformer-jump', false), check('platformer-move', false)]],
    })
    const newerWeak = record({
      modelId: 'laguna-s-2.1',
      taskId: 'mini-platformer',
      createdAt: '2026-08-12T00:00:00.000Z',
      iterationCheckResults: [[check('platformer-jump', false)]],
    })
    const rows = relatedRuns(TARGET, [TARGET, weak, strong, newerWeak])
    // Bigger intersection wins even though it is the oldest; the two
    // single-check candidates then sort newest-first.
    expect(rows.map((r) => r.ref.modelId)).toEqual(['ling-3.0-tiny', 'laguna-s-2.1', 'nemotron-3-nano-30b'])
    expect(rows[0].sharedChecks).toEqual(['platformer-jump', 'platformer-move'])
  })

  it('excludes the target itself, seeded records, and non-overlapping runs', () => {
    const seeded = record({
      modelId: 'claude-4',
      taskId: 'mini-platformer',
      source: 'seeded',
      iterationCheckResults: [[check('platformer-jump', false)]],
    })
    const disjoint = record({
      modelId: 'gemma-4-31b',
      taskId: 'physics-pendulum-wave',
      iterationCheckResults: [[check('pendulum-renders', false)]],
    })
    const rows = relatedRuns(TARGET, [TARGET, seeded, disjoint, sameTask])
    expect(rows.map((r) => r.ref.modelId)).toEqual(['nemotron-3-nano-30b'])
  })

  it('returns nothing when the target has no failure signature', () => {
    const clean = record({
      modelId: 'gpt-oss-20b',
      taskId: 'mini-platformer',
      iterationCheckResults: [[check('platformer-jump', true)]],
    })
    expect(relatedRuns(clean, [clean, sameTask])).toEqual([])
  })

  it('honours the limit', () => {
    expect(relatedRuns(TARGET, [TARGET, other, sameModel, sameTask], { limit: 2 })).toHaveLength(2)
    expect(relatedRuns(TARGET, [TARGET, other, sameModel, sameTask], { limit: 0 })).toEqual([])
  })

  it('pins the candidate’s run id when it has a published log', () => {
    const traced = record({
      modelId: 'nemotron-3-nano-30b',
      taskId: 'mini-platformer',
      iterationCheckResults: [[check('platformer-jump', false)]],
      runLogRef: { runId: '2026-08-16T09-30-12', file: 'nemotron-3-nano-30b-mini-platformer.jsonl' },
    })
    const [row] = relatedRuns(TARGET, [TARGET, traced])
    expect(row.ref.runId).toBe('2026-08-16T09-30-12')
    expect(formatBenchRef(row.ref)).toBe(
      'bench://nemotron-3-nano-30b/mini-platformer?run=2026-08-16T09-30-12',
    )
  })
})

// ---------------------------------------------------------------------------
// smoke test against the REAL board — the fixtures above pin the ranking rules,
// this pins that they actually fire on the data the site ships.
// ---------------------------------------------------------------------------

describe('relatedRuns over the real results.json', () => {
  const target = BENCHMARK_RESULTS.find(
    (r) => r.modelId === 'gpt-oss-20b' && r.taskId === 'mini-platformer',
  )

  it('finds the record the fixtures are modelled on', () => {
    expect(target).toBeDefined()
    expect(failureSignature(target!)).toEqual([
      'no-runtime-errors',
      'platformer-jump',
      'platformer-move',
    ])
  })

  it('returns same-task neighbours that genuinely share a failed check', () => {
    const rows = relatedRuns(target!, BENCHMARK_RESULTS, { limit: 5 })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0].tier).toBe('same-task')
    for (const row of rows) {
      expect(row.sharedChecks.length).toBeGreaterThan(0)
      // Every emitted ref resolves against the live registry + board.
      const hit = resolveBenchRef(formatBenchRef(row.ref), {
        models: BENCHMARK_MODELS,
        tasks: BENCHMARK_TASKS,
        results: BENCHMARK_RESULTS,
      })
      expect(hit.ok, `unresolvable: ${formatBenchRef(row.ref)}`).toBe(true)
      if (!hit.ok) return
      expect(hit.result.source).not.toBe('seeded')
      for (const name of row.sharedChecks) {
        expect(failureSignature(hit.result)).toContain(name)
      }
    }
    // Cross-task neighbours exist too: `no-runtime-errors` is the one check
    // every behavioural task shares.
    const wide = relatedRuns(target!, BENCHMARK_RESULTS, { limit: 100 })
    expect(wide.some((r) => r.tier !== 'same-task')).toBe(true)
  })
})
