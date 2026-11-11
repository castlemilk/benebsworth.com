// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { ThemeToggle } from './theme-toggle'
const state = vi.hoisted(() => ({ theme: 'light', setTheme: vi.fn() }))
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: state.theme, setTheme: state.setTheme }) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })
describe('editorial theme control', () => {
  it.each(['light', 'dark'])('retains switch semantics in %s mode', theme => {
    state.theme = theme
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const view = render(<ThemeToggle variant="editorial" />)
    const button = view.getByRole('switch', { name: 'Toggle dark mode' })
    expect(button.getAttribute('aria-checked')).toBe(String(theme === 'dark'))
    fireEvent.click(button)
    expect(state.setTheme).toHaveBeenCalledWith(theme === 'dark' ? 'light' : 'dark')
    expect(button.className).toContain('size-11')
  })
})
