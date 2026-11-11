import type { PagefindData } from './search-hit'

interface Pagefind {
  search: (q: string) => Promise<{ results: { id: string; data: () => Promise<PagefindData> }[] }>
  options?: (o: Record<string, unknown>) => Promise<void>
}

// One in-flight/successful initialization is shared by all callers.
export function createPagefindLoader(importPagefind: () => Promise<Pagefind>) {
  let promise: Promise<Pagefind | null> | null = null
  return () => {
    if (!promise) {
      promise = Promise.resolve()
        .then(importPagefind)
        .then(async mod => {
          await mod.options?.({ excerptLength: 22 })
          return mod
        })
        .catch(() => {
          // A transient import or options failure must not poison the session.
          promise = null
          return null
        })
    }
    return promise
  }
}

const loadInBrowser = createPagefindLoader(async () => {
  // Pagefind is generated at build time and loaded as a native browser import.
  const modulePath: string = '/pagefind/pagefind.js'
  return import(/* webpackIgnore: true */ /* @vite-ignore */ modulePath) as Promise<Pagefind>
})

export function loadPagefind(): Promise<Pagefind | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  return loadInBrowser()
}
