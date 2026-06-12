import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'
import { makeNoise2D } from '@/lib/lab/noise'

export const controls: ControlSpec[] = [
  { key: 'density', label: 'Density', type: 'range', min: 50, max: 400, step: 10 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 3, step: 0.1 },
  { key: 'curl', label: 'Curl', type: 'range', min: 0.001, max: 0.01, step: 0.001 },
  { key: 'trail', label: 'Trail', type: 'range', min: 0.01, max: 0.15, step: 0.01 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = {
  density: 200,
  speed: 1,
  curl: 0.004,
  trail: 0.04,
  color: '#8a9ba8',
}

const TWO_PI = Math.PI * 2
const MAX_PARTICLES = 400

// Pre-allocate typed arrays
const px = new Float32Array(MAX_PARTICLES)
const py = new Float32Array(MAX_PARTICLES)

function respawn(i: number, w: number, h: number) {
  px[i] = Math.random() * w
  py[i] = Math.random() * h
}

export const flowStreams: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const noise = makeNoise2D(42)
    const noise2 = makeNoise2D(137) // second layer for richer flow

    // Initialize all particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      respawn(i, w, h)
    }

    return {
      step(t, p) {
        const count = p.density as number
        const speed = p.speed as number
        const curl = p.curl as number
        const trail = p.trail as number
        const color = p.color as string

        // Fade trail
        ctx.save()
        ctx.globalAlpha = trail
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)
        ctx.restore()

        const time = (t / 1000) * speed

        // Parse color once for stroke
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.6

        ctx.beginPath()

        for (let i = 0; i < count; i++) {
          const x = px[i]
          const y = py[i]

          // Two-octave noise for richer curling
          const n1 = noise(x * curl + time * 0.7, y * curl + time * 0.3)
          const n2 = noise2(x * curl * 1.5 - time * 0.5, y * curl * 1.5 + time * 0.4)
          const angle = (n1 * 0.7 + n2 * 0.3) * TWO_PI * 2

          const vx = Math.cos(angle) * 1.2
          const vy = Math.sin(angle) * 1.2

          const nx = x + vx
          const ny = y + vy

          // Draw thin line segment
          ctx.moveTo(x, y)
          ctx.lineTo(nx, ny)

          px[i] = nx
          py[i] = ny

          // Respawn if out of bounds
          if (nx < -10 || nx > w + 10 || ny < -10 || ny > h + 10) {
            respawn(i, w, h)
          }
        }

        ctx.stroke()
        ctx.globalAlpha = 1
      },
    }
  },
}
