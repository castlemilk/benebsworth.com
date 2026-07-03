'use client'

import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Hike, HikeWaypoint } from '@/lib/gen/content'
import { VB_W, VB_H, project, smoothPath, buildProfile, peakIndex, type Pt } from './journey-core'

/**
 * Bespoke stylized "journey map" for a hike — a hand-drawn topographic plate, not
 * a real geographic map. The route is a smooth path through the hike's normalized
 * waypoints over a faint contour/grid backdrop; each waypoint is drawn as a named
 * landmark (peak / pass / lake / hut / stop glyph, inferred from its name), and a
 * cursor-following tooltip gives the day, altitude and note. Selecting a waypoint
 * drives the gallery. An elevation-profile strip is derived from the elevations.
 *
 * Pure SVG + a little HTML overlay; theme-aware via CSS vars, per-hike accent.
 * The route draw-in animation is disabled under the global prefers-reduced-motion.
 */

type Kind = 'summit' | 'pass' | 'lake' | 'hut' | 'stop'

const PREFIX = /^(Cabane d[eu]|Col d[eu]|Lac d[eu]|Refuge d[eu]|H[oô]tel d[eu]|Mont|Mount)\s+/i
const shortName = (n: string) => n.replace(PREFIX, '')

function kindFor(name: string, isPeak: boolean): Kind {
  if (isPeak) return 'summit'
  if (/\bcol\b|\bpas\b|forcletta|\bpass\b|\bgap\b|\bbreche\b/i.test(name)) return 'pass'
  if (/\blac\b|\blake\b|\btarn\b|\bsee\b|reservoir/i.test(name)) return 'lake'
  if (/cabane|refuge|h[üu]tte|h[oô]tel|gîte|\bhut\b|\brifug/i.test(name)) return 'hut'
  return 'stop'
}

/** Tiny landmark glyph drawn in viewBox units, centred on (x, y). */
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
  const plateRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number; pw: number; ph: number } | null>(null)
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

  // cursor position in px relative to the plate (+ the plate's size), so the
  // tooltip can clamp itself fully inside the card.
  const onMove = (e: React.MouseEvent) => {
    const rect = plateRef.current?.getBoundingClientRect()
    if (!rect) return
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top, pw: rect.width, ph: rect.height })
  }

  return (
    <figure className="not-prose m-0" style={{ '--accent': accent } as CSSProperties}>
      {/* ── the map plate ───────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[radial-gradient(120%_120%_at_30%_0%,color-mix(in_srgb,var(--accent)_10%,var(--color-stage)),var(--color-stage))]">
        <div ref={plateRef} className="relative aspect-[100/74] w-full" onMouseMove={onMove} onMouseLeave={() => { setHover(null); setCursor(null) }}>
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full" role="img" aria-label={`${hike.name} route map`}>
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

            {/* stylized contour rings around the high point + the lowest valley */}
            {[3.4, 6.2, 9.4, 13].map((r, i) => (
              <ellipse key={`hi${r}`} cx={pts[peakIdx].x} cy={pts[peakIdx].y} rx={r} ry={r * 0.6} fill="none" stroke="color-mix(in srgb, var(--accent) 24%, transparent)" strokeWidth={0.18} opacity={1 - i * 0.16} />
            ))}

            {/* route — soft halo then crisp animated line */}
            <path d={route} fill="none" stroke="var(--accent)" strokeWidth={2.4} strokeLinecap="round" opacity={0.18} style={{ filter: 'blur(1.2px)' }} />
            <path className="jm-route" d={route} pathLength={1} fill="none" stroke={`url(#route-${uid})`} strokeWidth={0.8} strokeLinecap="round" />

            {/* waypoint landmarks: glyph + short name label */}
            {pts.map((p, i) => {
              const wp = wps[i]
              const isPeak = i === peakIdx
              const kind = kindFor(wp.name, isPeak)
              const isFocus = focusIdx === i
              const r = isFocus ? 1.7 : 1.35
              // label below for upper points, above for lower ones (keeps it off the line + in-bounds)
              const labelAbove = p.y > VB_H * 0.56
              const ly = labelAbove ? p.y - r - 2.4 : p.y + r + 3
              return (
                <g
                  key={i}
                  className="cursor-pointer"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                  onClick={() => select(activeName === wp.name ? null : wp.name)}
                >
                  <circle cx={p.x} cy={p.y} r={3.4} fill="transparent" />
                  {isFocus && <circle cx={p.x} cy={p.y} r={r + 1.4} fill="none" stroke="var(--accent)" strokeWidth={0.3} opacity={0.7} />}
                  <Glyph kind={kind} x={p.x} y={p.y} r={r} />
                  <text
                    x={p.x}
                    y={ly}
                    textAnchor="middle"
                    fontSize={2.05}
                    fontWeight={isFocus ? 700 : 600}
                    fill={isFocus ? 'var(--accent)' : 'color-mix(in srgb, var(--color-fg) 78%, transparent)'}
                    stroke="var(--color-bg)"
                    strokeWidth={0.5}
                    paintOrder="stroke"
                    style={{ pointerEvents: 'none' }}
                  >
                    {shortName(wp.name)}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* cursor-following tooltip, clamped inside the plate */}
          {focusIdx !== null && cursor && <Tooltip wp={wps[focusIdx]} px={cursor.x} py={cursor.y} plateW={cursor.pw} plateH={cursor.ph} />}

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

function Tooltip({ wp, px, py, plateW, plateH }: { wp: HikeWaypoint; px: number; py: number; plateW: number; plateH: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 176, h: 104 })
  // measure self so the clamp uses the real (content-dependent) size
  useLayoutEffect(() => {
    const el = ref.current
    if (el) setSize({ w: el.offsetWidth, h: el.offsetHeight })
  }, [wp.name])

  const pad = 8, gap = 14
  // prefer to the right of the cursor; flip left if it would overflow
  let left = px + gap
  if (left + size.w + pad > plateW) left = px - gap - size.w
  left = Math.max(pad, Math.min(left, plateW - size.w - pad))
  // prefer above the cursor; flip below if it would clip the top
  let top = py - gap - size.h
  if (top < pad) top = py + gap
  top = Math.max(pad, Math.min(top, plateH - size.h - pad))

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute z-10 w-44 rounded-lg border border-[var(--color-border)] bg-surface/95 p-2.5 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.7)] backdrop-blur-md"
      style={{ left, top }}
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
