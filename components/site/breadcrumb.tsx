'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import styles from './site-chrome.module.css'

export type Crumb = { label: string; href?: string }

/** Readable ancestor links with measured, wrapping sticky clearance. */
export function Breadcrumb({
  items,
  className = '',
  sticky = true,
}: {
  items: Crumb[]
  className?: string
  sticky?: boolean
}) {
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!sticky || !navRef.current) return
    const nav = navRef.current
    const root = document.documentElement
    const measure = () => root.style.setProperty('--site-breadcrumb-height', `${nav.getBoundingClientRect().height}px`)
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(nav)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      root.style.setProperty('--site-breadcrumb-height', '0px')
    }
  }, [sticky])
  return (
    <nav
      ref={navRef}
      data-site-breadcrumb={sticky ? "" : undefined}
      aria-label="Breadcrumb"
      className={cn(
        styles.breadcrumb,
        sticky ? 'sticky top-[var(--site-nav-height,69px)] z-40' : '',
        className,
      )}
    >
      <div className={sticky ? styles.crumbInner : undefined}>
        <ol className={styles.crumbList}>
          {items.map((it, i) => {
            const last = i === items.length - 1
            return (
              <li key={i} className={styles.crumbItem}>
                {it.href && !last ? (
                  <Link href={it.href} className={styles.ancestor}>
                    {it.label}
                  </Link>
                ) : (
                  <span
                    aria-current={last ? 'page' : undefined}
                    className={
                      last
                        ? styles.current
                        : styles.ancestor
                    }
                  >
                    {it.label}
                  </span>
                )}
                {!last && (
                  <span aria-hidden className={styles.separator}>
                    /
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
