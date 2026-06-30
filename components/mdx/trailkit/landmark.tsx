'use client'

import type { ReactNode } from 'react'
import { TrailCard, IconPill } from './primitives'
import { KIND_ICON, CompassIcon, AltitudeIcon, type IconKind } from './icons'

export interface LandmarkProps {
  name: string
  kind?: 'summit' | 'gorge' | 'lake' | 'pass' | 'monument' | 'glacier' | 'viewpoint'
  elevM?: number; bearing?: string
  image?: string; alt?: string
  accent?: string
  children?: ReactNode
}

export function Landmark(props: LandmarkProps) {
  const Icon = (props.kind && KIND_ICON[props.kind as IconKind]) || KIND_ICON.viewpoint
  return (
    <TrailCard accent={props.accent} motif className="p-0">
      {/* real photo, else the muted brandbrain default-art fallback */}
      <img
        src={props.image || '/trailkit/default-landmark.webp'}
        alt={props.image ? props.alt ?? props.name : ''}
        aria-hidden={props.image ? undefined : true}
        className="h-44 w-full object-cover"
        loading="lazy"
      />
      <div className="p-5">
        <div className="flex items-center gap-2.5">
          <span className="text-[1.2rem]" style={{ color: 'var(--accent)' }}><Icon /></span>
          <h4 className="font-display text-base font-semibold tracking-tight text-fg">{props.name}</h4>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {props.elevM != null && <IconPill icon={AltitudeIcon}>{props.elevM.toLocaleString()} m</IconPill>}
          {props.bearing && <IconPill icon={CompassIcon}>{props.bearing}</IconPill>}
        </div>
        {props.children && <div className="mt-3 [&_p]:font-sans [&_p]:text-[0.9rem] [&_p]:leading-relaxed [&_p]:text-fg/75">{props.children}</div>}
      </div>
    </TrailCard>
  )
}
