'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { useScrollActivity } from '@/components/mdx/use-scroll-activity'
import { cn } from '@/lib/utils'

/**
 * Site-wide top navigation. Pinned to the top of the viewport via
 * `sticky top-0 z-50` so it's always reachable without scrolling
 * back to the top.
 *
 * Performance note (the big one): `backdrop-blur` is GPU-expensive
 * — on every scroll frame, the browser has to re-blur the region
 * underneath the nav. On a long page with lots of SVG / animation
 * underneath (this site has 6 NeuralGraphs, a ColorLegend, a
 * ZooMiniMap, etc.), that blur pass can blow past the 16ms frame
 * budget and produce visible jank.
 *
 * To avoid this, we dynamically swap the `backdrop-blur` class in
 * for a solid background while the user is actively scrolling,
 * and swap it back in 200ms after the scroll stops. The solid
 * background is opaque enough that the text underneath isn't
 * visible during scroll, but it skips the blur pass entirely.
 * When the scroll settles, the nice frosted-glass look returns.
 */
export function SiteNav() {
  const scrolling = useScrollActivity(200)
  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-[var(--color-border)]/60',
        scrolling
          ? // Active scroll: solid background, no blur. Cheapest possible.
            'bg-[var(--color-bg)]'
          : // Idle: frosted glass — the look the user sees most of the time.
            'bg-[var(--color-bg)]/75 backdrop-blur-md backdrop-saturate-150',
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-sm sm:px-8">
        <Link href="/" className="font-display text-[1.05rem] font-bold tracking-tight">
          ben ebsworth
        </Link>
        <div className="flex items-center gap-4">
          <nav className="flex gap-6 font-mono text-[0.78rem] uppercase tracking-[0.18em] text-muted">
            <Link href="/projects/" className="hover:text-project transition-colors">
              projects
            </Link>
            <Link href="/blog/" className="hover:text-blog transition-colors">
              blog
            </Link>
            <Link href="/about/" className="hover:text-about transition-colors">
              about
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
