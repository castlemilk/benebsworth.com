import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  {
    key: 'map',
    label: 'Map',
    type: 'select',
    options: [
      { label: 'Power z^α', value: 'power' },
      { label: 'Inversion 1/z', value: 'inversion' },
      { label: 'Joukowski z+1/z', value: 'joukowski' },
      { label: 'Exponential e^z', value: 'exponential' },
    ],
  },
  { key: 'power', label: 'Power α', type: 'range', min: 0.5, max: 4, step: 0.05 },
  { key: 'density', label: 'Density', type: 'range', min: 5, max: 20, step: 1 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = {
  map: 'power',
  power: 2,
  density: 12,
  color: '#7c5cff',
}

// ---------------------------------------------------------------------------
// Conformal maps: operate on complex numbers as [re, im]
// ---------------------------------------------------------------------------

function powerMap(zr: number, zi: number, alpha: number): [number, number] {
  // z^alpha = r^alpha * e^(i*alpha*theta)
  const r = Math.sqrt(zr * zr + zi * zi)
  if (r < 1e-12) return [0, 0]
  const theta = Math.atan2(zi, zr)
  const rn = Math.pow(r, alpha)
  const tn = alpha * theta
  return [rn * Math.cos(tn), rn * Math.sin(tn)]
}

function inversionMap(zr: number, zi: number): [number, number] {
  // 1/z = conj(z) / |z|^2
  const d = zr * zr + zi * zi
  if (d < 1e-12) return [0, 0]
  return [zr / d, -zi / d]
}

function joukowskiMap(zr: number, zi: number): [number, number] {
  // z + 1/z
  const d = zr * zr + zi * zi
  if (d < 1e-12) return [0, 0]
  const invR = zr / d
  const invI = -zi / d
  return [zr + invR, zi + invI]
}

function exponentialMap(zr: number, zi: number): [number, number] {
  // e^z = e^re * (cos(im) + i*sin(im))
  const er = Math.exp(zr)
  return [er * Math.cos(zi), er * Math.sin(zi)]
}

function applyMap(
  mapType: string, zr: number, zi: number, alpha: number,
): [number, number] {
  switch (mapType) {
    case 'inversion': return inversionMap(zr, zi)
    case 'joukowski': return joukowskiMap(zr, zi)
    case 'exponential': return exponentialMap(zr, zi)
    default: return powerMap(zr, zi, alpha)
  }
}

// Adaptive clip for wild maps
function clipToRange(
  re: number, im: number, maxR: number,
): [number, number] | null {
  const r = re * re + im * im
  if (r > maxR * maxR || !isFinite(re) || !isFinite(im)) return null
  return [re, im]
}

export const conformalGrid: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    return {
      step(t, p) {
        const mapType = p.map as string
        const alpha = p.power as number
        const density = p.density as number
        const color = p.color as string

        // Clear
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        const cx = w / 2
        const cy = h / 2
        const scale = Math.min(w, h) * 0.2 // pixels per unit in complex plane

        // Animate: slowly vary a rotation offset
        const animPhase = (t / 1000) * 0.15
        // For power map, also oscillate the power
        const effectiveAlpha = mapType === 'power'
          ? alpha + 0.3 * Math.sin(animPhase * 0.5)
          : alpha

        // Grid range
        const gridRange = mapType === 'exponential' ? 2.5 : 4.0
        const lineCount = density
        const samplesPerLine = 200

        // Max display radius for clipping
        const maxDisplayR = Math.max(w, h) * 0.6

        // World -> screen
        function toScreen(re: number, im: number): [number, number] {
          return [cx + re * scale, cy - im * scale]
        }

        // Draw faint original grid
        ctx.save()
        ctx.strokeStyle = theme.fg
        ctx.globalAlpha = 0.06
        ctx.lineWidth = 0.5

        // Horizontal lines (constant im)
        for (let i = -lineCount; i <= lineCount; i++) {
          const im = (i / lineCount) * gridRange
          ctx.beginPath()
          const [sx, sy] = toScreen(-gridRange, im)
          ctx.moveTo(sx, sy)
          const [ex, ey] = toScreen(gridRange, im)
          ctx.lineTo(ex, ey)
          ctx.stroke()
        }
        // Vertical lines (constant re)
        for (let i = -lineCount; i <= lineCount; i++) {
          const re = (i / lineCount) * gridRange
          ctx.beginPath()
          const [sx, sy] = toScreen(re, -gridRange)
          ctx.moveTo(sx, sy)
          const [ex, ey] = toScreen(re, gridRange)
          ctx.lineTo(ex, ey)
          ctx.stroke()
        }
        ctx.restore()

        // Draw mapped grid in accent color
        ctx.save()
        ctx.strokeStyle = color
        ctx.lineWidth = 1.2
        ctx.globalAlpha = 0.7

        // Helper to draw a mapped line
        function drawMappedLine(getZ: (s: number) => [number, number]) {
          ctx.beginPath()
          let started = false
          let prevValid = false

          for (let k = 0; k <= samplesPerLine; k++) {
            const s = (k / samplesPerLine) * 2 - 1 // -1 to 1
            const [zr, zi] = getZ(s)
            const [mr, mi] = applyMap(mapType, zr, zi, effectiveAlpha)
            const clipped = clipToRange(mr, mi, maxDisplayR / scale)
            if (clipped) {
              const [sx, sy] = toScreen(clipped[0], clipped[1])
              if (!prevValid || !started) {
                ctx.moveTo(sx, sy)
                started = true
              } else {
                ctx.lineTo(sx, sy)
              }
              prevValid = true
            } else {
              prevValid = false
            }
          }
          ctx.stroke()
        }

        // Horizontal lines (constant im)
        for (let i = -lineCount; i <= lineCount; i++) {
          const im = ((i / lineCount) * gridRange)
          drawMappedLine((s) => [s * gridRange, im])
        }

        // Vertical lines (constant re)
        for (let i = -lineCount; i <= lineCount; i++) {
          const re = ((i / lineCount) * gridRange)
          drawMappedLine((s) => [re, s * gridRange])
        }

        ctx.restore()

        // Draw unit circle reference
        ctx.save()
        ctx.strokeStyle = theme.fg
        ctx.globalAlpha = 0.15
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.arc(cx, cy, scale, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()

        // Axes
        ctx.save()
        ctx.strokeStyle = theme.fg
        ctx.globalAlpha = 0.1
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(0, cy)
        ctx.lineTo(w, cy)
        ctx.moveTo(cx, 0)
        ctx.lineTo(cx, h)
        ctx.stroke()
        ctx.restore()

        // Label
        ctx.save()
        ctx.font = '11px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.4
        const labels: Record<string, string> = {
          power: `f(z) = z^${effectiveAlpha.toFixed(2)}`,
          inversion: 'f(z) = 1/z',
          joukowski: 'f(z) = z + 1/z  (Joukowski)',
          exponential: 'f(z) = e^z',
        }
        ctx.fillText(labels[mapType] || '', 12, h - 12)
        ctx.restore()
      },
    }
  },
}
