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
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
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
