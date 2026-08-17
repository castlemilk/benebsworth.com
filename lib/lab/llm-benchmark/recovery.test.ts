import { describe, it, expect, afterEach } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { forceSpill, openRunLog, runLogFileName, setRunLogDir } from './runlog'
import {
  RecoveryLockError,
  acquireRecoveryLock,
  listSweepRunDirs,
  recoveryPlan,
} from './recovery'
import type { BenchmarkResult } from './types'

// Fixtures are written by the REAL run-log writer into temp sweep trees, the
// same discipline as resume.test.ts: the monitor's verdicts are only worth
// anything if they are computed from bytes the harness actually produces.

const dirs: string[] = []

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'recovery-test-'))
  dirs.push(dir)
  return dir
}

/** A `sweeps/` root with `<run-id>/` children, ready for `listSweepRunDirs`. */
function tempSweeps(...runIds: string[]): { sweepsDir: string; runDirs: string[] } {
  const sweepsDir = tempDir()
  const runDirs = runIds.map((id) => {
    const dir = join(sweepsDir, id)
    mkdirSync(dir, { recursive: true })
    return dir
  })
  return { sweepsDir, runDirs }
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

async function writeCompleteLog(dir: string, modelId: string, taskId: string) {
  setRunLogDir(dir)
  const log = openRunLog({ modelId, taskId, configSnapshot: SNAPSHOT })!
  log.append({ type: 'request', iterationIndex: 0, promptHash: 'abc', promptLength: 12 })
  const { output: artifact, ...rest } = sampleResult(modelId, taskId, 'x'.repeat(20_000))
  log.append({ type: 'aggregate', result: { ...rest, output: forceSpill(log.dir, artifact) } })
  await log.close()
}

/** A structurally complete aggregate that recorded NOTHING — the quota trip. */
async function writeQuotaKilledLog(
  dir: string,
  modelId: string,
  taskId: string,
  quotaNextResetAt = '2026-08-17T04:00:00.000Z'
) {
  setRunLogDir(dir)
  const log = openRunLog({ modelId, taskId, configSnapshot: SNAPSHOT })!
  log.append({ type: 'request', iterationIndex: 0, promptHash: 'abc', promptLength: 12 })
  log.append({ type: 'quota', iterationIndex: 0, quotaNextResetAt })
  const { output: _artifact, ...rest } = sampleResult(modelId, taskId, '')
  log.append({
    type: 'aggregate',
    result: { ...rest, score: 0, status: 'fail', failureReason: 'quota_exhausted', iterationsSucceeded: 0 },
  })
  await log.close()
}

/** Events, no aggregate: a mid-iteration kill. */
async function writeIncompleteLog(dir: string, modelId: string, taskId: string) {
  setRunLogDir(dir)
  const log = openRunLog({ modelId, taskId, configSnapshot: SNAPSHOT })!
  log.append({ type: 'request', iterationIndex: 0, promptHash: 'abc', promptLength: 12 })
  await log.close()
}

/** A results.json record stamping a quota window on one model. */
function quotaRecord(modelId: string, taskId: string, quotaNextResetAt: string): BenchmarkResult {
  const { output: _output, ...rest } = sampleResult(modelId, taskId, '')
  return { ...rest, score: 0, status: 'fail', failureReason: 'quota_exhausted', iterationsSucceeded: 0, quotaNextResetAt }
}

const NOW = new Date('2026-08-17T00:00:00.000Z')
const FUTURE = '2026-08-17T06:00:00.000Z'
const PAST = '2026-08-16T06:00:00.000Z'

describe('listSweepRunDirs', () => {
  it('lists run directories newest-first and ignores files', () => {
    const { sweepsDir } = tempSweeps('2026-08-15T10-00-00', '2026-08-16T09-30-12')
    writeFileSync(join(sweepsDir, '.recovery.lock'), '123\n')
    writeFileSync(join(sweepsDir, 'recovery.log'), 'noise\n')
    expect(listSweepRunDirs(sweepsDir).map((d) => d.runId)).toEqual([
      '2026-08-16T09-30-12',
      '2026-08-15T10-00-00',
    ])
  })

  it('returns nothing for a missing sweeps dir rather than throwing', () => {
    expect(listSweepRunDirs(join(tempDir(), 'nope'))).toEqual([])
  })
})

describe('recoveryPlan', () => {
  it('prunes a run whose every pair is complete', async () => {
    const { sweepsDir, runDirs } = tempSweeps('2026-08-16T09-30-12')
    await writeCompleteLog(runDirs[0], 'kimi-k2.7', 'equation-solver')
    await writeCompleteLog(runDirs[0], 'kimi-k2.7', 'landing-page')

    const plan = recoveryPlan({ sweepDirs: listSweepRunDirs(sweepsDir), results: [], now: NOW })
    expect(plan.candidates).toHaveLength(1)
    expect(plan.candidates[0].verdict).toBe('complete')
    expect(plan.candidates[0].pending).toEqual([])
    expect(plan.resumable).toEqual([])
    expect(plan.waiting).toEqual([])
  })

  it('resumes a run with an incomplete pair whose model is not locked', async () => {
    const { sweepsDir, runDirs } = tempSweeps('2026-08-16T09-30-12')
    await writeCompleteLog(runDirs[0], 'kimi-k2.7', 'equation-solver')
    await writeIncompleteLog(runDirs[0], 'kimi-k2.7', 'landing-page')

    const plan = recoveryPlan({ sweepDirs: listSweepRunDirs(sweepsDir), results: [], now: NOW })
    const [candidate] = plan.candidates
    expect(candidate.verdict).toBe('resume')
    expect(candidate.runId).toBe('2026-08-16T09-30-12')
    expect(candidate.pending).toEqual([
      expect.objectContaining({ modelId: 'kimi-k2.7', taskId: 'landing-page', reason: 'incomplete' }),
    ])
    expect(candidate.runnable).toEqual(['kimi-k2.7'])
    expect(candidate.locks).toEqual([])
    expect(plan.resumable).toEqual([candidate])
  })

  it('counts a 0-success aggregate as pending (planResume "failed"), not as done', async () => {
    const { sweepsDir, runDirs } = tempSweeps('2026-08-16T09-30-12')
    await writeQuotaKilledLog(runDirs[0], 'kimi-k2.7', 'landing-page')

    const plan = recoveryPlan({ sweepDirs: listSweepRunDirs(sweepsDir), results: [], now: NOW })
    expect(plan.candidates[0].pending).toEqual([
      expect.objectContaining({ taskId: 'landing-page', reason: 'failed' }),
    ])
    // No record in results.json => nothing states a lock => runnable now.
    expect(plan.candidates[0].verdict).toBe('resume')
  })

  it('waits when a pending pair’s model is still quota-locked, reporting the until', async () => {
    const { sweepsDir, runDirs } = tempSweeps('2026-08-16T09-30-12')
    await writeQuotaKilledLog(runDirs[0], 'kimi-k2.7', 'landing-page', FUTURE)

    const plan = recoveryPlan({
      sweepDirs: listSweepRunDirs(sweepsDir),
      results: [quotaRecord('kimi-k2.7', 'landing-page', FUTURE)],
      now: NOW,
    })
    const [candidate] = plan.candidates
    expect(candidate.verdict).toBe('wait')
    expect(candidate.until).toBe(FUTURE)
    expect(candidate.locks).toEqual([{ modelId: 'kimi-k2.7', until: FUTURE }])
    expect(plan.resumable).toEqual([])
    expect(plan.nextResumeAt).toBe(FUTURE)
  })

  it('resumes once the stamped window is in the past', async () => {
    const { sweepsDir, runDirs } = tempSweeps('2026-08-16T09-30-12')
    await writeQuotaKilledLog(runDirs[0], 'kimi-k2.7', 'landing-page', PAST)

    const plan = recoveryPlan({
      sweepDirs: listSweepRunDirs(sweepsDir),
      results: [quotaRecord('kimi-k2.7', 'landing-page', PAST)],
      now: NOW,
    })
    expect(plan.candidates[0].verdict).toBe('resume')
    expect(plan.nextResumeAt).toBeUndefined()
  })

  it('waits on a MIXED run: one pending model locked, one free (a resume runs both)', async () => {
    const { sweepsDir, runDirs } = tempSweeps('2026-08-16T09-30-12')
    await writeIncompleteLog(runDirs[0], 'kimi-k2.7', 'landing-page')
    await writeQuotaKilledLog(runDirs[0], 'gpt-5', 'landing-page', FUTURE)

    const plan = recoveryPlan({
      sweepDirs: listSweepRunDirs(sweepsDir),
      results: [quotaRecord('gpt-5', 'landing-page', FUTURE)],
      now: NOW,
    })
    const [candidate] = plan.candidates
    expect(candidate.verdict).toBe('wait')
    expect(candidate.until).toBe(FUTURE)
    expect(candidate.locks.map((l) => l.modelId)).toEqual(['gpt-5'])
    expect(candidate.runnable).toEqual(['kimi-k2.7'])
  })

  it('ignores a lock on a model with nothing pending in that run', async () => {
    const { sweepsDir, runDirs } = tempSweeps('2026-08-16T09-30-12')
    await writeCompleteLog(runDirs[0], 'gpt-5', 'landing-page')
    await writeIncompleteLog(runDirs[0], 'kimi-k2.7', 'landing-page')

    const plan = recoveryPlan({
      sweepDirs: listSweepRunDirs(sweepsDir),
      results: [quotaRecord('gpt-5', 'landing-page', FUTURE)],
      now: NOW,
    })
    expect(plan.candidates[0].verdict).toBe('resume')
  })

  it('carries the resume shape (models x tasks from the headers) for the child sweep', async () => {
    const { sweepsDir, runDirs } = tempSweeps('2026-08-16T09-30-12')
    await writeCompleteLog(runDirs[0], 'kimi-k2.7', 'equation-solver')
    await writeIncompleteLog(runDirs[0], 'gpt-5', 'landing-page')

    const [candidate] = recoveryPlan({
      sweepDirs: listSweepRunDirs(sweepsDir),
      results: [],
      now: NOW,
    }).candidates
    expect(candidate.modelIds).toEqual(['gpt-5', 'kimi-k2.7'])
    expect(candidate.taskIds).toEqual(['equation-solver', 'landing-page'])
    // The cross product includes pairs the sweep never reached — planResume
    // calls those 'no-checkpoint', and a resume would run them.
    expect(candidate.pending.map((p) => `${p.modelId}|${p.taskId}|${p.reason}`).sort()).toEqual([
      'gpt-5|equation-solver|no-checkpoint',
      'gpt-5|landing-page|incomplete',
      'kimi-k2.7|landing-page|no-checkpoint',
    ])
  })

  it('reports an unreadable run dir instead of counting it as a candidate', () => {
    const { sweepsDir } = tempSweeps('2026-08-16T09-30-12')
    const plan = recoveryPlan({ sweepDirs: listSweepRunDirs(sweepsDir), results: [], now: NOW })
    expect(plan.candidates).toEqual([])
    expect(plan.unreadable).toEqual([
      expect.objectContaining({ runId: '2026-08-16T09-30-12', code: 'RESUME_NO_CHECKPOINTS' }),
    ])
  })

  it('orders candidates newest-first and reports the earliest lock as nextResumeAt', async () => {
    const { sweepsDir, runDirs } = tempSweeps('2026-08-15T10-00-00', '2026-08-16T09-30-12')
    await writeQuotaKilledLog(runDirs[0], 'gpt-5', 'landing-page', '2026-08-17T02:00:00.000Z')
    await writeQuotaKilledLog(runDirs[1], 'kimi-k2.7', 'landing-page', FUTURE)

    const plan = recoveryPlan({
      sweepDirs: listSweepRunDirs(sweepsDir),
      results: [
        quotaRecord('gpt-5', 'landing-page', '2026-08-17T02:00:00.000Z'),
        quotaRecord('kimi-k2.7', 'landing-page', FUTURE),
      ],
      now: NOW,
    })
    expect(plan.candidates.map((c) => c.runId)).toEqual(['2026-08-16T09-30-12', '2026-08-15T10-00-00'])
    expect(plan.waiting).toHaveLength(2)
    expect(plan.nextResumeAt).toBe('2026-08-17T02:00:00.000Z')
  })

  it('is done when every candidate is complete', async () => {
    const { sweepsDir, runDirs } = tempSweeps('2026-08-16T09-30-12')
    await writeCompleteLog(runDirs[0], 'kimi-k2.7', 'equation-solver')
    expect(recoveryPlan({ sweepDirs: listSweepRunDirs(sweepsDir), results: [], now: NOW }).done).toBe(true)
  })

  it('is not done while anything is waiting or resumable', async () => {
    const { sweepsDir, runDirs } = tempSweeps('2026-08-16T09-30-12')
    await writeIncompleteLog(runDirs[0], 'kimi-k2.7', 'landing-page')
    expect(recoveryPlan({ sweepDirs: listSweepRunDirs(sweepsDir), results: [], now: NOW }).done).toBe(false)
  })
})

describe('acquireRecoveryLock', () => {
  it('writes the holder pid and releases by deleting the file', () => {
    const path = join(tempDir(), '.recovery.lock')
    const lock = acquireRecoveryLock(path, { pid: 4242 })
    expect(readFileSync(path, 'utf8').trim()).toBe('4242')
    lock.release()
    expect(existsSync(path)).toBe(false)
  })

  it('refuses when a LIVE pid holds it', () => {
    const path = join(tempDir(), '.recovery.lock')
    acquireRecoveryLock(path, { pid: 4242, isAlive: () => true })
    try {
      acquireRecoveryLock(path, { pid: 99, isAlive: () => true })
      expect.unreachable('should have refused')
    } catch (err) {
      expect(err).toBeInstanceOf(RecoveryLockError)
      expect((err as RecoveryLockError).code).toBe('RECOVERY_LOCK_HELD')
      expect((err as RecoveryLockError).holderPid).toBe(4242)
    }
  })

  it('takes over a STALE lock (holder pid is gone)', () => {
    const path = join(tempDir(), '.recovery.lock')
    writeFileSync(path, '4242\n')
    const lock = acquireRecoveryLock(path, { pid: 99, isAlive: () => false })
    expect(readFileSync(path, 'utf8').trim()).toBe('99')
    lock.release()
  })

  it('takes over a lock file whose contents are not a pid', () => {
    const path = join(tempDir(), '.recovery.lock')
    writeFileSync(path, 'who knows\n')
    const lock = acquireRecoveryLock(path, { pid: 99, isAlive: () => true })
    expect(readFileSync(path, 'utf8').trim()).toBe('99')
    lock.release()
  })

  it('release is idempotent and never deletes another holder’s lock', () => {
    const path = join(tempDir(), '.recovery.lock')
    const lock = acquireRecoveryLock(path, { pid: 4242, isAlive: () => false })
    lock.release()
    writeFileSync(path, '777\n') // someone else took over
    lock.release()
    expect(readFileSync(path, 'utf8').trim()).toBe('777')
  })

  it('probes liveness for real by default (this very process holds it)', () => {
    // Holder = the test process, claimant = some OTHER pid. The default
    // `process.kill(pid, 0)` probe must see the holder as alive and refuse.
    const path = join(tempDir(), '.recovery.lock')
    writeFileSync(path, `${process.pid}\n`)
    expect(() => acquireRecoveryLock(path, { pid: process.pid + 1 })).toThrow(RecoveryLockError)
  })

  it('is re-entrant for the SAME pid (a monitor re-acquiring its own lock)', () => {
    const path = join(tempDir(), '.recovery.lock')
    acquireRecoveryLock(path, { pid: 4242, isAlive: () => true })
    expect(() => acquireRecoveryLock(path, { pid: 4242, isAlive: () => true })).not.toThrow()
  })
})
