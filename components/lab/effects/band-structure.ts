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
 * Eigenvalues of a real symmetric tridiagonal matrix via the QL algorithm
 * with implicit shifts (the classic tql1 routine). `d` holds the diagonal,
 * `e` the sub-diagonal with e[0] unused. Operates in place on `d`, which on
 * return holds the (unsorted) eigenvalues. `e` is used as scratch.
 */
function tridiagEigenvalues(d: number[], e: number[]): number[] {
  const n = d.length
  if (n === 1) return d
  // Shift sub-diagonal so e[i] is the element between d[i-1] and d[i].
  for (let i = 1; i < n; i++) e[i - 1] = e[i]
  e[n - 1] = 0

  for (let l = 0; l < n; l++) {
    let iter = 0
    let m = l
    do {
      // Find a small sub-diagonal element to split the matrix.
      for (m = l; m < n - 1; m++) {
        const dd = Math.abs(d[m]) + Math.abs(d[m + 1])
        if (Math.abs(e[m]) <= Number.EPSILON * dd) break
      }
      if (m !== l) {
        if (iter++ === 50) break // give up gracefully; bands stay finite
        let g = (d[l + 1] - d[l]) / (2 * e[l])
        let r = Math.hypot(g, 1)
        g = d[m] - d[l] + e[l] / (g + (g >= 0 ? Math.abs(r) : -Math.abs(r)))
        let s = 1
        let c = 1
        let p = 0
        let i = m - 1
        let underflow = false
        for (; i >= l; i--) {
          const f = s * e[i]
          const b = c * e[i]
          r = Math.hypot(f, g)
          e[i + 1] = r
          if (r === 0) {
            d[i + 1] -= p
            e[m] = 0
            underflow = true
            break
          }
          s = f / r
          c = g / r
          g = d[i + 1] - p
          r = (d[i] - g) * s + 2 * c * b
          p = s * r
          d[i + 1] = g + p
          g = c * r - b
        }
        if (underflow && i >= l) continue
        d[l] -= p
        e[l] = g
        e[m] = 0
      }
    } while (m !== l)
  }
  return d
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
 * We diagonalize the plane-wave Hamiltonian at each k:
 *   H_{mn} = (k + mG)² δ_{mn} + (V₀/2)(δ_{m,n+1} + δ_{m,n-1})
 * which is real, symmetric and tridiagonal. Its eigenvalues give the bands,
 * so a gap of 2|V_G| = V₀ opens *only* where free-electron levels become
 * degenerate — i.e. at the Brillouin-zone boundaries — instead of being
 * painted onto every adjacent pair by hand.
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

    function computeBands(V0: number) {
      // k goes from -π/a to π/a (first Brillouin zone)
      // We set a=1, ℏ=1, m=0.5 for clean units → ℏ²/2m = 1
      // G = 2π
      const G = 2 * Math.PI

      // Coupling between adjacent plane waves. With off-diagonal V0/2 the
      // zone-boundary splitting is 2|V_G| = V0, which is the physical gap.
      const coupling = V0 / 2
      const halfN = Math.floor(N_WAVES / 2)

      for (let ki = 0; ki < N_K; ki++) {
        const k = ((ki / (N_K - 1)) - 0.5) * G // -π to π

        // Build the tridiagonal plane-wave Hamiltonian for this k.
        // Plane waves: k + n*G for n = -halfN ... +halfN
        // Diagonal:    (k + n*G)²
        // Off-diagonal: V0/2 (couples adjacent plane waves)
        const diag: number[] = []
        const sub: number[] = []
        for (let i = 0; i < N_WAVES; i++) {
          const n = i - halfN
          diag.push((k + n * G) ** 2)
          sub.push(i === 0 ? 0 : coupling)
        }

        // Diagonalize; eigenvalues come back unsorted, so sort ascending.
        const eigenvals = tridiagEigenvalues(diag, sub)
        eigenvals.sort((a, b) => a - b)
        for (let n = 0; n < N_WAVES; n++) {
          sortedBands[n][ki] = eigenvals[n] ?? 0
        }
      }
    }

    let lastV0 = -1

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
        const eToY = (e: number) => {
          // Clamp to the plot box so the V0=0 / single-band edge case (and the
          // free-electron reference, which can exceed the band range) never
          // produces NaN or off-canvas coordinates.
          const frac = Number.isFinite(e) ? (e - minE) / eRange : 0
          const y = pad.top + (1 - frac) * ph
          return Math.max(pad.top, Math.min(pad.top + ph, y))
        }

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
