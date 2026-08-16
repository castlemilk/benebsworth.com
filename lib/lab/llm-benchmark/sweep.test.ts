import { describe, it, expect } from 'vitest'
import { selectPrunable, sweepRunId } from './sweep'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-08-16T00:00:00Z')

/** `n` days before NOW. */
function daysAgo(n: number): number {
  return NOW - n * DAY
}

describe('selectPrunable', () => {
  it('deletes only runs that are BOTH beyond the keep-count AND older than the age floor', () => {
    const entries = [
      { name: 'run-a', mtimeMs: daysAgo(1) },
      { name: 'run-b', mtimeMs: daysAgo(2) },
      { name: 'run-c', mtimeMs: daysAgo(30) },
      { name: 'run-d', mtimeMs: daysAgo(40) },
    ]
    // keep 2 newest (a, b); c and d are both beyond the count and older than 14d.
    expect(selectPrunable(entries, { keep: 2, olderThanDays: 14, now: NOW }).map((e) => e.name)).toEqual([
      'run-c',
      'run-d',
    ])
  })

  it('keeps a run that is beyond the keep-count but still inside the age floor', () => {
    const entries = [
      { name: 'run-a', mtimeMs: daysAgo(0) },
      { name: 'run-b', mtimeMs: daysAgo(1) },
      { name: 'run-c', mtimeMs: daysAgo(2) },
    ]
    expect(selectPrunable(entries, { keep: 1, olderThanDays: 14, now: NOW })).toEqual([])
  })

  it('keeps an ancient run that is still inside the keep-count', () => {
    const entries = [
      { name: 'run-old', mtimeMs: daysAgo(400) },
      { name: 'run-older', mtimeMs: daysAgo(500) },
    ]
    expect(selectPrunable(entries, { keep: 5, olderThanDays: 14, now: NOW })).toEqual([])
  })

  it('ranks by mtime, not by array order', () => {
    const entries = [
      { name: 'stale', mtimeMs: daysAgo(90) },
      { name: 'fresh', mtimeMs: daysAgo(1) },
      { name: 'middling', mtimeMs: daysAgo(60) },
    ]
    expect(selectPrunable(entries, { keep: 1, olderThanDays: 14, now: NOW }).map((e) => e.name)).toEqual([
      'middling',
      'stale',
    ])
  })

  it('treats keep: 0 as "age floor only"', () => {
    const entries = [
      { name: 'fresh', mtimeMs: daysAgo(1) },
      { name: 'stale', mtimeMs: daysAgo(20) },
    ]
    expect(selectPrunable(entries, { keep: 0, olderThanDays: 14, now: NOW }).map((e) => e.name)).toEqual(['stale'])
  })

  it('returns nothing for an empty sweeps dir', () => {
    expect(selectPrunable([], { keep: 5, olderThanDays: 14, now: NOW })).toEqual([])
  })
})

describe('sweepRunId', () => {
  it('is a filesystem-safe sortable timestamp', () => {
    expect(sweepRunId(new Date('2026-08-16T09:30:12.345Z'))).toBe('2026-08-16T09-30-12')
  })

  it('contains no path-hostile characters', () => {
    expect(sweepRunId(new Date(NOW))).not.toMatch(/[:/\\ ]/)
  })
})
