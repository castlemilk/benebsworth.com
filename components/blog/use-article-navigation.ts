'use client'

import { useSyncExternalStore, type MouseEvent } from 'react'
import { getArticleHeadings } from './article-headings'

type Heading = { id: string; text: string; level: number }
type Navigation = { headings: Heading[]; activeId: string | null }
const empty: Navigation = { headings: [], activeId: null }
let snapshot = empty
const listeners = new Set<() => void>()
let stop: (() => void) | undefined

/** Measure the actual sticky stack, including zoom, wrapping and an open menu. */
export function articleClearance() {
  const header = document.querySelector('[data-site-nav]')
  const breadcrumb = document.querySelector('[data-site-breadcrumb]')
  return Math.max(0, header?.getBoundingClientRect().bottom ?? 0,
    breadcrumb?.getBoundingClientRect().bottom ?? 0) + 16
}

export function currentArticleHeading(elements: HTMLHeadingElement[], line: number) {
  let active = elements[0]?.id ?? null
  for (const element of elements) {
    if (element.getBoundingClientRect().top <= line + 1) active = element.id
    else break
  }
  return active
}

function start() {
  let elements = getArticleHeadings(document)
  let headings = elements.map(h => ({ id: h.id, text: h.textContent!.trim(), level: Number(h.tagName.slice(1)) }))
  let frame = 0
  const update = () => {
    frame = 0
    const atBottom = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1
    const activeId = atBottom ? elements.at(-1)?.id ?? null : currentArticleHeading(elements, articleClearance())
    if (snapshot.headings !== headings || snapshot.activeId !== activeId) {
      snapshot = { headings, activeId }
      listeners.forEach(notify => notify())
    }
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
  const mutations = new MutationObserver(records => {
    const relevant = records.some(record => {
      if (record.target instanceof Element && record.target.matches('h2, h3')) return true
      return [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element &&
        (node.matches('article, h2, h3') || node.querySelector('article, h2[id], h3[id]')))
    })
    if (!relevant) return
    const next = getArticleHeadings(document)
    if (next.length === elements.length && next.every((node, i) => node === elements[i] && node.id === headings[i].id && node.textContent?.trim() === headings[i].text)) return
    elements = next
    headings = elements.map(h => ({ id: h.id, text: h.textContent!.trim(), level: Number(h.tagName.slice(1)) }))
    schedule()
  })
  mutations.observe(document.body, { childList: true, subtree: true })
  // One shared passive listener and one batch of layout reads for both TOCs.
  // Unlike intersection bookkeeping this also handles restored/instant jumps.
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  window.addEventListener('hashchange', schedule)
  window.addEventListener('popstate', schedule)
  window.addEventListener('article-anchor-arrival', schedule)
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
  observer?.observe(document.body)
  update()
  return () => {
    cancelAnimationFrame(frame)
    observer?.disconnect()
    mutations.disconnect()
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    window.removeEventListener('hashchange', schedule)
    window.removeEventListener('popstate', schedule)
    window.removeEventListener('article-anchor-arrival', schedule)
    snapshot = empty
  }
}
function subscribe(notify: () => void) {
  listeners.add(notify)
  if (listeners.size === 1) stop = start()
  return () => {
    listeners.delete(notify)
    if (!listeners.size) { stop?.(); stop = undefined }
  }
}
export function useArticleNavigation() {
  return useSyncExternalStore(subscribe, () => snapshot, () => empty)
}

export function isPlainAnchorActivation(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

/** Native-like anchor location and keyboard destination, without animated motion. */
export function arriveAtArticleHeading(id: string) {
  const heading = document.getElementById(id)
  if (!heading) return
  const top = window.scrollY + heading.getBoundingClientRect().top - articleClearance()
  // Preserve Next/history state, and encode IDs containing punctuation or spaces.
  const hash = `#${encodeURIComponent(id)}`
  if (window.location.hash !== hash) history.pushState(history.state, '', hash)
  const hadTabIndex = heading.hasAttribute('tabindex')
  if (!hadTabIndex) heading.setAttribute('tabindex', '-1')
  heading.focus({ preventScroll: true })
  if (!hadTabIndex) heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true })
  window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
  window.dispatchEvent(new Event('article-anchor-arrival'))
}
