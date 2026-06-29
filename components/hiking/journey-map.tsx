'use client'

import { useId, useMemo, useState, type CSSProperties } from 'react'
import type { Hike, HikeWaypoint } from '@/lib/gen/content'
import { VB_W, VB_H, project, smoothPath, buildProfile, peakIndex, type Pt } from './journey-core'

/**
 * Bespoke stylized "journey map" for a hike — a hand-drawn topographic plate, not
 * a real geographic map. The route is a smooth path through the hike's normalized
 * waypoints over a faint contour/grid backdrop; numbered markers (peak triangle on
 * the high point) are hoverable (tooltip) and selectable (drives the gallery). An
 * elevation-profile strip is derived from the waypoint elevations.
 *
 * Pure SVG + a little HTML overlay; theme-aware via CSS vars, per-hike accent.
 * The route draw-in animation is disabled under the global prefers-reduced-motion.
 */

export function JourneyMap({
  hike,
  active,
  onSelect,
  compact = false,
  showElevation = true,
}: {
  hike: Hike
  active?: string | null
  onSelect?: (name: string | null) => void
  /** glyph mode: hides start/end chips + stat band, tightens the plate */
  compact?: boolean
  /** show the elevation-profile strip (default true) */
  showElevation?: boolean
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
  const focus = hover ?? wps.findIndex((w) => w.name === activeName)
  const focusIdx = focus >= 0 ? focus : null

  return (
    <figure className="not-prose m-0" style={{ '--accent': accent } as CSSProperties}>
      {/* ── the map plate ───────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[radial-gradient(120%_120%_at_30%_0%,color-mix(in_srgb,var(--accent)_10%,var(--color-stage)),var(--color-stage))]">
        <div className="relative aspect-[100/62] w-full">
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full" role="img" aria-label={`${hike.name} route map`}>
            <defs>
              <pattern id={`grid-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M5 0H0V5" fill="none" stroke="color-mix(in srgb, var(--color-fg) 9%, transparent)" strokeWidth="0.15" />
              </pattern>
              <radialGradient id={`mask-${uid}`}>
                <stop offset="60%" stopColor="white" />
                <stop offset="100%" stopColor="black" />
              </radialGradient>
              <mask id={`fade-${uid}`}>
                <rect width={VB_W} height={VB_H} fill={`url(#mask-${uid})`} />
              </mask>
              <linearGradient id={`route-${uid}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 55%, var(--color-fg))" />
                <stop offset="100%" stopColor="var(--accent)" />
              </linearGradient>
            </defs>

            {/* grid backdrop, vignetted */}
            <rect width={VB_W} height={VB_H} fill={`url(#grid-${uid})`} mask={`url(#fade-${uid})`} />

            {/* stylized contour rings around the high point */}
            {[3.2, 5.6, 8.4, 11.6].map((r, i) => (
              <ellipse
                key={r}
                cx={pts[peakIdx].x}
                cy={pts[peakIdx].y}
                rx={r}
                ry={r * 0.62}
                fill="none"
                stroke="color-mix(in srgb, var(--accent) 22%, transparent)"
                strokeWidth={0.18}
                opacity={1 - i * 0.18}
              />
            ))}

            {/* route — soft halo then crisp animated line */}
            <path d={route} fill="none" stroke="var(--accent)" strokeWidth={2.4} strokeLinecap="round" opacity={0.18} style={{ filter: 'blur(1.2px)' }} />
            <path
              className="jm-route"
              d={route}
              pathLength={1}
              fill="none"
              stroke={`url(#route-${uid})`}
              strokeWidth={0.8}
              strokeLinecap="round"
            />

            {/* waypoint markers */}
            {pts.map((p, i) => {
              const isPeak = i === peakIdx
              const isFocus = focusIdx === i
              const r = isFocus ? 1.9 : 1.5
              return (
                <g
                  key={i}
                  className="cursor-pointer"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                  onClick={() => select(activeName === wps[i].name ? null : wps[i].name)}
                >
                  {/* hit area */}
                  <circle cx={p.x} cy={p.y} r={3.4} fill="transparent" />
                  {isPeak ? (
                    <path
                      d={`M ${p.x} ${p.y - r * 1.5} L ${p.x + r * 1.3} ${p.y + r} L ${p.x - r * 1.3} ${p.y + r} Z`}
                      fill="var(--accent)"
                      stroke="var(--color-bg)"
                      strokeWidth={0.25}
                    />
                  ) : (
                    <circle cx={p.x} cy={p.y} r={r} fill="var(--accent)" stroke="var(--color-bg)" strokeWidth={0.3} />
                  )}
                  {isFocus && (
                    <circle cx={p.x} cy={p.y} r={r + 1.1} fill="none" stroke="var(--accent)" strokeWidth={0.3} opacity={0.7} />
                  )}
                  <text
                    x={p.x}
                    y={p.y + (isPeak ? -r * 2 : -r - 1)}
                    textAnchor="middle"
                    fontSize={2.1}
                    fontWeight={700}
                    fill="color-mix(in srgb, var(--color-fg) 80%, transparent)"
                    style={{ pointerEvents: 'none' }}
                  >
                    {i + 1}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* hover tooltip (HTML overlay; aligned to viewBox via %) */}
          {focusIdx !== null && (
            <Tooltip wp={wps[focusIdx]} pt={pts[focusIdx]} />
          )}

          {/* start / end chips */}
          {!compact && (
            <>
              <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-bg/55 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-fg/60 backdrop-blur-sm">
                ▸ {wps[0]?.name}
              </span>
              <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-bg/55 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-fg/60 backdrop-blur-sm">
                {wps[wps.length - 1]?.name} ⛰
              </span>
            </>
          )}
        </div>

        {/* ── elevation profile strip ───────────────────────────────── */}
        {showElevation && (
          <div className="border-t border-[var(--color-border)] bg-bg/30 px-1 pt-1">
            <svg viewBox="0 0 100 20" className="h-12 w-full" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id={`pf-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 40%, transparent)" />
                  <stop offset="100%" stopColor="color-mix(in srgb, var(--accent) 3%, transparent)" />
                </linearGradient>
              </defs>
              <path d={`${profile.area}`} fill={`url(#pf-${uid})`} />
              <path d={`${profile.line}`} fill="none" stroke="var(--accent)" strokeWidth={0.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {profile.marks.map((m, i) => (
                <line key={i} x1={m.x} y1={m.y} x2={m.x} y2={20} stroke="color-mix(in srgb, var(--color-fg) 14%, transparent)" strokeWidth={0.2} vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
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

function Tooltip({ wp, pt }: { wp: HikeWaypoint; pt: Pt }) {
  const left = `${pt.x}%`
  const top = `${(pt.y / VB_H) * 100}%`
  const flip = pt.x > 62
  return (
    <div
      className="pointer-events-none absolute z-10 w-44 -translate-y-[calc(100%+10px)] rounded-lg border border-[var(--color-border)] bg-surface/95 p-2.5 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.7)] backdrop-blur-md"
      style={{ left, top, transform: `translate(${flip ? '-90%' : '-10%'}, calc(-100% - 10px))` }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-sm font-semibold leading-tight">{wp.name}</p>
        <span className="shrink-0 font-mono text-[0.6rem] tabular-nums text-muted">{wp.elev.toLocaleString()} m</span>
      </div>
      {wp.day && <p className="mt-0.5 font-mono text-[0.58rem] uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>{wp.day}</p>}
      {wp.note && <p className="mt-1 font-sans text-[0.72rem] leading-snug text-fg/65">{wp.note}</p>}
    </div>
  )
}

