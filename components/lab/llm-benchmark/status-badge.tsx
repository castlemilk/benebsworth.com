'use client'

import { CheckCircle2, XCircle, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BenchmarkStatus } from '@/lib/lab/llm-benchmark/types'

const STATUS_CONFIG: Record<
  BenchmarkStatus,
  { label: string; icon: typeof CheckCircle2; color: string; bg: string }
> = {
  success: {
    label: 'Pass',
    icon: CheckCircle2,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
  },
  fail: {
    label: 'Fail',
    icon: XCircle,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
  },
  timeout: {
    label: 'Timeout',
    icon: Timer,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
  },
}

export function StatusBadge({
  status,
  className,
}: {
  status: BenchmarkStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider',
        className,
      )}
      style={{
        color: config.color,
        backgroundColor: config.bg,
        borderColor: `color-mix(in srgb, ${config.color} 35%, transparent)`,
      }}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {config.label}
    </span>
  )
}
