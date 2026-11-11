// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as ThemeStore from './theme-store'

type Store = typeof ThemeStore

/** A prefers-color-scheme query the test can flip. */
function mockOs(dark: boolean) {
  const listeners = new Set<() => void>()
  const query = {
    matches: dark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type: string, listener: () => void) => void listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => void listeners.delete(listener),
  }
  window.matchMedia = vi.fn(() => query as unknown as MediaQueryList)
  return {
    set(next: boolean) {
      query.matches = next
      for (const listener of [...listeners]) listener()
    },
    get listeners() {
      return listeners.size
    },
  }
}

/** The store keeps module state, so every test imports a fresh copy. */
async function freshStore(): Promise<Store> {
  vi.resetModules()
  return import('./theme-store')
}

const html = () => document.documentElement

beforeEach(() => {
  localStorage.clear()
  html().className = ''
  html().style.colorScheme = ''
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('theme store', () => {
  it('follows the OS when nothing is stored', async () => {
    mockOs(true)
    const store = await freshStore()
    expect(store.getThemeSnapshot()).toEqual({ theme: 'system', resolvedTheme: 'dark', systemTheme: 'dark' })
  })

  it('lets a stored explicit theme win over the OS', async () => {
    mockOs(false)
    localStorage.setItem('theme', 'dark')
    const store = await freshStore()
    expect(store.getThemeSnapshot()).toEqual({ theme: 'dark', resolvedTheme: 'dark', systemTheme: 'light' })
  })

  it('hands useSyncExternalStore one cached snapshot, and none on the server', async () => {
    mockOs(false)
    const store = await freshStore()
    expect(store.getThemeSnapshot()).toBe(store.getThemeSnapshot())
    expect(store.getServerThemeSnapshot()).toBeNull()
  })

  it('setTheme persists the choice, repaints the document and notifies each subscriber once', async () => {
    mockOs(false)
    const store = await freshStore()
    const listener = vi.fn()
    store.subscribeTheme(listener)

    store.setTheme('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(html().classList.contains('dark')).toBe(true)
    expect(html().classList.contains('light')).toBe(false)
    expect(html().style.colorScheme).toBe('dark')
    expect(store.getThemeSnapshot().resolvedTheme).toBe('dark')
    expect(listener).toHaveBeenCalledTimes(1)

    store.setTheme('dark')
    expect(listener).toHaveBeenCalledTimes(1)

    store.setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
    expect(store.getThemeSnapshot().theme).toBe('light')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('follows OS changes only while the choice is "system"', async () => {
    const os = mockOs(false)
    const store = await freshStore()
    store.subscribeTheme(() => {})

    os.set(true)
    expect(store.getThemeSnapshot()).toEqual({ theme: 'system', resolvedTheme: 'dark', systemTheme: 'dark' })
    expect(html().classList.contains('dark')).toBe(true)

    store.setTheme('light')
    os.set(false)
    os.set(true)
    expect(store.getThemeSnapshot()).toEqual({ theme: 'light', resolvedTheme: 'light', systemTheme: 'dark' })
    expect(html().classList.contains('light')).toBe(true)
  })

  it('picks up a choice made in another tab', async () => {
    mockOs(false)
    const store = await freshStore()
    store.subscribeTheme(() => {})
    localStorage.setItem('theme', 'dark')
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'dark' }))
    expect(store.getThemeSnapshot().resolvedTheme).toBe('dark')
    expect(html().classList.contains('dark')).toBe(true)
  })

  it('keeps one OS listener and drops it when the last subscriber leaves', async () => {
    const os = mockOs(false)
    const store = await freshStore()
    const leaveA = store.subscribeTheme(() => {})
    const leaveB = store.subscribeTheme(() => {})
    expect(os.listeners).toBe(1)
    leaveA()
    expect(os.listeners).toBe(1)
    leaveB()
    expect(os.listeners).toBe(0)
  })

  it('still switches the page when storage is blocked', async () => {
    mockOs(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const store = await freshStore()
    expect(store.getThemeSnapshot().theme).toBe('system')
    store.setTheme('dark')
    expect(html().classList.contains('dark')).toBe(true)
  })
})
