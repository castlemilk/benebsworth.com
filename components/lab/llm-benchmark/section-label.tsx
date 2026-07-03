import { BENCH_ACCENT } from './bench-theme'

/**
 * Numbered section header — matches the site's editorial idiom (accent index +
 * title + hairline rule) used on /hiking, giving the benchmark section its own
 * accent instead of borrowing --color-project.
 */
export function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted">
      <span className="accent-ink" style={{ '--ink': BENCH_ACCENT } as React.CSSProperties}>
        {index}
      </span>
      <span>{children}</span>
      <span className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  )
}
