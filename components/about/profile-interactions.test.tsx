// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HalftoneHero } from './halftone-hero'
import { SkillMarquee } from '@/components/motion/skill-marquee'
import { about } from '@/content/about'

beforeEach(() => {
  window.sessionStorage.clear()
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.stubGlobal('Image', class {
    onload: (() => void) | null = null
    set src(_value: string) { queueMicrotask(() => this.onload?.()) }
  })
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { queueMicrotask(() => callback(0)); return 1 }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('clean About interactions', () => {
  it('provides a native keyboard-accessible reveal/reset control with persisted state', async () => {
    const view = render(<HalftoneHero variant="profile" />)
    const show = screen.getByRole('button', { name: 'Show portrait' })
    expect(show.tagName).toBe('BUTTON')
    show.focus()
    expect(document.activeElement).toBe(show)
    fireEvent.click(show)
    expect(screen.getByRole('button', { name: 'Reset portrait' })).toBe(show)
    expect(window.sessionStorage.getItem('about:portrait-reveal:v3:done')).toBe('1')
    expect(screen.getByText('Portrait revealed.')).toBeTruthy()
    view.unmount()
    render(<HalftoneHero variant="profile" />)
    await screen.findByRole('button', { name: 'Reset portrait' })
    fireEvent.click(screen.getByRole('button', { name: 'Reset portrait' }))
    expect(screen.getByRole('button', { name: 'Show portrait' })).toBeTruthy()
    expect(window.sessionStorage.getItem('about:portrait-reveal:v3:done')).toBeNull()
    await act(async () => {})
  })

  it('removes specimen labels from the clean portrait while preserving the default presentation', async () => {
    const view = render(<HalftoneHero variant="profile" />)
    expect(screen.queryByText(/plate 02/)).toBeNull()
    expect(screen.queryByText(/subject · be/)).toBeNull()
    expect(view.container.querySelector('[data-portrait-frame]')?.getAttribute('style')).toContain('transform: none')
    view.unmount()
    render(<HalftoneHero />)
    expect(screen.getByText(/plate 02/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Show portrait' })).toBeNull()
    await act(async () => {})
  })

  it('renders each About skill once in the static layout with focus-accessible provenance', async () => {
    const view = render(<SkillMarquee skills={about.skills} layout="static" />)
    expect(view.container.querySelector('[data-skill-layout="static"]')).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(about.skills.length)
    const first = screen.getAllByRole('button')[0]
    act(() => first.focus())
    expect(first.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(about.skills[0].note)).toBeTruthy()
    fireEvent.scroll(window)
    await waitFor(() => expect(first.getAttribute('aria-expanded')).toBe('false'))
    expect(screen.queryByText(about.skills[0].note)).toBeNull()
  })

  it('groups every skill once by its actual discipline and uses readable profile provenance', () => {
    const view = render(<SkillMarquee skills={about.skills} layout="grouped" />)
    expect(view.container.querySelector('[data-skill-layout="grouped"]')).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(about.skills.length)
    expect(screen.getAllByRole('heading').map(heading => heading.textContent)).toEqual([...new Set(about.skills.map(skill => skill.category))])
    for (const skill of about.skills) expect(screen.getAllByRole('button', { name: skill.name })).toHaveLength(1)
    act(() => screen.getAllByRole('button')[0].focus())
    const card = document.querySelector('[data-skill-card-style="profile"]')!
    expect(card).toBeTruthy()
    expect(card.querySelector('.opacity-60')).toBeNull()
    expect(card.textContent).toContain(about.skills[0].note)
  })

  it('retains the default marquee for existing consumers', () => {
    const view = render(<SkillMarquee skills={about.skills.slice(0, 2)} />)
    expect(view.container.querySelector('[data-skill-layout="static"]')).toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })
})
