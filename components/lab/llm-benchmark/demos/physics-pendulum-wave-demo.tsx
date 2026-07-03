'use client'

import { useEffect, useRef, useState } from 'react'
import { DemoFrame } from './demo-frame'

const ACCENT = '#06b6d4'

interface Pendulum {
  length: number
  phase: number
  hue: number
}

export function PhysicsPendulumWaveDemo({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(20)
  const [gravity, setGravity] = useState(9.8)
  const pendulumsRef = useRef<Pendulum[]>([])
  const paramsRef = useRef({ count, gravity })
  paramsRef.current = { count, gravity }

  useEffect(() => {
    if (!canvasRef.current || !wrapRef.current) return
    const canvas = canvasRef.current as HTMLCanvasElement
    const wrap = wrapRef.current as HTMLDivElement
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

    let raf = 0
    let dims = { w: 0, h: 0 }
    let onscreen = false
    let start = 0
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const colors = {
      muted: getComputedStyle(wrap).getPropertyValue('--color-muted').trim() || '#71717a',
      border: getComputedStyle(wrap).getPropertyValue('--color-border').trim() || '#d4d4d8',
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
      buildPendulums(paramsRef.current.count)
      step(performance.now())
    }

    function buildPendulums(n: number) {
      pendulumsRef.current = Array.from({ length: n }, (_, i) => ({
        length: 0.25 + (i / Math.max(1, n - 1)) * 0.55,
        phase: 0,
        hue: 180 + (i / Math.max(1, n - 1)) * 60,
      }))
    }

    const step = (t: number) => {
      if (!start) start = t
      const elapsed = (t - start) / 1000
      const { count: n, gravity: g } = paramsRef.current

      if (pendulumsRef.current.length !== n) buildPendulums(n)

      const { w, h } = dims
      const originX = w / 2
      const originY = 16
      const scale = Math.min(w, h) * 0.85

      ctx.clearRect(0, 0, w, h)

      ctx.strokeStyle = colors.muted
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(originX - scale / 2, originY)
      ctx.lineTo(originX + scale / 2, originY)
      ctx.stroke()

      const spacing = scale / Math.max(1, n - 1)
      const startX = originX - scale / 2

      for (let i = 0; i < n; i++) {
        const p = pendulumsRef.current[i]
        // period T = 2π√(L/g); choose L so that T_i = T0 * (i+offset)/(offset)
        // for visual beats: T_i = 60 / (60 + i) * T_base
        const T = 2 * Math.PI * Math.sqrt(p.length / g)
        const theta = 0.45 * Math.cos((2 * Math.PI * elapsed) / T)
        const px = startX + i * spacing
        const bobX = px + Math.sin(theta) * (p.length * scale)
        const bobY = originY + Math.cos(theta) * (p.length * scale)

        ctx.strokeStyle = `hsla(${p.hue}, 70%, 55%, 0.35)`
        ctx.beginPath()
        ctx.moveTo(px, originY)
        ctx.lineTo(bobX, bobY)
        ctx.stroke()

        ctx.fillStyle = `hsla(${p.hue}, 80%, 55%, 0.9)`
        ctx.beginPath()
        ctx.arc(bobX, bobY, 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (onscreen) step(t)
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
      title="Physics Pendulum Wave"
      accent={ACCENT}
      blurb="Varying periods produce visual beat patterns"
      className={className}
      controls={
        <div className="flex items-center gap-3 font-mono text-[0.65rem]">
          <label className="flex items-center gap-1.5 text-[var(--color-muted)]">
            N
            <input
              type="range"
              min={8}
              max={40}
              step={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="accent-project w-14"
            />
            {count}
          </label>
          <label className="hidden items-center gap-1.5 text-[var(--color-muted)] sm:flex">
            g
            <input
              type="range"
              min={1}
              max={25}
              step={0.5}
              value={gravity}
              onChange={(e) => setGravity(Number(e.target.value))}
              className="accent-project w-14"
            />
            {gravity.toFixed(1)}
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
