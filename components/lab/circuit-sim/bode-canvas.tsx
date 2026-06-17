'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { ACOptions, BodeResult } from '@/lib/lab/circuit-sim/ac'
import { INSTRUMENT } from './instrument'

interface Props {
  bode: BodeResult | null
  acOptions: ACOptions
  onAcOptions: (partial: Partial<ACOptions>) => void
}

const DECADE_OPTIONS = [
  { label: '1Hz–1k', fStart: 1, fStop: 1e3 },
  { label: '1Hz–100k', fStart: 1, fStop: 1e5 },
  { label: '1Hz–1M', fStart: 1, fStop: 1e6 },
  { label: '10Hz–10M', fStart: 10, fStop: 1e7 },
]

function fmtHz(f: number): string {
  if (f >= 1e6) return `${(f / 1e6).toFixed(f >= 1e7 ? 0 : 1)}M`
  if (f >= 1e3) return `${(f / 1e3).toFixed(f >= 1e4 ? 0 : 1)}k`
  return `${f.toFixed(0)}`
}

export function BodeCanvas({ bode, acOptions, onAcOptions }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const w = rect.width, h = rect.height
    if (w < 10 || h < 10) return
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr; canvas.height = h * dpr
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`
    }
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const c = INSTRUMENT

    ctx.fillStyle = c.scopeBg
    ctx.fillRect(0, 0, w, h)

    if (!bode || bode.freqs.length === 0 || bode.channels.every(ch => ch.mag.length === 0)) {
      ctx.fillStyle = c.scopeText
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('Probe a node, then switch to AC to see the frequency response', w / 2, h / 2)
      return
    }

    const lf0 = Math.log10(bode.freqs[0])
    const lf1 = Math.log10(bode.freqs[bode.freqs.length - 1])
    const span = lf1 - lf0 || 1

    const padL = 38, padR = 10
    const gap = 18
    const magH = (h - gap - 16) * 0.58
    const phH = (h - gap - 16) * 0.42
    const magR = { x: padL, y: 8, w: w - padL - padR, h: magH }
    const phR = { x: padL, y: 8 + magH + gap, w: w - padL - padR, h: phH }

    const xOf = (f: number) => magR.x + ((Math.log10(f) - lf0) / span) * magR.w

    // ── Magnitude auto-range ───────────────────────────────────────
    let dbMin = Infinity, dbMax = -Infinity
    for (const ch of bode.channels) for (const v of ch.mag) {
      if (v <= -199) continue
      if (v < dbMin) dbMin = v
      if (v > dbMax) dbMax = v
    }
    if (!isFinite(dbMin)) { dbMin = -60; dbMax = 6 }
    dbMax = Math.ceil((dbMax + 3) / 10) * 10
    dbMin = Math.floor((dbMin - 3) / 10) * 10
    if (dbMax - dbMin < 20) dbMin = dbMax - 20

    const magY = (db: number) => magR.y + magR.h - ((db - dbMin) / (dbMax - dbMin)) * magR.h
    const phY = (deg: number) => phR.y + phR.h - ((deg + 200) / 400) * phR.h // -200..200

    // ── Grid: decades + minor lines ────────────────────────────────
    const d0 = Math.floor(lf0), d1 = Math.ceil(lf1)
    ctx.font = '8px monospace'
    ctx.textBaseline = 'top'
    for (let d = d0; d <= d1; d++) {
      for (let m = 1; m <= 9; m++) {
        const f = m * Math.pow(10, d)
        if (f < bode.freqs[0] || f > bode.freqs[bode.freqs.length - 1]) continue
        const x = xOf(f)
        ctx.strokeStyle = m === 1 ? c.scopeGridMajor : c.scopeGrid
        ctx.lineWidth = m === 1 ? 1 : 0.5
        ctx.beginPath(); ctx.moveTo(x, magR.y); ctx.lineTo(x, magR.y + magR.h); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x, phR.y); ctx.lineTo(x, phR.y + phR.h); ctx.stroke()
        if (m === 1) {
          ctx.fillStyle = c.scopeText
          ctx.textAlign = 'center'
          ctx.fillText(fmtHz(f), x, phR.y + phR.h + 3)
        }
      }
    }

    // Horizontal grid + labels (magnitude)
    ctx.strokeStyle = c.scopeGrid
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let db = dbMin; db <= dbMax; db += 10) {
      const y = magY(db)
      ctx.strokeStyle = db === 0 ? c.scopeGridMajor : c.scopeGrid
      ctx.lineWidth = db === 0 ? 1 : 0.5
      ctx.beginPath(); ctx.moveTo(magR.x, y); ctx.lineTo(magR.x + magR.w, y); ctx.stroke()
      ctx.fillStyle = c.scopeText
      ctx.fillText(`${db}`, magR.x - 3, y)
    }
    // Phase grid (−180,−90,0,90,180)
    for (const deg of [-180, -90, 0, 90, 180]) {
      const y = phY(deg)
      ctx.strokeStyle = deg === 0 ? c.scopeGridMajor : c.scopeGrid
      ctx.lineWidth = deg === 0 ? 1 : 0.5
      ctx.beginPath(); ctx.moveTo(phR.x, y); ctx.lineTo(phR.x + phR.w, y); ctx.stroke()
      ctx.fillStyle = c.scopeText
      ctx.fillText(`${deg}°`, phR.x - 3, y)
    }

    // Borders
    ctx.strokeStyle = c.scopeGridMajor
    ctx.lineWidth = 1.2
    ctx.strokeRect(magR.x, magR.y, magR.w, magR.h)
    ctx.strokeRect(phR.x, phR.y, phR.w, phR.h)

    // ── Traces ─────────────────────────────────────────────────────
    for (const ch of bode.channels) {
      if (ch.mag.length === 0) continue
      // magnitude
      ctx.strokeStyle = ch.color
      ctx.lineWidth = 1.6
      ctx.shadowColor = ch.color; ctx.shadowBlur = 3
      ctx.beginPath()
      let started = false
      for (let i = 0; i < bode.freqs.length; i++) {
        if (ch.mag[i] <= -199) { started = false; continue }
        const x = xOf(bode.freqs[i]), y = magY(ch.mag[i])
        started ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        started = true
      }
      ctx.stroke()
      // phase (dashed)
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      started = false
      for (let i = 0; i < bode.freqs.length; i++) {
        if (ch.mag[i] <= -199) { started = false; continue }
        const x = xOf(bode.freqs[i]), y = phY(ch.phase[i])
        started ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        started = true
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.shadowBlur = 0
    }

    // Labels
    ctx.fillStyle = c.scopeText
    ctx.font = '9px monospace'
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.fillText('GAIN dB', magR.x + 3, magR.y + 3)
    ctx.fillText('PHASE ° (dashed)', phR.x + 3, phR.y + 3)
  }, [bode])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [draw])

  const activeRange = DECADE_OPTIONS.find(o => o.fStart === acOptions.fStart && o.fStop === acOptions.fStop)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-[#5c8294]/70">
        <span className="uppercase tracking-wider text-[#5c8294]/50">Range</span>
        {DECADE_OPTIONS.map(o => (
          <button
            key={o.label}
            onClick={() => onAcOptions({ fStart: o.fStart, fStop: o.fStop })}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors border ${
              activeRange === o ? 'bg-[#22c8ee]/15 text-[#22c8ee] border-[#22c8ee]/40' : 'bg-[#101822] text-[#7aa0b2]/70 border-transparent hover:bg-[#142233]'
            }`}
          >
            {o.label}
          </button>
        ))}
        {bode && bode.channels.length > 0 && (
          <span className="ml-auto flex gap-2">
            {bode.channels.map(ch => (
              <span key={ch.id} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: ch.color }} />
                <span className="text-[#cfe3ee]/80">{ch.label}</span>
              </span>
            ))}
          </span>
        )}
      </div>
      <div ref={wrapRef} className="w-full overflow-hidden rounded-lg bg-[#05080c] border border-[#13202c]" style={{ height: 'clamp(180px, 30vh, 320px)' }}>
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>
    </div>
  )
}
