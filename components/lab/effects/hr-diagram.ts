import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * HR Diagram — the Hertzsprung–Russell diagram.
 *
 * Plots luminosity (vertical, log L/L⊙) against effective temperature
 * (horizontal, log Teff but REVERSED so hot is on the left — the historical
 * convention). The backdrop is a scattered stellar population that lays out
 * the three classic loci:
 *
 *   • the main sequence — the diagonal band where stars burn hydrogen in
 *     their cores. A star sits here for ~90% of its life.
 *   • the giant branch — cool but enormous (so luminous) post-main-sequence
 *     stars, up and to the right.
 *   • the white-dwarf region — hot but tiny (so faint) stellar remnants,
 *     down and to the left.
 *
 * A chosen star then traces its evolutionary track:
 *
 *   1. Zero-age main sequence (ZAMS). For a star of mass M (in M⊙) we use
 *      the standard mass–luminosity and mass–radius relations:
 *
 *        L/L⊙ ≈ M^3.5                 (mass–luminosity relation)
 *        R/R⊙ ≈ M^0.7                 (main-sequence radius)
 *
 *      and the Stefan–Boltzmann law L = 4πR²σT⁴ gives the surface temperature
 *
 *        Teff = T⊙ · (L/L⊙)^(1/4) / (R/R⊙)^(1/2)          (T⊙ = 5772 K)
 *
 *   2. Subgiant / red-giant branch. The core contracts and the envelope
 *      swells: luminosity climbs ~2 dex while Teff falls to ~3500–4000 K.
 *
 *   3. The remnant, set by the initial mass (rough thresholds):
 *
 *        M ≲ 8  M⊙  →  white dwarf   (hot, Earth-sized, fading)
 *        8 ≲ M ≲ 25 →  neutron star  (supernova leaves a ~12 km core)
 *        M ≳ 25     →  black hole    (core collapse beats neutron degeneracy)
 *
 * Metallicity Z shifts the main sequence slightly: metal-poor stars are a
 * touch hotter and fainter at fixed mass (a small empirical nudge here).
 *
 * Everything is plotted on a log–log grid and every value→pixel mapping is
 * clamped to the plot box, because a 50 M⊙ star's luminosity runs off the top.
 */

export const controls: ControlSpec[] = [
  { key: 'initialMass', label: 'Initial mass (M⊙)', type: 'range', min: 0.3, max: 40, step: 0.1 },
  { key: 'metallicity', label: 'Metallicity Z/Z⊙', type: 'range', min: 0.1, max: 2.5, step: 0.05 },
  { key: 'animateTrack', label: 'Animate track', type: 'toggle' },
]

export const defaults: Params = {
  initialMass: 1,
  metallicity: 1,
  animateTrack: true,
}

// --- Physical constants / reference points -------------------------------
const T_SUN = 5772 // K, solar effective temperature

// Axis ranges (log10). Temperature axis is reversed on screen.
const LOG_T_HOT = Math.log10(40000) // left edge
const LOG_T_COOL = Math.log10(2300) // right edge
const LOG_L_MAX = 6.3 // top edge  (10^6.3 L⊙)
const LOG_L_MIN = -4.5 // bottom edge (10^-4.5 L⊙)

// --- Stellar relations ---------------------------------------------------

/** Main-sequence luminosity L/L⊙ from mass (broken power law). */
function msLuminosity(m: number): number {
  // Piecewise mass–luminosity relation (standard approximation).
  if (m < 0.43) return 0.23 * Math.pow(m, 2.3)
  if (m < 2) return Math.pow(m, 4.0)
  if (m < 55) return 1.4 * Math.pow(m, 3.5)
  return 32000 * m
}

/** Main-sequence radius R/R⊙ from mass. */
function msRadius(m: number): number {
  // R ∝ M^0.57 (low mass) / M^0.8 (high mass); single 0.7 power is fine here.
  return Math.pow(m, m < 1 ? 0.8 : 0.57)
}

/** Effective temperature (K) from L/L⊙ and R/R⊙ via Stefan–Boltzmann. */
function teffFromLR(L: number, R: number): number {
  // L/L⊙ = (R/R⊙)² (T/T⊙)⁴  ⇒  T = T⊙ (L/L⊙)^¼ / (R/R⊙)^½
  return T_SUN * Math.pow(L, 0.25) / Math.pow(R, 0.5)
}

/** Main-sequence lifetime (Gyr): t ≈ 10 · M / L (fuel ∝ M, burn rate ∝ L). */
function msLifetimeGyr(m: number): number {
  return 10 * m / msLuminosity(m)
}

type Remnant = 'white dwarf' | 'neutron star' | 'black hole'
function remnantType(m: number): Remnant {
  if (m < 8) return 'white dwarf'
  if (m < 25) return 'neutron star'
  return 'black hole'
}

// A point on the evolutionary track: log10 temperature & luminosity.
type TrackPoint = { logT: number; logL: number; label?: string }

/**
 * Build a star's evolutionary track as a list of (logT, logL) points.
 * Phases: ZAMS → terminal MS → subgiant → red-giant tip → remnant.
 */
function buildTrack(mass: number, metallicity: number): TrackPoint[] {
  // Metallicity nudge: metal-poor (low Z) → hotter & slightly fainter MS.
  const zShiftLogT = -0.04 * Math.log10(metallicity) // hotter when Z<1
  const zShiftLogL = 0.05 * Math.log10(metallicity)

  const lZAMS = msLuminosity(mass)
  const rZAMS = msRadius(mass)
  const tZAMS = teffFromLR(lZAMS, rZAMS)

  const logL0 = Math.log10(lZAMS) + zShiftLogL
  const logT0 = Math.log10(tZAMS) + zShiftLogT

  const pts: TrackPoint[] = []
  pts.push({ logT: logT0, logL: logL0, label: 'ZAMS' })

  // Terminal-age main sequence: brightens ~0.25 dex, cools a little as the
  // star moves up the band.
  const logL1 = logL0 + 0.28
  const logT1 = logT0 - 0.02
  pts.push({ logT: logT1, logL: logL1 })

  // Subgiant: cross the Hertzsprung gap at roughly constant luminosity.
  const giantLogT = Math.log10(mass < 2 ? 4200 : mass < 10 ? 4000 : 3700)
  pts.push({ logT: (logT1 + giantLogT) / 2, logL: logL1 + 0.15 })

  // Red-giant / supergiant tip: big luminosity climb, cool surface.
  // Low-mass stars climb ~3 dex (red-giant branch); massive stars are
  // already luminous and become red supergiants near logL ≈ 5–5.7.
  const tipLogL = mass < 2
    ? Math.min(LOG_L_MAX - 0.4, logL1 + 3.0)
    : Math.min(LOG_L_MAX - 0.2, Math.max(logL1 + 1.0, mass < 10 ? 3.8 : 5.4))
  pts.push({ logT: giantLogT, logL: tipLogL, label: 'giant' })

  // Remnant.
  const remnant = remnantType(mass)
  if (remnant === 'white dwarf') {
    // Hot (~30000 K) and faint: a degenerate Earth-sized core that cools.
    pts.push({ logT: Math.log10(30000), logL: -1.5, label: 'WD →' })
    pts.push({ logT: Math.log10(8000), logL: -4.0 })
  } else if (remnant === 'neutron star') {
    // Supernova then a tiny ~12 km core: hot but essentially zero L on this
    // diagram. We park it at the faint-hot corner with a flag.
    pts.push({ logT: Math.log10(35000), logL: -3.0, label: 'NS' })
  } else {
    // Core collapse to a black hole — no photosphere; mark the corner.
    pts.push({ logT: Math.log10(35000), logL: -3.8, label: 'BH' })
  }

  return pts
}

// --- Background stellar population ---------------------------------------
// Deterministic pseudo-random so the scatter is stable across frames.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type BgStar = { logT: number; logL: number; r: number; color: string }

/** Colour from temperature (cool red → hot blue), independent of theme. */
function tempColor(logT: number): string {
  const t = Math.pow(10, logT)
  // Rough blackbody-ish ramp keyed to temperature.
  if (t > 25000) return '#9bb0ff'
  if (t > 10000) return '#aabfff'
  if (t > 7500) return '#cad7ff'
  if (t > 6000) return '#f8f7ff'
  if (t > 5200) return '#fff4e8'
  if (t > 3700) return '#ffd2a1'
  return '#ffa060'
}

function buildPopulation(): BgStar[] {
  const rnd = mulberry32(20260625)
  const stars: BgStar[] = []
  // Main sequence: sample masses, place on the ZAMS with a little scatter.
  for (let i = 0; i < 260; i++) {
    // Bias toward low masses (more common), log-uniform.
    const m = Math.pow(10, -0.6 + 2.0 * Math.pow(rnd(), 1.8))
    const L = msLuminosity(m)
    const R = msRadius(m)
    const T = teffFromLR(L, R)
    const logL = Math.log10(L) + (rnd() - 0.5) * 0.18
    const logT = Math.log10(T) + (rnd() - 0.5) * 0.012
    stars.push({ logT, logL, r: 0.9, color: tempColor(logT) })
  }
  // Giant branch / red clump: cool and luminous.
  for (let i = 0; i < 70; i++) {
    const logT = Math.log10(3600) + rnd() * (Math.log10(5200) - Math.log10(3600))
    const logL = 1.4 + rnd() * 2.2
    stars.push({ logT, logL, r: 1.2, color: tempColor(logT) })
  }
  // White-dwarf sequence: hot and faint.
  for (let i = 0; i < 45; i++) {
    const logT = Math.log10(7000) + rnd() * (Math.log10(40000) - Math.log10(7000))
    const logL = -2.0 - rnd() * 2.2 - (logT - Math.log10(7000)) * 0.5
    stars.push({ logT, logL, r: 0.8, color: tempColor(logT) })
  }
  return stars
}

// Sample an interpolated point along a polyline of TrackPoints at fraction f.
function sampleTrack(track: TrackPoint[], f: number): TrackPoint {
  if (track.length === 1) return track[0]
  const clampedF = Math.max(0, Math.min(1, f))
  const seg = clampedF * (track.length - 1)
  const i = Math.min(track.length - 2, Math.floor(seg))
  const u = seg - i
  const a = track[i]
  const b = track[i + 1]
  return { logT: a.logT + (b.logT - a.logT) * u, logL: a.logL + (b.logL - a.logL) * u }
}

export const hrDiagram: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    // Plot box.
    const pad = { left: 56, right: 18, top: 22, bottom: 40 }
    const plotW = Math.max(10, w - pad.left - pad.right)
    const plotH = Math.max(10, h - pad.top - pad.bottom)

    // log10(T) → x  (REVERSED: hot temperatures on the left).
    const tToX = (logT: number) => {
      const frac = (logT - LOG_T_HOT) / (LOG_T_COOL - LOG_T_HOT)
      const x = pad.left + frac * plotW
      return Math.max(pad.left, Math.min(pad.left + plotW, x))
    }
    // log10(L) → y  (luminous at the top).
    const lToY = (logL: number) => {
      const frac = (logL - LOG_L_MIN) / (LOG_L_MAX - LOG_L_MIN)
      const y = pad.top + (1 - frac) * plotH
      return Math.max(pad.top, Math.min(pad.top + plotH, y))
    }

    const population = buildPopulation()

    // Param-change detection (reset the animation when anything changes).
    let lastHash = ''
    let track: TrackPoint[] = []
    let progress = 0 // 0..1 along the track
    let lastT = -1

    function rebuild(mass: number, metallicity: number) {
      track = buildTrack(mass, metallicity)
      progress = 0
    }

    function drawAxes() {
      ctx.save()
      // Plot border.
      ctx.strokeStyle = theme.fg
      ctx.globalAlpha = 0.18
      ctx.lineWidth = 1
      ctx.strokeRect(pad.left, pad.top, plotW, plotH)

      ctx.font = '9px monospace'
      ctx.fillStyle = theme.fg

      // Temperature gridlines / ticks (reversed).
      const tTicks = [40000, 20000, 10000, 7000, 5000, 3500, 2500]
      ctx.textAlign = 'center'
      for (const T of tTicks) {
        const logT = Math.log10(T)
        if (logT < LOG_T_HOT - 1e-6 || logT > LOG_T_COOL + 1e-6) continue
        const x = tToX(logT)
        ctx.globalAlpha = 0.1
        ctx.beginPath()
        ctx.moveTo(x, pad.top)
        ctx.lineTo(x, pad.top + plotH)
        ctx.stroke()
        ctx.globalAlpha = 0.5
        ctx.fillText(T >= 10000 ? `${T / 1000}k` : `${T}`, x, pad.top + plotH + 13)
      }

      // Luminosity gridlines / ticks (powers of ten).
      ctx.textAlign = 'right'
      for (let e = -4; e <= 6; e += 2) {
        if (e < LOG_L_MIN || e > LOG_L_MAX) continue
        const y = lToY(e)
        ctx.globalAlpha = 0.1
        ctx.beginPath()
        ctx.moveTo(pad.left, y)
        ctx.lineTo(pad.left + plotW, y)
        ctx.stroke()
        ctx.globalAlpha = 0.5
        ctx.fillText(`10${supExp(e)}`, pad.left - 6, y + 3)
      }

      // Axis titles.
      ctx.globalAlpha = 0.6
      ctx.textAlign = 'center'
      ctx.font = '10px monospace'
      ctx.fillText('Temperature (K) — hotter →← cooler', pad.left + plotW / 2, pad.top + plotH + 28)

      ctx.save()
      ctx.translate(13, pad.top + plotH / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText('Luminosity (L⊙)', 0, 0)
      ctx.restore()

      ctx.restore()
    }

    function drawPopulation() {
      ctx.save()
      for (const s of population) {
        if (s.logL < LOG_L_MIN || s.logL > LOG_L_MAX) continue
        const x = tToX(s.logT)
        const y = lToY(s.logL)
        ctx.globalAlpha = 0.5
        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(x, y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()

      // Region labels.
      ctx.save()
      ctx.font = 'italic 10px monospace'
      ctx.fillStyle = theme.fg
      ctx.globalAlpha = 0.4
      ctx.textAlign = 'center'
      ctx.fillText('main sequence', tToX(Math.log10(7000)), lToY(0.6) - 6)
      ctx.fillText('giants', tToX(Math.log10(4000)), lToY(2.6))
      ctx.fillText('white dwarfs', tToX(Math.log10(16000)), lToY(-3.2))
      ctx.restore()
    }

    return {
      step(t, p) {
        const mass = p.initialMass as number
        const metallicity = p.metallicity as number
        const animate = p.animateTrack as boolean

        const hash = `${mass}|${metallicity}`
        if (hash !== lastHash) {
          rebuild(mass, metallicity)
          lastHash = hash
          lastT = t
        }

        // Advance the animation.
        const dt = lastT < 0 ? 0 : Math.min(0.05, (t - lastT) / 1000)
        lastT = t
        if (animate) {
          progress = Math.min(1, progress + dt * 0.18) // ~5.5 s for a full track
        } else {
          progress = 1
        }

        // Background.
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        drawAxes()
        drawPopulation()

        // --- Evolutionary track --------------------------------------------
        const drawnFrac = animate ? progress : 1

        // Faint full track for context.
        ctx.save()
        ctx.strokeStyle = '#ffb347'
        ctx.globalAlpha = 0.25
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        for (let i = 0; i < track.length; i++) {
          const x = tToX(track[i].logT)
          const y = lToY(track[i].logL)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()

        // Solid, glowing track up to current progress.
        ctx.save()
        ctx.strokeStyle = '#ffb347'
        ctx.globalAlpha = 0.95
        ctx.lineWidth = 2.2
        ctx.lineJoin = 'round'
        ctx.shadowColor = '#ffb347'
        ctx.shadowBlur = 6
        ctx.beginPath()
        const drawnSeg = drawnFrac * (track.length - 1)
        // Draw every vertex up to the current segment, then the interpolated tip.
        for (let i = 0; i <= Math.floor(drawnSeg) && i < track.length; i++) {
          const x = tToX(track[i].logT)
          const y = lToY(track[i].logL)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        const tip = sampleTrack(track, drawnFrac)
        ctx.lineTo(tToX(tip.logT), lToY(tip.logL))
        ctx.stroke()
        ctx.restore()

        // The star's current position.
        const here = sampleTrack(track, drawnFrac)
        const sx = tToX(here.logT)
        const sy = lToY(here.logL)
        const remnant = remnantType(mass)
        const isRemnant = drawnFrac > 0.78

        ctx.save()
        const dotColor = isRemnant
          ? (remnant === 'white dwarf' ? '#bcd2ff' : remnant === 'neutron star' ? '#e8f0ff' : '#7c5cff')
          : tempColor(here.logT)
        ctx.fillStyle = dotColor
        ctx.shadowColor = dotColor
        ctx.shadowBlur = 14
        ctx.beginPath()
        ctx.arc(sx, sy, isRemnant ? 3.2 : 5, 0, Math.PI * 2)
        ctx.fill()
        // Black hole: draw an event-horizon ring instead of a bright dot.
        if (isRemnant && remnant === 'black hole') {
          ctx.shadowBlur = 0
          ctx.fillStyle = theme.bg
          ctx.beginPath()
          ctx.arc(sx, sy, 4.2, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#7c5cff'
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.arc(sx, sy, 4.2, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.restore()

        // --- Readout -------------------------------------------------------
        const here2 = sampleTrack(track, drawnFrac)
        const curT = Math.round(Math.pow(10, here2.logT))
        const curL = Math.pow(10, here2.logL)
        const tMs = msLifetimeGyr(mass)

        ctx.save()
        ctx.font = '10px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.85
        ctx.textAlign = 'left'
        const phase = drawnFrac < 0.12 ? 'main sequence (ZAMS)'
          : drawnFrac < 0.45 ? 'main sequence'
          : drawnFrac < 0.78 ? 'red giant'
          : remnant
        ctx.fillText(`M = ${mass.toFixed(1)} M⊙   Z = ${metallicity.toFixed(2)} Z⊙`, pad.left + 6, pad.top + 14)
        ctx.globalAlpha = 0.6
        ctx.fillText(`phase: ${phase}`, pad.left + 6, pad.top + 28)
        ctx.fillText(`Teff ≈ ${formatT(curT)}   L ≈ ${formatL(curL)} L⊙`, pad.left + 6, pad.top + 42)

        // Bottom-right summary.
        ctx.textAlign = 'right'
        ctx.globalAlpha = 0.55
        ctx.fillText(`t(MS) ≈ ${formatGyr(tMs)}   →  ${remnant}`, pad.left + plotW - 4, pad.top + plotH - 6)
        ctx.restore()
      },
    }
  },
}

// --- Small formatting helpers --------------------------------------------
function supExp(e: number): string {
  const map: Record<string, string> = {
    '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  }
  return String(e).split('').map((c) => map[c] ?? c).join('')
}

function formatT(t: number): string {
  if (t >= 10000) return `${(t / 1000).toFixed(0)} kK`
  return `${t} K`
}

function formatL(l: number): string {
  if (l >= 1000) return l.toExponential(1)
  if (l >= 1) return l.toFixed(l < 10 ? 1 : 0)
  if (l >= 0.001) return l.toFixed(3)
  return l.toExponential(1)
}

function formatGyr(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(1)} Tyr`
  if (g >= 1) return `${g.toFixed(1)} Gyr`
  if (g >= 0.001) return `${(g * 1000).toFixed(0)} Myr`
  return `${(g * 1e6).toFixed(0)} kyr`
}
