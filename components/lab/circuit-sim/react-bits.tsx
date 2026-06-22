'use client'

import type { ReactNode } from 'react'

/**
 * ReactBits-style animated primitives (https://reactbits.dev), adapted for the
 * circuit-sim Studio call-to-action. Keyframes live in app/globals.css
 * (cs-star-*, cs-shine) and respect prefers-reduced-motion globally.
 */

interface StarBorderProps {
  children: ReactNode
  /** Star + glow colour. */
  color?: string
  /** Orbit duration, e.g. '4s'. */
  speed?: string
  className?: string
  onClick?: () => void
  title?: string
}

/** A pill whose top & bottom edges are traced by a travelling radial "star". */
export function StarBorder({ children, color = '#22c8ee', speed = '4s', className = '', onClick, title }: StarBorderProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`group relative inline-block overflow-hidden rounded-2xl p-[1.5px] outline-none transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50 ${className}`}
    >
      <span
        aria-hidden
        className="cs-star-bottom pointer-events-none absolute -bottom-3 -right-[250%] z-0 h-1/2 w-[300%] rounded-full opacity-70"
        style={{ background: `radial-gradient(circle, ${color}, transparent 12%)`, animationDuration: speed }}
      />
      <span
        aria-hidden
        className="cs-star-top pointer-events-none absolute -top-3 -left-[250%] z-0 h-1/2 w-[300%] rounded-full opacity-70"
        style={{ background: `radial-gradient(circle, ${color}, transparent 12%)`, animationDuration: speed }}
      />
      <span className="relative z-10 block rounded-[15px]">{children}</span>
    </button>
  )
}

interface ShinyTextProps {
  children: ReactNode
  /** Base (resting) text colour — also the colour shown under reduced motion. */
  base?: string
  /** Bright sweep colour. */
  shine?: string
  className?: string
}

/** Text with a diagonal highlight that sweeps across on a loop. */
export function ShinyText({ children, base = '#bfeaf6', shine = '#ffffff', className = '' }: ShinyTextProps) {
  return (
    <span
      className={`cs-shiny ${className}`}
      style={{ backgroundImage: `linear-gradient(110deg, ${base} 35%, ${shine} 50%, ${base} 65%)` }}
    >
      {children}
    </span>
  )
}
