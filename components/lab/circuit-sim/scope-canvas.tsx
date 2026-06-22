'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Probe, ScopeSettings } from '@/lib/lab/circuit-sim/types'
import { INSTRUMENT } from './instrument'
import { measureTrace } from '@/lib/lab/circuit-sim/measure'

interface Props {
  probes: Probe[]
  settings: ScopeSettings
  /** Seconds per sample (sim timestep). */
  dt: number
  onSettings: (partial: Partial<ScopeSettings>) => void
  onRemoveProbe: (id: string) => void
}

const DIVS_H = 10
const DIVS_V = 8

/** Read the i-th chronological sample (0 = oldest) from a probe's ring buffer. */
function chrono(p: Probe, i: number): number {
  const len = p.samples.length
  const startIdx = p.count < len ? 0 : p.writeIdx
  return p.samples[(startIdx + i) % len]
}

/** Find the latest crossing of `level` with the given edge in [0, count). Returns -1 if none. */
function lastCrossing(p: Probe, level: number, edge: 'rising' | 'falling'): number {
  for (let i = p.count - 1; i >= 1; i--) {
    const cur = chrono(p, i), prev = chrono(p, i - 1)
    if (edge === 'rising' ? prev < level && cur >= level : prev > level && cur <= level) return i
  }
  return -1
}

/** Cursor positions are stored as fractions [0,1] of the plot rect (x→time, y→volts). */
interface Cursors { on: boolean; t1: number; t2: number; v1: number; v2: number }
type CursorId = 't1' | 't2' | 'v1' | 'v2'

/** Last-drawn plot geometry + scale, so cursor math/readouts match the render. */
interface Scale { x: number; y: number; w: number; h: number; view: number; dt: number; vSpan: number }

export function ScopeCanvas({ probes, settings, dt, onSettings, onRemoveProbe }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef<Scale | null>(null)
  const dragRef = useRef<CursorId | null>(null)

  const [cursors, setCursors] = useState<Cursors>({ on: false, t1: 0.35, t2: 0.65, v1: 0.4, v2: 0.6 })

  // Freeze snapshots the live probes so the display holds while the sim runs on.
  const [frozenProbes, setFrozenProbes] = useState<Probe[] | null>(null)
  useEffect(() => {
    if (settings.frozen && !frozenProbes) setFrozenProbes(probes)
    if (!settings.frozen && frozenProbes) setFrozenProbes(null)
  }, [settings.frozen, probes, frozenProbes])
  const displayProbes = settings.frozen && frozenProbes ? frozenProbes : probes

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const w = rect.width, h = rect.height
    if (w < 10 || h < 10) return

    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const c = INSTRUMENT

    ctx.fillStyle = c.scopeBg
    ctx.fillRect(0, 0, w, h)

    const visible = displayProbes.filter(p => p.visible)
    if (visible.length === 0) {
      scaleRef.current = null
      ctx.fillStyle = c.scopeText
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Click a wire to probe a node · current-mode click for I · shift-click for V across', w / 2, h / 2)
      return
    }

    const pad = { l: 8, r: 8, t: 8, b: 8 }
    const sr = { x: pad.l, y: pad.t, w: w - pad.l - pad.r, h: h - pad.t - pad.b }

    drawGraticule(ctx, sr, c)

    // ── Shared vertical scale ──────────────────────────────────────
    let vLo: number, vHi: number
    if (settings.autoFit) {
      let vmin = Infinity, vmax = -Infinity
      for (const p of visible) {
        for (let i = 0; i < p.count; i++) {
          const v = chrono(p, i)
          if (v < vmin) vmin = v
          if (v > vmax) vmax = v
        }
      }
      if (!isFinite(vmin) || !isFinite(vmax)) { vmin = -1; vmax = 1 }
      const range = (vmax - vmin) || 1
      vLo = vmin - range * 0.12
      vHi = vmax + range * 0.12
    } else {
      const half = (settings.voltsPerDiv * DIVS_V) / 2
      vLo = -half; vHi = half
    }
    const vToY = (v: number) => sr.y + sr.h - ((v - vLo) / (vHi - vLo)) * sr.h

    // Zero line
    if (vLo < 0 && vHi > 0) {
      ctx.strokeStyle = c.scopeGridMajor
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(sr.x, vToY(0)); ctx.lineTo(sr.x + sr.w, vToY(0)); ctx.stroke()
    }

    // ── Trigger window ─────────────────────────────────────────────
    const maxCount = Math.max(...visible.map(p => p.count), 0)
    if (maxCount < 2) { scaleRef.current = null; return }
    const view = Math.min(maxCount, 1500)

    let start = maxCount - view
    if (settings.triggerEnabled) {
      const trig = visible.find(p => p.id === settings.triggerSource) ?? visible[0]
      const cross = lastCrossing(trig, settings.triggerLevel, settings.triggerEdge)
      if (cross >= 0) start = Math.max(0, Math.min(cross - Math.floor(view * 0.1), maxCount - view))
    }

    // Trigger level marker
    if (settings.triggerEnabled && vLo <= settings.triggerLevel && settings.triggerLevel <= vHi) {
      ctx.strokeStyle = c.probeRing
      ctx.globalAlpha = 0.5
      ctx.setLineDash([2, 4])
      ctx.beginPath(); ctx.moveTo(sr.x, vToY(settings.triggerLevel)); ctx.lineTo(sr.x + sr.w, vToY(settings.triggerLevel)); ctx.stroke()
      ctx.setLineDash([]); ctx.globalAlpha = 1
    }

    // ── Traces ─────────────────────────────────────────────────────
    for (const p of visible) {
      const n = Math.min(view, p.count - start)
      if (n < 2) continue
      // glow underlay
      ctx.save()
      ctx.strokeStyle = p.color
      ctx.globalAlpha = 0.18
      ctx.lineWidth = 5
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const px = sr.x + (sr.w / (view - 1)) * i
        const py = vToY(chrono(p, start + i))
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.stroke()
      ctx.restore()
      // main trace
      ctx.save()
      ctx.strokeStyle = p.color
      ctx.lineWidth = 1.6
      ctx.lineJoin = 'round'
      ctx.shadowColor = p.color
      ctx.shadowBlur = 4
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const px = sr.x + (sr.w / (view - 1)) * i
        const py = vToY(chrono(p, start + i))
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.stroke()
      ctx.restore()
    }

    // Publish the geometry/scale for cursor hit-testing + readouts.
    scaleRef.current = { x: sr.x, y: sr.y, w: sr.w, h: sr.h, view, dt, vSpan: vHi - vLo }

    // ── Measurement cursors ────────────────────────────────────────
    if (cursors.on) drawCursors(ctx, sr, cursors, c)

    // Corner label
    ctx.fillStyle = c.scopeText
    ctx.font = '9px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(settings.frozen ? 'DSO · FROZEN' : 'DSO', sr.x + 4, sr.y + 4)
  }, [displayProbes, settings, dt, cursors])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [draw])

  // ── Cursor dragging ──────────────────────────────────────────────
  const pickCursor = useCallback((clientX: number, clientY: number): CursorId | null => {
    const canvas = canvasRef.current
    const s = scaleRef.current
    if (!canvas || !s) return null
    const rect = canvas.getBoundingClientRect()
    const px = clientX - rect.left, py = clientY - rect.top
    const TH = 14
    const cand = ([
      { id: 't1', d: Math.abs(px - (s.x + cursors.t1 * s.w)) },
      { id: 't2', d: Math.abs(px - (s.x + cursors.t2 * s.w)) },
      { id: 'v1', d: Math.abs(py - (s.y + cursors.v1 * s.h)) },
      { id: 'v2', d: Math.abs(py - (s.y + cursors.v2 * s.h)) },
    ] as { id: CursorId; d: number }[]).filter(c => c.d < TH).sort((a, b) => a.d - b.d)
    return cand.length ? cand[0].id : null
  }, [cursors])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!cursors.on) return
    const id = pickCursor(e.clientX, e.clientY)
    if (!id) return
    dragRef.current = id
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [cursors.on, pickCursor])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const id = dragRef.current
    const s = scaleRef.current
    if (!id || !s) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (id === 't1' || id === 't2') {
      const f = Math.max(0, Math.min(1, (e.clientX - rect.left - s.x) / s.w))
      setCursors(c => ({ ...c, [id]: f }))
    } else {
      const f = Math.max(0, Math.min(1, (e.clientY - rect.top - s.y) / s.h))
      setCursors(c => ({ ...c, [id]: f }))
    }
  }, [])

  const endDrag = useCallback(() => { dragRef.current = null }, [])

  // Readouts derived from the current scale + cursor fractions.
  const s = scaleRef.current
  const dT = s ? Math.abs(cursors.t2 - cursors.t1) * (s.view - 1) * s.dt : 0
  const dV = s ? Math.abs(cursors.v2 - cursors.v1) * s.vSpan : 0

  return (
    <div className="flex flex-col gap-2">
      <ScopeControls
        probes={probes}
        settings={settings}
        onSettings={onSettings}
        cursorsOn={cursors.on}
        onToggleCursors={() => setCursors(c => ({ ...c, on: !c.on }))}
      />
      <div ref={wrapRef} className="w-full overflow-hidden rounded-lg bg-[#05080c] border border-[#13202c]" style={{ height: 'clamp(140px, 22vh, 240px)' }}>
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
          style={{ touchAction: 'none', cursor: cursors.on ? 'crosshair' : 'default' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      </div>
      {cursors.on && (
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-[#7aa0b2]/80 tabular-nums px-0.5">
          <span><span className="text-[#22c8ee]">Δt</span> {formatTime(dT)}</span>
          <span><span className="text-[#22c8ee]">1/Δt</span> {dT > 0 ? formatHz(1 / dT) : '—'}</span>
          <span><span className="text-[#ffd93d]">ΔV</span> {dV.toFixed(3)}V</span>
        </div>
      )}
      {displayProbes.length > 0 && <ChannelLegend probes={displayProbes} dt={dt} onRemoveProbe={onRemoveProbe} />}
    </div>
  )
}

/** Draw the two time (vertical) + two voltage (horizontal) cursors and a Δ band. */
function drawCursors(
  ctx: CanvasRenderingContext2D,
  sr: { x: number; y: number; w: number; h: number },
  cursors: Cursors,
  c: typeof INSTRUMENT,
) {
  const x1 = sr.x + cursors.t1 * sr.w, x2 = sr.x + cursors.t2 * sr.w
  const y1 = sr.y + cursors.v1 * sr.h, y2 = sr.y + cursors.v2 * sr.h
  ctx.save()
  // shaded Δt band
  ctx.fillStyle = c.accent
  ctx.globalAlpha = 0.06
  ctx.fillRect(Math.min(x1, x2), sr.y, Math.abs(x2 - x1), sr.h)
  ctx.globalAlpha = 1
  // vertical (time) cursors
  ctx.strokeStyle = '#22c8ee'
  ctx.lineWidth = 1
  for (const [x, label] of [[x1, 't1'], [x2, 't2']] as const) {
    ctx.setLineDash([4, 3])
    ctx.beginPath(); ctx.moveTo(x, sr.y); ctx.lineTo(x, sr.y + sr.h); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#22c8ee'
    ctx.fillRect(x - 6, sr.y, 12, 3)
    ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText(label, x, sr.y + 5)
  }
  // horizontal (voltage) cursors
  ctx.strokeStyle = '#ffd93d'
  for (const [y, label] of [[y1, 'v1'], [y2, 'v2']] as const) {
    ctx.setLineDash([4, 3])
    ctx.beginPath(); ctx.moveTo(sr.x, y); ctx.lineTo(sr.x + sr.w, y); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#ffd93d'
    ctx.fillRect(sr.x + sr.w - 3, y - 6, 3, 12)
    ctx.font = '8px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
    ctx.fillText(label, sr.x + sr.w - 6, y)
  }
  ctx.restore()
}

// ── Controls bar ───────────────────────────────────────────────────

function ScopeControls({
  probes, settings, onSettings, cursorsOn, onToggleCursors,
}: {
  probes: Probe[]
  settings: ScopeSettings
  onSettings: (p: Partial<ScopeSettings>) => void
  cursorsOn: boolean
  onToggleCursors: () => void
}) {
  const btn = (active: boolean) =>
    `px-2 py-0.5 rounded text-[10px] font-mono transition-colors border ${
      active ? 'bg-[#22c8ee]/15 text-[#22c8ee] border-[#22c8ee]/40' : 'bg-[#101822] text-[#7aa0b2]/70 border-transparent hover:bg-[#142233]'
    }`
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-[#5c8294]/70">
      <button className={btn(settings.frozen)} onClick={() => onSettings({ frozen: !settings.frozen })}>
        {settings.frozen ? '▶ Live' : '❚❚ Freeze'}
      </button>
      <span className="text-[#5c8294]/30">|</span>
      <button className={btn(settings.autoFit)} onClick={() => onSettings({ autoFit: true })}>Auto</button>
      <button className={btn(!settings.autoFit)} onClick={() => onSettings({ autoFit: false })}>Fixed</button>
      {!settings.autoFit && (
        <select
          value={settings.voltsPerDiv}
          onChange={e => onSettings({ voltsPerDiv: parseFloat(e.target.value) })}
          className="bg-[#101822] border border-[#1b2a38] rounded px-1 py-0.5 text-[#cfe3ee]"
        >
          {[0.1, 0.5, 1, 2, 5, 10].map(v => <option key={v} value={v}>{v}/div</option>)}
        </select>
      )}
      <span className="text-[#5c8294]/30">|</span>
      <button className={btn(cursorsOn)} onClick={onToggleCursors}>⊹ Cursors</button>
      <span className="text-[#5c8294]/30">|</span>
      <button className={btn(settings.triggerEnabled)} onClick={() => onSettings({ triggerEnabled: !settings.triggerEnabled })}>⊳ Trig</button>
      {settings.triggerEnabled && (
        <>
          <button className={btn(settings.triggerEdge === 'rising')} onClick={() => onSettings({ triggerEdge: settings.triggerEdge === 'rising' ? 'falling' : 'rising' })}>
            {settings.triggerEdge === 'rising' ? '↗' : '↘'}
          </button>
          <input
            type="number" step="0.5" value={settings.triggerLevel}
            onChange={e => onSettings({ triggerLevel: parseFloat(e.target.value) || 0 })}
            className="w-14 bg-[#101822] border border-[#1b2a38] rounded px-1 py-0.5 text-[#cfe3ee]"
          />
          {probes.length > 1 && (
            <select
              value={settings.triggerSource ?? probes[0]?.id ?? ''}
              onChange={e => onSettings({ triggerSource: e.target.value })}
              className="bg-[#101822] border border-[#1b2a38] rounded px-1 py-0.5 text-[#cfe3ee]"
            >
              {probes.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          )}
        </>
      )}
    </div>
  )
}

// ── Channel legend with live measurements ──────────────────────────

function ChannelLegend({ probes, dt, onRemoveProbe }: { probes: Probe[]; dt: number; onRemoveProbe: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {probes.map(p => {
        const m = measureTrace(p.samples, p.count, p.writeIdx, dt)
        const u = p.unit
        const fmt = (v: number) => (u === 'A' ? formatA(v) : `${v.toFixed(2)}V`)
        return (
          <div key={p.id} className="flex items-center gap-1.5 rounded-md border border-[#13202c] bg-[#0a1118] px-2 py-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-[10px] font-mono text-[#cfe3ee]/90">{p.label}</span>
            <span className="text-[9px] font-mono text-[#5c8294]/70 tabular-nums">
              pp {u === 'A' ? formatA(m.vpp) : `${m.vpp.toFixed(2)}V`} · rms {fmt(m.rms)}{m.freq > 0 ? ` · ${formatHz(m.freq)}` : ''}
            </span>
            <button onClick={() => onRemoveProbe(p.id)} className="text-[10px] font-mono text-[#5c8294]/40 hover:text-red-400 ml-0.5">×</button>
          </div>
        )
      })}
    </div>
  )
}

function formatA(a: number): string {
  const abs = Math.abs(a)
  if (abs >= 1) return `${a.toFixed(2)}A`
  if (abs >= 1e-3) return `${(a * 1e3).toFixed(1)}mA`
  if (abs >= 1e-6) return `${(a * 1e6).toFixed(0)}µA`
  return `${(a * 1e9).toFixed(0)}nA`
}

function formatHz(f: number): string {
  if (f >= 1e6) return `${(f / 1e6).toFixed(1)}MHz`
  if (f >= 1e3) return `${(f / 1e3).toFixed(1)}kHz`
  return `${f.toFixed(0)}Hz`
}

function formatTime(t: number): string {
  const a = Math.abs(t)
  if (a >= 1) return `${t.toFixed(3)}s`
  if (a >= 1e-3) return `${(t * 1e3).toFixed(2)}ms`
  if (a >= 1e-6) return `${(t * 1e6).toFixed(1)}µs`
  return `${(t * 1e9).toFixed(0)}ns`
}

function drawGraticule(ctx: CanvasRenderingContext2D, sr: { x: number; y: number; w: number; h: number }, c: typeof INSTRUMENT) {
  ctx.strokeStyle = c.scopeGrid
  ctx.lineWidth = 0.5
  for (let i = 0; i <= DIVS_H; i++) {
    const px = sr.x + (sr.w / DIVS_H) * i
    ctx.beginPath(); ctx.moveTo(px, sr.y); ctx.lineTo(px, sr.y + sr.h); ctx.stroke()
  }
  for (let i = 0; i <= DIVS_V; i++) {
    const py = sr.y + (sr.h / DIVS_V) * i
    ctx.beginPath(); ctx.moveTo(sr.x, py); ctx.lineTo(sr.x + sr.w, py); ctx.stroke()
  }
  ctx.strokeStyle = c.scopeGridMajor
  ctx.lineWidth = 1.2
  ctx.strokeRect(sr.x, sr.y, sr.w, sr.h)
}
