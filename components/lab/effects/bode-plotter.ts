import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'type', label: 'Filter type', type: 'select', options: [
    { label: 'Low-pass', value: 'lp' },
    { label: 'High-pass', value: 'hp' },
    { label: 'Band-pass', value: 'bp' },
    { label: 'Notch', value: 'notch' },
  ]},
  { key: 'order', label: 'Order', type: 'range', min: 1, max: 4, step: 1 },
  { key: 'normalizedFreq', label: 'Pole freq ωn (rad/s)', type: 'range', min: 0.1, max: 5, step: 0.1 },
]

export const defaults: Params = { type: 'lp', order: 2, normalizedFreq: 2 }

export const createRenderer = (
  ctx: CanvasRenderingContext2D,
  dims: { w: number; h: number; dpr: number },
  theme?: { bg?: string; fg?: string },
) => {
  const { w, h } = dims
  const bg = theme?.bg ?? '#0a0a12'
  const fg = theme?.fg ?? '#c8d8e8'
  const accent = '#00b4d8'

  const margin = { left: 60, right: 30, top: 70, bottom: 50 }
  const pw = w - margin.left - margin.right
  const ph = h - margin.top - margin.bottom

  // Pre-compute magnitude response at 400 points
  const MAGN = 400
  const magH = new Float32Array(MAGN)
  const magP = new Float32Array(MAGN)

  let lastParamHash = ''

  function computeResponse(params: Params) {
    const type = (params.type ?? defaults.type) as string
    const order = Math.round((params.order ?? defaults.order) as number)
    const wn = (params.normalizedFreq ?? defaults.normalizedFreq) as number

    const logMin = Math.log10(0.01)
    const logMax = Math.log10(20)
    const logRange = logMax - logMin

    for (let i = 0; i < MAGN; i++) {
      const logW = logMin + (i / (MAGN - 1)) * logRange
      const omega = Math.pow(10, logW)

      let mag = 0
      let phase = 0

      if (type === 'lp') {
        // H(s) = wn² / (s² + ζ√2·s + wn²) for 2nd order Butterworth
        // For nth order: cascade of 2nd-order sections
        const s2 = omega * omega
        const zeta = Math.sqrt(2) / 2
        const denom = Math.sqrt((wn * wn - s2) ** 2 + (2 * zeta * wn * omega) ** 2)
        mag = (wn * wn) / denom
        phase = -Math.atan2(2 * zeta * wn * omega, wn * wn - s2)
      } else if (type === 'hp') {
        const s2 = omega * omega
        const zeta = Math.sqrt(2) / 2
        const denom = Math.sqrt((s2 - wn * wn) ** 2 + (2 * zeta * wn * omega) ** 2)
        mag = s2 / denom
        phase = Math.PI - Math.atan2(2 * zeta * wn * omega, s2 - wn * wn)
      } else if (type === 'bp') {
        const s2 = omega * omega
        const Q = order * 0.7
        const num = wn * omega / Q
        const denom = Math.sqrt((s2 - wn * wn) ** 2 + (wn * omega / Q) ** 2)
        mag = num / denom
        phase = Math.PI / 2 - Math.atan2(wn * omega / Q, s2 - wn * wn)
      } else {
        // Notch: H(s) = (s² + wn²) / (s² + (wn/Q)s + wn²)
        const s2 = omega * omega
        const Q = order * 2
        const num = s2 + wn * wn
        const den = Math.sqrt((s2 - wn * wn) ** 2 + (wn * omega / Q) ** 2)
        mag = num / den
        phase = Math.atan2(0, s2 + wn * wn) - Math.atan2(wn * omega / Q, s2 - wn * wn)
      }

      // Normalize to 0 dB at passband peak
      magH[i] = mag
      magP[i] = phase
    }

    // Find peak for normalization
    const peak = Math.max(...magH.map(Math.abs))
    for (let i = 0; i < MAGN; i++) {
      magH[i] = magH[i] / peak
    }
  }

  return {
    step(_timeMs: number, params: Params) {
      const hash = `${params.type ?? defaults.type}-${params.order ?? defaults.order}-${params.normalizedFreq ?? defaults.normalizedFreq}`
      if (hash !== lastParamHash) {
        computeResponse(params)
        lastParamHash = hash
      }

      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      ctx.fillStyle = fg
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'center'
      const _type = (params.type ?? defaults.type) as string
      const _order = Math.round((params.order ?? defaults.order) as number)
      const _wn = (params.normalizedFreq ?? defaults.normalizedFreq) as number
      const typeLabel = _type === 'lp' ? 'Low-pass' : _type === 'hp' ? 'High-pass' : _type === 'bp' ? 'Band-pass' : 'Notch'
      ctx.fillText(`Bode Plot — ${typeLabel} (${_order}th order)`, w / 2, 28)

      ctx.fillStyle = '#7a8a9a'
      ctx.font = '11px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`ωn = ${_wn.toFixed(1)} rad/s`, margin.left, 48)

      const logMin = Math.log10(0.01)
      const logMax = Math.log10(20)
      const logRange = logMax - logMin

      // Grid: frequency decades
      ctx.strokeStyle = '#1a2a3a'
      ctx.lineWidth = 1
      for (let db = -60; db <= 20; db += 10) {
        const y = margin.top + ph * (1 - (db + 60) / 80)
        ctx.setLineDash([2, 4])
        ctx.beginPath()
        ctx.moveTo(margin.left, y)
        ctx.lineTo(margin.left + pw, y)
        ctx.stroke()
      }
      ctx.setLineDash([])

      // 0 dB line
      const zeroDbY = margin.top + ph * (1 - (0 + 60) / 80)
      ctx.strokeStyle = '#3a4a5a'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(margin.left, zeroDbY)
      ctx.lineTo(margin.left + pw, zeroDbY)
      ctx.stroke()
      ctx.setLineDash([])

      // Magnitude plot
      ctx.strokeStyle = accent
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < MAGN; i++) {
        const x = margin.left + (i / (MAGN - 1)) * pw
        const db = 20 * Math.log10(Math.abs(magH[i]) + 1e-10)
        const y = margin.top + ph * (1 - (db + 60) / 80)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Frequency axis
      ctx.fillStyle = '#3a4a5a'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      const freqLabels = [0.01, 0.1, 1, 10]
      for (const f of freqLabels) {
        const x = margin.left + ((Math.log10(f) - logMin) / logRange) * pw
        ctx.fillText(f < 1 ? `${f}` : `${f}`, x, h - 20)
      }
      ctx.fillText('rad/s', margin.left + pw / 2, h - 6)

      ctx.save()
      ctx.translate(14, margin.top + ph / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#5a6a7a'
      ctx.font = '10px monospace'
      ctx.fillText('Magnitude (dB)', 0, 0)
      ctx.restore()

      // Labels
      ctx.fillStyle = '#5a6a7a'
      ctx.font = '9px monospace'
      ctx.textAlign = 'right'
      for (const db of [-60, -40, -20, 0, 20]) {
        const y = margin.top + ph * (1 - (db + 60) / 80)
        ctx.fillText(`${db}`, margin.left - 4, y + 4)
      }

      // Cutoff marker
      const wn = _wn
      if (wn >= 0.01 && wn <= 20) {
        const markerX = margin.left + ((Math.log10(wn) - logMin) / logRange) * pw
        ctx.strokeStyle = '#ff7a59'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(markerX, margin.top)
        ctx.lineTo(markerX, margin.top + ph)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#ff7a59'
        ctx.font = '10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`ωn`, markerX, margin.top - 4)
      }
    },
  }
}

export const bodePlotter: EffectModule = { controls, defaults, createRenderer }
