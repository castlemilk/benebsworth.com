'use client'
import { useEffect } from 'react'
import { subscribeTheme } from './theme-store'

/**
 * Keeps the page following OS theme changes and choices made in other tabs,
 * including on pages without a theme toggle. Renders nothing and holds no
 * state, so it never re-renders anything.
 */
export function ThemeSync() {
  useEffect(() => subscribeTheme(() => {}), [])
  return null
}
