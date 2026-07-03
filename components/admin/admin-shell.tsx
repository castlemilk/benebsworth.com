'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Asset, ContentManifest } from '@/lib/gen/content'
import type { CrmItem } from '@/lib/admin/items'
import { useAdmin } from './admin-context'
import { ItemEditor } from './item-editor'
import { LibraryView } from './library-view'
import { ImagePicker } from './image-picker'
import {
  emptyManifest,
  listExistingManifests,
  loadLibrary,
  loadManifest,
  saveLibrary,
  saveManifest,
  uploadAsset,
} from '@/lib/admin/gcs'

const keyOf = (it: CrmItem) => `${it.type}/${it.slug}`

export function AdminShell({ items }: { items: { blogs: CrmItem[]; hikes: CrmItem[] } }) {
  const admin = useAdmin()
  const allItems = [...items.blogs, ...items.hikes]

  const [tab, setTab] = useState<'content' | 'library'>('content')
  const [library, setLibrary] = useState<Asset[]>([])
  const [libLoaded, setLibLoaded] = useState(false)
  const [selKey, setSelKey] = useState<string>(allItems[0] ? keyOf(allItems[0]) : '')
  const [manifests, setManifests] = useState<Record<string, ContentManifest>>({})
  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const [picker, setPicker] = useState<{ multi: boolean } | null>(null)
  const pickResolve = useRef<((a: Asset[]) => void) | null>(null)
  const libraryRef = useRef<Asset[]>([])
  const [manifestsLoaded, setManifestsLoaded] = useState(false)
  // Items whose remote manifest state is KNOWN (loaded successfully, or the
  // listing confirmed none exists). Saving an item NOT in this set is refused
  // (Save re-fetches first): writing our locally-empty manifest over one that
  // merely FAILED to load would silently wipe its gallery.
  const [verified, setVerified] = useState<Set<string>>(new Set())

  const selItem = allItems.find((it) => keyOf(it) === selKey)
  const getToken = admin?.getToken

  useEffect(() => { libraryRef.current = library }, [library])

  // restore last tab + selection across reloads
  useEffect(() => {
    try {
      const t = localStorage.getItem('admin:tab')
      if (t === 'library' || t === 'content') setTab(t)
      const k = localStorage.getItem('admin:selKey')
      if (k && allItems.some((it) => keyOf(it) === k)) setSelKey(k)
    } catch {
      /* localStorage unavailable — skip restore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { try { localStorage.setItem('admin:tab', tab) } catch { /* localStorage unavailable */ } }, [tab])
  useEffect(() => { try { if (selKey) localStorage.setItem('admin:selKey', selKey) } catch { /* localStorage unavailable */ } }, [selKey])

  // once signed in: load the library + EVERY item's manifest (powers the
  // "has photos" dots, instant display, and the library usage query — no
  // per-item lazy loads, so saved work is visible immediately on return).
  useEffect(() => {
    if (!admin?.isAdmin || libLoaded) return
    // libLoaded flips true only on SUCCESS: a library that failed to load must
    // not look empty, or the next upload's saveLibrary would overwrite the
    // index with just the new files. uploadFiles re-fetches when !libLoaded.
    loadLibrary()
      .then((a) => {
        setLibrary(a)
        setLibLoaded(true)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'library failed to load'))
  }, [admin?.isAdmin, libLoaded])

  useEffect(() => {
    if (!admin?.isAdmin || manifestsLoaded || !getToken) return
    ;(async () => {
      try {
        const token = await getToken()
        const existing = await listExistingManifests(token) // only items that HAVE a manifest → no 404 storm
        const entries: [string, ContentManifest][] = []
        const failed = new Set<string>()
        await Promise.all(
          existing.map(async (e) => {
            const k = `${e.type}/${e.slug}`
            try {
              entries.push([k, await loadManifest(e.type, e.slug)])
            } catch {
              failed.add(k) // transient read failure — keep it OUT of `manifests` (≠ empty manifest)
            }
          }),
        )
        setManifests((prev) => ({ ...Object.fromEntries(entries), ...prev }))
        // Everything the listing covered is now known — except the failures.
        setVerified(new Set(allItems.map(keyOf).filter((k) => !failed.has(k))))
        if (failed.size) setError(`${failed.size} manifest(s) failed to load — Save will re-fetch before writing.`)
      } catch (e) {
        // listing/auth failed: nothing verified; Save re-fetches per item.
        setError(e instanceof Error ? e.message : 'failed to load manifests')
      } finally {
        setManifestsLoaded(true)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin?.isAdmin, manifestsLoaded, getToken])

  const uploadFiles = useCallback(
    async (files: FileList | null): Promise<Asset[]> => {
      if (!files?.length || !getToken) return []
      setError(null)
      const added: Asset[] = []
      try {
        const token = await getToken()
        // Wipe guard: saveLibrary writes the FULL index, so never write from a
        // library that failed its initial load — re-fetch first (throws → abort).
        if (!libLoaded) {
          setBusy('Loading library…')
          const lib = await loadLibrary()
          libraryRef.current = lib
          setLibrary(lib)
          setLibLoaded(true)
        }
        const stamp = Date.now()
        let i = 0
        let failure: unknown = null
        for (const f of Array.from(files)) {
          if (!f.type.startsWith('image/')) continue
          setBusy(`Uploading ${i + 1}/${files.length}…`)
          try {
            added.push(await uploadAsset(f, token, stamp + i))
          } catch (e) {
            // stop the batch, but STILL record what already reached the bucket
            // below — otherwise files 1..N-1 become orphaned GCS objects that
            // library/index.json never mentions.
            failure = e
            break
          }
          i++
        }
        if (added.length) {
          // use the ref (not the closed-over `library`) so back-to-back uploads
          // don't clobber each other's library writes. State is updated BEFORE
          // the remote write so even a failed saveLibrary leaves the assets
          // queued locally for the next successful save.
          const next = [...added, ...libraryRef.current]
          libraryRef.current = next
          setLibrary(next)
          setBusy('Saving library…')
          await saveLibrary(next, token)
        }
        if (failure) throw failure
        return added
      } catch (e) {
        setError(e instanceof Error ? e.message : 'upload failed')
        return added // partial batch: these are uploaded + recorded in the library
      } finally {
        setBusy(null)
      }
    },
    [getToken, libLoaded],
  )

  const pick = useCallback((multi: boolean): Promise<Asset[]> => {
    setPicker({ multi })
    return new Promise((res) => { pickResolve.current = res })
  }, [])
  const resolvePick = useCallback((assets: Asset[]) => {
    pickResolve.current?.(assets)
    pickResolve.current = null
    setPicker(null)
  }, [])

  const onManifestChange = (m: ContentManifest) => {
    setManifests((p) => ({ ...p, [selKey]: m }))
    setDirty((p) => ({ ...p, [selKey]: true }))
    setSavedKey(null)
  }

  const save = useCallback(async () => {
    if (!selItem || !getToken) return
    setError(null)
    setBusy('Saving…')
    try {
      // Wipe guard: this item's manifest state is unknown (its load — or the
      // whole listing — failed), so refuse to write and re-fetch it instead.
      if (!verified.has(selKey)) {
        const m = await loadManifest(selItem.type, selItem.slug) // throws on transient failure; empty on genuine 404
        setVerified((p) => new Set(p).add(selKey))
        if (m.hero || m.og || m.gallery.length > 0) {
          // A real manifest exists that we never loaded — writing ours would
          // wipe it. Replace local edits with the fetched truth and stop.
          setManifests((p) => ({ ...p, [selKey]: m }))
          setDirty((p) => ({ ...p, [selKey]: false }))
          setError('Manifest re-fetched (it had content that never loaded) — review and Save again.')
          return
        }
        // nothing meaningful exists remotely — safe to proceed with the save
      }
      const token = await getToken()
      await saveManifest(selItem.type, selItem.slug, manifests[selKey] ?? emptyManifest(), token)
      setDirty((p) => ({ ...p, [selKey]: false }))
      setSavedKey(selKey)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed')
    } finally {
      setBusy(null)
    }
  }, [selItem, selKey, manifests, getToken, verified])

  // ── auth gates ───────────────────────────────────────────────────────────
  if (!admin?.configured) return <Gate title="Not configured"><p className="font-mono text-xs text-muted">Set NEXT_PUBLIC_HIKE_BUCKET / _PUBLIC_BASE / _GOOGLE_CLIENT_ID.</p></Gate>
  if (!admin.email)
    return (
      <Gate title="Admin">
        <button type="button" onClick={admin.signIn} className="rounded-lg bg-about px-4 py-2 font-mono text-sm text-white">Sign in with Google</button>
      </Gate>
    )
  if (!admin.isAdmin)
    return (
      <Gate title="No access">
        <p className="font-mono text-xs text-muted">Signed in as {admin.email}.</p>
        <button type="button" onClick={admin.signOut} className="mt-3 font-mono text-xs text-muted underline hover:text-fg">sign out</button>
      </Gate>
    )

  const manifest = manifests[selKey] ?? emptyManifest()

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
      {/* header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-2xl font-bold tracking-tight">Image CRM</h1>
          <div className="flex items-center gap-1 font-mono text-xs">
            {(['content', 'library'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-full px-3 py-1 ${tab === t ? 'bg-about/20 text-about' : 'text-muted hover:text-fg'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-muted">
          <span className="text-about">✎ {admin.email}</span>
          <button type="button" onClick={admin.signOut} className="underline hover:text-fg">sign out</button>
        </div>
      </div>

      {tab === 'library' ? (
        <LibraryView library={library} items={allItems} manifests={manifests} />
      ) : (
        <div className="flex flex-col gap-8 md:flex-row">
          {/* sidebar — its own scroll region so the long blog list never blows
              out the page height */}
          <nav className="max-h-[50vh] w-full shrink-0 overflow-y-auto pr-1 [scrollbar-width:thin] md:sticky md:top-6 md:max-h-[calc(100vh-8rem)] md:w-56">
            {(['blogs', 'hikes'] as const).map((group) => (
              <div key={group} className="mb-5">
                <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted">{group}</p>
                <ul className="space-y-0.5">
                  {items[group].map((it) => {
                    const k = keyOf(it)
                    const m = manifests[k]
                    const has = m && (m.hero || m.og || m.gallery.length > 0)
                    return (
                      <li key={k}>
                        <button
                          type="button"
                          onClick={() => setSelKey(k)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-sans text-sm ${selKey === k ? 'bg-about/15 text-fg' : 'text-fg/65 hover:bg-[var(--color-stage)]'}`}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${has ? 'bg-about' : 'bg-[var(--color-border)]'}`} />
                          <span className="truncate">{it.title}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {selItem && (
            <ItemEditor
              item={selItem}
              manifest={manifest}
              dirty={!!dirty[selKey]}
              busy={busy}
              error={error}
              saved={savedKey === selKey}
              onChange={onManifestChange}
              onSave={save}
              pick={pick}
              uploadFiles={uploadFiles}
            />
          )}
        </div>
      )}

      {picker && (
        <ImagePicker
          library={library}
          multi={picker.multi}
          busy={busy}
          onConfirm={resolvePick}
          onUploadFiles={uploadFiles}
          onClose={() => resolvePick([])}
        />
      )}
    </div>
  )
}

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-xl font-bold">{title}</h1>
      {children}
    </div>
  )
}
