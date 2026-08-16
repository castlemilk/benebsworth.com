import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { forceSpill, openRunLog, runLogFileName, setRunLogDir } from './runlog'
import {
  ResumeError,
  pairKey,
  planResume,
  readSweepCheckpoints,
  recoverResultFromAggregate,
  resumeRunDir,
} from './resume'
import type { BenchmarkResult } from './types'

// Every fixture here is written by the REAL writer (openRunLog) into a temp
// dir, so the classification is tested against bytes the harness would
// actually produce — a hand-rolled JSONL string would drift the day the
// header or the aggregate shape changes.

const dirs: string[] = []

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'resume-test-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  setRunLogDir(undefined)
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const SNAPSHOT = { iterations: 1, timeoutMs: 1000, maxRetries: 0, bustCache: false }

function sampleResult(modelId: string, taskId: string, output: string): BenchmarkResult & { output: string } {
  return {
    taskId,
    modelId,
    score: 87.5,
    runtimeMs: 1234,
    tokensIn: 100,
    tokensOut: 200,
    costUsd: 0.01,
    iterations: 1,
    iterationsSucceeded: 1,
    status: 'success',
    failureReason: 'none',
    iterationScores: [87.5],
    createdAt: '2026-08-16T00:00:00.000Z',
    source: 'live',
    output,
  }
}

/** A COMPLETE pair: request + clean + a real aggregate event (output spilled). */
async function writeCompleteLog(dir: string, modelId: string, taskId: string, output = 'x'.repeat(20_000)) {
  setRunLogDir(dir)
  const log = openRunLog({ modelId, taskId, configSnapshot: SNAPSHOT })!
  log.append({ type: 'request', iterationIndex: 0, promptHash: 'abc', promptLength: 12 })
  log.append({ type: 'clean', iterationIndex: 0, output })
  const { output: artifact, ...rest } = sampleResult(modelId, taskId, output)
  log.append({
    type: 'aggregate',
    result: { ...rest, output: forceSpill(log.dir, artifact) },
  })
  await log.close()
  return log
}

/**
 * A QUOTA-KILLED pair: a structurally COMPLETE aggregate that recorded nothing,
 * plus the `quota` event stating when the model can run again. This is the shape
 * `runners/provider.ts` writes when the provider trips mid-sweep.
 */
async function writeQuotaKilledLog(
  dir: string,
  modelId: string,
  taskId: string,
  quotaNextResetAt = '2026-08-17T04:00:00.000Z'
) {
  setRunLogDir(dir)
  const log = openRunLog({ modelId, taskId, configSnapshot: SNAPSHOT })!
  log.append({ type: 'request', iterationIndex: 0, promptHash: 'abc', promptLength: 12 })
  log.append({
    type: 'failure',
    iterationIndex: 0,
    error: 'quota exceeded',
    failureReason: 'quota_exhausted',
    timedOut: false,
  })
  log.append({ type: 'quota', iterationIndex: 0, quotaNextResetAt })
  const { output: _artifact, ...rest } = sampleResult(modelId, taskId, '')
  log.append({
    type: 'aggregate',
    result: { ...rest, score: 0, status: 'fail', failureReason: 'quota_exhausted', iterationsSucceeded: 0 },
  })
  await log.close()
  return log
}

/** An INCOMPLETE pair: events, no aggregate (a mid-iteration kill). */
async function writeIncompleteLog(dir: string, modelId: string, taskId: string) {
  setRunLogDir(dir)
  const log = openRunLog({ modelId, taskId, configSnapshot: SNAPSHOT })!
  log.append({ type: 'request', iterationIndex: 0, promptHash: 'abc', promptLength: 12 })
  log.append({ type: 'response', iterationIndex: 0, rawOutput: 'hi', tokensIn: 1, tokensOut: 1, runtimeMs: 5, cacheHit: false })
  await log.close()
  return log.path
}

describe('resumeRunDir', () => {
  it('joins a plain run id under the sweeps dir', () => {
    expect(resumeRunDir('/repo/sweeps', '2026-08-16T09-30-12')).toBe('/repo/sweeps/2026-08-16T09-30-12')
  })

  it('rejects anything that is not a single directory name', () => {
    // The sweep ROOT is derived from this, and the run log + CLI scratch dirs
    // write into it — `..` must never point that outside sweeps/.
    for (const bad of ['', '.', '..', '../..', 'a/b', 'a\\b', '/abs']) {
      try {
        resumeRunDir('/repo/sweeps', bad)
        expect.unreachable(`should have rejected ${JSON.stringify(bad)}`)
      } catch (err) {
        expect((err as ResumeError).code).toBe('RESUME_TARGET_NOT_FOUND')
      }
    }
  })
})

describe('readSweepCheckpoints', () => {
  it('throws RESUME_TARGET_NOT_FOUND for a run dir that does not exist', () => {
    const dir = tempDir()
    try {
      readSweepCheckpoints(join(dir, 'nope'))
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ResumeError)
      expect((err as ResumeError).code).toBe('RESUME_TARGET_NOT_FOUND')
    }
  })

  it('throws RESUME_NO_CHECKPOINTS for a dir with no run logs at all', () => {
    const dir = tempDir()
    expect(() => readSweepCheckpoints(dir)).toThrow(/RESUME_NO_CHECKPOINTS|no run logs/i)
  })

  it('throws RESUME_NO_CHECKPOINTS when every log has an unreadable header', () => {
    const dir = tempDir()
    writeFileSync(join(dir, 'a-b.jsonl'), 'not json\n')
    writeFileSync(join(dir, 'c-d.jsonl'), '{"type":"response"}\n')
    try {
      readSweepCheckpoints(dir)
      expect.unreachable('should have thrown')
    } catch (err) {
      expect((err as ResumeError).code).toBe('RESUME_NO_CHECKPOINTS')
    }
  })

  it('classifies a completed pair from its aggregate event, reading ids from the HEADER', async () => {
    const dir = tempDir()
    // Both ids contain hyphens: parsing the pair out of the filename is
    // ambiguous, which is exactly why the header is the source of truth.
    await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
    const checkpoints = readSweepCheckpoints(dir)
    expect(checkpoints).toHaveLength(1)
    expect(checkpoints[0].modelId).toBe('kimi-k2.7')
    expect(checkpoints[0].taskId).toBe('equation-solver')
    expect(checkpoints[0].complete).toBe(true)
    expect(checkpoints[0].aggregate).toMatchObject({ score: 87.5, status: 'success' })
    expect(checkpoints[0].file).toBe(runLogFileName('kimi-k2.7', 'equation-solver'))
  })

  it('classifies a log with no aggregate as incomplete, keeping its event count', async () => {
    const dir = tempDir()
    await writeIncompleteLog(dir, 'kimi-k2.7', 'landing-page')
    const [checkpoint] = readSweepCheckpoints(dir)
    expect(checkpoint.complete).toBe(false)
    expect(checkpoint.events).toBe(2)
    expect(checkpoint.aggregate).toBeUndefined()
  })

  it('treats a log truncated mid-aggregate (killed sweep) as incomplete', async () => {
    const dir = tempDir()
    const { path } = await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
    const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean)
    // Chop the aggregate line in half — the reader keeps the complete prefix.
    writeFileSync(path, lines.slice(0, -1).join('\n') + '\n' + lines.at(-1)!.slice(0, 40))
    const [checkpoint] = readSweepCheckpoints(dir)
    expect(checkpoint.complete).toBe(false)
    expect(checkpoint.events).toBe(2)
  })

  it('records an unreadable header rather than throwing, when other logs are readable', async () => {
    const dir = tempDir()
    await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
    writeFileSync(join(dir, runLogFileName('gpt-5', 'landing-page')), '{"nope":1}\n')
    const checkpoints = readSweepCheckpoints(dir)
    expect(checkpoints).toHaveLength(2)
    const broken = checkpoints.find((c) => c.file.startsWith('gpt-5'))!
    expect(broken.headerError).toBeTruthy()
    expect(broken.complete).toBe(false)
    expect(broken.modelId).toBeUndefined()
  })

  it('ignores non-.jsonl entries (the spill store lives in the same dir)', async () => {
    const dir = tempDir()
    await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
    expect(readSweepCheckpoints(dir).map((c) => c.file)).toEqual([
      runLogFileName('kimi-k2.7', 'equation-solver'),
    ])
  })
})

describe('planResume', () => {
  const base = {
    modelIds: ['kimi-k2.7'],
    taskIds: ['equation-solver', 'landing-page'],
    recorded: [{ modelId: 'kimi-k2.7', taskId: 'equation-solver' }],
    runId: 'demo',
  }

  it('skips a pair with an aggregate and re-runs one without (the two-pair sweep)', async () => {
    const dir = tempDir()
    await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
    await writeIncompleteLog(dir, 'kimi-k2.7', 'landing-page')

    const plan = planResume({ ...base, checkpoints: readSweepCheckpoints(dir) })
    expect(plan.skipped).toEqual([
      expect.objectContaining({ modelId: 'kimi-k2.7', taskId: 'equation-solver' }),
    ])
    expect(plan.rerun).toEqual([
      expect.objectContaining({ modelId: 'kimi-k2.7', taskId: 'landing-page', reason: 'incomplete', events: 2 }),
    ])
    expect(plan.recover).toEqual([])
    expect(plan.skipKeys.has(pairKey('kimi-k2.7', 'equation-solver'))).toBe(true)
    expect(plan.skipKeys.has(pairKey('kimi-k2.7', 'landing-page'))).toBe(false)
  })

  it('re-runs a pair the target sweep never reached (no log at all)', async () => {
    const dir = tempDir()
    await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
    const plan = planResume({ ...base, checkpoints: readSweepCheckpoints(dir) })
    expect(plan.rerun).toEqual([
      expect.objectContaining({ taskId: 'landing-page', reason: 'no-checkpoint', events: 0 }),
    ])
  })

  it('counts an unreadable header as incomplete, attributed by expected filename', async () => {
    const dir = tempDir()
    await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
    writeFileSync(join(dir, runLogFileName('kimi-k2.7', 'landing-page')), 'garbage\n')
    const plan = planResume({ ...base, checkpoints: readSweepCheckpoints(dir) })
    expect(plan.rerun).toEqual([
      expect.objectContaining({ taskId: 'landing-page', reason: 'unreadable-header' }),
    ])
  })

  it('marks a complete pair ABSENT from results.json for recovery', async () => {
    const dir = tempDir()
    await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
    await writeCompleteLog(dir, 'kimi-k2.7', 'landing-page')
    // results.json only has the first pair — the crash window between the
    // aggregate flush and writeResults.
    const plan = planResume({ ...base, checkpoints: readSweepCheckpoints(dir) })
    expect(plan.skipped).toHaveLength(2)
    expect(plan.recover).toEqual([
      expect.objectContaining({ modelId: 'kimi-k2.7', taskId: 'landing-page' }),
    ])
    expect(plan.recover[0].aggregate).toMatchObject({ score: 87.5 })
  })

  it('bust-cache overrides every skip: nothing is skipped, nothing recovered', async () => {
    const dir = tempDir()
    await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
    await writeCompleteLog(dir, 'kimi-k2.7', 'landing-page')
    const plan = planResume({ ...base, checkpoints: readSweepCheckpoints(dir), bustCache: true })
    expect(plan.bustCacheOverride).toBe(true)
    expect(plan.overriddenSkips).toBe(2)
    expect(plan.skipped).toEqual([])
    expect(plan.recover).toEqual([])
    expect(plan.rerun.map((r) => r.reason)).toEqual(['bust-cache', 'bust-cache'])
    expect(plan.skipKeys.size).toBe(0)
  })

  it('re-runs a pair whose aggregate recorded 0 successes (the quota-killed pair)', async () => {
    // The regression: `complete: aggregate !== undefined` counted a quota trip
    // as done, so a resumed sweep re-ran everything EXCEPT the pair the quota
    // killed — the one pair the operator resumed FOR.
    const dir = tempDir()
    await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
    await writeQuotaKilledLog(dir, 'kimi-k2.7', 'landing-page')

    const plan = planResume({ ...base, checkpoints: readSweepCheckpoints(dir) })
    expect(plan.rerun).toEqual([
      expect.objectContaining({ modelId: 'kimi-k2.7', taskId: 'landing-page', reason: 'failed' }),
    ])
    expect(plan.skipped.map((s) => s.taskId)).toEqual(['equation-solver'])
    expect(plan.skipKeys.has(pairKey('kimi-k2.7', 'landing-page'))).toBe(false)
    // …and it is recovered too, because results.json has no record for it: a
    // fail record (carrying the quota window) beats a hole, and the rerun's own
    // merge lands afterwards and replaces it if it succeeds.
    expect(plan.recover).toEqual([
      expect.objectContaining({
        taskId: 'landing-page',
        reason: 'absent',
        quotaNextResetAt: '2026-08-17T04:00:00.000Z',
      }),
    ])
  })

  it('does not recover a 0-success aggregate over an existing record', async () => {
    const dir = tempDir()
    await writeQuotaKilledLog(dir, 'kimi-k2.7', 'equation-solver')
    const plan = planResume({
      ...base,
      taskIds: ['equation-solver'],
      checkpoints: readSweepCheckpoints(dir),
    })
    expect(plan.rerun.map((r) => r.reason)).toEqual(['failed'])
    expect(plan.recover).toEqual([])
  })

  it('treats a timeout aggregate with no iterationsSucceeded field as failed', () => {
    // Older records omit `iterationsSucceeded` entirely — its ABSENCE must not
    // read as zero, but `status` still answers the question.
    const checkpoint = {
      file: runLogFileName('kimi-k2.7', 'equation-solver'),
      modelId: 'kimi-k2.7',
      taskId: 'equation-solver',
      events: 3,
      complete: true,
      aggregate: { taskId: 'equation-solver', modelId: 'kimi-k2.7', status: 'timeout' },
    }
    const plan = planResume({ ...base, taskIds: ['equation-solver'], checkpoints: [checkpoint] })
    expect(plan.rerun.map((r) => r.reason)).toEqual(['failed'])

    // …and a 'partial' aggregate with no counter is still a real result.
    const partial = planResume({
      ...base,
      taskIds: ['equation-solver'],
      checkpoints: [{ ...checkpoint, aggregate: { status: 'partial' } }],
    })
    expect(partial.rerun).toEqual([])
    expect(partial.skipped).toHaveLength(1)
  })

  it('skips (and does not recover) a successful aggregate already recorded for this run', async () => {
    // Behaviour lock: the ordinary resume path must stay a pure no-op.
    const dir = tempDir()
    const log = await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
    const plan = planResume({
      ...base,
      taskIds: ['equation-solver'],
      checkpoints: readSweepCheckpoints(dir),
      recorded: [
        {
          modelId: 'kimi-k2.7',
          taskId: 'equation-solver',
          createdAt: '2026-08-16T00:00:00.000Z',
          runLogRef: { runId: log.runId, file: log.file },
        },
      ],
    })
    expect(plan.skipped).toHaveLength(1)
    expect(plan.rerun).toEqual([])
    expect(plan.recover).toEqual([])
  })

  it('recovers when results.json holds a record from an OLDER run (re-swept pair)', async () => {
    // The pair was swept before, then swept again; the newer aggregate never
    // reached results.json. A key-presence test sees "recorded" and recovers
    // nothing, so the paid result rots in the log.
    const dir = tempDir()
    const log = await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
    const plan = planResume({
      ...base,
      taskIds: ['equation-solver'],
      checkpoints: readSweepCheckpoints(dir),
      recorded: [
        {
          modelId: 'kimi-k2.7',
          taskId: 'equation-solver',
          createdAt: '2026-01-01T00:00:00.000Z',
          runLogRef: { runId: 'an-older-run', file: log.file },
        },
      ],
    })
    expect(plan.skipped).toHaveLength(1)
    expect(plan.recover).toEqual([
      expect.objectContaining({ taskId: 'equation-solver', reason: 'stale' }),
    ])
  })

  it('falls back to createdAt for a record with no runLogRef at all', async () => {
    const dir = tempDir()
    await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
    const older = planResume({
      ...base,
      taskIds: ['equation-solver'],
      checkpoints: readSweepCheckpoints(dir),
      recorded: [{ modelId: 'kimi-k2.7', taskId: 'equation-solver', createdAt: '2020-01-01T00:00:00.000Z' }],
    })
    expect(older.recover).toEqual([
      expect.objectContaining({ taskId: 'equation-solver', reason: 'stale' }),
    ])

    // A record NEWER than the log is not stale, and an unparsable one is
    // "cannot tell" — which must resolve to leaving the record alone.
    const newer = planResume({
      ...base,
      taskIds: ['equation-solver'],
      checkpoints: readSweepCheckpoints(dir),
      recorded: [{ modelId: 'kimi-k2.7', taskId: 'equation-solver', createdAt: '2099-01-01T00:00:00.000Z' }],
    })
    expect(newer.recover).toEqual([])
    const unknown = planResume({
      ...base,
      taskIds: ['equation-solver'],
      checkpoints: readSweepCheckpoints(dir),
      recorded: [{ modelId: 'kimi-k2.7', taskId: 'equation-solver' }],
    })
    expect(unknown.recover).toEqual([])
  })

  it('never skips a pair outside the requested model/task set', async () => {
    const dir = tempDir()
    await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
    await writeCompleteLog(dir, 'gpt-5', 'equation-solver')
    const plan = planResume({ ...base, checkpoints: readSweepCheckpoints(dir), taskIds: ['equation-solver'] })
    expect(plan.skipped).toHaveLength(1)
    expect(plan.skipped[0].modelId).toBe('kimi-k2.7')
  })
})

describe('recoverResultFromAggregate', () => {
  it('round-trips a recovered record, resolving the spilled output', async () => {
    const dir = tempDir()
    const output = 'y'.repeat(30_000)
    await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver', output)
    const [checkpoint] = readSweepCheckpoints(dir)
    const recovered = recoverResultFromAggregate(dir, checkpoint.aggregate!)
    expect(recovered.modelId).toBe('kimi-k2.7')
    expect(recovered.taskId).toBe('equation-solver')
    expect(recovered.score).toBe(87.5)
    expect(recovered.status).toBe('success')
    expect(recovered.iterationsSucceeded).toBe(1)
    expect(recovered.output).toBe(output)
    expect(recovered.source).toBe('live')
  })

  it('falls back to the preview (and warns) when the spill file is gone', async () => {
    const dir = tempDir()
    const output = 'z'.repeat(30_000)
    await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver', output)
    const [checkpoint] = readSweepCheckpoints(dir)
    rmSync(join(dir, 'spill'), { recursive: true, force: true })
    const warnings: string[] = []
    const recovered = recoverResultFromAggregate(dir, checkpoint.aggregate!, (w) => warnings.push(w))
    expect(recovered.output.length).toBeGreaterThan(0)
    expect(recovered.output.length).toBeLessThan(output.length)
    expect(warnings.join(' ')).toMatch(/spill/i)
  })

  it("stamps the log's quota window onto the recovered record", async () => {
    // The runner POST-stamps `quotaNextResetAt` onto the returned result, after
    // the aggregate event is written — so the aggregate never carries it, and a
    // recovered quota failure without it is invisible to the next sweep's
    // quota pre-flight. The `quota` event is the only surviving statement.
    const dir = tempDir()
    await writeQuotaKilledLog(dir, 'kimi-k2.7', 'equation-solver', '2026-08-17T04:00:00.000Z')
    const [checkpoint] = readSweepCheckpoints(dir)
    expect(checkpoint.quotaNextResetAt).toBe('2026-08-17T04:00:00.000Z')
    expect(checkpoint.aggregate!.quotaNextResetAt).toBeUndefined()

    const recovered = recoverResultFromAggregate(dir, checkpoint.aggregate!, () => {}, {
      quotaNextResetAt: checkpoint.quotaNextResetAt,
    })
    expect(recovered.quotaNextResetAt).toBe('2026-08-17T04:00:00.000Z')
    expect(recovered.status).toBe('fail')

    // A log with no quota event leaves the field absent rather than inventing one.
    const clean = await writeCompleteLog(dir, 'kimi-k2.7', 'landing-page')
    const withoutQuota = readSweepCheckpoints(dir).find((c) => c.file === clean.file)!
    expect(withoutQuota.quotaNextResetAt).toBeUndefined()
    expect(
      recoverResultFromAggregate(dir, withoutQuota.aggregate!, () => {}, {
        quotaNextResetAt: withoutQuota.quotaNextResetAt,
      }).quotaNextResetAt
    ).toBeUndefined()
  })

  it('handles an aggregate with a small inline output and one with none', async () => {
    const dir = tempDir()
    const inline = recoverResultFromAggregate(dir, { ...sampleResult('m', 't', 'small') })
    expect(inline.output).toBe('small')
    // An aggregate for an all-failed pair carries no `output` key at all.
    const noOutput: Record<string, unknown> = { ...sampleResult('m', 't', '') }
    delete noOutput.output
    expect(recoverResultFromAggregate(dir, noOutput).output).toBe('')
  })
})
