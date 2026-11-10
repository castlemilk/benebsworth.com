'use client'
import { useSyncExternalStore } from 'react'
import {
  getServerThemeSnapshot,
  getThemeSnapshot,
  setTheme,
  subscribeTheme,
  type ThemePreference,
  type ThemeSnapshot,
} from './theme-store'

const THEMES: ThemePreference[] = ['light', 'dark', 'system']

/**
 * Read and change the theme, with the same shape next-themes' `useTheme` had:
 * `{ theme, resolvedTheme, systemTheme, themes, setTheme }`.
 *
 * The values are undefined during the server render and hydration, then fill
 * in. Only the calling component re-renders when the theme changes (see
 * ./theme-store for why that matters).
 */
export function useTheme() {
  const snap = useSyncExternalStore<ThemeSnapshot | null>(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot)
  return {
    theme: snap?.theme,
    resolvedTheme: snap?.resolvedTheme,
    systemTheme: snap?.systemTheme,
    themes: THEMES,
    setTheme,
  }
}
