'use client'

import { useEffect, useRef, useState } from 'react'
import { DemoFrame } from './demo-frame'

const ACCENT = '#f97316'

export function CircuitBuilderTeaserDemo({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [R, setR] = useState(2.0)
  const [L, setL] = useState(1.0)
  const [C, setC] = useState(1.0)
  const paramsRef = useRef({ R, L, C })
  paramsRef.current = { R, L, C }

  useEffect(() => {
    if (!canvasRef.current || !wrapRef.current) return
    const canvas = canvasRef.current as HTMLCanvasElement
    const wrap = wrapRef.current as HTMLDivElement
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

    let raf = 0
    let dims = { w: 0, h: 0 }
    let onscreen = false
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const colors = {
      border: getComputedStyle(wrap).getPropertyValue('--color-border').trim() || '#d4d4d8',
      muted: getComputedStyle(wrap).getPropertyValue('--color-muted').trim() || '#71717a',
    }

    const resize = () => {
      const r = wrap.getBoundingClientRect()
      const w = Math.max(1, Math.round(r.width))
      const h = Math.max(1, Math.round(r.height))
      if (w === dims.w && h === dims.h) return
      dims = { w, h }
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }

    function solveStepResponse(Rv: number, Lv: number, Cv: number, duration: number, steps: number): number[] {
      const dt = duration / steps
      const values: number[] = []
      let Vc = 0
      let Il = 0
      const Vs = 1
      for (let i = 0; i < steps; i++) {
        const dIl = (Vs - Rv * Il - Vc) / Lv
        const dVc = Il / Cv
        // semi-implicit Euler for stability
        Il += dIl * dt
        Vc += dVc * dt
        values.push(Vc)
      }
      return values
    }

    function dampingMode(Rv: number, Lv: number, Cv: number): string {
      const alpha = Rv / (2 * Lv)
      const omega0 = 1 / Math.sqrt(Lv * Cv)
      const zeta = alpha / omega0
      if (zeta < 0.99) return 'underdamped'
      if (zeta > 1.01) return 'overdamped'
      return 'critically damped'
    }

    const draw = () => {
      const { w, h } = dims
      const { R: Rv, L: Lv, C: Cv } = paramsRef.current
      const padding = { left: 44, right: 16, top: 28, bottom: 36 }
      const chartW = w - padding.left - padding.right
      const chartH = h - padding.top - padding.bottom

      ctx.clearRect(0, 0, w, h)

      const values = solveStepResponse(Rv, Lv, Cv, 12, 600)
      const maxV = 1.2

      // Grid
      ctx.strokeStyle = colors.border
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH * i) / 4
        ctx.moveTo(padding.left, y)
        ctx.lineTo(padding.left + chartW, y)
      }
      for (let i = 0; i <= 6; i++) {
        const x = padding.left + (chartW * i) / 6
        ctx.moveTo(x, padding.top)
        ctx.lineTo(x, padding.top + chartH)
      }
      ctx.stroke()

      // Axes labels
      ctx.fillStyle = colors.muted
      ctx.font = '10px ui-monospace, monospace'
      ctx.textAlign = 'right'
      ctx.fillText('Vc', padding.left - 8, padding.top + 4)
      ctx.textAlign = 'center'
      ctx.fillText('time (s)', padding.left + chartW / 2, h - 10)

      // Curve
      ctx.strokeStyle = ACCENT
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < values.length; i++) {
        const x = padding.left + (chartW * i) / (values.length - 1)
        const y = padding.top + chartH * (1 - values[i] / maxV)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Damping label
      const mode = dampingMode(Rv, Lv, Cv)
      ctx.textAlign = 'left'
      ctx.fillStyle = ACCENT
      ctx.font = '11px ui-monospace, monospace'
      ctx.fillText(mode, padding.left + 6, padding.top + 14)
    }

    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (onscreen) draw()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    const io = new IntersectionObserver(
      ([e]) => {
        onscreen = e.isIntersecting
        if (onscreen && !raf && !reduce) raf = requestAnimationFrame(loop)
      },
      { threshold: 0 },
    )
    io.observe(wrap)

    if (!reduce) raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  return (
    <DemoFrame
      title="Circuit Builder Teaser"
      accent={ACCENT}
      blurb="RLC step response with live damping classification"
      className={className}
      controls={
        <div className="flex items-center gap-2 font-mono text-[0.6rem]">
          <label className="flex items-center gap-1 text-[var(--color-muted)]">
            R
            <input
              type="range"
              min={0.1}
              max={8}
              step={0.1}
              value={R}
              onChange={(e) => setR(Number(e.target.value))}
              className="accent-project w-12"
            />
            {R.toFixed(1)}
          </label>
          <label className="hidden items-center gap-1 text-[var(--color-muted)] sm:flex">
            L
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.1}
              value={L}
              onChange={(e) => setL(Number(e.target.value))}
              className="accent-project w-12"
            />
            {L.toFixed(1)}
          </label>
          <label className="hidden items-center gap-1 text-[var(--color-muted)] md:flex">
            C
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.1}
              value={C}
              onChange={(e) => setC(Number(e.target.value))}
              className="accent-project w-12"
            />
            {C.toFixed(1)}
          </label>
        </div>
      }
    >
      <div ref={wrapRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>
    </DemoFrame>
  )
}
