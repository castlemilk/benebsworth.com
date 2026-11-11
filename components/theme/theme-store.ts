/**
 * The site's light/dark preference, held outside React.
 *
 * A context provider at the root of the tree is the wrong home for it. A root
 * context value that changes straight after hydration reaches Suspense
 * boundaries React has not hydrated yet; React gives up on their server HTML,
 * and when the page's JavaScript lagged its HTML a blog post stayed on the root
 * loading skeleton for good. next-themes re-rendered its provider with a fresh
 * value after every first visit, which is exactly that change
 * (docs/postmortem/0009-theme-context-stuck-skeleton.md).
 *
 * Here the preference lives in this module and `useTheme` (./use-theme)
 * subscribes with useSyncExternalStore, so a change re-renders only the
 * components that read the theme. Nothing above the route tree re-renders.
 *
 * THEME_SCRIPT (./theme-script) applies the same choice before first paint;
 * this store takes over once JavaScript runs.
 */

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeSnapshot {
  /** What the visitor chose: an explicit theme, or follow the OS. */
  theme: ThemePreference
  /** What the page shows. */
  resolvedTheme: ResolvedTheme
  /** What the OS asks for. */
  systemTheme: ResolvedTheme
}

export const THEME_STORAGE_KEY = 'theme'
export const DARK_QUERY = '(prefers-color-scheme: dark)'

let snapshot: ThemeSnapshot | null = null
const listeners = new Set<() => void>()
let media: MediaQueryList | null = null

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // Storage is blocked (private mode, sandboxed frame): follow the OS.
  }
  return 'system'
}

function readSystem(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function resolve(theme: ThemePreference, systemTheme: ResolvedTheme): ThemeSnapshot {
  return { theme, systemTheme, resolvedTheme: theme === 'system' ? systemTheme : theme }
}

/** Client snapshot. Cached, so useSyncExternalStore sees one object until something changes. */
export function getThemeSnapshot(): ThemeSnapshot {
  if (snapshot === null) snapshot = resolve(readPreference(), readSystem())
  return snapshot
}

/** Server and hydration snapshot: the theme is unknown until the browser runs. */
export function getServerThemeSnapshot(): null {
  return null
}

function applyToDocument(resolved: ResolvedTheme) {
  const root = document.documentElement
  // Stop every themed surface animating its colour swap, as next-themes'
  // disableTransitionOnChange did. The toggle thumb opts back in with an
  // `!important` transition (.theme-thumb in app/globals.css).
  const freeze = document.createElement('style')
  freeze.appendChild(document.createTextNode('*,*::before,*::after{transition:none!important}'))
  document.head.appendChild(freeze)
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  root.style.colorScheme = resolved
  // Flush styles so the swap lands with transitions off, then lift the freeze.
  window.getComputedStyle(document.body)
  setTimeout(() => freeze.remove(), 1)
}

function publish(next: ThemeSnapshot) {
  const prev = getThemeSnapshot()
  if (prev.theme === next.theme && prev.resolvedTheme === next.resolvedTheme && prev.systemTheme === next.systemTheme) return
  snapshot = next
  if (prev.resolvedTheme !== next.resolvedTheme) applyToDocument(next.resolvedTheme)
  for (const listener of listeners) listener()
}

/** Choose a theme: persist it, repaint the page and tell every subscriber. */
export function setTheme(value: ThemePreference | ((current: ThemePreference) => ThemePreference)) {
  const current = getThemeSnapshot()
  const theme = typeof value === 'function' ? value(current.theme) : value
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Not persisted; the page still switches.
  }
  publish(resolve(theme, current.systemTheme))
}

function onSystemChange() {
  publish(resolve(getThemeSnapshot().theme, readSystem()))
}

function onStorage(event: StorageEvent) {
  // Another tab chose a theme, or cleared storage (key === null).
  if (event.key !== THEME_STORAGE_KEY && event.key !== null) return
  publish(resolve(readPreference(), getThemeSnapshot().systemTheme))
}

/** useSyncExternalStore subscribe. The OS and cross-tab listeners stay attached while anyone subscribes. */
export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener)
  if (media === null) {
    media = window.matchMedia(DARK_QUERY)
    media.addEventListener('change', onSystemChange)
    window.addEventListener('storage', onStorage)
    // The OS may have changed between the first read and now.
    onSystemChange()
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && media !== null) {
      media.removeEventListener('change', onSystemChange)
      window.removeEventListener('storage', onStorage)
      media = null
    }
  }
}
