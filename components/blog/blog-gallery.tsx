'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import type { Asset, ContentManifest } from '@/lib/gen/content'
import { cacheBust, hasGeo, mapsLink, manifestUrl, thumbOf } from '@/lib/admin/storage'

/**
 * Live "Photos" block for a blog post: reads the post's image manifest from GCS
 * (managed in /admin) and renders the assigned ordered gallery with a lightbox.
 * Renders nothing until photos are assigned, so it's invisible on posts without.
 */
export function BlogGallery({ slug, accent = '#7c5cff' }: { slug: string; accent?: string }) {
  const [gallery, setGallery] = useState<Asset[]>([])
  const [lightbox, setLightbox] = useState<number | null>(null)

  useEffect(() => {
    const url = manifestUrl('blog', slug)
    if (!url) return
    let alive = true
    fetch(cacheBust(url), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m: ContentManifest | null) => { if (alive) setGallery(Array.isArray(m?.gallery) ? m!.gallery : []) })
      .catch(() => {})
    return () => { alive = false }
  }, [slug])

  if (gallery.length === 0) return null
  const lb = lightbox !== null ? gallery[lightbox] : null

  return (
    <section data-pagefind-ignore className="mt-12 max-w-[44rem]" style={{ '--accent': accent } as CSSProperties}>
      <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        <span style={{ color: 'var(--accent)' }}>▸</span> Photos
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {gallery.map((a, i) => (
          <button key={a.id + i} type="button" onClick={() => setLightbox(i)} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-stage)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbOf(a)} alt={a.alt || a.caption || ''} loading="lazy" decoding="async" width={a.width || undefined} height={a.height || undefined} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
            {a.caption && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 block bg-gradient-to-t from-black/70 to-transparent p-2 font-sans text-[0.7rem] text-white/90 opacity-0 transition-opacity group-hover:opacity-100">{a.caption}</span>
            )}
          </button>
        ))}
      </div>

      {lb && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 font-mono text-xs text-white" onClick={() => setLightbox(null)}>esc ✕</button>
          {gallery.length > 1 && (
            <>
              <button type="button" className="absolute left-4 rounded-full bg-white/10 px-3 py-2 text-white" onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? null : (i - 1 + gallery.length) % gallery.length)) }} aria-label="Previous">‹</button>
              <button type="button" className="absolute right-4 rounded-full bg-white/10 px-3 py-2 text-white" onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? null : (i + 1) % gallery.length)) }} aria-label="Next">›</button>
            </>
          )}
          <figure className="max-h-[88vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lb.url} alt={lb.alt || lb.caption || 'photo'} decoding="async" width={lb.width || undefined} height={lb.height || undefined} className="max-h-[82vh] w-auto rounded-lg object-contain" />
            {(lb.caption || hasGeo(lb)) && (
              <figcaption className="mt-2 font-mono text-xs text-white/70">
                {lb.caption}
                {hasGeo(lb) && (
                  <a href={mapsLink(lb.lat, lb.lng)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="ml-2 underline underline-offset-2">📍 location</a>
                )}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </section>
  )
}
