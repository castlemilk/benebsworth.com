import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Eye Diagram
 *
 * A random ±1 symbol stream is pulse-shaped by a raised-cosine (RC) filter of
 * roll-off β, optionally band-limited by a one-pole low-pass, then hit with
 * Gaussian noise sized by the signal-to-noise ratio (SNR). Many 2-symbol
 * windows are overlaid with low alpha (persistence); the open "eye" emerges in
 * the centre. The sampling instant is marked, and the eye HEIGHT (vertical
 * noise margin) and WIDTH (horizontal timing margin) are annotated in amber.
 * Lower SNR or bandwidth closes the eye; more roll-off opens it.
 */
export const controls: ControlSpec[] = [
  { key: 'rolloff', label: 'Roll-off β', type: 'range', min: 0, max: 1, step: 0.05 },
  { key: 'snr', label: 'SNR (dB)', type: 'range', min: 5, max: 30, step: 1 },
  { key: 'bandwidth', label: 'Bandwidth', type: 'range', min: 0.3, max: 1.5, step: 0.05 },
  { key: 'traces', label: 'Overlaid traces', type: 'range', min: 40, max: 200, step: 10 },
]

export const defaults: Params = {
  rolloff: 0.35,
  snr: 20,
  bandwidth: 1,
  traces: 120,
}

const CYAN = '#00b4d8'
const AMBER = '#f5a623'
const SPS = 24 // samples per symbol
const NSYM = 280 // symbols in the precomputed stream
const SPAN = 4 // RC truncation half-width, in symbols
const HALF = SPAN * SPS
const COLS = 2 * SPS // samples across the 2-symbol window
const VDISP = 1.6 // display half-range in signal units

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Raised-cosine impulse response, t measured in symbol periods.
function rcTap(t: number, beta: number): number {
  if (Math.abs(t) < 1e-9) return 1
  let tt = t
  if (beta > 1e-9 && Math.abs(1 - (2 * beta * tt) ** 2) < 1e-6) tt += 1e-4 // dodge the removable singularity
  const sinc = Math.sin(Math.PI * tt) / (Math.PI * tt)
  if (beta <= 1e-9) return sinc
  return (sinc * Math.cos(Math.PI * beta * tt)) / (1 - (2 * beta * tt) ** 2)
}

// One standard-normal sample via Box-Muller (Math.random is fine here).
function gauss(): number {
  let u = 0
  let v = 0
  while (u < 1e-9) u = Math.random()
  while (v < 1e-9) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export const EyeDiagram: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    // ---- persistent renderer state (reset on structural change) ----
    let lastKey = ''
    let wave = new Float32Array(NSYM * SPS)
    let openGap = new Float32Array(COLS + 1)
    let upperMin = 1
    let lowerMax = -1
    let numWindows = 1
    let scroll = 0

    function rebuild(beta: number, bandwidth: number, traces: number) {
      // Seed the symbol stream from the structural params so it reseeds on change.
      const seed = Math.round(beta * 1000) * 92821 + Math.round(bandwidth * 1000) * 131 + traces
      const rng = mulberry32(seed)
      const symbols = new Int8Array(NSYM)
      for (let k = 0; k < NSYM; k++) symbols[k] = rng() < 0.5 ? -1 : 1

      // Raised-cosine pulse shaping: convolve the impulse train with h(t).
      const taps = new Float32Array(2 * HALF + 1)
      for (let i = -HALF; i <= HALF; i++) taps[i + HALF] = rcTap(i / SPS, beta)
      wave = new Float32Array(NSYM * SPS)
      for (let k = 0; k < NSYM; k++) {
        const s = symbols[k], c = k * SPS
        const lo = Math.max(0, c - HALF), hi = Math.min(wave.length - 1, c + HALF)
        for (let n = lo; n <= hi; n++) wave[n] += s * taps[n - c + HALF]
      }

      // Optional band-limiting: zero-phase one-pole low-pass (forward + back)
      // keeps the eye centred while smearing the signal as bandwidth drops.
      const alpha = 1 - Math.exp((-2 * Math.PI * bandwidth) / SPS)
      let y = wave[0]
      for (let n = 0; n < wave.length; n++) wave[n] = y += alpha * (wave[n] - y)
      y = wave[wave.length - 1]
      for (let n = wave.length - 1; n >= 0; n--) wave[n] = y += alpha * (wave[n] - y)

      // Eye metrics on the CLEAN waveform; SNR is applied live per frame.
      numWindows = NSYM - 2 * SPAN - 1
      upperMin = Infinity
      lowerMax = -Infinity
      openGap = new Float32Array(COLS + 1).fill(Infinity)
      for (let j = SPAN; j < NSYM - SPAN - 1; j++) {
        const start = j * SPS
        const mid = wave[start + SPS] // value at the sampling instant
        if (mid > 0) upperMin = Math.min(upperMin, mid)
        else lowerMax = Math.max(lowerMax, mid)
        for (let c = 0; c <= COLS; c++) {
          const a = Math.abs(wave[start + c])
          if (a < openGap[c]) openGap[c] = a
        }
      }
      if (!isFinite(upperMin)) upperMin = 1
      if (!isFinite(lowerMax)) lowerMax = -1
      scroll = 0
    }

    return {
      step(_t, p) {
        const beta = p.rolloff as number
        const snr = p.snr as number
        const bandwidth = p.bandwidth as number
        const traces = Math.round(p.traces as number)

        const key = `${beta}|${bandwidth}|${traces}`
        if (key !== lastKey) {
          rebuild(beta, bandwidth, traces)
          lastKey = key
        }

        const sigma = Math.pow(10, -snr / 20)

        // Plot rectangle.
        const plotL = 52, plotR = w - 20, plotT = 26, plotB = h - 34
        const plotW = plotR - plotL, plotH = plotB - plotT

        const xOf = (col: number) => plotL + (col / COLS) * plotW
        const yOf = (v: number) => {
          const frac = Math.max(0, Math.min(1, (VDISP - v) / (2 * VDISP)))
          return plotT + frac * plotH
        }

        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        // Frame + decision threshold.
        ctx.save()
        ctx.strokeStyle = theme.fg
        ctx.globalAlpha = 0.16
        ctx.lineWidth = 1
        ctx.strokeRect(plotL, plotT, plotW, plotH)
        ctx.setLineDash([3, 4])
        ctx.beginPath()
        ctx.moveTo(plotL, yOf(0)); ctx.lineTo(plotR, yOf(0)) // decision threshold
        ctx.stroke()
        ctx.restore()

        // Overlaid traces (persistence): each spans 2 symbol periods, clamped
        // to the plot rect, with fresh Gaussian noise so the band shimmers.
        const alpha = Math.max(0.04, Math.min(0.18, 9 / traces))
        ctx.save()
        ctx.strokeStyle = CYAN
        ctx.globalAlpha = alpha
        ctx.lineWidth = 1
        ctx.lineJoin = 'round'
        const base = Math.floor(scroll)
        for (let i = 0; i < traces; i++) {
          const jw = SPAN + ((base + i) % numWindows)
          const start = jw * SPS
          ctx.beginPath()
          for (let c = 0; c <= COLS; c++) {
            const x = xOf(c), y = yOf(wave[start + c] + gauss() * sigma)
            if (c === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
        ctx.restore()
        scroll += 0.7 // keep the pattern flowing so it never freezes

        // Eye HEIGHT (vertical noise margin) at the sampling instant, and eye
        // WIDTH (horizontal timing margin) at the decision threshold.
        const hiEdge = upperMin - sigma, loEdge = lowerMax + sigma
        const xc = xOf(SPS), yThr = yOf(0)
        const eps = Math.max(0.05, sigma)
        let leftCol = SPS, rightCol = SPS
        for (let c = SPS; c >= 0 && openGap[c] >= eps; c--) leftCol = c
        for (let c = SPS; c <= COLS && openGap[c] >= eps; c++) rightCol = c

        ctx.save()
        ctx.strokeStyle = AMBER
        ctx.lineWidth = 1.5
        if (hiEdge > loEdge) {
          const yTop = yOf(hiEdge), yBot = yOf(loEdge)
          ctx.beginPath()
          ctx.moveTo(xc, yTop); ctx.lineTo(xc, yBot)
          ctx.moveTo(xc - 5, yTop); ctx.lineTo(xc + 5, yTop)
          ctx.moveTo(xc - 5, yBot); ctx.lineTo(xc + 5, yBot)
          ctx.stroke()
        }
        if (rightCol > leftCol) {
          const xa = xOf(leftCol), xb = xOf(rightCol)
          ctx.beginPath()
          ctx.moveTo(xa, yThr); ctx.lineTo(xb, yThr)
          ctx.moveTo(xa, yThr - 5); ctx.lineTo(xa, yThr + 5)
          ctx.moveTo(xb, yThr - 5); ctx.lineTo(xb, yThr + 5)
          ctx.stroke()
        }
        ctx.restore()

        // Sampling instant marker.
        ctx.save()
        ctx.strokeStyle = theme.fg
        ctx.globalAlpha = 0.4
        ctx.setLineDash([2, 3])
        ctx.beginPath()
        ctx.moveTo(xc, plotT); ctx.lineTo(xc, plotB)
        ctx.stroke()
        ctx.restore()

        // Labels + metric readout.
        const eyeH = Math.max(0, hiEdge - loEdge)
        const eyeW = Math.max(0, (rightCol - leftCol) / SPS)
        ctx.save()
        ctx.fillStyle = theme.fg
        ctx.font = '11px monospace'
        ctx.globalAlpha = 0.55
        ctx.fillText(`Eye  β=${beta.toFixed(2)}  SNR=${snr.toFixed(0)}dB  BW=${bandwidth.toFixed(2)}`, plotL, 16)
        ctx.font = '10px monospace'
        ctx.textAlign = 'center'
        ctx.globalAlpha = 0.4
        const ticks: [number, string][] = [[0, '−1'], [SPS / 2, '−½'], [SPS, '0'], [SPS * 1.5, '½'], [COLS, '1']]
        for (const [col, lab] of ticks) ctx.fillText(lab, xOf(col), plotB + 14)
        ctx.fillText('time (symbol periods)', (plotL + plotR) / 2, plotB + 28)
        ctx.globalAlpha = 1
        ctx.fillStyle = AMBER
        ctx.textAlign = 'right'
        ctx.fillText(`eye  H=${eyeH.toFixed(2)}  W=${eyeW.toFixed(2)}T`, plotR, 16)
        ctx.restore()
      },
    }
  },
}
