import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'order', label: 'Modulation', type: 'select', options: [
    { label: 'QPSK (4)', value: '4' },
    { label: '16-QAM', value: '16' },
    { label: '64-QAM', value: '64' },
  ]},
  { key: 'snr', label: 'SNR (dB)', type: 'range', min: 5, max: 30, step: 1 },
]

export const defaults: Params = { order: '16', snr: 20 }

export const createRenderer = (
  ctx: CanvasRenderingContext2D,
  dims: { w: number; h: number; dpr: number },
  theme?: { bg?: string; fg?: string },
) => {
  const { w, h } = dims
  const bg = theme?.bg ?? '#0a0a12'
  const fg = theme?.fg ?? '#c8d8e8'
  const accent = '#00b4d8'

  const POINTS = 300
  const scatterX = new Float32Array(POINTS)
  const scatterY = new Float32Array(POINTS)
  let head = 0

  function randn() {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  let lastTime = 0

  return {
    step(timeMs: number, params: Params) {
      const dt = Math.min((timeMs - lastTime) / 1000, 0.05)
      lastTime = timeMs

      const order = parseInt((params.order ?? defaults.order) as string)
      const snr = (params.snr ?? defaults.snr) as number
      const sigma = Math.pow(10, -snr / 20)

      // Build constellation
      const nLevels = Math.sqrt(order) | 0
      const symbols: [number, number][] = []
      for (let re = -nLevels + 1; re <= nLevels - 1; re += 2) {
        for (let im = -nLevels + 1; im <= nLevels - 1; im += 2) {
          symbols.push([re, im] as [number, number])
        }
      }
      const normFactor = Math.sqrt((symbols.reduce((s, [re, im]) => s + re * re + im * im, 0)) / order)

      const numNew = Math.ceil(3 * dt * 60)
      for (let n = 0; n < numNew; n++) {
        const sym = symbols[Math.floor(Math.random() * symbols.length)]
        const rx = (sym[0] + randn() * sigma) / normFactor
        const ry = (sym[1] + randn() * sigma) / normFactor
        scatterX[head] = rx
        scatterY[head] = ry
        head = (head + 1) % POINTS
      }

      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      ctx.fillStyle = fg
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'center'
      const modLabel = order === 4 ? 'QPSK' : order === 16 ? '16-QAM' : '64-QAM'
      ctx.fillText(`${modLabel} Constellation — AWGN Channel`, w / 2, 28)

      const cx = w / 2
      const cy = h / 2 + 10
      const scale = Math.min(w, h) * 0.35

      // Grid
      ctx.strokeStyle = '#1a2a3a'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 4])
      for (let g = -nLevels; g <= nLevels; g++) {
        const gx = cx + (g / nLevels) * scale
        const gy = cy + (g / nLevels) * scale
        ctx.beginPath()
        ctx.moveTo(gx, cy - scale)
        ctx.lineTo(gx, cy + scale)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(cx - scale, gy)
        ctx.lineTo(cx + scale, gy)
        ctx.stroke()
      }
      ctx.setLineDash([])

      ctx.strokeStyle = '#1e3a4a'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, scale, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = '#2a3a4a'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx - scale - 10, cy)
      ctx.lineTo(cx + scale + 10, cy)
      ctx.moveTo(cx, cy - scale - 10)
      ctx.lineTo(cx, cy + scale + 10)
      ctx.stroke()

      ctx.fillStyle = '#5a6a7a'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('I→', cx + scale + 16, cy + 4)
      ctx.save()
      ctx.translate(cx - 10, cy - scale - 16)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText('Q→', 0, 0)
      ctx.restore()

      for (let i = 0; i < POINTS; i++) {
        const age = (head - i + POINTS) % POINTS
        const alpha = 0.15 + 0.7 * (age / POINTS)
        ctx.fillStyle = `rgba(0, 180, 216, ${alpha})`
        const px = cx + scatterX[i] * scale
        const py = cy - scatterY[i] * scale
        ctx.fillRect(px - 2, py - 2, 4, 4)
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      for (const [re, im] of symbols) {
        const px = cx + (re / normFactor) * scale
        const py = cy - (im / normFactor) * scale
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = '#5a6a7a'
      ctx.font = '11px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`SNR: ${snr} dB`, w - 30, 50)
      ctx.fillStyle = accent
      ctx.fillText(`${modLabel}  ·  ${POINTS} symbols`, w - 30, 66)
    },
  }
}

export const constellationPlot: EffectModule = { controls, defaults, createRenderer }
