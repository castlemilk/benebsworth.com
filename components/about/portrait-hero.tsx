'use client'

import { useRef, useState, type CSSProperties } from 'react'

/**
 * Interactive hero portrait. The line-art SVG sits on a layered frame that
 * tilts in 3D toward the cursor, with a glare highlight + a duotone spotlight
 * that track the pointer — the line-art is recolored (the source is black
 * strokes, invisible on the dark canvas) and lit from the cursor.
 *
 * Touch / prefers-reduced-motion → fully static (no tilt, no glare). The
 * <img> is always rendered, so the /about/portrait.svg reference survives the
 * static export.
 */
export function PortraitHero({ accent = '#ff7a59' }: { accent?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  function reduced() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch' || reduced()) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--px', `${px * 100}%`)
    el.style.setProperty('--py', `${py * 100}%`)
    // tilt away from the pointer (max ~9°) for a tactile "card under glass" feel
    setTilt({ x: (0.5 - py) * 18, y: (px - 0.5) * 18 })
  }

  function onLeave() {
    setActive(false)
    setTilt({ x: 0, y: 0 })
  }

  const frameStyle: CSSProperties & Record<'--accent', string> = {
    '--accent': accent,
    transform: active
      ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.015)`
      : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
    transition:
      'transform 280ms cubic-bezier(0.16,1,0.3,1), box-shadow 280ms ease, border-color 280ms ease',
    transformStyle: 'preserve-3d',
    borderColor: active
      ? 'color-mix(in srgb, var(--accent) 60%, transparent)'
      : undefined,
    boxShadow: active
      ? '0 40px 90px -40px color-mix(in srgb, var(--accent) 70%, transparent)'
      : undefined,
  }

  return (
    <div className="relative mx-auto w-full max-w-[32rem] [perspective:1000px]">
      {/* ambient bloom behind the frame */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] opacity-70 blur-3xl"
        style={{
          background: `radial-gradient(60% 60% at 50% 30%, color-mix(in srgb, ${accent} 40%, transparent), transparent 72%)`,
        }}
      />

      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerEnter={(e) => {
          if (e.pointerType !== 'touch' && !reduced()) setActive(true)
        }}
        onPointerLeave={onLeave}
        style={frameStyle}
        className="group relative isolate aspect-square overflow-hidden rounded-[1.75rem] border border-white/12 bg-[radial-gradient(120%_120%_at_30%_0%,#16161d,#0c0c10)] will-change-transform"
      >
        {/* technical grid texture */}
        <span
          aria-hidden
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            maskImage: 'radial-gradient(80% 80% at 50% 45%, black, transparent 80%)',
          }}
        />

        {/* duotone spotlight tracking the pointer, sitting under the line-art */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(40% 40% at var(--px,50%) var(--py,40%), color-mix(in srgb, ${accent} 55%, transparent), transparent 70%)`,
          }}
        />

        {/* the portrait — recolored from black strokes to a bright accent line
            so it reads as a real focal point against the dark frame */}
        <img
          src="/about/portrait.svg"
          alt="Line-art portrait of Ben Ebsworth"
          width={480}
          height={480}
          className="absolute inset-0 block h-full w-full object-cover [filter:invert(1)_drop-shadow(0_0_18px_color-mix(in_srgb,var(--accent)_45%,transparent))]"
          style={{ transform: 'translateZ(40px) scale(1.04)' }}
        />

        {/* glare sweep tracking the pointer, above the art */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-soft-light opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(30% 30% at var(--px,50%) var(--py,50%), rgba(255,255,255,0.5), transparent 65%)',
            transform: 'translateZ(60px)',
          }}
        />

        {/* corner registration ticks — dossier detail */}
        <span aria-hidden className="absolute left-3 top-3 size-3 border-l border-t border-white/25" />
        <span aria-hidden className="absolute right-3 top-3 size-3 border-r border-t border-white/25" />
        <span aria-hidden className="absolute bottom-3 left-3 size-3 border-b border-l border-white/25" />
        <span aria-hidden className="absolute bottom-3 right-3 size-3 border-b border-r border-white/25" />

        {/* metadata strip */}
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-white/45 [transform:translateZ(50px)]">
          <span style={{ color: accent }}>subject · be</span>
          <span>plate 01</span>
        </span>
      </div>
    </div>
  )
}
