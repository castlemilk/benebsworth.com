import { THEME_SCRIPT } from './theme-script'
import { ThemeSync } from './theme-sync'

/**
 * Applies the theme before first paint and keeps it in sync afterwards.
 *
 * Deliberately not a context provider: it wraps the route tree but never
 * re-renders it (see ./theme-store). Components read the theme with `useTheme`
 * from ./use-theme.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <ThemeSync />
      {children}
    </>
  )
}
