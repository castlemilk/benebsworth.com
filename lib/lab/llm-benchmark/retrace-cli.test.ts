import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { contentAddress } from './content-address'

/**
 * `scripts/retrace.mjs --dir` — the flag that makes an exported trace REPLAYABLE.
 *
 * The export README tells a reader to run retrace against the directory they
 * extracted. That promise is only worth making if it is exercised, so this
 * builds an extracted-export-shaped tree (a `<model>-<task>.jsonl`, a `spill/`
 * store, a README.txt that is not a log) and runs the real script over it.
 * Slower than a unit test because it spawns tsx; it is the only thing that
 * proves the documented command works.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const script = join(root, 'scripts/retrace.mjs')
const tsx = join(root, 'node_modules/.bin/tsx')

const SPILL_TEXT = '<!doctype html>\n<title>exported artifact</title>\n'
const SPILL_REF = `spill/${contentAddress(SPILL_TEXT)}.txt`

let dir: string

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'retrace-dir-'))
  const events = [
    {
      type: 'header',
      seq: 0,
      version: 1,
      runId: '2026-08-17T06-34-06',
      modelId: 'gemini-3.6-flash',
      taskId: 'tic-tac-toe',
      createdAt: '2026-08-17T06:34:06.000Z',
      configSnapshot: { iterations: 2, timeoutMs: 600000, maxRetries: 2, bustCache: false },
    },
    {
      type: 'request',
      seq: 1,
      ts: '2026-08-17T06:34:07.000Z',
      iterationIndex: 0,
      promptHash: 'a'.repeat(64),
      promptLength: 1200,
    },
    {
      type: 'clean',
      seq: 2,
      ts: '2026-08-17T06:35:00.000Z',
      iterationIndex: 0,
      output: { spillRef: SPILL_REF, preview: '<!doctype html>', bytes: SPILL_TEXT.length },
    },
    {
      type: 'check',
      seq: 3,
      ts: '2026-08-17T06:35:01.000Z',
      iterationIndex: 0,
      check: { name: 'renders', passed: true, points: 20, maxPoints: 20 },
    },
    {
      type: 'aggregate',
      seq: 4,
      ts: '2026-08-17T06:36:00.000Z',
      result: {
        modelId: 'gemini-3.6-flash',
        taskId: 'tic-tac-toe',
        score: 78,
        status: 'success',
        iterations: 2,
        iterationsSucceeded: 2,
        costUsd: 0.0123,
        failureReason: 'none',
      },
    },
  ]
  writeFileSync(
    join(dir, 'gemini-3.6-flash-tic-tac-toe.jsonl'),
    events.map((e) => JSON.stringify(e)).join('\n') + '\n'
  )
  mkdirSync(join(dir, 'spill'), { recursive: true })
  writeFileSync(join(dir, SPILL_REF), SPILL_TEXT)
  // Exports ship a README beside the log; a non-JSONL sibling must not confuse it.
  writeFileSync(join(dir, 'README.txt'), 'this is not a run log\n')
})

afterAll(() => rmSync(dir, { recursive: true, force: true }))

function retrace(args: string[]): string {
  return execFileSync(tsx, [script, ...args], { encoding: 'utf8', cwd: root })
}

describe('retrace --dir', () => {
  // Generous timeouts: each case spawns tsx, and the FIRST spawn on a cold
  // machine pays for the whole TypeScript transform pipeline.
  it('replays an extracted export directory', () => {
    const out = retrace(['--dir', dir])
    expect(out).toContain('gemini-3.6-flash :: tic-tac-toe')
    expect(out).toContain('iteration #1')
    expect(out).toContain('request  prompt 1200 chars')
    expect(out).toContain('check    PASS renders 20/20')
    expect(out).toContain('score 78')
    expect(out).toContain('1 run log(s)')
  }, 60_000)

  it('resolves spill files inside that directory with --full', () => {
    const out = retrace(['--dir', dir, '--full'])
    expect(out).toContain('<title>exported artifact</title>')
    expect(out).not.toContain('could not read')
  }, 60_000)

  it('rejects --run and --dir together, and neither', () => {
    expect(() => retrace(['--dir', dir, '--run', 'x'])).toThrow(/mutually exclusive/)
    expect(() => retrace([])).toThrow(/--run <run-id> or --dir <path>/)
  }, 60_000)

  it('fails cleanly on a directory with no run logs', () => {
    const empty = mkdtempSync(join(tmpdir(), 'retrace-empty-'))
    try {
      expect(() => retrace(['--dir', empty])).toThrow(/No run logs/)
    } finally {
      rmSync(empty, { recursive: true, force: true })
    }
  }, 60_000)
})
