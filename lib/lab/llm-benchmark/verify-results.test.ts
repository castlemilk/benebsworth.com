import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { openRunLog, readRunLog, setRunLogDir } from './runlog'
import type { ProvenanceEntry } from './failure-corpus'
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

describe('telemetry sanity', () => {
  it('skips a record written before telemetry existed', () => {
    expect(of(verifyResults([goodRecord()]), 'telemetry-sanity')[0].level).toBe('skip')
  })

  it('passes counters-only telemetry (0 is a fact, absence is the measurement signal)', () => {
    const record = goodRecord({ telemetry: { cacheHits: 0, retries: 0 } })
    expect(of(verifyResults([record]), 'telemetry-sanity')[0].level).toBe('pass')
  })

  it('passes a fully-measured roll-up', () => {
    const record = goodRecord({
      telemetry: { meanTtftMs: 420, meanTokensPerSec: 33.5, rateKind: 'decode', cacheHits: 1, retries: 2 },
    })
    expect(of(verifyResults([record]), 'telemetry-sanity')[0].level).toBe('pass')
  })

  it('fails a placeholder 0 meanTtftMs (physically impossible, reads as the fastest model)', () => {
    const record = goodRecord({ telemetry: { meanTtftMs: 0, cacheHits: 0, retries: 0 } })
    const verdict = of(verifyResults([record]), 'telemetry-sanity')[0]
    expect(verdict.level).toBe('fail')
    expect(verdict.detail).toContain('meanTtftMs 0')
  })

  it('fails a rate with no rateKind (decode and wall-clock are not comparable)', () => {
    const record = goodRecord({ telemetry: { meanTokensPerSec: 33.5, cacheHits: 0, retries: 0 } })
    expect(of(verifyResults([record]), 'telemetry-sanity')[0].level).toBe('fail')
  })
})

describe('usage sanity', () => {
  it('skips a record written before the usage summary existed', () => {
    expect(of(verifyResults([goodRecord()]), 'usage-sanity')[0].level).toBe('skip')
  })

  it('passes a summary that agrees with the flat token fields', () => {
    const record = goodRecord({ usage: { inputTokens: 10, outputTokens: 20, source: 'mixed' } })
    expect(of(verifyResults([record]), 'usage-sanity')[0].level).toBe('pass')
  })

  it('fails a summary that disagrees with the tokens displayed beside it', () => {
    const record = goodRecord({ usage: { inputTokens: 10, outputTokens: 999, source: 'reported' } })
    const verdict = of(verifyResults([record]), 'usage-sanity')[0]
    expect(verdict.level).toBe('fail')
    expect(verdict.detail).toContain('10/999')
  })

  it('fails a source outside the vocabulary (the honesty field must stay readable)', () => {
    const record = goodRecord({
      usage: { inputTokens: 10, outputTokens: 20, source: 'guessed' as never },
    })
    expect(of(verifyResults([record]), 'usage-sanity')[0].level).toBe('fail')
  })
})

describe('budget sanity', () => {
  it('skips every record that never hit a budget cap (i.e. almost all of them)', () => {
    expect(of(verifyResults([goodRecord()]), 'budget-sanity')[0].level).toBe('skip')
  })

  it('passes a stamp whose spend crossed its own cap', () => {
    const record = goodRecord({ costUsd: 0.006, budgetExceeded: { spentUsd: 0.012, capUsd: 0.01 } })
    expect(of(verifyResults([record]), 'budget-sanity')[0].level).toBe('pass')
  })

  it('fails a stamp that never reached its cap — that trip cannot have happened', () => {
    const record = goodRecord({ costUsd: 0.004, budgetExceeded: { spentUsd: 0.004, capUsd: 0.01 } })
    const verdict = of(verifyResults([record]), 'budget-sanity')[0]
    expect(verdict.level).toBe('fail')
    expect(verdict.detail).toContain('0.01')
  })

  it('fails a cap that is not a positive number of dollars', () => {
    expect(
      of(verifyResults([goodRecord({ budgetExceeded: { spentUsd: 1, capUsd: 0 } })]), 'budget-sanity')[0].level
    ).toBe('fail')
    expect(
      of(
        verifyResults([goodRecord({ budgetExceeded: { spentUsd: 1, capUsd: Number.NaN } })]),
        'budget-sanity'
      )[0].level
    ).toBe('fail')
  })

  it('fails a record that claims a budget trip while reporting no spend of its own', () => {
    // The tripping record IS the one that spent: later tasks are skipped
    // without a record at all, so a $0 record carrying the stamp is incoherent.
    const record = goodRecord({ costUsd: 0, budgetExceeded: { spentUsd: 0.012, capUsd: 0.01 } })
    expect(of(verifyResults([record]), 'budget-sanity')[0].level).toBe('fail')
  })

  it('fails a record whose own cost exceeds the sweep total it was measured against', () => {
    const record = goodRecord({ costUsd: 0.5, budgetExceeded: { spentUsd: 0.012, capUsd: 0.01 } })
    expect(of(verifyResults([record]), 'budget-sanity')[0].level).toBe('fail')
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

describe('artifact-integrity (content addressing, #31)', () => {
  const ref = { runId: '2026-08-16T09-30-12', file: 'kimi-k2.7-n-body-field.jsonl' }
  // 'abc' → sha256 ba7816bf8f01cfea…, so this is the honest name for those bytes.
  const SPILL = 'spill/ba7816bf8f01cfea.txt'

  function logWithArtifact(): ReturnType<typeof readRunLog> {
    return fakeLog('kimi-k2.7', 'n-body-field', [
      { type: 'clean', seq: 1, output: { spillRef: SPILL, preview: 'abc', bytes: 3 } },
      { type: 'aggregate', seq: 2, result: { output: { spillRef: SPILL, preview: 'abc', bytes: 3 } } },
    ] as never)
  }

  it('passes when the spill file still hashes to its own name', () => {
    const verdicts = verifyResults([goodRecord({ runLogRef: ref })], {
      runLogs: [log()],
      readLog: logWithArtifact,
      readContent: () => 'abc',
    })
    const seen = of(verdicts, 'artifact-integrity')
    // The clean event and the aggregate reference the SAME blob — that is the
    // dedupe working, and it is verified once.
    expect(seen).toHaveLength(1)
    expect(seen[0].level).toBe('pass')
    expect(seen[0].recordKey).toBe(`${ref.runId}/${SPILL}`)
  })

  it('fails, naming the file, when a byte is flipped in the stored artifact', () => {
    const verdicts = verifyResults([goodRecord({ runLogRef: ref })], {
      runLogs: [log()],
      readLog: logWithArtifact,
      readContent: () => 'abd', // one bit-flip away from what was scored
    })
    const [v] = of(verdicts, 'artifact-integrity')
    expect(v.level).toBe('fail')
    expect(v.recordKey).toBe(`${ref.runId}/${SPILL}`)
    expect(v.detail).toMatch(/ba7816bf8f01cfea/)
    expect(v.detail).toMatch(/not what was scored/)
    expect(v.why).toMatch(/content hash/i)
  })

  it('skips a blob that is not present locally (pruned sweep)', () => {
    const verdicts = verifyResults([goodRecord({ runLogRef: ref })], {
      runLogs: [log()],
      readLog: logWithArtifact,
      readContent: () => undefined,
    })
    const [v] = of(verdicts, 'artifact-integrity')
    expect(v.level).toBe('skip')
    expect(v.detail).toMatch(/not present locally/)
  })

  it('is silently absent with no sweeps tree at all (no reader, no artifacts)', () => {
    const verdicts = verifyResults([goodRecord()], {})
    expect(of(verdicts, 'artifact-integrity')).toEqual([])
  })

  it('verifies retained artifact copies, and skips legacy run-scoped names', () => {
    const verdicts = verifyResults([goodRecord()], {
      artifactFiles: [
        { runId: 'r', file: 'ba7816bf8f01cfea.html' },
        { runId: 'r', file: 'artifact-kimi-k2.7-n-body-field-0.html' },
        { runId: 'r', file: 'index.json' },
      ],
      readContent: () => 'abc',
    })
    const seen = of(verdicts, 'artifact-integrity')
    expect(seen.map((v) => v.level)).toEqual(['pass', 'skip', 'skip'])
    expect(seen[1].detail).toMatch(/not a content-addressed name/)
  })

  it('fails a tampered artifact copy', () => {
    const verdicts = verifyResults([goodRecord()], {
      artifactFiles: [{ runId: 'r', file: 'ba7816bf8f01cfea.html' }],
      readContent: () => '<h1>hand-edited</h1>',
    })
    const [v] = of(verdicts, 'artifact-integrity')
    expect(v.level).toBe('fail')
    expect(v.recordKey).toBe('r/artifacts/ba7816bf8f01cfea.html')
  })

  it('round-trips against a real spill file written by the run log', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const runLog = openRunLog({
      modelId: 'kimi-k2.7',
      taskId: 'n-body-field',
      configSnapshot: { iterations: 2, timeoutMs: 1000, maxRetries: 1, bustCache: false },
    })!
    // Over SPILL_THRESHOLD_BYTES, so the writer content-addresses it for real.
    runLog.append({ type: 'clean', iterationIndex: 0, output: '<h1>x</h1>'.repeat(2000) })
    runLog.append({ type: 'aggregate', result: { score: 90 } })
    await runLog.close()

    const found = { runId: runLog.runId, file: runLog.file, path: runLog.path }
    const readContent = (_runId: string, relPath: string) => readFileSync(join(dir, relPath))
    const verdicts = verifyResults(
      [goodRecord({ runLogRef: { runId: runLog.runId, file: runLog.file } })],
      { runLogs: [found], readLog: readRunLog, readContent }
    )
    const [v] = of(verdicts, 'artifact-integrity')
    expect(v.level).toBe('pass')
    expect(failures(verdicts)).toEqual([])
  })
})

describe('stale-prompt (release gate)', () => {
  // The current bundle, faked so the cases don't have to forge a prompt edit.
  const current = () => 'currentbundle0000'

  it('warns — never fails — on a record scored under an older bundle', () => {
    const verdicts = verifyResults([goodRecord({ promptBundle: 'oldbundle00000000' })], {
      currentPromptBundle: current,
    })
    const [v] = of(verdicts, 'stale-prompt')
    expect(v.level).toBe('warn')
    expect(v.detail).toBe('scored under bundle oldbundle00000000 (current currentbundle0000)')
    // A stale result is still an honest result — only --strict turns this into
    // a release-blocking failure.
    expect(failures(verdicts)).toEqual([])
    expect(v.why).toMatch(/tic-tac-toe|strict/i)
  })

  it('passes a record scored under the current bundle', () => {
    const verdicts = verifyResults([goodRecord({ promptBundle: 'currentbundle0000' })], {
      currentPromptBundle: current,
    })
    expect(of(verdicts, 'stale-prompt')[0].level).toBe('pass')
  })

  it('skips a record with no promptBundle (legacy, not stale)', () => {
    const verdicts = verifyResults([goodRecord()], { currentPromptBundle: current })
    const [v] = of(verdicts, 'stale-prompt')
    expect(v.level).toBe('skip')
    expect(v.detail).toMatch(/^pre-bundle/)
  })

  it('skips rather than warns when the task is not in the registry', () => {
    const verdicts = verifyResults([goodRecord({ promptBundle: 'x'.repeat(16) })], {
      currentPromptBundle: () => undefined,
    })
    expect(of(verdicts, 'stale-prompt')[0].level).toBe('skip')
    expect(verdicts.filter((v) => v.level === 'warn')).toEqual([])
  })

  it('hashes the real registry by default — a stamped record either matches or warns', () => {
    // No injection: exercises the default path (promptBundleHash over
    // BENCHMARK_TASKS) so a broken default can't hide behind the fake.
    const verdicts = verifyResults([goodRecord({ promptBundle: 'definitely-not-it' })])
    const [v] = of(verdicts, 'stale-prompt')
    expect(v.level).toBe('warn')
    expect(v.detail).toMatch(/^scored under bundle definitely-not-it \(current [0-9a-f]{16}\)$/)
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

  it('reports pre-bundle records as ONE count, not one warning each', () => {
    const verdicts = verifyResults([goodRecord(), goodRecord(), goodRecord()])
    const summary = summarizeVerdicts(verdicts, 3)
    expect(summary.preBundleRecords).toBe(3)
    expect(summary.warnings).toBe(0)
    expect(summary.line).toMatch(/3 pre-bundle/)
  })

  it('counts 0 pre-bundle once every record is stamped', () => {
    const stamped = goodRecord({ promptBundle: 'currentbundle0000' })
    const summary = summarizeVerdicts(
      verifyResults([stamped], { currentPromptBundle: () => 'currentbundle0000' }),
      1
    )
    expect(summary.preBundleRecords).toBe(0)
    expect(summary.line).toMatch(/0 pre-bundle/)
  })
})

describe('corpus-provenance (failure regression corpus, #25)', () => {
  function entry(over: Partial<ProvenanceEntry> = {}): ProvenanceEntry {
    return {
      artifact: 'ba7816bf8f01cfea',
      modelId: 'kimi-k2.7',
      taskId: 'n-body-field',
      iterationIndex: 0,
      score: 30,
      failedChecks: ['canvas-advance'],
      sweepRunId: '2026-08-17T06-59-08',
      ingestedAt: '2026-08-17T09:00:00.000Z',
      ...over,
    }
  }

  it('passes a case whose ids resolve and whose artifact is an address', () => {
    const seen = of(verifyResults([goodRecord()], { corpusProvenance: [entry()] }), 'corpus-provenance')
    expect(seen).toHaveLength(1)
    expect(seen[0].level).toBe('pass')
    expect(seen[0].recordKey).toBe('ba7816bf8f01cfea|kimi-k2.7|n-body-field#0')
  })

  it('fails a case whose model was renamed out of the registry', () => {
    const [v] = of(
      verifyResults([goodRecord()], { corpusProvenance: [entry({ modelId: 'kimi-k2.6-retired' })] }),
      'corpus-provenance'
    )
    expect(v.level).toBe('fail')
    expect(v.detail).toMatch(/unknown modelId "kimi-k2.6-retired"/)
  })

  it('fails a case whose task no longer exists', () => {
    const [v] = of(
      verifyResults([goodRecord()], { corpusProvenance: [entry({ taskId: 'deleted-task' })] }),
      'corpus-provenance'
    )
    expect(v.level).toBe('fail')
    expect(v.detail).toMatch(/unknown taskId "deleted-task"/)
  })

  it('fails an artifact that is a filename rather than a bare content address', () => {
    // The corpus stores `<addr>` and appends `.html` itself; a row carrying the
    // filename would name `cases/ba7816bf8f01cfea.html.html`.
    const [v] = of(
      verifyResults([goodRecord()], { corpusProvenance: [entry({ artifact: 'ba7816bf8f01cfea.html' })] }),
      'corpus-provenance'
    )
    expect(v.level).toBe('fail')
    expect(v.detail).toMatch(/is not a content address/)
  })

  it('reports every problem on one row at once', () => {
    const [v] = of(
      verifyResults([goodRecord()], {
        corpusProvenance: [entry({ artifact: 'zzz', modelId: 'nope', taskId: 'nope' })],
      }),
      'corpus-provenance'
    )
    expect(v.detail).toMatch(/content address.*unknown modelId.*unknown taskId/)
  })

  it('is silently absent when no corpus has been ingested', () => {
    expect(of(verifyResults([goodRecord()], {}), 'corpus-provenance')).toEqual([])
  })
})
