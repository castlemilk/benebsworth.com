import type { EffectModule, Params, ControlSpec } from '@/lib/lab/types'

/**
 * Galaxy Rotation Curve
 *
 * A face-on disc galaxy with stars on circular orbits, drawn beside the
 * orbital speed v(r) plotted against radius — the "rotation curve".
 *
 * For a circular orbit the centripetal condition gives
 *
 *   v(r)² = G · M(<r) / r
 *
 * where M(<r) is the mass enclosed within radius r.
 *
 * VISIBLE DISC (exponential surface density Σ ∝ exp(−r/R_d)). Treated with the
 * spherically-enclosed exponential mass profile
 *
 *   M_disc(<r) = M_disc · [ 1 − (1 + r/R_d) · exp(−r/R_d) ]
 *
 * which saturates once r ≫ R_d, so M(<r) → const and v ∝ r^(−1/2): a
 * Keplerian decline, exactly what Newton + visible light predicts.
 *
 * DARK-MATTER HALO (pseudo-isothermal sphere ρ ∝ 1/(1+(r/r_s)²)) with
 *
 *   M_halo(<r) = 4π ρ₀ r_s³ · [ (r/r_s) − arctan(r/r_s) ]
 *
 * which grows ∝ r at large radius, so its v² → const: the curve FLATTENS,
 * reproducing the observed flat rotation curves (Rubin & Ford, 1970s).
 *
 * Total speed adds in quadrature: v² = v_disc² + v_halo².
 *
 * Units are scaled to "galactic" values (kpc, km/s) for legible labels; the
 * absolute normalisation is illustrative, not a fit to a specific galaxy.
 */

export const controls: ControlSpec[] = [
  { key: 'diskMass', label: 'Disc mass', type: 'range', min: 0.3, max: 2, step: 0.05 },
  { key: 'haloMass', label: 'Halo mass', type: 'range', min: 0, max: 3, step: 0.05 },
  { key: 'haloScale', label: 'Halo scale r_s (kpc)', type: 'range', min: 2, max: 20, step: 0.5 },
  { key: 'showHalo', label: 'Dark-matter halo', type: 'toggle' },
]

export const defaults: Params = {
  diskMass: 1,
  haloMass: 1.4,
  haloScale: 8,
  showHalo: true,
}

// --- Physics constants (scaled units) ------------------------------------
// Disc scale length R_d in kpc. The visible disc fades by ~5 R_d.
const R_D = 4
const R_MAX = 30 // kpc — outer edge of the plotted/orbit domain
// Normalisation so the default disc peaks near ~180 km/s and the default halo
// adds ~150 km/s in the outer disc — recognisable spiral-galaxy values.
const DISC_NORM = 434000 // (km/s)² scale for M_disc = 1
const HALO_NORM = 24700 // (km/s)² scale per unit haloMass at large r

// Spherically-enclosed fraction of an exponential disc.
function discMassFraction(r: number): number {
  const x = r / R_D
  return 1 - (1 + x) * Math.exp(-x)
}

// v_disc²(r) in (km/s)², ∝ M_disc(<r)/r.
function vDiscSq(r: number, diskMass: number): number {
  if (r <= 1e-4) return 0
  return DISC_NORM * diskMass * discMassFraction(r) / r
}

// Pseudo-isothermal halo enclosed-mass shape: (x − atan x), x = r/r_s.
// v_halo²(r) = HALO_NORM · haloMass · (x − atan x) / x  (→ const as x→∞).
function vHaloSq(r: number, haloMass: number, rs: number): number {
  if (r <= 1e-4 || haloMass <= 0) return 0
  const x = r / rs
  return HALO_NORM * haloMass * (x - Math.atan(x)) / x
}

// Total circular speed (km/s).
function vTotal(r: number, diskMass: number, haloMass: number, rs: number, halo: boolean): number {
  const vsq = vDiscSq(r, diskMass) + (halo ? vHaloSq(r, haloMass, rs) : 0)
  return Math.sqrt(Math.max(0, vsq))
}

export const rotationCurve: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const fg = theme.fg
    const bg = theme.bg

    // Accent palette (theme-independent, legible on both stages).
    const DISC_COL = '#00e0b8' // teal  — visible/baryonic prediction
    const HALO_COL = '#7c5cff' // violet — dark matter
    const TOTAL_COL = '#ff7a59' // orange — total observed
    const STAR_COL = '#ffd27a' // warm stars

    // --- Layout: galaxy panel (left) | plot panel (right) -----------------
    const split = Math.round(w * 0.46)
    const galaxy = { x: 0, y: 0, w: split, h }
    const plot = { x: split, y: 0, w: w - split, h }

    // Plot drawing rect (inside its panel).
    const pm = { left: 50, right: 16, top: 30, bottom: 38 }
    const px = plot.x + pm.left
    const py = plot.y + pm.top
    const pw = Math.max(10, plot.w - pm.left - pm.right)
    const ph = Math.max(10, plot.h - pm.top - pm.bottom)

    // Galaxy centre + radius->pixel scale.
    const gcx = galaxy.x + galaxy.w / 2
    const gcy = galaxy.y + galaxy.h / 2
    const gRadiusPx = Math.min(galaxy.w, galaxy.h) * 0.42
    // Map orbital radius (kpc) to galaxy pixels. Disc is visible to ~5 R_d.
    const GAL_R_MAX = 5 * R_D // kpc shown in the galaxy panel
    const kpcToGalPx = gRadiusPx / GAL_R_MAX

    // Plot axis ranges. Headroom so even maxed controls (~340 km/s) stay
    // on-axis rather than flat-topping against the ceiling.
    const V_MAX = 360 // km/s — y-axis top
    const rToPlotX = (r: number) => px + clamp(r / R_MAX, 0, 1) * pw
    const vToPlotY = (v: number) => py + ph - clamp(v / V_MAX, 0, 1) * ph

    // --- Stars on circular orbits -----------------------------------------
    // Each star: a radius (kpc) and a current angle. Distributed by an
    // exponential-disc-like density so the centre is brightest.
    type Star = { r: number; theta: number; size: number; bright: number }
    const STAR_N = 220
    let stars: Star[] = []
    let lastHash = ''
    let t0 = 0

    function seedStars() {
      stars = []
      // Simple deterministic PRNG so re-seeds are stable per-instance.
      let s = 1234567
      const rnd = () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff
        return s / 0x7fffffff
      }
      for (let i = 0; i < STAR_N; i++) {
        // Sample radius from exponential disc via inverse-ish transform; keep
        // a few in the outer disc for the flat/declining contrast.
        const u = rnd()
        let r = -R_D * Math.log(1 - u * 0.985) // exponential draw
        r = clamp(r, 0.4, GAL_R_MAX)
        stars.push({
          r,
          theta: rnd() * Math.PI * 2,
          size: 0.7 + rnd() * 1.3,
          bright: 0.5 + rnd() * 0.5,
        })
      }
    }

    function paramHash(p: Params): string {
      return [
        round2(p.diskMass as number),
        round2(p.haloMass as number),
        round2(p.haloScale as number),
        p.showHalo ? 1 : 0,
      ].join('|')
    }

    seedStars()

    return {
      step(timeMs, p) {
        const diskMass = (p.diskMass ?? defaults.diskMass) as number
        const haloMass = (p.haloMass ?? defaults.haloMass) as number
        const rs = (p.haloScale ?? defaults.haloScale) as number
        const showHalo = (p.showHalo ?? defaults.showHalo) as boolean

        const hash = paramHash(p)
        if (hash !== lastHash) {
          // Reset internal state when params change.
          seedStars()
          t0 = timeMs
          lastHash = hash
        }
        const elapsed = (timeMs - t0) / 1000 // seconds

        // --- Clear --------------------------------------------------------
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, w, h)

        // ============================ GALAXY ==============================
        drawGalaxy(elapsed)

        // Divider between panels.
        ctx.save()
        ctx.strokeStyle = fg
        ctx.globalAlpha = 0.12
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(split + 0.5, 8)
        ctx.lineTo(split + 0.5, h - 8)
        ctx.stroke()
        ctx.restore()

        // ============================= PLOT ===============================
        drawPlot(diskMass, haloMass, rs, showHalo)

        // --- Inner closures (capture params) ------------------------------
        function drawGalaxy(tSec: number) {
          // Soft central bulge glow.
          const grad = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, gRadiusPx)
          grad.addColorStop(0, withAlpha(STAR_COL, 0.30))
          grad.addColorStop(0.25, withAlpha(STAR_COL, 0.10))
          grad.addColorStop(1, withAlpha(STAR_COL, 0))
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(gcx, gcy, gRadiusPx, 0, Math.PI * 2)
          ctx.fill()

          // Faint orbit guide rings at a few radii (kpc).
          ctx.save()
          ctx.strokeStyle = fg
          ctx.globalAlpha = 0.08
          ctx.lineWidth = 1
          for (const rk of [5, 10, 15]) {
            const rp = rk * kpcToGalPx
            if (rp > gRadiusPx) continue
            ctx.beginPath()
            ctx.arc(gcx, gcy, rp, 0, Math.PI * 2)
            ctx.stroke()
          }
          ctx.restore()

          // Stars: advance each by its orbital angular speed Ω = v/r.
          // Angular speed in rad/s scaled for a watchable animation.
          for (const st of stars) {
            const v = vTotal(st.r, diskMass, haloMass, rs, showHalo)
            // Ω ∝ v / r ; scale so inner stars sweep visibly.
            const omega = (v / Math.max(st.r, 0.5)) * 0.012
            const ang = st.theta + omega * tSec
            const rp = clamp(st.r * kpcToGalPx, 0, gRadiusPx)
            const sx = gcx + Math.cos(ang) * rp
            const sy = gcy + Math.sin(ang) * rp
            // Fade outer stars (disc light dies off exponentially).
            const fade = Math.exp(-st.r / (1.6 * R_D))
            ctx.fillStyle = withAlpha(STAR_COL, clamp(st.bright * (0.35 + 0.65 * fade), 0, 1))
            ctx.beginPath()
            ctx.arc(sx, sy, st.size, 0, Math.PI * 2)
            ctx.fill()
          }

          // Dark-matter halo overlay: a soft violet sphere extending well
          // beyond the visible disc, when enabled.
          if (showHalo && haloMass > 0) {
            const haloPx = clamp(rs * 2.4 * kpcToGalPx, gRadiusPx * 0.7, Math.min(galaxy.w, galaxy.h) * 0.5)
            const hg = ctx.createRadialGradient(gcx, gcy, gRadiusPx * 0.5, gcx, gcy, haloPx)
            hg.addColorStop(0, withAlpha(HALO_COL, 0))
            hg.addColorStop(0.7, withAlpha(HALO_COL, 0.06 + 0.04 * Math.min(haloMass, 2)))
            hg.addColorStop(1, withAlpha(HALO_COL, 0))
            ctx.fillStyle = hg
            ctx.beginPath()
            ctx.arc(gcx, gcy, haloPx, 0, Math.PI * 2)
            ctx.fill()

            ctx.save()
            ctx.strokeStyle = HALO_COL
            ctx.globalAlpha = 0.22
            ctx.lineWidth = 1
            ctx.setLineDash([3, 4])
            ctx.beginPath()
            ctx.arc(gcx, gcy, haloPx, 0, Math.PI * 2)
            ctx.stroke()
            ctx.setLineDash([])
            ctx.restore()
          }

          // Panel title.
          ctx.save()
          ctx.fillStyle = fg
          ctx.globalAlpha = 0.5
          ctx.font = '11px monospace'
          ctx.textAlign = 'left'
          ctx.fillText('Face-on disc galaxy', galaxy.x + 12, galaxy.y + 20)
          if (showHalo && haloMass > 0) {
            ctx.fillStyle = HALO_COL
            ctx.globalAlpha = 0.65
            ctx.fillText('+ dark-matter halo', galaxy.x + 12, galaxy.y + 36)
          }
          ctx.restore()
        }

        function drawPlot(dm: number, hm: number, rsKpc: number, halo: boolean) {
          // Frame.
          ctx.save()
          ctx.strokeStyle = fg
          ctx.globalAlpha = 0.25
          ctx.lineWidth = 1
          ctx.strokeRect(px, py, pw, ph)
          ctx.restore()

          // Grid + y ticks (km/s).
          ctx.save()
          ctx.font = '9px monospace'
          ctx.textAlign = 'right'
          ctx.textBaseline = 'middle'
          for (let v = 0; v <= V_MAX; v += 80) {
            const yy = vToPlotY(v)
            ctx.strokeStyle = fg
            ctx.globalAlpha = 0.08
            ctx.beginPath()
            ctx.moveTo(px, yy)
            ctx.lineTo(px + pw, yy)
            ctx.stroke()
            ctx.fillStyle = fg
            ctx.globalAlpha = 0.5
            ctx.fillText(`${v}`, px - 6, yy)
          }
          ctx.restore()

          // x ticks (kpc).
          ctx.save()
          ctx.font = '9px monospace'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = fg
          ctx.globalAlpha = 0.5
          for (let r = 0; r <= R_MAX; r += 10) {
            const xx = rToPlotX(r)
            ctx.fillText(`${r}`, xx, py + ph + 6)
          }
          ctx.restore()

          // Axis labels.
          ctx.save()
          ctx.fillStyle = fg
          ctx.globalAlpha = 0.55
          ctx.font = '10px monospace'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'alphabetic'
          ctx.fillText('radius r  (kpc)', px + pw / 2, plot.y + plot.h - 6)
          ctx.translate(plot.x + 12, py + ph / 2)
          ctx.rotate(-Math.PI / 2)
          ctx.fillText('orbital speed v  (km/s)', 0, 0)
          ctx.restore()

          // Plot title.
          ctx.save()
          ctx.fillStyle = fg
          ctx.globalAlpha = 0.5
          ctx.font = '11px monospace'
          ctx.textAlign = 'right'
          ctx.fillText('Rotation curve  v(r)', plot.x + plot.w - 14, plot.y + 20)
          ctx.restore()

          const SAMPLES = 160
          // Disc-only curve (the Keplerian-declining prediction).
          drawCurve(SAMPLES, (r) => Math.sqrt(vDiscSq(r, dm)), DISC_COL, 1.5, halo ? 0.55 : 0.9, halo ? [4, 4] : [])

          // Halo-only contribution (dashed) when enabled.
          if (halo && hm > 0) {
            drawCurve(SAMPLES, (r) => Math.sqrt(vHaloSq(r, hm, rsKpc)), HALO_COL, 1.3, 0.6, [2, 4])
          }

          // Total observed curve (solid, bright).
          drawCurve(SAMPLES, (r) => vTotal(r, dm, hm, rsKpc, halo), TOTAL_COL, 2, 0.95, [])

          // Legend.
          drawLegend(halo && hm > 0)

          // Live readout: flat-part speed (sampled near the outer disc).
          const vOuter = vTotal(R_MAX * 0.85, dm, hm, rsKpc, halo)
          ctx.save()
          ctx.font = '10px monospace'
          ctx.textAlign = 'left'
          ctx.fillStyle = TOTAL_COL
          ctx.globalAlpha = 0.85
          ctx.fillText(`v(${Math.round(R_MAX * 0.85)} kpc) ≈ ${Math.round(vOuter)} km/s`, px + 8, py + ph - 10)
          ctx.restore()
        }

        function drawCurve(
          n: number,
          fn: (r: number) => number,
          color: string,
          lw: number,
          alpha: number,
          dash: number[],
        ) {
          ctx.save()
          ctx.strokeStyle = color
          ctx.globalAlpha = alpha
          ctx.lineWidth = lw
          ctx.lineJoin = 'round'
          if (dash.length) ctx.setLineDash(dash)
          // Clip to the plot rect so overshoot never bleeds.
          ctx.beginPath()
          ctx.rect(px, py, pw, ph)
          ctx.clip()
          ctx.beginPath()
          for (let i = 0; i <= n; i++) {
            const r = (i / n) * R_MAX
            const v = fn(r)
            const X = rToPlotX(r)
            const Y = vToPlotY(v)
            if (i === 0) ctx.moveTo(X, Y)
            else ctx.lineTo(X, Y)
          }
          ctx.stroke()
          if (dash.length) ctx.setLineDash([])
          ctx.restore()
        }

        function drawLegend(showHaloRow: boolean) {
          const rows: Array<[string, string, boolean]> = [
            [TOTAL_COL, 'observed (total)', false],
            [DISC_COL, 'visible disc only', true],
          ]
          if (showHaloRow) rows.push([HALO_COL, 'dark-matter halo', true])
          ctx.save()
          ctx.font = '9px monospace'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'middle'
          let ly = py + 14
          for (const [col, label, dashed] of rows) {
            ctx.strokeStyle = col
            ctx.globalAlpha = 0.9
            ctx.lineWidth = 2
            if (dashed) ctx.setLineDash([4, 3])
            ctx.beginPath()
            ctx.moveTo(px + pw - 132, ly)
            ctx.lineTo(px + pw - 112, ly)
            ctx.stroke()
            ctx.setLineDash([])
            ctx.fillStyle = fg
            ctx.globalAlpha = 0.7
            ctx.fillText(label, px + pw - 106, ly)
            ly += 13
          }
          ctx.restore()
        }
      },
    }
  },
}

// --- helpers ---------------------------------------------------------------
function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x
}

function round2(x: number): number {
  return Math.round(x * 100) / 100
}

// Apply alpha to a hex colour (#rrggbb) → rgba().
function withAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
