'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

export type TocItem = { id: string; text: string; depth: 2 | 3 }

/**
 * Packet table of contents. On ≥xl screens a sticky rail floats in the left
 * gutter with a scrollspy; below that a <details> block sits above the
 * packet so the map is one tap away.
 */
export function TocNav({ packet, sections }: { packet: TocItem[]; sections: TocItem[] }) {
  const ids = useMemo(() => [...packet, ...sections].map((i) => i.id), [packet, sections])
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    if (!ids.length) return
    const visible = new Set<string>()
    const pick = () => {
      for (const id of ids) {
        if (visible.has(id)) {
          setActive(id)
          return
        }
      }
      // Nothing in the band: mark the last heading above it.
      for (let i = ids.length - 1; i >= 0; i -= 1) {
        const el = document.getElementById(ids[i])
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.3) {
          setActive(ids[i])
          return
        }
      }
      setActive(ids[0])
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id)
          else visible.delete(e.target.id)
        }
        pick()
      },
      { rootMargin: '-8% 0px -65% 0px' },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    }
    pick()
    return () => io.disconnect()
  }, [ids])

  const jump = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)
  }

  const link = (item: TocItem) => (
    <a
      key={item.id}
      href={`#${item.id}`}
      onClick={(e) => jump(e, item.id)}
      aria-current={active === item.id ? 'location' : undefined}
      className={cn('study-toc-link', item.depth === 3 && 'study-toc-sub')}
      data-active={active === item.id || undefined}
    >
      {item.text}
    </a>
  )

  const body = (
    <>
      <p className="study-toc-label">On this page</p>
      <nav aria-label="Packet contents">{packet.map(link)}</nav>
      {sections.length > 0 && (
        <>
          <p className="study-toc-label study-toc-label-gap">Chapter</p>
          <nav aria-label="Chapter sections">{sections.map(link)}</nav>
        </>
      )}
    </>
  )

  return (
    <>
      <aside className="study-toc-rail">{body}</aside>
      <details className="study-toc-mobile">
        <summary>Contents</summary>
        <div className="study-toc-mobile-body">{body}</div>
      </details>
    </>
  )
}
