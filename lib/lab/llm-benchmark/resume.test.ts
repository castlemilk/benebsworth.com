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
  return log.path
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
    const path = await writeCompleteLog(dir, 'kimi-k2.7', 'equation-solver')
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
