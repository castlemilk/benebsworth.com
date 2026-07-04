'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useScrollActivity } from '@/components/mdx/use-scroll-activity'
import { createBlackHoleGL, type BlackHoleGL } from './gl/scene'
import {
  PRESETS,
  getPreset,
  DISPLAY_TPEAK_K,
  schwarzschildRadius,
  shadowDiameter,
  shadowAngularMicroArcsec,
  diskPeakTemp,
  wienPeak,
  iscoPeriodSeconds,
  eddingtonLuminosity,
  spectralBand,
  formatLength,
  formatTime,
  formatMassMsun,
  formatPower,
  formatWavelength,
  fmtSci,
} from './physics'

const ACCENT = '#6366f1' // cosmology accent

type Quality = 'low' | 'med' | 'high'
const QUALITY: Record<Quality, { steps: number; scale: (dpr: number) => number }> = {
  low: { steps: 180, scale: (dpr) => 0.5 * dpr },
  med: { steps: 200, scale: (dpr) => Math.min(1.5, 0.75 * dpr) },
  high: { steps: 320, scale: (dpr) => Math.min(2, dpr) },
}

const MIN_DIST = 10
const MAX_DIST = 50
const MAX_INCL_RAD = (88 * Math.PI) / 180

const DEFAULT_PRESET = PRESETS.find((p) => p.id === 'gargantua')!

function Slider({
  label, display, min, max, step, value, onChange,
}: {
  label: string
  display: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted">{label}</span>
        <span className="font-mono text-[0.65rem] tabular-nums text-fg/80">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full accent-[#6366f1]"
        aria-label={label}
      />
    </label>
  )
}

function Readout({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <div className="font-mono text-[0.6rem] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 font-mono text-[0.76rem] text-fg/90">{value}</div>
      {note && <div className="mt-0.5 font-mono text-[0.62rem] text-[#818cf8]">{note}</div>}
    </div>
  )
}

export function BlackHoleStudio({ embed = false }: { embed?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<BlackHoleGL | null>(null)

  // ── control state (Gargantua preset by default: the cinematic look) ────
  const [presetId, setPresetId] = useState<string>(DEFAULT_PRESET.id)
  const [logMass, setLogMass] = useState<number>(Math.log10(DEFAULT_PRESET.massMsun))
  const [logMdot, setLogMdot] = useState<number>(Math.log10(DEFAULT_PRESET.mdot))
  const [innerRs, setInnerRs] = useState(3.0) // in rs; ISCO = 3 rs → 6 sim units
  const [outerRs, setOuterRs] = useState(10.0) // in rs → 20 sim units
  const [inclDeg, setInclDeg] = useState(8)
  const [beaming, setBeaming] = useState(DEFAULT_PRESET.beaming)
  const [exposure, setExposure] = useState(1.0)
  const [quality, setQuality] = useState<Quality>('med')
  const [refDist, setRefDist] = useState<{ m: number; label: string }>({
    m: DEFAULT_PRESET.distanceM,
    label: DEFAULT_PRESET.distanceLabel,
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isFs, setIsFs] = useState(false)

  // ── refs the rAF loop reads (no re-render on drag/zoom) ────────────────
  const azRef = useRef(0)
  const inclRef = useRef((8 * Math.PI) / 180)
  const distRef = useRef(34)
  const dirtyRef = useRef(true)
  const inViewRef = useRef(true)
  const reducedRef = useRef(false)
  const scrollingRef = useRef(false)
  const qualityRef = useRef<Quality>('med')
  const resizeRef = useRef<(() => void) | null>(null)
  const settingsRef = useRef({
    innerR: 6.0,
    outerR: 20.0,
    tPeakK: diskPeakTemp(DEFAULT_PRESET.massMsun, DEFAULT_PRESET.mdot),
    tClr: 1,
    beaming: DEFAULT_PRESET.beaming,
    exposure: 1.0,
    steps: QUALITY.med.steps,
  })

  // ── derived physics (SI readout; the geometry stays scale-free) ────────
  const mass = useMemo(() => Math.pow(10, logMass), [logMass])
  const mdot = useMemo(() => Math.pow(10, logMdot), [logMdot])
  const tPeak = useMemo(() => diskPeakTemp(mass, mdot), [mass, mdot])
  const rs = useMemo(() => schwarzschildRadius(mass), [mass])
  const thetaMuas = useMemo(() => shadowAngularMicroArcsec(mass, refDist.m), [mass, refDist])
  const lambda = useMemo(() => wienPeak(tPeak), [tPeak])
  const activePreset = getPreset(presetId)

  // sync shader settings whenever a control changes
  useEffect(() => {
    settingsRef.current = {
      innerR: innerRs * 2, // rs = 2 sim units
      outerR: outerRs * 2,
      tPeakK: tPeak,
      tClr: Math.min(1, DISPLAY_TPEAK_K / tPeak),
      beaming,
      exposure,
      steps: QUALITY[quality].steps,
    }
    dirtyRef.current = true
  }, [innerRs, outerRs, tPeak, beaming, exposure, quality])

  useEffect(() => {
    inclRef.current = Math.min(MAX_INCL_RAD, Math.max(0, (inclDeg * Math.PI) / 180))
    dirtyRef.current = true
  }, [inclDeg])

  useEffect(() => {
    qualityRef.current = quality
    resizeRef.current?.()
  }, [quality])

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

  // embeds pause while the page is scrolling (rAF hands the frame budget back)
  const scrolling = useScrollActivity()
  useEffect(() => {
    scrollingRef.current = embed && scrolling
  }, [embed, scrolling])

  useEffect(() => {
    const on = () => setIsFs(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  const toggleFs = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    else canvasWrapRef.current?.requestFullscreen?.().catch(() => {})
  }, [])

  // ── GL engine: create, size, drive the render loop ─────────────────────
  useEffect(() => {
    const wrap = canvasWrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    let engine: BlackHoleGL
    try {
      engine = createBlackHoleGL(canvas)
    } catch {
      return // WebGL2 unavailable — leave the canvas blank rather than crash
    }
    glRef.current = engine

    const sizeNow = () => {
      const r = wrap.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      engine.resize(Math.max(1, r.width), Math.max(1, r.height), QUALITY[qualityRef.current].scale(dpr))
      dirtyRef.current = true
    }
    sizeNow()
    resizeRef.current = sizeNow
    const ro = new ResizeObserver(sizeNow)
    ro.observe(wrap)

    let raf = 0
    let lastSync = 0
    const frame = (now: number) => {
      const live = inViewRef.current && !reducedRef.current && !scrollingRef.current
      if (live || dirtyRef.current) {
        engine.render(
          {
            camAz: azRef.current,
            camIncl: inclRef.current,
            camDist: distRef.current,
            ...settingsRef.current,
          },
          now,
        )
        dirtyRef.current = false
      }
      // keep the inclination slider in sync with drag-orbiting (throttled)
      if (now - lastSync > 120) {
        lastSync = now
        const deg = (inclRef.current * 180) / Math.PI
        setInclDeg((d) => (Math.abs(d - deg) > 0.75 ? Math.round(deg) : d))
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      resizeRef.current = null
      engine.dispose()
      glRef.current = null
    }
  }, [])

  // ── interaction: drag = orbit, wheel/pinch = distance ──────────────────
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<number | null>(null)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }, [])
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const pts = pointersRef.current
    const prev = pts.get(e.pointerId)
    if (!prev) return
    if (pts.size === 2) {
      // pinch → distance
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const [a, b] = [...pts.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchRef.current != null && d > 1) {
        distRef.current = Math.min(MAX_DIST, Math.max(MIN_DIST, distRef.current * (pinchRef.current / d)))
        dirtyRef.current = true
      }
      pinchRef.current = d
      return
    }
    const dx = e.clientX - prev.x
    const dy = e.clientY - prev.y
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    azRef.current -= dx * 0.005
    inclRef.current = Math.min(MAX_INCL_RAD, Math.max(0, inclRef.current + dy * 0.004))
    dirtyRef.current = true
  }, [])
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
  }, [])
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    distRef.current = Math.min(MAX_DIST, Math.max(MIN_DIST, distRef.current * Math.exp(e.deltaY * 0.0012)))
    dirtyRef.current = true
  }, [])

  // ── presets ─────────────────────────────────────────────────────────────
  const applyPreset = useCallback((id: string) => {
    const p = getPreset(id)
    if (!p) return
    setPresetId(p.id)
    setLogMass(Math.log10(p.massMsun))
    setLogMdot(Math.log10(p.mdot))
    setBeaming(p.beaming)
    setRefDist({ m: p.distanceM, label: p.distanceLabel })
  }, [])

  const readoutRows = useMemo(() => {
    const rows: { label: string; value: string; note?: string }[] = [
      { label: 'schwarzschild rs', value: formatLength(rs) },
      { label: 'photon sphere · 1.5 rs', value: formatLength(1.5 * rs) },
      { label: 'isco · 3 rs', value: formatLength(3 * rs) },
      {
        label: 'shadow ∅ · 5.196 rs',
        value: `${formatLength(shadowDiameter(mass))} · ${fmtSci(thetaMuas)} μas @ ${refDist.label}`,
        note: activePreset?.eht,
      },
      {
        label: 'disk peak temp',
        value: `${fmtSci(tPeak)} K`,
        note: `Wien peak ${formatWavelength(lambda)} · ${spectralBand(lambda)}`,
      },
      { label: 'isco orbital period', value: formatTime(iscoPeriodSeconds(mass)) },
      { label: 'eddington luminosity', value: formatPower(eddingtonLuminosity(mass)) },
      { label: 'accretion rate ṁ', value: `${fmtSci(mdot)} ṁ_edd` },
    ]
    return rows
  }, [rs, mass, mdot, thetaMuas, refDist, tPeak, lambda, activePreset])

  const controls = (
    <div className={cn('px-4 pb-4 sm:px-5', embed ? 'pt-3' : 'pt-4')}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted">presets</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p.id)}
            className={cn(
              'rounded-full border px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider transition-colors',
              presetId === p.id
                ? 'border-[#818cf8] text-[#a5b4fc]'
                : 'border-[var(--color-border)] text-muted hover:border-[var(--color-muted)] hover:text-fg',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 md:grid-cols-4">
        <Slider
          label="mass"
          display={formatMassMsun(mass)}
          min={Math.log10(3)}
          max={11}
          step={0.01}
          value={logMass}
          onChange={(v) => { setLogMass(v); setPresetId('custom') }}
        />
        <Slider
          label="accretion ṁ"
          display={fmtSci(mdot)}
          min={-5}
          max={0}
          step={0.01}
          value={logMdot}
          onChange={(v) => { setLogMdot(v); setPresetId('custom') }}
        />
        <Slider
          label="disk inner"
          display={`${innerRs.toFixed(1)} rs`}
          min={3}
          max={6}
          step={0.1}
          value={innerRs}
          onChange={setInnerRs}
        />
        <Slider
          label="disk outer"
          display={`${outerRs.toFixed(1)} rs`}
          min={6}
          max={20}
          step={0.5}
          value={outerRs}
          onChange={setOuterRs}
        />
        <Slider
          label="inclination"
          display={`${Math.round(inclDeg)}°`}
          min={0}
          max={88}
          step={1}
          value={inclDeg}
          onChange={setInclDeg}
        />
        <Slider
          label="beaming"
          display={beaming.toFixed(2)}
          min={0}
          max={1}
          step={0.01}
          value={beaming}
          onChange={(v) => { setBeaming(v); setPresetId('custom') }}
        />
        <Slider
          label="exposure"
          display={exposure.toFixed(2)}
          min={0.2}
          max={3}
          step={0.05}
          value={exposure}
          onChange={setExposure}
        />
        <div>
          <div className="font-mono text-[0.6rem] uppercase tracking-wider text-muted">quality</div>
          <div className="mt-1.5 flex gap-1" role="group" aria-label="Render quality">
            {(['low', 'med', 'high'] as Quality[]).map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={cn(
                  'flex-1 rounded border px-2 py-1 font-mono text-[0.6rem] uppercase tracking-wider transition-colors',
                  quality === q
                    ? 'border-[#818cf8] text-[#a5b4fc]'
                    : 'border-[var(--color-border)] text-muted hover:border-[var(--color-muted)] hover:text-fg',
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-[var(--color-border)] pt-4 md:grid-cols-4">
        {readoutRows.map((r) => (
          <Readout key={r.label} label={r.label} value={r.value} note={r.note} />
        ))}
      </div>

      <p className="mt-4 font-mono text-[0.62rem] leading-relaxed text-muted">
        Schwarzschild (non-rotating). Geodesics integrated per-pixel — the bending you see is the
        real null-geodesic equation, not a screen-space warp.
      </p>
    </div>
  )

  return (
    <div
      ref={wrapRef}
      className="not-prose w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-surface"
    >
      <div
        ref={canvasWrapRef}
        className="relative w-full"
        style={{ height: isFs ? '100%' : embed ? 460 : 'min(72vh, 700px)', background: '#04050a' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          className="block h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
          aria-label="Black-hole ray tracer — drag to orbit the camera, scroll or pinch to change distance"
        />
        <div className="pointer-events-none absolute left-3 top-3 max-w-[70%]">
          <div className="font-mono text-[0.65rem] uppercase tracking-wider text-white/45">
            {activePreset ? activePreset.label : 'custom'}
          </div>
          <div className="font-mono text-lg font-semibold text-white">{formatMassMsun(mass)}</div>
          <div className="mt-0.5 font-mono text-[0.68rem] text-white/55">
            shadow {fmtSci(thetaMuas)} μas @ {refDist.label}
          </div>
        </div>
        <button
          onClick={toggleFs}
          className="absolute right-3 top-3 rounded-full border border-white/20 bg-white/10 px-2.5 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-white backdrop-blur transition-colors hover:border-white/50"
        >
          {isFs ? '⤡ exit' : '⤢ full'}
        </button>
      </div>

      {embed ? (
        <div className="border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 py-2">
            <button
              onClick={() => setDrawerOpen((o) => !o)}
              className="font-mono text-[0.65rem] uppercase tracking-wider text-muted transition-colors hover:text-fg"
              aria-expanded={drawerOpen}
            >
              {drawerOpen ? '▾ controls & readout' : '▸ controls & readout'}
            </button>
            <Link
              href="/lab/black-hole-sim/"
              className="font-mono text-[0.65rem] uppercase tracking-wider transition-colors hover:text-[#a5b4fc]"
              style={{ color: ACCENT }}
            >
              Open full lab →
            </Link>
          </div>
          {drawerOpen && controls}
        </div>
      ) : (
        <div className="border-t border-[var(--color-border)]">{controls}</div>
      )}
    </div>
  )
}
