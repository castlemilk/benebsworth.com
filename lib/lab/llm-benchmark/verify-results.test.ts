import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { openRunLog, readRunLog, setRunLogDir } from './runlog'
import type { BenchmarkResult } from './types'
import {
  RESULT_CHECKS,
  summarizeVerdicts,
  verifyResults,
  type FoundRunLog,
  type Verdict,
} from './verify-results'

const dirs: string[] = []

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'verify-results-test-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  setRunLogDir(undefined)
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** A record that satisfies every invariant, using real registry ids. */
function goodRecord(over: Partial<BenchmarkResult> = {}): BenchmarkResult {
  return {
    taskId: 'n-body-field',
    modelId: 'kimi-k2.7',
    score: 90,
    runtimeMs: 1000,
    tokensIn: 10,
    tokensOut: 20,
    costUsd: 0.01,
    iterations: 2,
    iterationsSucceeded: 2,
    iterationScores: [88, 92],
    status: 'success',
    failureReason: 'none',
    createdAt: '2026-08-16T00:00:00.000Z',
    source: 'live',
    ...over,
  }
}

function of(verdicts: Verdict[], check: string): Verdict[] {
  return verdicts.filter((v) => v.check === check)
}

function failures(verdicts: Verdict[]): Verdict[] {
  return verdicts.filter((v) => v.level === 'fail')
}

describe('check registry', () => {
  it('documents WHY every check exists (dsh invariant discipline)', () => {
    expect(RESULT_CHECKS.length).toBeGreaterThanOrEqual(8)
    for (const check of RESULT_CHECKS) {
      expect(check.id).toMatch(/^[a-z0-9-]+$/)
      expect(check.title.length).toBeGreaterThan(0)
      // A check with no stated bug it would have caught is a synthetic check.
      expect(check.why.length).toBeGreaterThan(40)
    }
    expect(new Set(RESULT_CHECKS.map((c) => c.id)).size).toBe(RESULT_CHECKS.length)
  })
})

describe('verifyResults — a consistent record', () => {
  it('passes every applicable check', () => {
    const verdicts = verifyResults([goodRecord()])
    expect(failures(verdicts)).toEqual([])
    expect(verdicts.filter((v) => v.level === 'warn')).toEqual([])
    expect(of(verdicts, 'score-mean')[0].level).toBe('pass')
    expect(of(verdicts, 'status-consistency')[0].level).toBe('pass')
    expect(of(verdicts, 'registry-resolution')[0].level).toBe('pass')
  })

  it('applies the exact aggregateRuns formula, including the floor of 1', () => {
    // mean 0.4 -> clamped to 1, not rounded to 0.4.
    const record = goodRecord({ iterationScores: [0, 0.8], score: 1 })
    expect(of(verifyResults([record]), 'score-mean')[0].level).toBe('pass')
    // mean 91.666… -> 91.7 (one decimal), not 92.
    const rounded = goodRecord({ iterationScores: [90, 95, 90], score: 91.7, iterations: 3, iterationsSucceeded: 3 })
    expect(of(verifyResults([rounded]), 'score-mean')[0].level).toBe('pass')
  })
})

describe('score-mean consistency', () => {
  it('fails when score has drifted from the mean of iterationScores', () => {
    const verdicts = verifyResults([goodRecord({ score: 97 })])
    const verdict = of(verdicts, 'score-mean')[0]
    expect(verdict.level).toBe('fail')
    expect(verdict.detail).toContain('90')
    expect(verdict.why).toMatch(/mean|aggregateRuns/i)
  })

  it('skips records with no iterationScores (older records)', () => {
    const record = goodRecord()
    delete record.iterationScores
    expect(of(verifyResults([record]), 'score-mean')[0].level).toBe('skip')
  })
})

describe('index alignment', () => {
  it('fails when iterationCheckResults is misaligned with iterationScores', () => {
    const record = goodRecord({
      iterationCheckResults: [[], [], []],
    })
    const verdict = of(verifyResults([record]), 'index-alignment')[0]
    expect(verdict.level).toBe('fail')
    expect(verdict.detail).toContain('3')
  })

  it('passes when both are the same length', () => {
    const record = goodRecord({ iterationCheckResults: [[], []] })
    expect(of(verifyResults([record]), 'index-alignment')[0].level).toBe('pass')
  })

  it('skips the documented single-entry backfill shape', () => {
    // scripts/backfill-iteration-checks.mjs re-scores only the published
    // artifact and stores ONE breakdown — not a defect.
    const record = goodRecord({ iterationCheckResults: [[]] })
    const verdict = of(verifyResults([record]), 'index-alignment')[0]
    expect(verdict.level).toBe('skip')
    expect(verdict.detail).toMatch(/backfill/i)
  })
})

describe('iteration counting', () => {
  it('fails when more iterations succeeded than ran', () => {
    const record = goodRecord({ iterations: 2, iterationsSucceeded: 3, iterationScores: [90, 90, 90] })
    const verdict = of(verifyResults([record]), 'iteration-counts')[0]
    expect(verdict.level).toBe('fail')
    expect(verdict.detail).toContain('3')
  })

  it('fails when iterationScores does not have one entry per successful iteration', () => {
    const record = goodRecord({ iterations: 5, iterationsSucceeded: 5, iterationScores: [90, 90], score: 90 })
    expect(of(verifyResults([record]), 'iteration-counts')[0].level).toBe('fail')
  })

  it('treats an absent iterationsSucceeded as "all succeeded"', () => {
    const record = goodRecord()
    delete record.iterationsSucceeded
    expect(of(verifyResults([record]), 'iteration-counts')[0].level).toBe('pass')
  })
})

describe('status consistency', () => {
  it("fails a 'success' record with zero successful iterations", () => {
    const record = goodRecord({ status: 'success', iterationsSucceeded: 0, iterationScores: [], score: 0 })
    const verdict = of(verifyResults([record]), 'status-consistency')[0]
    expect(verdict.level).toBe('fail')
    expect(verdict.detail).toMatch(/success/)
  })

  it("fails a 'success' record that only partly succeeded", () => {
    const record = goodRecord({ iterations: 5, iterationsSucceeded: 2, iterationScores: [90, 90], score: 90 })
    expect(of(verifyResults([record]), 'status-consistency')[0].level).toBe('fail')
  })

  it("accepts 'partial' for some, 'fail'/'timeout' for none", () => {
    const partial = goodRecord({
      iterations: 5,
      iterationsSucceeded: 2,
      iterationScores: [90, 90],
      score: 90,
      status: 'partial',
      failureReason: 'rate_limited',
    })
    expect(of(verifyResults([partial]), 'status-consistency')[0].level).toBe('pass')
    for (const status of ['fail', 'timeout'] as const) {
      const none = goodRecord({
        iterationsSucceeded: 0,
        iterationScores: [],
        score: 0,
        status,
        failureReason: 'endpoint_hung',
      })
      expect(of(verifyResults([none]), 'status-consistency')[0].level).toBe('pass')
    }
  })

  it('skips legacy records with no iterationsSucceeded and a non-success status', () => {
    const record = goodRecord({ status: 'partial', failureReason: 'rate_limited' })
    delete record.iterationsSucceeded
    delete record.iterationScores
    expect(of(verifyResults([record]), 'status-consistency')[0].level).toBe('skip')
  })
})

describe('registry resolution', () => {
  it('fails an unknown taskId', () => {
    const verdict = of(verifyResults([goodRecord({ taskId: 'no-such-task' })]), 'registry-resolution')[0]
    expect(verdict.level).toBe('fail')
    expect(verdict.detail).toContain('no-such-task')
  })

  it('fails an unknown modelId', () => {
    const verdict = of(verifyResults([goodRecord({ modelId: 'no-such-model' })]), 'registry-resolution')[0]
    expect(verdict.level).toBe('fail')
    expect(verdict.detail).toContain('no-such-model')
  })
})

describe('failureReason sanity', () => {
  it("fails a 'success' record carrying a real failure reason", () => {
    const verdict = of(verifyResults([goodRecord({ failureReason: 'rate_limited' })]), 'failure-reason')[0]
    expect(verdict.level).toBe('fail')
  })

  it('fails a reason outside the taxonomy', () => {
    const record = goodRecord({
      status: 'fail',
      iterationsSucceeded: 0,
      iterationScores: [],
      score: 0,
      failureReason: 'exploded' as never,
    })
    const verdict = of(verifyResults([record]), 'failure-reason')[0]
    expect(verdict.level).toBe('fail')
    expect(verdict.detail).toContain('exploded')
  })

  it('accepts an absent reason on a non-success record (older records)', () => {
    const record = goodRecord({ status: 'fail', iterationsSucceeded: 0, iterationScores: [], score: 0 })
    delete record.failureReason
    expect(of(verifyResults([record]), 'failure-reason')[0].level).toBe('pass')
  })
})

// ---------------------------------------------------------------------------
// Filesystem-dependent checks, driven entirely through injected inputs.
// ---------------------------------------------------------------------------

function log(over: Partial<{ runId: string; file: string; path: string }> = {}): FoundRunLog {
  return {
    runId: '2026-08-16T09-30-12',
    file: 'kimi-k2.7-n-body-field.jsonl',
    path: '/sweeps/2026-08-16T09-30-12/kimi-k2.7-n-body-field.jsonl',
    ...over,
  }
}

function fakeLog(
  modelId: string,
  taskId: string,
  events: Array<{ type: string; seq: number }>
): ReturnType<typeof readRunLog> {
  return {
    header: {
      type: 'header',
      seq: 0,
      version: 1,
      runId: '2026-08-16T09-30-12',
      modelId,
      taskId,
      createdAt: '2026-08-16T09:30:12.000Z',
      configSnapshot: { iterations: 2, timeoutMs: 1000, maxRetries: 1, bustCache: false },
    },
    events: events.map((e) => ({ ...e, ts: '2026-08-16T09:30:13.000Z' })) as never,
  }
}

const AGGREGATE_ONLY = [{ type: 'aggregate', seq: 1 }]

describe('runLogRef ⇄ run log', () => {
  it('fails when a run log exists on disk but the record from that run carries no runLogRef', () => {
    // createdAt AFTER the log header: this record came out of this very run, so
    // a missing ref means the stamping path broke.
    const record = goodRecord({ createdAt: '2026-08-16T09:31:00.000Z' })
    const verdicts = verifyResults([record], {
      runLogs: [log()],
      readLog: () => fakeLog('kimi-k2.7', 'n-body-field', AGGREGATE_ONLY),
    })
    const verdict = of(verdicts, 'runlog-ref').find((v) => v.level === 'fail')
    expect(verdict).toBeDefined()
    expect(verdict!.detail).toContain('kimi-k2.7-n-body-field.jsonl')
    expect(verdict!.why).toMatch(/trace/i)
  })

  it('skips a ref-less record that PREDATES the log — mergeResults kept it over a 0-success run', () => {
    // The quota-trip shape: the sweep wrote a log, produced 0 successes, and
    // mergeResults dropped the fresh record in favour of this older good one.
    // Failing here would arm a permanent pre-push failure.
    const record = goodRecord({ createdAt: '2026-08-01T00:00:00.000Z' })
    const verdicts = verifyResults([record], {
      runLogs: [log()],
      readLog: () => fakeLog('kimi-k2.7', 'n-body-field', AGGREGATE_ONLY),
    })
    expect(failures(verdicts)).toEqual([])
    const verdict = of(verdicts, 'runlog-ref').find((v) => v.level === 'skip')
    expect(verdict).toBeDefined()
    expect(verdict!.detail).toMatch(/predates/i)
  })

  it('still fails a ref-less record stamped at the same instant as the log header', () => {
    // Boundary: `>=` is a genuine miss, not the merge-protection shape.
    const record = goodRecord({ createdAt: '2026-08-16T09:30:12.000Z' })
    const verdicts = verifyResults([record], {
      runLogs: [log()],
      readLog: () => fakeLog('kimi-k2.7', 'n-body-field', AGGREGATE_ONLY),
    })
    expect(of(verdicts, 'runlog-ref').find((v) => v.level === 'fail')).toBeDefined()
  })

  it('passes when the record names the log and the log agrees', () => {
    const record = goodRecord({
      runLogRef: { runId: '2026-08-16T09-30-12', file: 'kimi-k2.7-n-body-field.jsonl' },
    })
    const verdicts = verifyResults([record], {
      runLogs: [log()],
      readLog: () => fakeLog('kimi-k2.7', 'n-body-field', AGGREGATE_ONLY),
    })
    expect(failures(verdicts)).toEqual([])
    expect(of(verdicts, 'runlog-ref').some((v) => v.level === 'pass')).toBe(true)
  })

  it("fails when the referenced log's header names a different model/task", () => {
    const record = goodRecord({
      runLogRef: { runId: '2026-08-16T09-30-12', file: 'kimi-k2.7-n-body-field.jsonl' },
    })
    const verdicts = verifyResults([record], {
      runLogs: [log()],
      readLog: () => fakeLog('gpt-oss-120b-agy', 'mini-platformer', AGGREGATE_ONLY),
    })
    const verdict = of(verdicts, 'runlog-ref').find((v) => v.level === 'fail')
    expect(verdict).toBeDefined()
    expect(verdict!.detail).toMatch(/header/i)
  })

  it('fails when the referenced log has no aggregate event', () => {
    const record = goodRecord({
      runLogRef: { runId: '2026-08-16T09-30-12', file: 'kimi-k2.7-n-body-field.jsonl' },
    })
    const verdicts = verifyResults([record], {
      runLogs: [log()],
      readLog: () => fakeLog('kimi-k2.7', 'n-body-field', [{ type: 'request', seq: 1 }]),
    })
    const verdict = of(verdicts, 'runlog-ref').find((v) => v.level === 'fail')
    expect(verdict!.detail).toMatch(/aggregate/i)
  })

  it('skips a runLogRef whose file is not present locally (sweeps/ is pruned)', () => {
    const record = goodRecord({
      runLogRef: { runId: 'long-pruned-run', file: 'kimi-k2.7-n-body-field.jsonl' },
    })
    const verdicts = verifyResults([record], { runLogs: [], readLog: () => fakeLog('x', 'y', []) })
    const verdict = of(verdicts, 'runlog-ref')[0]
    expect(verdict.level).toBe('skip')
    expect(verdict.detail).toMatch(/not present|pruned/i)
  })

  it('exempts seeded records — they never had a run', () => {
    const record = goodRecord({ source: 'seeded' })
    const verdicts = verifyResults([record], {
      runLogs: [log()],
      readLog: () => fakeLog('kimi-k2.7', 'n-body-field', AGGREGATE_ONLY),
    })
    expect(failures(verdicts)).toEqual([])
    // …but the value checks still apply to seeded data.
    expect(of(verdicts, 'score-mean')[0].level).toBe('pass')
  })

  it('warns rather than fails on an unreadable log', () => {
    const verdicts = verifyResults([goodRecord()], {
      runLogs: [log()],
      readLog: () => {
        throw new Error('missing or unparsable run-log header on line 1')
      },
    })
    expect(failures(verdicts)).toEqual([])
    expect(verdicts.some((v) => v.level === 'warn' && /unparsable/.test(v.detail ?? ''))).toBe(true)
  })
})

describe('run-log seq integrity', () => {
  const ref = { runId: '2026-08-16T09-30-12', file: 'kimi-k2.7-n-body-field.jsonl' }

  it('warns (does not fail) on a seq gap — deliberate dropped-batch evidence', () => {
    const verdicts = verifyResults([goodRecord({ runLogRef: ref })], {
      runLogs: [log()],
      readLog: () =>
        fakeLog('kimi-k2.7', 'n-body-field', [
          { type: 'request', seq: 1 },
          { type: 'aggregate', seq: 5 },
        ]),
    })
    expect(failures(verdicts)).toEqual([])
    const verdict = of(verdicts, 'runlog-seq')[0]
    expect(verdict.level).toBe('warn')
    expect(verdict.detail).toMatch(/gap/i)
  })

  it('fails on a duplicate seq', () => {
    const verdicts = verifyResults([goodRecord({ runLogRef: ref })], {
      runLogs: [log()],
      readLog: () =>
        fakeLog('kimi-k2.7', 'n-body-field', [
          { type: 'request', seq: 1 },
          { type: 'aggregate', seq: 1 },
        ]),
    })
    const verdict = of(verdicts, 'runlog-seq')[0]
    expect(verdict.level).toBe('fail')
    expect(verdict.detail).toMatch(/1/)
  })

  it('fails on a non-monotonic seq', () => {
    const verdicts = verifyResults([goodRecord({ runLogRef: ref })], {
      runLogs: [log()],
      readLog: () =>
        fakeLog('kimi-k2.7', 'n-body-field', [
          { type: 'request', seq: 3 },
          { type: 'aggregate', seq: 2 },
        ]),
    })
    expect(of(verdicts, 'runlog-seq')[0].level).toBe('fail')
  })
})

describe('round trip against a real run log', () => {
  it('verifies a record against a log written by openRunLog', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const runLog = openRunLog({
      modelId: 'kimi-k2.7',
      taskId: 'n-body-field',
      configSnapshot: { iterations: 2, timeoutMs: 1000, maxRetries: 1, bustCache: false },
    })!
    runLog.append({ type: 'request', iterationIndex: 0, promptHash: 'abc', promptLength: 10 })
    runLog.append({ type: 'aggregate', result: { score: 90 } })
    await runLog.close()

    const record = goodRecord({ runLogRef: { runId: runLog.runId, file: runLog.file } })
    const verdicts = verifyResults([record], {
      runLogs: [{ runId: runLog.runId, file: runLog.file, path: runLog.path }],
      readLog: readRunLog,
    })

    expect(failures(verdicts)).toEqual([])
    expect(verdicts.filter((v) => v.level === 'warn')).toEqual([])
    expect(of(verdicts, 'runlog-ref').some((v) => v.level === 'pass')).toBe(true)
    expect(of(verdicts, 'runlog-seq')[0].level).toBe('pass')
  })
})

describe('summarizeVerdicts', () => {
  it('counts checks, records, failures, warnings and skips', () => {
    const verdicts = verifyResults([goodRecord({ score: 97 }), goodRecord()])
    const summary = summarizeVerdicts(verdicts, 2)
    expect(summary.records).toBe(2)
    expect(summary.checks).toBe(RESULT_CHECKS.length)
    expect(summary.failures).toBe(1)
    expect(summary.line).toMatch(/1 failure/)
  })
})
