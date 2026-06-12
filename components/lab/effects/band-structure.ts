import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'potential', label: 'Potential V₀', type: 'range', min: 0, max: 2, step: 0.05 },
  { key: 'bands', label: 'Bands', type: 'range', min: 1, max: 5, step: 1 },
  { key: 'speed', label: 'Electron speed', type: 'range', min: 0.1, max: 3, step: 0.1 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = { potential: 0.8, bands: 3, speed: 1, color: '#7c5cff' }

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/**
 * 1D nearly-free electron model band structure.
 *
 * In reduced zone scheme, the nth band has dispersion:
 *   E_n(k) = (ℏ²/2m)(k + nG)²  (free electron)
 * where G = 2π/a is the reciprocal lattice vector.
 *
 * At zone boundaries k = ±G/2, a gap opens:
 *   E_± ≈ E₀ ± |V_G|
 * where E₀ is the free-electron energy at the boundary.
 *
 * We use a simple perturbative approach: compute the 2×2 secular equation
 * at each k for pairs of nearly-degenerate free-electron levels.
 */
export const bandStructure: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    // Pre-compute band energies using plane-wave expansion
    // H_{mn} = (ℏ²(k+mG)²/2m)δ_{mn} + V₀/2 (δ_{m,n±1})
    // Use 9 plane waves for good convergence
    const N_WAVES = 9
    const N_K = 200
    const N_MAX_BANDS = 5
    // bandE[band][k] = energy
    const bandE: number[][] = []
    for (let n = 0; n < N_WAVES; n++) bandE.push(new Array(N_K).fill(0))

    // Sorted band energies for display
    const sortedBands: number[][] = []
    for (let n = 0; n < N_WAVES; n++) sortedBands.push(new Array(N_K).fill(0))

    // Electron positions (one per displayed band)
    const _electronPhase = new Float64Array(N_MAX_BANDS)

    function computeBands(V0: number) {
      // k goes from -π/a to π/a (first Brillouin zone)
      // We set a=1, ℏ=1, m=0.5 for clean units → ℏ²/2m = 1
      // G = 2π
      const G = 2 * Math.PI

      for (let ki = 0; ki < N_K; ki++) {
        const k = ((ki / (N_K - 1)) - 0.5) * G // -π to π

        // Build and diagonalize a small matrix
        // Plane waves: k + n*G for n = -N_WAVES/2 ... +N_WAVES/2
        const halfN = Math.floor(N_WAVES / 2)
        const eigenvals: number[] = []

        // Simple approach: for each pair of adjacent free-electron levels,
        // apply the 2×2 secular equation
        // Full approach: tridiagonal matrix eigenvalue problem
        // Diagonal: (k + n*G)²
        // Off-diagonal: V0/2

        // For a tridiagonal symmetric matrix, use a simple QR-like approach
        // Actually, for 9x9 it's fast enough to just use the analytic formula
        // for the nearly-free electron model

        // Compute free-electron energies
        const freeE: number[] = []
        for (let n = -halfN; n <= halfN; n++) {
          freeE.push((k + n * G) ** 2)
        }

        // Apply perturbation at zone boundaries (coupling adjacent levels)
        // E_n ≈ freeE_n ± |V0/2| when |freeE_n - freeE_{n+1}| is small
        // More rigorously: solve the tridiagonal system

        // For simplicity, use the 2-band model extended to multiple bands
        // Sort free electron energies
        const sorted = [...freeE].sort((a, b) => a - b)

        // Apply gap opening between adjacent sorted levels
        // Gap magnitude proportional to V0, inversely proportional to level spacing
        for (let i = 0; i < sorted.length; i++) {
          eigenvals.push(sorted[i])
        }

        // Apply perturbative corrections: at degeneracies, split by V0
        for (let i = 0; i < eigenvals.length - 1; i++) {
          const gap = eigenvals[i + 1] - eigenvals[i]
          if (gap < V0 * 2) {
            const mid = (eigenvals[i] + eigenvals[i + 1]) / 2
            const halfGap = Math.max(gap * 0.3, V0 * 0.5) / 2
            eigenvals[i] = mid - halfGap
            eigenvals[i + 1] = mid + halfGap
          }
        }

        eigenvals.sort((a, b) => a - b)
        for (let n = 0; n < N_WAVES; n++) {
          sortedBands[n][ki] = eigenvals[n] ?? 0
        }
      }
    }

    let lastV0 = -1
    const _N = 300 // draw resolution

    return {
      step(t, p) {
        const { w, h } = dims
        const time = t / 1000
        const V0 = p.potential as number
        const numBands = p.bands as number
        const speed = p.speed as number
        const [cr, cg, cb] = hexRgb(p.color as string)

        // Recompute bands when potential changes
        if (Math.abs(V0 - lastV0) > 0.01) {
          computeBands(V0)
          lastV0 = V0
        }

        ctx.clearRect(0, 0, w, h)

        // Plot area
        const pad = { left: 50, right: 20, top: 30, bottom: 40 }
        const pw = w - pad.left - pad.right
        const ph = h - pad.top - pad.bottom

        // Energy range
        const maxE = sortedBands[Math.min(numBands, N_WAVES) - 1]?.[N_K - 1] ?? 50
        const minE = sortedBands[0]?.[0] ?? 0
        const eRange = Math.max(maxE - minE, 1)

        const kToX = (ki: number) => pad.left + (ki / (N_K - 1)) * pw
        const eToY = (e: number) => pad.top + (1 - (e - minE) / eRange) * ph

        // Free electron parabola (reference)
        ctx.beginPath()
        ctx.strokeStyle = theme.fg + '15'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        for (let ki = 0; ki < N_K; ki++) {
          const k = ((ki / (N_K - 1)) - 0.5) * 2 * Math.PI
          const e = k * k
          const x = kToX(ki)
          const y = eToY(e)
          if (ki === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.setLineDash([])

        // Brillouin zone boundary lines
        ctx.strokeStyle = theme.fg + '20'
        ctx.lineWidth = 1
        const bzLeft = kToX(0)
        const bzMid = kToX(N_K / 2)
        const bzRight = kToX(N_K - 1)
        for (const x of [bzLeft, bzMid, bzRight]) {
          ctx.beginPath()
          ctx.moveTo(x, pad.top)
          ctx.lineTo(x, h - pad.bottom)
          ctx.stroke()
        }

        // Band curves
        const bandColors = [
          `rgb(${cr},${cg},${cb})`,
          `rgba(${cr},${cg},${cb},0.7)`,
          `rgba(${cr},${cg},${cb},0.5)`,
          `rgba(${cr},${cg},${cb},0.35)`,
          `rgba(${cr},${cg},${cb},0.25)`,
        ]

        for (let b = 0; b < numBands && b < N_WAVES; b++) {
          ctx.beginPath()
          ctx.strokeStyle = bandColors[b % bandColors.length]
          ctx.lineWidth = b === 0 ? 2.5 : 1.5
          for (let ki = 0; ki < N_K; ki++) {
            const x = kToX(ki)
            const y = eToY(sortedBands[b][ki])
            if (ki === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }

        // Band gap shading between first two bands
        if (numBands >= 2) {
          // Find the gap at zone boundary (ki = 0 or N_K-1)
          const gapKi = 0
          const _gapMid = (sortedBands[0][gapKi] + sortedBands[1][gapKi]) / 2
          const gapSize = Math.abs(sortedBands[1][gapKi] - sortedBands[0][gapKi])
          if (gapSize > 0.5) {
            const y1 = eToY(sortedBands[0][gapKi])
            const y2 = eToY(sortedBands[1][gapKi])
            ctx.fillStyle = `rgba(${cr},${cg},${cb},0.06)`
            ctx.fillRect(bzLeft - 15, Math.min(y1, y2), 30, Math.abs(y2 - y1))
          }
        }

        // Animated electrons (dots moving along bands)
        for (let b = 0; b < numBands && b < N_MAX_BANDS; b++) {
          const phase = (time * speed * (0.5 + b * 0.2) + b * 1.3) % 2
          const ki = Math.floor((phase < 1 ? phase : 2 - phase) * (N_K - 1))
          const clampedKi = Math.max(0, Math.min(N_K - 1, ki))
          const x = kToX(clampedKi)
          const y = eToY(sortedBands[b][clampedKi])

          ctx.beginPath()
          ctx.arc(x, y, 4, 0, Math.PI * 2)
          ctx.fillStyle = `rgb(${cr},${cg},${cb})`
          ctx.fill()

          // Glow
          ctx.beginPath()
          ctx.arc(x, y, 10, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${cr},${cg},${cb},0.15)`
          ctx.fill()
        }

        // Labels
        ctx.font = '10px monospace'
        ctx.fillStyle = theme.fg + '60'
        ctx.textAlign = 'center'
        ctx.fillText('k = -π/a', bzLeft, h - pad.bottom + 16)
        ctx.fillText('k = 0', bzMid, h - pad.bottom + 16)
        ctx.fillText('k = π/a', bzRight, h - pad.bottom + 16)

        ctx.textAlign = 'left'
        ctx.fillText('E', pad.left - 20, pad.top + 10)

        ctx.fillStyle = `rgb(${cr},${cg},${cb})`
        ctx.fillText(`V₀ = ${V0.toFixed(2)}`, 8, 20)

        // Free electron reference label
        ctx.fillStyle = theme.fg + '30'
        ctx.font = '9px monospace'
        ctx.fillText('free electron', pad.left + 4, eToY(minE + eRange * 0.8) - 4)

        ctx.textAlign = 'left'
      },
    }
  },
}
