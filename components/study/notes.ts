'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

/**
 * Learner annotations for /study packets — localStorage only, no account.
 * Separate key from progress so a corrupt payload can't take quiz/visited
 * state with it. Anchors carry the selected text plus small context strings
 * so a mark can be re-found after a packet is regenerated.
 */

const KEY = 'mlsys:study:notes:v1'

export type StudyAnnotation = {
  id: string
  kind: 'highlight' | 'note'
  text: string // exact selected text, used to re-anchor
  prefix: string // up to 48 chars before the selection
  suffix: string // up to 48 chars after
  note?: string // margin-note body (kind === 'note')
  createdAt: string
}

export type StudyAnnotationMap = Record<string, StudyAnnotation[]>

let cache: StudyAnnotationMap | null = null
const listeners = new Set<() => void>()
const EMPTY: StudyAnnotationMap = {}
let storageBound = false

// One module-level storage listener: another tab's write must invalidate the
// module cache before subscribers re-read, or cross-tab updates never land.
function ensureStorageListener() {
  if (storageBound || typeof window === 'undefined') return
  storageBound = true
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    cache = null
    listeners.forEach((l) => l())
  })
}

function read(): StudyAnnotationMap {
  if (typeof window === 'undefined') return {}
  if (cache) return cache
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as StudyAnnotationMap
  } catch {
    cache = {}
  }
  return cache ?? {}
}

function write(updater: (a: StudyAnnotationMap) => StudyAnnotationMap) {
  const next = updater({ ...read() })
  cache = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // private mode / quota — annotations are best-effort
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  ensureStorageListener()
  return () => {
    listeners.delete(cb)
  }
}

export function addAnnotation(chapterId: string, a: Omit<StudyAnnotation, 'id' | 'createdAt'>): StudyAnnotation {
  const annotation: StudyAnnotation = {
    ...a,
    id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  }
  write((map) => ({ ...map, [chapterId]: [...(map[chapterId] ?? []), annotation] }))
  return annotation
}

export function updateAnnotation(chapterId: string, id: string, patch: Partial<Pick<StudyAnnotation, 'note' | 'kind'>>) {
  write((map) => ({
    ...map,
    [chapterId]: (map[chapterId] ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)),
  }))
}

export function removeAnnotation(chapterId: string, id: string) {
  write((map) => ({ ...map, [chapterId]: (map[chapterId] ?? []).filter((a) => a.id !== id) }))
}

export function useChapterAnnotations(chapterId: string): StudyAnnotation[] {
  const live = useSyncExternalStore(subscribe, read, () => EMPTY)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return []
  return live[chapterId] ?? []
}
