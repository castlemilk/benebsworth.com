/** DOM-model tests. JSDOM does not establish layout, browser history or AT acceptance. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM, VirtualConsole } from 'jsdom'
import { renderIndex } from '../render.mjs'
import { mountWorkbench, bindWorkbenchPage } from '../workbench.mjs'

function fixture(t, query = '') {
  const dom = new JSDOM(renderIndex(`http://localhost/${query}`), {
    url: `http://localhost/${query}`, pretendToBeVisual: true,
    // Native navigation is outside JSDOM. Tests check whether enhancement
    // cancels the event, never claim that this model opened another document.
    virtualConsole: new VirtualConsole(),
  })
  const { window } = dom
  const document = window.document
  const media = new Map()
  window.matchMedia = name => {
    if (!media.has(name)) { const target = new window.EventTarget(); target.matches = false; media.set(name, target) }
    return media.get(name)
  }
  const effects = []
  window.Element.prototype.animate = function (frames, options) {
    const effect = { frames, options, target: this, cancelled: false, cancel() { this.cancelled = true }, finished: new Promise(() => {}) }
    effects.push(effect)
    return effect
  }
  const scope = document.querySelector('[data-blog-motion05]')
  const q = selector => scope.querySelector(selector)
  const dispose = mountWorkbench(scope)
  t.after(() => { dispose(); window.close() })
  const click = element => {
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    element.dispatchEvent(event)
    return event
  }
  const submit = form => {
    const event = new window.Event('submit', { bubbles: true, cancelable: true })
    form.dispatchEvent(event)
    return event
  }
  return { window, document, scope, q, click, submit, effects, dispose }
}

test('selection commits immediately, preserves the native node/focus and opaque history state', t => {
  const { window, document, q, click, effects } = fixture(t)
  window.history.replaceState({ router: { key: 'owned-elsewhere' } }, '', '/')
  const link = q('[data-id="rlc-lab"]')
  const sourceLink = q('[data-source-link]')
  link.focus()
  const event = click(link)
  assert.equal(event.defaultPrevented, true)
  assert.equal(document.activeElement, link)
  assert.equal(q('[data-source-link]'), sourceLink)
  assert.equal(q('[data-inspector-title]').textContent, 'RLC Resonance')
  assert.equal(sourceLink.href, 'https://benebsworth.com/lab/rlc-resonance/')
  assert.deepEqual(window.history.state, { router: { key: 'owned-elsewhere' } })
  assert.equal(window.location.search, '?inspect=rlc-lab')
  assert.equal(effects.length, 2)
  assert.equal(effects[0].target.textContent, '')
  const length = window.history.length
  click(link)
  assert.equal(window.history.length, length)
  assert.equal(effects.length, 2)
})

test('failed history write leaves the native link action and rendered state intact', t => {
  const { window, q, click, effects } = fixture(t)
  window.history.pushState = () => { throw new Error('History unavailable') }
  const event = click(q('[data-id="rlc-lab"]'))
  assert.equal(event.defaultPrevented, false)
  assert.match(q('[data-inspector-title]').textContent, /Every Wire/)
  assert.equal(effects.length, 0)
})

test('filtering retains inspected context, reports count and keeps control focus', t => {
  const { document, q, submit } = fixture(t)
  const input = q('[name=q]')
  input.focus()
  input.value = 'seasons'
  assert.equal(submit(q('[data-filter-form]')).defaultPrevented, true)
  assert.equal(document.activeElement, input)
  assert.match(q('#result-status').textContent, /1 matching source/)
  assert.equal(q('[data-record="rlc-article"]').hidden, false)
  assert.equal(q('[data-record="rlc-article"]').dataset.context, 'true')
  assert.equal(q('[data-record="rlc-lab"]').hidden, true)
  assert.match(q('[data-inspector-title]').textContent, /Every Wire/)
})

test('history restoration cancels old feedback, performs no new history write and does not move focus', t => {
  const { window, document, q, click, effects } = fixture(t)
  const lab = q('[data-id="rlc-lab"]')
  lab.focus()
  click(lab)
  const length = window.history.length
  window.history.replaceState({ restored: true }, '', '/?inspect=rlc-article')
  window.dispatchEvent(new window.PopStateEvent('popstate'))
  assert.equal(window.history.length, length)
  assert.equal(document.activeElement, lab)
  assert.equal(effects.length, 2)
  assert.ok(effects.every(effect => effect.cancelled))
  assert.match(q('[data-inspector-title]').textContent, /Every Wire/)
})

test('an excluded focused source stays until the next route action, avoiding pointerdown layout shifts', async t => {
  const { window, document, q, submit } = fixture(t)
  const focused = q('[data-record="seasons-article"] h3 a')
  focused.focus()
  window.history.replaceState(null, '', '/?q=RLC&inspect=rlc-article')
  window.dispatchEvent(new window.PopStateEvent('popstate'))
  assert.equal(document.activeElement, focused)
  assert.equal(q('[data-record="seasons-article"]').hidden, false)
  assert.equal(q('[data-record="seasons-article"]').dataset.context, 'true')
  q('[name=q]').focus()
  await Promise.resolve()
  assert.equal(q('[data-record="seasons-article"]').hidden, false)
  q('[name=q]').value = 'Resonance'
  submit(q('[data-filter-form]'))
  assert.equal(q('[data-record="seasons-article"]').hidden, true)
})

test('no-JS and failure comparison links inherit the current selection and filter', t => {
  const { q, click, submit } = fixture(t)
  click(q('[data-id="seasons-lab"]'))
  q('[name=q]').value = 'seasons'
  submit(q('[data-filter-form]'))
  for (const link of q('.bm-review-links').querySelectorAll('a')) {
    const url = new URL(link.href)
    assert.equal(url.searchParams.get('q'), 'seasons')
    if (link.dataset.routeKey !== 'inspect') assert.equal(url.searchParams.get('inspect'), 'seasons-lab')
    assert.equal(url.searchParams.get(link.dataset.routeKey), link.dataset.routeValue)
  }
})

test('unknown inspection and failed/waiting states keep recoverable native destinations', t => {
  const { window, q } = fixture(t, '?inspect=missing-fixture&review=unavailable')
  assert.match(q('[data-inspector-title]').textContent, /no fixture/)
  assert.equal(q('[data-source-link]').href, 'https://benebsworth.com/blog/')
  assert.equal(q('[data-recovery]').hidden, false)
  assert.equal(q('.bm-sources').getAttribute('aria-busy'), 'false')
  window.history.replaceState(null, '', '/?review=loading')
  window.dispatchEvent(new window.PopStateEvent('popstate'))
  assert.equal(q('.bm-sources').getAttribute('aria-busy'), 'true')
  assert.equal(Array.from(q('.bm-sources').children).filter(row => !row.hidden).length, 4)
})

test('pagehide settles effects and persisted pageshow remounts once without replay', t => {
  const { window, scope, q, click, effects, dispose } = fixture(t)
  dispose()
  const cleanup = bindWorkbenchPage(scope)
  t.after(cleanup)
  click(q('[data-id="rlc-lab"]'))
  window.dispatchEvent(new window.PageTransitionEvent('pagehide', { persisted: true }))
  assert.ok(effects.every(effect => effect.cancelled))
  assert.equal(q('.bm-enhanced-only').hidden, true)
  window.dispatchEvent(new window.PageTransitionEvent('pageshow', { persisted: true }))
  assert.equal(q('.bm-enhanced-only').hidden, false)
  assert.equal(effects.length, 2)
  const length = window.history.length
  click(q('[data-id="seasons-lab"]'))
  assert.equal(window.history.length, length + 1)
  assert.equal(effects.length, 4)
})

test('repeated mount leaves one handler and disposal restores native fallback', t => {
  const { window, scope, q, click, dispose } = fixture(t)
  const nextDispose = mountWorkbench(scope)
  t.after(nextDispose)
  dispose() // An old owner cannot remove the new owner's handlers.
  const length = window.history.length
  click(q('[data-id="rlc-lab"]'))
  assert.equal(window.history.length, length + 1)
  nextDispose()
  assert.equal(click(q('[data-id="seasons-lab"]')).defaultPrevented, false)
})

test('persisted page return keeps retained route context after focus moves to the reading link', t => {
  const { window, document, scope, q, effects, dispose } = fixture(t)
  dispose()
  const cleanup = bindWorkbenchPage(scope)
  t.after(cleanup)
  q('[data-record="seasons-article"] h3 a').focus()
  window.history.replaceState({ reader: 'retained' }, '', '/?q=RLC&inspect=rlc-article')
  window.dispatchEvent(new window.PopStateEvent('popstate'))
  const retainedRow = q('[data-record="seasons-article"]')
  assert.equal(retainedRow.hidden, false)
  const readingLink = q('a[href="/reading.html#reading-checkpoint"]')
  readingLink.focus()
  const length = window.history.length
  window.dispatchEvent(new window.PageTransitionEvent('pagehide', { persisted: true }))
  window.dispatchEvent(new window.PageTransitionEvent('pageshow', { persisted: true }))
  assert.equal(retainedRow.hidden, false)
  assert.equal(retainedRow.dataset.context, 'true')
  assert.equal(document.activeElement, readingLink)
  assert.equal(window.history.length, length)
  assert.deepEqual(window.history.state, { reader: 'retained' })
  assert.equal(effects.length, 0)
})

test('always-static mode suppresses effects and cancelling it does not replay arrival', t => {
  const { q, click, submit, effects } = fixture(t, '?motion=off')
  click(q('[data-id="rlc-lab"]'))
  assert.equal(effects.length, 0)
  q('[name=motion][value=system]').checked = true
  submit(q('[data-review-form]'))
  assert.equal(effects.length, 0)
  click(q('[data-art-replay]'))
  assert.equal(effects.length, 1)
})
