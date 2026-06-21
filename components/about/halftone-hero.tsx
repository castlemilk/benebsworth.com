'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'

/**
 * Paint-to-reveal portrait plate.
 *
 * Two stacked images at the same intrinsic dimensions (600×859):
 *
 *   1. /about/portrait-main.webp          — the full photo (the thing revealed)
 *   2. /about/portrait-main-halftone.png  — the halftone dot pattern (the cover)
 *
 * The photo sits underneath at full opacity. Over it is a <canvas> painted
 * with the halftone. Dragging across the canvas (mouse or touch) wipes the
 * halftone away with a soft brush — `destination-out` against an accumulating
 * "reveal mask" — so the photo shows through wherever it's been brushed. The
 * strokes ACCUMULATE: each interaction reveals a little more of the face.
 *
 * Persistence: the reveal mask is serialised to localStorage, so the work a
 * visitor does survives reloads. Once revealed coverage crosses a threshold,
 * the remaining halftone dissolves to a full reveal that is also persisted —
 * "the more you interact, the more it reveals, until it's fully revealed."
 *
 * A small reset tick in the metadata strip clears the persisted state so the
 * reveal can be replayed.
 *
 * Continuity: keeps the 3D tilt, ambient bloom, grid texture, registration
 * ticks and metadata strip of the previous portrait plate.
 *
 * prefers-reduced-motion → no tilt and no trailing glow, but painting still
 * works (it's interaction, not decoration). Both <img>s are always present in
 * the DOM so the static export references them and there is a graceful base
 * (the halftone) before the canvas takes over.
 */

const IMG_W = 600
const IMG_H = 859

// Reveal mask is stored at a fixed, viewport-independent resolution so the
// persisted state restores identically on any screen. A soft brush only needs
// a smooth low-res mask; this keeps the serialised PNG tiny (mostly empty).
const MASK_W = 320
const MASK_H = Math.round((MASK_W * IMG_H) / IMG_W) // 458

// Coverage (fraction of the mask painted) at which the rest auto-dissolves.
// The subject fills well over half of this tight portrait, so this triggers
// once the face itself is mostly developed — a handful of deliberate strokes.
const FINISH_AT = 0.55

const LS_MASK = 'about:portrait-reveal:v2:mask'
const LS_DONE = 'about:portrait-reveal:v2:done'

const HALFTONE_SRC = '/about/portrait-main-halftone.png'
const PHOTO_SRC = '/about/portrait-main.webp'

// Reading localStorage can THROW (sandboxed iframe, Safari "block all cookies",
// private mode) — not just on write. Guard the reads so a blocked-storage
// visitor still gets a fully interactive (just non-persistent) portrait.
const lsGet = (k: string): string | null => {
  try {
    return window.localStorage.getItem(k)
  } catch {
    return null
  }
}

export function HalftoneHero({ accent = '#ff7a59' }: { accent?: string }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const plateRef = useRef<HTMLCanvasElement>(null)

  // Offscreen source-of-truth for revealed alpha (white = revealed). Persisted.
  const maskRef = useRef<HTMLCanvasElement | null>(null)
  // The mask's 2D context, created ONCE with willReadFrequently so the throttled
  // getImageData coverage reads stay on a CPU-backed canvas (the flag is honored
  // only on the first getContext for a canvas, so it must be created here).
  const maskCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const halftoneRef = useRef<HTMLImageElement | null>(null)
  const dispRef = useRef({ w: 0, h: 0 }) // current CSS pixel size of the plate
  const paintingRef = useRef(false)
  const lastRef = useRef<{ x: number; y: number } | null>(null)
  const rafRef = useRef(0)
  const coverTimer = useRef(0)
  const saveTimer = useRef(0)

  const [reducedMotion, setReducedMotion] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false) // pointer down / painting
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const [coverage, setCoverage] = useState(0)
  const [touched, setTouched] = useState(false) // any paint happened this session/persisted

  // ── reduced-motion ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // ── render the visible plate from halftone + mask ───────────────────────
  const renderPlate = useCallback(() => {
    const plate = plateRef.current
    const half = halftoneRef.current
    const mask = maskRef.current
    if (!plate || !half || !mask) return
    const { w, h } = dispRef.current
    if (w === 0 || h === 0) return
    const ctx = plate.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    if (done) return // fully revealed → plate is empty, photo shows
    ctx.globalCompositeOperation = 'source-over'
    ctx.drawImage(half, 0, 0, w, h)
    // Subtract the revealed mask: holes where the visitor has brushed.
    ctx.globalCompositeOperation = 'destination-out'
    ctx.drawImage(mask, 0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
  }, [done])

  // ── size the plate backing store to its CSS box (dpr-aware) ─────────────
  const resize = useCallback(() => {
    const plate = plateRef.current
    const frame = frameRef.current
    if (!plate || !frame) return
    const r = frame.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    dispRef.current = { w: r.width, h: r.height }
    plate.width = Math.round(r.width * dpr)
    plate.height = Math.round(r.height * dpr)
    renderPlate()
  }, [renderPlate])

  // ── compute coverage from the mask (throttled by callers) ───────────────
  const measureCoverage = useCallback(() => {
    const ctx = maskCtxRef.current
    if (!ctx) return 0
    const { data } = ctx.getImageData(0, 0, MASK_W, MASK_H)
    let on = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] > 120) on++
    const cov = on / (MASK_W * MASK_H)
    setCoverage(cov)
    return cov
  }, [])

  const persistMask = useCallback(() => {
    const mask = maskRef.current
    if (!mask) return
    try {
      window.localStorage.setItem(LS_MASK, mask.toDataURL('image/png'))
    } catch {
      /* quota / privacy mode — non-fatal, reveal just won't persist */
    }
  }, [])

  const finish = useCallback(() => {
    setDone(true)
    try {
      window.localStorage.setItem(LS_DONE, '1')
      window.localStorage.removeItem(LS_MASK)
    } catch {
      /* non-fatal */
    }
  }, [])

  // ── init: load halftone, restore persisted state ────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    let alive = true

    // offscreen mask canvas — context created once with the readback flag
    const mask = document.createElement('canvas')
    mask.width = MASK_W
    mask.height = MASK_H
    maskRef.current = mask
    maskCtxRef.current = mask.getContext('2d', { willReadFrequently: true })

    const loadImg = (src: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image()
        img.onload = () => res(img)
        img.onerror = rej
        img.src = src
      })

    ;(async () => {
      try {
        const half = await loadImg(HALFTONE_SRC)
        if (!alive) return
        halftoneRef.current = half

        const isDone = lsGet(LS_DONE) === '1'
        if (isDone) {
          setDone(true)
          setTouched(true)
          setCoverage(1)
        } else {
          const saved = lsGet(LS_MASK)
          if (saved) {
            try {
              const m = await loadImg(saved)
              if (!alive) return
              maskCtxRef.current?.drawImage(m, 0, 0, MASK_W, MASK_H)
              const cov = measureCoverage()
              if (cov > 0) setTouched(true)
            } catch {
              /* corrupt mask — ignore, start fresh */
            }
          }
        }
        if (!alive) return
        setReady(true)
        resize()
      } catch {
        /* halftone failed to load — the <img> fallback below still shows */
      }
    })()

    return () => {
      alive = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keep the plate sized to the frame
  useEffect(() => {
    if (!ready) return
    const frame = frameRef.current
    if (!frame) return
    resize()
    const ro = new ResizeObserver(() => resize())
    ro.observe(frame)
    window.addEventListener('resize', resize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [ready, resize])

  // re-render when `done` flips (e.g. after finish)
  useEffect(() => {
    if (ready) renderPlate()
  }, [done, ready, renderPlate])

  // ── painting ────────────────────────────────────────────────────────────
  // Soft white dab into the mask (accumulates), interpolated along the drag so
  // fast strokes leave no gaps. Coords are in mask space.
  const dab = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.65, 'rgba(255,255,255,0.92)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  const paint = useCallback(
    (px: number, py: number) => {
      const ctx = maskCtxRef.current
      const { w, h } = dispRef.current
      if (!ctx || w === 0) return
      const s = MASK_W / w // uniform scale (mask aspect == display aspect)
      const mx = px * s
      const my = py * s
      // brush radius: a comfortable fraction of the plate, mapped into mask px
      const dispR = Math.min(Math.max(Math.min(w, h) * 0.17, 26), 96)
      const mr = dispR * s
      ctx.globalCompositeOperation = 'source-over'
      const prev = lastRef.current
      if (prev) {
        const x0 = prev.x * s
        const y0 = prev.y * s
        const dist = Math.hypot(mx - x0, my - y0)
        const steps = Math.max(1, Math.floor(dist / (mr * 0.35)))
        for (let i = 1; i <= steps; i++) {
          const t = i / steps
          dab(ctx, x0 + (mx - x0) * t, y0 + (my - y0) * t, mr)
        }
      } else {
        dab(ctx, mx, my, mr)
      }
      lastRef.current = { x: px, y: py }

      if (!touched) setTouched(true)
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0
          renderPlate()
        })
      }
      // throttle coverage measurement + auto-finish check
      const now = performance.now()
      if (now - coverTimer.current > 120) {
        coverTimer.current = now
        const cov = measureCoverage()
        if (cov >= FINISH_AT && !done) finish()
      }
    },
    [touched, renderPlate, measureCoverage, done, finish],
  )

  const pointerToFrame = (e: React.PointerEvent) => {
    const r = frameRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, r }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (done) return
    const { x, y } = pointerToFrame(e)
    frameRef.current?.setPointerCapture?.(e.pointerId)
    paintingRef.current = true
    lastRef.current = null
    setActive(true)
    paint(x, y)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { x, y, r } = pointerToFrame(e)
    // tilt toward the cursor (desktop, non-touch) — purely decorative
    if (e.pointerType !== 'touch' && !reducedMotion) {
      setTilt({ x: (0.5 - y / r.height) * 14, y: (x / r.width - 0.5) * 14 })
    }
    const frame = frameRef.current
    if (frame) {
      frame.style.setProperty('--lx', `${x}px`)
      frame.style.setProperty('--ly', `${y}px`)
    }
    if (paintingRef.current && !done) paint(x, y)
  }

  const endStroke = useCallback(() => {
    if (!paintingRef.current) return
    paintingRef.current = false
    lastRef.current = null
    setActive(false)
    if (done) return
    const cov = measureCoverage()
    if (cov >= FINISH_AT) {
      finish()
      return
    }
    // debounce the (relatively heavy) toDataURL save to stroke-end
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(persistMask, 60)
  }, [done, measureCoverage, finish, persistMask])

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    frameRef.current?.releasePointerCapture?.(e.pointerId)
    endStroke()
  }

  const onPointerLeave = () => {
    setTilt({ x: 0, y: 0 })
    endStroke()
  }

  const reset = () => {
    try {
      window.localStorage.removeItem(LS_MASK)
      window.localStorage.removeItem(LS_DONE)
    } catch {
      /* non-fatal */
    }
    maskCtxRef.current?.clearRect(0, 0, MASK_W, MASK_H)
    setDone(false)
    setTouched(false)
    setCoverage(0)
    lastRef.current = null
    // renderPlate runs via the `done` effect; also redraw now for the no-flip case
    requestAnimationFrame(renderPlate)
  }

  // ── styles ──────────────────────────────────────────────────────────────
  const frameStyle: CSSProperties & Record<'--accent' | '--lx' | '--ly', string> = {
    '--accent': accent,
    '--lx': '50%',
    '--ly': '50%',
    transform: !reducedMotion
      ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.012)`
      : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
    transition: 'transform 280ms cubic-bezier(0.16,1,0.3,1), box-shadow 280ms ease, border-color 280ms ease',
    transformStyle: 'preserve-3d',
    // pan-y (not none) so a vertical swipe still scrolls the page past this tall
    // hero — only horizontal "wipe" gestures are claimed for developing the
    // photo. Avoids trapping scroll for first-time mobile visitors.
    touchAction: done ? undefined : 'pan-y',
    cursor: done ? 'default' : 'crosshair',
    borderColor: active ? 'color-mix(in srgb, var(--accent) 55%, transparent)' : undefined,
    boxShadow: active ? '0 40px 90px -40px color-mix(in srgb, var(--accent) 70%, transparent)' : undefined,
  }

  const pct = Math.round(Math.min(1, coverage) * 100)

  return (
    <div className="relative mx-auto w-full max-w-[26rem] sm:max-w-[28rem] [perspective:1000px]">
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerUp}
        style={frameStyle}
        className="group relative isolate aspect-[600/859] select-none overflow-hidden rounded-[1.75rem] border border-fg/12 bg-[radial-gradient(120%_120%_at_30%_0%,color-mix(in_srgb,var(--color-fg)_6%,var(--color-stage)),var(--color-stage))] will-change-transform"
      >
        {/* the real photo, full opacity underneath — what the brush reveals */}
        <img
          src={PHOTO_SRC}
          alt="Portrait of Ben Ebsworth"
          width={IMG_W}
          height={IMG_H}
          draggable={false}
          className="pointer-events-none absolute inset-0 block h-full w-full object-cover"
        />

        {/* static halftone — the graceful base before the canvas is ready
            (SSR / static export / no-JS). Hidden once the canvas takes over. */}
        <img
          src={HALFTONE_SRC}
          alt=""
          aria-hidden
          width={IMG_W}
          height={IMG_H}
          draggable={false}
          className="pointer-events-none absolute inset-0 block h-full w-full object-cover transition-opacity duration-300 [filter:drop-shadow(0_0_18px_color-mix(in_srgb,var(--accent)_45%,transparent))]"
          style={{ opacity: ready ? 0 : 1 }}
        />

        {/* the paintable plate: halftone with accumulating holes */}
        <canvas
          ref={plateRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 block h-full w-full transition-opacity duration-700 ease-out [filter:drop-shadow(0_0_18px_color-mix(in_srgb,var(--accent)_45%,transparent))]"
          style={{ opacity: ready && !done ? 1 : 0 }}
        />

        {/* trailing brush glow — follows the cursor while painting (decorative) */}
        {!reducedMotion && !done && (
          <span
            aria-hidden
            className="pointer-events-none absolute -z-0 h-40 w-40 rounded-full transition-opacity duration-200"
            style={{
              left: 'var(--lx)',
              top: 'var(--ly)',
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 36%, transparent), transparent 70%)',
              opacity: active ? 1 : 0,
            }}
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

        {/* "drag to develop" hint — fades out once the visitor starts painting */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-mono text-[0.62rem] uppercase tracking-[0.3em] text-fg/55 transition-opacity duration-500"
          style={{ opacity: ready && !touched && !done ? 1 : 0 }}
        >
          <span className="rounded-full bg-bg/40 px-3 py-1.5 backdrop-blur-sm">drag to develop ↯</span>
        </span>

        {/* metadata strip */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-fg/45">
          <span className="accent-ink" style={{ '--ink': accent } as React.CSSProperties}>
            subject · be
          </span>
          {touched && !done ? (
            <span className="tabular-nums">reveal · {pct}%</span>
          ) : done ? (
            <button
              type="button"
              onClick={reset}
              className="pointer-events-auto cursor-pointer uppercase tracking-[0.22em] text-fg/45 transition-colors hover:text-fg/80"
              aria-label="Reset the portrait reveal"
            >
              ↺ reset
            </button>
          ) : (
            <span>plate 02 · halftone</span>
          )}
        </span>
      </div>
    </div>
  )
}
