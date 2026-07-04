'use client'

import { useId, useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import type { Hike, HikeWaypoint } from '@/lib/gen/content'
import { VB_W, VB_H, project, smoothPath, buildProfile, peakIndex, stageAnchor } from './journey-core'

/**
 * Bespoke stylized "journey map" for a hike — a hand-drawn topographic plate, not
 * a real geographic map. The route is a smooth path through the hike's normalized
 * waypoints over a faint contour/grid backdrop; each waypoint is drawn as a named
 * landmark glyph (peak / pass / lake / hut / stop, inferred from its name).
 *
 * The SVG is purely decorative (route, glyphs, backdrop). ALL interaction lives in
 * an HTML overlay pinned by percentage over the same box: every waypoint is a real
 * <button> — tabbable, ≥44px touch target, keyboard-operable — and labels are HTML
 * text at a fixed, legible size (they never shrink to unreadable SVG units on a
 * phone). A pinned popover (works on touch, no cursor tracking) gives the day,
 * altitude and note, and — when a published trail guide exists — a "Day N →"
 * drilldown link into that day's stage. Selecting a waypoint also drives the
 * gallery on the hike page. An honest elevation strip mirrors the same selection.
 *
 * The route draw-in animation is gated behind the global prefers-reduced-motion.
 */

type Kind = 'summit' | 'pass' | 'lake' | 'hut' | 'stop'

const PREFIX = /^(Cabane d[eu]|Col d[eu]|Lac d[eu]|Refuge d[eu]|H[oô]tel d[eu]|Mont|Mount)\s+/i
const shortName = (n: string) => n.replace(PREFIX, '')

function kindFor(name: string, isPeak: boolean): Kind {
  if (isPeak) return 'summit'
  if (/\bcol\b|\bpas\b|\bpass\b|\bgap\b|\bbreche\b|forcletta|joch\b|\bsattel\b/i.test(name)) return 'pass'
  if (/\blac\b|\blake\b|\btarn\b|\bsee\b|reservoir|\bloch\b/i.test(name)) return 'lake'
  if (/cabane|refuge|h[üu]tte|h[oô]tel|gîte|\bhut\b|\brifug|lodge|camp\b/i.test(name)) return 'hut'
  return 'stop'
}

/** Tiny landmark glyph drawn in viewBox units, centred on (x, y). Decorative. */
function Glyph({ kind, x, y, r }: { kind: Kind; x: number; y: number; r: number }) {
  const edge = 'var(--color-bg)'
  if (kind === 'summit')
    return <path d={`M ${x} ${y - 1.8 * r} L ${x + 1.5 * r} ${y + r} L ${x - 1.5 * r} ${y + r} Z`} fill="var(--accent)" stroke={edge} strokeWidth={0.3} strokeLinejoin="round" />
  if (kind === 'pass')
    return <path d={`M ${x - 1.7 * r} ${y + 0.9 * r} L ${x - 0.7 * r} ${y - 0.6 * r} L ${x} ${y + 0.2 * r} L ${x + 0.7 * r} ${y - 0.6 * r} L ${x + 1.7 * r} ${y + 0.9 * r}`} fill="none" stroke="var(--accent)" strokeWidth={0.55} strokeLinecap="round" strokeLinejoin="round" />
  if (kind === 'lake')
    return <ellipse cx={x} cy={y} rx={1.6 * r} ry={0.85 * r} fill="var(--accent)" stroke={edge} strokeWidth={0.25} opacity={0.92} />
  if (kind === 'hut')
    return <path d={`M ${x - 1.2 * r} ${y + r} L ${x - 1.2 * r} ${y - 0.2 * r} L ${x} ${y - 1.3 * r} L ${x + 1.2 * r} ${y - 0.2 * r} L ${x + 1.2 * r} ${y + r} Z`} fill="var(--accent)" stroke={edge} strokeWidth={0.25} strokeLinejoin="round" />
  return <circle cx={x} cy={y} r={r} fill="var(--accent)" stroke={edge} strokeWidth={0.3} />
}

const dayLabel = (day: string) => (/^day\b/i.test(day) ? day : day ? `Day ${day}` : '')

export function JourneyMap({
  hike,
  active,
  onSelect,
  compact = false,
  showElevation = true,
  dayHref,
}: {
  hike: Hike
  active?: string | null
  onSelect?: (name: string | null) => void
  /** glyph mode: hides start/end chips + stat band, tightens the plate */
  compact?: boolean
  /** show the elevation-profile strip (default true) */
  showElevation?: boolean
  /**
   * Turns each waypoint into a drilldown: given the waypoint's `day` label,
   * return the URL of that day's section (e.g. a same-page `#day-3` anchor in a
   * trail guide, or `/blog/<guide>/#day-3` from the hike page), or null for no
   * link. When set, the tooltip renders a "Day N →" link.
   */
  dayHref?: (day: string) => string | null
}) {
  const uid = useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)
  const [selfActive, setSelfActive] = useState<string | null>(null)
  const activeName = active !== undefined ? active : selfActive
  const select = onSelect ?? setSelfActive
  const wps = hike.waypoints
  const pts = useMemo(() => wps.map(project), [wps])
  const peakIdx = useMemo(() => peakIndex(wps), [wps])
  const route = useMemo(() => smoothPath(pts), [pts])

  // ── elevation profile ──────────────────────────────────────────────────
  const profile = useMemo(() => buildProfile(wps), [wps])
  const elevs = wps.map((w) => w.elev)
  const minE = Math.min(...elevs)
  const maxE = Math.max(...elevs)

  const accent = hike.accent || '#5b9e6f'
  const activeIdx = wps.findIndex((w) => w.name === activeName)
  const focusIdx = hover ?? (activeIdx >= 0 ? activeIdx : null)

  const toggle = (name: string) => select(activeName === name ? null : name)

  return (
    <figure className="not-prose m-0" style={{ '--accent': accent } as CSSProperties}>
      {/* ── the map plate ───────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[radial-gradient(120%_120%_at_30%_0%,color-mix(in_srgb,var(--accent)_10%,var(--color-stage)),var(--color-stage))]">
        <div
          className="relative aspect-[100/74] w-full"
          onPointerLeave={() => setHover(null)}
        >
          {/* decorative art layer */}
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full" aria-hidden focusable="false">
            <defs>
              <pattern id={`grid-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M5 0H0V5" fill="none" stroke="color-mix(in srgb, var(--color-fg) 9%, transparent)" strokeWidth="0.15" />
              </pattern>
              <radialGradient id={`mask-${uid}`}>
                <stop offset="58%" stopColor="white" />
                <stop offset="100%" stopColor="black" />
              </radialGradient>
              <mask id={`fade-${uid}`}>
                <rect width={VB_W} height={VB_H} fill={`url(#mask-${uid})`} />
              </mask>
              <linearGradient id={`route-${uid}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 55%, var(--color-fg))" />
                <stop offset="100%" stopColor="var(--accent)" />
              </linearGradient>
              {/* soft hillshade from the top-left */}
              <radialGradient id={`shade-${uid}`} cx="32%" cy="6%" r="95%">
                <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 16%, transparent)" />
                <stop offset="55%" stopColor="transparent" />
              </radialGradient>
            </defs>

            {/* grid backdrop, vignetted */}
            <rect width={VB_W} height={VB_H} fill={`url(#grid-${uid})`} mask={`url(#fade-${uid})`} />
            <rect width={VB_W} height={VB_H} fill={`url(#shade-${uid})`} />

            {/* stylized contour rings around the high point */}
            {[3.4, 6.2, 9.4, 13].map((r, i) => (
              <ellipse key={`hi${r}`} cx={pts[peakIdx].x} cy={pts[peakIdx].y} rx={r} ry={r * 0.6} fill="none" stroke="color-mix(in srgb, var(--accent) 24%, transparent)" strokeWidth={0.18} opacity={1 - i * 0.16} />
            ))}

            {/* route — soft halo then crisp animated line */}
            <path d={route} fill="none" stroke="var(--accent)" strokeWidth={2.4} strokeLinecap="round" opacity={0.18} style={{ filter: 'blur(1.2px)' }} />
            <path className="jm-route" d={route} pathLength={1} fill="none" stroke={`url(#route-${uid})`} strokeWidth={0.8} strokeLinecap="round" />

            {/* waypoint glyphs (decorative; the HTML overlay carries interaction) */}
            {pts.map((p, i) => {
              const isFocus = focusIdx === i
              const r = isFocus ? 1.7 : 1.35
              return (
                <g key={i}>
                  {isFocus && <circle cx={p.x} cy={p.y} r={r + 1.4} fill="none" stroke="var(--accent)" strokeWidth={0.3} opacity={0.7} />}
                  <Glyph kind={kindFor(wps[i].name, i === peakIdx)} x={p.x} y={p.y} r={r} />
                </g>
              )
            })}
          </svg>

          {/* ── interactive overlay: one button + label per waypoint ──── */}
          <div
            className="absolute inset-0"
            role="group"
            aria-label={`${hike.name} route — ${wps.length} waypoints`}
          >
            {/* screen-reader route summary (also the text alternative for the plate) */}
            <ol className="sr-only">
              {wps.map((w, i) => (
                <li key={i}>{w.name}, {w.elev.toLocaleString()} metres{w.day ? `, ${dayLabel(w.day)}` : ''}{w.note ? `. ${w.note}` : ''}</li>
              ))}
            </ol>

            {pts.map((p, i) => {
              const w = wps[i]
              const nx = (p.x / VB_W) * 100
              const ny = (p.y / VB_H) * 100
              const isActive = activeName === w.name
              const isFocus = focusIdx === i
              const labelAbove = p.y > VB_H * 0.56
              // anchor edge labels inward so start/finish names never clip the plate
              const lx = nx < 15 ? '0%' : nx > 85 ? '-100%' : '-50%'
              return (
                <div key={i}>
                  {/* ≥44px hit target, centred on the point */}
                  <button
                    type="button"
                    onPointerEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onClick={() => toggle(w.name)}
                    aria-pressed={isActive}
                    aria-label={`${w.name}, ${w.elev.toLocaleString()} metres${w.day ? `, ${dayLabel(w.day)}` : ''}`}
                    className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg)]"
                    style={{ left: `${nx}%`, top: `${ny}%` }}
                  />
                  {/* legible HTML label pinned to the point (fixed px, not SVG units) */}
                  <span
                    className="pointer-events-none absolute whitespace-nowrap text-[0.66rem] font-semibold leading-none sm:text-[0.7rem]"
                    style={{
                      left: `${nx}%`,
                      top: `${ny}%`,
                      transform: `translate(${lx}, ${labelAbove ? 'calc(-100% - 12px)' : '12px'})`,
                      color: isFocus ? 'var(--accent)' : 'color-mix(in srgb, var(--color-fg) 82%, transparent)',
                      textShadow: '0 1px 3px var(--color-bg), 0 0 2px var(--color-bg)',
                    }}
                  >
                    {shortName(w.name)}
                  </span>
                </div>
              )
            })}

            {/* pinned tooltip for the focused waypoint (touch-friendly) */}
            {focusIdx !== null && (
              <Tooltip
                wp={wps[focusIdx]}
                nx={(pts[focusIdx].x / VB_W)}
                ny={(pts[focusIdx].y / VB_H)}
                href={dayHref ? dayHref(wps[focusIdx].day) : null}
              />
            )}
          </div>

          {/* start / end chips */}
          {!compact && (
            <>
              <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-bg/55 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-fg/60 backdrop-blur-sm">
                ▸ start
              </span>
              <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-bg/55 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-fg/60 backdrop-blur-sm">
                finish ⛰
              </span>
            </>
          )}
        </div>

        {/* ── elevation profile strip (honest + interactive) ──────────── */}
        {showElevation && (
          <div className="relative border-t border-[var(--color-border)] bg-bg/30 px-1 pt-1">
            <svg viewBox="0 0 100 20" className="block h-14 w-full" preserveAspectRatio="none" aria-hidden focusable="false">
              <defs>
                <linearGradient id={`pf-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 40%, transparent)" />
                  <stop offset="100%" stopColor="color-mix(in srgb, var(--accent) 3%, transparent)" />
                </linearGradient>
              </defs>
              <path d={profile.area} fill={`url(#pf-${uid})`} />
              <path d={profile.line} fill="none" stroke="var(--accent)" strokeWidth={0.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {/* HTML dots pinned to each waypoint on the line — survive the strip's
                non-uniform stretch, and mirror/drive the map's selection. */}
            <div className="absolute inset-x-1 top-1 bottom-0" aria-hidden>
              {profile.marks.map((m, i) => {
                const isFocus = focusIdx === i
                return (
                  <button
                    key={i}
                    type="button"
                    tabIndex={-1}
                    onPointerEnter={() => setHover(i)}
                    onClick={() => toggle(wps[i].name)}
                    className="absolute top-0 bottom-0 -translate-x-1/2"
                    style={{ left: `${m.x}%`, width: `${Math.max(9, 100 / profile.marks.length)}%` }}
                  >
                    <span
                      className="absolute block -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-[var(--color-bg)] transition-all"
                      style={{
                        left: '50%',
                        top: `${(m.y / 20) * 100}%`,
                        height: isFocus ? 9 : 5,
                        width: isFocus ? 9 : 5,
                        backgroundColor: isFocus ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 55%, var(--color-fg) 10%)',
                      }}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── stat band + legend ─────────────────────────────────────── */}
      {!compact && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <dl className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted">
            <Stat v={`${hike.distanceKm} km`} l="distance" />
            <Stat v={`${hike.days} days`} l="on trail" />
            <Stat v={`+${hike.elevationGainM.toLocaleString()} m`} l="ascent" />
            <Stat v={`${hike.maxAltitudeM.toLocaleString()} m`} l="high point" />
          </dl>
          <p className="font-mono text-[0.62rem] text-muted/70">
            elev {minE.toLocaleString()}–{maxE.toLocaleString()} m · {wps.length} waypoints
          </p>
        </div>
      )}
    </figure>
  )
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div>
      <dt className="text-base font-semibold text-fg" style={{ color: 'var(--accent)' }}>{v}</dt>
      <dd className="text-[0.62rem] uppercase tracking-[0.16em]">{l}</dd>
    </div>
  )
}

/** Popover pinned to a focused waypoint by its normalized (nx, ny) position —
 *  flips to stay inside the plate without any cursor tracking, so it is fully
 *  usable on touch. Renders the drilldown link when `href` is provided. */
function Tooltip({ wp, nx, ny, href }: { wp: HikeWaypoint; nx: number; ny: number; href: string | null }) {
  const below = ny < 0.5
  const tx = nx < 0.28 ? '0%' : nx > 0.72 ? '-100%' : '-50%'
  const ty = below ? '14px' : 'calc(-100% - 14px)'
  const label = dayLabel(wp.day)

  return (
    <div
      className="absolute z-20 w-44 max-w-[min(11rem,72vw)] rounded-lg border border-[var(--color-border)] bg-surface/95 p-2.5 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.7)] backdrop-blur-md"
      style={{ left: `${nx * 100}%`, top: `${ny * 100}%`, transform: `translate(${tx}, ${ty})` }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-sm font-semibold leading-tight">{wp.name}</p>
        <span className="shrink-0 font-mono text-[0.6rem] tabular-nums text-muted">{wp.elev.toLocaleString()} m</span>
      </div>
      {label && <p className="mt-0.5 font-mono text-[0.58rem] uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>{label}</p>}
      {wp.note && <p className="mt-1 font-sans text-[0.72rem] leading-snug text-fg/65">{wp.note}</p>}
      {href && (
        <Link
          href={href}
          className="mt-2 inline-flex items-center gap-1 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.12em] underline decoration-current/40 underline-offset-2 transition-colors hover:decoration-current"
          style={{ color: 'var(--accent)' }}
        >
          {label || 'Read'} →
        </Link>
      )}
    </div>
  )
}
