import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'waveType', label: 'Waveform', type: 'select', options: [
    { label: 'Sine', value: 'sine' },
    { label: 'Square', value: 'square' },
    { label: 'Sawtooth', value: 'sawtooth' },
    { label: 'Triangle', value: 'triangle' },
    { label: 'Two Tones', value: 'twotone' },
    { label: 'Chirp', value: 'chirp' },
  ]},
  { key: 'noise', label: 'Noise (dB)', type: 'range', min: -60, max: 0, step: 1 },
]

export const defaults: Params = { waveType: 'sine', noise: -40 }

export const createRenderer = (
  ctx: CanvasRenderingContext2D,
  dims: { w: number; h: number; dpr: number },
  theme?: { bg?: string; fg?: string },
) => {
  const { w, h } = dims
  const bg = theme?.bg ?? '#0a0a12'
  const fg = theme?.fg ?? '#c8d8e8'

  const SAMPLE_RATE = 48000
  const FFT_SIZE = 2048
  const BARS = 256

  const window = new Float32Array(FFT_SIZE)
  for (let i = 0; i < FFT_SIZE; i++) {
    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FFT_SIZE - 1)))
  }

  const samples = new Float32Array(FFT_SIZE * 2)
  const spectrum = new Float32Array(FFT_SIZE / 2)
  const magnitudes = new Float32Array(BARS)

  return {
    step(timeMs: number, params: Params) {
      const waveType = (params.waveType ?? defaults.waveType) as string
      const noise = (params.noise ?? defaults.noise) as number
      const noiseAmp = Math.pow(10, noise / 20)

      for (let i = 0; i < FFT_SIZE; i++) {
        const ti = i / SAMPLE_RATE
        let s = 0

        if (waveType === 'sine') {
          s = Math.sin(2 * Math.PI * 440 * ti)
        } else if (waveType === 'twotone') {
          s = 0.5 * Math.sin(2 * Math.PI * 440 * ti) + 0.5 * Math.sin(2 * Math.PI * 880 * ti)
        } else if (waveType === 'square') {
          s = ti * 440 % 1 < 0.5 ? 1 : -1
        } else if (waveType === 'sawtooth') {
          s = 2 * ((ti * 440) % 1) - 1
        } else if (waveType === 'triangle') {
          const p = (ti * 440) % 1
          s = p < 0.5 ? 4 * p - 1 : 3 - 4 * p
        } else if (waveType === 'chirp') {
          const f0 = 100, f1 = 4000
          const phase = 2 * Math.PI * (f0 * ti + (f1 - f0) * ti * ti / 2)
          s = Math.sin(phase)
        }

        s += (Math.random() * 2 - 1) * noiseAmp
        samples[i * 2] = s * window[i]
        samples[i * 2 + 1] = 0
      }

      // Radix-2 Cooley-Tukey FFT
      const N = FFT_SIZE
      // Bit-reversal permutation (interleaved re/im layout) before butterflies
      for (let i = 1, j = 0; i < N; i++) {
        let bit = N >> 1
        while (j & bit) { j ^= bit; bit >>= 1 }
        j ^= bit
        if (i < j) {
          let tmp = samples[i * 2]; samples[i * 2] = samples[j * 2]; samples[j * 2] = tmp
          tmp = samples[i * 2 + 1]; samples[i * 2 + 1] = samples[j * 2 + 1]; samples[j * 2 + 1] = tmp
        }
      }
      let step = 1
      for (let stage = 0; stage < 11; stage++) {
        const half = step
        step *= 2
        for (let group = 0; group < N; group += step) {
          for (let pair = 0; pair < half; pair++) {
            const i = group + pair
            const j = i + half
            const angle = -2 * Math.PI * pair / step
            const wr = Math.cos(angle)
            const wi = Math.sin(angle)
            const tr = samples[j * 2] * wr - samples[j * 2 + 1] * wi
            const ti = samples[j * 2] * wi + samples[j * 2 + 1] * wr
            samples[j * 2] = samples[i * 2] - tr
            samples[j * 2 + 1] = samples[i * 2 + 1] - ti
            samples[i * 2] = samples[i * 2] + tr
            samples[i * 2 + 1] = samples[i * 2 + 1] + ti
          }
        }
      }

      for (let k = 0; k < FFT_SIZE / 2; k++) {
        const re = samples[k * 2]
        const im = samples[k * 2 + 1]
        spectrum[k] = Math.sqrt(re * re + im * im) / FFT_SIZE
      }

      const minFreq = 20, maxFreq = 20000
      const logMin = Math.log10(minFreq)
      const logMax = Math.log10(maxFreq)
      const logRange = logMax - logMin

      for (let b = 0; b < BARS; b++) {
        const logStart = logMin + (b / BARS) * logRange
        const logEnd = logMin + ((b + 1) / BARS) * logRange
        const binStart = Math.max(1, Math.floor(Math.pow(10, logStart) * FFT_SIZE / SAMPLE_RATE))
        const binEnd = Math.min(Math.floor(Math.pow(10, logEnd) * FFT_SIZE / SAMPLE_RATE), FFT_SIZE / 2 - 1)
        let sum = 0, count = 0
        for (let k = binStart; k <= binEnd; k++) { sum += spectrum[k]; count++ }
        magnitudes[b] = count > 0 ? sum / count : 0
      }

      const maxMag = Math.max(...magnitudes.map(Math.abs), 0.001)

      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      ctx.fillStyle = fg
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('FFT Spectrum Analyzer', w / 2, 28)

      const margin = { left: 60, right: 30, top: 40, bottom: 40 }
      const plotW = w - margin.left - margin.right
      const plotH = h - margin.top - margin.bottom

      const freqLabels = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
      ctx.font = '10px monospace'
      ctx.fillStyle = '#5a6a7a'
      ctx.textAlign = 'center'
      for (const fl of freqLabels) {
        const x = margin.left + ((Math.log10(fl) - logMin) / logRange) * plotW
        ctx.fillText(fl >= 1000 ? `${fl / 1000}k` : `${fl}`, x, h - 20)
      }
      ctx.fillStyle = '#3a4a5a'
      ctx.fillText('Hz', w / 2, h - 6)

      ctx.save()
      ctx.translate(14, h / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#5a6a7a'
      ctx.font = '10px monospace'
      ctx.fillText('Magnitude (dB)', 0, 0)
      ctx.restore()

      for (let b = 0; b < BARS; b++) {
        const x = margin.left + (b / BARS) * plotW
        const barW = plotW / BARS - 1
        // Convert normalised magnitude to dB and map onto the -60..0 dB axis
        const ratio = Math.abs(magnitudes[b]) / maxMag
        const db = ratio > 0 ? 20 * Math.log10(ratio) : -60
        const norm = Math.max(0, (db + 60) / 60)
        const barH = norm * plotH
        const hue = 180 + (b / BARS) * 60
        ctx.fillStyle = `hsla(${hue}, 80%, 55%, 0.85)`
        ctx.fillRect(x, margin.top + plotH - barH, barW, barH)
      }

      ctx.strokeStyle = '#1a2a3a'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 4])
      for (let db = -60; db <= 0; db += 10) {
        const y = margin.top + plotH * (1 - (db + 60) / 60)
        ctx.beginPath()
        ctx.moveTo(margin.left, y)
        ctx.lineTo(margin.left + plotW, y)
        ctx.stroke()
      }
      ctx.setLineDash([])
    },
  }
}

export const fftSpectrum: EffectModule = { controls, defaults, createRenderer }
