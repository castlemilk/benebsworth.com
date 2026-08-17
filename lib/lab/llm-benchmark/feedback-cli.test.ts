import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { BENCHMARK_MODELS, BENCHMARK_TASKS } from './registry'
import { BENCHMARK_RESULTS } from './results'
import { gateFeedbackRef, parseFeedbackArgs, renderFeedbackList } from './feedback-cli'
import { FEEDBACK_NOTE_MAX } from './feedback'
import type { CuratorFeedback } from './feedback'

const BOARD = { models: BENCHMARK_MODELS, tasks: BENCHMARK_TASKS, results: BENCHMARK_RESULTS }

describe('parseFeedbackArgs', () => {
  it('parses a rating', () => {
    const parsed = parseFeedbackArgs(['--ref', 'bench://a/b', '--rating', 'positive', '--note', 'good'])
    expect(parsed).toEqual({
      ok: true,
      options: { command: 'upsert', ref: 'bench://a/b', rating: 'positive', note: 'good' },
    })
  })

  it('parses a listing, narrowed or not', () => {
    expect(parseFeedbackArgs(['--list'])).toEqual({ ok: true, options: { command: 'list' } })
    expect(parseFeedbackArgs(['--list', '--model', 'kimi-k2.7'])).toEqual({
      ok: true,
      options: { command: 'list', model: 'kimi-k2.7' },
    })
  })

  it('parses a removal', () => {
    expect(parseFeedbackArgs(['--rm', '--ref', 'bench://a/b'])).toEqual({
      ok: true,
      options: { command: 'remove', ref: 'bench://a/b' },
    })
  })

  it('refuses an unknown argument rather than ignoring it', () => {
    const parsed = parseFeedbackArgs(['--reff', 'bench://a/b'])
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.message).toContain('Unknown argument')
  })

  it('refuses flags that belong to another mode', () => {
    for (const argv of [
      ['--list', '--rating', 'positive'],
      ['--list', '--ref', 'bench://a/b'],
      ['--rm', '--ref', 'bench://a/b', '--note', 'x'],
      ['--ref', 'bench://a/b', '--rating', 'positive', '--model', 'x'],
      ['--list', '--rm'],
    ]) {
      expect(parseFeedbackArgs(argv).ok, argv.join(' ')).toBe(false)
    }
  })

  it('requires both halves of a judgment', () => {
    expect(parseFeedbackArgs(['--rating', 'positive']).ok).toBe(false)
    expect(parseFeedbackArgs(['--ref', 'bench://a/b']).ok).toBe(false)
    expect(parseFeedbackArgs([]).ok).toBe(false)
  })

  it('validates the ref, the rating and the note before anything is written', () => {
    expect(parseFeedbackArgs(['--ref', 'a/b', '--rating', 'positive']).ok).toBe(false)
    expect(parseFeedbackArgs(['--ref', 'bench://a/b', '--rating', 'up']).ok).toBe(false)
    expect(
      parseFeedbackArgs(['--ref', 'bench://a/b', '--rating', 'positive', '--note', 'x'.repeat(FEEDBACK_NOTE_MAX + 1)])
        .ok,
    ).toBe(false)
    expect(parseFeedbackArgs(['--ref', 'bench://a/b', '--rating', 'positive', '--note', '  ']).ok).toBe(false)
  })

  it('answers --help without doing anything', () => {
    expect(parseFeedbackArgs(['--help'])).toEqual({ ok: true, options: { command: 'help' } })
  })
})

describe('gateFeedbackRef', () => {
  it('passes a ref that names a real record', () => {
    expect(gateFeedbackRef('bench://deepseek-v4-flash-free/landing-page-morph', BOARD)).toEqual({ ok: true })
  })

  it('refuses a record the board does not have', () => {
    const gate = gateFeedbackRef('bench://kimi-k2.7/not-a-task', BOARD)
    expect(gate.ok).toBe(false)
    if (!gate.ok) expect(gate.message).toContain('unknown-task')
  })

  it('refuses an iteration beyond the ones that ran', () => {
    const gate = gateFeedbackRef('bench://deepseek-v4-flash-free/landing-page-morph/9', BOARD)
    expect(gate.ok).toBe(false)
    if (!gate.ok) expect(gate.message).toContain('iteration-out-of-range')
  })
})

describe('renderFeedbackList', () => {
  const entries: CuratorFeedback[] = [
    {
      ref: 'bench://m1/t1',
      rating: 'positive',
      note: 'holds up',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      version: 2,
    },
    {
      ref: 'bench://m2/t1',
      rating: 'negative',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      version: 1,
    },
  ]

  it('shows ref, rating, version and note', () => {
    const text = renderFeedbackList(entries)
    expect(text).toContain('+ bench://m1/t1')
    expect(text).toContain('v2')
    expect(text).toContain('holds up')
    expect(text).toContain('- bench://m2/t1')
    expect(text).toContain('2 entries')
  })

  it('narrows by model', () => {
    const text = renderFeedbackList(entries, { model: 'm2' })
    expect(text).not.toContain('m1')
    expect(text).toContain('1 entry')
  })

  it('says so when there is nothing', () => {
    expect(renderFeedbackList([], {})).toContain('no curator feedback')
    expect(renderFeedbackList(entries, { model: 'nobody' })).toContain("model 'nobody'")
  })
})

/**
 * The documented round-trip, against the REAL script — the only thing that
 * proves `task bench:feedback` works. It runs on a TEMP sidecar
 * (`FEEDBACK_PATH`), so the committed file is never touched, but it gates
 * against the real board because that gate is the behaviour under test.
 */
describe('scripts/bench-feedback.mjs', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
  const script = join(root, 'scripts/bench-feedback.mjs')
  const tsx = join(root, 'node_modules/.bin/tsx')
  let dir: string
  let sidecar: string

  const run = (args: string[]): string =>
    execFileSync(tsx, [script, ...args], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, FEEDBACK_PATH: sidecar },
    })

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'bench-feedback-'))
    sidecar = join(dir, 'feedback.json')
    writeFileSync(sidecar, '[]\n')
  })

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('adds, lists, replaces and removes', () => {
    const ref = 'bench://gemini-3.6-flash/tic-tac-toe'

    const added = run(['--ref', ref, '--rating', 'positive', '--note', 'plays cleanly'])
    expect(added).toContain('created (v1)')
    expect(JSON.parse(readFileSync(sidecar, 'utf8'))).toHaveLength(1)

    const listed = run(['--list'])
    expect(listed).toContain(ref)
    expect(listed).toContain('plays cleanly')
    expect(run(['--list', '--model', 'nobody'])).toContain('no curator feedback')

    const replaced = run(['--ref', ref, '--rating', 'negative'])
    expect(replaced).toContain('v1 → v2')
    expect(replaced).toContain('note cleared')
    const after = JSON.parse(readFileSync(sidecar, 'utf8'))
    expect(after).toHaveLength(1)
    expect(after[0].rating).toBe('negative')
    expect(after[0].note).toBeUndefined()

    const removed = run(['--rm', '--ref', ref])
    expect(removed).toContain('removed')
    expect(JSON.parse(readFileSync(sidecar, 'utf8'))).toEqual([])
  })

  it('refuses to rate a record the board does not have', () => {
    expect(() => run(['--ref', 'bench://gemini-3.6-flash/no-such-task', '--rating', 'positive'])).toThrow()
    expect(JSON.parse(readFileSync(sidecar, 'utf8'))).toEqual([])
  })
})
