import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'freq', label: 'Normalized freq (f/fc)', type: 'range', min: 0.01, max: 3, step: 0.01 },
  { key: 'type', label: 'Type', type: 'select', options: [
    { label: 'S11 (reflection)', value: 's11' },
    { label: 'Impedance path', value: 'z' },
    { label: 'Admittance path', value: 'y' },
  ]},
]

export const defaults: Params = { freq: 0.8, type: 's11' }

export const createRenderer = (
  ctx: CanvasRenderingContext2D,
  dims: { w: number; h: number; dpr: number },
  theme?: { bg?: string; fg?: string },
) => {
  const { w, h } = dims
  const bg = theme?.bg ?? '#0a0a12'
  const fg = theme?.fg ?? '#c8d8e8'
  const accent = '#00b4d8'

  const cx = w / 2
  const cy = h / 2
  const R = Math.min(w, h) * 0.4

  const HISTORY = 600
  const pathX = new Float32Array(HISTORY)
  const pathY = new Float32Array(HISTORY)
  let head = 0

  let lastTime = 0
  let currentFreq = defaults.freq as number

  return {
    step(timeMs: number, params: Params) {
      const dt = Math.min((timeMs - lastTime) / 1000, 0.05)
      lastTime = timeMs

      const targetFreq = (params.freq ?? defaults.freq) as number
      currentFreq += (targetFreq - currentFreq) * Math.min(1, dt * 2)

      const f = currentFreq

      // Series RLC: Z = R + j(XL - XC)
      // For Smith chart: Γ = (Z - Z0)/(Z + Z0) with Z0 = 1
      // Impedance Z normalized: z = r + jx
      // Γ = (z - 1)/(z + 1)
      // On Smith chart, real part circles and imaginary part arcs

      const type = (params.type ?? defaults.type) as string

      // Sweep through the frequency range for the trail
      const _steps = 200
      const fMin = 0.01, fMax = 3

      for (let s = 0; s < 3; s++) {
        const fi = fMin + ((head + s) % HISTORY) / HISTORY * (fMax - fMin)
        const _fi2 = fi * fi

        let re: number, im: number

        if (type === 's11') {
          // Reflection coefficient for series RLC
          // Z = R + j(ωL - 1/ωC)  normalized to R0=1
          const r = 0.5
          const x = 2 * Math.PI * fi * 0.5 - 1 / (2 * Math.PI * fi * 0.2)
          const denRe = r + 1, denIm = x
          const numRe = r - 1, numIm = x
          const denMag2 = denRe * denRe + denIm * denIm
          re = (numRe * denRe + numIm * denIm) / denMag2
          im = (numIm * denRe - numRe * denIm) / denMag2
        } else if (type === 'z') {
          // Impedance: z = r + jx for series RLC
          const r = 0.5
          const x = 2 * Math.PI * fi * 0.5 - 1 / (2 * Math.PI * fi * 0.2)
          re = r / (1 + r)
          im = x / (2 + x)
        } else {
          // Admittance: y = g + jb
          const g = 1 / 0.5
          const b = -1 / (2 * Math.PI * fi * 0.5 - 1 / (2 * Math.PI * fi * 0.2))
          re = g / (1 + g)
          im = b / (2 + b)
        }

        pathX[(head + s) % HISTORY] = re
        pathY[(head + s) % HISTORY] = im
      }
      head = (head + 3) % HISTORY

      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      ctx.fillStyle = fg
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'center'
      const typeLabel = type === 's11' ? 'S11 Reflection' : type === 'z' ? 'Impedance' : 'Admittance'
      ctx.fillText(`Smith Chart — ${typeLabel}`, w / 2, 28)

      // Draw circles for constant resistance
      ctx.strokeStyle = '#1a3a4a'
      ctx.lineWidth = 1

      // Outer circle (|Γ|=1 boundary)
      ctx.strokeStyle = '#2a4a5a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.stroke()

      // Constant R circles (real part of Z)
      ctx.strokeStyle = '#1a2a3a'
      ctx.lineWidth = 1
      for (const rVal of [0, 0.2, 0.5, 1, 2]) {
        const rCenter = R * rVal / (1 + rVal)
        const rRadius = R / (1 + rVal)
        ctx.beginPath()
        ctx.arc(cx + R * rCenter / R, cy, rRadius, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Constant X arcs (imaginary part of Z)
      for (const xVal of [-2, -1, -0.5, 0.5, 1, 2]) {
        const xCenter = -R / xVal
        const xRadius = Math.abs(R / xVal)
        ctx.beginPath()
        ctx.arc(cx, cy + xCenter, xRadius, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Unit conductance circle (for admittance)
      ctx.setLineDash([3, 4])
      ctx.strokeStyle = '#1e3a4a'
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Axes
      ctx.strokeStyle = '#2a3a4a'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx - R, cy)
      ctx.lineTo(cx + R, cy)
      ctx.moveTo(cx, cy - R)
      ctx.lineTo(cx, cy + R)
      ctx.stroke()

      // Label
      ctx.fillStyle = '#5a6a7a'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('1', cx + R + 12, cy + 4)
      ctx.fillText('−1', cx - R - 12, cy + 4)
      ctx.save()
      ctx.translate(cx - R - 16, cy - R - 16)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText('j', 0, 0)
      ctx.restore()

      // Current point marker
      let curRe: number, curIm: number
      if (type === 's11') {
        const r = 0.5
        const x = 2 * Math.PI * f * 0.5 - 1 / (2 * Math.PI * f * 0.2)
        const denMag2 = (r + 1) * (r + 1) + x * x
        curRe = ((r - 1) * (r + 1) + x * x) / denMag2
        curIm = (x * (r + 1) - (r - 1) * x) / denMag2
      } else if (type === 'z') {
        const r = 0.5, x = 2 * Math.PI * f * 0.5 - 1 / (2 * Math.PI * f * 0.2)
        curRe = r / (1 + r); curIm = x / (2 + x)
      } else {
        const g = 1 / 0.5, b = -1 / (2 * Math.PI * f * 0.5 - 1 / (2 * Math.PI * f * 0.2))
        curRe = g / (1 + g); curIm = b / (2 + b)
      }

      // Frequency arc
      ctx.strokeStyle = '#2a4a5a'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      for (let i = 0; i <= 100; i++) {
        const fi = fMin + (i / 100) * (fMax - fMin)
        const _fi2 = fi * fi
        let re: number, im: number
        if (type === 's11') {
          const r = 0.5
          const x = 2 * Math.PI * fi * 0.5 - 1 / (2 * Math.PI * fi * 0.2)
          const denMag2 = (r + 1) * (r + 1) + x * x
          re = ((r - 1) * (r + 1) + x * x) / denMag2
          im = (x * (r + 1) - (r - 1) * x) / denMag2
        } else {
          re = 0.5; im = 0
        }
        const px = cx + re * R
        const py = cy - im * R
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
      ctx.setLineDash([])

      // Path trail
      ctx.strokeStyle = accent
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < HISTORY; i++) {
        const idx = (head + i) % HISTORY
        const px = cx + pathX[idx] * R
        const py = cy - pathY[idx] * R
        if (i === 0) {
          ctx.moveTo(px, py)
        } else {
          ctx.lineTo(px, py)
        }
      }
      ctx.stroke()

      // Current point
      ctx.fillStyle = '#ff7a59'
      ctx.beginPath()
      ctx.arc(cx + curRe * R, cy - curIm * R, 5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#5a6a7a'
      ctx.font = '11px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`f/fc = ${f.toFixed(3)}`, w - 30, 48)
    },
  }
}

export const smithChart: EffectModule = { controls, defaults, createRenderer }
