'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { SiteSearch } from '@/components/search/site-search'
import { useScrollActivity } from '@/components/mdx/use-scroll-activity'
import { cn } from '@/lib/utils'

const NAV_COLORS: Record<string, string> = {
  '/projects/': '#8b5cf6',
  '/blog/': '#f59e0b',
  '/lab/': '#f59e0b',
  '/hiking/': '#5b9e6f',
  '/about/': '#10b981',
}

const navLinks = [
  { href: '/projects/', prefix: '/projects', label: 'projects' },
  { href: '/blog/', prefix: '/blog', label: 'blog' },
  { href: '/lab/', prefix: '/lab', label: 'lab' },
  { href: '/hiking/', prefix: '/hiking', label: 'hiking' },
  { href: '/about/', prefix: '/about', label: 'about' },
]

/**
 * Site-wide top navigation. Pinned to the top of the viewport via
 * `sticky top-0 z-50` so it's always reachable without scrolling
 * back to the top.
 *
 * Responsive: the full link row shows from `sm` up. Below that the links
 * collapse behind a menu button (the desktop row would otherwise overflow a
 * ~390px viewport and pan the whole page sideways).
 *
 * Performance note (the big one): `backdrop-blur` is GPU-expensive
 * — on every scroll frame, the browser has to re-blur the region
 * underneath the nav. To avoid jank we swap the blur for a solid
 * background while actively scrolling and restore it 200ms after.
 */
export function SiteNav() {
  const scrolling = useScrollActivity(200)
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-[var(--color-border)]/60',
        scrolling
          ? 'bg-[var(--color-bg)]'
          : 'bg-[var(--color-bg)]/75 backdrop-blur-md backdrop-saturate-150',
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-4 text-sm sm:px-8">
        <Link
          href="/"
          className="font-display text-[1.05rem] font-bold tracking-tight"
          onClick={() => setOpen(false)}
        >
          ben ebsworth
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <nav className="hidden gap-6 font-mono text-[0.78rem] uppercase tracking-[0.18em] text-muted sm:flex">
            {navLinks.map(({ href, label, prefix }) => {
              const isActive = pathname.startsWith(prefix)
              const accent = NAV_COLORS[href]
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative transition-colors',
                    isActive
                      ? 'accent-ink after:absolute after:inset-x-0 after:-bottom-4 after:h-[2px] after:rounded-full after:bg-current'
                      : 'hover:text-fg/70',
                  )}
                  style={isActive ? ({ '--ink': accent } as React.CSSProperties) : undefined}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
          <SiteSearch />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-muted transition-colors hover:text-fg sm:hidden"
          >
            {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="border-t border-[var(--color-border)]/60 bg-[var(--color-bg)] px-6 py-3 sm:hidden"
        >
          <ul className="flex flex-col">
            {navLinks.map(({ href, label, prefix }) => {
              const isActive = pathname.startsWith(prefix)
              const accent = NAV_COLORS[href]
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'block py-2.5 font-mono text-sm uppercase tracking-[0.18em] transition-colors',
                      isActive ? 'accent-ink' : 'text-muted hover:text-fg',
                    )}
                    style={isActive ? ({ '--ink': accent } as React.CSSProperties) : undefined}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </header>
  )
}
