'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  /** stagger delay in ms */
  delay?: number
  /** wrapper element tag */
  as?: 'div' | 'li' | 'section' | 'article' | 'span'
  className?: string
}

/**
 * Scroll-reveal wrapper. Children are ALWAYS rendered (static-export / SSR safe);
 * we only animate the visual state. Initial state is pre-animation (opacity 0,
 * translateY) and an IntersectionObserver flips it to in-view on first sight.
 *
 * Resilience guarantees:
 * - threshold: 0 + generous rootMargin so elements reveal as they approach viewport
 * - Fallback timer: if observer hasn't fired within 700ms of mount, force reveal
 * - prefers-reduced-motion → reveal immediately, no transform
 * - If IntersectionObserver is unavailable, reveal immediately
 */
export function Reveal({ children, delay = 0, as = 'div', className }: RevealProps) {
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

    // Fallback timer: ensure content is never permanently hidden
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
  const Tag = as as 'div'

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(16px)',
        transition: reduced
          ? undefined
          : `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: visible ? undefined : 'opacity, transform',
      }}
    >
      {children}
    </Tag>
  )
}
