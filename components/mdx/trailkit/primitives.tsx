'use client'

import { useId, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Inline style that sets the per-component accent (default = blog teal). */
export function accentStyle(accent?: string): CSSProperties {
  return { ['--accent' as string]: accent || 'var(--color-blog)' } as CSSProperties
}

/** Faint topographic contour motif — the connective brand texture. Pure SVG,
 *  decorative (aria-hidden). Sits behind cards / as the Stages spine. */
export function ContourMotif({ className, rings = 5 }: { className?: string; rings?: number }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg className={cn('pointer-events-none absolute inset-0 h-full w-full', className)} viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <defs>
        <radialGradient id={`tcm-${uid}`}>
          <stop offset="55%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </radialGradient>
        <mask id={`tcmm-${uid}`}><rect width="120" height="80" fill={`url(#tcm-${uid})`} /></mask>
      </defs>
      <g mask={`url(#tcmm-${uid})`} fill="none" stroke="color-mix(in srgb, var(--accent) 26%, transparent)" strokeWidth={0.4}>
        {Array.from({ length: rings }).map((_, i) => (
          <ellipse key={i} cx={84} cy={20} rx={10 + i * 11} ry={(10 + i * 11) * 0.6} opacity={1 - i * 0.14} />
        ))}
      </g>
    </svg>
  )
}

/** The shared card chrome: bordered, soft-glow-on-hover, contour-backed surface. */
export function TrailCard({
  children, className, accent, motif = false, glow = true, style,
}: {
  children: ReactNode; className?: string; accent?: string; motif?: boolean; glow?: boolean; style?: CSSProperties
}) {
  return (
    <div
      className={cn(
        'not-prose relative overflow-hidden rounded-[0.625rem] border border-[var(--color-border)] bg-surface',
        glow && 'transition-[box-shadow,border-color] duration-200 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--color-border))] hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_18%,transparent),0_18px_44px_-30px_color-mix(in_srgb,var(--accent)_60%,transparent)]',
        className,
      )}
      style={{ ...accentStyle(accent), ...style }}
    >
      {motif && <ContourMotif className="opacity-[0.5]" />}
      <div className="relative">{children}</div>
    </div>
  )
}

/** A mono uppercase section eyebrow, e.g. "▸ The route". */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted', className)}>
      <span style={{ color: 'var(--accent)' }}>▸</span> {children}
    </p>
  )
}

/** One stat: icon + value + label. Used in summary/stage headers. */
export function StatChip({ icon: Icon, value, label }: { icon?: (p: { className?: string }) => ReactNode; value: ReactNode; label: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      {Icon && <span className="text-[1.05rem]" style={{ color: 'var(--accent)' }}><Icon /></span>}
      <span className="flex flex-col leading-tight">
        <span className="font-display text-[1.05rem] font-semibold tracking-tight text-fg tabular-nums">{value}</span>
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted">{label}</span>
      </span>
    </div>
  )
}

/** A small inline icon+text pill. */
export function IconPill({ icon: Icon, children }: { icon?: (p: { className?: string }) => ReactNode; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.66rem]"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent) 38%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--accent) 9%, transparent)',
        color: 'color-mix(in srgb, var(--accent) 85%, var(--color-fg))',
      }}
    >
      {Icon && <span className="text-[0.85rem]"><Icon /></span>}
      {children}
    </span>
  )
}
