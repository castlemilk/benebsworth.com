import { cn } from '@/lib/utils'
import { isFallbackCheck } from '@/lib/lab/llm-benchmark/types'
import type { IterationCheckResult } from '@/lib/lab/llm-benchmark/types'

/**
 * Compact per-iteration behavioural check indicator. Aggregates the
 * check outcomes across a record's successful iterations into one pill
 * per named check — "jump ✓ 3/5", "advance ✗ 0/5" — so a reader can see
 * at a glance WHICH behaviour a model failed to deliver (e.g. the
 * platformer's Space-dispatch) rather than only the 30/100 it scored.
 *
 * Colour is a pass band (green all / amber some / rose none); the numeric
 * count is always shown, so identity never rests on colour alone. The
 * tooltip carries the first failing detail plus the per-iteration pass
 * pattern.
 */
export function IterationChecks({
  results,
  className,
}: {
  /** Per-iteration check lists, aligned with iterationScores. */
  results: IterationCheckResult[][]
  className?: string
}) {
  if (results.length === 0) return null

  const names: string[] = []
  for (const it of results) {
    for (const c of it) {
      if (!names.includes(c.name)) names.push(c.name)
    }
  }
  if (names.length === 0) return null

  const rows = names.map((name) => {
    let passed = 0
    let total = 0
    let firstFailDetail: string | undefined
    let points = 0
    let maxPoints = 0
    let fallback = false
    for (const it of results) {
      for (const c of it) {
        if (c.name !== name) continue
        total++
        if (isFallbackCheck(c)) fallback = true
        if (c.passed) passed++
        else if (!firstFailDetail) firstFailDetail = c.detail
        points += c.points
        maxPoints += c.maxPoints
      }
    }
    return { name, passed, total, firstFailDetail, points, maxPoints, fallback }
  })

  return (
    <div className={cn('mt-1 flex flex-wrap gap-1', className)}>
      {rows.map((row) => {
        const all = row.passed === row.total
        const none = row.passed === 0
        // A FALLBACK row is the harness saying it could not judge this
        // artifact — not a check the model failed. Rose would read as a model
        // defect, so it renders MUTED, and the tooltip says so in words rather
        // than leaving the colour to carry the meaning.
        const tooltip = row.fallback
          ? `${row.name}: the harness could not score this artifact (0 of 0 pts — not a model failure)${row.firstFailDetail ? ` — ${row.firstFailDetail}` : ''}`
          : `${row.name}: ${row.passed}/${row.total} iterations passed (${row.points}/${row.maxPoints} pts)${row.firstFailDetail ? ` — first failure: ${row.firstFailDetail}` : ''}`
        return (
          <span
            key={row.name}
            title={tooltip}
            aria-label={tooltip}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[10px] leading-4',
              row.fallback
                ? 'border-muted-foreground/30 bg-muted/40 text-muted-foreground'
                : all
                  ? 'border-emerald-600/40 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400'
                  : none
                    ? 'border-rose-600/40 bg-rose-600/10 text-rose-600 dark:text-rose-400'
                    : 'border-amber-600/40 bg-amber-600/10 text-amber-600 dark:text-amber-400',
            )}
          >
            <span className="max-w-[10rem] truncate" title={row.name}>
              {row.name}
            </span>
            <span className="tabular-nums opacity-70">
              {row.fallback ? 'n/a' : `${row.passed}/${row.total}`}
            </span>
          </span>
        )
      })}
    </div>
  )
}
