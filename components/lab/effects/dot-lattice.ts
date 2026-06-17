import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'
import { makeNoise2D } from '@/lib/lab/noise'

export const controls: ControlSpec[] = [
  { key: 'spacing', label: 'Spacing', type: 'range', min: 15, max: 40, step: 1 },
  { key: 'amplitude', label: 'Amplitude', type: 'range', min: 0.1, max: 1, step: 0.05 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 2, step: 0.1 },
  { key: 'waveScale', label: 'Wave scale', type: 'range', min: 0.5, max: 3, step: 0.1 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = { spacing: 24, amplitude: 0.5, speed: 0.5, waveScale: 1.2, color: '#7c5cff' }

export const dotLattice: EffectModule = {
  controls,
  defaults,

  createRenderer(ctx, dims, _theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    void _theme
    const noise = makeNoise2D(42)

    return {
      step(timeMs, params) {
        const { w, h } = dims
        const spacing = params.spacing as number
        const amplitude = params.amplitude as number
        const speed = params.speed as number
        const waveScale = params.waveScale as number
        const color = params.color as string

        // Clear fully each frame — no fade trail
        ctx.clearRect(0, 0, w, h)

        const t = (timeMs / 1000) * speed

        const cols = Math.ceil(w / spacing) + 1
        const rows = Math.ceil(h / spacing) + 1

        // Base dot radius: ~20-25% of spacing so they breathe without overlapping
        const baseRadius = spacing * 0.12

        // Noise scale derived from waveScale; higher = larger coherent patches
        const nx = 0.04 * waveScale
        const ny = 0.04 * waveScale

        for (let row = 0; row < rows; row++) {
          const gy = row * spacing + spacing * 0.5
          for (let col = 0; col < cols; col++) {
            const gx = col * spacing + spacing * 0.5

            // Sample noise with slow time scroll for the breathing wave
            const nSize = noise(col * nx + t * 0.3, row * ny + t * 0.2)
            const nOffsetX = noise(col * nx + t * 0.15 + 100, row * ny + t * 0.15)
            const nOffsetY = noise(col * nx + t * 0.15, row * ny + t * 0.15 + 200)
            const nAlpha = noise(col * nx + t * 0.25 + 300, row * ny + t * 0.25 + 300)

            // Position offset: amplitude controls max displacement as fraction of spacing
            const maxOffset = spacing * amplitude * 0.4
            const dx = nOffsetX * maxOffset
            const dy = nOffsetY * maxOffset

            // Size modulation: baseRadius + noise-scaled variation
            const radius = Math.max(0.5, baseRadius * (0.6 + 0.8 * (nSize * 0.5 + 0.5) * amplitude))

            // Alpha modulation: subtle breathing in opacity
            const alpha = 0.15 + 0.7 * (nAlpha * 0.5 + 0.5) * (0.5 + amplitude * 0.5)

            ctx.beginPath()
            ctx.arc(gx + dx, gy + dy, radius, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.globalAlpha = alpha
            ctx.fill()
          }
        }

        ctx.globalAlpha = 1
      },
    }
  },
}
