import { CheckCircle2, XCircle, Timer, CircleDashed } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BenchmarkStatus } from '@/lib/lab/llm-benchmark/types'

// Text colour uses paired Tailwind classes (light + dark) so it clears WCAG AA
// in both themes; the raw hex is used only for the translucent tint/border.
const STATUS_CONFIG: Record<
  BenchmarkStatus,
  { label: string; icon: typeof CheckCircle2; text: string; tint: string }
> = {
  success: { label: 'Pass', icon: CheckCircle2, text: 'text-emerald-700 dark:text-emerald-300', tint: '#10b981' },
  partial: { label: 'Partial', icon: CircleDashed, text: 'text-amber-700 dark:text-amber-300', tint: '#f59e0b' },
  timeout: { label: 'Timeout', icon: Timer, text: 'text-amber-700 dark:text-amber-300', tint: '#f59e0b' },
  fail: { label: 'Fail', icon: XCircle, text: 'text-rose-700 dark:text-rose-300', tint: '#f43f5e' },
}

export function StatusBadge({
  status,
  className,
}: {
  status: BenchmarkStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.fail
  const Icon = config.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider',
        config.text,
        className,
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${config.tint} 12%, transparent)`,
        borderColor: `color-mix(in srgb, ${config.tint} 35%, transparent)`,
      }}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {config.label}
    </span>
  )
}
