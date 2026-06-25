import type { EffectModule } from '@/lib/lab/types'

/**
 * CMB Sky
 *
 * Two linked views of the cosmic microwave background — the relic light
 * from the surface of last scattering, 380,000 years after the Big Bang:
 *
 *   • map      — a mottled temperature field. The mean is 2.725 K; the
 *                anisotropies drawn here are ΔT/T ~ 10⁻⁵ (tens of μK).
 *                Hot spots are slightly denser regions that had fallen
 *                deeper into potential wells; cold spots are voids.
 *   • spectrum — the angular power spectrum. We plot the standard quantity
 *                D_ℓ = ℓ(ℓ+1) C_ℓ / 2π  in μK², versus multipole ℓ.
 *                The peaks are acoustic oscillations of the photon–baryon
 *                fluid frozen in at recombination.
 *
 * The spectrum is a physically-motivated PARAMETRIC model (not a Boltzmann
 * solve) tuned so the sliders behave the way the real physics does:
 *
 *   • The first peak sits near ℓ ≈ 220, set by the sound horizon at last
 *     scattering projected to today's angle. Lowering Ω_m pushes the peaks
 *     to higher ℓ (the last-scattering surface is further, so a fixed
 *     physical scale subtends a smaller angle).
 *   • Baryons load the oscillator: raising Ω_b boosts the ODD (compression)
 *     peaks — 1st, 3rd — and suppresses the EVEN (rarefaction) peaks — 2nd.
 *     The 1st/2nd peak height ratio is the classic baryometer.
 *   • Silk damping erases power on small scales, giving the exponential
 *     fall-off past ℓ ≈ 1000.
 *   • tilt (the scalar spectral index n_s) tilts the primordial input:
 *     n_s < 1 ("red") lowers small-scale power relative to large.
 *
 * The temperature MAP is generated from the same model: a band-limited
 * Gaussian random field whose Fourier amplitudes follow √C_ℓ, so its
 * mottling reflects the acoustic scale (~1° blobs) and reacts to the
 * sliders.
 */

const TWO_PI = Math.PI * 2

// Standard CMB monopole.
const T_CMB_K = 2.725

type ControlSpec = EffectModule['controls'][number]

const controls: ControlSpec[] = [
  { key: 'omegaB', label: 'Baryon density Ω_b h²', type: 'range', min: 0.012, max: 0.034, step: 0.001 },
  { key: 'omegaM', label: 'Matter density Ω_m', type: 'range', min: 0.15, max: 0.6, step: 0.01 },
  { key: 'tilt', label: 'Tilt n_s', type: 'range', min: 0.9, max: 1.05, step: 0.005 },
  {
    key: 'view',
    label: 'View',
    type: 'select',
    options: [
      { label: 'Temperature map', value: 'map' },
      { label: 'Power spectrum', value: 'spectrum' },
    ],
  },
]

const defaults: EffectModule['defaults'] = {
  // Planck-ish fiducial values.
  omegaB: 0.022,
  omegaM: 0.32,
  tilt: 0.965,
  view: 'map',
}

// ---------------------------------------------------------------------------
// Physics: a parametric angular power spectrum D_ℓ in μK².
// ---------------------------------------------------------------------------

/** First-peak multipole as a function of Ω_m (others held at fiducial). */
function firstPeakL(omegaM: number): number {
  // The acoustic scale θ_s is nearly constant in physical terms; the angle it
  // subtends grows with the comoving distance to last scattering, which grows
  // as Ω_m falls. ℓ_peak ∝ 1/θ_s ∝ distance. Calibrated so Ω_m = 0.32 → ℓ ≈ 220.
  return 220 * Math.pow(0.32 / omegaM, 0.28)
}

/**
 * D_ℓ = ℓ(ℓ+1) C_ℓ / 2π in μK². Sum of acoustic peaks (Gaussians in ℓ),
 * an enveloping primordial tilt, the Sachs–Wolfe plateau at low ℓ, and
 * Silk damping at high ℓ.
 */
function spectrumDl(l: number, omegaB: number, omegaM: number, tilt: number): number {
  if (l < 2) return 0

  const l1 = firstPeakL(omegaM)

  // Baryon loading R ∝ Ω_b. Reference Ω_b h² = 0.022.
  const baryon = omegaB / 0.022

  // Acoustic peaks live at roughly ℓ ≈ n · ℓ1 (slightly compressed spacing).
  // Heights: odd peaks (compression) are boosted by baryon loading, even
  // peaks (rarefaction) are suppressed. Each subsequent peak is damped.
  const peaks: Array<{ center: number; amp: number; width: number }> = []
  const nPeaks = 7
  for (let n = 1; n <= nPeaks; n++) {
    // Peak spacing tightens a touch with order (driving + projection).
    const center = l1 * (n - (n - 1) * 0.04)
    const odd = n % 2 === 1
    // Baseline envelope: a steep decline so the first peak dominates, as in
    // the real spectrum (1st peak ~5700 μK², 2nd ~2500, 3rd ~2400).
    let amp = 5700 * Math.exp(-0.55 * (n - 1))
    // Baryon loading: boost odd (compression) peaks, suppress even
    // (rarefaction). Strong on the 2nd peak — the baryometer.
    if (odd) amp *= Math.pow(baryon, 0.45)
    else amp *= Math.pow(baryon, -0.7)
    // Peaks are fairly sharp; width grows slowly with order.
    const width = 0.13 * center
    peaks.push({ center, amp, width })
  }

  let dl = 0
  for (const pk of peaks) {
    const z = (l - pk.center) / pk.width
    dl += pk.amp * Math.exp(-0.5 * z * z)
  }

  // Sachs–Wolfe plateau: large-scale power that does not oscillate. Fills the
  // troughs at low ℓ so the spectrum never reaches zero between peaks.
  const sw = 1050 * Math.exp(-Math.pow(l / 85, 1.5))
  dl += sw

  // A small floor under the troughs across the peak region so even peaks
  // sit on a pedestal (rarefaction never fully cancels), without merging peaks.
  dl += 320 * Math.exp(-Math.pow((l - l1) / (3.0 * l1), 2))

  // Primordial tilt: (ℓ/ℓ_pivot)^(n_s − 1). n_s < 1 lowers small-scale power.
  const pivot = 200
  dl *= Math.pow(l / pivot, tilt - 1)

  // Silk (diffusion) damping — exponential cut at small scales. The damping
  // scale shifts slightly with Ω_b (more baryons → photons diffuse less).
  const lSilk = 1400 * Math.pow(baryon, 0.12)
  dl *= Math.exp(-Math.pow(l / lSilk, 1.8))

  return Math.max(0, dl)
}

// ---------------------------------------------------------------------------
// Deterministic PRNG so the map is stable frame-to-frame (only changes when
// params change). mulberry32.
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard-normal pair via Box–Muller. */
function gauss2(r: () => number): [number, number] {
  const u1 = Math.max(1e-12, r())
  const u2 = r()
  const mag = Math.sqrt(-2 * Math.log(u1))
  return [mag * Math.cos(TWO_PI * u2), mag * Math.sin(TWO_PI * u2)]
}

/** A small param signature so we can hash & detect changes. */
function paramHash(omegaB: number, omegaM: number, tilt: number): string {
  return `${omegaB.toFixed(4)}|${omegaM.toFixed(3)}|${tilt.toFixed(4)}`
}

// ---------------------------------------------------------------------------
// Colour map: cold (blue) → mean (neutral) → hot (red), the Planck convention.
// ---------------------------------------------------------------------------

function tempColour(norm: number): [number, number, number] {
  // norm in roughly [-1, 1]; clamp.
  const t = Math.max(-1, Math.min(1, norm))
  // Diverging blue–white–red.
  if (t < 0) {
    const a = t + 1 // 0..1
    // deep blue (10,30,120) → near-white (235,235,245)
    return [
      Math.round(10 + a * (235 - 10)),
      Math.round(30 + a * (235 - 30)),
      Math.round(120 + a * (245 - 120)),
    ]
  }
  // near-white → deep red (180,20,20)
  return [
    Math.round(235 + t * (180 - 235)),
    Math.round(235 + t * (20 - 235)),
    Math.round(245 + t * (20 - 245)),
  ]
}

const cmbSky: EffectModule = {
  controls,
  defaults,

  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    // The host canvas applies `setTransform(dpr, …)` before each frame, so we
    // draw in CSS-pixel space; dims.w / dims.h are already CSS pixels.
    const { w, h } = dims
    const bg = theme.bg
    const fg = theme.fg

    // The map is generated at a coarse grid (an anisotropy "patch" of sky)
    // then drawn as cells, so it is cheap and the acoustic blobs read clearly.
    const GRID = 96
    const field = new Float32Array(GRID * GRID)
    let fieldRms = 1

    let lastHash = ''

    // --- Map generation -----------------------------------------------------
    // Build a band-limited Gaussian random field whose 2D power spectrum
    // matches C_ℓ from the model. We synthesise it as a sum of plane waves
    // (a small spectral synthesis) — correct in spirit and stable.
    function buildField(omegaB: number, omegaM: number, tilt: number) {
      field.fill(0)
      const rand = mulberry32(1337) // fixed seed → same sky, sliders reshape it

      // The patch spans ~20° of sky. A multipole ℓ corresponds to angular
      // wavenumber; map ℓ to grid wavenumber k (cells⁻¹) via the patch size.
      const patchDeg = 20
      const patchRad = (patchDeg * Math.PI) / 180
      // k (rad⁻¹) ≈ ℓ;   spatial frequency over the grid = ℓ * patchRad / (2π) cycles.
      const modes = 220 // number of random Fourier modes summed
      for (let m = 0; m < modes; m++) {
        // Sample ℓ on a log grid weighted toward the acoustic band.
        const u = (m + 0.5) / modes
        const lVal = 20 + Math.pow(u, 0.85) * 1500
        const cl = spectrumDl(lVal, omegaB, omegaM, tilt) / (lVal * (lVal + 1) / TWO_PI)
        const amp = Math.sqrt(Math.max(0, cl)) // √C_ℓ
        if (amp <= 0) continue

        // Random 2D direction for this mode.
        const theta = rand() * TWO_PI
        const cyc = (lVal * patchRad) / TWO_PI // cycles across the patch
        const kx = (TWO_PI * cyc * Math.cos(theta)) / GRID
        const ky = (TWO_PI * cyc * Math.sin(theta)) / GRID
        const [g] = gauss2(rand)
        const phase = rand() * TWO_PI
        const a = amp * g

        for (let y = 0; y < GRID; y++) {
          const ky_y = ky * y
          for (let x = 0; x < GRID; x++) {
            field[y * GRID + x] += a * Math.cos(kx * x + ky_y + phase)
          }
        }
      }

      // Normalise to unit RMS for display; we annotate the physical μK scale.
      let mean = 0
      for (let i = 0; i < field.length; i++) mean += field[i]
      mean /= field.length
      let v = 0
      for (let i = 0; i < field.length; i++) {
        field[i] -= mean
        v += field[i] * field[i]
      }
      fieldRms = Math.sqrt(v / field.length) || 1
    }

    // --- Drawing the map ----------------------------------------------------
    function drawMap(omegaB: number, omegaM: number, tilt: number) {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // Top band reserved for title + sub-title; bottom band for colour bar.
      const margin = { left: 16, right: 16, top: 56, bottom: 70 }
      // Keep the map square within the available rect.
      const availW = w - margin.left - margin.right
      const availH = h - margin.top - margin.bottom
      const size = Math.min(availW, availH)
      const ox = margin.left + (availW - size) / 2
      const oy = margin.top + (availH - size) / 2

      const cell = size / GRID
      // ±3σ maps to the colour-scale extremes.
      const scale = 1 / (3 * fieldRms)
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          const norm = field[y * GRID + x] * scale
          const [r, g, b] = tempColour(norm)
          ctx.fillStyle = `rgb(${r},${g},${b})`
          // Clamp every cell to the plotting rect.
          const px = ox + x * cell
          const py = oy + y * cell
          ctx.fillRect(px, py, Math.ceil(cell) + 0.5, Math.ceil(cell) + 0.5)
        }
      }

      // Frame.
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.25
      ctx.lineWidth = 1
      ctx.strokeRect(ox, oy, size, size)
      ctx.globalAlpha = 1

      // Title + sub-title (centred, in the reserved top band — above the map).
      const peak = firstPeakL(omegaM)
      ctx.fillStyle = fg
      ctx.textAlign = 'center'
      ctx.font = 'bold 13px monospace'
      ctx.fillText('CMB temperature map  —  ΔT/T ~ 10⁻⁵', w / 2, 22)
      ctx.globalAlpha = 0.55
      ctx.font = '10px monospace'
      ctx.fillText(
        `~20° patch · acoustic scale ≈ ${(180 / peak).toFixed(2)}° (ℓ₁ ≈ ${Math.round(peak)})`,
        w / 2,
        40,
      )
      ctx.globalAlpha = 1

      // Colour-bar legend along the bottom.
      const barY = oy + size + 18
      const barW = Math.min(size, 240)
      const barX = ox + (size - barW) / 2
      const barH = 8
      const STEPS = 80
      for (let s = 0; s < STEPS; s++) {
        const norm = (s / (STEPS - 1)) * 2 - 1
        const [r, g, b] = tempColour(norm)
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(barX + (s / STEPS) * barW, barY, barW / STEPS + 1, barH)
      }
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.3
      ctx.strokeRect(barX, barY, barW, barH)
      ctx.globalAlpha = 0.65
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('−200 μK', barX, barY + 24)
      ctx.textAlign = 'center'
      ctx.fillText(`${T_CMB_K} K`, barX + barW / 2, barY + 24)
      ctx.textAlign = 'right'
      ctx.fillText('+200 μK', barX + barW, barY + 24)
      ctx.globalAlpha = 1

      // Footer: the current parameters, centred below the colour-bar labels.
      ctx.textAlign = 'center'
      ctx.globalAlpha = 0.55
      ctx.font = '10px monospace'
      ctx.fillText(
        `Ω_b h²=${omegaB.toFixed(3)}   Ω_m=${omegaM.toFixed(2)}   n_s=${tilt.toFixed(3)}`,
        w / 2,
        barY + 40,
      )
      ctx.globalAlpha = 1
    }

    // --- Drawing the power spectrum ----------------------------------------
    function drawSpectrum(omegaB: number, omegaM: number, tilt: number) {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      const margin = { left: 62, right: 24, top: 44, bottom: 46 }
      const plotW = w - margin.left - margin.right
      const plotH = h - margin.top - margin.bottom
      const x0 = margin.left
      const y0 = margin.top
      const x1 = x0 + plotW
      const y1 = y0 + plotH

      // Axes ranges. ℓ from 2 to 2200; D_ℓ from 0 to a dynamic max.
      const lMin = 2
      const lMax = 2200

      // Find the spectrum's max over the range so the y-axis auto-scales.
      let dlMax = 0
      const SAMPLES = plotW > 0 ? Math.max(2, Math.floor(plotW)) : 2
      const dlBuf = new Float64Array(SAMPLES)
      for (let i = 0; i < SAMPLES; i++) {
        const l = lMin + (i / (SAMPLES - 1)) * (lMax - lMin)
        const d = spectrumDl(l, omegaB, omegaM, tilt)
        dlBuf[i] = d
        if (d > dlMax) dlMax = d
      }
      // Round the axis top up to something tidy, keep headroom.
      const yTop = Math.max(1000, Math.ceil((dlMax * 1.12) / 500) * 500)

      const lToX = (l: number) => {
        const xx = x0 + ((l - lMin) / (lMax - lMin)) * plotW
        return Math.max(x0, Math.min(x1, xx))
      }
      const dToY = (d: number) => {
        const yy = y1 - (d / yTop) * plotH
        return Math.max(y0, Math.min(y1, yy))
      }

      // Title.
      ctx.fillStyle = fg
      ctx.textAlign = 'center'
      ctx.font = 'bold 13px monospace'
      ctx.fillText('CMB angular power spectrum', w / 2, 24)

      // Gridlines + x-axis ticks at notable ℓ.
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      const lTicks = [2, 200, 500, 1000, 1500, 2000]
      ctx.strokeStyle = fg
      ctx.lineWidth = 1
      for (const lt of lTicks) {
        if (lt < lMin || lt > lMax) continue
        const x = lToX(lt)
        ctx.globalAlpha = 0.12
        ctx.setLineDash([2, 4])
        ctx.beginPath()
        ctx.moveTo(x, y0)
        ctx.lineTo(x, y1)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 0.6
        ctx.fillStyle = fg
        ctx.fillText(`${lt}`, x, y1 + 16)
      }
      // y-axis ticks.
      ctx.textAlign = 'right'
      const yTicks = 5
      for (let i = 0; i <= yTicks; i++) {
        const d = (i / yTicks) * yTop
        const y = dToY(d)
        ctx.globalAlpha = 0.12
        ctx.setLineDash([2, 4])
        ctx.beginPath()
        ctx.moveTo(x0, y)
        ctx.lineTo(x1, y)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 0.6
        ctx.fillStyle = fg
        ctx.fillText(`${Math.round(d)}`, x0 - 8, y + 3)
      }
      ctx.globalAlpha = 1

      // Axis labels.
      ctx.fillStyle = fg
      ctx.globalAlpha = 0.7
      ctx.textAlign = 'center'
      ctx.font = '11px monospace'
      ctx.fillText('Multipole moment  ℓ   (angular scale ≈ 180°/ℓ)', x0 + plotW / 2, h - 8)
      ctx.save()
      ctx.translate(16, y0 + plotH / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.textAlign = 'center'
      ctx.fillText('D_ℓ = ℓ(ℓ+1)C_ℓ/2π   [μK²]', 0, 0)
      ctx.restore()
      ctx.globalAlpha = 1

      // The spectrum curve, filled.
      ctx.beginPath()
      ctx.moveTo(x0, y1)
      for (let i = 0; i < SAMPLES; i++) {
        const l = lMin + (i / (SAMPLES - 1)) * (lMax - lMin)
        ctx.lineTo(lToX(l), dToY(dlBuf[i]))
      }
      ctx.lineTo(x1, y1)
      ctx.closePath()
      ctx.fillStyle = '#6366f1' // cosmic indigo (section accent)
      ctx.globalAlpha = 0.18
      ctx.fill()
      ctx.globalAlpha = 1

      // Curve stroke.
      ctx.beginPath()
      for (let i = 0; i < SAMPLES; i++) {
        const l = lMin + (i / (SAMPLES - 1)) * (lMax - lMin)
        const x = lToX(l)
        const y = dToY(dlBuf[i])
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = '#818cf8'
      ctx.lineWidth = 2
      ctx.stroke()

      // Mark the acoustic peaks by scanning the sampled buffer for local maxima.
      ctx.fillStyle = fg
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      let peakIdx = 0
      for (let i = 2; i < SAMPLES - 2; i++) {
        const l = lMin + (i / (SAMPLES - 1)) * (lMax - lMin)
        if (l < 100) continue // skip Sachs–Wolfe plateau
        if (
          dlBuf[i] > dlBuf[i - 1] &&
          dlBuf[i] > dlBuf[i - 2] &&
          dlBuf[i] >= dlBuf[i + 1] &&
          dlBuf[i] >= dlBuf[i + 2] &&
          dlBuf[i] > yTop * 0.06
        ) {
          peakIdx++
          if (peakIdx > 4) break
          const x = lToX(l)
          const y = dToY(dlBuf[i])
          ctx.fillStyle = '#818cf8'
          ctx.beginPath()
          ctx.arc(x, y, 3, 0, TWO_PI)
          ctx.fill()
          ctx.fillStyle = fg
          ctx.globalAlpha = 0.7
          ctx.fillText(`#${peakIdx} ℓ≈${Math.round(l)}`, x, y - 8)
          ctx.globalAlpha = 1
        }
      }

      // Axis box.
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.4
      ctx.lineWidth = 1
      ctx.strokeRect(x0, y0, plotW, plotH)
      ctx.globalAlpha = 1

      // Readout — top-RIGHT of the plot, clear of the first (tallest) peak.
      ctx.globalAlpha = 0.6
      ctx.font = '10px monospace'
      ctx.textAlign = 'right'
      ctx.fillStyle = fg
      ctx.fillText(
        `Ω_b h²=${omegaB.toFixed(3)}  Ω_m=${omegaM.toFixed(2)}  n_s=${tilt.toFixed(3)}`,
        x1 - 6,
        y0 + 14,
      )
      // First/second peak ratio — the baryometer.
      const d1 = spectrumDl(firstPeakL(omegaM), omegaB, omegaM, tilt)
      const d2 = spectrumDl(firstPeakL(omegaM) * 1.92, omegaB, omegaM, tilt)
      ctx.fillText(`1st/2nd peak ratio ≈ ${(d1 / Math.max(1, d2)).toFixed(2)}`, x1 - 6, y0 + 28)
      ctx.globalAlpha = 1
    }

    return {
      step(_t, p) {
        const omegaB = (p.omegaB ?? defaults.omegaB) as number
        const omegaM = (p.omegaM ?? defaults.omegaM) as number
        const tilt = (p.tilt ?? defaults.tilt) as number
        const view = (p.view ?? defaults.view) as string

        const hash = paramHash(omegaB, omegaM, tilt)
        // Rebuild the random field only when the physics params change (or on
        // first run). The map is otherwise static — the CMB does not move.
        if (hash !== lastHash) {
          buildField(omegaB, omegaM, tilt)
          lastHash = hash
        }

        if (view === 'spectrum') drawSpectrum(omegaB, omegaM, tilt)
        else drawMap(omegaB, omegaM, tilt)
      },
    }
  },
}

export { cmbSky }
