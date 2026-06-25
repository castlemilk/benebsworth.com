'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate } from 'animejs'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CATALOG, type ScaleObject } from '@/lib/lab/universe-scale/catalog'
import { MIN_LOG, MAX_LOG, log10, clamp, metresToHuman, schwarzschildRadius } from '@/lib/lab/universe-scale/scale'
import { createUniverseGL, type UniverseGL } from './gl/scene'

const FLAGSHIP = '/blog/universe-inside-a-black-hole/'

const SUN_MASS = 1.989e30
const MARKERS = [
  { id: 'schwarzschild', logM: log10(schwarzschildRadius(SUN_MASS)), label: '☉ rₛ',
    note: "The Sun's Schwarzschild radius. Squeeze the Sun inside 2.95 km and it becomes a black hole." },
  { id: 'planck', logM: log10(1.616e-35), label: 'Planck',
    note: 'The Planck length, where smooth spacetime dissolves into quantum foam.' },
] as const

const JUMPS: { id: string; label: string }[] = [
  { id: 'planck', label: 'Planck' }, { id: 'atom', label: 'Atom' }, { id: 'ant', label: 'Ant' },
  { id: 'human', label: 'Human' }, { id: 'earth', label: 'Earth' }, { id: 'sun', label: 'Sun' },
  { id: 'milkyway', label: 'Galaxy' }, { id: 'universe', label: 'Universe' },
]

function focusFor(viewLog: number): ScaleObject {
  let best = CATALOG[0], bestD = Infinity
  for (const o of CATALOG) {
    const d = Math.abs(log10(o.sizeMeters) - viewLog)
    if (d < bestD) { bestD = d; best = o }
  }
  return best
}
function logToInitial(focus?: string): number {
  if (!focus) return log10(8e-3)
  const byId = CATALOG.find((o) => o.id === focus)
  if (byId) return log10(byId.sizeMeters)
  const marker = MARKERS.find((m) => m.id === focus)
  if (marker) return marker.logM
  if (focus === 'ladder') return log10(1.7)
  const n = Number(focus)
  return isFinite(n) ? clamp(n, MIN_LOG, MAX_LOG) : log10(8e-3)
}

export function UniverseScaleStudio({
  height = 520, focus, embedded = false,
}: { height?: number; focus?: string; embedded?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<UniverseGL | null>(null)

  const viewLogRef = useRef<number>(logToInitial(focus))
  const tourRef = useRef<boolean>(false)
  const dirtyRef = useRef<boolean>(true)
  const inViewRef = useRef<boolean>(true)
  const reducedRef = useRef<boolean>(false)
  const animRef = useRef<{ pause?: () => void } | null>(null)

  const [viewLog, setViewLog] = useState<number>(viewLogRef.current)
  const [touring, setTouring] = useState(false)

  const setLog = useCallback((val: number) => {
    const c = clamp(val, MIN_LOG, MAX_LOG)
    viewLogRef.current = c
    dirtyRef.current = true
    setViewLog(c)
  }, [])

  const glideTo = useCallback((target: number, duration = 1500) => {
    animRef.current?.pause?.()
    const obj = { v: viewLogRef.current }
    animRef.current = animate(obj, {
      v: clamp(target, MIN_LOG, MAX_LOG), duration, ease: 'inOut(3)',
      onUpdate: () => { viewLogRef.current = obj.v; dirtyRef.current = true },
      onComplete: () => setViewLog(obj.v),
    }) as unknown as { pause?: () => void }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedRef.current = mq.matches
    const on = () => { reducedRef.current = mq.matches }
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { inViewRef.current = e.isIntersecting }, { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // GL engine: create, size, drive the render loop.
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    let engine: UniverseGL
    try {
      engine = createUniverseGL(canvas)
    } catch {
      return // WebGL unavailable — leave the canvas blank rather than crash
    }
    glRef.current = engine

    const sizeNow = () => {
      const r = wrap.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      engine.resize(Math.max(1, r.width), height, dpr)
      dirtyRef.current = true
    }
    sizeNow()
    const ro = new ResizeObserver(sizeNow)
    ro.observe(wrap)

    let raf = 0, lastReadout = 0, lastReadoutVal = viewLogRef.current
    const frame = (now: number) => {
      const live = inViewRef.current && !reducedRef.current
      if (now - lastReadout > 60 && Math.abs(viewLogRef.current - lastReadoutVal) > 0.001) {
        lastReadoutVal = viewLogRef.current; setViewLog(viewLogRef.current); lastReadout = now
      }
      if (live || dirtyRef.current) { engine.render(viewLogRef.current, now); dirtyRef.current = false }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => { cancelAnimationFrame(raf); ro.disconnect(); engine.dispose(); glRef.current = null }
  }, [height])

  const stopTour = useCallback(() => {
    if (tourRef.current) { tourRef.current = false; setTouring(false) }
    animRef.current?.pause?.()
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault(); stopTour(); setLog(viewLogRef.current + e.deltaY * 0.0016)
  }, [setLog, stopTour])

  const dragRef = useRef<{ y: number } | null>(null)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId); dragRef.current = { y: e.clientY }; stopTour()
  }, [stopTour])
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dy = e.clientY - dragRef.current.y; dragRef.current.y = e.clientY
    setLog(viewLogRef.current + dy * 0.01)
  }, [setLog])
  const onPointerUp = useCallback(() => { dragRef.current = null }, [])

  const toggleTour = useCallback(() => {
    if (tourRef.current) { stopTour(); return }
    setLog(log10(8e-3)); tourRef.current = true; setTouring(true)
    animRef.current?.pause?.()
    const obj = { v: log10(8e-3) }
    animRef.current = animate(obj, {
      v: log10(9.5e20), duration: 9000, ease: 'inOut(2)',
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
      className={cn('not-prose relative w-full overflow-hidden rounded-xl border border-[var(--color-border)]', embedded ? 'my-7' : '')}
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
          type="range" min={MIN_LOG} max={MAX_LOG} step={0.01} value={viewLog}
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
                focusObj.id === j.id ? 'border-[#818cf8] text-[#a5b4fc]' : 'border-white/15 text-white/55 hover:border-white/40 hover:text-white',
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
