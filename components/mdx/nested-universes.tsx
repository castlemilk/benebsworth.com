'use client'

/**
 * NestedUniverses — a clickable ladder of nested universes, for the
 * "are we inside a black hole?" cosmology flagship.
 *
 * SPECULATIVE HEURISTIC, NOT ESTABLISHED PHYSICS. This visualises the
 * dimensional-nesting picture that some authors (Afshordi–Mann–Pourhasan 2014;
 * Popławski's torsion bounce) gesture at: take a (D+1)-dimensional "bulk"
 * universe, let a black hole form in it, and its event horizon is a
 * D-dimensional surface — a brane — on which a whole D-dimensional universe
 * could live. Apply the same idea one rung down and the black holes inside
 * the D-dimensional universe each carry a (D−1)-dimensional horizon, and so on.
 *
 * Reading the ladder:
 *   D = 4  bulk          a four-dimensional-space parent universe
 *   D = 3  ← US          our 3-space universe as the 3-brane horizon of a 4-D black hole
 *   D = 2                the horizon of a black hole WE see, a 2-surface
 *   D = 1                the horizon of a 2-D black hole
 *
 * At every rung the "Big Bang" of the inner universe is the GRAVITATIONAL
 * COLLAPSE in the parent that formed the black hole — the moment matter crossed
 * its Schwarzschild radius r_s = 2GM/c² (G = 6.674×10⁻¹¹, c = 2.998×10⁸).
 * From inside, that collapse looks like time beginning.
 *
 * IMPORTANT CAVEAT shown in the UI: holography says a bulk can be *encoded*
 * on its boundary; it does not literally "spawn" a living lower-D cosmos. The
 * ladder is a picture for intuition, not a derivation.
 *
 * No rAF: the only motion is a CSS pulse on the active horizon ring, which is
 * disabled under prefers-reduced-motion via a media query in the className.
 * Clicking a level (or the descend/ascend buttons, or arrow keys) selects it.
 */

import { useMemo, useState } from 'react'

const G = 6.674e-11 // m³ kg⁻¹ s⁻²  (Newton's constant)
const C = 2.998e8 // m s⁻¹        (speed of light)
const C2 = C * C
const SOLAR_MASS = 1.989e30 // kg
const LIGHT_YEAR = 9.4607e15 // m

/** Schwarzschild radius r_s = 2GM/c² in metres for a mass in kilograms. */
function schwarzschildRadius(massKg: number): number {
  return (2 * G * massKg) / C2
}

const ACCENT = '#6366f1' // cosmic indigo (the cosmology desk accent)

type Level = {
  /** Spatial dimension of THIS universe. */
  dim: number
  name: string
  /** Whether this rung is our own universe. */
  isUs?: boolean
  /** One-line nature of the universe at this rung. */
  nature: string
  /** What the "Big Bang" of this universe is, in the nesting picture. */
  bigBang: string
  /** The horizon that this universe lives on (the surface in its parent). */
  horizon: string
  /** Optional concrete mass + r_s anchor, shown as a real number. */
  anchor?: { label: string; massKg: number; rsLabel: string }
}

// Ladder runs from the 4-D bulk down to a 0-D point. Index 0 = bulk (top).
const LEVELS: Level[] = [
  {
    dim: 4,
    name: 'The 4-D bulk',
    nature:
      'A universe with four large spatial dimensions — the parent "bulk" in which everything below is nested.',
    bigBang:
      'Its own genesis, outside our ladder. We can say nothing about it from inside; it is simply the stage the first black hole forms on.',
    horizon: 'No parent shown — this is the top of the pictured ladder.',
  },
  {
    dim: 3,
    name: 'Our universe',
    isUs: true,
    nature:
      'Three spatial dimensions — the universe you are reading this in, pictured as the 3-brane horizon of a black hole in the 4-D bulk.',
    bigBang:
      'A star (or worse) collapses in the 4-D bulk and crosses its horizon. From inside that horizon, the collapse reads as time starting — our Big Bang.',
    horizon:
      'The 3-dimensional event horizon (a "3-brane") of a 4-D black hole. Its area, not its volume, sets the information it can hold.',
    anchor: {
      label: 'Observable universe',
      massKg: 1.5e53,
      rsLabel: 'its ~14-billion-light-year scale',
    },
  },
  {
    dim: 2,
    name: 'A 2-D horizon-world',
    nature:
      'The two-dimensional event horizon of a black hole we actually observe — Sagittarius A*, say. By the same logic, a 2-D "universe".',
    bigBang:
      'The collapse, in our 3-D universe, that formed that black hole. To a 2-D inhabitant, that collapse would be the first instant of everything.',
    horizon:
      'The 2-sphere horizon of a 3-D black hole. Its area in Planck units counts its entropy (the Bekenstein–Hawking bound).',
    anchor: {
      label: 'Sagittarius A*',
      massKg: 4.297e6 * SOLAR_MASS,
      rsLabel: 'the Milky Way’s central black hole',
    },
  },
  {
    dim: 1,
    name: 'A 1-D horizon-world',
    nature:
      'The one-dimensional horizon of a black hole that lives inside the 2-D world above — a line on which a 1-D "universe" is encoded.',
    bigBang:
      'The collapse, in the 2-D world, that drew that horizon closed. Each rung down, a parent collapse becomes a child Big Bang.',
    horizon: 'The 1-dimensional horizon of a 2-D black hole.',
  },
  {
    dim: 0,
    name: 'A 0-D endpoint',
    nature:
      'A point. The ladder bottoms out: there is no room for a universe with no dimensions to vary in.',
    bigBang:
      'Nothing left to begin. The dimensional descent has run out of directions — a reminder this is a heuristic, not a literal infinite regress.',
    horizon: 'The horizon of a 1-D "black hole" shrinks to a single point.',
  },
]

const US_INDEX = LEVELS.findIndex((l) => l.isUs)

/** Compact scientific notation with a Unicode ×10ⁿ for large magnitudes. */
function formatSci(x: number): string {
  if (x === 0) return '0'
  const abs = Math.abs(x)
  if (abs >= 1e-3 && abs < 1e5) return String(parseFloat(x.toPrecision(4)))
  const exp = Math.floor(Math.log10(abs))
  const mantissa = x / Math.pow(10, exp)
  return `${parseFloat(mantissa.toPrecision(3))}×10${toSuperscript(exp)}`
}

const SUPERSCRIPTS: Record<string, string> = {
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
function toSuperscript(n: number): string {
  return String(n)
    .split('')
    .map((ch) => SUPERSCRIPTS[ch] ?? ch)
    .join('')
}

/** Friendly length string for a Schwarzschild radius in metres. */
function formatLength(m: number): string {
  const abs = Math.abs(m)
  if (abs >= 1e9 * LIGHT_YEAR) return `${(m / (1e9 * LIGHT_YEAR)).toPrecision(3)} billion ly`
  if (abs >= LIGHT_YEAR) return `${formatSci(m / LIGHT_YEAR)} ly`
  if (abs >= 1.496e11) return `${formatSci(m / 1.496e11)} AU`
  if (abs >= 1e3) return `${formatSci(m / 1e3)} km`
  if (abs >= 1) return `${m.toPrecision(3)} m`
  return `${formatSci(m)} m`
}

/**
 * One nested-spheres diagram: draws the ladder as boxes-within-boxes, with the
 * SELECTED rung highlighted and its horizon ring pulsing. Pure SVG, no state.
 */
function NestingDiagram({ selected }: { selected: number }) {
  const VB = 220
  const cx = VB / 2
  const cy = VB / 2
  // four nested rings, outermost = bulk (index 0)
  const rings = LEVELS.slice(0, 4) // 4-D down to 1-D have a visible shell
  const maxR = 96
  const minR = 22
  const step = (maxR - minR) / (rings.length - 1)

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      className="block h-auto w-full"
      style={{ maxWidth: 240, margin: '0 auto' }}
      role="img"
      aria-label="Nested circles, each the horizon of a black hole in the level outside it. The selected level is highlighted."
    >
      {rings.map((lvl, i) => {
        const r = maxR - i * step
        const isSel = i === selected
        const isUs = lvl.isUs
        return (
          <g key={lvl.dim}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={
                isSel
                  ? 'color-mix(in srgb, #6366f1 14%, transparent)'
                  : 'color-mix(in srgb, var(--color-fg) 3%, transparent)'
              }
              stroke={isSel ? ACCENT : 'color-mix(in srgb, var(--color-border) 95%, transparent)'}
              strokeWidth={isSel ? 2 : 1}
              strokeDasharray={isUs ? '4 3' : undefined}
              className={
                isSel
                  ? 'motion-safe:[animation:nu-pulse_2.6s_ease-in-out_infinite] motion-reduce:[animation:none]'
                  : undefined
              }
              style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
            />
            <text
              x={cx}
              y={cy - r + 13}
              textAnchor="middle"
              className="font-mono"
              style={{
                fontSize: 9,
                fontWeight: isSel ? 700 : 500,
                fill: isSel ? ACCENT : 'var(--color-muted)',
              }}
            >
              {lvl.dim}D{isUs ? ' ·us' : ''}
            </text>
          </g>
        )
      })}
      {/* central singularity dot = the 0-D endpoint */}
      <circle
        cx={cx}
        cy={cy}
        r={2.5}
        fill={selected === 4 ? ACCENT : 'color-mix(in srgb, var(--color-fg) 45%, transparent)'}
      />
      <style>{`@keyframes nu-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }`}</style>
    </svg>
  )
}

export function NestedUniverses() {
  const [selected, setSelected] = useState<number>(US_INDEX === -1 ? 1 : US_INDEX)
  const level = LEVELS[selected]

  const rs = useMemo(
    () => (level.anchor ? schwarzschildRadius(level.anchor.massKg) : null),
    [level.anchor],
  )

  const canDescend = selected < LEVELS.length - 1
  const canAscend = selected > 0

  const descend = () => canDescend && setSelected((s) => s + 1)
  const ascend = () => canAscend && setSelected((s) => s - 1)

  return (
    <div className="not-prose my-7 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      {/* ── header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          nested universes
        </span>
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.16em]"
          style={{
            color: ACCENT,
            border: `1px solid color-mix(in srgb, ${ACCENT} 45%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${ACCENT} 10%, transparent)`,
          }}
        >
          ◇ speculative heuristic
        </span>
      </div>

      <div className="grid grid-cols-1 gap-0 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* ── left: ladder + diagram ───────────────────────────────── */}
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:border-b-0 sm:border-r sm:px-6">
          <NestingDiagram selected={selected} />

          <ol className="mt-5 flex flex-col gap-1.5" aria-label="Dimensional ladder">
            {LEVELS.map((lvl, i) => {
              const active = i === selected
              return (
                <li key={lvl.dim}>
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    aria-pressed={active}
                    aria-current={active ? 'true' : undefined}
                    className="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left font-mono text-[0.72rem] tracking-tight transition-colors"
                    style={
                      active
                        ? {
                            color: ACCENT,
                            borderColor: ACCENT,
                            backgroundColor: `color-mix(in srgb, ${ACCENT} 12%, transparent)`,
                          }
                        : { borderColor: 'var(--color-border)' }
                    }
                  >
                    <span
                      className="flex h-6 w-6 flex-none items-center justify-center rounded font-semibold tabular-nums"
                      style={{
                        backgroundColor: active
                          ? `color-mix(in srgb, ${ACCENT} 22%, transparent)`
                          : 'color-mix(in srgb, var(--color-fg) 6%, transparent)',
                        color: active ? ACCENT : 'var(--color-fg)',
                      }}
                    >
                      {lvl.dim}
                    </span>
                    <span className={active ? '' : 'text-fg/70'}>
                      {lvl.name}
                      {lvl.isUs && (
                        <span className="ml-1.5 text-[0.6rem] uppercase tracking-wider opacity-70">
                          ← you
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          {/* descend / ascend */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={ascend}
              disabled={!canAscend}
              className="flex-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-wider text-muted transition-colors enabled:hover:text-fg disabled:opacity-35"
            >
              ▴ ascend
            </button>
            <button
              type="button"
              onClick={descend}
              disabled={!canDescend}
              className="flex-1 rounded-md px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-wider transition-colors disabled:opacity-35"
              style={{
                color: canDescend ? ACCENT : undefined,
                border: `1px solid ${
                  canDescend ? `color-mix(in srgb, ${ACCENT} 45%, transparent)` : 'var(--color-border)'
                }`,
                backgroundColor: canDescend
                  ? `color-mix(in srgb, ${ACCENT} 10%, transparent)`
                  : undefined,
              }}
            >
              descend ▾
            </button>
          </div>
        </div>

        {/* ── right: selected-level detail ─────────────────────────── */}
        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-baseline gap-2">
            <span
              className="font-display text-3xl font-semibold tracking-tight tabular-nums"
              style={{ color: level.isUs ? ACCENT : 'var(--color-fg)' }}
            >
              {level.dim}-D
            </span>
            <span className="font-display text-lg font-medium text-fg/80">{level.name}</span>
          </div>

          <p className="mt-3 font-sans text-[0.9rem] leading-relaxed text-fg/80">{level.nature}</p>

          <dl className="mt-4 flex flex-col gap-3">
            <div className="border-l-2 pl-3" style={{ borderColor: ACCENT }}>
              <dt className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted">
                what plays the role of its Big Bang
              </dt>
              <dd className="mt-1 font-sans text-[0.86rem] leading-snug text-fg/75">
                {level.bigBang}
              </dd>
            </div>
            <div className="border-l-2 border-[var(--color-border)] pl-3">
              <dt className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted">
                lives on the horizon of
              </dt>
              <dd className="mt-1 font-sans text-[0.86rem] leading-snug text-fg/75">
                {level.horizon}
              </dd>
            </div>
          </dl>

          {/* concrete r_s anchor, when this rung has one */}
          {level.anchor && rs !== null && (
            <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-surface-2/50 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                  {level.anchor.label} · {level.anchor.rsLabel}
                </span>
                <span className="font-mono text-[0.62rem] text-fg/45">
                  r<sub>s</sub> = 2GM / c<sup>2</sup>
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-lg font-semibold tabular-nums" style={{ color: ACCENT }}>
                  r<sub>s</sub> ≈ {formatLength(rs)}
                </span>
                <span className="font-mono text-[0.66rem] text-fg/45 tabular-nums">
                  ({formatSci(rs)} m · M = {formatSci(level.anchor.massKg)} kg)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── footer caveat ──────────────────────────────────────────── */}
      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3 sm:px-6">
        <p className="font-mono text-[0.66rem] leading-snug text-muted">
          A heuristic, not established physics. Holography says a bulk can be <em>encoded</em> on its
          boundary — it does not literally spawn a living lower-dimensional cosmos, and no accepted
          theory nests universes this way. The ladder is a picture to think with: every rung&rsquo;s
          Big Bang is just the parent&rsquo;s gravitational collapse seen from inside the horizon
          (r<sub>s</sub>&nbsp;=&nbsp;2GM/c<sup>2</sup>).
        </p>
      </div>
    </div>
  )
}
