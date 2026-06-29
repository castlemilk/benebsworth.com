'use client'

import type { ReactNode } from 'react'
import { TrailCard, IconPill } from './primitives'
import { StarIcon, DistanceIcon, AscentIcon, DurationIcon, ExposureIcon } from './icons'

export interface QuestProps {
  title: string
  extraKm?: number; extraAscentM?: number; extraTimeHours?: number | string
  payoff?: ReactNode
  difficultyDelta?: 'same' | 'harder' | 'much-harder'
  optional?: boolean
  accent?: string
  children?: ReactNode
}

const DELTA_LABEL: Record<NonNullable<QuestProps['difficultyDelta']>, string> = {
  same: 'no harder', harder: 'harder', 'much-harder': 'much harder',
}

export function Quest(props: QuestProps) {
  const optional = props.optional ?? true
  const time = props.extraTimeHours == null ? null : typeof props.extraTimeHours === 'string' ? props.extraTimeHours : `+${props.extraTimeHours} h`
  return (
    <TrailCard accent={props.accent} motif className="my-10 p-6">
      <div className="flex items-center gap-2.5">
        <span className="text-[1.25rem]" style={{ color: 'var(--accent)' }}><StarIcon /></span>
        <p className="font-mono text-[0.64rem] uppercase tracking-[0.22em]" style={{ color: 'var(--accent)' }}>
          Side-quest{optional ? ' · optional' : ''}
        </p>
      </div>
      <h4 className="mt-2 font-display text-xl font-semibold tracking-tight text-fg">{props.title}</h4>

      <div className="mt-4 flex flex-wrap gap-2">
        {props.extraKm != null && <IconPill icon={DistanceIcon}>+{props.extraKm} km</IconPill>}
        {props.extraAscentM != null && <IconPill icon={AscentIcon}>+{props.extraAscentM.toLocaleString()} m</IconPill>}
        {time && <IconPill icon={DurationIcon}>{time}</IconPill>}
        {props.difficultyDelta && <IconPill icon={ExposureIcon}>{DELTA_LABEL[props.difficultyDelta]}</IconPill>}
      </div>

      {props.children && <div className="mt-4 [&_p]:font-sans [&_p]:text-[0.95rem] [&_p]:leading-[1.7] [&_p]:text-fg/80">{props.children}</div>}
      {props.payoff && (
        <p className="mt-4 border-t border-[var(--color-border)] pt-3 font-sans text-[0.9rem] leading-snug text-fg/75">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Payoff </span>
          {props.payoff}
        </p>
      )}
    </TrailCard>
  )
}
