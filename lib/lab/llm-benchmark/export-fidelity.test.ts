import { describe, expect, it } from 'vitest'

import { contentAddress } from './content-address'
import { verifyPublishedTraces } from './export-fidelity'
import type { TraceIndexEntry } from './traces'

const RUN = '2026-08-17T06-34-06'
const FILE = 'gemini-3.6-flash-tic-tac-toe.jsonl'
const SPILL_TEXT = '<!doctype html>\n<title>tic tac toe</title>\n'
const SPILL_REF = `spill/${contentAddress(SPILL_TEXT)}.txt`

const ENTRY: TraceIndexEntry = {
  runId: RUN,
  file: FILE,
  modelId: 'gemini-3.6-flash',
  taskId: 'tic-tac-toe',
  bytes: 400,
  spillRefs: [SPILL_REF],
}

const RECORD = {
  modelId: 'gemini-3.6-flash',
  taskId: 'tic-tac-toe',
  score: 78,
  status: 'success',
  iterations: 5,
  iterationsSucceeded: 5,
  costUsd: 0.0123,
  runLogRef: { runId: RUN, file: FILE },
}

function logText(overrides: Record<string, unknown> = {}, spillRef = SPILL_REF) {
  const header = {
    type: 'header',
    seq: 0,
    version: 1,
    runId: RUN,
    modelId: ENTRY.modelId,
    taskId: ENTRY.taskId,
    createdAt: '2026-08-17T06:34:06.000Z',
    configSnapshot: { iterations: 5, timeoutMs: 1000, maxRetries: 2, bustCache: false },
  }
  const clean = {
    type: 'clean',
    seq: 1,
    ts: '2026-08-17T06:35:00.000Z',
    iterationIndex: 0,
    output: { spillRef, preview: '<!doctype html>', bytes: SPILL_TEXT.length },
  }
  const aggregate = {
    type: 'aggregate',
    seq: 2,
    ts: '2026-08-17T06:40:00.000Z',
    result: {
      modelId: ENTRY.modelId,
      taskId: ENTRY.taskId,
      score: 78,
      status: 'success',
      iterations: 5,
      iterationsSucceeded: 5,
      costUsd: 0.0123,
      ...overrides,
    },
  }
  return [header, clean, aggregate].map((e) => JSON.stringify(e)).join('\n') + '\n'
}

function published(files: Record<string, string>) {
  return (runId: string, relPath: string) =>
    runId === RUN ? files[relPath] : undefined
}

const GOOD_FILES = { [FILE]: logText(), [SPILL_REF]: SPILL_TEXT }

describe('verifyPublishedTraces', () => {
  it('passes a published trace that matches the record it backs', () => {
    const report = verifyPublishedTraces({
      index: [ENTRY],
      results: [RECORD],
      readPublished: published(GOOD_FILES),
    })
    expect(report.problems).toEqual([])
    expect(report.traces).toBe(1)
    expect(report.spillChecked).toBe(1)
  })

  it('fails, naming the field, when the aggregate’s score diverges from the record', () => {
    const report = verifyPublishedTraces({
      index: [ENTRY],
      results: [RECORD],
      readPublished: published({ ...GOOD_FILES, [FILE]: logText({ score: 71 }) }),
    })
    expect(report.problems).toHaveLength(1)
    expect(report.problems[0].field).toBe('score')
    expect(report.problems[0].detail).toContain('71')
    expect(report.problems[0].detail).toContain('78')
    expect(report.problems[0].trace).toBe(`${RUN}/${FILE}`)
  })

  it('fails on a diverged status, iterationsSucceeded or costUsd too', () => {
    for (const [field, value] of [
      ['status', 'partial'],
      ['iterationsSucceeded', 4],
      ['costUsd', 0.02],
    ] as const) {
      const report = verifyPublishedTraces({
        index: [ENTRY],
        results: [RECORD],
        readPublished: published({ ...GOOD_FILES, [FILE]: logText({ [field]: value }) }),
      })
      expect(report.problems.map((p) => p.field)).toEqual([field])
    }
  })

  it('tolerates float noise in costUsd rather than crying wolf', () => {
    const report = verifyPublishedTraces({
      index: [ENTRY],
      results: [RECORD],
      readPublished: published({ ...GOOD_FILES, [FILE]: logText({ costUsd: 0.0123 + 1e-12 }) }),
    })
    expect(report.problems).toEqual([])
  })

  it('fails when a referenced spill file is missing from the published tree', () => {
    const report = verifyPublishedTraces({
      index: [ENTRY],
      results: [RECORD],
      readPublished: published({ [FILE]: logText() }),
    })
    expect(report.problems).toHaveLength(1)
    expect(report.problems[0].detail).toContain(SPILL_REF)
    expect(report.problems[0].detail).toMatch(/missing|not published/i)
  })

  it('fails when a published spill file no longer hashes to its own name', () => {
    const report = verifyPublishedTraces({
      index: [ENTRY],
      results: [RECORD],
      readPublished: published({ ...GOOD_FILES, [SPILL_REF]: SPILL_TEXT + 'tampered' }),
    })
    expect(report.problems).toHaveLength(1)
    expect(report.problems[0].detail).toMatch(/content address|hash/i)
  })

  it('fails when the published JSONL does not parse as a run log', () => {
    const report = verifyPublishedTraces({
      index: [ENTRY],
      results: [RECORD],
      readPublished: published({ [FILE]: 'garbage\n' }),
    })
    expect(report.problems).toHaveLength(1)
    expect(report.problems[0].detail).toMatch(/header/i)
  })

  it('fails when the published JSONL is absent entirely', () => {
    const report = verifyPublishedTraces({
      index: [ENTRY],
      results: [RECORD],
      readPublished: published({}),
    })
    expect(report.problems).toHaveLength(1)
    expect(report.problems[0].detail).toMatch(/could not be read|missing/i)
  })

  it('fails when no results.json record claims the published trace', () => {
    const report = verifyPublishedTraces({
      index: [ENTRY],
      results: [],
      readPublished: published(GOOD_FILES),
    })
    expect(report.problems).toHaveLength(1)
    expect(report.problems[0].detail).toMatch(/no results.json record/i)
  })

  it('fails when the log has no aggregate event to compare', () => {
    const headerOnly = logText().split('\n').slice(0, 2).join('\n') + '\n'
    const report = verifyPublishedTraces({
      index: [ENTRY],
      results: [RECORD],
      readPublished: published({ ...GOOD_FILES, [FILE]: headerOnly }),
    })
    expect(report.problems).toHaveLength(1)
    expect(report.problems[0].detail).toMatch(/aggregate/i)
  })

  it('checks every trace in the index, not just the first', () => {
    const second: TraceIndexEntry = { ...ENTRY, file: 'other.jsonl', spillRefs: [] }
    const report = verifyPublishedTraces({
      index: [ENTRY, second],
      results: [RECORD, { ...RECORD, runLogRef: { runId: RUN, file: 'other.jsonl' } }],
      readPublished: published({ ...GOOD_FILES, 'other.jsonl': logText({ score: 12 }) }),
    })
    expect(report.traces).toBe(2)
    expect(report.problems.map((p) => p.trace)).toEqual([`${RUN}/other.jsonl`])
  })
})
