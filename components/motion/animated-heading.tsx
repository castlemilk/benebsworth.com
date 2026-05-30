'use client'

import { useEffect, useRef, useState, type ElementType } from 'react'
import { cn } from '@/lib/utils'

type AnimatedHeadingProps = {
  text: string
  as?: ElementType
  className?: string
  /** per-word stagger in ms */
  stagger?: number
}

/**
 * Section heading whose words fade + rise in on first view (staggered).
 * Words are always rendered (SSR / static-export safe) — only the visual
 * state animates. prefers-reduced-motion → plain, fully visible.
 *
 * Resilience guarantees:
 * - threshold: 0 + generous rootMargin so headings reveal as they approach viewport
 * - Fallback timer: if observer hasn't fired within 700ms of mount, force reveal
 * - prefers-reduced-motion → reveal immediately, no transform
 * - If IntersectionObserver is unavailable, reveal immediately
 */
export function AnimatedHeading({
  text,
  as,
  className,
  stagger = 60,
}: AnimatedHeadingProps) {
  const Tag = (as ?? 'h2') as ElementType
  const ref = useRef<HTMLElement | null>(null)
  const [inView, setInView] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    // prefers-reduced-motion: reveal immediately, no animation
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      setReduced(true)
      return
    }

    // If IntersectionObserver is unavailable, reveal immediately
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const el = ref.current
    if (!el) {
      setInView(true)
      return
    }

    let revealed = false

    const reveal = () => {
      if (!revealed) {
        revealed = true
        setInView(true)
      }
    }

    // Fallback timer: ensure heading is never permanently hidden
    const fallbackTimer = setTimeout(reveal, 700)

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            clearTimeout(fallbackTimer)
            obs.disconnect()
            reveal()
          }
        }
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' },
    )
    obs.observe(el)

    return () => {
      clearTimeout(fallbackTimer)
      obs.disconnect()
    }
  }, [])

  const visible = reduced || inView
  const words = text.split(' ')

  return (
    <Tag ref={ref} className={cn('flex flex-wrap', className)}>
      {words.map((w, i) => (
        <span key={i} className="inline-flex overflow-hidden pb-1 pr-[0.28em] last:pr-0">
          <span
            style={{
              display: 'inline-block',
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(0.9em)',
              transition: reduced
                ? undefined
                : `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${i * stagger}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${i * stagger}ms`,
            }}
          >
            {w}
          </span>
        </span>
      ))}
    </Tag>
  )
}
