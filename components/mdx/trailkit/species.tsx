'use client'

import type { ReactNode } from 'react'
import { TrailCard, IconPill } from './primitives'
import { LeafIcon, TrackIcon } from './icons'

export interface SpeciesProps {
  name: string; latin?: string
  when?: string; where?: string
  image?: string; alt?: string
  likelihood?: 'common' | 'occasional' | 'rare'
  accent?: string
  children?: ReactNode
}

function SpeciesCard({ kind, props }: { kind: 'flora' | 'fauna'; props: SpeciesProps }) {
  const Icon = kind === 'flora' ? LeafIcon : TrackIcon
  return (
    <TrailCard accent={props.accent} className="overflow-hidden p-0">
      {props.image && <img src={props.image} alt={props.alt ?? props.name} className="h-40 w-full object-cover" loading="lazy" />}
      <div className="p-5">
        <div className="flex items-center gap-2.5">
          <span className="text-[1.15rem]" style={{ color: 'var(--accent)' }}><Icon /></span>
          <div>
            <h4 className="font-display text-base font-semibold leading-tight tracking-tight text-fg">{props.name}</h4>
            {props.latin && <p className="font-sans text-[0.78rem] italic text-muted">{props.latin}</p>}
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {props.likelihood && <IconPill>{props.likelihood}</IconPill>}
          {props.when && <IconPill>{props.when}</IconPill>}
          {props.where && <IconPill>{props.where}</IconPill>}
        </div>
        {props.children && <div className="mt-3 [&_p]:font-sans [&_p]:text-[0.85rem] [&_p]:leading-snug [&_p]:text-fg/70">{props.children}</div>}
      </div>
    </TrailCard>
  )
}

export function Flora(props: SpeciesProps) { return <SpeciesCard kind="flora" props={props} /> }
export function Fauna(props: SpeciesProps) { return <SpeciesCard kind="fauna" props={props} /> }
