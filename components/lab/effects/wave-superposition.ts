import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'freq1', group: 'Waves', unit: 'Hz', label: 'Frequency 1', type: 'range', min: 0.5, max: 8, step: 0.1 },
  { key: 'freq2', group: 'Waves', unit: 'Hz', label: 'Frequency 2', type: 'range', min: 0.5, max: 8, step: 0.1 },
  { key: 'amp', group: 'Appearance', label: 'Amplitude', type: 'range', min: 0.1, max: 1, step: 0.05 },
  { key: 'showComponents', group: 'Appearance', label: 'Show components', type: 'toggle' },
  { key: 'color', group: 'Appearance', label: 'Color', type: 'color' },
]

export const defaults: Params = { freq1: 2, freq2: 2.3, amp: 0.6, showComponents: true, color: '#7c5cff' }

// Opaque component inks remain legible on both paper and dark stages.
export const waveInks = { first: '#008c80', second: '#bd762e' } as const

/** Parse hex to r,g,b 0-255 */
function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export const waveSuperposition: EffectModule = {
  controls,
  defaults,
  inspection: { title: 'Wave readout', caption: 'Relative amplitude' },
  inspect(x, timeMs, p) {
    const sampleX = Math.round(Math.max(0, Math.min(1, x)) * 599) / 599
    const phase = timeMs / 1000 * 4
    const a = Number(p.amp)
    const y1 = a * Math.sin(2 * Math.PI * Number(p.freq1) * sampleX * 4 - phase)
    const y2 = a * Math.sin(2 * Math.PI * Number(p.freq2) * sampleX * 4 - phase)
    return [
      { label: 'Position', role: 'position', value: `${(sampleX * 100).toFixed(1)}%` },
      { label: 'Wave 1', value: y1.toFixed(3), color: waveInks.first, y: p.showComponents ? .5 - .35*y1 : undefined },
      { label: 'Wave 2', value: y2.toFixed(3), color: waveInks.second, y: p.showComponents ? .5 - .35*y2 : undefined },
      { label: 'Result / sum', role: 'primary', value: (y1 + y2).toFixed(3), color: String(p.color), y: .5 - .35*(y1+y2) },
    ]
  },
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const N = 600 // sample points
    const yBuf = new Float32Array(N)
    const y1Buf = new Float32Array(N)
    const y2Buf = new Float32Array(N)

    return {
      step(t, p) {
        const { w, h } = dims
        const time = t / 1000
        const f1 = p.freq1 as number
        const f2 = p.freq2 as number
        const A = p.amp as number
        const show = p.showComponents as boolean
        const [cr, cg, cb] = hexRgb(p.color as string)

        ctx.clearRect(0, 0, w, h)

        const midY = h / 2
        const ampPx = midY * 0.7 * A

        // Compute waves
        for (let i = 0; i < N; i++) {
          const x = i / (N - 1) // 0..1
          y1Buf[i] = A * Math.sin(2 * Math.PI * f1 * x * 4 - time * 4)
          y2Buf[i] = A * Math.sin(2 * Math.PI * f2 * x * 4 - time * 4)
          yBuf[i] = y1Buf[i] + y2Buf[i]
        }

        // Normalise: max possible amplitude is 2A
        const norm = 1 / (2 * A)

        // Axis line
        ctx.strokeStyle = theme.fg + '18'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, midY)
        ctx.lineTo(w, midY)
        ctx.stroke()

        // Node/antinode markers for standing-wave case (f1 ≈ f2)
        if (Math.abs(f1 - f2) < 0.5) {
          const kAvg = 2 * Math.PI * ((f1 + f2) / 2) * 4
          const spacing = Math.PI / kAvg * w
          ctx.fillStyle = theme.fg + '30'
          for (let nx = spacing / 2; nx < w; nx += spacing) {
            ctx.beginPath()
            ctx.arc(nx, midY, 3, 0, Math.PI * 2)
            ctx.fill()
          }
        }

        // Draw component waves
        if (show) {
          // Wave 1 — teal
          ctx.beginPath()
          ctx.strokeStyle = waveInks.first
          ctx.lineWidth = 2
          for (let i = 0; i < N; i++) {
            const x = (i / (N - 1)) * w
            const y = midY - y1Buf[i] * norm * ampPx * 2
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          }
          ctx.stroke()

          // Wave 2 — warm orange
          ctx.beginPath()
          ctx.strokeStyle = waveInks.second
          ctx.lineWidth = 2
          for (let i = 0; i < N; i++) {
            const x = (i / (N - 1)) * w
            const y = midY - y2Buf[i] * norm * ampPx * 2
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }

        // Superposition — accent colour, thick
        ctx.beginPath()
        ctx.strokeStyle = `rgb(${cr},${cg},${cb})`
        ctx.lineWidth = 2.5
        for (let i = 0; i < N; i++) {
          const x = (i / (N - 1)) * w
          const y = midY - yBuf[i] * norm * ampPx * 2
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.stroke()

        // Glow under the superposition curve (filled area)
        ctx.beginPath()
        for (let i = 0; i < N; i++) {
          const x = (i / (N - 1)) * w
          const y = midY - yBuf[i] * norm * ampPx * 2
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.lineTo(w, midY)
        ctx.lineTo(0, midY)
        ctx.closePath()
        ctx.fillStyle = `rgba(${cr},${cg},${cb},0.08)`
        ctx.fill()

        // Labels
        ctx.font = '11px monospace'
        ctx.fillStyle = theme.fg + 'c0'
        ctx.fillText(`f₁ = ${f1.toFixed(1)} Hz`, 8, 20)
        ctx.fillText(`f₂ = ${f2.toFixed(1)} Hz`, 8, 36)
        ctx.fillText(`Δf = ${(f2 - f1).toFixed(1)} Hz`, 8, 52)
      },
    }
  },
}
