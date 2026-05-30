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
 * prefers-reduced-motion → render visible immediately, no transform.
 */
export function Reveal({ children, delay = 0, as = 'div', className }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [inView, setInView] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      setReduced(true)
      return
    }
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true)
            obs.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
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
