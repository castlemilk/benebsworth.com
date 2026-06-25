import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Fine-Tuning Dials
 *
 * Four cosmic "dials" — the fine-structure constant α, the strength of
 * gravity, the cosmological constant Λ, and the number of large spatial
 * dimensions n — feed a small panel of *anthropic preconditions* for a
 * universe that can grow complex structure (Barrow & Tipler; Rees,
 * "Just Six Numbers"). Each precondition is a closed-form viability test;
 * the visualisation reports, for the current dial settings, whether it
 * SURVIVES or FAILS — and most nudges give a dead universe.
 *
 * The tests (deliberately legible, order-of-magnitude, NOT a real
 * cosmology code):
 *
 *  • Stable atoms / chemistry — needs α near its observed value. Too
 *    large and the inner-shell binding nears the electron rest mass
 *    (α Z ~ 1, pair instability); too small and chemical bonds are too
 *    feeble to hold molecules together. Window ≈ 1/170 … 1/100.
 *
 *  • Stars that fuse — a star ignites only if gravity can squeeze its
 *    core hot enough against the electromagnetic (Coulomb) barrier, set
 *    by α. The minimum mass to fuse scales like (α / α_G)^(3/2); the
 *    habitable band needs the resulting main-sequence lifetime to span
 *    a few billion years AND the carbon-making triple-alpha resonance to
 *    sit where α and the strong force place it (the "diproton" / Hoyle
 *    knife-edge). We approximate viability by gravity within a band
 *    around its observed value, modulated by α.
 *
 *  • Cosmos neither recollapses nor disperses — Λ must be small. Large
 *    positive Λ blows matter apart before gravity can pull galaxies
 *    together (no structure); large negative Λ recollapses the universe
 *    in a Big Crunch before stars form. Weinberg's anthropic bound.
 *
 *  • Stable orbits & bound atoms — only with exactly THREE large spatial
 *    dimensions. Ehrenfest's argument: a 1/r^(n-1) force gives stable
 *    bound orbits and a stable hydrogen atom only for n = 3. n < 3 has
 *    no bound orbits at all; n > 3 makes every orbit spiral in or fly
 *    away.
 *
 * α, gravity and Λ are shown as MULTIPLES of their observed value, so
 * "×1" is our universe. The dead-zone shading makes the knife-edge
 * obvious: nearly the whole dial range is lethal.
 */

export const controls: ControlSpec[] = [
  // α as 1/α (so the slider reads "137" at our value, which is intuitive).
  { key: 'alpha', label: 'Fine structure 1/α', type: 'range', min: 40, max: 260, step: 1 },
  // Gravity as log10 of its multiple of observed strength (−6 … +6 decades).
  { key: 'gravity', label: 'Gravity (log₁₀×)', type: 'range', min: -6, max: 6, step: 0.1 },
  // Cosmological constant Λ as a multiple of the observed value.
  { key: 'lambda', label: 'Λ (×observed)', type: 'range', min: -120, max: 120, step: 1 },
  // Number of large spatial dimensions.
  { key: 'nDims', label: 'Large space dims n', type: 'range', min: 1, max: 6, step: 1 },
]

export const defaults: Params = {
  alpha: 137, // 1/α observed ≈ 137.036
  gravity: 0, // log10 multiple → ×1 (our universe)
  lambda: 1, // ×1 observed
  nDims: 3, // three large spatial dimensions
}

// ── Observed reference values ────────────────────────────────────────
const INV_ALPHA_OBS = 137.036

// ── Viability tests ──────────────────────────────────────────────────
// Each returns { ok, score 0..1, detail } where score is a smooth
// "how comfortably inside the window" measure used to colour bars.

type Verdict = { ok: boolean; score: number; detail: string }

// A smooth bump that is 1 inside [lo,hi] and falls off over `soft`.
function band(x: number, lo: number, hi: number, soft: number): number {
  if (x >= lo && x <= hi) return 1
  const d = x < lo ? lo - x : x - hi
  return Math.max(0, 1 - d / soft)
}

function testAtoms(invAlpha: number, nDims: number): Verdict {
  // α = 1/invAlpha. Stable chemistry window ≈ 1/170 … 1/100, i.e.
  // 1/α between ~100 and ~170. Dimensions other than 3 also break atoms
  // (no stable bound states), so atoms additionally require n === 3.
  const dimsOk = nDims === 3
  const score = band(invAlpha, 100, 170, 25) * (dimsOk ? 1 : 0)
  const ok = score > 0.5
  let detail: string
  if (!dimsOk) detail = 'no stable bound states off n=3'
  else if (invAlpha < 100) detail = 'α too large — inner shells go relativistic (αZ→1)'
  else if (invAlpha > 170) detail = 'α too small — bonds too weak to hold molecules'
  else detail = 'electron shells stable, rich chemistry'
  return { ok, score, detail }
}

function testStars(logG: number, invAlpha: number, nDims: number): Verdict {
  // Stars ignite & live billions of years only for gravity within a
  // band of its observed value, and need α near observed for the
  // Coulomb barrier / triple-alpha to line up. logG is log10(G/G_obs).
  const dimsOk = nDims === 3
  const gScore = band(logG, -1, 1, 0.8) // within ~×10 of observed
  const aScore = band(invAlpha, 110, 165, 20)
  const score = gScore * aScore * (dimsOk ? 1 : 0)
  const ok = score > 0.5
  let detail: string
  if (!dimsOk) detail = 'no stable stellar orbits off n=3'
  else if (logG < -1) detail = 'gravity too weak — cores never ignite'
  else if (logG > 1) detail = 'gravity too strong — stars burn out in megayears'
  else if (aScore < 0.5) detail = 'α off — Coulomb barrier / triple-alpha mistuned'
  else detail = 'long-lived hydrogen burning, makes carbon'
  return { ok, score, detail }
}

function testCosmos(lambda: number): Verdict {
  // Λ as a multiple of observed. Weinberg bound: structure forms only
  // for |Λ| up to ~a few × observed positive (and not strongly
  // negative, which recollapses). Window ≈ −1 … +3.
  const score = band(lambda, -1, 3, 2.5)
  const ok = score > 0.5
  let detail: string
  if (lambda > 3) detail = 'Λ too large — space disperses before galaxies form'
  else if (lambda < -1) detail = 'Λ negative — recollapse (Big Crunch) before stars'
  else detail = 'expands gently, galaxies condense'
  return { ok, score, detail }
}

function testDimensions(nDims: number): Verdict {
  // Ehrenfest: stable orbits & atoms only for n = 3.
  const ok = nDims === 3
  const score = ok ? 1 : 0
  let detail: string
  if (nDims < 3) detail = `n=${nDims}: force can't bind orbits or atoms`
  else if (nDims > 3) detail = `n=${nDims}: orbits spiral in or fly apart`
  else detail = 'n=3: stable orbits and bound atoms'
  return { ok, score, detail }
}

export const fineTuning: EffectModule = {
  controls,
  defaults,

  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h, dpr } = dims
    const bg = theme.bg
    const fg = theme.fg
    const GOOD = '#3ddc97' // green — survives
    const BAD = '#ff5e62' // red — dead
    const WARN = '#ffb454' // amber — marginal
    const GRID = withAlpha(fg, 0.12)

    // A starfield whose density encodes "how alive" the universe is, so a
    // dead universe literally looks emptier. Seeded so it's stable.
    const STAR_N = 220
    const stars: { x: number; y: number; r: number; tw: number }[] = []
    let seed = 1234567
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    for (let i = 0; i < STAR_N; i++) {
      stars.push({ x: rnd(), y: rnd(), r: 0.4 + rnd() * 1.3, tw: rnd() * Math.PI * 2 })
    }

    // Hash params to reset nothing heavy (this effect is stateless per
    // frame), but we keep the contract: detect change to recompute the
    // verdict cache exactly once per settings tweak.
    let lastHash = ''
    let cache: {
      atoms: Verdict
      stars: Verdict
      cosmos: Verdict
      dimsV: Verdict
      alive: number
    } | null = null

    function clampPx(px: number, lo: number, hi: number) {
      return px < lo ? lo : px > hi ? hi : px
    }

    return {
      step(timeMs, params) {
        const invAlpha = params.alpha as number
        const logG = params.gravity as number
        const lambda = params.lambda as number
        const nDims = Math.round(params.nDims as number)

        const hash = `${invAlpha}_${logG}_${lambda}_${nDims}`
        if (hash !== lastHash) {
          const atoms = testAtoms(invAlpha, nDims)
          const starsV = testStars(logG, invAlpha, nDims)
          const cosmos = testCosmos(lambda)
          const dimsV = testDimensions(nDims)
          // "alive" = all four preconditions clear. Structure score is
          // the product so a single failure kills it (knife-edge).
          const alive = atoms.score * starsV.score * cosmos.score * dimsV.score
          cache = { atoms, stars: starsV, cosmos, dimsV, alive }
          lastHash = hash
        }
        const c = cache!

        // ── Background ────────────────────────────────────────────────
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, w, h)

        // Layout: title, then a left "universe" picture and a right
        // habitability panel.
        const pad = Math.max(12, w * 0.025)
        const titleY = pad + 14
        ctx.fillStyle = fg
        ctx.textAlign = 'left'
        ctx.font = `bold ${Math.round(13 * Math.min(1.4, w / 520))}px monospace`
        ctx.fillText('Fine-Tuning Dials — does this universe permit complex structure?', pad, titleY)

        const topY = titleY + 18
        // Split: universe view on the left ~46%, panel on the right.
        const gap = pad
        const isNarrow = w < 460
        const universeW = isNarrow ? w - pad * 2 : Math.round((w - pad * 2 - gap) * 0.46)
        const universeH = isNarrow ? Math.round((h - topY - pad) * 0.42) : h - topY - pad
        const uX = pad
        const uY = topY
        const panelX = isNarrow ? pad : uX + universeW + gap
        const panelY = isNarrow ? uY + universeH + 10 : topY
        const panelW = isNarrow ? w - pad * 2 : w - panelX - pad
        const panelH = isNarrow ? h - panelY - pad : h - topY - pad

        drawUniverse(ctx, uX, uY, universeW, universeH, c.alive, c.cosmos, stars, timeMs, {
          bg,
          fg,
          good: GOOD,
          bad: BAD,
          grid: GRID,
        })

        // ── Habitability panel ───────────────────────────────────────
        ctx.save()
        ctx.beginPath()
        roundRect(ctx, panelX, panelY, panelW, panelH, 6)
        ctx.fillStyle = withAlpha(fg, 0.04)
        ctx.fill()
        ctx.strokeStyle = GRID
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.restore()

        const innerX = panelX + 14
        let rowY = panelY + 24
        ctx.textAlign = 'left'
        ctx.font = `bold ${Math.round(11 * Math.min(1.3, w / 520))}px monospace`
        ctx.fillStyle = withAlpha(fg, 0.85)
        ctx.fillText('Preconditions for complexity', innerX, rowY)
        rowY += 18

        const rows: { name: string; v: Verdict }[] = [
          { name: 'Stable atoms & chemistry', v: c.atoms },
          { name: 'Stars that fuse', v: c.stars },
          { name: 'No recollapse / dispersal', v: c.cosmos },
          { name: 'Stable orbits (n=3)', v: c.dimsV },
        ]
        const rowH = Math.min(
          46,
          Math.max(34, (panelH - (rowY - panelY) - 56) / rows.length),
        )
        const barW = Math.min(panelW - 28, 220)

        for (const r of rows) {
          const col = r.v.ok ? GOOD : r.v.score > 0.15 ? WARN : BAD
          // status dot
          ctx.beginPath()
          ctx.arc(innerX + 5, rowY - 3, 5, 0, Math.PI * 2)
          ctx.fillStyle = col
          ctx.fill()
          // name
          ctx.fillStyle = withAlpha(fg, 0.9)
          ctx.font = `${Math.round(11 * Math.min(1.25, w / 520))}px monospace`
          ctx.fillText(r.name, innerX + 16, rowY)
          // verdict tag
          ctx.textAlign = 'right'
          ctx.fillStyle = col
          ctx.font = `bold ${Math.round(10 * Math.min(1.25, w / 520))}px monospace`
          ctx.fillText(r.v.ok ? 'SURVIVES' : 'FAILS', innerX + barW, rowY)
          ctx.textAlign = 'left'
          // score bar
          const barY = rowY + 6
          const bw = barW
          ctx.fillStyle = withAlpha(fg, 0.1)
          roundRect(ctx, innerX + 16, barY, bw - 16, 5, 2.5)
          ctx.fill()
          ctx.fillStyle = col
          const fillW = clampPx((bw - 16) * r.v.score, 0, bw - 16)
          roundRect(ctx, innerX + 16, barY, Math.max(2, fillW), 5, 2.5)
          ctx.fill()
          // detail
          ctx.fillStyle = withAlpha(fg, 0.5)
          ctx.font = `${Math.round(9.5 * Math.min(1.2, w / 520))}px monospace`
          ctx.fillText(truncate(r.v.detail, Math.floor((bw) / 6)), innerX + 16, barY + 16)
          rowY += rowH
        }

        // Overall verdict: the universe permits complexity only when ALL
        // four preconditions clear comfortably. The product is a knife-edge
        // — one marginal precondition tips it below threshold.
        const aliveOk = c.alive > 0.5
        const vColor = aliveOk ? GOOD : BAD
        const verdictY = panelY + panelH - 16
        ctx.font = `bold ${Math.round(13 * Math.min(1.3, w / 520))}px monospace`
        ctx.fillStyle = vColor
        ctx.textAlign = 'left'
        ctx.fillText(
          aliveOk ? '◆ UNIVERSE: complex structure possible' : '✕ UNIVERSE: dead',
          innerX,
          verdictY,
        )

        // ── Dial readout (bottom strip on the universe side) ─────────
        ctx.font = `${Math.round(10 * Math.min(1.2, w / 520))}px monospace`
        ctx.fillStyle = withAlpha(fg, 0.55)
        ctx.textAlign = 'left'
        const gMult = Math.pow(10, logG)
        const aDev = (INV_ALPHA_OBS - invAlpha) / INV_ALPHA_OBS
        const lines = [
          `1/α = ${invAlpha.toFixed(0)}  (obs 137, ${aDev >= 0 ? '−' : '+'}${Math.abs(aDev * 100).toFixed(0)}%)`,
          `gravity = ${formatMult(gMult)}×   Λ = ${lambda}×   n = ${nDims}`,
        ]
        if (!isNarrow) {
          for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], uX + 4, uY + universeH - 22 + i * 12)
          }
        } else {
          ctx.fillText(lines[0] + '   ' + lines[1], uX + 4, h - pad + 2)
        }

        // dpr is already applied to the context transform by the host;
        // we reference it so the contract (respect dims.dpr) is explicit
        // and to scale hairlines crisply on retina.
        void dpr
      },
    }
  },
}

// ── Universe picture: a field of galaxies/stars whose abundance and
// colour encode the "alive" score; Λ tints the expansion. ────────────
function drawUniverse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ww: number,
  hh: number,
  alive: number,
  cosmos: Verdict,
  stars: { x: number; y: number; r: number; tw: number }[],
  timeMs: number,
  col: { bg: string; fg: string; good: string; bad: string; grid: string },
) {
  ctx.save()
  // Clip to the universe rect so nothing overshoots.
  ctx.beginPath()
  roundRect(ctx, x, y, ww, hh, 6)
  ctx.clip()

  // Backdrop: subtly graded by liveliness.
  ctx.fillStyle = withAlpha(col.fg, 0.03)
  ctx.fillRect(x, y, ww, hh)

  // Star/galaxy density tracks the alive score; a dead universe is empty.
  const density = 0.06 + alive * 0.94
  const cx = x + ww / 2
  const cy = y + hh / 2
  const tSlow = timeMs / 1000

  for (let i = 0; i < stars.length; i++) {
    if (i / stars.length > density) continue
    const s = stars[i]
    const sx = x + s.x * ww
    const sy = y + s.y * hh
    // twinkle
    const tw = 0.5 + 0.5 * Math.sin(tSlow * 1.5 + s.tw)
    const a = (0.25 + 0.55 * alive) * (0.4 + 0.6 * tw)
    // colour drifts green→amber→red as the universe dies
    const hue = alive > 0.6 ? col.good : alive > 0.2 ? '#cfe8d0' : withAlpha(col.bad, 1)
    ctx.beginPath()
    ctx.arc(sx, sy, clamp(s.r * (0.7 + alive * 0.6), 0.3, 3), 0, Math.PI * 2)
    ctx.fillStyle = withAlpha(hue, a)
    ctx.fill()
  }

  // A central "galaxy" only if structure can form.
  if (alive > 0.25) {
    const R = Math.min(ww, hh) * 0.22 * (0.6 + alive * 0.4)
    const arms = 2
    ctx.lineWidth = 1.2
    for (let a = 0; a < arms; a++) {
      ctx.beginPath()
      for (let tt = 0; tt <= 1; tt += 0.02) {
        const ang = a * Math.PI + tt * Math.PI * 2.2 + tSlow * 0.1
        const rr = R * tt
        const px = clamp(cx + Math.cos(ang) * rr, x, x + ww)
        const py = clamp(cy + Math.sin(ang) * rr, y, y + hh)
        if (tt === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.strokeStyle = withAlpha(col.good, 0.35 * alive)
      ctx.stroke()
    }
    // bright core
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5)
    grd.addColorStop(0, withAlpha(col.good, 0.6 * alive))
    grd.addColorStop(1, withAlpha(col.good, 0))
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // dead universe: a faint cold message
    ctx.fillStyle = withAlpha(col.bad, 0.5)
    ctx.font = '11px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('no structure', cx, cy)
  }

  // Λ overlay: arrows hinting expansion (out) vs recollapse (in).
  if (cosmos.detail.includes('disperses')) {
    drawRadialArrows(ctx, cx, cy, Math.min(ww, hh) * 0.34, true, withAlpha(col.bad, 0.5))
  } else if (cosmos.detail.includes('recollapse')) {
    drawRadialArrows(ctx, cx, cy, Math.min(ww, hh) * 0.34, false, withAlpha(col.bad, 0.5))
  }

  ctx.restore()

  // border on top of clip
  ctx.save()
  ctx.beginPath()
  roundRect(ctx, x, y, ww, hh, 6)
  ctx.strokeStyle = col.grid
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

function drawRadialArrows(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  outward: boolean,
  color: string,
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 1.5
  const n = 8
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2
    const inner = outward ? r * 0.55 : r
    const outer = outward ? r : r * 0.55
    const x0 = cx + Math.cos(ang) * inner
    const y0 = cy + Math.sin(ang) * inner
    const x1 = cx + Math.cos(ang) * outer
    const y1 = cy + Math.sin(ang) * outer
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    // arrowhead at x1,y1
    const dir = Math.atan2(y1 - y0, x1 - x0)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x1 - Math.cos(dir - 0.4) * 5, y1 - Math.sin(dir - 0.4) * 5)
    ctx.lineTo(x1 - Math.cos(dir + 0.4) * 5, y1 - Math.sin(dir + 0.4) * 5)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

// ── Small helpers ────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v
}

function truncate(s: string, max: number) {
  if (max < 4) return ''
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

function formatMult(m: number): string {
  if (m >= 1000 || m < 0.001) return m.toExponential(0)
  if (m >= 10) return m.toFixed(0)
  if (m >= 1) return m.toFixed(2)
  return m.toFixed(3)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

// Accepts #rgb / #rrggbb / already-rgba; returns an rgba() string at alpha a.
function withAlpha(color: string, a: number): string {
  let r = 255
  let g = 255
  let b = 255
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    }
  } else if (color.startsWith('rgb')) {
    const m = color.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
    if (m) {
      r = +m[1]
      g = +m[2]
      b = +m[3]
    }
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
