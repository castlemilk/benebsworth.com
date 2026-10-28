// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { FolioReview } from './review'
import { metadata } from './page'
import blockStyles from '@/components/mdx/editorial-blocks.module.css'

const { setTheme } = vi.hoisted(() => ({ setTheme: vi.fn() }))
vi.mock('next-themes', () => ({ useTheme: () => ({ setTheme }) }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('local folio review', () => {
  it('renders production statistics and exactly seven callout types, with optional and rich content', () => {
    const { container, getByText } = render(<FolioReview />)
    expect([...container.querySelectorAll('[data-callout-type]')].map(node => node.getAttribute('data-callout-type'))).toEqual(['info', 'warning', 'success', 'error', 'thinking', 'feeling', 'doing'])
    expect(container.querySelectorAll('dl dt')).toHaveLength(3)
    expect(container.querySelectorAll('dl dd')).toHaveLength(5)
    expect(container.querySelector('dl dt sub')?.textContent).toBe('out')
    expect(container.querySelector('[data-callout-type="info"]')?.querySelector(`.${blockStyles.title}`)).toBeNull()
    expect(container.querySelector('[data-callout-type="info"] strong')?.textContent).toBe('selectable rich text')
    expect(container.querySelectorAll('[data-callout-type="doing"] li')).toHaveLength(2)
    expect(getByText('Illustrative elapsed time across an intentionally long observation label')).toBeTruthy()
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('covers all note kinds, brief kinds, evidence bases and optional limits with honest specimen copy', () => {
    const { container } = render(<FolioReview />)
    expect([...container.querySelectorAll('[data-post-kind]')].map(el => el.getAttribute('data-post-kind'))).toEqual(['explainer', 'experiment', 'essay', 'guide'])
    expect(container.querySelectorAll('.folio-brief-audience')).toHaveLength(2)
    expect(container.querySelectorAll('.folio-prerequisites')).toHaveLength(2)
    for (const kind of ['observation', 'caution', 'method']) expect(container.querySelector(`[data-kind="${kind}"]`)).not.toBeNull()
    for (const basis of ['measured', 'simulated', 'illustrative', 'interpretation']) expect(container.querySelectorAll(`[data-evidence-basis="${basis}"]`)).toHaveLength(2)
    expect(container.querySelectorAll('.folio-evidence-limit')).toHaveLength(4)
    expect(container.querySelectorAll('blockquote > p')).toHaveLength(2)
    expect(container.querySelectorAll('.folio-method ol > li')).toHaveLength(4)
    expect(container.textContent).toContain('No measurement, simulation, research finding or interpretation of real evidence is reported.')
    expect(container.querySelector('p p')).toBeNull()
  })

  it('changes only the column constraint with native Gamma controls, preserving focus and content', () => {
    const { container, getByRole } = render(<FolioReview />)
    const column = getByRole('article')
    const content = column.innerHTML
    const narrow = getByRole('button', { name: '390px column' })
    expect(column.style.maxWidth).toBe('48rem')
    narrow.focus()
    fireEvent.click(narrow)
    expect(column.style.maxWidth).toBe('390px')
    expect(narrow.getAttribute('aria-pressed')).toBe('true')
    expect(narrow.getAttribute('aria-controls')).toBe(column.id)
    expect(document.activeElement).toBe(narrow)
    expect(narrow.classList.contains('gamma-button')).toBe(true)
    expect(getByRole('status').textContent).toBe('390px column selected')
    expect(column.innerHTML).toBe(content)
    fireEvent.click(getByRole('button', { name: 'Full reading column' }))
    expect(column.style.maxWidth).toBe('48rem')
    expect(narrow.getAttribute('aria-pressed')).toBe('false')
    expect(container.textContent).toContain('not a phone-viewport test')
  })

  it('uses the existing site theme provider without imposing a light-only study surface', () => {
    const { getByRole } = render(<FolioReview />)
    fireEvent.click(getByRole('button', { name: 'Use light theme' }))
    fireEvent.click(getByRole('button', { name: 'Use dark theme' }))
    expect(setTheme.mock.calls).toEqual([['light'], ['dark']])
    expect(getByRole('article').classList.contains('research-article')).toBe(true)
    expect(getByRole('main').classList.contains('folio-study')).toBe(false)
    expect(getByRole('main').classList.contains('folio-reading-page')).toBe(true)
    // Match the production MDX wrapper: not-prose excludes typography rules,
    // but its descendants still inherit the surrounding prose body's ink.
    const prose = getByRole('article').querySelector('.prose')!
    expect(prose.classList.contains('dark:prose-invert')).toBe(true)
    for (const family of ['.folio-note', '.folio-assumptions', '.folio-brief', '.folio-method']) {
      expect(prose.querySelectorAll(family).length).toBeGreaterThan(0)
    }
  })

  it('opts the dedicated fixture out of indexing and following', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})
