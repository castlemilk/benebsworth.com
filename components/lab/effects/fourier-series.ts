import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'terms', label: 'Terms', type: 'range', min: 3, max: 30, step: 1 },
  {
    key: 'shape',
    label: 'Shape',
    type: 'select',
    options: [
      { label: 'Square wave', value: 'square' },
      { label: 'Sawtooth', value: 'sawtooth' },
      { label: 'Triangle', value: 'triangle' },
    ],
  },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 3, step: 0.1 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = {
  terms: 10,
  shape: 'square',
  speed: 1,
  color: '#ff5c8a',
}

// ---------------------------------------------------------------------------
// Fourier series coefficients for standard waveforms
// f(t) represented as sum of c_k * e^(i*k*t) for appropriate k
//
// For a real-valued function on [0, 2π], we use the epicycle representation:
// Each epicycle has amplitude |c_k|, frequency k, and phase arg(c_k)
//
// We compute: f(t) ≈ sum_{k} a_k cos(kt) + b_k sin(kt)
// which we rewrite as rotating phasors: sum |c_k| * e^{i(k*t + phi_k)}
// ---------------------------------------------------------------------------

interface Epicycle {
  freq: number   // harmonic number (can be negative)
  amp: number    // amplitude
  phase: number  // initial phase
}

function getCoefficients(shape: string, nTerms: number): Epicycle[] {
  const eps: Epicycle[] = []

  if (shape === 'square') {
    // Square wave: f(t) = (4/π) sum_{k odd} (1/k) sin(kt)
    // = (4/π) sum_{k odd} (1/(2k-1)) sin((2k-1)t)
    // Rewrite as cos: sin(kt) = cos(kt - π/2)
    for (let k = 0; k < nTerms; k++) {
      const n = 2 * k + 1  // odd harmonics
      eps.push({ freq: n, amp: (4 / Math.PI) / n, phase: -Math.PI / 2 })
    }
  } else if (shape === 'sawtooth') {
    // Sawtooth: f(t) = (2/π) sum_{k=1}^{N} ((-1)^{k+1}/k) sin(kt)
    // = (2/π) sum (-1)^{k+1}/k * cos(kt - π/2)
    for (let k = 1; k <= nTerms; k++) {
      const sign = (k % 2 === 1) ? 1 : -1
      eps.push({ freq: k, amp: (2 / Math.PI) * sign / k, phase: -Math.PI / 2 })
    }
  } else {
    // Triangle: f(t) = (8/π²) sum_{k odd} (-1)^{(k-1)/2} / k² * sin(kt)
    for (let k = 0; k < nTerms; k++) {
      const n = 2 * k + 1
      const sign = (k % 2 === 0) ? 1 : -1
      eps.push({ freq: n, amp: (8 / (Math.PI * Math.PI)) * sign / (n * n), phase: -Math.PI / 2 })
    }
  }

  // Sort by amplitude descending (largest circles first for visual clarity)
  eps.sort((a, b) => b.amp - a.amp)
  return eps
}

// Get the ideal waveform value at angle t for reference overlay
function idealWaveform(shape: string, t: number): number {
  // Normalize t to [0, 2π)
  const phase = ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  if (shape === 'square') {
    return phase < Math.PI ? 1 : -1
  } else if (shape === 'sawtooth') {
    return 1 - (2 * phase) / (2 * Math.PI)
  } else {
    // Triangle
    if (phase < Math.PI / 2) return (2 * phase) / Math.PI
    if (phase < 3 * Math.PI / 2) return 2 - (2 * phase) / Math.PI
    return (2 * phase) / Math.PI - 4
  }
}

export const fourierSeries: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    // Ring buffer for the trace
    const TRACE_LEN = 1024
    const traceX = new Float64Array(TRACE_LEN)
    const traceY = new Float64Array(TRACE_LEN)
    let traceHead = 0
    let traceCount = 0
    let prevTerms = 0
    let prevShape = ''

    return {
      step(t, p) {
        const nTerms = p.terms as number
        const shape = p.shape as string
        const speed = p.speed as number
        const color = p.color as string

        // Reset trace on param change
        if (nTerms !== prevTerms || shape !== prevShape) {
          traceHead = 0
          traceCount = 0
          prevTerms = nTerms
          prevShape = shape
        }

        // Clear
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        const coefficients = getCoefficients(shape, nTerms)

        // Time (angle) - continuously rotating
        const time = (t / 1000) * speed

        // Layout: epicycles on left half, waveform trace on right half
        const epicycleCX = w * 0.25
        const epicycleCY = h * 0.5
        const waveformX0 = w * 0.48
        const waveformX1 = w * 0.96
        const waveformW = waveformX1 - waveformX0
        const scale = Math.min(w, h) * 0.18 // amplitude scale

        // Draw epicycles
        let cx = epicycleCX
        let cy = epicycleCY

        ctx.save()
        for (let i = 0; i < coefficients.length; i++) {
          const ep = coefficients[i]
          const prevX = cx
          const prevY = cy
          const angle = ep.freq * time + ep.phase
          cx += ep.amp * Math.cos(angle) * scale
          cy -= ep.amp * Math.sin(angle) * scale // flip y

          // Draw circle
          ctx.strokeStyle = theme.fg
          ctx.globalAlpha = 0.1
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.arc(prevX, prevY, ep.amp * scale, 0, Math.PI * 2)
          ctx.stroke()

          // Draw radius line
          ctx.strokeStyle = color
          ctx.globalAlpha = 0.3
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(prevX, prevY)
          ctx.lineTo(cx, cy)
          ctx.stroke()
        }
        ctx.restore()

        // Draw tip dot
        ctx.save()
        ctx.fillStyle = color
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Compute the screen-space position of the waveform cursor.  We compute
        // the Fourier sum at traceAngle so the dot lands EXACTLY on
        // the displayed waveform trace, rather than mirroring the epicycle
        // tip's screen-space Y (which uses sin(), whereas the waveform uses
        // cos() — the two disagree). This makes the dot visibly ride the
        // waveform curve as time advances.
        const traceAngle = time % (2 * Math.PI)
        const traceScreenX = waveformX0 + ((traceAngle / (2 * Math.PI)) % 1) * waveformW
        let traceSum = 0
        for (let i = 0; i < coefficients.length; i++) {
          const ep = coefficients[i]
          traceSum += ep.amp * Math.cos(ep.freq * traceAngle + ep.phase)
        }
        const traceScreenY = epicycleCY - traceSum * scale

        // Store in ring buffer
        traceX[traceHead] = traceScreenX
        traceY[traceHead] = traceScreenY
        traceHead = (traceHead + 1) % TRACE_LEN
        traceCount = Math.min(traceCount + 1, TRACE_LEN)

        // Draw connecting line from tip to waveform area
        ctx.save()
        ctx.strokeStyle = color
        ctx.globalAlpha = 0.25
        ctx.lineWidth = 0.8
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(traceScreenX, traceScreenY)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()

        // Draw ideal waveform as faint reference
        ctx.save()
        ctx.strokeStyle = theme.fg
        ctx.globalAlpha = 0.12
        ctx.lineWidth = 1
        ctx.beginPath()
        let idealStarted = false
        for (let px = 0; px <= waveformW; px += 2) {
          const angle = (px / waveformW) * 2 * Math.PI
          const val = idealWaveform(shape, angle)
          const sx = waveformX0 + px
          const sy = epicycleCY - val * scale
          if (!idealStarted) { ctx.moveTo(sx, sy); idealStarted = true }
          else ctx.lineTo(sx, sy)
        }
        ctx.stroke()
        ctx.restore()

        // Draw Fourier approximation trace
        // Instead of using the ring buffer, compute the full waveform each frame for accuracy
        ctx.save()
        ctx.strokeStyle = color
        ctx.globalAlpha = 0.85
        ctx.lineWidth = 1.8
        ctx.beginPath()
        let fourierStarted = false
        for (let px = 0; px <= waveformW; px += 2) {
          const angle = (px / waveformW) * 2 * Math.PI
          // Compute Fourier sum at this angle: f(θ) = Σ aₖ cos(kθ + φₖ)
          let sum = 0
          for (let i = 0; i < coefficients.length; i++) {
            const ep = coefficients[i]
            sum += ep.amp * Math.cos(ep.freq * angle + ep.phase)
          }
          const sx = waveformX0 + px
          const sy = epicycleCY - sum * scale
          if (!fourierStarted) { ctx.moveTo(sx, sy); fourierStarted = true }
          else ctx.lineTo(sx, sy)
        }
        ctx.stroke()
        ctx.restore()

        // Draw current position marker on the waveform
        ctx.save()
        ctx.fillStyle = color
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(traceScreenX, traceScreenY, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Draw axes for waveform
        ctx.save()
        ctx.strokeStyle = theme.fg
        ctx.globalAlpha = 0.1
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(waveformX0, epicycleCY)
        ctx.lineTo(waveformX1, epicycleCY)
        ctx.stroke()
        // Vertical lines at 0 and 2π
        ctx.beginPath()
        ctx.moveTo(waveformX0, epicycleCY - scale * 1.5)
        ctx.lineTo(waveformX0, epicycleCY + scale * 1.5)
        ctx.stroke()
        ctx.restore()

        // Label
        ctx.save()
        ctx.font = '11px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.4
        const labels: Record<string, string> = {
          square: `Square wave — ${nTerms} terms (Gibbs)`,
          sawtooth: `Sawtooth — ${nTerms} terms`,
          triangle: `Triangle wave — ${nTerms} terms`,
        }
        ctx.fillText(labels[shape] || '', 12, h - 12)
        ctx.fillText('0', waveformX0 - 4, epicycleCY + 14)
        ctx.fillText('2π', waveformX1 - 10, epicycleCY + 14)
        ctx.restore()
      },
    }
  },
}
