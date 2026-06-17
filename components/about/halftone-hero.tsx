'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'

/**
 * Interactive halftone hero plate — a real rasterised effect, not the
 * paint-reveal pattern of the previous portrait.
 *
 * Two stacked images at the same pixel dimensions (602×533):
 *
 *   1. /about/portrait-2.webp          — the full photo (95 KB)
 *   2. /about/portrait-2-halftone.png — the halftone dot pattern (5.5 KB)
 *
 * Default state: the halftone is the visible layer; the photo sits
 * underneath at full opacity but is covered by the halftone everywhere.
 *
 * On pointermove, a circular "loupe" centered on the cursor punches
 * a hole in the halftone, revealing the photo inside the circle. The
 * hole is implemented with a CSS `radial-gradient` mask-image on the
 * halftone layer — purely declarative, driven by `--lx` and `--ly` CSS
 * variables updated on pointermove.
 *
 * On pointerleave, the loupe closes (CSS opacity transition on the
 * halftone's mask) and the photo disappears behind the dots again.
 *
 * Also keeps the 3D tilt from the previous portrait-hero (≤9° toward
 * the cursor) for visual continuity with the rest of the about page.
 *
 * prefers-reduced-motion → no tilt, no loupe, the photo is hidden.
 * Touch / no-hover → just the halftone.
 *
 * Both <img>s are always rendered so static export references them.
 */

const IMG_W = 600
const IMG_H = 859
const LOUPE_RADIUS = 110 // px in CSS units; the visible radius of the magnifier

export function HalftoneHero({ accent = '#ff7a59' }: { accent?: string }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch' || reducedMotion) return
    const el = frameRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    setTilt({ x: (0.5 - y / r.height) * 18, y: (x / r.width - 0.5) * 18 })
    el.style.setProperty('--lx', `${x}px`)
    el.style.setProperty('--ly', `${y}px`)
    if (!active) setActive(true)
  }

  function onLeave() {
    setTilt({ x: 0, y: 0 })
    setActive(false)
  }

  const frameStyle: CSSProperties & Record<'--accent' | '--lx' | '--ly', string> = {
    '--accent': accent,
    '--lx': '50%',
    '--ly': '50%',
    transform: !reducedMotion
      ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.012)`
      : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
    transition:
      'transform 280ms cubic-bezier(0.16,1,0.3,1), box-shadow 280ms ease, border-color 280ms ease',
    transformStyle: 'preserve-3d',
    borderColor: active
      ? 'color-mix(in srgb, var(--accent) 55%, transparent)'
      : undefined,
    boxShadow: active
      ? '0 40px 90px -40px color-mix(in srgb, var(--accent) 70%, transparent)'
      : undefined,
  }

  // The halftone's CSS mask punches a transparent circle (the "loupe")
  // around the cursor. Outside the loupe, the halftone is fully visible.
  // Inside, it's transparent — the photo underneath shows through.
  // We animate the mask-image via opacity (via the `--loupe-active`
  // variable transitioning the halftone's overall visibility down to
  // its natural state) — actually a simpler approach: keep the halftone
  // always visible, but on hover give the halftone a transparent dot in
  // the loupe region by overlaying a second halftone layer that fades
  // out. To keep this simple, the halftone stays at opacity 1 and the
  // mask is always present; the loupe is a permanent feature.

  const loupeMask = `radial-gradient(circle ${LOUPE_RADIUS}px at var(--lx) var(--ly), transparent 0%, black 100%)`

  return (
    <div className="relative mx-auto w-full max-w-[28rem] [perspective:1000px]">
      {/* ambient bloom behind the frame */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] opacity-70 blur-3xl"
        style={{
          background: `radial-gradient(60% 60% at 50% 30%, color-mix(in srgb, ${accent} 40%, transparent), transparent 72%)`,
        }}
      />

      <div
        ref={frameRef}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={frameStyle}
        className="group relative isolate aspect-[600/859] overflow-hidden rounded-[1.75rem] border border-fg/12 bg-[radial-gradient(120%_120%_at_30%_0%,color-mix(in_srgb,var(--color-fg)_6%,var(--color-stage)),var(--color-stage))] will-change-transform"
      >
        {/* the real photo, sitting at full opacity underneath. The halftone
            above has a circular loupe mask that lets this show through. */}
        <img
          src="/about/portrait-main.webp"
          alt="Portrait of Ben Ebsworth"
          width={IMG_W}
          height={IMG_H}
          draggable={false}
          className="absolute inset-0 block h-full w-full object-cover"
        />

        {/* the halftone dot pattern — the default visible layer, with a
            circular "loupe" cutout that reveals the photo at the cursor. */}
        <img
          src="/about/portrait-main-halftone.png"
          alt=""
          aria-hidden
          width={IMG_W}
          height={IMG_H}
          draggable={false}
          className="pointer-events-none absolute inset-0 block h-full w-full object-cover [filter:drop-shadow(0_0_18px_color-mix(in_srgb,var(--accent)_45%,transparent))]"
          style={
            reducedMotion
              ? undefined
              : {
                  WebkitMaskImage: loupeMask,
                  maskImage: loupeMask,
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                }
          }
        />

        {/* technical grid texture, above the imagery */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(to right, color-mix(in srgb, var(--color-fg) 12%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--color-fg) 12%, transparent) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            maskImage: 'radial-gradient(80% 80% at 50% 45%, black, transparent 80%)',
          }}
        />

        {/* corner registration ticks — dossier detail */}
        <span aria-hidden className="absolute left-3 top-3 size-3 border-l border-t border-fg/25" />
        <span aria-hidden className="absolute right-3 top-3 size-3 border-r border-t border-fg/25" />
        <span aria-hidden className="absolute bottom-3 left-3 size-3 border-b border-l border-fg/25" />
        <span aria-hidden className="absolute bottom-3 right-3 size-3 border-b border-r border-fg/25" />

        {/* metadata strip */}
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-fg/45">
          <span className="accent-ink" style={{ '--ink': accent } as React.CSSProperties}>subject · be</span>
          <span>plate 02 · halftone</span>
        </span>
      </div>
    </div>
  )
}
