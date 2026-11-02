'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { SiteSearch } from '@/components/search/site-search'
import { cn } from '@/lib/utils'
import styles from './site-chrome.module.css'

const navLinks = [
  { href: '/projects/', prefix: '/projects', label: 'Projects' },
  { href: '/blog/', prefix: '/blog', label: 'Blog' },
  { href: '/lab/', prefix: '/lab', label: 'Lab' },
  { href: '/vectors/', prefix: '/vectors', label: 'Vectors' },
  { href: '/hiking/', prefix: '/hiking', label: 'Hiking' },
  { href: '/about/', prefix: '/about', label: 'About' },
]

/** Editorial navigation with measured sticky clearance and an accessible disclosure. */
export function SiteNav() {
  const pathname = usePathname()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const [previousPath, setPreviousPath] = useState(pathname)
  if (previousPath !== pathname) {
    setPreviousPath(pathname)
    setOpenPath(null)
  }
  const open = openPath === pathname
  const headerRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeMenu = () => setOpenPath(null)

  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const root = document.documentElement
    const measure = () => root.style.setProperty('--site-nav-height', `${header.getBoundingClientRect().height}px`)
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(header)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      root.style.setProperty('--site-nav-height', '0px')
    }
  }, [])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onBreakpoint = () => {
      if (!desktop.matches) return
      const focused = document.activeElement
      if (focused instanceof HTMLAnchorElement && focused.closest('#mobile-nav')) {
        const desktopLink = headerRef.current?.querySelector<HTMLAnchorElement>(`[data-desktop-nav] a[href="${focused.getAttribute('href')}"]`)
        desktopLink?.focus()
      } else if (focused === menuButtonRef.current) {
        const nav = headerRef.current?.querySelector('[data-desktop-nav]')
        const destination = nav?.querySelector<HTMLAnchorElement>('a[aria-current]') ?? nav?.querySelector<HTMLAnchorElement>('a')
        destination?.focus()
      }
      setOpenPath(null)
    }
    desktop.addEventListener('change', onBreakpoint)
    return () => desktop.removeEventListener('change', onBreakpoint)
  }, [])

  useEffect(() => {
    if (!open) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      setOpenPath(null)
      menuButtonRef.current?.focus()
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [open])

  return (
    <header
      ref={headerRef}
      data-site-nav=""
      className={styles.header}
    >
      <div className={styles.headerInner}>
        <Link
          href="/"
          className={styles.brand}
          onClick={closeMenu}
        >
          ben ebsworth
        </Link>
        <div className={styles.actions}>
          <nav aria-label="Primary" data-desktop-nav="" className={styles.desktopNav}>
            {navLinks.map(({ href, label, prefix }) => {
              const isActive = pathname === prefix || pathname.startsWith(`${prefix}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? (pathname === href || pathname === prefix ? 'page' : 'location') : undefined}
                  className={cn(styles.navLink, isActive && styles.active)}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
          <SiteSearch />
          <ThemeToggle variant="editorial" />
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpenPath(open ? null : pathname)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className={styles.menuButton}
          >
            {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      <nav
          id="mobile-nav"
          hidden={!open}
          aria-label="Primary"
          className={styles.mobileNav}
        >
          <ul className="flex flex-col">
            {navLinks.map(({ href, label, prefix }) => {
              const isActive = pathname === prefix || pathname.startsWith(`${prefix}/`)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive ? (pathname === href || pathname === prefix ? 'page' : 'location') : undefined}
                    onClick={closeMenu}
                    className={cn(styles.mobileLink, isActive && styles.active)}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
    </header>
  )
}
