import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'barrierHeight', label: 'Barrier V₀', type: 'range', min: 0.2, max: 5, step: 0.1 },
  { key: 'barrierWidth', label: 'Barrier width', type: 'range', min: 0.02, max: 0.2, step: 0.01 },
  { key: 'energy', label: 'Packet energy', type: 'range', min: 0.5, max: 5, step: 0.1 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = { barrierHeight: 2, barrierWidth: 0.08, energy: 2, color: '#7c5cff' }

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/**
 * Quantum tunneling via split-step Fourier method.
 *
 * We pre-compute the full time evolution at createRenderer time,
 * storing |ψ(x,t)|² frames in a Float32Array lookup table.
 * The animation just reads from the table — zero per-frame physics cost.
 *
 * ℏ = 1, m = 1 units.
 * iℏ ∂ψ/∂t = -ℏ²/2m ∂²ψ/∂x² + V(x)ψ
 */
export const quantumTunneling: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const NX = 512 // spatial grid points
    const NFRAMES = 400
    // Store |ψ|² for each frame
    const frames: Float32Array[] = []
    let currentParams = ''

    // We'll compute on first step when we have the actual params
    let computed = false

    /** Pre-compute all frames for given params */
    function compute(V0: number, barrierW: number, k0: number) {
      frames.length = 0
      computed = true

      const L = 4 * Math.PI // domain length
      const dx = L / NX
      const dt = 0.0004 // small time step for stability
      const stepsPerFrame = 10

      // Position space arrays
      const psiR = new Float64Array(NX) // real part
      const psiI = new Float64Array(NX) // imaginary part

      // Potential
      const V = new Float64Array(NX)
      const barrierCenter = L * 0.55
      for (let i = 0; i < NX; i++) {
        const x = i * dx
        V[i] = (Math.abs(x - barrierCenter) < barrierW / 2) ? V0 : 0
      }

      // Initial wave packet: Gaussian centered at x0 with momentum k0
      const x0 = L * 0.25
      const sigma = L * 0.04
      const norm = 1 / Math.sqrt(sigma * Math.sqrt(Math.PI))
      for (let i = 0; i < NX; i++) {
        const x = i * dx
        const gauss = norm * Math.exp(-((x - x0) ** 2) / (2 * sigma * sigma))
        psiR[i] = gauss * Math.cos(k0 * x)
        psiI[i] = gauss * Math.sin(k0 * x)
      }

      // Pre-compute momentum-space propagator: exp(-i ℏk²/(2m) dt)
      const kPropR = new Float64Array(NX)
      const kPropI = new Float64Array(NX)
      for (let i = 0; i < NX; i++) {
        let k: number
        if (i <= NX / 2) k = 2 * Math.PI * i / L
        else k = 2 * Math.PI * (i - NX) / L
        const phase = -k * k * dt / 2 // ℏ²k²/2m with ℏ=m=1
        kPropR[i] = Math.cos(phase)
        kPropI[i] = Math.sin(phase)
      }

      // Pre-compute position-space half-step propagator: exp(-i V dt/2)
      const xPropR = new Float64Array(NX)
      const xPropI = new Float64Array(NX)
      for (let i = 0; i < NX; i++) {
        const phase = -V[i] * dt / 2
        xPropR[i] = Math.cos(phase)
        xPropI[i] = Math.sin(phase)
      }

      // Simple DFT/IDFT (O(N²) but N=512 is fine for a one-time pre-computation)
      // Actually, let's use a simple FFT approach
      // For N=512, a direct DFT is too slow. Use a simple radix-2 FFT.
      // We'll implement an in-place Cooley-Tukey FFT

      function fft(re: Float64Array, im: Float64Array, inverse: boolean) {
        const n = re.length
        // Bit-reversal permutation
        for (let i = 1, j = 0; i < n; i++) {
          let bit = n >> 1
          while (j & bit) { j ^= bit; bit >>= 1 }
          j ^= bit
          if (i < j) {
            let tmp = re[i]; re[i] = re[j]; re[j] = tmp
            tmp = im[i]; im[i] = im[j]; im[j] = tmp
          }
        }
        // FFT butterfly
        const sign = inverse ? 1 : -1
        for (let len = 2; len <= n; len <<= 1) {
          const half = len >> 1
          const ang = sign * 2 * Math.PI / len
          const wR = Math.cos(ang)
          const wI = Math.sin(ang)
          for (let i = 0; i < n; i += len) {
            let cR = 1, cI = 0
            for (let j = 0; j < half; j++) {
              const tR = cR * re[i + j + half] - cI * im[i + j + half]
              const tI = cR * im[i + j + half] + cI * re[i + j + half]
              re[i + j + half] = re[i + j] - tR
              im[i + j + half] = im[i + j] - tI
              re[i + j] += tR
              im[i + j] += tI
              const newCR = cR * wR - cI * wI
              cI = cR * wI + cI * wR
              cR = newCR
            }
          }
        }
        if (inverse) {
          for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n }
        }
      }

      // Simulate and store frames
      for (let frame = 0; frame < NFRAMES; frame++) {
        // Store |ψ|²
        const prob = new Float32Array(NX)
        for (let i = 0; i < NX; i++) {
          prob[i] = psiR[i] * psiR[i] + psiI[i] * psiI[i]
        }
        frames.push(prob)

        // Advance stepsPerFrame time steps
        for (let step = 0; step < stepsPerFrame; step++) {
          // Split-step: half V, full K, half V
          // 1) Half potential step
          for (let i = 0; i < NX; i++) {
            const newR = psiR[i] * xPropR[i] - psiI[i] * xPropI[i]
            const newI = psiR[i] * xPropI[i] + psiI[i] * xPropR[i]
            psiR[i] = newR
            psiI[i] = newI
          }

          // 2) Full kinetic step (in k-space)
          fft(psiR, psiI, false)
          for (let i = 0; i < NX; i++) {
            const newR = psiR[i] * kPropR[i] - psiI[i] * kPropI[i]
            const newI = psiR[i] * kPropI[i] + psiI[i] * kPropR[i]
            psiR[i] = newR
            psiI[i] = newI
          }
          fft(psiR, psiI, true)

          // 3) Half potential step
          for (let i = 0; i < NX; i++) {
            const newR = psiR[i] * xPropR[i] - psiI[i] * xPropI[i]
            const newI = psiR[i] * xPropI[i] + psiI[i] * xPropR[i]
            psiR[i] = newR
            psiI[i] = newI
          }
        }
      }

      // Store barrier info for drawing
      compute._barrierCenter = barrierCenter
      compute._barrierW = barrierW
      compute._V0 = V0
      compute._potential = V
    }

    // Attach metadata
    compute._barrierCenter = 0
    compute._barrierW = 0.08
    compute._V0 = 2
    compute._potential = new Float64Array(NX)

    return {
      step(t, p) {
        const { w, h } = dims
        const [cr, cg, cb] = hexRgb(p.color as string)
        const V0 = p.barrierHeight as number
        const bW = p.barrierWidth as number
        const E = p.energy as number

        // Recompute if params changed
        const paramKey = `${V0.toFixed(2)}_${bW.toFixed(3)}_${E.toFixed(2)}`
        if (paramKey !== currentParams) {
          currentParams = paramKey
          compute(V0, bW, E)
        }

        if (!computed || frames.length === 0) return

        const time = t / 1000
        // Loop through frames
        const frameIdx = Math.floor(time * 30) % NFRAMES
        const prob = frames[frameIdx]
        const V = compute._potential
        const VMax = Math.max(V0, 1)

        ctx.clearRect(0, 0, w, h)

        const pad = { left: 10, right: 10, top: 30, bottom: 20 }
        const pw = w - pad.left - pad.right
        const ph = h - pad.top - pad.bottom
        const baseY = pad.top + ph * 0.75 // wave packet baseline

        // Draw potential barrier
        ctx.beginPath()
        const barrierScale = ph * 0.4 / VMax
        for (let i = 0; i < NX; i++) {
          const x = pad.left + (i / NX) * pw
          const y = baseY - V[i] * barrierScale
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        // Close to baseline
        ctx.lineTo(pad.left + pw, baseY)
        ctx.lineTo(pad.left, baseY)
        ctx.closePath()
        ctx.fillStyle = `rgba(250,204,21,0.12)` // yellow tint
        ctx.fill()
        ctx.strokeStyle = `rgba(250,204,21,0.5)`
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Baseline
        ctx.strokeStyle = theme.fg + '15'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(pad.left, baseY)
        ctx.lineTo(pad.left + pw, baseY)
        ctx.stroke()

        // Draw |ψ|² — find max for normalisation
        let maxProb = 0
        for (let i = 0; i < NX; i++) {
          if (prob[i] > maxProb) maxProb = prob[i]
        }
        if (maxProb < 1e-10) maxProb = 1

        const probScale = ph * 0.5 / maxProb

        // Filled area under |ψ|²
        ctx.beginPath()
        for (let i = 0; i < NX; i++) {
          const x = pad.left + (i / NX) * pw
          const y = baseY - prob[i] * probScale
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.lineTo(pad.left + pw, baseY)
        ctx.lineTo(pad.left, baseY)
        ctx.closePath()
        ctx.fillStyle = `rgba(${cr},${cg},${cb},0.15)`
        ctx.fill()

        // |ψ|² curve
        ctx.beginPath()
        for (let i = 0; i < NX; i++) {
          const x = pad.left + (i / NX) * pw
          const y = baseY - prob[i] * probScale
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = `rgb(${cr},${cg},${cb})`
        ctx.lineWidth = 2
        ctx.stroke()

        // Energy level line
        const eY = baseY - E * barrierScale
        ctx.setLineDash([4, 4])
        ctx.strokeStyle = theme.fg + '30'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(pad.left, eY)
        ctx.lineTo(pad.left + pw, eY)
        ctx.stroke()
        ctx.setLineDash([])

        // Labels
        ctx.font = '10px monospace'
        ctx.fillStyle = theme.fg + '60'
        ctx.textAlign = 'left'
        ctx.fillText(`E = ${E.toFixed(1)}`, pad.left + 4, eY - 4)
        ctx.fillText(`V₀ = ${V0.toFixed(1)}`, 8, 20)

        // Tunneling probability estimate
        // T ≈ exp(-2κd) where κ = sqrt(2m(V₀-E)/ℏ²) for E < V₀
        if (E < V0) {
          const kappa = Math.sqrt(2 * (V0 - E))
          const T = Math.exp(-2 * kappa * bW * 50) // scale barrier width
          ctx.fillStyle = `rgba(${cr},${cg},${cb},0.7)`
          ctx.fillText(`T ≈ ${T.toFixed(4)}`, 8, 36)
        } else {
          ctx.fillStyle = `rgba(${cr},${cg},${cb},0.7)`
          ctx.fillText('E > V₀ (classical transmission)', 8, 36)
        }
      },
      destroy() {
        frames.length = 0
        computed = false
        currentParams = ''
      },
    }
  },
}
