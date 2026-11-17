'use client'

import { useMemo, useState } from 'react'
import { BarChart } from '@/components/charts/bar-chart'
import { Bar } from '@/components/charts/bar'
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip'
import { BarYAxis } from '@/components/charts/bar-y-axis'
import { RangeSlider } from '@/components/gamma/RangeSlider'
import type { StudyChart } from '@/lib/gen/study'
import { useReducedMotion } from './use-reduced-motion'

const TERM_COLORS = {
  movement: 'var(--chart-1)',
  compute: 'var(--chart-2)',
  overhead: 'var(--chart-4)',
} as const

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/**
 * Interactive iron-law explorer: a gamma RangeSlider scales the compute rate
 * and the bklit stacked bars recompute the sequential and overlapped bounds.
 * Baseline terms arrive via the chart manifest (movement/compute/overhead).
 */
export function IronLawExplorer({ chart }: { chart: StudyChart }) {
  const reduced = useReducedMotion()
  const base = useMemo(() => {
    const get = (key: string) => chart.series.find((s) => s.key === key)?.values[0] ?? 0
    return {
      movement: get('movement'),
      compute: get('compute'),
      overhead: get('overhead'),
    }
  }, [chart])

  const [rate, setRate] = useState(1)
  const { memBinds, tSeq, tOvl, data } = useMemo(() => {
    const compute = base.compute / rate
    const memBinds = base.movement > compute
    return {
      memBinds,
      tSeq: base.movement + compute + base.overhead,
      tOvl: Math.max(base.movement, compute) + base.overhead,
      data: [
        {
          name: 'sequential',
          movement: base.movement,
          compute,
          overhead: base.overhead,
          ovlMem: 0,
          ovlComp: 0,
        },
        {
          name: 'overlapped',
          movement: 0,
          compute: 0,
          overhead: base.overhead,
          // The overlapped row is a single dominant stage + overhead; encode
          // it as the winning term's colour so the legend stays honest.
          ovlMem: memBinds ? base.movement : 0,
          ovlComp: memBinds ? 0 : compute,
        },
      ],
    }
  }, [base, rate])

  return (
    <div>
      <div role="img" aria-label={`Iron-law timing bars at ${rate}× compute rate: sequential ${fmt(tSeq)} ms, overlapped bound ${fmt(tOvl)} ms`}>
        <BarChart
          data={data}
          xDataKey="name"
          orientation="horizontal"
          stacked
          margin={{ top: 8, right: 12, bottom: 8, left: 96 }}
          animationDuration={reduced ? 0 : 350}
        >
          <Bar dataKey="movement" fill={TERM_COLORS.movement} />
          <Bar dataKey="compute" fill={TERM_COLORS.compute} />
          <Bar dataKey="ovlMem" fill={TERM_COLORS.movement} />
          <Bar dataKey="ovlComp" fill={TERM_COLORS.compute} />
          <Bar dataKey="overhead" fill={TERM_COLORS.overhead} />
          <BarYAxis />
          <ChartTooltip />
        </BarChart>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <RangeSlider
          label="Compute-rate multiplier"
          description="Scales the arithmetic term only; bandwidth and overhead are unchanged. Watch which term binds the overlapped bound as compute improves."
          min={1}
          max={4}
          step={0.25}
          value={rate}
          onChange={setRate}
          formatValue={(v) => `${v}×`}
        />
        <dl className="grid grid-cols-3 gap-x-5 font-mono text-xs">
          <div>
            <dt className="uppercase tracking-wide text-muted-foreground">T seq</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums">{fmt(tSeq)} ms</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide text-muted-foreground">T ovl</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums">{fmt(tOvl)} ms</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide text-muted-foreground">binds</dt>
            <dd className="mt-0.5 text-base font-semibold">{memBinds ? 'memory' : 'compute'}</dd>
          </div>
        </dl>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground" aria-label="term legend">
        {chart.series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: TERM_COLORS[s.key as keyof typeof TERM_COLORS] ?? 'var(--chart-3)' }}
              aria-hidden
            />
            {s.label}: {fmt(s.values[0] / (s.key === 'compute' ? rate : 1))} ms
          </li>
        ))}
      </ul>
    </div>
  )
}
