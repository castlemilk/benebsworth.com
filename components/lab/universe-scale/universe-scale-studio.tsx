'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { animate } from 'animejs'
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

const SUN_MASS = 1.989e30
const MARKERS = [
  { id: 'schwarzschild', logM: log10(schwarzschildRadius(SUN_MASS)), label: '☉ rₛ',
    note: "The Sun's Schwarzschild radius. Squeeze the Sun inside 2.95 km and it becomes a black hole." },
  { id: 'planck', logM: log10(1.616e-35), label: 'Planck',
    note: 'The Planck length, where smooth spacetime dissolves into quantum foam.' },
] as const

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
  quantum: '#0e7490', atomic: '#0f766e', human: '#3f6212', geographic: '#3f3f46',
  planetary: '#1e3a8a', stellar: '#854d0e', galactic: '#4c1d95', cosmic: '#312e81',
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
  if (!focus) return log10(8e-3) // start at the ant
  const byId = CATALOG.find((o) => o.id === focus)
  if (byId) return log10(byId.sizeMeters)
  const marker = MARKERS.find((m) => m.id === focus)
  if (marker) return marker.logM
  if (focus === 'ladder') return log10(1.7)
  const n = Number(focus)
  return isFinite(n) ? clamp(n, MIN_LOG, MAX_LOG) : log10(8e-3)
}

type Star = { x: number; y: number; z: number; tw: number }

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
  const colorsRef = useRef<{ fg: string; bg: string }>({ fg: '#e5e7eb', bg: '#06070d' })
  const dimsRef = useRef<{ w: number; h: number; dpr: number }>({ w: 1, h: 1, dpr: 1 })
  const inViewRef = useRef<boolean>(true)
  const reducedRef = useRef<boolean>(false)
  const starsRef = useRef<Star[]>([])
  const animRef = useRef<{ pause?: () => void } | null>(null)

  const [viewLog, setViewLog] = useState<number>(viewLogRef.current)
  const [touring, setTouring] = useState(false)

  // Precompute a starfield once.
  if (starsRef.current.length === 0) {
    const stars: Star[] = []
    for (let i = 0; i < 260; i++) {
      const u = Math.sin(i * 12.9898) * 43758.5453
      const v = Math.sin(i * 78.233) * 12543.123
      const w = Math.sin(i * 3.17) * 9871.23
      stars.push({
        x: u - Math.floor(u),
        y: v - Math.floor(v),
        z: 0.3 + 0.7 * (w - Math.floor(w)),
        tw: (Math.sin(i * 5.1) * 0.5 + 0.5) * Math.PI * 2,
      })
    }
    starsRef.current = stars
  }

  const setLog = useCallback((val: number) => {
    const c = clamp(val, MIN_LOG, MAX_LOG)
    viewLogRef.current = c
    dirtyRef.current = true
    setViewLog(c)
  }, [])

  // anime.js-eased glide to a target zoom.
  const glideTo = useCallback((target: number, duration = 1500) => {
    animRef.current?.pause?.()
    const obj = { v: viewLogRef.current }
    animRef.current = animate(obj, {
      v: clamp(target, MIN_LOG, MAX_LOG),
      duration,
      ease: 'inOut(3)',
      onUpdate: () => { viewLogRef.current = obj.v; dirtyRef.current = true },
      onComplete: () => { setViewLog(obj.v) },
    }) as unknown as { pause?: () => void }
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const cs = getComputedStyle(el)
    colorsRef.current = {
      fg: cs.getPropertyValue('--color-fg').trim() || '#e5e7eb',
      bg: cs.getPropertyValue('--color-bg').trim() || '#06070d',
    }
    dirtyRef.current = true
  }, [resolvedTheme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedRef.current = mq.matches
    const on = () => { reducedRef.current = mq.matches }
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

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
      dirtyRef.current = true
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [height])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { inViewRef.current = e.isIntersecting }, { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let lastReadout = 0

    const draw = (t: number) => {
      const { w, h, dpr } = dimsRef.current
      // The stage is always a dark space scene, so line-art + labels use a
      // fixed light ink regardless of the site theme.
      const fg = '#e6e9f2'
      const vlog = viewLogRef.current
      const focus = focusFor(vlog)
      const cx = w / 2
      const cy = h * 0.46
      const minDim = Math.min(w, h)
      const refPx = minDim * 0.34
      const horizonY = h * 0.62
      // 0 at planetary, 1 by galactic — drives the ground→space transition.
      const cosmic = clamp((vlog - 6.5) / (20.5 - 6.5), 0, 1)

      ctx.save()
      ctx.scale(dpr, dpr)

      // ── deep-space backdrop ────────────────────────────────────────
      const tint = REGIME_TINT[focus.regime] ?? '#1f2937'
      ctx.fillStyle = '#06070d'
      ctx.fillRect(0, 0, w, h)
      const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75)
      vg.addColorStop(0, tint + '30')
      vg.addColorStop(1, '#00000000')
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, w, h)

      // ── starfield (fades up as you go cosmic) ──────────────────────
      const starA = 0.12 + 0.72 * cosmic
      for (const s of starsRef.current) {
        const par = (1 - s.z) * 8
        const sx = ((s.x + Math.sin(t / 9000) * 0.02 * par) % 1) * w
        const sy = s.y * h
        const tw = 0.5 + 0.5 * Math.sin(t / 700 + s.tw)
        ctx.globalAlpha = starA * s.z * (0.5 + 0.5 * tw)
        ctx.fillStyle = '#dfe6ff'
        ctx.beginPath()
        ctx.arc(sx, sy, s.z * 1.3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // ── isometric ground grid (fades out as you go cosmic) ─────────
      const gridA = (1 - cosmic) * 0.5
      if (gridA > 0.01) {
        const cw = Math.max(34, w / 16)
        const ch = cw * 0.5
        const N = 9
        for (let a = -N; a <= N; a++) {
          for (const dir of [0, 1]) {
            const p0x = dir ? a : -N
            const p0z = dir ? -N : a
            const p1x = dir ? a : N
            const p1z = dir ? N : a
            const s0x = cx + (p0x - p0z) * cw
            const s0y = horizonY + (p0x + p0z) * ch * 0.5
            const s1x = cx + (p1x - p1z) * cw
            const s1y = horizonY + (p1x + p1z) * ch * 0.5
            const dist = (Math.abs(a) / N)
            ctx.strokeStyle = '#6366f1'
            ctx.globalAlpha = gridA * (1 - dist * 0.7) * 0.55
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(s0x, s0y)
            ctx.lineTo(s1x, s1y)
            ctx.stroke()
          }
        }
        ctx.globalAlpha = 1
      }

      // ── contact shadow under the focal model ───────────────────────
      const focusPx = apparentPx(focus.sizeMeters, vlog, refPx)
      const focusA = alphaFor(focusPx, minDim)
      if (gridA > 0.02 && focusA > 0.1) {
        ctx.globalAlpha = gridA * focusA * 0.5
        ctx.fillStyle = '#000000'
        ctx.beginPath()
        ctx.ellipse(cx, cy + focusPx * 0.5 + 8, focusPx * 0.42, focusPx * 0.12, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // ── the scale models, smallest first so larger layer over ──────
      for (const o of CATALOG) {
        const px = apparentPx(o.sizeMeters, vlog, refPx)
        let a = alphaFor(px, minDim)
        if (a <= 0.012) continue
        // Ghost objects larger than the frame so the next scale up reads as
        // faint context rather than swamping the focal model.
        if (px > minDim) a *= 0.4
        ctx.globalAlpha = a
        o.draw({ ctx, cx, cy, px, fg, t })
        ctx.globalAlpha = 1
      }

      // ── focus label + decade caption ───────────────────────────────
      ctx.globalAlpha = 1
      ctx.fillStyle = fg
      ctx.font = '600 15px ui-sans-serif, system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(focus.name, cx, cy + refPx * 0.72 + 26)

      for (const mk of MARKERS) {
        const d = Math.abs(mk.logM - vlog)
        if (d > 0.6) continue
        const pulse = 0.5 + 0.5 * Math.sin(t / 350)
        ctx.globalAlpha = (1 - d / 0.6) * (0.55 + 0.4 * pulse)
        ctx.fillStyle = '#818cf8'
        ctx.font = '600 12px ui-monospace, monospace'
        ctx.fillText('◇ ' + mk.label, cx, cy - refPx * 0.72 - 14)
        ctx.globalAlpha = 1
      }

      ctx.restore()
    }

    const frame = (now: number) => {
      const live = inViewRef.current && !reducedRef.current
      if (tourRef.current && live && now - lastReadout > 60) {
        setViewLog(viewLogRef.current); lastReadout = now
      }
      if (live || tourRef.current || dirtyRef.current) { draw(now); dirtyRef.current = false }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => { dirtyRef.current = true }, [resolvedTheme, viewLog, height])

  const stopTour = useCallback(() => {
    if (tourRef.current) { tourRef.current = false; setTouring(false) }
    animRef.current?.pause?.()
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    stopTour()
    setLog(viewLogRef.current + e.deltaY * 0.0016)
  }, [setLog, stopTour])

  const dragRef = useRef<{ y: number } | null>(null)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    dragRef.current = { y: e.clientY }
    stopTour()
  }, [stopTour])
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dy = e.clientY - dragRef.current.y
    dragRef.current.y = e.clientY
    setLog(viewLogRef.current + dy * 0.01)
  }, [setLog])
  const onPointerUp = useCallback(() => { dragRef.current = null }, [])

  const toggleTour = useCallback(() => {
    if (tourRef.current) { stopTour(); return }
    if (viewLogRef.current > log10(9.5e20) - 0.5) { viewLogRef.current = log10(8e-3) }
    setLog(log10(8e-3))
    tourRef.current = true
    setTouring(true)
    // anime.js drives the whole ant → galaxy glide.
    animRef.current?.pause?.()
    const obj = { v: log10(8e-3) }
    animRef.current = animate(obj, {
      v: log10(9.5e20),
      duration: 9000,
      ease: 'inOut(2)',
      onUpdate: () => { viewLogRef.current = obj.v; dirtyRef.current = true },
      onComplete: () => { tourRef.current = false; setTouring(false); setViewLog(obj.v) },
    }) as unknown as { pause?: () => void }
  }, [setLog, stopTour])

  const jump = useCallback((id: string) => {
    stopTour()
    const o = CATALOG.find((c) => c.id === id)
    if (o) { glideTo(log10(o.sizeMeters)); return }
    const mk = MARKERS.find((m) => m.id === id)
    if (mk) glideTo(mk.logM)
  }, [glideTo, stopTour])

  const focusObj = useMemo(() => focusFor(viewLog), [viewLog])
  const human = useMemo(() => metresToHuman(Math.pow(10, viewLog)), [viewLog])
  const nearMarker = MARKERS.find((m) => Math.abs(m.logM - viewLog) < 0.5)

  return (
    <div
      ref={wrapRef}
      className={cn(
        'not-prose relative w-full overflow-hidden rounded-xl border border-[var(--color-border)]',
        embedded ? 'my-7' : '',
      )}
      style={{ background: '#06070d' }}
    >
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

      <div className="pointer-events-none absolute left-3 top-3 max-w-[62%]">
        <div className="font-mono text-[0.7rem] uppercase tracking-wider text-white/45">scale</div>
        <div className="font-mono text-lg font-semibold text-white">
          {human.value} <span className="text-white/55">{human.unit}</span>
        </div>
        <div className="mt-0.5 text-sm font-medium text-white/90">{focusObj.name}</div>
        <div className="mt-0.5 text-xs leading-snug text-white/55">{focusObj.blurb}</div>
      </div>

      <button
        onClick={toggleTour}
        className="absolute right-3 top-3 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-white backdrop-blur transition-colors hover:border-white/50"
      >
        {touring ? '■ stop' : '▶ tour ant → galaxy'}
      </button>

      {nearMarker && (
        <Link
          href={FLAGSHIP}
          className="absolute bottom-[92px] left-1/2 max-w-[80%] -translate-x-1/2 rounded-lg border border-[#6366f1]/60 bg-black/70 px-3 py-1.5 text-center text-xs text-white backdrop-blur transition-colors hover:border-[#818cf8]"
        >
          <span className="font-mono text-[#a5b4fc]">◇ {nearMarker.label}</span>{' '}
          {nearMarker.note} <span className="text-[#a5b4fc]">→ read the essay</span>
        </Link>
      )}

      <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/55 px-3 py-2.5 backdrop-blur">
        <input
          type="range"
          min={MIN_LOG}
          max={MAX_LOG}
          step={0.01}
          value={viewLog}
          onChange={(e) => { stopTour(); setLog(parseFloat(e.target.value)) }}
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
                  ? 'border-[#818cf8] text-[#a5b4fc]'
                  : 'border-white/15 text-white/55 hover:border-white/40 hover:text-white',
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
