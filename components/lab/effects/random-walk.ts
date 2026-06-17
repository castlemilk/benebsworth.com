import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'walks', label: 'Walks', type: 'range', min: 50, max: 300, step: 10 },
  { key: 'drift', label: 'Drift', type: 'range', min: -0.5, max: 0.5, step: 0.05 },
  { key: 'volatility', label: 'Volatility', type: 'range', min: 0.1, max: 3, step: 0.1 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = {
  walks: 150,
  drift: 0,
  volatility: 1,
  color: '#00e0b8',
}

// ---------------------------------------------------------------------------
// Deterministic PRNG (xorshift128)
// ---------------------------------------------------------------------------
function makePRNG(seed: number) {
  let s0 = seed | 0 || 1
  let s1 = (seed ^ 0xDEADBEEF) | 0 || 1
  let s2 = (seed ^ 0xCAFEBABE) | 0 || 1
  let s3 = (seed ^ 0x8BADF00D) | 0 || 1

  // Warm up
  for (let i = 0; i < 20; i++) next()

  function next(): number {
    let t = s3
    t ^= t << 11
    t ^= t >>> 8
    s3 = s2; s2 = s1; s1 = s0
    t ^= s0
    t ^= s0 >>> 19
    s0 = t
    return (t >>> 0) / 4294967296
  }

  // Box-Muller transform for Gaussian samples
  let spare: number | null = null
  function gaussian(): number {
    if (spare !== null) {
      const v = spare
      spare = null
      return v
    }
    const u1 = next()
    const u2 = next()
    const mag = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10)))
    const z0 = mag * Math.cos(2 * Math.PI * u2)
    spare = mag * Math.sin(2 * Math.PI * u2)
    return z0
  }

  return { next, gaussian }
}

const MAX_WALKS = 300
const MAX_STEPS = 600

export const randomWalk: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    // Pre-allocated walk data: walks[i * MAX_STEPS + step] = position
    const walkData = new Float64Array(MAX_WALKS * MAX_STEPS)
    const SEED = 42
    let rng = makePRNG(SEED)
    let currentStep = 0
    let lastWalks = 0
    let lastDrift = 0
    let lastVol = 0
    // Auto-restart bookkeeping: once the ensemble reaches MAX_STEPS we pause,
    // then re-seed the same family so the CLT convergence keeps replaying.
    let completed = false
    let restartAt = 0

    function resetWalks() {
      walkData.fill(0)
      currentStep = 0
      completed = false
      // Re-seed from the same fixed seed so the walk family is reproducible
      // across restarts and parameter changes.
      rng = makePRNG(SEED)
    }

    // Generate one step for all walks
    function stepAll(nWalks: number, drift: number, vol: number) {
      if (currentStep >= MAX_STEPS) return
      for (let i = 0; i < nWalks; i++) {
        const prev = currentStep === 0 ? 0 : walkData[i * MAX_STEPS + currentStep - 1]
        const z = rng.gaussian()
        walkData[i * MAX_STEPS + currentStep] = prev + drift + vol * z
      }
      currentStep++
    }

    return {
      step(t, p) {
        const nWalks = p.walks as number
        const drift = p.drift as number
        const vol = p.volatility as number
        const color = p.color as string

        // Reset if params changed. resetWalks() re-seeds the RNG so the walk
        // family is reproducible for a given parameter set.
        if (nWalks !== lastWalks || drift !== lastDrift || vol !== lastVol) {
          resetWalks()
          lastWalks = nWalks
          lastDrift = drift
          lastVol = vol
        }

        // Auto-restart: once the ensemble fills MAX_STEPS the canvas would
        // otherwise freeze. Pause ~2s on the converged distribution, then
        // re-seed and replay so the CLT convergence keeps animating.
        if (currentStep >= MAX_STEPS && !completed) {
          completed = true
          restartAt = t + 2000
        }
        if (completed && t > restartAt) {
          resetWalks()
        }

        // Generate a few steps per frame for visible progression
        const stepsPerFrame = Math.max(1, Math.ceil(currentStep < 100 ? 2 : 1))
        for (let s = 0; s < stepsPerFrame; s++) {
          stepAll(nWalks, drift, vol)
        }

        // Clear
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        // Layout: walks on left 75%, histogram on right 20%
        const walkAreaW = w * 0.72
        const histAreaX = w * 0.76
        const histAreaW = w * 0.22
        const marginTop = 40
        const marginBottom = 40
        const plotH = h - marginTop - marginBottom

        // Scale: x-axis is step number, y-axis is position
        const stepScale = walkAreaW / MAX_STEPS

        // Compute y range from current data
        let minY = -5, maxY = 5
        for (let i = 0; i < nWalks; i++) {
          for (let s = 0; s < currentStep; s++) {
            const v = walkData[i * MAX_STEPS + s]
            if (v < minY) minY = v
            if (v > maxY) maxY = v
          }
        }
        // Add padding
        const yPad = (maxY - minY) * 0.1 + 1
        minY -= yPad
        maxY += yPad
        const yRange = maxY - minY

        function toScreenY(val: number): number {
          return marginTop + plotH * (1 - (val - minY) / yRange)
        }

        // Draw zero line
        const zeroY = toScreenY(0)
        ctx.save()
        ctx.strokeStyle = theme.fg
        ctx.globalAlpha = 0.15
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(0, zeroY)
        ctx.lineTo(walkAreaW, zeroY)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()

        // Draw walks
        // Separate walks above and below mean for coloring
        // Compute current mean
        let meanSum = 0
        for (let i = 0; i < nWalks; i++) {
          meanSum += walkData[i * MAX_STEPS + currentStep - 1]
        }
        const mean = meanSum / nWalks

        // Parse accent color
        const ar = parseInt(color.slice(1, 3), 16)
        const ag = parseInt(color.slice(3, 5), 16)
        const ab = parseInt(color.slice(5, 7), 16)

        // Draw all walks with low alpha
        ctx.save()
        ctx.lineWidth = 0.7

        // Above mean: accent color. Below: complementary.
        // Compute complementary: rotate hue ~180 degrees
        function complementHex(r: number, g: number, b: number): string {
          // Simple complement via HSL
          const max = Math.max(r, g, b), min = Math.min(r, g, b)
          const l = (max + min) / 2
          let h = 0, s = 0
          if (max !== min) {
            const d = max - min
            s = l > 127 ? d / (510 - max - min) : d / (max + min)
            if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
            else if (max === g) h = ((b - r) / d + 2) / 6
            else h = ((r - g) / d + 4) / 6
          }
          h = (h + 0.5) % 1
          function hue2rgb(p: number, q: number, t: number) {
            if (t < 0) t += 1; if (t > 1) t -= 1
            if (t < 1 / 6) return p + (q - p) * 6 * t
            if (t < 1 / 2) return q
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
            return p
          }
          let rr: number, gg: number, bb: number
          if (s === 0) { rr = gg = bb = l } else {
            const ll = l / 255
            const ss = s
            const qq = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
            const pp = 2 * ll - qq
            rr = hue2rgb(pp, qq, h + 1 / 3) * 255
            gg = hue2rgb(pp, qq, h) * 255
            bb = hue2rgb(pp, qq, h - 1 / 3) * 255
          }
          return `#${Math.round(rr).toString(16).padStart(2, '0')}${Math.round(gg).toString(16).padStart(2, '0')}${Math.round(bb).toString(16).padStart(2, '0')}`
        }

        const aboveColor = color
        const belowColor = complementHex(ar, ag, ab)

        // Batch draw: two passes, above and below
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass === 0 ? aboveColor : belowColor
          ctx.globalAlpha = 0.35
          ctx.beginPath()
          for (let i = 0; i < nWalks; i++) {
            const finalVal = walkData[i * MAX_STEPS + currentStep - 1]
            const isAbove = finalVal >= mean
            if ((pass === 0) !== isAbove) continue
            let started = false
            for (let s = 0; s < currentStep; s++) {
              const val = walkData[i * MAX_STEPS + s]
              const sx = s * stepScale
              const sy = toScreenY(val)
              if (!started) { ctx.moveTo(sx, sy); started = true }
              else ctx.lineTo(sx, sy)
            }
          }
          ctx.stroke()
        }
        ctx.restore()

        // Draw histogram at right edge
        if (currentStep > 10) {
          const nBins = 40
          const binCounts = new Int32Array(nBins)
          const binMin = minY
          const binMax = maxY
          const binWidth = (binMax - binMin) / nBins

          for (let i = 0; i < nWalks; i++) {
            const val = walkData[i * MAX_STEPS + currentStep - 1]
            const bin = Math.floor((val - binMin) / binWidth)
            if (bin >= 0 && bin < nBins) binCounts[bin]++
          }

          // Find max bin count
          let maxCount = 0
          for (let i = 0; i < nBins; i++) {
            if (binCounts[i] > maxCount) maxCount = binCounts[i]
          }

          // Draw histogram bars
          ctx.save()
          const barH = plotH / nBins
          for (let i = 0; i < nBins; i++) {
            if (binCounts[i] === 0) continue
            const barW = (binCounts[i] / maxCount) * histAreaW
            const by = marginTop + i * barH
            const binCenter = binMin + (i + 0.5) * binWidth
            ctx.fillStyle = binCenter >= mean ? aboveColor : belowColor
            ctx.globalAlpha = 0.3
            ctx.fillRect(histAreaX, by, barW, barH - 1)
          }
          ctx.restore()

          // Overlay theoretical Gaussian: N(drift * n, vol^2 * n)
          const n = currentStep
          const gaussMean = drift * n
          const gaussVar = vol * vol * n
          const gaussStd = Math.sqrt(gaussVar)

          ctx.save()
          ctx.strokeStyle = theme.fg
          ctx.globalAlpha = 0.6
          ctx.lineWidth = 1.5
          ctx.beginPath()

          // Draw the Gaussian PDF scaled to match histogram
          // The PDF at x is (1/(sigma*sqrt(2*pi))) * exp(-0.5*((x-mu)/sigma)^2)
          // Scale: total area under histogram = nWalks * binWidth, so peak of PDF * nWalks * binWidth should match maxCount
          const pdfScale = nWalks * binWidth
          let pdfStarted = false

          for (let py = marginTop; py < marginTop + plotH; py += 2) {
            // py corresponds to a value
            const val = minY + (1 - (py - marginTop) / plotH) * yRange
            if (gaussStd < 1e-8) continue
            const z = (val - gaussMean) / gaussStd
            const pdf = Math.exp(-0.5 * z * z) / (gaussStd * Math.sqrt(2 * Math.PI))
            const barUnits = pdf * pdfScale
            const bx = histAreaX + (barUnits / maxCount) * histAreaW
            if (!pdfStarted) { ctx.moveTo(bx, py); pdfStarted = true }
            else ctx.lineTo(bx, py)
          }
          ctx.stroke()
          ctx.restore()
        }

        // Draw separator line
        ctx.save()
        ctx.strokeStyle = theme.fg
        ctx.globalAlpha = 0.1
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(histAreaX - 10, marginTop)
        ctx.lineTo(histAreaX - 10, marginTop + plotH)
        ctx.stroke()
        ctx.restore()

        // Labels
        ctx.save()
        ctx.font = '11px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.4
        ctx.fillText(`n = ${currentStep}`, 12, marginTop - 10)
        ctx.fillText(`μ = ${(drift * currentStep).toFixed(2)}`, histAreaX, marginTop - 10)
        ctx.fillText(`σ = ${(Math.sqrt(vol * vol * currentStep)).toFixed(2)}`, histAreaX + histAreaW * 0.4, marginTop - 10)
        ctx.fillText('CLT → N(μn, σ²n)', 12, h - 12)
        ctx.restore()
      },
    }
  },
}
