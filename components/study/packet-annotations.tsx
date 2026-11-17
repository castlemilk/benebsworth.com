'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { GammaButton } from '@/components/gamma/GammaButton'
import type { StudyChart } from '@/lib/gen/study'
import {
  addAnnotation,
  removeAnnotation,
  updateAnnotation,
  useChapterAnnotations,
  type StudyAnnotation,
} from './notes'

/**
 * Reader annotations over a rendered packet: select text → highlight or pin a
 * note. Marks persist in localStorage and re-anchor by text + context on the
 * next visit. Notes float in a margin rail on xl screens; elsewhere the mark's
 * popover carries the note text.
 */

type Rect = { top: number; left: number; bottom: number }
type Draft = { text: string; prefix: string; suffix: string; range: Range; rect: Rect }
type Editing = { id: string; rect: Rect; note: string }

const CONTEXT = 48
// `svg` is skipped too: diagram/chart text nodes aren't annotatable — a <mark>
// inside SVG isn't a valid child and would render as a broken phantom mark.
const SKIP_SELECTOR = 'pre, code, .katex, script, style, mark, svg'

function corpusOf(root: HTMLElement): { node: Text; start: number; end: number }[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => ((n as Text).parentElement?.closest(SKIP_SELECTOR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  })
  const entries: { node: Text; start: number; end: number }[] = []
  let pos = 0
  let n = walker.nextNode() as Text | null
  while (n) {
    entries.push({ node: n, start: pos, end: pos + n.data.length })
    pos += n.data.length
    n = walker.nextNode() as Text | null
  }
  return entries
}

function corpusText(entries: { node: Text; start: number; end: number }[]) {
  return entries.map((e) => e.node.data).join('')
}

/** Map a DOM Range endpoint to a corpus offset (best-effort for element boundaries). */
function offsetOf(entries: { node: Text; start: number; end: number }[], container: Node, offset: number, edge: 'start' | 'end'): number {
  if (container.nodeType === Node.TEXT_NODE) {
    const e = entries.find((e) => e.node === container)
    if (e) return e.start + Math.min(offset, e.node.data.length)
  }
  for (const e of entries) {
    if (container.compareDocumentPosition(e.node) & Node.DOCUMENT_POSITION_CONTAINED_BY) {
      return edge === 'start' ? e.start : e.end
    }
  }
  return edge === 'start' ? 0 : corpusText(entries).length
}

/** Wrap every text-node portion of [start, end) in a managed <mark>. */
function wrapCorpusRange(
  entries: { node: Text; start: number; end: number }[],
  start: number,
  end: number,
  a: StudyAnnotation,
) {
  let glossed = false
  for (const e of entries) {
    const from = Math.max(0, start - e.start)
    const to = Math.min(e.node.data.length, end - e.start)
    if (to <= from) continue
    const tail = e.node.splitText(from)
    tail.splitText(to - from)
    const mark = document.createElement('mark')
    mark.className = `study-mark study-mark-${a.kind}`
    mark.dataset.annotationId = a.id
    mark.dataset.managed = '1'
    tail.parentNode?.replaceChild(mark, tail)
    mark.appendChild(tail)
    // Notes preview on hover — same gloss card as author ==marks== carry.
    if (!glossed && a.kind === 'note' && a.note) {
      const gloss = document.createElement('span')
      gloss.className = 'study-mark-gloss'
      gloss.setAttribute('role', 'note')
      gloss.textContent = a.note
      mark.appendChild(gloss)
      glossed = true
    }
  }
}

function unwrapMarks(root: HTMLElement) {
  root.querySelectorAll('mark[data-managed]').forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    mark.querySelectorAll('.study-mark-gloss').forEach((s) => s.remove())
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
    parent.normalize()
  })
}

function locate(text: string, a: StudyAnnotation): { start: number; end: number } | null {
  let best: { idx: number; score: number } | null = null
  let idx = text.indexOf(a.text)
  while (idx >= 0) {
    const score =
      (a.prefix && text.slice(Math.max(0, idx - a.prefix.length), idx) === a.prefix ? 2 : 0) +
      (a.suffix && text.slice(idx + a.text.length, idx + a.text.length + a.suffix.length) === a.suffix ? 2 : 0)
    if (!best || score > best.score) best = { idx, score }
    if (score === 4) break
    idx = text.indexOf(a.text, idx + 1)
  }
  if (!best) return null
  return { start: best.idx, end: best.idx + a.text.length }
}

function rectOf(r: Range | Element): Rect {
  const b = r.getBoundingClientRect()
  return { top: b.top, left: b.left, bottom: b.bottom }
}

export type ChartSlot = StudyChart

// Same dynamic split as the chapter page's gallery — the bklit bundle only
// loads when a packet actually embeds a chart.
const StudyChartFigure = dynamic(() =>
  import('@/components/study/study-chart').then((m) => m.StudyChartFigure),
  { ssr: false },
)

export function PacketAnnotator({
  chapterId,
  children,
  chartSlots,
}: {
  chapterId: string
  children: ReactNode
  chartSlots?: Record<string, ChartSlot>
}) {
  const annotations = useChapterAnnotations(chapterId)
  const bodyRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLElement>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [menu, setMenu] = useState<{ id: string; rect: Rect } | null>(null)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [tops, setTops] = useState<Record<string, number>>({})
  const [chartMounts, setChartMounts] = useState<{ id: string; node: HTMLElement }[]>([])

  // `::chart[id]` placeholders in the packet HTML get a real StudyChartFigure
  // portaled into their `.study-chart-slot` — charts are React, so they can't
  // render server-side; the title/caption already render inside the figure.
  useEffect(() => {
    const figures = bodyRef.current?.querySelectorAll<HTMLElement>('[data-study-chart]') ?? []
    setChartMounts(
      [...figures]
        .map((f) => ({ id: f.dataset.studyChart ?? '', node: f.querySelector<HTMLElement>('.study-chart-slot') }))
        .filter((m): m is { id: string; node: HTMLElement } => Boolean(m.node)),
    )
  }, [])

  const close = useCallback(() => {
    setDraft(null)
    setMenu(null)
    setEditing(null)
  }, [])

  // Fixed-position popovers must not float away from their anchor on scroll.
  useEffect(() => {
    const onScroll = () => close()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [close])

  // Re-wrap all managed marks whenever the annotation set changes, then
  // measure note positions for the rail.
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    unwrapMarks(body)
    for (const a of annotations) {
      const entries = corpusOf(body)
      const hit = locate(corpusText(entries), a)
      if (hit) wrapCorpusRange(entries, hit.start, hit.end, a)
    }
    const measure = () => {
      const rail = railRef.current
      const body = bodyRef.current
      if (!rail || !body) return
      const railTop = rail.getBoundingClientRect().top
      const hits = annotations
        .filter((a) => a.kind === 'note')
        .map((a) => {
          const mark = body.querySelector(`mark[data-annotation-id="${a.id}"]`)
          const card = rail.querySelector<HTMLElement>(`[data-rail="${a.id}"]`)
          return mark && card ? { id: a.id, top: mark.getBoundingClientRect().top - railTop, h: card.offsetHeight } : null
        })
        .filter((x): x is { id: string; top: number; h: number } => Boolean(x))
        .sort((a, b) => a.top - b.top)
      // Stack notes that would overlap their anchor positions.
      let cursor = 0
      const next: Record<string, number> = {}
      for (const hit of hits) {
        next[hit.id] = Math.max(0, Math.max(hit.top, cursor))
        cursor = next[hit.id] + hit.h + 8
      }
      setTops((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(body)
    document.fonts?.ready.then(measure).catch(() => {})
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [annotations])

  // Track the live selection inside the packet body.
  useEffect(() => {
    const onSelection = () => {
      const body = bodyRef.current
      const sel = window.getSelection()
      if (!body || !sel || sel.isCollapsed || sel.rangeCount === 0) {
        if (!editing) setDraft(null)
        return
      }
      const range = sel.getRangeAt(0)
      if (!body.contains(range.commonAncestorContainer) || (range.commonAncestorContainer as Element).closest?.(SKIP_SELECTOR)) {
        return
      }
      const entries = corpusOf(body)
      const text = corpusText(entries)
      const start = offsetOf(entries, range.startContainer, range.startOffset, 'start')
      const end = offsetOf(entries, range.endContainer, range.endOffset, 'end')
      const selected = text.slice(start, end).trim()
      if (selected.length < 3) return
      setDraft({
        text: selected,
        prefix: text.slice(Math.max(0, start - CONTEXT), start),
        suffix: text.slice(end, end + CONTEXT),
        range: range.cloneRange(),
        rect: rectOf(range),
      })
      setMenu(null)
    }
    const t = { id: 0 as number | undefined }
    const debounced = () => {
      window.clearTimeout(t.id)
      t.id = window.setTimeout(onSelection, 120)
    }
    document.addEventListener('selectionchange', debounced)
    return () => {
      document.removeEventListener('selectionchange', debounced)
      window.clearTimeout(t.id)
    }
  }, [editing])

  const create = (kind: 'highlight' | 'note') => {
    if (!draft) return
    if (kind === 'note') {
      setEditing({ id: '', rect: draft.rect, note: '' })
      return
    }
    addAnnotation(chapterId, { kind, text: draft.text, prefix: draft.prefix, suffix: draft.suffix })
    window.getSelection()?.removeAllRanges()
    close()
  }

  const saveNote = () => {
    if (!editing) return
    if (editing.id) {
      updateAnnotation(chapterId, editing.id, { kind: 'note', note: editing.note })
    } else if (draft) {
      addAnnotation(chapterId, { kind: 'note', text: draft.text, prefix: draft.prefix, suffix: draft.suffix, note: editing.note })
      window.getSelection()?.removeAllRanges()
    }
    close()
  }

  // Two delegated behaviours on injected packet HTML: explainer buttons on
  // `<!-- eq:id -->` equations toggle their symbol panel; managed marks open
  // their edit menu.
  const onClick = useCallback(
    (e: React.MouseEvent) => {
      const explainer = (e.target as Element).closest('button[data-eq-explainer]') as HTMLElement | null
      if (explainer && bodyRef.current?.contains(explainer)) {
        const panel = document.getElementById(explainer.getAttribute('aria-controls') ?? '')
        const open = explainer.getAttribute('aria-expanded') !== 'true'
        explainer.setAttribute('aria-expanded', String(open))
        explainer.toggleAttribute('data-open', open)
        if (panel) {
          panel.toggleAttribute('data-open', open)
          panel.setAttribute('aria-hidden', String(!open))
        }
        return
      }
      const mark = (e.target as Element).closest('mark[data-managed]') as HTMLElement | null
      if (!mark || !bodyRef.current?.contains(mark)) return
      const id = mark.dataset.annotationId
      if (!id) return
      e.preventDefault()
      setDraft(null)
      setEditing(null)
      setMenu((m) => (m?.id === id ? null : { id, rect: rectOf(mark) }))
    },
    [],
  )

  const noteById = useMemo(() => new Map(annotations.map((a) => [a.id, a])), [annotations])
  const menuAnnotation = menu ? noteById.get(menu.id) : undefined
  const notes = useMemo(() => annotations.filter((a) => a.kind === 'note'), [annotations])
  const popoverStyle = (r: Rect) => ({
    top: Math.min(Math.max(8, r.bottom + 8), (typeof window !== 'undefined' ? window.innerHeight : 800) - 220),
    left: Math.max(8, Math.min(r.left, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 300)),
  })

  return (
    <div className="study-annotator">
      <div ref={bodyRef} onClick={onClick} className="min-w-0">
        {children}
        {chartMounts.map(({ id, node }) => {
          const chart = chartSlots?.[id]
          if (!chart) return null
          return createPortal(
            <div className="rounded-xl border border-border/60 p-4 sm:p-5">
              <StudyChartFigure chart={chart} />
            </div>,
            node,
            id,
          )
        })}
      </div>

      <aside ref={railRef} className="study-note-rail" aria-label="Your notes">
        {notes.map((a) => (
          <button
            key={a.id}
            type="button"
            className="study-rail-note"
            data-rail={a.id}
            style={{ top: tops[a.id] ?? 0, visibility: tops[a.id] === undefined ? 'hidden' : undefined }}
            onClick={(e) => setMenu({ id: a.id, rect: rectOf(e.currentTarget) })}
          >
            <span className="study-rail-label">note</span>
            {a.note}
          </button>
        ))}
      </aside>

      {draft && !editing && (
        <div className="study-annotator-pop" role="menu" aria-label="Annotate selection" style={popoverStyle(draft.rect)}>
          <GammaButton variant="quiet" size="sm" onClick={() => create('highlight')}>
            Highlight
          </GammaButton>
          <GammaButton variant="quiet" size="sm" onClick={() => create('note')}>
            Note
          </GammaButton>
        </div>
      )}

      {menu && menuAnnotation && !editing && (
        <div className="study-annotator-pop" role="menu" aria-label="Annotation options" style={popoverStyle(menu.rect)}>
          {menuAnnotation.kind === 'note' && menuAnnotation.note && (
            <p className="study-annotator-note-text">{menuAnnotation.note}</p>
          )}
          <div className="flex items-center gap-1">
            {menuAnnotation.kind === 'highlight' ? (
              <GammaButton variant="quiet" size="sm" onClick={() => setEditing({ id: menu.id, rect: menu.rect, note: '' })}>
                Add note
              </GammaButton>
            ) : (
              <GammaButton variant="quiet" size="sm" onClick={() => setEditing({ id: menu.id, rect: menu.rect, note: menuAnnotation.note ?? '' })}>
                Edit
              </GammaButton>
            )}
            <GammaButton variant="quiet" size="sm" onClick={() => { removeAnnotation(chapterId, menu.id); close() }}>
              Remove
            </GammaButton>
          </div>
        </div>
      )}

      {editing && (
        <div className="study-annotator-pop study-annotator-editor" role="dialog" aria-label={editing.id ? 'Edit note' : 'Add note'} style={popoverStyle(editing.rect)}>
          <textarea
            autoFocus
            value={editing.note}
            onChange={(e) => setEditing((s) => (s ? { ...s, note: e.target.value } : s))}
            placeholder="Working note…"
            rows={3}
            className="study-annotator-textarea"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote()
              if (e.key === 'Escape') close()
            }}
          />
          <div className="mt-2 flex items-center gap-1">
            <GammaButton variant="primary" size="sm" onClick={saveNote} disabled={!editing.note.trim()}>
              Save
            </GammaButton>
            <GammaButton variant="quiet" size="sm" onClick={close}>
              Cancel
            </GammaButton>
          </div>
        </div>
      )}
    </div>
  )
}
