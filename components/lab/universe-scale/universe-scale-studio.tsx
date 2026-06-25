'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CATALOG, type ScaleObject } from '@/lib/lab/universe-scale/catalog'
import {
  MIN_LOG,
  MAX_LOG,
  log10,
  clamp,
  apparentPx,
  alphaFor,
  metresToHuman,
  schwarzschildRadius,
} from '@/lib/lab/universe-scale/scale'

const FLAGSHIP = '/blog/universe-inside-a-black-hole/'

// Essay-linked markers on the size axis.
const SUN_MASS = 1.989e30
const MARKERS = [
  {
    id: 'schwarzschild',
    logM: log10(schwarzschildRadius(SUN_MASS)), // ~3.47 (2.95 km)
    label: '☉ rₛ',
    note: 'The Sun\'s Schwarzschild radius. Squeeze the Sun inside 2.95 km and it becomes a black hole.',
  },
  {
    id: 'planck',
    logM: log10(1.616e-35), // -34.79
    label: 'Planck',
    note: 'The Planck length, where smooth spacetime is thought to dissolve into quantum foam.',
  },
] as const

// Jump targets across the ladder.
const JUMPS: { id: string; label: string }[] = [
  { id: 'planck', label: 'Planck' },
  { id: 'atom', label: 'Atom' },
  { id: 'ant', label: 'Ant' },
  { id: 'human', label: 'Human' },
  { id: 'earth', label: 'Earth' },
  { id: 'sun', label: 'Sun' },
  { id: 'milkyway', label: 'Galaxy' },
  { id: 'universe', label: 'Universe' },
]

const REGIME_TINT: Record<string, string> = {
  quantum: '#0e7490',
  atomic: '#0f766e',
  human: '#3f6212',
  geographic: '#3f3f46',
  planetary: '#1e3a8a',
  stellar: '#854d0e',
  galactic: '#4c1d95',
  cosmic: '#312e81',
}

function focusFor(viewLog: number): ScaleObject {
  let best = CATALOG[0]
  let bestD = Infinity
  for (const o of CATALOG) {
    const d = Math.abs(log10(o.sizeMeters) - viewLog)
    if (d < bestD) { bestD = d; best = o }
  }
  return best
}

function logToInitial(focus?: string): number {
  if (!focus) return log10(8e-3) // start at the ant, as requested
  const byId = CATALOG.find((o) => o.id === focus)
  if (byId) return log10(byId.sizeMeters)
  const marker = MARKERS.find((m) => m.id === focus)
  if (marker) return marker.logM
  if (focus === 'ladder') return log10(1.7)
  const n = Number(focus)
  return isFinite(n) ? clamp(n, MIN_LOG, MAX_LOG) : log10(8e-3)
}

export function UniverseScaleStudio({
  height = 520,
  focus,
  embedded = false,
}: {
  height?: number
  focus?: string
  embedded?: boolean
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { resolvedTheme } = useTheme()

  const viewLogRef = useRef<number>(logToInitial(focus))
  const tourRef = useRef<boolean>(false)
  const dirtyRef = useRef<boolean>(true)
  const colorsRef = useRef<{ fg: string; bg: string }>({ fg: '#e5e7eb', bg: '#0a0a0a' })
  const dimsRef = useRef<{ w: number; h: number; dpr: number }>({ w: 1, h: 1, dpr: 1 })
  const inViewRef = useRef<boolean>(true)
  const reducedRef = useRef<boolean>(false)

  const [viewLog, setViewLog] = useState<number>(viewLogRef.current)
  const [touring, setTouring] = useState(false)

  const setLog = useCallback((v: number) => {
    const c = clamp(v, MIN_LOG, MAX_LOG)
    viewLogRef.current = c
    dirtyRef.current = true
    setViewLog(c)
  }, [])

  // Read theme colours from CSS variables on mount + theme change.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const cs = getComputedStyle(el)
    const fg = cs.getPropertyValue('--color-fg').trim() || '#e5e7eb'
    const bg = cs.getPropertyValue('--color-bg').trim() || '#0a0a0a'
    colorsRef.current = { fg, bg }
  }, [resolvedTheme])

  // Reduced motion.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedRef.current = mq.matches
    const on = () => { reducedRef.current = mq.matches }
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Size canvas to container.
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      dimsRef.current = { w: r.width, h: height, dpr }
      canvas.width = Math.round(r.width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${r.width}px`
      canvas.style.height = `${height}px`
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [height])

  // Pause when off-screen.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { inViewRef.current = e.isIntersecting },
      { rootMargin: '120px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // The render loop.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let lastReadout = 0
    let lastT = 0

    const draw = (t: number) => {
      const { w, h, dpr } = dimsRef.current
      const { fg, bg } = colorsRef.current
      const viewLog = viewLogRef.current
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      // Background: regime tint wash.
      const focus = focusFor(viewLog)
      const tint = REGIME_TINT[focus.regime] ?? '#1f2937'
      const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
      grd.addColorStop(0, tint + '22')
      grd.addColorStop(1, bg + '00')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2
      const minDim = Math.min(w, h)
      const refPx = minDim * 0.4

      // Faint decade grid so the frame is never empty in size-gaps.
      ctx.strokeStyle = fg + '14'
      ctx.lineWidth = 1
      ctx.font = '10px ui-monospace, monospace'
      ctx.fillStyle = fg + '40'
      ctx.textAlign = 'center'
      for (let d = -3; d <= 2; d++) {
        const r = refPx * Math.pow(10, d)
        if (r < 4 || r > Math.max(w, h)) continue
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
        const m = metresToHuman(Math.pow(10, viewLog + d))
        if (d <= 0) ctx.fillText(`${m.value} ${m.unit}`, cx, cy - r - 4)
      }

      // Objects, smallest-first so larger ones layer over.
      for (const o of CATALOG) {
        const px = apparentPx(o.sizeMeters, viewLog, refPx)
        const a = alphaFor(px, minDim)
        if (a <= 0.012) continue
        ctx.globalAlpha = a
        o.draw({ ctx, cx, cy, px, fg, t })
        ctx.globalAlpha = 1
      }

      // Focus label centred under the silhouette.
      ctx.globalAlpha = 1
      ctx.fillStyle = fg
      ctx.font = '600 14px ui-sans-serif, system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(focus.name, cx, cy + refPx * 0.62 + 18)

      // Marker pulse when near one.
      for (const mk of MARKERS) {
        const d = Math.abs(mk.logM - viewLog)
        if (d > 0.6) continue
        const pulse = 0.5 + 0.5 * Math.sin(t / 350)
        ctx.globalAlpha = (1 - d / 0.6) * (0.5 + 0.4 * pulse)
        ctx.fillStyle = '#6366f1'
        ctx.font = '600 12px ui-monospace, monospace'
        ctx.fillText('◇ ' + mk.label, cx, cy - refPx * 0.62 - 12)
        ctx.globalAlpha = 1
      }

      ctx.restore()
    }

    const frame = (now: number) => {
      const dt = lastT ? Math.min(50, now - lastT) : 16
      lastT = now
      const animate = inViewRef.current && !reducedRef.current
      if (tourRef.current && animate) {
        // ~3 decades per second, ant -> galaxy.
        viewLogRef.current = clamp(viewLogRef.current + (dt / 1000) * 3, MIN_LOG, MAX_LOG)
        if (viewLogRef.current >= log10(9.5e20)) {
          tourRef.current = false
          setTouring(false)
        }
        if (now - lastReadout > 60) { setViewLog(viewLogRef.current); lastReadout = now }
      }
      if (animate || tourRef.current || dirtyRef.current) { draw(now); dirtyRef.current = false }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Mark dirty so the loop repaints on theme/value change even when idle
  // (e.g. for reduced-motion users who skip the continuous animation).
  useEffect(() => { dirtyRef.current = true }, [resolvedTheme, viewLog, height])

  // Wheel zoom.
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (tourRef.current) { tourRef.current = false; setTouring(false) }
    setLog(viewLogRef.current + e.deltaY * 0.0016)
  }, [setLog])

  // Drag (vertical) zoom.
  const dragRef = useRef<{ y: number } | null>(null)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    dragRef.current = { y: e.clientY }
  }, [])
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dy = e.clientY - dragRef.current.y
    dragRef.current.y = e.clientY
    if (tourRef.current) { tourRef.current = false; setTouring(false) }
    setLog(viewLogRef.current + dy * 0.01)
  }, [setLog])
  const onPointerUp = useCallback(() => { dragRef.current = null }, [])

  const toggleTour = useCallback(() => {
    if (tourRef.current) {
      tourRef.current = false
      setTouring(false)
    } else {
      // restart from the ant if we're already near the end
      if (viewLogRef.current > log10(9.5e20) - 0.5) setLog(log10(8e-3))
      tourRef.current = true
      setTouring(true)
    }
  }, [setLog])

  const jump = useCallback((id: string) => {
    if (tourRef.current) { tourRef.current = false; setTouring(false) }
    const o = CATALOG.find((c) => c.id === id)
    if (o) { setLog(log10(o.sizeMeters)); return }
    const mk = MARKERS.find((m) => m.id === id)
    if (mk) setLog(mk.logM)
  }, [setLog])

  const focusObj = useMemo(() => focusFor(viewLog), [viewLog])
  const human = useMemo(() => metresToHuman(Math.pow(10, viewLog)), [viewLog])
  const nearMarker = MARKERS.find((m) => Math.abs(m.logM - viewLog) < 0.5)

  return (
    <div
      ref={wrapRef}
      className={cn(
        'not-prose relative w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-surface',
        embedded ? 'my-7' : '',
      )}
    >
      {/* Canvas stage */}
      <canvas
        ref={canvasRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="block w-full cursor-ns-resize touch-none select-none"
        style={{ height }}
        aria-label="Universe scale explorer — scroll or drag to zoom from the Planck length to the observable universe"
      />

      {/* Readout (top-left) */}
      <div className="pointer-events-none absolute left-3 top-3 max-w-[60%]">
        <div className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">scale</div>
        <div className="font-mono text-lg font-semibold text-fg">
          {human.value} <span className="text-fg/60">{human.unit}</span>
        </div>
        <div className="mt-0.5 text-sm font-medium text-fg/90">{focusObj.name}</div>
        <div className="mt-0.5 text-xs leading-snug text-fg/55">{focusObj.blurb}</div>
      </div>

      {/* Tour button (top-right) */}
      <button
        onClick={toggleTour}
        className="absolute right-3 top-3 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/70 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-fg backdrop-blur transition-colors hover:border-[var(--color-muted)]"
      >
        {touring ? '■ stop' : '▶ tour ant → galaxy'}
      </button>

      {/* Essay marker callout */}
      {nearMarker && (
        <Link
          href={FLAGSHIP}
          className="absolute bottom-[92px] left-1/2 -translate-x-1/2 rounded-lg border border-[#6366f1]/50 bg-[var(--color-bg)]/85 px-3 py-1.5 text-center text-xs text-fg backdrop-blur transition-colors hover:border-[#6366f1]"
        >
          <span className="font-mono text-[#6366f1]">◇ {nearMarker.label}</span>{' '}
          {nearMarker.note} <span className="text-[#6366f1]">→ read the essay</span>
        </Link>
      )}

      {/* Controls dock (bottom) */}
      <div className="absolute inset-x-0 bottom-0 border-t border-[var(--color-border)] bg-[var(--color-bg)]/80 px-3 py-2.5 backdrop-blur">
        <input
          type="range"
          min={MIN_LOG}
          max={MAX_LOG}
          step={0.01}
          value={viewLog}
          onChange={(e) => {
            if (tourRef.current) { tourRef.current = false; setTouring(false) }
            setLog(parseFloat(e.target.value))
          }}
          className="w-full accent-[#6366f1]"
          aria-label="Zoom: log10 of size in metres"
        />
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {JUMPS.map((j) => (
            <button
              key={j.id}
              onClick={() => jump(j.id)}
              className={cn(
                'rounded-full border px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider transition-colors',
                focusObj.id === j.id
                  ? 'border-[#6366f1] text-[#6366f1]'
                  : 'border-[var(--color-border)] text-muted hover:border-[var(--color-muted)] hover:text-fg',
              )}
            >
              {j.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
