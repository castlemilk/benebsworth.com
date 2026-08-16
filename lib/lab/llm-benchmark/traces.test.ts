import { describe, expect, it } from 'vitest'

import {
  collectSpillRefs,
  findTraceEntry,
  formatTraceBytes,
  isSafePathSegment,
  isSafeSpillRef,
  staleTraceKeys,
  traceKey,
  traceRefsFromResults,
} from './traces'

describe('traceRefsFromResults', () => {
  it('collects each distinct runLogRef once, in key order', () => {
    const refs = traceRefsFromResults([
      { runLogRef: { runId: 'b-run', file: 'm-t.jsonl' } },
      { runLogRef: { runId: 'a-run', file: 'm-t.jsonl' } },
      { runLogRef: { runId: 'b-run', file: 'm-t.jsonl' } },
    ])

    expect(refs.map(traceKey)).toEqual(['a-run/m-t.jsonl', 'b-run/m-t.jsonl'])
  })

  it('ignores records with no ref — every pre-run-log record is one of these', () => {
    expect(traceRefsFromResults([{}, { runLogRef: null }, { runLogRef: undefined }])).toEqual([])
  })

  it('refuses a ref that would escape the publication directory', () => {
    const refs = traceRefsFromResults([
      { runLogRef: { runId: '../../etc', file: 'passwd' } },
      { runLogRef: { runId: 'ok-run', file: '../secret.jsonl' } },
      { runLogRef: { runId: 'ok-run', file: 'sub/dir.jsonl' } },
      { runLogRef: { runId: 'ok-run', file: 'good.jsonl' } },
    ])

    expect(refs.map(traceKey)).toEqual(['ok-run/good.jsonl'])
  })

  it('accepts the colon a sweep run id carries', () => {
    expect(isSafePathSegment('2026-08-16T09:30:12')).toBe(true)
    expect(isSafePathSegment('2026-08-16T09-30-12')).toBe(true)
    expect(isSafePathSegment('.hidden')).toBe(false)
    expect(isSafePathSegment('')).toBe(false)
  })
})

describe('collectSpillRefs', () => {
  it('finds spill locators at any depth, deduped and sorted', () => {
    const events = [
      { type: 'response', rawOutput: { spillRef: 'spill/bbbb.txt', preview: '', bytes: 1 } },
      { type: 'clean', output: { spillRef: 'spill/aaaa.txt', preview: '', bytes: 1 } },
      {
        type: 'aggregate',
        result: {
          output: { spillRef: 'spill/aaaa.txt', preview: '', bytes: 1 },
          checks: [{ detail: { spillRef: 'spill/cccc.txt', preview: '', bytes: 1 } }],
        },
      },
    ]

    expect(collectSpillRefs(events)).toEqual([
      'spill/aaaa.txt',
      'spill/bbbb.txt',
      'spill/cccc.txt',
    ])
  })

  it('returns nothing for a log with only inline strings', () => {
    expect(collectSpillRefs([{ type: 'clean', output: 'small' }])).toEqual([])
  })

  it('ignores a spillRef that is not the writer-produced shape', () => {
    expect(collectSpillRefs([{ output: { spillRef: '../../etc/passwd' } }])).toEqual([])
    expect(isSafeSpillRef('spill/9f86d081884c7d65.txt')).toBe(true)
    expect(isSafeSpillRef('spill/../x.txt')).toBe(false)
    expect(isSafeSpillRef('other/9f86.txt')).toBe(false)
  })
})

describe('staleTraceKeys', () => {
  it('names published traces no record claims any more', () => {
    const wanted = [{ runId: 'new-run', file: 'm-t.jsonl' }]
    const published = ['new-run/m-t.jsonl', 'old-run/m-t.jsonl', 'old-run/m-u.jsonl']

    expect(staleTraceKeys(published, wanted)).toEqual(['old-run/m-t.jsonl', 'old-run/m-u.jsonl'])
  })

  it('is empty when publication is already exactly right (idempotent reruns)', () => {
    const wanted = [{ runId: 'r', file: 'm-t.jsonl' }]
    expect(staleTraceKeys(['r/m-t.jsonl'], wanted)).toEqual([])
  })
})

describe('findTraceEntry', () => {
  const index = [
    { runId: 'r1', file: 'kimi-nbody.jsonl', modelId: 'kimi-k2.7', taskId: 'nbody' },
    { runId: 'r2', file: 'kimi-nbody.jsonl', modelId: 'kimi-k2.7', taskId: 'nbody' },
  ]

  it('matches on the whole (runId, file) key, not on either half', () => {
    expect(findTraceEntry(index, { runId: 'r2', file: 'kimi-nbody.jsonl' })?.runId).toBe('r2')
    expect(findTraceEntry(index, { runId: 'r3', file: 'kimi-nbody.jsonl' })).toBeUndefined()
  })

  it('returns undefined for a record with no ref (pre-event-log run)', () => {
    expect(findTraceEntry(index, undefined)).toBeUndefined()
    expect(findTraceEntry([], { runId: 'r1', file: 'kimi-nbody.jsonl' })).toBeUndefined()
  })
})

describe('formatTraceBytes', () => {
  it('scales to B / KB / MB', () => {
    expect(formatTraceBytes(512)).toBe('512 B')
    expect(formatTraceBytes(2048)).toBe('2.0 KB')
    expect(formatTraceBytes(3 * 1024 * 1024)).toBe('3.0 MB')
  })
})
