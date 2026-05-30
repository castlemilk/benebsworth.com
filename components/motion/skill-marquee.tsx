'use client'

import { useEffect, useState } from 'react'

/**
 * A continuous horizontal marquee of skills with a center fade mask. The track
 * is duplicated for a seamless loop. prefers-reduced-motion → static wrapped row.
 * Skills are always rendered, so they land in the static-exported HTML.
 */
export function SkillMarquee({ skills }: { skills: string[] }) {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  if (reduced) {
    return (
      <div className="flex flex-wrap gap-3">
        {skills.map((s) => (
          <SkillChip key={s} label={s} />
        ))}
      </div>
    )
  }

  return (
    <div
      className="group/marquee relative overflow-hidden"
      style={{
        maskImage:
          'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
      }}
    >
      <div className="flex w-max animate-[skillmarquee_38s_linear_infinite] gap-3 group-hover/marquee:[animation-play-state:paused]">
        {[...skills, ...skills].map((s, i) => (
          <SkillChip key={`${s}-${i}`} label={s} />
        ))}
      </div>
    </div>
  )
}

function SkillChip({ label }: { label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-sm text-fg/80 transition-colors hover:border-about/50 hover:text-fg">
      <span className="text-about">▸</span>
      {label}
    </span>
  )
}
