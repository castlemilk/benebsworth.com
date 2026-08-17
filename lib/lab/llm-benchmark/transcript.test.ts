import { describe, expect, it } from 'vitest'

import { renderTranscript } from './transcript'
import type { RunLogEvent, RunLogHeader } from './runlog-format'

/**
 * How the transcript renders CHECK rows.
 *
 * The rest of the renderer is exercised end-to-end by `retrace-cli.test.ts`
 * (which spawns the real script over a fixture tree). This file covers the one
 * distinction that is easy to get wrong and expensive when it is: a FALLBACK
 * row must not read as a verdict on the model.
 */
const HEADER: RunLogHeader = {
  type: 'header',
  seq: 0,
  version: 1,
  runId: '2026-08-17T06-34-06',
  modelId: 'kimi-k3',
  taskId: 'equation-solver',
  createdAt: '2026-08-17T06:34:06.000Z',
  configSnapshot: { iterations: 1, timeoutMs: 600_000, maxRetries: 2, bustCache: false },
}

function render(check: Record<string, unknown>): string {
  const events = [
    { type: 'check', seq: 1, ts: '2026-08-17T06:35:00.000Z', iterationIndex: 0, check },
  ] as unknown as RunLogEvent[]
  return renderTranscript({ header: HEADER, events })
}

describe('transcript check rendering', () => {
  it('renders a real failing check as FAIL', () => {
    const out = render({ name: 'solutions-correct', passed: false, points: 0, maxPoints: 70 })
    expect(out).toContain('check    FAIL solutions-correct 0/70')
  })

  it('renders a passing check as PASS', () => {
    const out = render({ name: 'program-runs', passed: true, points: 30, maxPoints: 30 })
    expect(out).toContain('check    PASS program-runs 30/30')
  })

  it('renders a fallback row as n/a, never FAIL (I1)', () => {
    // `FAIL code-fallback 0/0` in a forensic transcript is exactly the
    // misreading the `kind` field exists to prevent: nothing about the MODEL
    // failed — the harness could not judge the artifact at all.
    const out = render({
      name: 'code-fallback',
      passed: false,
      points: 0,
      maxPoints: 0,
      kind: 'fallback',
      detail: 'extraction-failed: no program in the artifact',
    })
    expect(out).toContain('check    n/a  code-fallback 0/0')
    expect(out).not.toContain('FAIL code-fallback')
    // The reason still travels with it — that is why the row exists.
    expect(out).toContain('extraction-failed: no program in the artifact')
  })

  it('recognises a legacy fallback row by name alone', () => {
    const out = render({ name: 'code-fallback', passed: false, points: 0, maxPoints: 0 })
    expect(out).toContain('check    n/a  code-fallback 0/0')
  })
})
