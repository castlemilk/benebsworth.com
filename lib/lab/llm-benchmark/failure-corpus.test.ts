import { describe, it, expect } from 'vitest'

import { contentAddress, contentAddressedName } from './content-address'
import {
  CORPUS_FAIL_SCORE,
  compareCase,
  mergeProvenance,
  provenanceKey,
  selectFailureCases,
  summarizeVerdictCounts,
  toProvenanceEntry,
  type ProvenanceEntry,
} from './failure-corpus'
import type { RunLogEvent, RunLogHeader } from './runlog-format'

const HEADER: RunLogHeader = {
  type: 'header',
  seq: 0,
  version: 1,
  runId: '2026-08-17T06-59-08',
  modelId: 'nemotron-nano-12b-vl',
  taskId: 'mini-platformer',
  createdAt: '2026-08-17T07:14:17.317Z',
  configSnapshot: {
    iterations: 5,
    timeoutMs: 600_000,
    maxRetries: 2,
    bustCache: false,
    promptBundle: '1a38ff5e6a98d15b',
  },
}

function spill(ref: string) {
  return { spillRef: ref, preview: '…', bytes: 9000 }
}

function parsed(events: unknown[]): { header: RunLogHeader; events: RunLogEvent[] } {
  return { header: HEADER, events: events as RunLogEvent[] }
}

function check(name: string, passed: boolean) {
  return { name, passed, points: passed ? 10 : 0, maxPoints: 10 }
}

describe('selectFailureCases', () => {
  it('selects an iteration whose score is below the failure floor', () => {
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/aaaaaaaaaaaaaaaa.txt') },
        { type: 'clean', seq: 2, iterationIndex: 1, output: spill('spill/bbbbbbbbbbbbbbbb.txt') },
        {
          type: 'aggregate',
          seq: 3,
          result: {
            score: 55,
            iterationScores: [30, 80],
            promptBundle: '1a38ff5e6a98d15b',
            output: spill('spill/bbbbbbbbbbbbbbbb.txt'),
          },
        },
      ])
    )
    expect(found.cases).toHaveLength(1)
    expect(found.cases[0]).toMatchObject({
      artifact: 'aaaaaaaaaaaaaaaa',
      modelId: 'nemotron-nano-12b-vl',
      taskId: 'mini-platformer',
      iterationIndex: 0,
      score: 30,
      failedChecks: [],
      promptBundle: '1a38ff5e6a98d15b',
      sweepRunId: '2026-08-17T06-59-08',
      spillRef: 'spill/aaaaaaaaaaaaaaaa.txt',
    })
    expect(CORPUS_FAIL_SCORE).toBe(40)
  })

  it('selects a PASSING score that tripped a check (the gemini tic-tac-toe shape)', () => {
    // 68 is comfortably above the floor, but a check failed — which is exactly
    // the regression case a scorer/prompt edit should re-test.
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/cccccccccccccccc.txt') },
        {
          type: 'aggregate',
          seq: 2,
          result: {
            score: 68,
            iterationScores: [68],
            iterationCheckResults: [[check('win-detection', false), check('board-renders', true)]],
            output: spill('spill/cccccccccccccccc.txt'),
          },
        },
      ])
    )
    expect(found.cases).toHaveLength(1)
    expect(found.cases[0].score).toBe(68)
    expect(found.cases[0].failedChecks).toEqual(['win-detection'])
  })

  it('leaves a clean, high-scoring iteration out of the corpus', () => {
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/dddddddddddddddd.txt') },
        {
          type: 'aggregate',
          seq: 2,
          result: {
            score: 100,
            iterationScores: [100],
            iterationCheckResults: [[check('board-renders', true)]],
            output: spill('spill/dddddddddddddddd.txt'),
          },
        },
      ])
    )
    expect(found.cases).toEqual([])
    expect(found.skipped).toEqual([])
  })

  it('aligns scores to clean events BY ORDER, not by iterationIndex', () => {
    // The real nemotron pendulum run: iteration 3 failed, so the clean events
    // are 0,1,2,4 while iterationScores has four entries. Indexing
    // iterationScores by iterationIndex would attribute iteration 4's score to
    // a non-existent iteration 3 and silently mis-file the artifact.
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/0000000000000000.txt') },
        { type: 'clean', seq: 2, iterationIndex: 1, output: spill('spill/1111111111111111.txt') },
        { type: 'clean', seq: 3, iterationIndex: 2, output: spill('spill/2222222222222222.txt') },
        { type: 'failure', seq: 4, iterationIndex: 3, error: 'timeout', failureReason: 'timeout', timedOut: true },
        { type: 'clean', seq: 5, iterationIndex: 4, output: spill('spill/4444444444444444.txt') },
        {
          type: 'aggregate',
          seq: 6,
          result: {
            score: 39.5,
            iterationScores: [90, 90, 90, 30],
            output: spill('spill/0000000000000000.txt'),
          },
        },
      ])
    )
    expect(found.cases).toHaveLength(1)
    expect(found.cases[0]).toMatchObject({
      artifact: '4444444444444444',
      iterationIndex: 4,
      score: 30,
    })
  })

  it('falls back to `check` events when the aggregate carries no iterationCheckResults', () => {
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/eeeeeeeeeeeeeeee.txt') },
        { type: 'check', seq: 2, iterationIndex: 0, check: check('canvas-advance', false) },
        { type: 'check', seq: 3, iterationIndex: 0, check: check('space-jump', true) },
        {
          type: 'aggregate',
          seq: 4,
          result: { score: 68, iterationScores: [68], output: spill('spill/eeeeeeeeeeeeeeee.txt') },
        },
      ])
    )
    expect(found.cases).toHaveLength(1)
    expect(found.cases[0].failedChecks).toEqual(['canvas-advance'])
  })

  it('addresses a SMALL inline artifact itself and carries its bytes', () => {
    const html = '<html><body>broken</body></html>'
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: html },
        {
          type: 'aggregate',
          seq: 2,
          result: { score: 12, iterationScores: [12], output: spill(`spill/${contentAddressedName(html, '.txt')}`) },
        },
      ])
    )
    expect(found.cases).toHaveLength(1)
    expect(found.cases[0].artifact).toBe(contentAddress(html))
    expect(found.cases[0].inline).toBe(html)
    expect(found.cases[0].spillRef).toBeUndefined()
  })

  it('drops UNNAMED failed checks — a scorer crash is not a named regression', () => {
    // Verbatim from the real nemotron pendulum run: the Playwright sandbox threw
    // ("Attempt to access memory outside buffer bounds") and recorded two
    // nameless 0-point failures. The iteration is still ingested on its score.
    const crashed = {
      name: '',
      passed: false,
      points: 0,
      maxPoints: 0,
      detail: 'threw: Attempt to access memory outside buffer bounds',
    }
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/aaaaaaaaaaaaaaaa.txt') },
        {
          type: 'aggregate',
          seq: 2,
          result: {
            score: 30,
            iterationScores: [30],
            iterationCheckResults: [[crashed, crashed]],
            output: spill('spill/aaaaaaaaaaaaaaaa.txt'),
          },
        },
      ])
    )
    expect(found.cases).toHaveLength(1)
    expect(found.cases[0].failedChecks).toEqual([])
  })

  it('does NOT ingest a passing iteration whose only failure is unnamed', () => {
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/aaaaaaaaaaaaaaaa.txt') },
        {
          type: 'aggregate',
          seq: 2,
          result: {
            score: 90,
            iterationScores: [90],
            iterationCheckResults: [[{ name: '', passed: false, points: 0, maxPoints: 0 }]],
            output: spill('spill/aaaaaaaaaaaaaaaa.txt'),
          },
        },
      ])
    )
    expect(found.cases).toEqual([])
  })

  it('ingests a 100-scoring iteration that tripped a ZERO-POINT check', () => {
    // The real nemotron tic-tac-toe iteration 2: every scoring check passed, but
    // `no-runtime-errors` (maxPoints 0) caught "board.children.forEach is not a
    // function". A score-only filter would throw that case away — a page that
    // scores 100 while throwing is precisely a regression case.
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 2, output: spill('spill/aaaaaaaaaaaaaaaa.txt') },
        {
          type: 'aggregate',
          seq: 2,
          result: {
            score: 100,
            iterationScores: [100],
            iterationCheckResults: [
              [check('ttt-win-detected', true), { name: 'no-runtime-errors', passed: false, points: 0, maxPoints: 0 }],
            ],
            output: spill('spill/aaaaaaaaaaaaaaaa.txt'),
          },
        },
      ])
    )
    expect(found.cases).toHaveLength(1)
    expect(found.cases[0]).toMatchObject({ score: 100, failedChecks: ['no-runtime-errors'] })
  })

  it('skips a legacy log with no iterationScores rather than guessing', () => {
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/aaaaaaaaaaaaaaaa.txt') },
        { type: 'aggregate', seq: 2, result: { score: 30, output: spill('spill/aaaaaaaaaaaaaaaa.txt') } },
      ])
    )
    expect(found.cases).toEqual([])
    expect(found.skipped).toEqual([{ reason: 'no-iteration-scores' }])
  })

  it('skips a log with no aggregate event', () => {
    const found = selectFailureCases(
      parsed([{ type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/aaaaaaaaaaaaaaaa.txt') }])
    )
    expect(found.cases).toEqual([])
    expect(found.skipped).toEqual([{ reason: 'no-aggregate' }])
  })

  it('refuses to align when the clean events and scores disagree in count', () => {
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/aaaaaaaaaaaaaaaa.txt') },
        {
          type: 'aggregate',
          seq: 2,
          result: { score: 30, iterationScores: [30, 30], output: spill('spill/aaaaaaaaaaaaaaaa.txt') },
        },
      ])
    )
    expect(found.cases).toEqual([])
    expect(found.skipped[0].reason).toBe('unalignable')
  })

  it('counts a pruned spill file as unavailable rather than crashing', () => {
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/aaaaaaaaaaaaaaaa.txt') },
        { type: 'clean', seq: 2, iterationIndex: 1, output: spill('spill/bbbbbbbbbbbbbbbb.txt') },
        {
          type: 'aggregate',
          seq: 3,
          result: { score: 20, iterationScores: [20, 20], output: spill('spill/aaaaaaaaaaaaaaaa.txt') },
        },
      ]),
      { artifactExists: (ref) => ref === 'spill/aaaaaaaaaaaaaaaa.txt' }
    )
    expect(found.cases.map((c) => c.artifact)).toEqual(['aaaaaaaaaaaaaaaa'])
    expect(found.unavailable.map((c) => c.artifact)).toEqual(['bbbbbbbbbbbbbbbb'])
  })

  it('skips a spill ref that carries no content address', () => {
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/legacy-name.txt') },
        {
          type: 'aggregate',
          seq: 2,
          result: { score: 20, iterationScores: [20], output: spill('spill/legacy-name.txt') },
        },
      ])
    )
    expect(found.cases).toEqual([])
    expect(found.skipped[0].reason).toBe('unaddressable-artifact')
  })

  it('falls back to the header snapshot for the prompt bundle', () => {
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/aaaaaaaaaaaaaaaa.txt') },
        {
          type: 'aggregate',
          seq: 2,
          result: { score: 20, iterationScores: [20], output: spill('spill/aaaaaaaaaaaaaaaa.txt') },
        },
      ])
    )
    expect(found.cases[0].promptBundle).toBe('1a38ff5e6a98d15b')
  })

  it('ignores a code-fallback row: the harness could not judge, so there is no case (I1)', () => {
    // A passing-score iteration whose ONLY failing row is `code-fallback` must
    // not enter the corpus. That row says the harness could not extract a
    // program — every prose equation-solver answer on the board carries it —
    // and ingesting it would file a fine artifact as a broken one, with a
    // named tripped check it never tripped.
    const fallbackRow = {
      name: 'code-fallback',
      passed: false,
      points: 0,
      maxPoints: 0,
      kind: 'fallback' as const,
      detail: 'extraction-failed: no fenced program in the artifact',
    }
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/eeeeeeeeeeeeeeee.txt') },
        {
          type: 'aggregate',
          seq: 2,
          result: {
            score: 72,
            iterationScores: [72],
            iterationCheckResults: [[fallbackRow]],
            output: spill('spill/eeeeeeeeeeeeeeee.txt'),
          },
        },
      ])
    )
    expect(found.cases).toEqual([])
    expect(found.skipped).toEqual([])
  })

  it('still ingests a real failing check that rides alongside a fallback row', () => {
    // Belt and braces the other way: excluding the fallback row must not
    // exclude the iteration when something REAL also failed.
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/ffffffffffffffff.txt') },
        {
          type: 'aggregate',
          seq: 2,
          result: {
            score: 72,
            iterationScores: [72],
            iterationCheckResults: [
              [
                { name: 'code-fallback', passed: false, points: 0, maxPoints: 0, kind: 'fallback' },
                check('win-detection', false),
              ],
            ],
            output: spill('spill/ffffffffffffffff.txt'),
          },
        },
      ])
    )
    expect(found.cases).toHaveLength(1)
    expect(found.cases[0].failedChecks).toEqual(['win-detection'])
  })

  it('ignores a fallback CHECK EVENT too, on the no-checkRows path', () => {
    // The other half of `failedCheckNames`: when the aggregate carries no
    // `iterationCheckResults`, the names come from `check` events instead.
    const found = selectFailureCases(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/aaaabbbbccccdddd.txt') },
        {
          type: 'check',
          seq: 2,
          iterationIndex: 0,
          check: { name: 'code-fallback', passed: false, points: 0, maxPoints: 0, kind: 'fallback' },
        },
        {
          type: 'aggregate',
          seq: 3,
          result: {
            score: 72,
            iterationScores: [72],
            output: spill('spill/aaaabbbbccccdddd.txt'),
          },
        },
      ])
    )
    expect(found.cases).toEqual([])
  })
})

const CASE_A = {
  artifact: 'aaaaaaaaaaaaaaaa',
  modelId: 'nemotron-nano-12b-vl',
  taskId: 'mini-platformer',
  iterationIndex: 0,
  score: 30,
  failedChecks: ['canvas-advance'],
  promptBundle: '1a38ff5e6a98d15b',
  sweepRunId: '2026-08-17T06-59-08',
}

describe('mergeProvenance', () => {
  const first = toProvenanceEntry(CASE_A, '2026-08-17T09:00:00.000Z')

  it('is idempotent: re-ingesting the same case changes nothing', () => {
    const again = toProvenanceEntry(CASE_A, '2026-08-18T09:00:00.000Z')
    const merged = mergeProvenance([first], [again])
    expect(merged.entries).toEqual([first])
    expect(merged).toMatchObject({ added: 0, updated: 0, unchanged: 1 })
  })

  it('keeps the ORIGINAL ingestedAt so a re-ingest produces no diff', () => {
    const merged = mergeProvenance([first], [toProvenanceEntry(CASE_A, '2026-09-01T00:00:00.000Z')])
    expect(merged.entries[0].ingestedAt).toBe('2026-08-17T09:00:00.000Z')
  })

  it('appends new entries', () => {
    const other = toProvenanceEntry(
      { ...CASE_A, artifact: 'bbbbbbbbbbbbbbbb', iterationIndex: 2 },
      '2026-08-17T09:00:00.000Z'
    )
    const merged = mergeProvenance([first], [other])
    expect(merged.entries).toHaveLength(2)
    expect(merged).toMatchObject({ added: 1, unchanged: 0 })
  })

  it('updates a re-scored case in place and reports it', () => {
    const rescored = toProvenanceEntry({ ...CASE_A, score: 11 }, '2026-08-18T09:00:00.000Z')
    const merged = mergeProvenance([first], [rescored])
    expect(merged.entries[0].score).toBe(11)
    expect(merged.entries[0].ingestedAt).toBe('2026-08-17T09:00:00.000Z')
    expect(merged).toMatchObject({ added: 0, updated: 1 })
  })

  it('orders entries stably so the committed JSON diffs cleanly', () => {
    const keys = ['cc', 'aa', 'bb'].map((p) =>
      toProvenanceEntry({ ...CASE_A, artifact: p.repeat(8) }, '2026-08-17T09:00:00.000Z')
    )
    const forwards = mergeProvenance([], keys).entries.map(provenanceKey)
    const backwards = mergeProvenance([], [...keys].reverse()).entries.map(provenanceKey)
    expect(forwards).toEqual(backwards)
    expect(forwards[0]).toContain('aaaaaaaaaaaaaaaa')
  })

  it('orders iterations numerically, not lexically', () => {
    const entries = [10, 2].map((i) =>
      toProvenanceEntry({ ...CASE_A, iterationIndex: i }, '2026-08-17T09:00:00.000Z')
    )
    expect(mergeProvenance([], entries).entries.map((e) => e.iterationIndex)).toEqual([2, 10])
  })

  it('drops the promptBundle key entirely when the log had none', () => {
    // An `undefined` value would serialize away anyway; the point is that the
    // committed JSON never carries a `"promptBundle": null` placeholder.
    const { promptBundle: _drop, ...noBundle } = CASE_A
    const entry = toProvenanceEntry(noBundle, '2026-08-17T09:00:00.000Z')
    expect(Object.keys(entry)).not.toContain('promptBundle')
  })
})

describe('compareCase', () => {
  it('reports still-broken when the same checks fail again', () => {
    const c = compareCase({ score: 30, failedChecks: ['canvas-advance'] }, { score: 30, failedChecks: ['canvas-advance'] })
    expect(c.verdict).toBe('still-broken')
    expect(c.stillFailing).toEqual(['canvas-advance'])
  })

  it('reports still-broken for a score-only case that still scores below the floor', () => {
    expect(compareCase({ score: 3, failedChecks: [] }, { score: 12, failedChecks: [] }).verdict).toBe(
      'still-broken'
    )
  })

  it('reports now-passing when the score clears the floor and nothing that failed still fails', () => {
    const c = compareCase({ score: 30, failedChecks: ['canvas-advance'] }, { score: 88, failedChecks: [] })
    expect(c.verdict).toBe('now-passing')
    expect(c.fixed).toEqual(['canvas-advance'])
  })

  it('does NOT call it now-passing while a previously-failed check still fails', () => {
    const c = compareCase(
      { score: 30, failedChecks: ['canvas-advance', 'space-jump'] },
      { score: 90, failedChecks: ['canvas-advance'] }
    )
    expect(c.verdict).toBe('changed')
    expect(c.stillFailing).toEqual(['canvas-advance'])
    expect(c.fixed).toEqual(['space-jump'])
  })

  it('reports changed when the artifact breaks in a NEW way', () => {
    const c = compareCase(
      { score: 30, failedChecks: ['canvas-advance'] },
      { score: 30, failedChecks: ['canvas-advance', 'reset-button'] }
    )
    expect(c.verdict).toBe('changed')
    expect(c.newlyFailing).toEqual(['reset-button'])
  })

  it('reports changed when a below-floor score fails a check it never failed before', () => {
    const c = compareCase({ score: 30, failedChecks: [] }, { score: 20, failedChecks: ['reset-button'] })
    expect(c.verdict).toBe('changed')
  })

  it('summarises itself in one line', () => {
    expect(compareCase({ score: 3, failedChecks: [] }, { score: 91, failedChecks: [] }).line).toContain(
      'now-passing'
    )
  })
})

describe('summarizeVerdictCounts', () => {
  it('always reports all three verdicts, zeros included', () => {
    expect(summarizeVerdictCounts(['still-broken', 'still-broken', 'now-passing'])).toEqual({
      'still-broken': 2,
      'now-passing': 1,
      changed: 0,
    })
  })
})

describe('provenanceKey', () => {
  it('is stable across re-ingests of the same iteration', () => {
    const a: ProvenanceEntry = toProvenanceEntry(CASE_A, '2026-08-17T09:00:00.000Z')
    const b: ProvenanceEntry = toProvenanceEntry({ ...CASE_A, score: 1 }, '2027-01-01T00:00:00.000Z')
    expect(provenanceKey(a)).toBe(provenanceKey(b))
  })
})
