'use client'

import { useRef, useState, type ReactNode, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type SpotlightCardProps = {
  children: ReactNode
  className?: string
  /** accent color used for the spotlight + border highlight */
  accent?: string
  /** max tilt in degrees (≤6) */
  maxTilt?: number
}

/**
 * Pointer-tracked card. Sets --mx/--my CSS vars for a soft radial highlight that
 * follows the cursor, plus a subtle tilt toward the pointer. Border brightens on
 * hover. Touch / reduced-motion → static (no tilt). Always renders children, so
 * the content is present in the static-exported HTML.
 */
export function SpotlightCard({
  children,
  className,
  accent = '#ffffff',
  maxTilt = 5,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
    const t = Math.max(0, Math.min(6, maxTilt))
    setTilt({ x: (0.5 - py) * 2 * t, y: (px - 0.5) * 2 * t })
  }

  function onLeave() {
    setHover(false)
    setTilt({ x: 0, y: 0 })
  }

  const style: CSSProperties & Record<'--accent', string> = {
    '--accent': accent,
    transform: hover
      ? `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
      : 'perspective(900px) rotateX(0deg) rotateY(0deg)',
    transition: 'transform 220ms cubic-bezier(0.16,1,0.3,1), border-color 220ms ease, box-shadow 220ms ease',
    borderColor: hover ? 'color-mix(in srgb, var(--accent) 55%, transparent)' : undefined,
    boxShadow: hover ? '0 18px 50px -28px color-mix(in srgb, var(--accent) 60%, transparent)' : undefined,
    // Lift the hovered (tilted, glowing) card above its siblings so the next
    // card never paints over its raised edge or hover-revealed labels.
    position: 'relative',
    zIndex: hover ? 20 : undefined,
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') setHover(true)
      }}
      onPointerLeave={onLeave}
      style={style}
      className={cn(
        'group/spot relative isolate overflow-hidden rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)]',
        className,
      )}
    >
      {/* soft pointer-tracked highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background:
            'radial-gradient(280px circle at var(--mx,50%) var(--my,50%), color-mix(in srgb, var(--accent) 16%, transparent), transparent 60%)',
        }}
      />
      {children}
    </div>
  )
}
