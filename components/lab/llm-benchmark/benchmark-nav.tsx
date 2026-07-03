'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Cpu, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BENCHMARK_CATEGORIES, BENCHMARK_MODELS } from '@/lib/lab/llm-benchmark/registry'
import {
  BENCHMARK_BASE_PATH,
  categoryPath,
  modelIndexPath,
} from '@/lib/lab/llm-benchmark/nav'

const navLink =
  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider transition-all'

export function BenchmarkNav() {
  const pathname = usePathname()
  if (!pathname?.startsWith(BENCHMARK_BASE_PATH)) return null

  const isOverview = pathname === BENCHMARK_BASE_PATH

  return (
    <nav
      aria-label="LLM Benchmark"
      className="sticky top-[93px] z-30 -mx-6 border-b border-[var(--color-border)]/60 bg-[var(--color-bg)]/75 px-6 backdrop-blur-md backdrop-saturate-150 sm:-mx-8 sm:px-8"
    >
      <div className="flex items-center gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          href={BENCHMARK_BASE_PATH}
          className={cn(
            navLink,
            isOverview
              ? 'border-current text-fg'
              : 'border-[var(--color-border)] text-muted hover:border-[var(--color-muted)]',
          )}
        >
          <BarChart3 className="h-3.5 w-3.5" aria-hidden />
          <span>Overview</span>
        </Link>

        <span className="h-4 w-px shrink-0 bg-[var(--color-border)]" />

        <span className="flex shrink-0 items-center gap-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted">
          <Layers className="h-3 w-3" aria-hidden />
          Categories
        </span>

        {BENCHMARK_CATEGORIES.map((cat) => {
          const href = categoryPath(cat)
          const active = pathname === href || pathname.startsWith(`${href}`)
          return (
            <Link
              key={cat.slug}
              href={href}
              className={cn(
                navLink,
                active
                  ? 'accent-ink border-current'
                  : 'border-[var(--color-border)] text-muted hover:border-[var(--color-muted)]',
              )}
              style={active ? ({ '--ink': cat.accent } as React.CSSProperties) : undefined}
              title={cat.blurb}
            >
              <span className="text-[0.85em]">{cat.glyph}</span>
              <span>{cat.label}</span>
            </Link>
          )
        })}

        <span className="h-4 w-px shrink-0 bg-[var(--color-border)]" />

        <Link
          href={modelIndexPath()}
          className={cn(
            navLink,
            pathname.startsWith(modelIndexPath())
              ? 'border-current text-fg'
              : 'border-[var(--color-border)] text-muted hover:border-[var(--color-muted)]',
          )}
        >
          <Cpu className="h-3.5 w-3.5" aria-hidden />
          <span>Models</span>
          <span className="ml-0.5 rounded-full bg-[var(--color-border)] px-1.5 text-[0.55rem] leading-[1.4] text-muted">
            {BENCHMARK_MODELS.length}
          </span>
        </Link>
      </div>
    </nav>
  )
}
