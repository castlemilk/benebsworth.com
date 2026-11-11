// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_SCRIPT } from './theme-script'

function setOs(dark: boolean) {
  window.matchMedia = vi.fn(() => ({ matches: dark, media: '(prefers-color-scheme: dark)' }) as unknown as MediaQueryList)
}

function runScript() {
  new Function(THEME_SCRIPT)()
  return { className: document.documentElement.className, colorScheme: document.documentElement.style.colorScheme }
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  document.documentElement.style.colorScheme = ''
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('pre-paint theme script', () => {
  it('applies a stored explicit theme over the OS', () => {
    setOs(false)
    localStorage.setItem('theme', 'dark')
    expect(runScript()).toEqual({ className: 'dark', colorScheme: 'dark' })
  })

  it('follows the OS when the stored value is "system", unknown or missing', () => {
    setOs(true)
    for (const stored of ['system', 'sepia', null]) {
      if (stored === null) localStorage.removeItem('theme')
      else localStorage.setItem('theme', stored)
      expect(runScript()).toEqual({ className: 'dark', colorScheme: 'dark' })
    }
  })

  it('still applies the OS theme when storage is blocked', () => {
    setOs(true)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(runScript()).toEqual({ className: 'dark', colorScheme: 'dark' })
  })

  it("agrees with the store's first snapshot for every stored value and OS", async () => {
    for (const stored of [null, 'light', 'dark', 'system', 'sepia']) {
      for (const osDark of [false, true]) {
        localStorage.clear()
        if (stored !== null) localStorage.setItem('theme', stored)
        setOs(osDark)
        const painted = runScript().className
        vi.resetModules()
        const store = await import('./theme-store')
        expect(painted, `stored=${stored} osDark=${osDark}`).toBe(store.getThemeSnapshot().resolvedTheme)
      }
    }
  })
})
