import { describe, expect, it } from 'vitest'

import { parseRunLog, spillPreview } from './runlog-format'

/**
 * `readRunLog`'s file-backed behaviour is covered in `runlog.test.ts` (real
 * write + fsync round-trips). These tests exercise the SAME parser through the
 * string entry point the browser uses — the run-trace UI fetches the JSONL as
 * text, so a crash tail or a bad header has to degrade there exactly as it
 * does on the node side.
 */

const HEADER = {
  type: 'header',
  seq: 0,
  version: 1,
  runId: '2026-08-16T09-30-12',
  modelId: 'kimi-k2.7',
  taskId: 'nbody',
  createdAt: '2026-08-16T09:30:12.000Z',
  configSnapshot: { iterations: 2, timeoutMs: 1000, maxRetries: 1, bustCache: false },
}

function jsonl(...records: unknown[]): string {
  return records.map((r) => JSON.stringify(r)).join('\n') + '\n'
}

describe('parseRunLog', () => {
  it('reads the header and every event from JSONL text', () => {
    const text = jsonl(
      HEADER,
      { type: 'request', iterationIndex: 0, promptHash: 'abc', promptLength: 12, seq: 1, ts: 't' },
      { type: 'clean', iterationIndex: 0, output: 'hi', seq: 2, ts: 't' }
    )

    const { header, events } = parseRunLog(text)

    expect(header.modelId).toBe('kimi-k2.7')
    expect(header.configSnapshot.iterations).toBe(2)
    expect(events.map((e) => e.type)).toEqual(['request', 'clean'])
  })

  it('keeps the complete prefix and stops at a truncated tail (killed sweep)', () => {
    const text =
      jsonl(HEADER, { type: 'request', iterationIndex: 0, seq: 1, ts: 't' }) +
      '{"type":"response","iterationInde'

    const { events } = parseRunLog(text)

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('request')
  })

  it('stops at a line that parses but is not an event record', () => {
    const text = jsonl(HEADER, { type: 'check', iterationIndex: 0, seq: 1, ts: 't' }, 42, {
      type: 'clean',
      iterationIndex: 0,
      output: 'never reached',
      seq: 3,
      ts: 't',
    })

    expect(parseRunLog(text).events.map((e) => e.type)).toEqual(['check'])
  })

  it('throws on an unparsable header — the file describes nothing without it', () => {
    expect(() => parseRunLog('not json at all\n')).toThrow(/header/i)
    expect(() => parseRunLog('')).toThrow(/header/i)
  })

  it('throws when line 1 parses but is not a header record', () => {
    expect(() => parseRunLog(jsonl({ type: 'request', seq: 1 }))).toThrow(
      /not a run-log header/i
    )
  })

  it('names the source in the error message', () => {
    expect(() => parseRunLog('nope', '/lab-data/traces/run/x.jsonl')).toThrow(
      /\/lab-data\/traces\/run\/x\.jsonl/
    )
  })

  it('tolerates a missing trailing newline', () => {
    const text = JSON.stringify(HEADER)
    expect(parseRunLog(text).events).toEqual([])
  })
})

describe('spillPreview', () => {
  it('returns an inline string as-is and a spilled field as its preview', () => {
    expect(spillPreview('inline')).toBe('inline')
    expect(spillPreview({ spillRef: 'spill/abc.txt', preview: 'first 2 KB', bytes: 99_000 })).toBe(
      'first 2 KB'
    )
  })
})
