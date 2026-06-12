import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'Kp', label: 'Loop bandwidth K', type: 'range', min: 0.5, max: 5, step: 0.1 },
  { key: 'order', label: 'Filter order', type: 'select', options: [
    { label: '1st order', value: '1' },
    { label: '2nd order', value: '2' },
  ]},
]

export const defaults: Params = { Kp: 2, order: '2' }

export const createRenderer = (
  ctx: CanvasRenderingContext2D,
  dims: { w: number; h: number; dpr: number },
  theme?: { bg?: string; fg?: string },
) => {
  const { w, h } = dims
  const bg = theme?.bg ?? '#0a0a12'
  const fg = theme?.fg ?? '#c8d8e8'
  const accent = '#00b4d8'

  const margin = { left: 60, right: 30, top: 70, bottom: 40 }
  const pw = w - margin.left - margin.right
  const ph = h - margin.top - margin.bottom

  const MAX = 500
  const refPhase = new Float32Array(MAX)
  const vcoFreq = new Float32Array(MAX)
  const pdOut = new Float32Array(MAX)
  let head = 0

  // PLL state
  let phase = 0
  let freq = 1.0  // VCO frequency (normalized)
  let lastTime = 0

  return {
    step(timeMs: number, params: Params) {
      const dt = Math.min((timeMs - lastTime) / 1000, 0.05)
      lastTime = timeMs

      const K = (params.Kp ?? defaults.Kp) as number
      const order = parseInt((params.order ?? defaults.order) as string)

      // Reference: chirp from 0.8 to 1.2 over 10s then hold
      const t = timeMs / 1000
      const refFreq = t < 10 ? 0.8 + t * 0.04 : 1.2
      const refPhaseInc = 2 * Math.PI * refFreq * dt

      for (let rep = 0; rep < 4; rep++) {
        // Phase detector (edge-triggered XOR or simple cosine)
        const _pd = Math.sin(phase) * Math.cos(phase) // simplified PFD
        // Actually use a proper phase detector: sin(phi) for sinusoidal PLL
        const phaseErr = Math.sin(phase)

        // Loop filter (P or PI)
        if (order === 1) {
          freq += K * phaseErr * dt
        } else {
          // PI filter: Kp*err + Ki*integral
          const Ki = K * 0.5
          freq += (K * phaseErr + Ki * phaseErr * dt) * dt
        }

        freq = Math.max(0.1, Math.min(3, freq))

        // VCO integration
        phase += 2 * Math.PI * freq * dt
        // Keep phase bounded
        if (phase > Math.PI * 2) phase -= Math.PI * 2

        const idx = (head + rep) % MAX
        refPhase[idx] = (refPhaseInc * rep / 4) % (Math.PI * 2)
        vcoFreq[idx] = freq
        pdOut[idx] = phaseErr
      }
      head = (head + 4) % MAX

      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      ctx.fillStyle = fg
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Phase-Locked Loop — Lock-in Visualizer', w / 2, 28)

      ctx.fillStyle = '#7a8a9a'
      ctx.font = '11px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`Ref: ${refFreq.toFixed(3)}  VCO: ${freq.toFixed(3)}  K=${K.toFixed(1)}`, margin.left, 48)

      const locked = Math.abs(freq - refFreq) < 0.02
      ctx.fillStyle = locked ? '#6bcb77' : '#ff6b6b'
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(locked ? 'LOCKED' : 'UNLOCKED', w - margin.right, 48)

      // Sub-plot 1: Frequency tracking
      const plot1H = ph * 0.35
      ctx.fillStyle = '#5a6a7a'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('VCO Frequency (normalized)', margin.left, margin.top - 6)

      ctx.strokeStyle = '#1a2a3a'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      const refY = margin.top + plot1H * (1 - (refFreq - 0) / 3)
      ctx.beginPath()
      ctx.moveTo(margin.left, refY)
      ctx.lineTo(margin.left + pw, refY)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.strokeStyle = accent
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < MAX; i++) {
        const idx = (head + i) % MAX
        const xi = margin.left + (i / (MAX - 1)) * pw
        const yi = margin.top + plot1H * (1 - (vcoFreq[idx] - 0) / 3)
        if (i === 0) ctx.moveTo(xi, yi)
        else ctx.lineTo(xi, yi)
      }
      ctx.stroke()

      // Sub-plot 2: Phase error
      const plot2Top = margin.top + plot1H + 24
      const plot2H = ph * 0.35
      ctx.fillStyle = '#5a6a7a'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('Phase Error', margin.left, plot2Top - 6)

      ctx.strokeStyle = '#2a3a4a'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      const zeroY = plot2Top + plot2H / 2
      ctx.beginPath()
      ctx.moveTo(margin.left, zeroY)
      ctx.lineTo(margin.left + pw, zeroY)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.strokeStyle = '#ff7a59'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < MAX; i++) {
        const idx = (head + i) % MAX
        const xi = margin.left + (i / (MAX - 1)) * pw
        const yi = plot2Top + plot2H * (1 - (pdOut[idx] + 1) / 2)
        if (i === 0) ctx.moveTo(xi, yi)
        else ctx.lineTo(xi, yi)
      }
      ctx.stroke()

      // Y labels
      ctx.fillStyle = '#3a4a5a'
      ctx.font = '10px monospace'
      ctx.textAlign = 'right'
      ctx.fillText('3', margin.left - 4, margin.top + 4)
      ctx.fillText('0', margin.left - 4, margin.top + plot1H - 4)
      ctx.fillText('+1', margin.left - 4, plot2Top + 4)
      ctx.fillText('−1', margin.left - 4, plot2Top + plot2H - 4)

      ctx.textAlign = 'center'
      ctx.fillText('Time →', margin.left + pw / 2, h - 10)

      // Block diagram labels
      const blockY = plot2Top + plot2H + 30
      ctx.fillStyle = '#2a3a4a'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'

      ctx.fillStyle = '#1e3a4a'
      ctx.fillRect(margin.left + pw * 0.1, blockY, pw * 0.15, 24)
      ctx.fillStyle = '#5a6a7a'
      ctx.fillText('Ref', margin.left + pw * 0.1 + pw * 0.075, blockY + 15)

      ctx.fillStyle = '#2a3a4a'
      ctx.fillRect(margin.left + pw * 0.4, blockY, pw * 0.15, 24)
      ctx.fillStyle = '#5a6a7a'
      ctx.fillText('PD', margin.left + pw * 0.4 + pw * 0.075, blockY + 15)

      ctx.fillStyle = '#2a3a4a'
      ctx.fillRect(margin.left + pw * 0.6, blockY, pw * 0.15, 24)
      ctx.fillStyle = '#5a6a7a'
      ctx.fillText('LF+VCO', margin.left + pw * 0.6 + pw * 0.075, blockY + 15)
    },
  }
}

export const pllLockIn: EffectModule = { controls, defaults, createRenderer }
