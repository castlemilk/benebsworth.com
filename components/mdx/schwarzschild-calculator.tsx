'use client'

/**
 * SchwarzschildCalculator — the event-horizon size of any mass, for the
 * "are we inside a black hole?" cosmology flagship.
 *
 * The Schwarzschild radius is the radius at which a given mass M, if crushed
 * inside it, becomes a (non-rotating) black hole — the size of its event
 * horizon:
 *
 *     r_s = 2 G M / c²
 *
 * with G = 6.674×10⁻¹¹ m³ kg⁻¹ s⁻² and c = 2.998×10⁸ m s⁻¹. Because r_s scales
 * linearly with M across 78 orders of magnitude (a person → the cosmos), a
 * log-scale mass slider is the only honest control. Preset buttons jump to
 * landmark masses, and for each we show r_s in friendly units alongside the
 * ratio r_s / R_actual — how close the object sits to being a black hole.
 *
 * The punchline preset is the observable universe: plug in its mass-energy and
 * r_s comes out roughly equal to the universe's own radius. The cosmos sits at
 * its own Schwarzschild scale — the coincidence at the heart of the post.
 *
 * No animation: a pure calculator. Slider + presets drive derived state; the
 * value transitions are CSS only, so there's nothing to pause and nothing that
 * fights prefers-reduced-motion.
 */

import { useMemo, useState } from 'react'

const G = 6.674e-11 // m³ kg⁻¹ s⁻²
const C = 2.998e8 // m s⁻¹
const C2 = C * C

/** Schwarzschild radius in metres for a mass in kilograms. */
function schwarzschildRadius(massKg: number): number {
  return (2 * G * massKg) / C2
}

const SOLAR_MASS = 1.989e30 // kg
const LIGHT_YEAR = 9.4607e15 // m

type Preset = {
  id: string
  label: string
  massKg: number
  /** The object's real radius, for the r_s / R_actual ratio. */
  actualRadiusM: number
  /** How we describe that radius in the ratio line. */
  actualRadiusLabel: string
  note: string
}

const PRESETS: Preset[] = [
  {
    id: 'you',
    label: 'You (~70 kg)',
    massKg: 70,
    actualRadiusM: 0.4, // ~ half-height "radius" of a person
    actualRadiusLabel: 'your ~0.4 m bodily radius',
    note: 'Your horizon would be a 100-quintillionth of a proton — utterly unreachable.',
  },
  {
    id: 'earth',
    label: 'Earth',
    massKg: 5.972e24,
    actualRadiusM: 6.371e6,
    actualRadiusLabel: "Earth's 6,371 km radius",
    note: 'Crush Earth to the size of a marble and it becomes a black hole.',
  },
  {
    id: 'sun',
    label: 'The Sun',
    massKg: SOLAR_MASS,
    actualRadiusM: 6.957e8,
    actualRadiusLabel: "the Sun's 696,000 km radius",
    note: 'The Sun is ~470,000× wider than its own event horizon.',
  },
  {
    id: 'sgra',
    label: 'Sagittarius A*',
    massKg: 4.297e6 * SOLAR_MASS,
    actualRadiusM: 1.269e10, // it IS a black hole: actual radius = its own r_s
    actualRadiusLabel: 'its own event horizon',
    note: 'The Milky Way’s central black hole already sits at r_s — that IS its radius.',
  },
  {
    id: 'universe',
    label: 'Observable universe',
    massKg: 1.5e53,
    // Hubble radius c/H₀ ≈ 14.4 billion light-years — the standard
    // "size of the causally-connected universe" the coincidence is stated against.
    actualRadiusM: 14.4 * 1e9 * LIGHT_YEAR,
    actualRadiusLabel: 'its ~14.4-billion-light-year Hubble radius',
    note: 'Its Schwarzschild radius ≈ its own radius. The universe sits at its own black-hole scale.',
  },
]

// log-scale slider domain: a touch below "you" up to a touch above the universe
const LOG_MIN = 0 // 10⁰ kg = 1 kg
const LOG_MAX = 54 // 10⁵⁴ kg (> universe's 1.5×10⁵³)
const LOG_STEP = 0.01

/** Format a mass in kg with a sensible unit + sig figs. */
function formatMass(massKg: number): string {
  if (massKg >= 0.5 * SOLAR_MASS) {
    const solar = massKg / SOLAR_MASS
    return `${formatSci(solar)} M☉` // ☉ solar masses
  }
  if (massKg >= 1e3) return `${formatSci(massKg)} kg`
  return `${massKg.toPrecision(3)} kg`
}

/** Format a length in metres, choosing the friendliest unit. */
function formatLength(m: number): string {
  if (m === 0) return '0 m'
  const abs = Math.abs(m)
  if (abs >= LIGHT_YEAR) {
    const ly = m / LIGHT_YEAR
    if (ly >= 1e9) return `${(ly / 1e9).toPrecision(3)} billion light-years`
    if (ly >= 1e6) return `${(ly / 1e6).toPrecision(3)} million light-years`
    return `${formatSci(ly)} light-years`
  }
  if (abs >= 1.496e11) return `${formatSci(m / 1.496e11)} AU`
  if (abs >= 1e3) return `${formatSci(m / 1e3)} km`
  if (abs >= 1) return `${m.toPrecision(3)} m`
  if (abs >= 1e-2) return `${(m * 100).toPrecision(3)} cm`
  if (abs >= 1e-3) return `${(m * 1e3).toPrecision(3)} mm`
  return `${formatSci(m)} m`
}

/** Compact scientific notation with a Unicode ×10ⁿ when the magnitude is large. */
function formatSci(x: number): string {
  if (x === 0) return '0'
  const abs = Math.abs(x)
  if (abs >= 1e-3 && abs < 1e5) {
    // human-readable range: trim trailing zeros
    const s = x.toPrecision(4)
    return String(parseFloat(s))
  }
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

/** Format the r_s / R_actual ratio for display. */
function formatRatio(ratio: number): string {
  if (ratio >= 0.1 && ratio <= 10) return ratio.toPrecision(3)
  if (ratio < 0.1) return formatSci(ratio)
  return formatSci(ratio)
}

const ACCENT = '#6366f1' // cosmic indigo (the cosmology desk accent)

export function SchwarzschildCalculator() {
  // slider state holds log10(mass in kg); start at the Sun
  const [logMass, setLogMass] = useState<number>(Math.log10(SOLAR_MASS))
  const [activePreset, setActivePreset] = useState<string | null>('sun')

  const massKg = useMemo(() => Math.pow(10, logMass), [logMass])
  const rs = useMemo(() => schwarzschildRadius(massKg), [massKg])

  const preset = activePreset ? PRESETS.find((p) => p.id === activePreset) ?? null : null
  const ratio = preset ? rs / preset.actualRadiusM : null

  const onSlider = (value: number) => {
    setLogMass(value)
    setActivePreset(null) // free-drag detaches from any preset
  }

  const selectPreset = (p: Preset) => {
    setLogMass(Math.log10(p.massKg))
    setActivePreset(p.id)
  }

  return (
    <div className="not-prose my-7 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          schwarzschild radius
        </span>
        <span className="font-mono text-[0.72rem] tracking-tight text-fg/70">
          r<sub>s</sub> = 2GM / c<sup>2</sup>
        </span>
      </div>

      {/* ── primary readout ───────────────────────────────────────── */}
      <div className="px-5 pt-5 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col">
            <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-muted">
              mass
            </span>
            <span className="mt-1 font-display text-2xl font-semibold tracking-tight text-fg tabular-nums">
              {formatMass(massKg)}
            </span>
            <span className="mt-0.5 font-mono text-[0.7rem] text-fg/45 tabular-nums">
              {formatSci(massKg)} kg
            </span>
          </div>
          <div className="flex flex-col sm:items-end sm:text-right">
            <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-muted">
              schwarzschild radius r<sub>s</sub>
            </span>
            <span
              className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums transition-colors"
              style={{ color: ACCENT }}
            >
              {formatLength(rs)}
            </span>
            <span className="mt-0.5 font-mono text-[0.7rem] text-fg/45 tabular-nums">
              {formatSci(rs)} m
            </span>
          </div>
        </div>

        {/* ── log mass slider ──────────────────────────────────────── */}
        <div className="mt-5">
          <label htmlFor="sc-mass" className="sr-only">
            Mass (logarithmic)
          </label>
          <input
            id="sc-mass"
            type="range"
            min={LOG_MIN}
            max={LOG_MAX}
            step={LOG_STEP}
            value={logMass}
            onChange={(e) => onSlider(Number(e.target.value))}
            aria-label="Mass on a logarithmic scale, in kilograms"
            aria-valuetext={`${formatMass(massKg)}; Schwarzschild radius ${formatLength(rs)}`}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-border)]"
            style={{ accentColor: ACCENT }}
          />
          <div className="mt-1 flex justify-between font-mono text-[0.6rem] uppercase tracking-wider text-fg/35 tabular-nums">
            <span>1 kg</span>
            <span>10{toSuperscript(27)} kg</span>
            <span>10{toSuperscript(54)} kg</span>
          </div>
        </div>
      </div>

      {/* ── presets ──────────────────────────────────────────────── */}
      <div className="px-5 pt-5 sm:px-6">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
          presets
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const active = activePreset === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPreset(p)}
                aria-pressed={active}
                className="rounded-md border px-3 py-1.5 font-mono text-[0.68rem] tracking-wide transition-colors"
                style={
                  active
                    ? {
                        color: ACCENT,
                        borderColor: ACCENT,
                        backgroundColor: 'color-mix(in srgb, #6366f1 12%, transparent)',
                      }
                    : undefined
                }
              >
                <span className={active ? '' : 'text-muted hover:text-fg'}>{p.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── ratio + note for the active preset ───────────────────── */}
      <div className="mt-5 border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-4 sm:px-6">
        {preset && ratio !== null ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-[0.64rem] uppercase tracking-[0.16em] text-muted">
                r<sub>s</sub> / actual radius
              </span>
              <span
                className="font-display text-xl font-semibold tabular-nums"
                style={{ color: ACCENT }}
              >
                {formatRatio(ratio)}
              </span>
              <span className="font-mono text-[0.68rem] text-fg/50">
                vs {preset.actualRadiusLabel}
              </span>
            </div>
            <p className="font-sans text-[0.85rem] leading-snug text-fg/70">{preset.note}</p>
            {preset.id === 'universe' && (
              <p className="font-mono text-[0.66rem] leading-snug text-fg/45">
                A ratio near 1 means the observable universe&rsquo;s mass-energy is exactly enough
                to wrap an event horizon around itself at its current size — the coincidence behind
                the &ldquo;cosmos as a black hole&rdquo; models.
              </p>
            )}
          </div>
        ) : (
          <p className="font-mono text-[0.68rem] leading-snug text-muted">
            Drag the slider, or pick a preset to compare its Schwarzschild radius against the
            object&rsquo;s real size. r<sub>s</sub> grows in exact proportion to mass — from a
            person&rsquo;s sub-atomic horizon to the universe&rsquo;s own scale.
          </p>
        )}
      </div>
    </div>
  )
}
