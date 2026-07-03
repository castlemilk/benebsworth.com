'use client'

import { useEffect, useRef, useState } from 'react'
import { DemoFrame } from './demo-frame'

const ACCENT = '#3b82f6'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  mass: number
}

export function NBodyFieldDemo({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(150)
  const [gravity, setGravity] = useState(0.8)
  const paramsRef = useRef({ count, gravity })
  paramsRef.current = { count, gravity }
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    if (!canvasRef.current || !wrapRef.current) return
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let dims = { w: 0, h: 0 }
    let onscreen = false
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const initParticles = (n: number) => {
      const particles: Particle[] = []
      for (let i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * dims.w,
          y: Math.random() * dims.h,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          mass: 0.8 + Math.random() * 1.4,
        })
      }
      particlesRef.current = particles
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
      initParticles(paramsRef.current.count)
      draw()
    }

    const update = (dt: number) => {
      const { count: n, gravity: G } = paramsRef.current
      if (particlesRef.current.length !== n) initParticles(n)

      const particles = particlesRef.current
      const eps = 12
      const eps2 = eps * eps
      const subSteps = 2
      const subDt = dt / subSteps
      const gFac = G * 0.001

      for (let s = 0; s < subSteps; s++) {
        for (let i = 0; i < particles.length; i++) {
          const pi = particles[i]
          let ax = 0
          let ay = 0
          for (let j = 0; j < particles.length; j++) {
            if (i === j) continue
            const pj = particles[j]
            const dx = pj.x - pi.x
            const dy = pj.y - pi.y
            const dist2 = dx * dx + dy * dy + eps2
            const invDist = 1 / Math.sqrt(dist2)
            const f = (gFac * pj.mass) / dist2
            ax += dx * invDist * f
            ay += dy * invDist * f
          }
          pi.vx += ax * subDt
          pi.vy += ay * subDt
        }

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          p.x += p.vx * subDt
          p.y += p.vy * subDt

          if (p.x < 0) p.x += dims.w
          else if (p.x > dims.w) p.x -= dims.w
          if (p.y < 0) p.y += dims.h
          else if (p.y > dims.h) p.y -= dims.h
        }
      }
    }

    const draw = () => {
      const { w, h } = dims
      const particles = particlesRef.current
      if (!w || !h || particles.length === 0) return

      // Dark field with light trails.
      ctx.fillStyle = 'rgba(6, 8, 16, 0.18)'
      ctx.fillRect(0, 0, w, h)

      let minSpeed = Infinity
      let maxSpeed = -Infinity
      const speeds = new Float32Array(particles.length)
      for (let i = 0; i < particles.length; i++) {
        const s = Math.hypot(particles[i].vx, particles[i].vy)
        speeds[i] = s
        if (s < minSpeed) minSpeed = s
        if (s > maxSpeed) maxSpeed = s
      }
      const range = maxSpeed - minSpeed || 1

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const t = (speeds[i] - minSpeed) / range
        const hue = 220 - t * 220
        const radius = 3.5 + p.mass * 1.2
        const x = p.x
        const y = p.y

        // Glow
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 3)
        grad.addColorStop(0, `hsla(${hue}, 95%, 68%, 0.98)`)
        grad.addColorStop(0.5, `hsla(${hue}, 95%, 55%, 0.45)`)
        grad.addColorStop(1, `hsla(${hue}, 95%, 55%, 0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, radius * 3, 0, Math.PI * 2)
        ctx.fill()

        // Core
        ctx.fillStyle = `hsla(${hue}, 100%, 80%, 1)`
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    let last = 0
    const step = (t: number) => {
      if (!last) last = t
      const dt = Math.min((t - last) / 1000, 0.05)
      last = t
      update(dt)
      draw()
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
      title="N-Body Gravity Field"
      accent={ACCENT}
      blurb="Mutual attraction with softening and velocity colouring"
      className={className}
      controls={
        <div className="flex items-center gap-3 font-mono text-[0.65rem]">
          <label className="flex items-center gap-1.5 text-[var(--color-muted)]">
            N
            <input
              type="range"
              min={50}
              max={250}
              step={10}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="accent-project w-16"
            />
            {count}
          </label>
          <label className="flex items-center gap-1.5 text-[var(--color-muted)]">
            G
            <input
              type="range"
              min={0.1}
              max={2.0}
              step={0.1}
              value={gravity}
              onChange={(e) => setGravity(Number(e.target.value))}
              className="accent-project w-16"
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
