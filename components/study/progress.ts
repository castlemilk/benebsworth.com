'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

/**
 * Learner-side progress for /study — localStorage only, no account.
 * The file-of-record for the agent workflow is study/mlsys/progress.md;
 * this tracks the human going through the course in the browser.
 */

const KEY = 'mlsys:study:v1'

export type ChapterProgress = {
  visitedAt?: string
  reviewedAt?: string
  quizBest?: number // percent 0..100
  quizAttempts?: number
  quizLastAt?: string
}

export type StudyProgressMap = Record<string, ChapterProgress>

let cache: StudyProgressMap | null = null
const listeners = new Set<() => void>()
const EMPTY: StudyProgressMap = {}
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

function read(): StudyProgressMap {
  if (typeof window === 'undefined') return {}
  if (cache) return cache
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as StudyProgressMap
  } catch {
    cache = {}
  }
  return cache ?? {}
}

function write(updater: (p: StudyProgressMap) => StudyProgressMap) {
  const next = updater({ ...read() })
  cache = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // private mode / quota — progress is best-effort
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

export function markVisited(chapterId: string) {
  write((p) => ({ ...p, [chapterId]: { ...p[chapterId], visitedAt: p[chapterId]?.visitedAt ?? new Date().toISOString() } }))
}

export function markReviewed(chapterId: string) {
  write((p) => ({ ...p, [chapterId]: { ...p[chapterId], reviewedAt: new Date().toISOString() } }))
}

export function recordQuiz(chapterId: string, pct: number) {
  write((p) => {
    const prev = p[chapterId]
    return {
      ...p,
      [chapterId]: {
        ...prev,
        quizBest: Math.max(prev?.quizBest ?? 0, Math.round(pct)),
        quizAttempts: (prev?.quizAttempts ?? 0) + 1,
        quizLastAt: new Date().toISOString(),
      },
    }
  })
}

export function useStudyProgress(): StudyProgressMap {
  const live = useSyncExternalStore(subscribe, read, () => EMPTY)
  // First client render must match SSR ({}); swap in stored progress post-mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? live : {}
}
