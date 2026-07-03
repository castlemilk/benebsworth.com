import { cn } from '@/lib/utils'

export function MetricCard({
  label,
  value,
  unit,
  accent,
  className,
}: {
  label: string
  value: string | number
  unit?: string
  accent?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-muted)]',
        className,
      )}
    >
      <p className="type-label text-muted">{label}</p>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className="type-h3"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}
