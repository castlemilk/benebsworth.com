import type { CSSProperties } from 'react'
import type { Skill } from '@/lib/gen/content'

/**
 * The hover/tap expander for a single skill: name + span, the one-line "how I
 * acquired it" note, and provenance chips (work / education / personal) tinted
 * with each source's accent. Purely presentational — positioning + open state
 * live in SkillMarquee, which portals this past the marquee's overflow clip.
 */

const KIND_GLYPH: Record<string, string> = {
  work: '⬢',
  education: '✦',
  personal: '◆',
}

export function SkillCard({ skill, variant = 'default' }: { skill: Skill; variant?: 'default' | 'profile' }) {
  const profile = variant === 'profile'
  return (
    <div data-skill-card-style={variant} className={`${profile ? 'w-full' : 'w-72'} origin-top animate-[skillpop_160ms_cubic-bezier(0.16,1,0.3,1)] rounded-xl border border-[var(--color-border)] bg-surface/95 p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] backdrop-blur-md`}>
      <div className={profile ? "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1" : "flex items-baseline justify-between gap-3"}>
        <p className="font-display text-base font-semibold tracking-[-0.01em]">
          {!profile && <span className="text-about">▸ </span>}
          {skill.name}
        </p>
        {skill.since && (
          <span className={profile ? "shrink-0 font-sans text-xs tabular-nums text-muted" : "shrink-0 font-mono text-[0.75rem] tabular-nums text-muted"}>{skill.since}</span>
        )}
      </div>
      <p className={profile ? "mt-1 font-sans text-xs text-muted" : "mt-0.5 font-mono text-[0.75rem] uppercase tracking-[0.18em] text-muted"}>
        {skill.category}
      </p>
      <p className="mt-2 font-sans text-sm leading-6 text-fg/75">{skill.note}</p>

      {skill.sources.length > 0 && (
        <>
          <span aria-hidden className="my-3 block h-px bg-[var(--color-border)]" />
          <ul className="flex flex-wrap gap-1.5">
            {skill.sources.map((s) => (
              <li
                key={s.label}
                className={profile ? "flex flex-wrap items-center gap-1.5 rounded border px-2 py-1 font-sans text-xs leading-5" : "flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[0.75rem]"}
                style={
                  {
                    color: profile ? 'var(--color-fg)' : `color-mix(in srgb, ${s.color} 82%, var(--color-fg))`,
                    borderColor: `color-mix(in srgb, ${s.color} 45%, transparent)`,
                    backgroundColor: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                  } as CSSProperties
                }
              >
                <span aria-hidden style={{ color: s.color }}>{profile ? '•' : (KIND_GLYPH[s.kind] ?? '•')}</span>
                <span>{s.label}</span>
                {s.when && <span className={profile ? "text-muted" : "opacity-60"}>· {s.when}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
