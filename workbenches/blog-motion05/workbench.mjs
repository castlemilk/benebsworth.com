/** Specimen adapter only. Graph views retains the production router and model. */
import { createFeedback } from './motion.mjs'
import { canEnhanceLink, findFixture, readRoute, routeUrl, viewFor } from './fixtures.mjs'

const mounted = new WeakMap()
const pageMounts = new WeakMap()
const retainedContexts = new WeakMap()

export function mountWorkbench(scope) {
  mounted.get(scope)?.()
  const document = scope.ownerDocument
  const window = document.defaultView
  const abort = new window.AbortController()
  const query = selector => scope.querySelector(selector)
  const rows = Array.from(scope.querySelectorAll('[data-record]'))
  let route = readRoute(window.location.href)
  const retained = retainedContexts.get(scope)
  let focusContext = new Set(retained?.href === window.location.href ? retained.ids : [])
  retainedContexts.delete(scope)
  let disposed = false
  let feedback = route.motion === 'off' ? null : createFeedback(scope)

  const text = (selector, value) => { query(selector).textContent = value }
  const syncInputs = () => {
    for (const form of scope.querySelectorAll('form')) {
      for (const input of form.elements) {
        if (!(input.name in route)) continue
        if (input.type === 'radio') input.checked = input.value === route[input.name]
        else input.value = route[input.name]
      }
    }
  }
  const showRows = () => {
    const view = viewFor(route)
    for (const row of rows) {
      const matches = view.matches.some(item => item.id === row.dataset.record)
      // History may remove a match while its native link is focused. Retain it
      // for this route state, even after focus leaves: deleting it on focusout
      // could move another link between pointerdown and pointerup.
      if (!matches && row.contains(document.activeElement)) focusContext.add(row.dataset.record)
      const retained = row.dataset.record === route.inspect || focusContext.has(row.dataset.record)
      row.hidden = !matches && !retained
      row.dataset.context = String(!matches)
      row.querySelector('[data-context-label]').hidden = matches
    }
  }
  const render = ({ announce = false } = {}) => {
    const view = viewFor(route)
    showRows()
    for (const link of scope.querySelectorAll('[data-inspect-link]')) {
      const current = link.dataset.id === route.inspect
      if (current) link.setAttribute('aria-current', 'true')
      else link.removeAttribute('aria-current')
      link.href = routeUrl(window.location.href, { inspect: link.dataset.id })
      link.querySelector('[data-inspect-text]').textContent = current ? 'Inspected' : 'Inspect'
    }
    const item = view.selected
    text('[data-inspector-kind]', item?.kind || 'Missing fixture')
    text('[data-inspector-title]', item?.label || 'This inspection link has no fixture')
    text('[data-inspector-taxonomy]', item?.taxonomy || 'The requested ID is not in this bounded source set.')
    text('[data-inspector-evidence]', item?.evidence || 'The URL is retained. Choose a listed source to recover; an unknown ID is not silently replaced with the reading root.')
    const source = query('[data-source-link]')
    source.href = item?.href || 'https://benebsworth.com/blog/'
    source.textContent = item ? `Open ${item.kind} ↗` : 'Browse writing'
    query('[data-evidence-link]').href = item?.evidenceHref || 'https://github.com/castlemilk/benebsworth.com'
    query('[data-inspector-outside]').hidden = !view.outside
    query('[data-empty]').hidden = view.matches.length !== 0
    query('[data-recovery]').hidden = route.review !== 'unavailable'
    query('.bm-sources').setAttribute('aria-busy', String(route.review === 'loading'))
    query('[data-clear-link]').href = routeUrl(window.location.href, { q: '', type: 'all', review: 'ready' })
    query('[data-retry-link]').href = routeUrl(window.location.href, { review: 'ready' })
    for (const link of scope.querySelectorAll('[data-review-link]')) {
      link.href = routeUrl(window.location.href, { [link.dataset.routeKey]: link.dataset.routeValue })
    }
    if (announce) text('#result-status', view.status)
    syncInputs()
  }

  const navigate = (next, { cue, target, selection = false } = {}) => {
    const nextUrl = new URL(next, window.location.href)
    if (nextUrl.origin !== window.location.origin || nextUrl.pathname !== window.location.pathname) return false
    const unchanged = nextUrl.href === window.location.href
    if (unchanged) return true
    // Do not take over a native action when history is unavailable or rejects
    // the write. No DOM state has changed at this point.
    try { window.history.pushState(window.history.state, '', nextUrl) } catch { return false }
    const previousMotion = route.motion
    route = readRoute(nextUrl)
    focusContext = new Set()
    if (previousMotion !== route.motion) {
      feedback?.dispose()
      feedback = route.motion === 'off' ? null : createFeedback(scope)
    }
    render({ announce: true })
    if (selection) {
      const item = findFixture(route.inspect)
      text('#result-status', item ? `Inspection updated: ${item.label}.` : 'That inspection fixture is unavailable.')
    }
    // Semantic state was committed before any optional feedback begins.
    if (cue && target) feedback?.play(target, cue)
    if (selection) feedback?.play(query('.bm-inspector-rail'), 'inspector')
    return true
  }

  scope.addEventListener('click', event => {
    const anchor = event.target.closest?.('a')
    if (anchor?.hasAttribute('data-inspect-link') && canEnhanceLink(event, anchor, window.location.href)) {
      if (navigate(anchor.href, { cue: 'selection', target: anchor.querySelector('[data-motion-decoration]'), selection: true })) event.preventDefault()
      return
    }
    if (anchor?.matches('[data-clear-link], [data-retry-link]')) {
      // Same guard, without pretending external/source links are controls.
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || anchor.target || anchor.hasAttribute('download')) return
      if (navigate(anchor.href)) event.preventDefault()
    }
    if (event.target.closest?.('[data-art-replay]')) {
      const played = feedback?.play(query('.bm-art'), 'art') || false
      text('[data-motion-result]', played ? 'One 180 ms decorative arrival. The symbol and its label were already present.' : 'Static arrival. Preferences or unavailable animation keep the final state visible.')
    }
  }, { signal: abort.signal })

  scope.addEventListener('submit', event => {
    const form = event.target
    if (!form.matches('[data-filter-form], [data-review-form]') || event.defaultPrevented) return
    const changes = Object.fromEntries(new window.FormData(form))
    if (navigate(routeUrl(window.location.href, changes))) event.preventDefault()
  }, { signal: abort.signal })

  window.addEventListener('popstate', () => {
    feedback?.dispose()
    route = readRoute(window.location.href)
    focusContext = new Set()
    feedback = route.motion === 'off' ? null : createFeedback(scope)
    // No push, animation, focus or scroll on history restoration.
    render({ announce: true })
  }, { signal: abort.signal })

  const dispose = ({ preserveContext = false } = {}) => {
    if (disposed) return
    disposed = true
    if (preserveContext) retainedContexts.set(scope, { href: window.location.href, ids: [...focusContext] })
    else retainedContexts.delete(scope)
    abort.abort()
    feedback?.dispose()
    for (const element of scope.querySelectorAll('.bm-enhanced-only')) element.hidden = true
    if (mounted.get(scope) === dispose) mounted.delete(scope)
  }
  mounted.set(scope, dispose)
  render()
  for (const element of scope.querySelectorAll('.bm-enhanced-only')) element.hidden = false
  text('[data-enhancement-status]', 'Enhanced locally. Selection and filters update the URL; source links stay native. No focus or scroll override is installed.')
  return dispose
}

/** Own page lifecycle separately from a reusable mounted component. */
export function bindWorkbenchPage(scope) {
  pageMounts.get(scope)?.()
  const window = scope.ownerDocument.defaultView
  const abort = new window.AbortController()
  let dispose = mountWorkbench(scope)
  window.addEventListener('pagehide', event => dispose({ preserveContext: event.persisted }), { signal: abort.signal })
  window.addEventListener('pageshow', event => {
    if (event.persisted) dispose = mountWorkbench(scope)
  }, { signal: abort.signal })
  const cleanup = () => {
    abort.abort()
    dispose()
    retainedContexts.delete(scope)
    if (pageMounts.get(scope) === cleanup) pageMounts.delete(scope)
  }
  pageMounts.set(scope, cleanup)
  return cleanup
}

const root = typeof document !== 'undefined' && document.querySelector('[data-blog-motion05]')
if (root) bindWorkbenchPage(root)
