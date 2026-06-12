import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'
import { makeNoise2D } from '@/lib/lab/noise'

export const controls: ControlSpec[] = [
  { key: 'blobs', label: 'Blobs', type: 'range', min: 2, max: 8, step: 1 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 2, step: 0.1 },
  { key: 'scale', label: 'Scale', type: 'range', min: 0.3, max: 1, step: 0.05 },
  { key: 'trail', label: 'Trail', type: 'range', min: 0.02, max: 0.2, step: 0.01 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = {
  blobs: 5,
  speed: 0.6,
  scale: 0.65,
  trail: 0.08,
  color: '#c47a5a',
}

const MAX_BLOBS = 8
const TWO_PI = Math.PI * 2

// Pre-compute Lissajous frequency ratios (coprime pairs for organic paths)
const FREQ_X = new Float32Array([1, 2, 3, 5, 7, 2, 3, 5])
const FREQ_Y = new Float32Array([2, 3, 5, 7, 11, 7, 11, 13])
const PHASE = new Float32Array([0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9])

// Pre-allocate reusable arrays
const bx = new Float32Array(MAX_BLOBS)
const by = new Float32Array(MAX_BLOBS)
const br = new Float32Array(MAX_BLOBS)

export const metaballBloom: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const cx = w / 2
    const cy = h / 2
    const minDim = Math.min(w, h)

    // Two independent noise fields for position wander and size pulse
    const noisePos = makeNoise2D(97)
    const noiseSize = makeNoise2D(251)

    return {
      step(t, p) {
        const count = p.blobs as number
        const speed = p.speed as number
        const scale = p.scale as number
        const trail = p.trail as number
        const color = p.color as string

        // Fade trail
        ctx.save()
        ctx.globalAlpha = trail
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)
        ctx.restore()

        const time = (t / 1000) * speed
        const baseRadius = minDim * 0.18 * scale
        const pathRadius = minDim * 0.3 * scale

        // Compute blob positions via Lissajous + noise wander
        for (let i = 0; i < count; i++) {
          const fx = FREQ_X[i]
          const fy = FREQ_Y[i]
          const ph = PHASE[i]

          // Lissajous base path
          const lx = Math.sin(time * fx * 0.3 + ph)
          const ly = Math.sin(time * fy * 0.3 + ph * 1.3)

          // Noise-driven wander offset for organic feel
          const wanderX = noisePos(time * 0.2 + i * 10, i * 3.7) * minDim * 0.08
          const wanderY = noisePos(i * 3.7, time * 0.2 + i * 10) * minDim * 0.08

          bx[i] = cx + lx * pathRadius + wanderX
          by[i] = cy + ly * pathRadius + wanderY

          // Pulsing radius via noise
          const sizeNoise = noiseSize(time * 0.5 + i * 5.3, i * 7.1)
          br[i] = Math.max(8, baseRadius * (0.7 + sizeNoise * 0.3))
        }

        // Additive blending for metaball merge effect
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        for (let i = 0; i < count; i++) {
          const r = br[i]
          const x = bx[i]
          const y = by[i]

          const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
          grad.addColorStop(0, color)
          grad.addColorStop(0.4, color + 'aa')
          grad.addColorStop(0.7, color + '33')
          grad.addColorStop(1, 'transparent')

          ctx.globalAlpha = 0.45
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, r, 0, TWO_PI)
          ctx.fill()
        }

        ctx.restore()
      },
    }
  },
}
