'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * ⌘K command-palette search over the blog, powered by Pagefind.
 *
 * Pagefind builds a tiny WASM-backed search index from the EXPORTED HTML at
 * deploy time (see the `postbuild` script → `pagefind --site out`), writing it
 * to /pagefind/. Only the blog post <article> is indexed — it carries
 * `data-pagefind-body`, so nav/footer/TOC chrome is excluded and results are
 * just posts. The index lives only in the built output, so in `next dev` there
 * is nothing to load and the dialog says so gracefully.
 *
 * No backend, no third-party service — the index is static files on the CDN.
 */

interface PagefindSubResult {
  url: string
  excerpt: string
  title?: string
}
interface PagefindData {
  url: string
  excerpt: string
  meta?: { title?: string; image?: string }
  sub_results?: PagefindSubResult[]
}
interface Pagefind {
  search: (q: string) => Promise<{ results: { id: string; data: () => Promise<PagefindData> }[] }>
  options?: (o: Record<string, unknown>) => Promise<void>
}

// Module-level singleton so the WASM bundle loads at most once per session.
let pagefindPromise: Promise<Pagefind | null> | null = null
function loadPagefind(): Promise<Pagefind | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (!pagefindPromise) {
    pagefindPromise = (async () => {
      try {
        // @ts-expect-error — Pagefind is generated into /pagefind/ at build time;
        // it is not resolvable at compile time and ships no type declarations.
        // webpackIgnore keeps the bundler from trying to resolve it — it's a
        // native browser dynamic import of a CDN file (CSP-safe, no eval).
        const mod: Pagefind = await import(/* webpackIgnore: true */ '/pagefind/pagefind.js')
        await mod.options?.({ excerptLength: 22 })
        return mod
      } catch {
        return null // dev (no static export) or index missing — handled in the UI
      }
    })()
  }
  return pagefindPromise
}

interface Hit {
  url: string
  title: string
  excerpt: string
}

type Status = 'idle' | 'loading' | 'ok' | 'empty' | 'unavailable'

export function SiteSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [active, setActive] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef(0)

  // ⌘K / Ctrl-K toggles the palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // On open: warm the index, focus the field, lock body scroll.
  useEffect(() => {
    if (!open) return
    loadPagefind()
    const t = window.setTimeout(() => inputRef.current?.focus(), 20)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setHits([])
      setStatus('idle')
      return
    }
    setStatus('loading')
    const pf = await loadPagefind()
    if (!pf) {
      setStatus('unavailable')
      return
    }
    const res = await pf.search(q)
    const data = await Promise.all(res.results.slice(0, 8).map((r) => r.data()))
    const mapped: Hit[] = data.map((d) => ({
      url: d.url,
      title: d.meta?.title || d.sub_results?.[0]?.title || d.url,
      excerpt: d.excerpt,
    }))
    setHits(mapped)
    setActive(0)
    setStatus(mapped.length ? 'ok' : 'empty')
  }, [])

  // Debounce the query so we don't search on every keystroke.
  useEffect(() => {
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => runSearch(query), 140)
    return () => window.clearTimeout(debounceRef.current)
  }, [query, runSearch])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, hits.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && hits[active]) {
      e.preventDefault()
      // Full navigation — bulletproof on static hosting (no RSC dependency).
      window.location.href = hits[active].url
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the site"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted transition-colors hover:text-fg/80"
      >
        <SearchIcon />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-[var(--color-border)] px-1 text-[0.6rem] leading-tight text-muted md:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4">
              <SearchIcon />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts…"
                className="w-full bg-transparent py-3.5 font-sans text-[0.95rem] text-fg outline-none placeholder:text-muted"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[0.6rem] text-muted">
                esc
              </kbd>
            </div>

            <div className="max-h-[55vh] overflow-y-auto">
              {status === 'ok' &&
                hits.map((h, i) => (
                  <a
                    key={h.url}
                    href={h.url}
                    onClick={() => setOpen(false)}
                    onMouseMove={() => setActive(i)}
                    className={`block w-full border-b border-[var(--color-border)]/50 px-4 py-3 text-left transition-colors ${
                      i === active ? 'bg-[color-mix(in_srgb,var(--color-blog)_12%,transparent)]' : ''
                    }`}
                  >
                    <span className="block font-display text-sm font-semibold text-fg">{h.title}</span>
                    <span
                      className="mt-1 block font-sans text-[0.8rem] leading-6 text-fg/55 [&_mark]:rounded [&_mark]:bg-[color-mix(in_srgb,var(--color-blog)_28%,transparent)] [&_mark]:px-0.5 [&_mark]:text-fg"
                      // Pagefind returns a sanitised excerpt with <mark> around matches.
                      dangerouslySetInnerHTML={{ __html: h.excerpt }}
                    />
                  </a>
                ))}
              {status === 'loading' && (
                <p className="px-4 py-6 text-center font-mono text-xs text-muted">Searching…</p>
              )}
              {status === 'empty' && (
                <p className="px-4 py-6 text-center font-mono text-xs text-muted">No matches for “{query}”.</p>
              )}
              {status === 'idle' && (
                <p className="px-4 py-6 text-center font-mono text-xs text-muted">Type to search the blog.</p>
              )}
              {status === 'unavailable' && (
                <p className="px-4 py-6 text-center font-mono text-xs leading-6 text-muted">
                  The search index is built at deploy time — it isn’t available in local dev.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 text-muted"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
