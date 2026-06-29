'use client'

import { useState } from 'react'
import { Reveal } from '@/components/motion/reveal'
import { TrailCard, SectionLabel, StatChip, IconPill, accentStyle } from './primitives'
import { DistanceIcon, DurationIcon, AscentIcon, AltitudeIcon, BootIcon, SeasonIcon, PackIcon } from './icons'
import { deriveDifficulty, DIFFICULTY_LABEL, DIFFICULTY_VAR, type Difficulty } from './difficulty'
import { getHikeDefaults } from './hike-binding'
import { TrailMap } from './trail-map'

export interface TrailSummaryProps {
  hike?: string
  title?: string; region?: string; country?: string
  distanceKm?: number; days?: number; elevationGainM?: number; maxAltitudeM?: number
  difficulty?: Difficulty; season?: string; gearClass?: string
  accent?: string
  /** show the inline mini route map (needs a bound hike or waypoints) */
  map?: boolean
}

export function TrailSummary(props: TrailSummaryProps) {
  const bound = getHikeDefaults(props.hike)
  const [open, setOpen] = useState(false)

  const distanceKm = props.distanceKm ?? bound?.distanceKm ?? 0
  const days = props.days ?? bound?.days ?? 0
  const elevationGainM = props.elevationGainM ?? bound?.elevationGainM ?? 0
  const maxAltitudeM = props.maxAltitudeM ?? bound?.maxAltitudeM ?? 0
  const title = props.title ?? bound?.name ?? 'The route'
  const region = props.region ?? bound?.region
  const country = props.country ?? bound?.country
  const accent = props.accent ?? bound?.accent

  const difficulty = props.difficulty ?? deriveDifficulty({ distanceKm, days, elevationGainM, maxAltitudeM })
  const perDayKm = days ? Math.round((distanceKm / days) * 10) / 10 : null
  const perDayAscent = days ? Math.round(elevationGainM / days) : null

  return (
    <Reveal>
      <TrailCard accent={accent} motif className="my-12 p-6 sm:p-8">
        <SectionLabel>Trail summary</SectionLabel>
        <h3 className="mt-2 font-display text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] font-semibold tracking-tight text-fg">{title}</h3>
        {(region || country) && (
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-muted">{[region, country].filter(Boolean).join(' · ')}</p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <StatChip icon={DistanceIcon} value={`${distanceKm} km`} label="distance" />
          <StatChip icon={DurationIcon} value={`${days} days`} label="on trail" />
          <StatChip icon={AscentIcon} value={`+${elevationGainM.toLocaleString()} m`} label="ascent" />
          <StatChip icon={AltitudeIcon} value={`${maxAltitudeM.toLocaleString()} m`} label="high point" />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2" style={accentStyle(accent)}>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.66rem] font-semibold uppercase tracking-[0.12em]"
            style={{ backgroundColor: `color-mix(in srgb, ${DIFFICULTY_VAR[difficulty]} 16%, transparent)`, color: DIFFICULTY_VAR[difficulty] }}
          >
            <BootIcon /> {DIFFICULTY_LABEL[difficulty]}
          </span>
          {props.season && <IconPill icon={SeasonIcon}>{props.season}</IconPill>}
          {props.gearClass && <IconPill icon={PackIcon}>{props.gearClass}</IconPill>}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="ml-auto font-mono text-[0.66rem] uppercase tracking-[0.16em] text-muted underline decoration-fg/20 underline-offset-4 transition-colors hover:text-fg"
            aria-expanded={open}
          >
            {open ? 'less' : 'more'}
          </button>
        </div>

        {open && (
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[var(--color-border)] pt-5 font-mono text-xs sm:grid-cols-3">
            {perDayKm !== null && (
              <div><dt className="text-muted">avg / day</dt><dd className="mt-0.5 font-display text-base font-semibold text-fg">{perDayKm} km</dd></div>
            )}
            {perDayAscent !== null && (
              <div><dt className="text-muted">ascent / day</dt><dd className="mt-0.5 font-display text-base font-semibold text-fg">+{perDayAscent.toLocaleString()} m</dd></div>
            )}
            <div><dt className="text-muted">difficulty</dt><dd className="mt-0.5 font-display text-base font-semibold text-fg">{DIFFICULTY_LABEL[difficulty]}</dd></div>
          </dl>
        )}

        {props.map && (props.hike || bound) && (
          <div className="mt-6">
            <TrailMap hike={props.hike} accent={accent} compact showElevation />
          </div>
        )}
      </TrailCard>
    </Reveal>
  )
}
