'use client'

import { useRef } from 'react'
import type { CrmItem } from '@/lib/admin/items'
import type { Asset, ContentManifest } from '@/lib/gen/content'
import { fmtLatLng, hasGeo, mapsLink, thumbOf } from '@/lib/admin/storage'

/**
 * Per-item editor: existing repo images (read-only) + named slots (hero, social/
 * OG) + an ordered gallery. Presentational — manifest edits flow up via onChange;
 * `pick` (library modal) and `uploadFiles` are provided by the shell.
 */
export function ItemEditor({
  item,
  manifest,
  dirty,
  busy,
  error,
  saved,
  onChange,
  onSave,
  pick,
  uploadFiles,
}: {
  item: CrmItem
  manifest: ContentManifest
  dirty: boolean
  busy: string | null
  error: string | null
  saved: boolean
  onChange: (m: ContentManifest) => void
  onSave: () => void
  pick: (multi: boolean) => Promise<Asset[]>
  uploadFiles: (files: FileList | null) => Promise<Asset[]>
}) {
  const galUpload = useRef<HTMLInputElement>(null)

  const setSlot = async (slot: 'hero' | 'og', upload: boolean) => {
    const picked = upload ? await uploadFiles(await chooseFiles()) : await pick(false)
    if (picked[0]) onChange({ ...manifest, [slot]: picked[0] })
  }
  const addGallery = async (upload: boolean, files?: FileList | null) => {
    const picked = upload ? await uploadFiles(files ?? null) : await pick(true)
    if (picked.length) onChange({ ...manifest, gallery: [...manifest.gallery, ...picked] })
  }
  const patchGallery = (i: number, p: Partial<Asset>) =>
    onChange({ ...manifest, gallery: manifest.gallery.map((a, j) => (j === i ? { ...a, ...p } : a)) })
  const removeGallery = (i: number) => onChange({ ...manifest, gallery: manifest.gallery.filter((_, j) => j !== i) })
  const moveGallery = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= manifest.gallery.length) return
    const g = manifest.gallery.slice()
    ;[g[i], g[j]] = [g[j], g[i]]
    onChange({ ...manifest, gallery: g })
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted">{item.type}</span>
          <h2 className="type-h2">{item.title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="font-mono text-xs text-red-400">{error}</span>}
          {busy && <span className="font-mono text-xs text-muted">{busy}</span>}
          {saved && !dirty && <span className="font-mono text-xs text-about">✓ saved (live)</span>}
          <button type="button" onClick={onSave} disabled={!!busy || !dirty}
            className="rounded-lg bg-about px-4 py-1.5 font-mono text-xs text-white disabled:opacity-40">
            Save
          </button>
        </div>
      </div>

      {/* In repo (read-only) */}
      <Section label="In repo (existing)">
        {item.repoImages.length === 0 ? (
          <p className="font-mono text-xs text-muted">No committed images.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {item.repoImages.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" title={src} className="h-16 w-24 rounded-md border border-[var(--color-border)] object-cover opacity-80" />
            ))}
          </div>
        )}
      </Section>

      {/* Named slots */}
      <Section label="Slots">
        <div className="flex flex-wrap gap-4">
          <Slot name="hero" asset={manifest.hero} onSet={() => setSlot('hero', false)} onUpload={() => setSlot('hero', true)} onClear={() => onChange({ ...manifest, hero: undefined })} />
          <Slot name="social / og" asset={manifest.og} onSet={() => setSlot('og', false)} onUpload={() => setSlot('og', true)} onClear={() => onChange({ ...manifest, og: undefined })} />
        </div>
      </Section>

      {/* Ordered gallery */}
      <Section label={`Gallery · ${manifest.gallery.length}`}>
        <div className="mb-3 flex gap-2">
          <button type="button" onClick={() => addGallery(false)} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 font-mono text-xs hover:border-[var(--color-muted)]">+ From library</button>
          <button type="button" onClick={() => galUpload.current?.click()} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 font-mono text-xs hover:border-[var(--color-muted)]">+ Upload</button>
          <input ref={galUpload} type="file" accept="image/*" multiple hidden onChange={(e) => addGallery(true, e.target.files)} />
        </div>
        {manifest.gallery.length === 0 ? (
          <p className="font-mono text-xs text-muted">No gallery images yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {manifest.gallery.map((a, i) => (
              <div key={a.id + i} className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-bg/40">
                <div className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbOf(a)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[0.6rem] tabular-nums text-white">{i + 1}</span>
                  <button type="button" onClick={() => removeGallery(i)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 font-mono text-xs text-white hover:bg-red-500" aria-label="Remove">✕</button>
                  {hasGeo(a) && (
                    <a href={mapsLink(a.lat, a.lng)} target="_blank" rel="noopener noreferrer" title={fmtLatLng(a.lat, a.lng)} className="absolute bottom-1 left-1 rounded bg-black/55 px-1 text-sm" aria-label="View location on map">📍</a>
                  )}
                  <div className="absolute bottom-1 right-1 flex gap-1 font-mono text-xs">
                    <button type="button" onClick={() => moveGallery(i, -1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/80" aria-label="Move earlier">←</button>
                    <button type="button" onClick={() => moveGallery(i, 1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/80" aria-label="Move later">→</button>
                  </div>
                </div>
                <div className="space-y-1 p-1.5">
                  <input value={a.caption} onChange={(e) => patchGallery(i, { caption: e.target.value })} placeholder="caption…" className="w-full rounded border border-[var(--color-border)] bg-surface px-2 py-1 font-sans text-xs" />
                  <input value={a.slot} onChange={(e) => patchGallery(i, { slot: e.target.value })} placeholder="slot / waypoint" className="w-full rounded border border-[var(--color-border)] bg-surface px-2 py-1 font-mono text-[0.7rem]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h3 className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted">{label}</h3>
      {children}
    </section>
  )
}

function Slot({ name, asset, onSet, onUpload, onClear }: { name: string; asset?: Asset; onSet: () => void; onUpload: () => void; onClear: () => void }) {
  return (
    <div className="w-40">
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--color-border)] bg-bg/40">
        {asset ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbOf(asset)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted">empty</span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted">{name}</span>
        <span className="flex gap-1.5 font-mono text-[0.62rem]">
          <button type="button" onClick={onSet} className="text-muted hover:text-fg">set</button>
          <button type="button" onClick={onUpload} className="text-muted hover:text-fg">up</button>
          {asset && <button type="button" onClick={onClear} className="text-muted hover:text-red-400">✕</button>}
        </span>
      </div>
    </div>
  )
}

// Open a transient file dialog and resolve the chosen FileList (for slot uploads).
function chooseFiles(): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => resolve(input.files)
    input.click()
  })
}
