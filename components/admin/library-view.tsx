'use client'

import { useMemo, useState } from 'react'
import type { Asset, ContentManifest } from '@/lib/gen/content'
import type { CrmItem } from '@/lib/admin/items'
import { hasGeo, mapsLink, thumbOf } from '@/lib/admin/storage'

/**
 * The image library + availability query: every asset in the pool, and where
 * each is used across all items (hero / og / gallery). Filter by used / unused
 * to answer "what's available to use where". Usage is computed from the
 * already-loaded manifests passed in by the shell.
 */
export function LibraryView({
  library,
  items,
  manifests,
}: {
  library: Asset[]
  items: CrmItem[]
  manifests: Record<string, ContentManifest>
}) {
  const [filter, setFilter] = useState<'all' | 'used' | 'unused'>('all')

  const usage = useMemo(() => {
    const u: Record<string, { item: CrmItem; where: string }[]> = {}
    const add = (a: Asset | undefined, it: CrmItem, where: string) => {
      if (a?.id) (u[a.id] ??= []).push({ item: it, where })
    }
    for (const it of items) {
      const m = manifests[`${it.type}/${it.slug}`]
      if (!m) continue
      add(m.hero, it, 'hero')
      add(m.og, it, 'og')
      m.gallery.forEach((a, i) => add(a, it, `gallery #${i + 1}`))
    }
    return u
  }, [items, manifests])

  const usedCount = library.filter((a) => (usage[a.id]?.length ?? 0) > 0).length
  const shown = useMemo(
    () =>
      library.filter((a) => {
        const used = (usage[a.id]?.length ?? 0) > 0
        return filter === 'all' || (filter === 'used' ? used : !used)
      }),
    [library, usage, filter],
  )

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-h2">Library</h2>
        <div className="flex items-center gap-1 font-mono text-xs">
          {(['all', 'used', 'unused'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 ${filter === f ? 'bg-about/20 text-about' : 'text-muted hover:text-fg'}`}
            >
              {f}{f === 'all' ? ` (${library.length})` : f === 'used' ? ` (${usedCount})` : ` (${library.length - usedCount})`}
            </button>
          ))}
        </div>
      </div>

      {library.length === 0 && <p className="font-mono text-xs text-muted">No images uploaded yet. Add some from a content item.</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((a) => {
          const uses = usage[a.id] ?? []
          return (
            <div key={a.id} className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbOf(a)} alt={a.alt || ''} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="p-2">
                {hasGeo(a) && (
                  <a href={mapsLink(a.lat, a.lng)} target="_blank" rel="noopener noreferrer" className="float-right text-sm" aria-label="View location on map" title="View location">📍</a>
                )}
                {uses.length === 0 ? (
                  <span className="font-mono text-[0.62rem] text-muted">unused</span>
                ) : (
                  <ul className="space-y-0.5">
                    {uses.map((u, i) => (
                      <li key={i} className="truncate font-mono text-[0.6rem] text-fg/70">
                        <span className="text-about">{u.item.type}</span>/{u.item.slug} · {u.where}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
