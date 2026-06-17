'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { LAB_EFFECTS, type LabEntry } from '@/lib/lab/registry'
import { useEffectModule } from '@/lib/lab/use-effect-module'
import { EffectCanvas } from '@/components/lab/effect-canvas'

/**
 * <LabMatrix> — a 2x3 grid of randomly selected lab previews for the
 * home page. Each tile is a working, clickable lab effect rendered at
 * a small "mini" quality. The selection is **stable per day** so the
 * grid doesn't shuffle on every page reload.
 *
 * Server-side: renders an empty placeholder (no effect selection is
 * client-time). Client-side: hydrates with the day's selection and
 * starts the rAF loops.
 */
export function LabMatrix({ count = 6 }: { count?: number }) {
  const [picks, setPicks] = useState<LabEntry[]>([])
  const [hovered, setHovered] = useState<string | null>(null)
  const tickRef = useRef(0)

  // Compute the day's selection client-side. Date-based seed so the
  // matrix rotates every 24h. Deterministic per slug so the order
  // doesn't flicker.
  useEffect(() => {
    const day = Math.floor(Date.now() / 86_400_000)
    const sorted = [...LAB_EFFECTS].sort((a, b) => {
      // Hash of slug + day, then subtract to get a stable random order
      const ha = hash(a.slug + ':' + day)
      const hb = hash(b.slug + ':' + day)
      return ha - hb
    })
    setPicks(sorted.slice(0, Math.min(count, sorted.length)))
  }, [count])

  // Lightweight periodic "tick" that rotates a single card every ~12s
  // so the matrix feels alive without re-rendering everything. We
  // swap one entry for a fresh one from the unused pool.
  // Skips when the tab is backgrounded via document.hidden check.
  useEffect(() => {
    if (picks.length === 0) return
    const id = setInterval(() => {
      if (document.hidden) return
      setPicks((prev) => {
        const used = new Set(prev.map((p) => p.slug))
        const pool = LAB_EFFECTS.filter((e) => !used.has(e.slug))
        if (pool.length === 0) return prev
        const idx = tickRef.current++ % prev.length
        const next = pool[Math.floor(Math.random() * pool.length)]
        const out = [...prev]
        out[idx] = next
        return out
      })
    }, 12_000)
    return () => clearInterval(id)
  }, [picks.length])

  if (picks.length === 0) {
    // SSR placeholder — 6 ghost tiles that reserve space. The matrix
    // hydrates in the next frame with the actual effects.
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/3] rounded-lg border border-fg/10 bg-fg/2"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {picks.map((e) => (
        <LabMatrixTile
          key={e.slug}
          entry={e}
          hovered={hovered}
          setHovered={setHovered}
        />
      ))}
    </div>
  )
}

function LabMatrixTile({
  entry,
  hovered,
  setHovered,
}: {
  entry: LabEntry
  hovered: string | null
  setHovered: React.Dispatch<React.SetStateAction<string | null>>
}) {
  const effectModule = useEffectModule(entry.slug)
  return (
    <Link
      href={`/lab/${entry.slug}/`}
      onMouseEnter={() => setHovered(entry.slug)}
      onMouseLeave={() => setHovered((h) => (h === entry.slug ? null : h))}
      className="group/mx group/matrix relative block overflow-hidden rounded-lg border border-fg/10 bg-fg/2 transition-all hover:border-fg/25 hover:bg-fg/5"
    >
      <div className="aspect-[4/3] w-full">
        {effectModule ? (
          <EffectCanvas
            effect={effectModule}
            params={effectModule.defaults}
            quality="mini"
            ariaLabel={`${entry.title} preview`}
            className="h-full w-full"
          />
        ) : (
          <div className="h-full w-full animate-pulse" />
        )}
      </div>
      {/* Title overlay. Slides up slightly on hover to feel alive. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--color-bg,#0a0a0c)]/85 via-[var(--color-bg,#0a0a0c)]/40 to-transparent px-3 pb-2.5 pt-6">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-white/95">
            {entry.title}
          </h3>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-white/55">
            {entry.category}
          </span>
        </div>
      </div>
      {/* Hover affordance — small "→" that fades in on hover. */}
      <div
        className={`pointer-events-none absolute right-2 top-2 rounded-full bg-[var(--color-bg,#0a0a0c)]/70 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-white/85 transition-opacity ${
          hovered === entry.slug ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Open →
      </div>
    </Link>
  )
}

// Deterministic 32-bit FNV-1a hash. Same algorithm used in related-labs
// for the day-stable random selection.
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
