'use client'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

/**
 * Sliding pill theme switch — a modernised port of the old site's
 * overreacted-style toggle. The thumb carries the *current* icon and slides
 * between a sun (light) and moon (dark) hint on the track; tap, click or
 * keyboard all flip the theme. Theme-token aware so it reads correctly in both
 * modes (the legacy one was hardcoded dark), `role="switch"` for a11y, with
 * press/hover feedback and a focus ring.
 *
 * Hydration: `resolvedTheme` is unknown on the server, so we render the light
 * state until mounted. `ready` (set one frame after mount) gates the slide
 * transition so the thumb snaps to the real position on load without an
 * animated jump, then animates for every user toggle after that.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setMounted(true)
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      data-ready={ready}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={
        'group relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer items-center rounded-full ' +
        'border border-[var(--color-border)] bg-[var(--color-surface-2)] px-[3px] ' +
        'shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)] outline-none transition-colors ' +
        'hover:border-[var(--color-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-fg)]/45 ' +
        'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ' +
        className
      }
    >
      {/* Destination hints on the track: the thumb sits over one end, so the
          visible icon is the mode you'd switch *to*. */}
      <Sun aria-hidden className="pointer-events-none absolute left-[7px] size-3 text-[var(--color-muted)] opacity-55" />
      <Moon aria-hidden className="pointer-events-none absolute right-[7px] size-3 text-[var(--color-muted)] opacity-55" />

      {/* Thumb — fg-colored disc (always high-contrast on the track in either
          theme), carrying the current icon in bg color. */}
      <span
        className={
          'relative z-10 grid size-[22px] place-items-center rounded-full bg-[var(--color-fg)] ' +
          'shadow-[0_1px_3px_rgba(0,0,0,0.4)] will-change-transform group-active:scale-90 ' +
          'motion-safe:group-data-[ready=true]:transition-transform motion-safe:duration-500 ' +
          'motion-safe:[transition-timing-function:cubic-bezier(.23,1,.32,1)]'
        }
        style={{ transform: isDark ? 'translateX(24px)' : 'translateX(0px)' }}
      >
        <Sun
          aria-hidden
          className="absolute size-[13px] text-[var(--color-bg)] transition-all duration-300"
          style={{ opacity: isDark ? 0 : 1, transform: isDark ? 'rotate(-90deg) scale(0.35)' : 'rotate(0) scale(1)' }}
        />
        <Moon
          aria-hidden
          className="absolute size-[13px] text-[var(--color-bg)] transition-all duration-300"
          style={{ opacity: isDark ? 1 : 0, transform: isDark ? 'rotate(0) scale(1)' : 'rotate(90deg) scale(0.35)' }}
        />
      </span>
    </button>
  )
}
