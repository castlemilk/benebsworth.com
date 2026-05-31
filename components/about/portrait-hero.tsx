'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'

/**
 * Interactive hero portrait, two behaviors:
 *
 * 1. The framed "plate" tilts in 3D toward the cursor (≤~9°, smooth ease).
 * 2. Paint-reveal: the line-art SVG is the default visible layer; as the cursor
 *    moves over the card it paints the real photo in (a soft radial brush
 *    stamped into an offscreen accumulation mask), and on leave the painted
 *    photo fades back to the line-art. The two assets are pixel-registered
 *    (both 309×274) and both drawn with identical object-cover math so the
 *    line drawing visibly becomes the photo where painted.
 *
 * The rAF loop runs only while hovering or fading; idle = no per-frame work.
 *
 * prefers-reduced-motion → no tilt, no canvas: a calm CSS crossfade between
 * line-art and photo on hover. Touch / no-hover → just the line-art.
 *
 * Both <img>s (svg + jpg) are always rendered, so /about/portrait.svg and
 * /about/portrait.jpg references survive the static export.
 */

const IMG_W = 309
const IMG_H = 274

export function PortraitHero({ accent = '#ff7a59' }: { accent?: string }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const photoRef = useRef<HTMLImageElement>(null)

  const [active, setActive] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [reducedMotion, setReducedMotion] = useState(false)

  // canvas paint state, all in refs to avoid re-renders on the rAF loop
  const maskRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const fadingRef = useRef(false)
  const hoveringRef = useRef(false)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
  const lastPtRef = useRef<{ x: number; y: number } | null>(null)
  const fadeFramesRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Set up / size the canvases (dpr-aware) via ResizeObserver. Skipped under
  // reduced motion (the crossfade path uses no canvas).
  useEffect(() => {
    if (reducedMotion) return
    const frame = frameRef.current
    const canvas = canvasRef.current
    if (!frame || !canvas) return

    if (!maskRef.current) maskRef.current = document.createElement('canvas')
    const mask = maskRef.current

    const resize = () => {
      const r = frame.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(r.width))
      const h = Math.max(1, Math.round(r.height))
      sizeRef.current = { w, h, dpr }
      for (const c of [canvas, mask]) {
        c.width = Math.round(w * dpr)
        c.height = Math.round(h * dpr)
        const ctx = c.getContext('2d')
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(frame)
    return () => ro.disconnect()
  }, [reducedMotion])

  // cover-fit placement matching CSS object-cover for a 309×274 source
  function coverRect(w: number, h: number) {
    const scale = Math.max(w / IMG_W, h / IMG_H)
    const dw = IMG_W * scale
    const dh = IMG_H * scale
    return { dx: (w - dw) / 2, dy: (h - dh) / 2, dw, dh }
  }

  function renderFrame() {
    const canvas = canvasRef.current
    const mask = maskRef.current
    const photo = photoRef.current
    if (!canvas || !mask) return
    const { w, h } = sizeRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, w, h)

    if (photo && photo.complete && photo.naturalWidth > 0) {
      const { dx, dy, dw, dh } = coverRect(w, h)
      ctx.drawImage(photo, dx, dy, dw, dh)
      // keep the photo only where the mask has been painted
      ctx.globalCompositeOperation = 'destination-in'
      ctx.drawImage(mask, 0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  function loop() {
    const mask = maskRef.current
    if (!mask) {
      rafRef.current = null
      return
    }
    const { w, h } = sizeRef.current

    if (fadingRef.current) {
      // multiply the mask alpha down each frame until negligible, then stop
      const mctx = mask.getContext('2d')
      if (mctx) {
        mctx.globalCompositeOperation = 'destination-out'
        mctx.fillStyle = 'rgba(0,0,0,0.12)'
        mctx.fillRect(0, 0, w, h)
        mctx.globalCompositeOperation = 'source-over'
      }
    }

    renderFrame()

    if (hoveringRef.current || fadingRef.current) {
      // crude "is the mask still showing anything" check during fade: after
      // enough frames the destination-out has driven alpha to ~0; stop then.
      if (fadingRef.current && (fadeFramesRef.current += 1) > 40) {
        fadingRef.current = false
        fadeFramesRef.current = 0
        const mctx = mask.getContext('2d')
        if (mctx) mctx.clearRect(0, 0, w, h)
        renderFrame()
        rafRef.current = null
        return
      }
      rafRef.current = requestAnimationFrame(loop)
    } else {
      rafRef.current = null
    }
  }

  function ensureLoop() {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(loop)
  }

  // stamp a soft radial brush into the mask, interpolating from the last point
  // so fast moves produce a continuous stroke rather than dots
  function stamp(x: number, y: number) {
    const mask = maskRef.current
    if (!mask) return
    const mctx = mask.getContext('2d')
    if (!mctx) return
    const { w } = sizeRef.current
    const radius = Math.max(8, w * 0.18)

    const paintDot = (px: number, py: number) => {
      const g = mctx.createRadialGradient(px, py, 0, px, py, radius)
      g.addColorStop(0, 'rgba(255,255,255,0.32)')
      g.addColorStop(0.55, 'rgba(255,255,255,0.14)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      mctx.fillStyle = g
      mctx.beginPath()
      mctx.arc(px, py, radius, 0, Math.PI * 2)
      mctx.fill()
    }

    mctx.globalCompositeOperation = 'source-over'
    const last = lastPtRef.current
    if (last) {
      const dist = Math.hypot(x - last.x, y - last.y)
      const step = Math.max(1, radius * 0.35)
      const n = Math.min(24, Math.ceil(dist / step))
      for (let i = 1; i <= n; i++) {
        const t = i / n
        paintDot(last.x + (x - last.x) * t, last.y + (y - last.y) * t)
      }
    } else {
      paintDot(x, y)
    }
    lastPtRef.current = { x, y }
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch' || reducedMotion) return
    const el = frameRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const px = x / r.width
    const py = y / r.height
    // tilt toward the pointer (max ~9°)
    setTilt({ x: (0.5 - py) * 18, y: (px - 0.5) * 18 })

    fadingRef.current = false
    fadeFramesRef.current = 0
    stamp(x, y)
    ensureLoop()
  }

  function onEnter(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch') return
    setActive(true)
    // reduced motion → CSS crossfade only; skip the canvas paint loop
    if (reducedMotion) return
    hoveringRef.current = true
    fadingRef.current = false
    lastPtRef.current = null
  }

  function onLeave() {
    setActive(false)
    setTilt({ x: 0, y: 0 })
    if (reducedMotion) return
    hoveringRef.current = false
    lastPtRef.current = null
    fadingRef.current = true
    fadeFramesRef.current = 0
    ensureLoop()
  }

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const frameStyle: CSSProperties & Record<'--accent', string> = {
    '--accent': accent,
    transform:
      active && !reducedMotion
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
        ref={frameRef}
        onPointerMove={onMove}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        style={frameStyle}
        className="group relative isolate aspect-square overflow-hidden rounded-[1.75rem] border border-fg/12 bg-[radial-gradient(120%_120%_at_30%_0%,color-mix(in_srgb,var(--color-fg)_6%,var(--color-stage)),var(--color-stage))] will-change-transform"
      >
        {/* line-art portrait — the default visible layer. The source SVG is
            black strokes: on the light plate (light mode) they show directly;
            on the dark plate (dark mode) invert(1) turns them white so they read. */}
        <img
          src="/about/portrait.svg"
          alt="Portrait of Ben Ebsworth"
          width={IMG_W}
          height={IMG_H}
          draggable={false}
          className="absolute inset-0 block h-full w-full object-cover [filter:drop-shadow(0_0_18px_color-mix(in_srgb,var(--accent)_45%,transparent))] dark:[filter:invert(1)_drop-shadow(0_0_18px_color-mix(in_srgb,var(--accent)_45%,transparent))]"
          style={
            reducedMotion
              ? { transition: 'opacity 320ms ease', opacity: active ? 0 : 1 }
              : undefined
          }
        />

        {/* the real photo. Under normal motion it's invisible (opacity-0) and
            serves only as the drawImage source + static-export reference; the
            canvas paints it in. Under reduced motion it crossfades on hover. */}
        <img
          ref={photoRef}
          src="/about/portrait.jpg"
          alt=""
          aria-hidden
          width={IMG_W}
          height={IMG_H}
          draggable={false}
          className="pointer-events-none absolute inset-0 block h-full w-full object-cover"
          style={
            reducedMotion
              ? { transition: 'opacity 320ms ease', opacity: active ? 1 : 0 }
              : { opacity: 0 }
          }
        />

        {/* paint-reveal canvas — the photo shows only where painted. Hidden
            under reduced motion (crossfade handles that path). */}
        {!reducedMotion && (
          <canvas
            ref={canvasRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 block h-full w-full"
          />
        )}

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
          <span style={{ color: accent }}>subject · be</span>
          <span>plate 01</span>
        </span>
      </div>
    </div>
  )
}
