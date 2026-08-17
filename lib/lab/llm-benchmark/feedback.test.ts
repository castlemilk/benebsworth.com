import { describe, expect, it } from 'vitest'

import {
  FEEDBACK_NOTE_MAX,
  aggregateFeedback,
  feedbackFor,
  feedbackForRecord,
  feedbackForTask,
  parseFeedbackFile,
  removeFeedback,
  serializeFeedback,
  upsertFeedback,
  validateFeedbackEntries,
} from './feedback'
import type { CuratorFeedback } from './feedback'
import { CURATOR_FEEDBACK } from './feedback-data'
import { BENCHMARK_RESULTS } from './results'
import { BENCHMARK_MODELS, BENCHMARK_TASKS } from './registry'
import { resolveBenchRef } from './bench-ref'

const T0 = '2026-08-01T00:00:00.000Z'
const T1 = '2026-08-02T00:00:00.000Z'
const T2 = '2026-08-03T00:00:00.000Z'

function entry(over: Partial<CuratorFeedback> = {}): CuratorFeedback {
  return {
    ref: 'bench://gemini-3.6-flash/n-body-field',
    rating: 'positive',
    createdAt: T0,
    updatedAt: T0,
    version: 1,
    ...over,
  }
}

describe('feedback validation', () => {
  it('accepts a well-formed sidecar', () => {
    const loaded = parseFeedbackFile(JSON.stringify([entry()]))
    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(loaded.entries).toHaveLength(1)
  })

  it('accepts an empty sidecar', () => {
    const loaded = parseFeedbackFile('[]')
    expect(loaded).toEqual({ ok: true, entries: [] })
  })

  it('rejects garbage JSON with a typed code', () => {
    const loaded = parseFeedbackFile('{not json')
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.code).toBe('bad-json')
  })

  it('rejects a non-array document', () => {
    const loaded = parseFeedbackFile('{"ref":"bench://a/b"}')
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.code).toBe('not-an-array')
  })

  it('rejects a ref that is not a bench:// reference', () => {
    const loaded = validateFeedbackEntries([entry({ ref: 'gemini/n-body-field' })])
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.code).toBe('bad-ref')
  })

  it('rejects a non-canonical ref (it would key two entries at one record)', () => {
    const loaded = validateFeedbackEntries([
      entry({ ref: 'bench://gemini-3.6-flash/n-body-field/01' }),
    ])
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.code).toBe('bad-ref')
  })

  it('rejects a rating outside the vocabulary', () => {
    const loaded = validateFeedbackEntries([entry({ rating: 'meh' as CuratorFeedback['rating'] })])
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.code).toBe('bad-rating')
  })

  it(`rejects a note longer than ${FEEDBACK_NOTE_MAX} characters`, () => {
    const loaded = validateFeedbackEntries([entry({ note: 'x'.repeat(FEEDBACK_NOTE_MAX + 1) })])
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.code).toBe('note-too-long')
  })

  it('accepts a note exactly at the cap', () => {
    const loaded = validateFeedbackEntries([entry({ note: 'x'.repeat(FEEDBACK_NOTE_MAX) })])
    expect(loaded.ok).toBe(true)
  })

  it('rejects an empty note (absence is the way to say nothing)', () => {
    const loaded = validateFeedbackEntries([entry({ note: '   ' })])
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.code).toBe('bad-note')
  })

  it('rejects a non-canonical timestamp', () => {
    const loaded = validateFeedbackEntries([entry({ createdAt: '2026-08-01' })])
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.code).toBe('bad-timestamp')
  })

  it('rejects updatedAt before createdAt', () => {
    const loaded = validateFeedbackEntries([entry({ createdAt: T1, updatedAt: T0 })])
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.code).toBe('time-travel')
  })

  it('rejects a version that is not a positive integer', () => {
    for (const version of [0, -1, 1.5, Number.NaN]) {
      const loaded = validateFeedbackEntries([entry({ version })])
      expect(loaded.ok, `version ${version}`).toBe(false)
      if (!loaded.ok) expect(loaded.code).toBe('bad-version')
    }
  })

  it('rejects two entries on the same ref', () => {
    const loaded = validateFeedbackEntries([entry(), entry({ rating: 'negative' })])
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.code).toBe('duplicate-ref')
  })

  it('rejects an unknown field (a typo must not silently vanish)', () => {
    const loaded = validateFeedbackEntries([{ ...entry(), raiting: 'positive' }])
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) expect(loaded.code).toBe('unknown-field')
  })
})

describe('upsertFeedback', () => {
  it('creates an entry at version 1 with equal timestamps', () => {
    const result = upsertFeedback([], { ref: 'bench://gemini-3.6-flash/n-body-field', rating: 'positive' }, T0)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.entry).toEqual({
      ref: 'bench://gemini-3.6-flash/n-body-field',
      rating: 'positive',
      createdAt: T0,
      updatedAt: T0,
      version: 1,
    })
  })

  it('keeps createdAt immutable and bumps version + updatedAt on re-rating', () => {
    const first = upsertFeedback([], { ref: 'bench://a/b', rating: 'positive', note: 'good' }, T0)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const second = upsertFeedback(first.entries, { ref: 'bench://a/b', rating: 'negative' }, T1)
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.entry.createdAt).toBe(T0)
    expect(second.entry.updatedAt).toBe(T1)
    expect(second.entry.version).toBe(2)
  })

  it('REPLACES rather than accumulates — one entry per ref, the old note is gone', () => {
    const first = upsertFeedback([], { ref: 'bench://a/b', rating: 'positive', note: 'first' }, T0)
    if (!first.ok) throw new Error('setup')
    const second = upsertFeedback(first.entries, { ref: 'bench://a/b', rating: 'negative' }, T1)
    if (!second.ok) throw new Error('setup')
    expect(second.entries).toHaveLength(1)
    expect(second.entries[0].note).toBeUndefined()
    expect(second.entries[0].rating).toBe('negative')
  })

  it('keeps updatedAt monotonic under a backwards clock', () => {
    const first = upsertFeedback([], { ref: 'bench://a/b', rating: 'positive' }, T2)
    if (!first.ok) throw new Error('setup')
    const second = upsertFeedback(first.entries, { ref: 'bench://a/b', rating: 'negative' }, T0)
    if (!second.ok) throw new Error('setup')
    expect(second.entry.updatedAt).toBe(T2)
    expect(second.entry.createdAt).toBe(T2)
  })

  it('canonicalises the ref so one record cannot hold two entries', () => {
    const first = upsertFeedback([], { ref: '  bench://a/b  ', rating: 'positive' }, T0)
    if (!first.ok) throw new Error('setup')
    expect(first.entry.ref).toBe('bench://a/b')
    const second = upsertFeedback(first.entries, { ref: 'bench://a/b', rating: 'negative' }, T1)
    if (!second.ok) throw new Error('setup')
    expect(second.entries).toHaveLength(1)
  })

  it('refuses an unparseable ref, a bad rating and an over-long note', () => {
    const bad = upsertFeedback([], { ref: 'not-a-ref', rating: 'positive' }, T0)
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.code).toBe('bad-ref')

    const rating = upsertFeedback([], { ref: 'bench://a/b', rating: 'up' as never }, T0)
    expect(rating.ok).toBe(false)
    if (!rating.ok) expect(rating.code).toBe('bad-rating')

    const note = upsertFeedback(
      [],
      { ref: 'bench://a/b', rating: 'positive', note: 'x'.repeat(FEEDBACK_NOTE_MAX + 1) },
      T0,
    )
    expect(note.ok).toBe(false)
    if (!note.ok) expect(note.code).toBe('note-too-long')
  })

  it('sorts entries by ref so the committed sidecar diffs cleanly', () => {
    let entries: CuratorFeedback[] = []
    for (const ref of ['bench://z/z', 'bench://a/a', 'bench://m/m']) {
      const step = upsertFeedback(entries, { ref, rating: 'positive' }, T0)
      if (!step.ok) throw new Error('setup')
      entries = step.entries
    }
    expect(entries.map((e) => e.ref)).toEqual(['bench://a/a', 'bench://m/m', 'bench://z/z'])
  })

  it('never mutates the array it was handed', () => {
    const before: CuratorFeedback[] = [entry()]
    const snapshot = JSON.parse(JSON.stringify(before))
    upsertFeedback(before, { ref: entry().ref, rating: 'negative' }, T1)
    expect(before).toEqual(snapshot)
  })
})

describe('removeFeedback', () => {
  it('removes the entry and reports what it removed', () => {
    const { entries, removed } = removeFeedback([entry()], 'bench://gemini-3.6-flash/n-body-field')
    expect(entries).toEqual([])
    expect(removed?.ref).toBe('bench://gemini-3.6-flash/n-body-field')
  })

  it('is a no-op for a ref with no entry', () => {
    const { entries, removed } = removeFeedback([entry()], 'bench://nobody/nothing')
    expect(entries).toHaveLength(1)
    expect(removed).toBeUndefined()
  })
})

describe('lookup + aggregation', () => {
  const entries: CuratorFeedback[] = [
    entry({ ref: 'bench://m1/t1', rating: 'positive' }),
    entry({ ref: 'bench://m1/t1/2', rating: 'negative' }),
    entry({ ref: 'bench://m1/t2', rating: 'negative' }),
    entry({ ref: 'bench://m2/t1', rating: 'positive' }),
  ]

  it('finds one entry by ref', () => {
    expect(feedbackFor(entries, 'bench://m1/t2')?.rating).toBe('negative')
    expect(feedbackFor(entries, 'bench://nope/nope')).toBeUndefined()
  })

  it('groups by record, iteration-scoped entries included', () => {
    expect(feedbackForRecord(entries, 'm1', 't1').map((e) => e.ref)).toEqual([
      'bench://m1/t1',
      'bench://m1/t1/2',
    ])
  })

  it('groups by task across models', () => {
    expect(feedbackForTask(entries, 't1')).toHaveLength(3)
  })

  it('counts ratings per record', () => {
    expect(aggregateFeedback(entries, 'm1', 't1')).toEqual({ positive: 1, negative: 1 })
    expect(aggregateFeedback(entries, 'm2', 't1')).toEqual({ positive: 1, negative: 0 })
    expect(aggregateFeedback(entries, 'nobody', 't1')).toEqual({ positive: 0, negative: 0 })
  })

  it('counts ratings per model when no task is named', () => {
    expect(aggregateFeedback(entries, 'm1')).toEqual({ positive: 1, negative: 2 })
  })
})

describe('the committed sidecar', () => {
  it('validates', () => {
    expect(validateFeedbackEntries(CURATOR_FEEDBACK).ok).toBe(true)
  })

  it('is seeded — the founding curator entries are real, not a placeholder', () => {
    expect(CURATOR_FEEDBACK.length).toBeGreaterThanOrEqual(3)
  })

  it('every entry resolves against the published board', () => {
    const board = { models: BENCHMARK_MODELS, tasks: BENCHMARK_TASKS, results: BENCHMARK_RESULTS }
    for (const item of CURATOR_FEEDBACK) {
      const resolved = resolveBenchRef(item.ref, board)
      expect(resolved.ok, `${item.ref}: ${resolved.ok ? '' : resolved.message}`).toBe(true)
    }
  })

  it('every entry carries a note — a bare thumb is not curator judgment', () => {
    for (const item of CURATOR_FEEDBACK) expect(item.note, item.ref).toBeTruthy()
  })

  it('round-trips through the serializer it is written with', () => {
    const text = serializeFeedback(CURATOR_FEEDBACK)
    const reloaded = parseFeedbackFile(text)
    expect(reloaded.ok).toBe(true)
    if (reloaded.ok) expect(reloaded.entries).toEqual(CURATOR_FEEDBACK)
  })
})
