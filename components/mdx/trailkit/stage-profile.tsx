'use client'

import { useId, type CSSProperties } from 'react'
import { smoothPath, type Pt } from '@/components/hiking/journey-core'
import { KIND_ICON, type IconKind } from './icons'
import { accentStyle } from './primitives'

export interface ProfilePoint {
  /** Short label, e.g. "La Barma" or "Col de Prafleuri" — keep it tight, it sits under the point. */
  name: string
  elevM: number
  /** Icon + above/below placement driver. Passes/summits sit at peaks (label above); huts/villages/lakes in troughs (label below). */
  kind?: IconKind
  /** Tiny note under the label, e.g. "gondola", "swim", "night". */
  via?: string
}

const ABOVE = new Set<IconKind>(['pass', 'summit', 'viewpoint', 'glacier', 'monument'])

/**
 * A per-day route profile — the site's answer to the guide's evening whiteboard
 * sketch: the day's up-and-over elevation line with each village, hut, pass and
 * lake pinned at its height. SVG draws the ridge + area (stretched to width with
 * a non-scaling stroke); an HTML overlay pins an icon + name + altitude on each
 * point, peaks labelled above and valleys below. Drop one at the top of a <Stage>.
 */
export function StageProfile({ points, accent }: { points: ProfilePoint[]; accent?: string }) {
  const uid = useId().replace(/:/g, '')
  if (!points || points.length < 2) return null

  const W = 1000, H = 440, padX = 70, padTop = 118, padBot = 182
  const elevs = points.map((p) => p.elevM)
  const minE = Math.min(...elevs), maxE = Math.max(...elevs)
  const span = Math.max(1, maxE - minE)
  const n = points.length
  const peakIdx = elevs.indexOf(maxE)

  // Stagger consecutive labels into two lanes (per side) so neighbours never
  // collide at a narrow width (the 7-point days on mobile are the stress case).
  let belowN = 0
  let aboveN = 0
  const xy: (Pt & { p: ProfilePoint; above: boolean; lane: number })[] = points.map((p, i) => {
    const above = ABOVE.has((p.kind ?? 'milestone') as IconKind)
    const lane = above ? aboveN++ % 2 : belowN++ % 2
    return {
      x: padX + (i / (n - 1)) * (W - 2 * padX),
      y: padTop + (1 - (p.elevM - minE) / span) * (H - padTop - padBot),
      p,
      above,
      lane,
    }
  })
  const line = smoothPath(xy)
  const baseY = H - padBot + 8
  const area = `${line} L ${xy[n - 1].x.toFixed(1)} ${baseY} L ${xy[0].x.toFixed(1)} ${baseY} Z`

  const srSummary = points
    .map((p) => `${p.name} ${p.elevM.toLocaleString()} m${p.via ? ` (${p.via})` : ''}`)
    .join(' → ')

  return (
    <figure className="not-prose my-5" style={accentStyle(accent)}>
      <figcaption className="sr-only">Elevation profile: {srSummary}.</figcaption>
      <div className="relative w-full overflow-hidden rounded-[0.625rem] border border-[var(--color-border)] bg-[radial-gradient(120%_140%_at_50%_-10%,color-mix(in_srgb,var(--accent)_8%,var(--color-stage)),var(--color-stage))]">
        {/* aspect-locked stage for the SVG + overlay to share a coordinate space;
            a min-height keeps the labels from crushing on narrow phones */}
        <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}`, minHeight: '224px' }}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden focusable="false">
            <defs>
              <linearGradient id={`sp-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 30%, transparent)" />
                <stop offset="100%" stopColor="color-mix(in srgb, var(--accent) 2%, transparent)" />
              </linearGradient>
            </defs>
            {/* faint baseline */}
            <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="color-mix(in srgb, var(--color-fg) 12%, transparent)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <path d={area} fill={`url(#sp-fill-${uid})`} />
            <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* overlay: dots + labels pinned by percentage of the shared box
              (aria-hidden — the sr-only figcaption above is the text alternative) */}
          <div className="absolute inset-0" aria-hidden>
            {xy.map(({ x, y, p, above, lane }, i) => {
              const left = `${(x / W) * 100}%`
              const top = `${(y / H) * 100}%`
              const Icon = KIND_ICON[(p.kind ?? 'milestone') as IconKind] ?? KIND_ICON.milestone
              const isPeak = i === peakIdx
              // anchor the end labels inward so they never clip the card edge
              const tx = i === 0 ? '0%' : i === n - 1 ? '-100%' : '-50%'
              const align = i === 0 ? 'items-start text-left' : i === n - 1 ? 'items-end text-right' : 'items-center text-center'
              const lanePx = lane * 34
              const ty = above ? `calc(-100% - ${11 + lanePx}px)` : `${12 + lanePx}px`
              return (
                <div key={i}>
                  {/* dot on the ridge */}
                  <span
                    className="absolute z-10 block h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--color-bg)]"
                    style={{ left, top, backgroundColor: 'var(--accent)' }}
                  />
                  {/* label, pushed clear of the line (above for peaks, below for valleys), two-lane staggered */}
                  <div
                    className={`absolute z-20 flex w-[104px] flex-col gap-0.5 leading-none ${align}`}
                    style={{ left, top, transform: `translate(${tx}, ${ty})` }}
                  >
                    {above && (
                      <span className="text-[0.85rem]" style={{ color: 'var(--accent)' }}><Icon /></span>
                    )}
                    <span className="font-display text-[0.66rem] font-semibold tracking-tight text-fg">{p.name}</span>
                    <span className="font-mono text-[0.58rem] tabular-nums" style={{ color: isPeak ? 'var(--accent)' : 'color-mix(in srgb, var(--color-fg) 55%, transparent)' }}>
                      {p.elevM.toLocaleString()} m
                    </span>
                    {p.via && <span className="font-mono text-[0.52rem] uppercase tracking-[0.1em] text-muted">{p.via}</span>}
                    {!above && (
                      <span className="text-[0.85rem]" style={{ color: 'var(--accent)' }}><Icon /></span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </figure>
  )
}
