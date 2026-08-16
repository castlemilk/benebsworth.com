import { describe, expect, it } from 'vitest'

import {
  collectSpillRefs,
  findTraceEntry,
  formatTraceBytes,
  isSafePathSegment,
  isSafeSpillRef,
  planTracePublication,
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

describe('planTracePublication', () => {
  const fresh = { runId: 'r-new', file: 'm-t.jsonl' }
  const committed = { runId: 'r-old', file: 'm-u.jsonl' }
  const committedEntry = {
    runId: 'r-old',
    file: 'm-u.jsonl',
    modelId: 'kimi-k2.7',
    taskId: 'u',
    bytes: 4096,
    spillRefs: ['spill/abcd.txt'],
  }

  it('keeps a committed trace whose SOURCE SWEEP IS GONE', () => {
    // The regression: `sweep-clean` pruned sweeps/, so only the published copy
    // survives. Rebuilding the index from sources alone dropped this entry and
    // made committed evidence invisible while its bytes stayed in the repo.
    const plan = planTracePublication({
      wanted: [fresh, committed],
      publishedIndex: [committedEntry],
      publishedKeys: ['r-old/m-u.jsonl'],
      sourceKeys: ['r-new/m-t.jsonl'],
    })

    expect(plan.refresh).toEqual([fresh])
    expect(plan.keep).toEqual([committedEntry])
    // …and it is NOT reported missing: nothing about it is absent.
    expect(plan.missing).toEqual([])
  })

  it('prefers the source when there is one — a refresh re-derives the entry', () => {
    const plan = planTracePublication({
      wanted: [committed],
      publishedIndex: [committedEntry],
      publishedKeys: ['r-old/m-u.jsonl'],
      sourceKeys: ['r-old/m-u.jsonl'],
    })
    expect(plan.refresh).toEqual([committed])
    expect(plan.keep).toEqual([])
  })

  it('needs BOTH an index entry and a published file to keep', () => {
    // An index entry with no file would publish a link to a 404; a file with no
    // entry has no modelId/taskId (those come from the log header).
    const entryOnly = planTracePublication({
      wanted: [committed],
      publishedIndex: [committedEntry],
      publishedKeys: [],
      sourceKeys: [],
    })
    expect(entryOnly.keep).toEqual([])
    expect(entryOnly.missing).toEqual([committed])

    const fileOnly = planTracePublication({
      wanted: [committed],
      publishedIndex: [],
      publishedKeys: ['r-old/m-u.jsonl'],
      sourceKeys: [],
    })
    expect(fileOnly.keep).toEqual([])
    expect(fileOnly.missing).toEqual([committed])
  })

  it('leaves pruning to staleTraceKeys: an unwanted entry is in no bucket', () => {
    const plan = planTracePublication({
      wanted: [fresh],
      publishedIndex: [committedEntry],
      publishedKeys: ['r-old/m-u.jsonl'],
      sourceKeys: ['r-new/m-t.jsonl'],
    })
    expect(plan.keep).toEqual([])
    expect(staleTraceKeys(['r-new/m-t.jsonl', 'r-old/m-u.jsonl'], [fresh])).toEqual([
      'r-old/m-u.jsonl',
    ])
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
