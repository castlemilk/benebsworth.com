// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioOverview } from '../mdx/audio-overview'
import { QuizRunner, type PreparedQuiz } from './quiz-runner'
import { recordQuiz } from './progress'

vi.mock('./progress', () => ({ recordQuiz: vi.fn() }))
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals() })

function audio(name: string) {
  return <AudioOverview src={`/${name}.m4a`} hosts={{ A: `${name} host` }} segments={[{ speaker: 'A', text: `${name} transcript`, start: 0, end: 10, eq: undefined }]} />
}
function quiz(correctOptionId: string): PreparedQuiz {
  return { title: 'Quiz', questions: [{ id: 'a1', kind: 'MCQ', source: 'ORIGINAL', promptHtml: 'Choose', options: [{ id: 'a', labelHtml: 'Alpha' }, { id: 'b', labelHtml: 'Beta' }], correctOptionId }] }
}

describe('study session prop transitions without caller keys', () => {
  it('replaces audio transcript and host together with the source', () => {
    const { container, rerender } = render(audio('first'))
    expect(container.textContent).toContain('first transcript')
    rerender(audio('second'))
    expect(container.querySelector('audio')?.getAttribute('src')).toBe('/second.m4a')
    expect(container.textContent).toContain('second transcript')
    expect(container.textContent).toContain('second host')
    expect(container.textContent).not.toContain('first transcript')
    expect(container.textContent).not.toContain('first host')
  })

  it('resets reused question IDs on chapter changes and records the new chapter only after answering', () => {
    const { container, getByRole, rerender } = render(<QuizRunner chapterId="first" quiz={quiz('a')} />)
    fireEvent.click(getByRole('button', { name: 'Alpha' }))
    expect(recordQuiz).toHaveBeenCalledExactlyOnceWith('first', 100)
    rerender(<QuizRunner chapterId="second" quiz={quiz('b')} />)
    expect(container.textContent).toContain('0/1 answered')
    expect((getByRole('button', { name: 'Beta' }) as HTMLButtonElement).disabled).toBe(false)
    expect(recordQuiz).toHaveBeenCalledTimes(1)
    fireEvent.click(getByRole('button', { name: 'Beta' }))
    expect(recordQuiz).toHaveBeenLastCalledWith('second', 100)
    expect(recordQuiz).toHaveBeenCalledTimes(2)
  })

  it('resets answers when quiz content changes within a chapter', () => {
    const { container, getByRole, rerender } = render(<QuizRunner chapterId="same" quiz={quiz('a')} />)
    fireEvent.click(getByRole('button', { name: 'Alpha' }))
    rerender(<QuizRunner chapterId="same" quiz={quiz('b')} />)
    expect(container.textContent).toContain('0/1 answered')
    expect((getByRole('button', { name: 'Beta' }) as HTMLButtonElement).disabled).toBe(false)
    expect(recordQuiz).toHaveBeenCalledTimes(1)
  })
})
