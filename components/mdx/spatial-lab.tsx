'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { SPATIAL_CATALOG } from '@/lib/lab/spatial/catalog'
import { loadSpatialLesson } from '@/lib/lab/spatial/loaders'
import type { SpatialLesson } from '@/lib/lab/spatial/types'

const Workbench = dynamic(() => import('@/components/lab/spatial/workbench').then(m => m.SpatialWorkbench), { ssr: false })

export function SpatialLab({ slug }: { slug: string }) {
  const root = useRef<HTMLDivElement>(null)
  const [lesson, setLesson] = useState<SpatialLesson | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const entry = SPATIAL_CATALOG.find(item => item.slug === slug)
  useEffect(() => {
    let cancelled = false
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      observer.disconnect()
      loadSpatialLesson(slug).then(data => { if (!cancelled) setLesson(data) }).catch(() => { if (!cancelled) setFailed(true) })
    }, { rootMargin: '400px' })
    if (root.current) observer.observe(root.current)
    return () => { cancelled = true; observer.disconnect() }
  }, [slug, attempt])
  if (!entry) return null
  return <div ref={root} className="not-prose my-10 min-w-0" data-spatial-lab={slug}>
    {lesson?.slug === slug ? <Workbench key={slug} lesson={lesson} /> : <div className="flex min-h-[440px] flex-col justify-center rounded-2xl border border-[var(--color-border)] bg-surface p-8">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Spatial lab</p>
      <p className="mt-3 font-display text-2xl text-fg">{entry.title}</p>
      <p className="mt-3 max-w-prose text-muted">{entry.blurb}</p>
      {failed ? <button className="mt-4 self-start underline" onClick={() => { setFailed(false); setAttempt(n => n + 1) }}>Retry loading experiment</button> : <p className="mt-6 text-sm text-muted" role="status">Loading interactive model…</p>}
    </div>}
  </div>
}
