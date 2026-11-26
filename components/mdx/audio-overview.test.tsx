// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { AudioOverview, wordIndexAt, wordViews } from './audio-overview'
import type { TranscriptSegment } from '@/lib/gen/study'

afterEach(() => cleanup())

const seg = (over: Partial<TranscriptSegment>): TranscriptSegment => ({
  speaker: 'A',
  text: 'alpha beta gamma',
  start: 10,
  end: 13,
  eq: undefined,
  words: [],
  ...over,
})

describe('wordViews', () => {
  it('keeps authored text zipped over aligned timings', () => {
    const words = wordViews(
      seg({
        words: [
          { text: 'ALPHA', start: 10.1, end: 10.5 },
          { text: 'BETA.', start: 10.6, end: 11.0 },
          { text: 'gamma', start: 12.0, end: 12.8 },
        ],
      }),
    )
    expect(words.map((w) => w.text)).toEqual(['alpha', 'beta', 'gamma'])
    expect(words.map((w) => [w.start, w.end])).toEqual([
      [10.1, 10.5],
      [10.6, 11.0],
      [12.0, 12.8],
    ])
  })

  it('maps extra display words onto aligned words proportionally, never out of range', () => {
    const views = wordViews(
      seg({
        text: 'one two three four five six',
        words: [
          { text: 'a', start: 10, end: 11 },
          { text: 'b', start: 11, end: 13 },
        ],
      }),
    )
    // 6 display words over 2 aligned: indices floor(i*2/6) = 0,0,0,1,1,1
    expect(views[3].start).toBe(11)
    expect(views[5].end).toBe(13)
    for (const w of views) {
      expect(w.start).toBeGreaterThanOrEqual(10)
      expect(w.end).toBeLessThanOrEqual(13)
      expect(w.start).toBeLessThanOrEqual(w.end)
    }
  })

  it('falls back to char-weighted interpolation inside [start,end] when no words', () => {
    const views = wordViews(seg({}))
    expect(views).toHaveLength(3)
    expect(views[0].start).toBe(10)
    expect(views[2].end).toBe(13)
    // contiguous coverage, no gaps
    expect(views[1].start).toBeCloseTo(views[0].end)
    expect(views[2].start).toBeCloseTo(views[1].end)
  })

  it('weights the punctuation pause: words after sentence ends start later', () => {
    const flat = wordViews(seg({ text: 'aaaa bbbb cccc dddd', start: 0, end: 4 }))
    const paused = wordViews(seg({ text: 'aaaa. bbbb cccc dddd', start: 0, end: 4 }))
    expect(paused[1].start).toBeGreaterThan(flat[1].start)
  })
})

describe('wordIndexAt', () => {
  const words = [
    { text: 'a', start: 0, end: 1 },
    { text: 'b', start: 1.2, end: 2 },
    { text: 'c', start: 2, end: 3 },
  ]
  it('clamps to word 0 before the first word starts', () => {
    expect(wordIndexAt(words, -0.5)).toBe(0)
  })
  it('holds the previous word through an inter-word pause', () => {
    expect(wordIndexAt(words, 1.1)).toBe(0)
  })
  it('returns the containing word and the last word past the end', () => {
    expect(wordIndexAt(words, 1.5)).toBe(1)
    expect(wordIndexAt(words, 99)).toBe(2)
  })
})

describe('AudioOverview karaoke', () => {
  it('renders one span per word on the active segment only', () => {
    const { container } = render(
      <AudioOverview
        src="/x.m4a"
        segments={[
          seg({ text: 'hello there world' }),
          seg({ text: 'second turn', start: 13, end: 15 }),
        ]}
      />,
    )
    const audio = container.querySelector('audio')!
    Object.defineProperty(audio, 'currentTime', { value: 10.5, configurable: true })
    act(() => {
      fireEvent.timeUpdate(audio)
    })
    const active = container.querySelector('.ao-seg.is-active .ao-seg-text')!
    expect(active.querySelectorAll('.ao-w')).toHaveLength(3)
    const idle = container.querySelectorAll('.ao-seg:not(.is-active) .ao-seg-text')
    for (const el of idle) expect(el.querySelectorAll('.ao-w')).toHaveLength(0)
  })

  it('does not render word spans while no segment is active', () => {
    const { container } = render(<AudioOverview src="/x.m4a" segments={[seg({})]} />)
    expect(container.querySelectorAll('.ao-w')).toHaveLength(0)
  })

  it('opens older transcripts without reserving space for slides', () => {
    const { container, getByRole, queryByRole } = render(<AudioOverview src="/x.m4a" segments={[seg({})]} />)
    fireEvent.click(getByRole('button', { name: 'Show transcript' }))
    expect(container.querySelector('.ao-transcript')?.hasAttribute('hidden')).toBe(false)
    expect(queryByRole('figure', { name: 'Current slide' })).toBeNull()
    expect(queryByRole('button', { name: 'Next slide' })).toBeNull()
  })
})
