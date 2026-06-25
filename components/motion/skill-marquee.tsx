'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { Skill } from '@/lib/gen/content'
import { SkillCard } from '@/components/about/skill-card'

/**
 * A continuous horizontal marquee of skill chips with a center fade mask. The
 * track is duplicated for a seamless loop and pauses on hover. Each chip opens
 * an expander (SkillCard) with its provenance — on hover (mouse) or tap (touch).
 *
 * The card is portaled to <body> and positioned `fixed` at the chip's rect:
 * the marquee is `overflow-hidden` + masked and its track carries an animating
 * transform (a containing block that would clip even fixed children), so the
 * card has to live outside it. The track is paused while hovered, so the rect
 * captured on open stays valid.
 *
 * prefers-reduced-motion → static wrapped row (expander still works). Chips are
 * always rendered, so they land in the static-exported HTML.
 */
export function SkillMarquee({ skills }: { skills: Skill[] }) {
  const [reduced, setReduced] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState<{ skill: Skill; rect: DOMRect } | null>(null)
  const closeTimer = useRef(0)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const open = useCallback((skill: Skill, el: HTMLElement) => {
    window.clearTimeout(closeTimer.current)
    setActive({ skill, rect: el.getBoundingClientRect() })
  }, [])

  const closeNow = useCallback(() => {
    window.clearTimeout(closeTimer.current)
    setActive(null)
  }, [])

  const closeSoon = useCallback(() => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setActive(null), 120)
  }, [])

  // A scroll or resize invalidates the captured rect — dismiss rather than
  // leave the card stranded. Also lets a tap-elsewhere close it on touch.
  useEffect(() => {
    if (!active) return
    const onScroll = () => closeNow()
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null
      if (!t?.closest('[data-skill-chip]')) closeNow()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [active, closeNow])

  const chip = (s: Skill, key: string) => (
    <SkillChip
      key={key}
      skill={s}
      isActive={active?.skill.name === s.name}
      onOpen={open}
      onCloseSoon={closeSoon}
      onToggle={(skill, el) => (active?.skill.name === skill.name ? closeNow() : open(skill, el))}
    />
  )

  const popover =
    mounted && active
      ? createPortal(
          <Positioned rect={active.rect}>
            <SkillCard skill={active.skill} />
          </Positioned>,
          document.body,
        )
      : null

  if (reduced) {
    return (
      <>
        <div className="flex flex-wrap gap-3">{skills.map((s) => chip(s, s.name))}</div>
        {popover}
      </>
    )
  }

  return (
    <>
      <div
        className="group/marquee relative overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
        }}
      >
        <div className="flex w-max animate-[skillmarquee_72s_linear_infinite] gap-3 group-hover/marquee:[animation-play-state:paused]">
          {[...skills, ...skills].map((s, i) => chip(s, `${s.name}-${i}`))}
        </div>
      </div>
      {popover}
    </>
  )
}

function SkillChip({
  skill,
  isActive,
  onOpen,
  onCloseSoon,
  onToggle,
}: {
  skill: Skill
  isActive: boolean
  onOpen: (skill: Skill, el: HTMLElement) => void
  onCloseSoon: () => void
  onToggle: (skill: Skill, el: HTMLElement) => void
}) {
  const touch = useRef(false)
  return (
    <button
      type="button"
      data-skill-chip
      aria-expanded={isActive}
      onPointerDown={(e) => {
        touch.current = e.pointerType === 'touch'
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') onOpen(skill, e.currentTarget)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch') onCloseSoon()
      }}
      onClick={(e) => {
        if (touch.current) onToggle(skill, e.currentTarget)
      }}
      onFocus={(e) => onOpen(skill, e.currentTarget)}
      onBlur={onCloseSoon}
      className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border bg-surface px-4 py-2 font-mono text-sm text-fg/80 transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-about/60"
      style={
        {
          borderColor: isActive
            ? 'color-mix(in srgb, var(--color-about) 55%, transparent)'
            : 'var(--color-border)',
          color: isActive ? 'var(--color-fg)' : undefined,
        } as CSSProperties
      }
    >
      <span className="text-about">▸</span>
      {skill.name}
    </button>
  )
}

/** Fixed-positioned, portaled wrapper that anchors the card to a chip's rect. */
function Positioned({ rect, children }: { rect: DOMRect; children: React.ReactNode }) {
  const CARD_W = 288 // matches SkillCard w-72
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const above = rect.top > 240
  const left = Math.min(Math.max(rect.left + rect.width / 2 - CARD_W / 2, 8), vw - CARD_W - 8)
  const style: CSSProperties = {
    position: 'fixed',
    left,
    width: CARD_W,
    top: above ? rect.top - 10 : rect.bottom + 10,
    transform: above ? 'translateY(-100%)' : undefined,
    zIndex: 60,
    pointerEvents: 'none',
  }
  return (
    <div style={style}>
      {children}
    </div>
  )
}
