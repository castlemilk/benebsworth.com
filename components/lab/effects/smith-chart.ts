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

  // Bilinear (Möbius) Smith transform: a normalized impedance z = re + j·im
  // maps to the reflection coefficient Γ = (z − 1)/(z + 1), |Γ| ≤ 1.
  const gamma = (re: number, im: number): [number, number] => {
    const denRe = re + 1, denIm = im
    const numRe = re - 1, numIm = im
    const denMag2 = denRe * denRe + denIm * denIm
    return [
      (numRe * denRe + numIm * denIm) / denMag2,
      (numIm * denRe - numRe * denIm) / denMag2,
    ]
  }

  // Series-RLC normalized impedance z = r + j·x at a given f/fc, then the
  // plotted reflection point for each chart mode. The admittance chart is
  // the impedance chart rotated 180°: plot Γ for y = 1/z via (1 − y)/(1 + y),
  // which is just −Γ(z).
  const point = (fi: number, type: string): [number, number] => {
    const r = 0.5
    const x = 2 * Math.PI * fi * 0.5 - 1 / (2 * Math.PI * fi * 0.2)
    const [gRe, gIm] = gamma(r, x)
    return type === 'y' ? [-gRe, -gIm] : [gRe, gIm]
  }

  let lastTime = 0
  let currentFreq = defaults.freq as number

  return {
    step(timeMs: number, params: Params) {
      const dt = Math.min((timeMs - lastTime) / 1000, 0.05)
      lastTime = timeMs

      const targetFreq = (params.freq ?? defaults.freq) as number
      currentFreq += (targetFreq - currentFreq) * Math.min(1, dt * 2)

      const f = currentFreq

      // Series RLC: Z = R + j(XL - XC), normalized to Z0 = 1 so z = r + jx.
      // The reflection coefficient is the bilinear transform Γ = (z - 1)/(z + 1)
      // (see `gamma`/`point` above). The locus below is the static frequency
      // sweep of that transform; the swept-point marker animates with `f`.

      const type = (params.type ?? defaults.type) as string

      // Frequency range for the swept locus
      const fMin = 0.01, fMax = 3

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

      // Constant-R circles and constant-X arcs are full circles whose centres
      // sit on (or beyond) the |Γ|=1 boundary, so most of each constant-X arc
      // lies outside the chart. Clip to the unit disk so only the in-disk
      // portion is drawn (and never bleeds over the title).
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.clip()

      // Constant R circles (real part of Z)
      ctx.strokeStyle = '#1a2a3a'
      ctx.lineWidth = 1
      for (const rVal of [0, 0.2, 0.5, 1, 2]) {
        const rCenter = R * rVal / (1 + rVal)
        const rRadius = R / (1 + rVal)
        ctx.beginPath()
        ctx.arc(cx + rCenter, cy, rRadius, 0, Math.PI * 2)
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
      ctx.restore()

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

      // Current swept point: the bilinear transform of z at the current f/fc.
      const [curRe, curIm] = point(f, type)

      // Static swept locus: the frequency sweep of Γ across fMin..fMax, drawn
      // once per frame from the closed-form transform (no ring buffer — the
      // animation lives in the swept-point marker below).
      const SAMPLES = 200
      ctx.strokeStyle = accent
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i <= SAMPLES; i++) {
        const fi = fMin + (i / SAMPLES) * (fMax - fMin)
        const [re, im] = point(fi, type)
        const px = cx + re * R
        const py = cy - im * R
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
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
