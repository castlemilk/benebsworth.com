'use client'

import type { ReactNode } from 'react'
import { accentStyle, StatChip } from './primitives'
import { DistanceIcon, AscentIcon, DescentIcon, DurationIcon, KIND_ICON, type IconKind } from './icons'

export interface StageProps {
  day?: string | number
  from?: string; to?: string
  distanceKm?: number; ascentM?: number; descentM?: number
  timeHours?: number | string
  terrain?: string
  accent?: string
  children?: ReactNode
}

export interface CheckpointProps {
  name: string
  elevM?: number
  kind?: IconKind
  note?: ReactNode
}

function fmtTime(t: number | string | undefined): string | null {
  if (t == null) return null
  if (typeof t === 'string') return t
  return `${t} h`
}

/** Wrapper: a vertical contour-spine timeline of <Stage> children. */
export function Stages({ children, accent }: { children?: ReactNode; accent?: string }) {
  return (
    <div className="not-prose my-12" style={accentStyle(accent)}>
      <ol className="relative ml-1 border-l border-[color-mix(in_srgb,var(--accent)_30%,var(--color-border))] pl-6 sm:pl-8">
        {children}
      </ol>
    </div>
  )
}

export function Stage(props: StageProps) {
  const time = fmtTime(props.timeHours)
  const label = props.day != null ? (typeof props.day === 'number' ? `Day ${props.day}` : props.day) : null
  return (
    <li className="relative mb-10 last:mb-0" style={accentStyle(props.accent)}>
      {/* node on the spine */}
      <span className="absolute -left-[calc(1.5rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-bg)] sm:-left-[calc(2rem+5px)]" style={{ backgroundColor: 'var(--accent)' }} aria-hidden />
      {label && <p className="font-mono text-[0.66rem] uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>{label}</p>}
      {(props.from || props.to) && (
        <h4 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">
          {props.from}{props.from && props.to ? ' → ' : ''}{props.to}
        </h4>
      )}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
        {props.distanceKm != null && <StatChip icon={DistanceIcon} value={`${props.distanceKm} km`} label="distance" />}
        {props.ascentM != null && <StatChip icon={AscentIcon} value={`+${props.ascentM.toLocaleString()} m`} label="ascent" />}
        {props.descentM != null && <StatChip icon={DescentIcon} value={`−${props.descentM.toLocaleString()} m`} label="descent" />}
        {time && <StatChip icon={DurationIcon} value={time} label="walking" />}
      </div>
      {props.terrain && <p className="mt-3 font-mono text-[0.72rem] text-muted">{props.terrain}</p>}
      {props.children && <div className="mt-3 [&_p]:mt-3 [&_p]:font-sans [&_p]:text-[1rem] [&_p]:leading-[1.75] [&_p]:text-fg/85">{props.children}</div>}
    </li>
  )
}

/** Inline milestone/checkpoint marker — use in prose or inside a <Stage>. */
export function Checkpoint({ name, elevM, kind = 'milestone', note }: CheckpointProps) {
  const Icon = KIND_ICON[kind] ?? KIND_ICON.milestone
  return (
    <span className="not-prose my-2 flex items-start gap-2.5 rounded-md border-l-2 py-1 pl-3" style={{ borderColor: 'var(--accent)' }}>
      <span className="mt-0.5 text-[1rem]" style={{ color: 'var(--accent)' }}><Icon /></span>
      <span className="leading-snug">
        <span className="font-display text-[0.95rem] font-semibold text-fg">{name}</span>
        {elevM != null && <span className="ml-2 font-mono text-[0.7rem] tabular-nums text-muted">{elevM.toLocaleString()} m</span>}
        {note && <span className="mt-0.5 block font-sans text-[0.85rem] leading-snug text-fg/65">{note}</span>}
      </span>
    </span>
  )
}
