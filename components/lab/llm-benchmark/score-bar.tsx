import { cn } from '@/lib/utils'
import { scoreColors } from './bench-theme'
import { formatScore } from './format'

/**
 * A compact 0-100 score cell: a filled track plus the numeric value.
 * Presentational and hook-free, so it renders in both server and client
 * components. Colour is a status band; the number is always shown, so
 * identity never rests on colour alone.
 */
export function ScoreBar({
  score,
  width = 'w-full',
  showValue = true,
  className,
}: {
  score: number
  /** track width utility (e.g. 'w-full', 'w-24') */
  width?: string
  showValue?: boolean
  className?: string
}) {
  const { text, fill } = scoreColors(score)
  const pct = Math.max(0, Math.min(100, score))
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'relative h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]',
          width,
        )}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: fill }}
        />
      </div>
      {showValue && (
        <span className={cn('shrink-0 font-mono text-[0.8rem] font-semibold tabular-nums', text)}>
          {formatScore(score)}
        </span>
      )}
    </div>
  )
}
