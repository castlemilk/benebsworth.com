'use client'

import { useEffect, useRef, useState } from 'react'
import { DemoFrame } from './demo-frame'

const ACCENT = '#8b5cf6'

const WORLD_W = 1600
const WORLD_H = 400
const GROUND_Y = 360

interface Platform {
  x: number
  y: number
  w: number
  h: number
}

interface Coin {
  x: number
  y: number
  r: number
  collected: boolean
}

interface Player {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  grounded: boolean
}

const PLATFORMS: Platform[] = [
  { x: 0, y: GROUND_Y, w: WORLD_W, h: 40 },
  { x: 220, y: 310, w: 120, h: 16 },
  { x: 400, y: 260, w: 120, h: 16 },
  { x: 600, y: 300, w: 140, h: 16 },
  { x: 800, y: 220, w: 110, h: 16 },
  { x: 980, y: 280, w: 140, h: 16 },
  { x: 1180, y: 200, w: 120, h: 16 },
  { x: 1360, y: 270, w: 140, h: 16 },
]

const COINS: Coin[] = [
  { x: 280, y: 280, r: 8, collected: false },
  { x: 460, y: 230, r: 8, collected: false },
  { x: 670, y: 270, r: 8, collected: false },
  { x: 855, y: 190, r: 8, collected: false },
  { x: 1050, y: 250, r: 8, collected: false },
  { x: 1240, y: 170, r: 8, collected: false },
  { x: 1430, y: 240, r: 8, collected: false },
]

const FLAG = { x: WORLD_W - 90, y: GROUND_Y - 70, w: 6, h: 70 }

export function MiniPlatformerDemo({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [score, setScore] = useState(0)
  const [resetTick, setResetTick] = useState(0)
  const [runSpeed, setRunSpeed] = useState(1.2)
  const [gravityMul, setGravityMul] = useState(0.9)

  const paramsRef = useRef({ runSpeed, gravityMul })
  paramsRef.current = { runSpeed, gravityMul }

  useEffect(() => {
    if (!canvasRef.current || !wrapRef.current) return
    const canvas = canvasRef.current as HTMLCanvasElement
    const wrap = wrapRef.current as HTMLDivElement
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

    let raf = 0
    let dims = { w: 0, h: 0 }
    let onscreen = false
    let last = 0
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const colors = {
      stage: getComputedStyle(wrap).getPropertyValue('--color-stage').trim() || '#f4f4f5',
      surface2: getComputedStyle(wrap).getPropertyValue('--color-surface-2').trim() || '#e4e4e7',
      border: getComputedStyle(wrap).getPropertyValue('--color-border').trim() || '#d4d4d8',
      muted: getComputedStyle(wrap).getPropertyValue('--color-muted').trim() || '#71717a',
    }

    const keys = new Set<string>()
    const player: Player = { x: 60, y: GROUND_Y - 36, vx: 0, vy: 0, w: 24, h: 36, grounded: false }
    const coins = COINS.map((c) => ({ ...c }))
    let collectedCount = 0
    let hasWon = false

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
      render()
    }

    const resetGame = () => {
      player.x = 60
      player.y = GROUND_Y - player.h
      player.vx = 0
      player.vy = 0
      player.grounded = false
      for (let i = 0; i < coins.length; i++) coins[i].collected = false
      collectedCount = 0
      hasWon = false
      setScore(0)
      render()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const key = e.key.toLowerCase()
      if (['arrowleft', 'arrowright', 'arrowup', ' ', 'a', 'd', 'w'].includes(key)) {
        e.preventDefault()
        keys.add(key)
      }
      if (key === 'r') resetGame()
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keys.delete(key)
    }

    const resolveCollisions = () => {
      player.grounded = false
      let nextX = player.x + player.vx
      let nextY = player.y + player.vy

      // Vertical collisions
      for (const p of PLATFORMS) {
        if (nextX + player.w > p.x && nextX < p.x + p.w && nextY + player.h > p.y && nextY < p.y + p.h) {
          const wasAbove = player.y + player.h <= p.y + Math.max(1, Math.abs(player.vy))
          const wasBelow = player.y >= p.y + p.h - Math.max(1, Math.abs(player.vy))
          if (player.vy > 0 && wasAbove) {
            nextY = p.y - player.h
            player.vy = 0
            player.grounded = true
          } else if (player.vy < 0 && wasBelow) {
            nextY = p.y + p.h
            player.vy = 0
          }
        }
      }

      // Horizontal collisions
      for (const p of PLATFORMS) {
        if (nextX + player.w > p.x && nextX < p.x + p.w && nextY + player.h > p.y && nextY < p.y + p.h) {
          const wasLeft = player.x + player.w <= p.x + Math.max(1, Math.abs(player.vx))
          const wasRight = player.x >= p.x + p.w - Math.max(1, Math.abs(player.vx))
          if (player.vx > 0 && wasLeft) {
            nextX = p.x - player.w
            player.vx = 0
          } else if (player.vx < 0 && wasRight) {
            nextX = p.x + p.w
            player.vx = 0
          }
        }
      }

      player.x = Math.max(0, Math.min(WORLD_W - player.w, nextX))
      player.y = nextY
    }

    const update = (t: number) => {
      if (!last) last = t
      const dt = Math.min((t - last) / 16.6667, 3)
      last = t

      const { runSpeed: speed, gravityMul: gMul } = paramsRef.current
      const gravity = 0.55 * gMul
      const accel = 0.5 * speed
      const maxRun = 5 * speed
      const jump = -11.2
      const friction = 0.82

      // Input
      const left = keys.has('arrowleft') || keys.has('a')
      const right = keys.has('arrowright') || keys.has('d')
      const jumpPressed = keys.has('arrowup') || keys.has('w') || keys.has(' ')

      if (left) player.vx -= accel * dt
      if (right) player.vx += accel * dt
      player.vx *= Math.pow(friction, dt)
      player.vx = Math.max(-maxRun, Math.min(maxRun, player.vx))

      if (player.grounded && jumpPressed) {
        player.vy = jump
        player.grounded = false
        keys.delete(' ')
      }

      player.vy += gravity * dt
      resolveCollisions()

      // Collect coins
      const cx = player.x + player.w / 2
      const cy = player.y + player.h / 2
      for (const coin of coins) {
        if (coin.collected) continue
        const dx = cx - coin.x
        const dy = cy - coin.y
        if (dx * dx + dy * dy <= (coin.r + player.w / 2) ** 2) {
          coin.collected = true
          collectedCount++
          setScore(collectedCount)
        }
      }

      // Win condition
      if (!hasWon && player.x + player.w >= FLAG.x) {
        hasWon = true
      }
    }

    const render = () => {
      const { w, h } = dims
      if (!w || !h) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const scale = h / WORLD_H
      const viewportW = w / scale
      const cameraX = Math.max(0, Math.min(WORLD_W - viewportW, player.x + player.w / 2 - viewportW / 2))

      // World transform
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
      ctx.clearRect(0, 0, WORLD_W, WORLD_H)

      // Background
      ctx.fillStyle = colors.stage
      ctx.fillRect(0, 0, WORLD_W, WORLD_H)

      // Distant grid
      ctx.strokeStyle = colors.border
      ctx.lineWidth = 1 / scale
      ctx.beginPath()
      for (let x = 0; x <= WORLD_W; x += 80) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, WORLD_H)
      }
      for (let y = 0; y <= WORLD_H; y += 80) {
        ctx.moveTo(0, y)
        ctx.lineTo(WORLD_W, y)
      }
      ctx.stroke()

      ctx.save()
      ctx.translate(-cameraX, 0)

      // Platforms
      for (const p of PLATFORMS) {
        ctx.fillStyle = colors.surface2
        ctx.strokeStyle = colors.border
        ctx.lineWidth = 1 / scale
        ctx.fillRect(p.x, p.y, p.w, p.h)
        ctx.strokeRect(p.x, p.y, p.w, p.h)
      }

      // Coins
      for (const coin of coins) {
        if (coin.collected) continue
        ctx.fillStyle = '#fbbf24'
        ctx.strokeStyle = '#b45309'
        ctx.lineWidth = 1 / scale
        ctx.beginPath()
        ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }

      // Flag
      ctx.fillStyle = '#94a3b8'
      ctx.fillRect(FLAG.x, FLAG.y, FLAG.w, FLAG.h)
      ctx.fillStyle = ACCENT
      ctx.beginPath()
      ctx.moveTo(FLAG.x + FLAG.w, FLAG.y)
      ctx.lineTo(FLAG.x + FLAG.w + 28, FLAG.y + 14)
      ctx.lineTo(FLAG.x + FLAG.w, FLAG.y + 28)
      ctx.closePath()
      ctx.fill()

      // Player
      ctx.fillStyle = ACCENT
      ctx.fillRect(player.x, player.y, player.w, player.h)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(player.x + (player.vx >= 0 ? 14 : 4), player.y + 8, 4, 4)
      ctx.fillRect(player.x + (player.vx >= 0 ? 18 : 8), player.y + 8, 4, 4)

      ctx.restore()

      // Screen-space UI
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = '12px ui-monospace, monospace'
      ctx.textAlign = 'left'
      ctx.fillStyle = colors.muted
      ctx.fillText(`Coins: ${collectedCount}/${coins.length}`, 12, 22)
      ctx.fillText('Arrows / WASD to move & jump • R to reset', 12, h - 12)

      if (hasWon) {
        ctx.textAlign = 'center'
        ctx.fillStyle = ACCENT
        ctx.font = 'bold 16px ui-monospace, monospace'
        ctx.fillText('Flag reached!', w / 2, h / 2)
        ctx.font = '12px ui-monospace, monospace'
        ctx.fillText('Press R to run again', w / 2, h / 2 + 20)
      }
    }

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (onscreen) {
        update(t)
        render()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

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
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [resetTick])

  return (
    <DemoFrame
      title="Mini Platformer"
      accent={ACCENT}
      blurb="Run, jump, collect coins, reach the flag"
      className={className}
      controls={
        <div className="flex items-center gap-3 font-mono text-[0.65rem]">
          <span className="text-[var(--color-muted)]">
            {score}/{COINS.length}
          </span>
          <label className="hidden items-center gap-1.5 text-[var(--color-muted)] sm:flex">
            SPD
            <input
              type="range"
              min={0.6}
              max={2}
              step={0.1}
              value={runSpeed}
              onChange={(e) => setRunSpeed(Number(e.target.value))}
              className="accent-project w-14"
            />
            {runSpeed.toFixed(1)}
          </label>
          <label className="hidden items-center gap-1.5 text-[var(--color-muted)] md:flex">
            GRV
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.1}
              value={gravityMul}
              onChange={(e) => setGravityMul(Number(e.target.value))}
              className="accent-project w-14"
            />
            {gravityMul.toFixed(1)}
          </label>
          <button
            type="button"
            onClick={() => setResetTick((n) => n + 1)}
            className="rounded-md px-2 py-1 text-white"
            style={{ backgroundColor: ACCENT }}
          >
            Reset
          </button>
        </div>
      }
    >
      <div ref={wrapRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>
    </DemoFrame>
  )
}
