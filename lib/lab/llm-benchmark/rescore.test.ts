import { describe, it, expect } from 'vitest'

import { compareRescore, locateScoredArtifact, NoScoredArtifactError } from './rescore'
import { contentAddressedName } from './content-address'
import { textScorer } from './scorers'
import { BENCHMARK_TASKS } from './registry'
import type { RunLogEvent, RunLogHeader } from './runlog-format'

const HEADER: RunLogHeader = {
  type: 'header',
  seq: 0,
  version: 1,
  runId: '2026-08-17T05-41-46',
  modelId: 'kimi-k2.7',
  taskId: 'equation-solver',
  createdAt: '2026-08-17T05:41:46.000Z',
  configSnapshot: { iterations: 2, timeoutMs: 1000, maxRetries: 1, bustCache: false },
}

function spill(ref: string) {
  return { spillRef: ref, preview: '…', bytes: 9000 }
}

function parsed(events: unknown[]): { header: RunLogHeader; events: RunLogEvent[] } {
  return { header: HEADER, events: events as RunLogEvent[] }
}

describe('locateScoredArtifact', () => {
  it('identifies the iteration by content address and uses ITS score', () => {
    // Content addressing does the work: the aggregate's artifact and the clean
    // event that produced it are the same file, so the ref names the iteration.
    const found = locateScoredArtifact(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: spill('spill/aaaaaaaaaaaaaaaa.txt') },
        { type: 'clean', seq: 2, iterationIndex: 1, output: spill('spill/bbbbbbbbbbbbbbbb.txt') },
        {
          type: 'aggregate',
          seq: 3,
          result: { score: 55, iterationScores: [40, 70], output: spill('spill/bbbbbbbbbbbbbbbb.txt') },
        },
      ])
    )
    expect(found).toMatchObject({
      modelId: 'kimi-k2.7',
      taskId: 'equation-solver',
      spillRef: 'spill/bbbbbbbbbbbbbbbb.txt',
      iterationIndex: 1,
      recordedScore: 70,
      basis: 'iteration',
    })
  })

  it('matches a SMALL artifact whose clean event stayed inline, by addressing it', () => {
    // Under SPILL_THRESHOLD_BYTES the `clean` output is inline, but the
    // aggregate force-spills its copy — so the tie back to an iteration is the
    // content address of the inline string.
    const artifact = 'x = 3, y = 4'
    const ref = `spill/${contentAddressedName(artifact, '.txt')}`
    const found = locateScoredArtifact(
      parsed([
        { type: 'clean', seq: 1, iterationIndex: 0, output: 'something else' },
        { type: 'clean', seq: 2, iterationIndex: 1, output: artifact },
        {
          type: 'aggregate',
          seq: 3,
          result: { score: 55, iterationScores: [40, 70], output: spill(ref) },
        },
      ])
    )
    expect(found.iterationIndex).toBe(1)
    expect(found.recordedScore).toBe(70)
    expect(found.basis).toBe('iteration')
  })

  it('falls back to the BEST iteration score when no clean event matches', () => {
    // The published artifact is the best-scoring iteration by construction
    // (aggregateRuns), so the mean would be the wrong baseline — comparing a
    // single artifact against a mean would invent drift out of variance.
    const found = locateScoredArtifact(
      parsed([
        {
          type: 'aggregate',
          seq: 1,
          result: { score: 55, iterationScores: [40, 70], output: spill('spill/cccccccccccccccc.txt') },
        },
      ])
    )
    expect(found.recordedScore).toBe(70)
    expect(found.basis).toBe('best-iteration')
    expect(found.iterationIndex).toBeUndefined()
  })

  it('falls back to the aggregate mean when the log has no per-iteration scores', () => {
    const found = locateScoredArtifact(
      parsed([{ type: 'aggregate', seq: 1, result: { score: 55, output: spill('spill/dddddddddddddddd.txt') } }])
    )
    expect(found.recordedScore).toBe(55)
    expect(found.basis).toBe('aggregate-mean')
  })

  it('takes the LAST aggregate when a log was reopened and re-aggregated', () => {
    const found = locateScoredArtifact(
      parsed([
        { type: 'aggregate', seq: 1, result: { score: 10, output: spill('spill/1111111111111111.txt') } },
        { type: 'aggregate', seq: 2, result: { score: 90, output: spill('spill/2222222222222222.txt') } },
      ])
    )
    expect(found.spillRef).toBe('spill/2222222222222222.txt')
  })

  it('refuses a log with no aggregate event', () => {
    expect(() => locateScoredArtifact(parsed([{ type: 'request', seq: 1 }]))).toThrow(
      NoScoredArtifactError
    )
  })

  it('refuses an aggregate whose output was never spilled', () => {
    expect(() =>
      locateScoredArtifact(parsed([{ type: 'aggregate', seq: 1, result: { score: 55 } }]))
    ).toThrow(/nothing to re-score/)
  })
})

describe('compareRescore', () => {
  it('reports a match inside the tolerance', () => {
    const c = compareRescore(70, 70)
    expect(c.drifted).toBe(false)
    expect(c.delta).toBe(0)
    expect(c.line).toMatch(/^MATCH/)
  })

  it('reports drift, with the signed delta, when the scorer disagrees', () => {
    const c = compareRescore(70, 55, 'iteration')
    expect(c.drifted).toBe(true)
    expect(c.delta).toBe(-15)
    expect(c.line).toBe('DRIFT: recorded 70 (iteration) vs current 55 — -15')
  })

  it('does not call float noise a drift', () => {
    expect(compareRescore(70, 70.02).drifted).toBe(false)
  })

  it('never claims drift with no baseline to compare against', () => {
    const c = compareRescore(undefined, 55)
    expect(c.drifted).toBe(false)
    expect(c.delta).toBeUndefined()
    expect(c.line).toMatch(/no recorded score/)
  })
})

describe('end to end against a real (cheap, text) scorer', () => {
  // equation-solver's scorer is pure text matching — no Playwright, so the
  // whole comparison path is exercised in a unit test.
  const task = BENCHMARK_TASKS.find((t) => t.id === 'equation-solver')!

  it('MATCHES when the stored artifact still scores what the log recorded', async () => {
    const artifact = 'The real solutions are (3, 4) and (4, 3), from x² + y² = 25 and xy = 12.'
    const current = await textScorer.score(artifact, task)
    expect(compareRescore(current, current).drifted).toBe(false)
  })

  it('DRIFTS when the stored bytes no longer contain the solution they were scored for', async () => {
    const scored = await textScorer.score('Solutions: (3, 4) and (4, 3) for x² + y² = 25, xy = 12.', task)
    const tampered = await textScorer.score('Solutions: (1, 2) for x² + y² = 25, xy = 12.', task)
    const c = compareRescore(scored, tampered)
    expect(c.drifted).toBe(true)
    expect(c.delta!).toBeLessThan(0)
  })
})
