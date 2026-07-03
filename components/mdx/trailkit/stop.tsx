'use client'

import type { ReactNode } from 'react'
import { TrailCard, IconPill } from './primitives'
import { KIND_ICON, WaterIcon, type IconKind } from './icons'

export interface StopProps {
  name: string
  type: 'hut' | 'rifugio' | 'camp' | 'hotel' | 'bivvy' | 'refuge'
  elevM?: number; capacity?: number
  booking?: ReactNode
  water?: boolean; meals?: boolean
  note?: ReactNode
  /** Optional thumbnail (co-located path or absolute URL) shown atop the card. */
  image?: string; alt?: string
  accent?: string
}

const TYPE_LABEL: Record<StopProps['type'], string> = {
  hut: 'Hut', rifugio: 'Rifugio', camp: 'Campsite', hotel: 'Hotel', bivvy: 'Bivvy', refuge: 'Refuge',
}

export function Stop(props: StopProps) {
  const Icon = KIND_ICON[props.type as IconKind] ?? KIND_ICON.hut
  return (
    <TrailCard accent={props.accent} className={props.image ? 'overflow-hidden p-0' : 'p-5'}>
      {props.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.image} alt={props.alt ?? props.name} className="h-36 w-full object-cover" loading="lazy" />
      )}
      <div className={props.image ? 'flex items-start gap-3 p-5' : 'flex items-start gap-3'}>
        <span className="mt-0.5 text-[1.3rem]" style={{ color: 'var(--accent)' }}><Icon /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="font-display text-base font-semibold tracking-tight text-fg">{props.name}</h4>
            {props.elevM != null && <span className="shrink-0 font-mono text-[0.7rem] tabular-nums text-muted">{props.elevM.toLocaleString()} m</span>}
          </div>
          <p className="mt-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>{TYPE_LABEL[props.type]}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {props.capacity != null && <IconPill>{props.capacity} beds</IconPill>}
            {props.water && <IconPill icon={WaterIcon}>water</IconPill>}
            {props.meals && <IconPill>meals</IconPill>}
          </div>
          {props.note && <p className="mt-3 font-sans text-[0.85rem] leading-snug text-fg/70">{props.note}</p>}
          {props.booking && <p className="mt-2 font-mono text-[0.7rem] text-muted">Booking: <span className="text-fg/75">{props.booking}</span></p>}
        </div>
      </div>
    </TrailCard>
  )
}
