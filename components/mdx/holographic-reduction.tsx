'use client'

/**
 * HolographicReduction — the holographic principle made visible, for "The
 * Universe on a Surface" / the cosmology flagship.
 *
 * The intuition you'd guess is wrong. Stuff a region of space with information
 * and you'd expect the maximum it can hold to grow with its VOLUME — more room,
 * more bits. It doesn't. The Bekenstein–Hawking bound says the most entropy a
 * region can contain is fixed by the AREA of its boundary, measured in Planck
 * areas:
 *
 *     S_max = A / (4 ℓ_P²)        (in nats; bits = S_max / ln 2)
 *
 * with the Planck length ℓ_P = √(ħG/c³) ≈ 1.616×10⁻³⁵ m, so a Planck area
 * ℓ_P² ≈ 2.61×10⁻⁷⁰ m². A black hole saturates this: its entropy is exactly a
 * quarter of its horizon area in Planck units. The whole 3-D contents of any
 * region can therefore be encoded on its 2-D boundary — the universe behaves
 * like a hologram.
 *
 * This widget draws the contrast directly. On the left, a wireframe cube of
 * side r (in Planck lengths) packed with a lattice of "bits" — its count tracks
 * the VOLUME, r³. On the right, the cube's boundary unfolded as a tiling of
 * Planck-area pixels — its count tracks the AREA, r². A radius slider sweeps r
 * and a log race-bar shows volume sprinting away from the area-set information
 * bound. The takeaway: capacity lives on the surface, not in the bulk.
 *
 * No animation loop — pure derived state from the slider, CSS-only transitions,
 * so there's nothing to pause and nothing fighting prefers-reduced-motion. The
 * in-view ref is kept only to lazily cap the rendered lattice when off-screen.
 */

import { useId, useMemo, useState } from 'react'
import { useInViewport } from './use-in-viewport'

const ACCENT = '#6366f1' // cosmic indigo — the cosmology desk accent
const ACCENT_BULK = '#a78bfa' // a lighter violet for the "bulk / volume" channel

// Planck length, ℓ_P = √(ħG/c³). Bits live on the boundary in units of 4ℓ_P².
const PLANCK_LENGTH_M = 1.616255e-35 // m (CODATA)

const SUPER: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
}
function sup(n: number): string {
  return String(n)
    .split('')
    .map((ch) => SUPER[ch] ?? ch)
    .join('')
}

/** Compact "m×10ⁿ" formatting for the big integer counts. */
function fmtBig(x: number): string {
  if (!isFinite(x)) return '∞'
  if (x < 1000) return Math.round(x).toLocaleString()
  const exp = Math.floor(Math.log10(x))
  const mantissa = x / Math.pow(10, exp)
  return `${parseFloat(mantissa.toPrecision(3))}×10${sup(exp)}`
}

// slider domain: cube side in Planck lengths. Log scale, since r³ vs r² only
// gets interesting across orders of magnitude.
const LOG_MIN = 0.7 // 10^0.7 ≈ 5 ℓ_P
const LOG_MAX = 6 // 10^6 = one million ℓ_P
const LOG_STEP = 0.01

// drawn lattice is a fixed visual sampling (we don't draw r³ real dots!).
const LATTICE_N = 5 // 5×5×5 = 125 sampled bulk dots
const FACE_N = 5 // 5×5 = 25 sampled boundary pixels per face

export function HolographicReduction() {
  // keep the ref so the lattice can be skipped while off-screen (cheap render).
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('160px')
  const gradId = useId().replace(/:/g, '')

  // slider holds log10(side r) in Planck lengths.
  const [logR, setLogR] = useState<number>(3) // 10³ = 1000 ℓ_P

  const r = useMemo(() => Math.pow(10, logR), [logR]) // side, in ℓ_P

  // VOLUME = r³ Planck volumes. AREA = surface of the cube = 6 r² Planck areas.
  const volume = useMemo(() => Math.pow(r, 3), [r])
  const area = useMemo(() => 6 * Math.pow(r, 2), [r])

  // Holographic / Bekenstein–Hawking information bound: one bit per 4 ℓ_P² of
  // boundary area (× ln2 to go from nats to bits). bits = A / (4 ℓ_P² · ln2).
  const maxBits = useMemo(() => area / (4 * Math.LN2), [area]) // A already in ℓ_P²

  // race-bar fill fractions on a shared log axis spanning the whole r-range.
  const logVolMax = 3 * LOG_MAX // (10^6)³
  const logAreaMax = Math.log10(6) + 2 * LOG_MAX
  const volFrac = clamp01(Math.log10(volume) / logVolMax)
  const areaFrac = clamp01(Math.log10(area) / logVolMax) // SAME axis, so area visibly trails
  void logAreaMax

  // how many orders of magnitude the bulk count exceeds the boundary count.
  const ordersAhead = Math.log10(volume) - Math.log10(area)

  return (
    <div
      ref={inViewRef}
      className="not-prose my-7 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          holographic bound
        </span>
        <span className="font-mono text-[0.72rem] tracking-tight text-fg/70">
          S<sub>max</sub> = A / 4ℓ<sub>P</sub>
          <sup>2</sup>
        </span>
      </div>

      {/* ── the two pictures: bulk cube vs. boundary tiling ─────────── */}
      <div className="grid grid-cols-1 gap-px bg-[var(--color-border)] sm:grid-cols-2">
        {/* bulk */}
        <figure className="m-0 flex flex-col items-center bg-surface px-4 pt-5 pb-4">
          <figcaption className="mb-2 flex items-center gap-2 self-stretch">
            <span
              className="inline-block h-2 w-2 rounded-[2px]"
              style={{ backgroundColor: ACCENT_BULK }}
            />
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
              3-D bulk · volume ∝ r³
            </span>
          </figcaption>
          <BulkCube show={inView} dotColor={ACCENT_BULK} />
          <span className="mt-2 font-mono text-[0.66rem] text-fg/50 tabular-nums">
            {fmtBig(volume)} Planck volumes
          </span>
        </figure>

        {/* boundary */}
        <figure className="m-0 flex flex-col items-center bg-surface px-4 pt-5 pb-4">
          <figcaption className="mb-2 flex items-center gap-2 self-stretch">
            <span
              className="inline-block h-2 w-2 rounded-[2px]"
              style={{ backgroundColor: ACCENT }}
            />
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
              2-D boundary · area ∝ r²
            </span>
          </figcaption>
          <BoundaryTiling gradId={gradId} pixelColor={ACCENT} />
          <span className="mt-2 font-mono text-[0.66rem] text-fg/50 tabular-nums">
            {fmtBig(maxBits)} bits max
          </span>
        </figure>
      </div>

      {/* ── numeric readout ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 px-5 pt-5 sm:grid-cols-3 sm:px-6">
        <Readout label="cube side r" value={`${fmtBig(r)} ℓ${sub('P')}`} sub={fmtLengthMeters(r)} />
        <Readout
          label="bulk capacity (naïve)"
          value={`${fmtBig(volume)}`}
          sub="∝ r³ Planck volumes"
          color={ACCENT_BULK}
        />
        <Readout
          label="true max entropy"
          value={`${fmtBig(maxBits)} bits`}
          sub="∝ r² (boundary area)"
          color={ACCENT}
        />
      </div>

      {/* ── radius slider ───────────────────────────────────────────── */}
      <div className="px-5 pt-5 sm:px-6">
        <label htmlFor="hr-radius" className="sr-only">
          Cube side r, in Planck lengths (logarithmic)
        </label>
        <input
          id="hr-radius"
          type="range"
          min={LOG_MIN}
          max={LOG_MAX}
          step={LOG_STEP}
          value={logR}
          onChange={(e) => setLogR(Number(e.target.value))}
          aria-label="Cube side length in Planck lengths, on a logarithmic scale"
          aria-valuetext={`${fmtBig(r)} Planck lengths; volume ${fmtBig(
            volume,
          )} Planck volumes; maximum ${fmtBig(maxBits)} bits`}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-border)]"
          style={{ accentColor: ACCENT }}
        />
        <div className="mt-1 flex justify-between font-mono text-[0.6rem] uppercase tracking-wider text-fg/35 tabular-nums">
          <span>5 ℓ{sub('P')}</span>
          <span>10{sup(3)} ℓ{sub('P')}</span>
          <span>10{sup(6)} ℓ{sub('P')}</span>
        </div>
      </div>

      {/* ── log race: volume sprints away from the area-set bound ────── */}
      <div className="px-5 pt-5 sm:px-6">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
          on a shared log scale
        </span>
        <div className="mt-2 space-y-2">
          <RaceBar
            label="volume r³"
            frac={volFrac}
            color={ACCENT_BULK}
            value={`${fmtBig(volume)}`}
          />
          <RaceBar
            label="area r² (the real limit)"
            frac={areaFrac}
            color={ACCENT}
            value={`${fmtBig(area)} ℓ${sub('P')}${sup(2)}`}
          />
        </div>
      </div>

      {/* ── one clear takeaway ──────────────────────────────────────── */}
      <div className="mt-5 border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-4 sm:px-6">
        <p className="font-sans text-[0.9rem] leading-snug text-fg/80">
          The bulk grows as r³ but the information it can hold grows only as r²,
          set by the boundary. At r = {fmtBig(r)} ℓ
          <sub>P</sub> the volume already runs{' '}
          <strong style={{ color: ACCENT_BULK }}>
            ~{Math.round(ordersAhead)} orders of magnitude
          </strong>{' '}
          ahead of the surface — yet every bit inside still fits on that 2-D
          boundary.{' '}
          <strong style={{ color: ACCENT }}>
            Capacity lives on the surface, not in the volume.
          </strong>
        </p>
        <p className="mt-2 font-mono text-[0.64rem] leading-snug text-fg/45">
          One bit per 4 Planck areas (ℓ
          <sub>P</sub> = √(ħG/c³) ≈ 1.62×10⁻³⁵ m). A black hole saturates this
          bound — its entropy is exactly a quarter of its horizon area in Planck
          units.
        </p>
      </div>
    </div>
  )
}

/* ── small presentational helpers ───────────────────────────────────── */

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function sub(s: string): React.ReactNode {
  return <sub>{s}</sub>
}

/** Cube side in ℓ_P → an approximate real-world length string. */
function fmtLengthMeters(rPlanck: number): string {
  const m = rPlanck * PLANCK_LENGTH_M
  if (m < 1e-30) return `${parseFloat((m * 1e35).toPrecision(3))}×10⁻³⁵ m`
  const exp = Math.floor(Math.log10(m))
  const mant = m / Math.pow(10, exp)
  return `≈ ${parseFloat(mant.toPrecision(3))}×10${sup(exp)} m`
}

function Readout({
  label,
  value,
  sub: subText,
  color,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  color?: string
}) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      <span
        className="mt-1 font-display text-lg font-semibold tracking-tight tabular-nums"
        style={color ? { color } : { color: 'var(--color-fg)' }}
      >
        {value}
      </span>
      {subText && (
        <span className="mt-0.5 font-mono text-[0.62rem] text-fg/40 tabular-nums">{subText}</span>
      )}
    </div>
  )
}

function RaceBar({
  label,
  frac,
  color,
  value,
}: {
  label: string
  frac: number
  color: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 font-mono text-[0.64rem] text-fg/55 sm:w-40">{label}</span>
      <div
        className="relative h-2.5 flex-1 overflow-hidden rounded-full"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-border) 80%, transparent)' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${(frac * 100).toFixed(2)}%`,
            backgroundColor: color,
            transition: 'width 240ms cubic-bezier(0.2, 0.7, 0.2, 1)',
          }}
        />
      </div>
      <span className="w-24 shrink-0 text-right font-mono text-[0.62rem] tabular-nums text-fg/55">
        {value}
      </span>
    </div>
  )
}

/* ── the 3-D wireframe bulk cube (oblique projection) ───────────────── */

function BulkCube({ show, dotColor }: { show: boolean; dotColor: string }) {
  const VB = 200
  // oblique (cabinet-ish) projection: x right, y up, z receding up-right.
  const SIZE = 116 // edge length in px
  const ox = 44 // origin (front-bottom-left corner) x
  const oy = 150 // origin y (SVG y grows down)
  const dz = 0.5 // z foreshortening factor
  const zx = 44 // z axis screen dx
  const zy = -36 // z axis screen dy (up-right)

  // project lattice coords (i,j,k in 0..1) to screen px.
  const project = (i: number, j: number, k: number) => {
    const x = ox + i * SIZE + k * zx * dz
    const y = oy - j * SIZE + k * zy * dz
    return { x, y }
  }

  // the 8 cube corners
  const corners = [
    project(0, 0, 0),
    project(1, 0, 0),
    project(1, 1, 0),
    project(0, 1, 0),
    project(0, 0, 1),
    project(1, 0, 1),
    project(1, 1, 1),
    project(0, 1, 1),
  ]
  const [c0, c1, c2, c3, c4, c5, c6, c7] = corners

  const edge = (a: { x: number; y: number }, b: { x: number; y: number }, faded = false) => (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke="color-mix(in srgb, var(--color-fg) 45%, transparent)"
      strokeWidth={1.4}
      strokeOpacity={faded ? 0.4 : 1}
      strokeLinecap="round"
    />
  )

  // a sampled lattice of "bits" inside the cube; centres of LATTICE_N³ cells.
  const dots: { x: number; y: number; depth: number }[] = []
  if (show) {
    for (let k = 0; k < LATTICE_N; k++) {
      for (let j = 0; j < LATTICE_N; j++) {
        for (let i = 0; i < LATTICE_N; i++) {
          const fi = (i + 0.5) / LATTICE_N
          const fj = (j + 0.5) / LATTICE_N
          const fk = (k + 0.5) / LATTICE_N
          const p = project(fi, fj, fk)
          dots.push({ x: p.x, y: p.y, depth: fk })
        }
      }
    }
    // paint back-to-front so nearer dots sit on top
    dots.sort((a, b) => a.depth - b.depth)
  }

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      className="block h-auto w-full"
      style={{ maxWidth: 220 }}
      role="img"
      aria-label="A 3-D wireframe cube packed with a lattice of bits, representing volume growing as the cube of its side."
    >
      {/* back edges (faded) */}
      {edge(c3, c7, true)}
      {edge(c4, c7, true)}
      {edge(c6, c7, true)}

      {/* sampled bulk bits */}
      <g>
        {dots.map((d, idx) => (
          <circle
            key={idx}
            cx={d.x}
            cy={d.y}
            r={2.2}
            fill={dotColor}
            fillOpacity={0.35 + 0.5 * d.depth}
          />
        ))}
      </g>

      {/* front edges (solid) */}
      {edge(c0, c1)}
      {edge(c1, c2)}
      {edge(c2, c3)}
      {edge(c3, c0)}
      {edge(c0, c4)}
      {edge(c1, c5)}
      {edge(c2, c6)}
      {edge(c4, c5)}
      {edge(c5, c6)}
    </svg>
  )
}

/* ── the 2-D boundary: an unfolded face tiled in Planck pixels ──────── */

function BoundaryTiling({ gradId, pixelColor }: { gradId: string; pixelColor: string }) {
  const VB = 200
  const PAD = 30
  const grid = VB - 2 * PAD
  const cell = grid / FACE_N
  const gap = 2.4

  const cells: { x: number; y: number }[] = []
  for (let j = 0; j < FACE_N; j++) {
    for (let i = 0; i < FACE_N; i++) {
      cells.push({ x: PAD + i * cell, y: PAD + j * cell })
    }
  }

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      className="block h-auto w-full"
      style={{ maxWidth: 220 }}
      role="img"
      aria-label="A flat 2-D boundary square tiled with Planck-area pixels, representing the information bound growing only as the square of the side."
    >
      <defs>
        <linearGradient id={`grad-${gradId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={pixelColor} stopOpacity={0.95} />
          <stop offset="100%" stopColor={pixelColor} stopOpacity={0.5} />
        </linearGradient>
      </defs>
      <g>
        {cells.map((c, idx) => (
          <rect
            key={idx}
            x={c.x + gap / 2}
            y={c.y + gap / 2}
            width={cell - gap}
            height={cell - gap}
            rx={2}
            fill={`url(#grad-${gradId})`}
          />
        ))}
      </g>
      {/* boundary frame */}
      <rect
        x={PAD - 4}
        y={PAD - 4}
        width={grid + 8}
        height={grid + 8}
        rx={4}
        fill="none"
        stroke="color-mix(in srgb, var(--color-fg) 35%, transparent)"
        strokeWidth={1.4}
      />
    </svg>
  )
}
