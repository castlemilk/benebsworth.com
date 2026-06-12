import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'gridSize', label: 'Grid size', type: 'range', min: 8, max: 40, step: 1 },
  { key: 'frequency', label: 'Frequency', type: 'range', min: 0.1, max: 1.0, step: 0.05 },
  { key: 'amplitude', label: 'Amplitude', type: 'range', min: 0.1, max: 2.0, step: 0.1 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.2, max: 3, step: 0.1 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = {
  gridSize: 24,
  frequency: 0.4,
  amplitude: 0.8,
  speed: 1,
  color: '#00e0b8',
}

const MAX_GRID = 40
const MAX_VERTS = MAX_GRID * MAX_GRID
const ALPHA_LEVELS = 8

export const meshWave: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, _theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    void _theme

    // Preallocate projected screen coords
    const projX = new Float32Array(MAX_VERTS)
    const projY = new Float32Array(MAX_VERTS)
    const heightArr = new Float32Array(MAX_VERTS)

    // Segment alpha values: store per-segment so we can batch by alpha bucket
    // Max horizontal segments: MAX_GRID * (MAX_GRID-1), same for vertical
    const MAX_SEGS = MAX_GRID * (MAX_GRID - 1) * 2
    const segAlpha = new Uint8Array(MAX_SEGS) // quantized 0..ALPHA_LEVELS

    return {
      step(t, p) {
        const { w, h } = dims
        ctx.clearRect(0, 0, w, h)

        const grid = p.gridSize as number
        const freq = p.frequency as number
        const amp = p.amplitude as number
        const time = (t / 1000) * (p.speed as number)
        const color = p.color as string

        const cx = w / 2
        const cy = h / 2
        const cellSize = Math.min(w, h) / (grid * 1.2)
        const halfGrid = (grid - 1) / 2
        const heightScale = cellSize * 1.5
        const maxH = amp * heightScale

        // --- Compute vertices ---
        for (let row = 0; row < grid; row++) {
          const ry = (row - halfGrid) / halfGrid
          const wy = (row - halfGrid) * cellSize
          for (let col = 0; col < grid; col++) {
            const idx = row * grid + col
            const rx = (col - halfGrid) / halfGrid
            const wx = (col - halfGrid) * cellSize

            // Height from layered sine waves
            const z =
              Math.sin(rx * freq * 9.42 + time) *
              Math.cos(ry * freq * 9.42 + time * 0.7) *
              amp * heightScale

            heightArr[idx] = z

            // Isometric-ish projection
            projX[idx] = cx + wx - wy * 0.5
            projY[idx] = cy - z + wy * 0.3
          }
        }

        // --- Compute segment alphas ---
        let segIdx = 0

        // Horizontal segments
        for (let row = 0; row < grid; row++) {
          const rowOff = row * grid
          const ry = (row - halfGrid) / halfGrid
          const edgeFadeRow = 1 - ry * ry
          for (let col = 0; col < grid - 1; col++) {
            const i0 = rowOff + col
            const i1 = rowOff + col + 1
            const avgH = (heightArr[i0] + heightArr[i1]) * 0.5
            const hAlpha = 0.15 + 0.85 * (avgH / maxH * 0.5 + 0.5)
            const rx0 = (col - halfGrid) / halfGrid
            const rx1 = (col + 1 - halfGrid) / halfGrid
            const edgeFadeCol = 1 - (rx0 * rx0 + rx1 * rx1) * 0.5
            const a = hAlpha * edgeFadeRow * edgeFadeCol
            segAlpha[segIdx++] = a > 1 ? ALPHA_LEVELS : (a < 0 ? 0 : ((a * ALPHA_LEVELS) | 0))
          }
        }

        // Vertical segments
        for (let col = 0; col < grid; col++) {
          const rx = (col - halfGrid) / halfGrid
          const edgeFadeCol = 1 - rx * rx
          for (let row = 0; row < grid - 1; row++) {
            const i0 = row * grid + col
            const i1 = (row + 1) * grid + col
            const avgH = (heightArr[i0] + heightArr[i1]) * 0.5
            const hAlpha = 0.15 + 0.85 * (avgH / maxH * 0.5 + 0.5)
            const ry0 = (row - halfGrid) / halfGrid
            const ry1 = (row + 1 - halfGrid) / halfGrid
            const edgeFadeRow = 1 - (ry0 * ry0 + ry1 * ry1) * 0.5
            const a = hAlpha * edgeFadeCol * edgeFadeRow
            segAlpha[segIdx++] = a > 1 ? ALPHA_LEVELS : (a < 0 ? 0 : ((a * ALPHA_LEVELS) | 0))
          }
        }

        // --- Draw: batch lines by alpha level (ALPHA_LEVELS draw calls per frame) ---
        ctx.strokeStyle = color
        ctx.lineWidth = 1

        for (let level = 1; level <= ALPHA_LEVELS; level++) {
          ctx.globalAlpha = level / ALPHA_LEVELS
          ctx.beginPath()

          // Horizontal segments
          let si = 0
          for (let row = 0; row < grid; row++) {
            const rowOff = row * grid
            for (let col = 0; col < grid - 1; col++) {
              if (segAlpha[si] === level) {
                const i0 = rowOff + col
                ctx.moveTo(projX[i0], projY[i0])
                ctx.lineTo(projX[i0 + 1], projY[i0 + 1])
              }
              si++
            }
          }

          // Vertical segments
          for (let col = 0; col < grid; col++) {
            for (let row = 0; row < grid - 1; row++) {
              if (segAlpha[si] === level) {
                const i0 = row * grid + col
                const i1v = i0 + grid
                ctx.moveTo(projX[i0], projY[i0])
                ctx.lineTo(projX[i1v], projY[i1v])
              }
              si++
            }
          }

          ctx.stroke()
        }

        ctx.globalAlpha = 1
      },
    }
  },
}
