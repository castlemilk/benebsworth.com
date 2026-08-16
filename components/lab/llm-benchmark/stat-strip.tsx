import type { ModelCompletion } from '@/lib/lab/llm-benchmark/analytics'
import { formatCost } from './format'

/**
 * Compact completion + value strip for a model — `3/8 done · 4 timeouts · $0.02`.
 *
 * The score alone can't tell a reader whether a 53 came off a full board or
 * three finished tasks out of eight, so this sits next to the score on the
 * model cards and under the model name on the model page.
 *
 * Rules:
 *  - Zero-valued segments are omitted (a model with no timeouts doesn't say
 *    "0 timeouts"; a free-tier model shows no cost at all). The `x/y done`
 *    segment is always present once anything ran.
 *  - A model with no LIVE results (never swept, or seeded sample data only —
 *    `modelCompletion` drops seeded records) renders "no runs yet" rather than
 *    a misleading `0/8 done`.
 *  - Cost-per-point only appears when there was real spend; on a free tier it
 *    is 0 and says nothing.
 *
 * Layout is flex-wrap with no fixed widths, so the segments reflow onto a
 * second line on a narrow card instead of overflowing.
 */
export function StatStrip({
  stats,
  className = '',
}: {
  stats: ModelCompletion
  className?: string
}) {
  const segments: string[] = []

  if (stats.attempted > 0) {
    segments.push(`${stats.tasksDone}/${stats.tasksTotal} done`)
    if (stats.timeouts > 0) {
      segments.push(`${stats.timeouts} ${stats.timeouts === 1 ? 'timeout' : 'timeouts'}`)
    }
    if (stats.totalCostUsd > 0) {
      segments.push(formatCost(stats.totalCostUsd))
      segments.push(`${formatCost(stats.costPerPoint)}/pt`)
    }
  } else {
    segments.push('no runs yet')
  }

  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted ${className}`}
    >
      {segments.map((segment, i) => (
        <span key={segment} className="flex items-center gap-2">
          {i > 0 && (
            <span aria-hidden className="text-fg/25">
              ·
            </span>
          )}
          {segment}
        </span>
      ))}
    </p>
  )
}
