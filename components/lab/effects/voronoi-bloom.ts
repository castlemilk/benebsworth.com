import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'seeds', label: 'Seeds', type: 'range', min: 4, max: 16, step: 1 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 2, step: 0.1 },
  { key: 'size', label: 'Size', type: 'range', min: 0.3, max: 1.5, step: 0.1 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = { seeds: 8, speed: 0.6, size: 0.8, color: '#7c5cff' }

/* ---- helpers (inline, zero deps) ---- */

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = ((n >> 16) & 0xff) / 255
  const g = ((n >> 8) & 0xff) / 255
  const b = (n & 0xff) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

/* Preallocated seed pool (max 16) */
interface Seed {
  x: number
  y: number
  phaseX: number
  phaseY: number
  freqX: number
  freqY: number
  hue: number
  pulseOffset: number
}

const MAX_SEEDS = 16
const pool: Seed[] = []
let poolInited = false

function ensurePool() {
  if (poolInited) return
  for (let i = 0; i < MAX_SEEDS; i++) {
    // Deterministic-ish Lissajous parameters per seed index
    const freqX = 0.3 + ((i * 7 + 3) % 11) / 11 * 0.7 // 0.3 – 1.0
    const freqY = 0.2 + ((i * 5 + 2) % 13) / 13 * 0.6 // 0.2 – 0.8
    const phaseX = (i * 2.399) % (Math.PI * 2) // golden-ratio-ish spread
    const phaseY = (i * 3.891) % (Math.PI * 2)
    const pulseOffset = (i * 1.7) % (Math.PI * 2)
    pool.push({ x: 0, y: 0, phaseX, phaseY, freqX, freqY, hue: 0, pulseOffset })
  }
  poolInited = true
}

export const voronoiBloom: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, _theme) {
    ensurePool()

    return {
      step(t, p) {
        const { w, h } = dims
        const count = Math.min(p.seeds as number, MAX_SEEDS)
        const speed = p.speed as number
        const sizeMul = p.size as number
        const accentHex = p.color as string

        const [baseH, baseS, baseL] = hexToHsl(accentHex)

        const time = (t / 1000) * speed

        // Clear to transparent
        ctx.clearRect(0, 0, w, h)

        // Additive blending
        ctx.globalCompositeOperation = 'lighter'

        const radius = Math.min(w, h) * 0.5 * sizeMul

        for (let i = 0; i < count; i++) {
          const seed = pool[i]

          // Lissajous orbit positions
          const lx = Math.sin(time * seed.freqX + seed.phaseX)
          const ly = Math.cos(time * seed.freqY + seed.phaseY)

          seed.x = w * 0.5 + lx * (w * 0.35)
          seed.y = h * 0.5 + ly * (h * 0.35)

          // Shift hue evenly around the wheel per seed
          seed.hue = ((baseH * 360 + (i / count) * 360) % 360) / 360

          // Subtle pulse on radius
          const pulse = 1 + Math.sin(time * 1.2 + seed.pulseOffset) * 0.08
          const r = radius * pulse

          const color = `hsl(${seed.hue * 360}, ${Math.round(baseS * 100)}%, ${Math.round(Math.min(baseL + 0.1, 0.7) * 100)}%)`
          const transparent = `hsla(${seed.hue * 360}, ${Math.round(baseS * 100)}%, ${Math.round(Math.min(baseL + 0.1, 0.7) * 100)}%, 0)`

          const grad = ctx.createRadialGradient(seed.x, seed.y, 0, seed.x, seed.y, r)
          grad.addColorStop(0, color)
          grad.addColorStop(1, transparent)

          ctx.globalAlpha = 0.35
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(seed.x, seed.y, r, 0, Math.PI * 2)
          ctx.fill()
        }

        // Reset composite
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
      },
    }
  },
}
