import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BENCHMARK_CATEGORIES, tasksByCategory } from '@/lib/lab/llm-benchmark/registry'
import { categoryPath } from '@/lib/lab/llm-benchmark/nav'
import { Reveal } from '@/components/motion/reveal'

export function CategoryGrid() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {BENCHMARK_CATEGORIES.map((cat, i) => {
        const tasks = tasksByCategory(cat.slug)
        return (
          <Reveal key={cat.slug} delay={i * 60}>
            <Link
              href={categoryPath(cat)}
              className="group flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-muted)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-mono text-xl"
                  style={{
                    color: cat.accent,
                    borderColor: `color-mix(in srgb, ${cat.accent} 35%, transparent)`,
                    backgroundColor: `color-mix(in srgb, ${cat.accent} 10%, transparent)`,
                  }}
                >
                  {cat.glyph}
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </div>
              <h3 className="mt-4 type-h3">{cat.label}</h3>
              <p className="mt-1 flex-1 type-body text-fg/65">{cat.blurb}</p>
              <div className="mt-4 flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                <span
                  className="rounded-full px-1.5 py-0.5"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${cat.accent} 12%, transparent)`,
                    color: cat.accent,
                  }}
                >
                  {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                </span>
              </div>
            </Link>
          </Reveal>
        )
      })}
    </section>
  )
}
