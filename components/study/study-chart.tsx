'use client'

import { useMemo } from 'react'
import { LineChart, Line } from '@/components/charts/line-chart'
import { BarChart } from '@/components/charts/bar-chart'
import { Bar } from '@/components/charts/bar'
import { Grid } from '@/components/charts/grid'
import { XAxis } from '@/components/charts/x-axis'
import { BarYAxis } from '@/components/charts/bar-y-axis'
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip'
import { ChartKind, type StudyChart } from '@/lib/gen/study'
import { IronLawExplorer } from './iron-law-explorer'
import { useReducedMotion } from './use-reduced-motion'

/**
 * Renders a StudyChart (proto) onto the vendored bklit primitives in
 * components/charts. Title/caption stay with the page — this is only the
 * interactive chart surface.
 */
export function StudyChartFigure({ chart }: { chart: StudyChart }) {
  if (chart.kind === ChartKind.IRON_LAW_EXPLORER) return <IronLawExplorer chart={chart} />
  if (chart.kind === ChartKind.LINE) return <LineFigure chart={chart} />
  if (chart.kind === ChartKind.BAR_STACKED) return <StackedBarFigure chart={chart} />
  return null
}

function LineFigure({ chart }: { chart: StudyChart }) {
  const reduced = useReducedMotion()
  const data = useMemo(
    () =>
      chart.xPoints.map((x, i) => {
        const row: Record<string, unknown> = { date: new Date(x) }
        for (const s of chart.series) row[s.key] = s.values[i]
        return row
      }),
    [chart],
  )
  return (
    <div role="img" aria-label={`${chart.title}: line chart, ${chart.yLabel} over ${chart.xLabel}`}>
      <LineChart
        data={data}
        xDataKey="date"
        margin={{ top: 12, right: 12, bottom: 24, left: 8 }}
        animationDuration={reduced ? 0 : 900}
      >
        <Grid horizontal />
        {chart.series.map((s) => (
          <Line key={s.key} dataKey={s.key} stroke={s.color || undefined} strokeWidth={2.5} />
        ))}
        <XAxis />
        <ChartTooltip />
      </LineChart>
      <SeriesLegend chart={chart} />
    </div>
  )
}

function StackedBarFigure({ chart }: { chart: StudyChart }) {
  const reduced = useReducedMotion()
  const data = useMemo(
    () =>
      chart.xPoints.map((name, i) => {
        const row: Record<string, unknown> = { name }
        for (const s of chart.series) row[s.key] = s.values[i]
        return row
      }),
    [chart],
  )
  return (
    <div role="img" aria-label={`${chart.title}: stacked bar chart in ${chart.yLabel}`}>
      <BarChart
        data={data}
        xDataKey="name"
        orientation="horizontal"
        stacked
        margin={{ top: 8, right: 12, bottom: 8, left: 96 }}
        animationDuration={reduced ? 0 : 900}
      >
        {chart.series.map((s) => (
          <Bar key={s.key} dataKey={s.key} fill={s.color || undefined} />
        ))}
        <BarYAxis />
        <ChartTooltip />
      </BarChart>
      <SeriesLegend chart={chart} />
    </div>
  )
}

export function SeriesLegend({ chart }: { chart: StudyChart }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground" aria-label="series legend">
      {chart.series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color || 'var(--chart-1)' }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  )
}
