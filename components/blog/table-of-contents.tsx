'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Sticky right-rail table of contents for long-form MDX posts. Discovers
 * the post's `<h2>` / `<h3>` elements on mount and uses an
 * IntersectionObserver to highlight the section currently in view.
 *
 * Why IntersectionObserver (not a scroll listener + getBoundingClientRect):
 *  - A scroll listener fires on every scroll event, ~tens of times per
 *    second during a smooth scroll. Each handler call needs to read the
 *    rect of every heading, which forces a synchronous layout (reflow)
 *    of the page. With 16 headings on the zoo post, that's 16 reflows
 *    per scroll event — expensive.
 *  - IntersectionObserver runs off the main thread and only fires when
 *    a heading crosses an explicit threshold. No per-frame work, no
 *    reflow. The browser schedules the observer callback at a natural
 *    point in the frame.
 *
 * Two observer instances are used:
 *  1. `rootMargin: '-100px 0px -70% 0px'` — a 100px trigger line near
 *     the top of the viewport (clears the sticky nav + breadcrumb).
 *     A heading is "active" when its top is in the band between
 *     100px from the viewport top and 30% from the bottom.
 *  2. The second observer is the same idea but tracks the entries'
 *     `boundingClientRect.top` to disambiguate when MULTIPLE headings
 *     are in the trigger band (which happens on short sections).
 *
 * The active section is the heading whose top is closest to the trigger
 * line, going UP (i.e. the user has scrolled past it but not yet past
 * the next one). This matches the natural "section I'm in" intuition.
 */
export function TableOfContents({
  className,
  label = 'On this page',
}: {
  className?: string
  label?: string
}) {
  const [headings, setHeadings] = useState<Array<{ id: string; text: string; level: number }>>(
    [],
  )
  const [activeId, setActiveId] = useState<string | null>(null)

  // Discover all the H2 (and H3) headings in the post on mount. The
  // MDX pipeline auto-generates heading ids via rehype-slug, so each
  // heading has a stable `id` attribute we can scroll to.
  useEffect(() => {
    const candidates = Array.from(
      document.querySelectorAll<HTMLHeadingElement>('article h2[id], article h3[id]'),
    )
    const items = candidates
      .map((h) => ({ id: h.id, text: h.textContent ?? h.id, level: Number(h.tagName.slice(1)) }))
      .filter((h) => h.text.trim().length > 0)
    setHeadings(items)
    if (items.length > 0) setActiveId(items[0].id)
  }, [])

  // IntersectionObserver: pick the heading whose top is closest to
  // (but above) the trigger line at 100px. We use a single observer
  // with a top-trimmed rootMargin so a heading becomes "intersecting"
  // when it crosses the 100px line going down, and "not intersecting"
  // when it crosses going up.
  useEffect(() => {
    if (headings.length === 0) return
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el != null)
    if (elements.length === 0) return

    // Track which headings are currently ABOVE the trigger line.
    // "Above" means the heading's bottom is above the 100px line.
    // The active heading is the LAST one above the line.
    const visibleAbove = new Set<string>()

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).id
          if (e.isIntersecting) {
            // Heading crossed the trigger line going down. It's now
            // "above" the line.
            visibleAbove.add(id)
          } else {
            // Heading crossed out. If the new top is BELOW the line
            // (i.e. user scrolled back up past it), remove from set.
            // We use getBoundingClientRect here but it's a single
            // forced reflow per entry per change — much cheaper than
            // polling all headings.
            const rect = e.boundingClientRect
            if (rect.top > 100) {
              visibleAbove.delete(id)
            }
          }
        }
        // The active id is the LAST heading in document order that's
        // currently above the line. (Document order matches
        // `headings` array order.)
        let last: string | null = null
        for (const h of headings) {
          if (visibleAbove.has(h.id)) last = h.id
        }
        // Only call setActiveId if the value actually changed. This
        // matters because IntersectionObserver fires on every
        // intersection change — without this guard, React would
        // schedule a render even when nothing visible changed.
        if (last != null) {
          setActiveId((prev) => (prev === last ? prev : last))
        }
      },
      // Top trim of 100px clears the sticky nav + breadcrumb. Bottom
      // trim of 70% means a heading must be at least 30% from the
      // bottom to count as "intersecting" — otherwise the active
      // state would jump to the next heading as soon as it appears
      // at the bottom of the viewport, which is too eager.
      { rootMargin: '-100px 0px -70% 0px', threshold: 0 },
    )
    for (const el of elements) obs.observe(el)
    return () => obs.disconnect()
  }, [headings])

  // Click → scroll to the heading. The default is `behavior: 'auto'`
  // (instant jump) for two reasons:
  //   1. Performance. Smooth scrolls fire a `scroll` event ~10× per
  //      second for ~500ms. With 64 SVGs and sticky backdrop-blur
  //      elements on the page, each scroll event triggers a repaint
  //      of the viewport. The user is watching the page land at a
  //      new section — that visual cue is enough. They don't need
  //      to see every intermediate frame.
  //   2. Reduced motion. `behavior: 'auto'` is automatically
  //      instant for users with `prefers-reduced-motion: reduce`.
  //      The `scroll-margin-top` on each heading ensures the target
  //      lands 128px below the top — just below the sticky
  //      breadcrumb, so it's visible without further scrolling.
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ block: 'start' })
    // Update the URL hash so deep-links work, but without triggering
    // an additional scroll.
    history.replaceState(null, '', `#${id}`)
    setActiveId(id)
  }

  if (headings.length === 0) return null

  return (
    <nav
      aria-label="Table of contents"
      className={cn(
        'text-[0.78rem]',
        // The wrapper is `position: sticky` so the TOC stays visible
        // as the user scrolls. The top offset clears the sticky
        // SiteNav (~57px) and the sticky breadcrumb (~37px) so the
        // TOC's "On this page" header sits just below them.
        'sticky top-[100px]',
        className,
      )}
    >
      <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted mb-3">
        {label}
      </h2>
      <ul className="m-0 list-none space-y-1 p-0">
        {headings.map((h) => {
          const isActive = activeId === h.id
          return (
            <li
              key={h.id}
              className={cn(
                'relative',
                h.level === 3 && 'pl-3', // indent H3s under their H2
              )}
            >
              <a
                href={`#${h.id}`}
                onClick={(e) => onClick(e, h.id)}
                aria-current={isActive ? 'location' : undefined}
                className={cn(
                  'block border-l-2 py-1 pl-3 pr-2 leading-snug transition-colors',
                  isActive
                    ? 'border-blog text-fg'
                    : 'border-transparent text-muted hover:border-fg/30 hover:text-fg/80',
                )}
              >
                {h.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
