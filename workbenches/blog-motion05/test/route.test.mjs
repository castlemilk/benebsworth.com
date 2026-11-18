import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { BASELINE, FIXTURES, ROOT_ID, canEnhanceLink, matchingFixtures, readRoute, routeUrl, viewFor } from '../fixtures.mjs'
import { renderIndex, renderReading } from '../render.mjs'
import { createWorkbenchServer } from '../serve.mjs'

test('fixture records retain source identity, released articles and distinct taxonomy keys', async () => {
  assert.equal(FIXTURES.length, 4)
  assert.equal(new Set(FIXTURES.map(item => item.id)).size, 4)
  for (const item of FIXTURES) {
    const source = await readFile(new URL(`../../../${item.sourcePath}`, import.meta.url), 'utf8')
    assert.ok(source.includes(item.label))
    assert.ok(item.evidenceHref.includes(BASELINE))
    if (item.kind === 'article') assert.match(source, /^release: true$/m)
  }
  assert.match(FIXTURES[0].taxonomy, /ee/)
  assert.match(FIXTURES[1].taxonomy, /engineering/)
  const rlc = await readFile(new URL('../../../content/blog/every-wire-is-an-rlc-circuit/index.mdx', import.meta.url), 'utf8')
  assert.match(rlc, /<LabSide effect="rlc-resonance"/)
})

test('unknown IDs remain explicit and filtering never changes the reading root or selection', () => {
  const route = readRoute('http://localhost/?inspect=missing&q=seasons&type=lab')
  assert.equal(route.inspect, 'missing')
  assert.equal(viewFor(route).selected, undefined)
  assert.equal(ROOT_ID, 'rlc-article')
  assert.equal(matchingFixtures(route)[0].id, 'seasons-lab')
  assert.equal(route.inspect, 'missing')
})

test('query updates preserve unrelated keys, fragments and encoded characters', () => {
  const value = routeUrl('http://localhost/?keep=1&q=old#inspection', { q: 'λ & <wire>', inspect: 'rlc-lab' })
  const url = new URL(value, 'http://localhost')
  assert.equal(url.searchParams.get('keep'), '1')
  assert.equal(url.searchParams.get('q'), 'λ & <wire>')
  assert.equal(url.hash, '#inspection')
  assert.throws(() => routeUrl(url, { root: 'new-authority' }), TypeError)
})

test('malformed enums and very long query input are bounded without accepting arbitrary state', () => {
  const route = readRoute(`http://localhost/?q=${'x'.repeat(900)}&type=no&review=no&motion=no&enhance=no`)
  assert.equal(route.q.length, 256)
  assert.equal(route.type, 'all')
  assert.equal(route.review, 'ready')
  assert.equal(route.motion, 'system')
  assert.equal(route.enhance, 'on')
})

test('waiting and unavailable results keep the current list distinct from a valid empty result', () => {
  for (const state of ['loading', 'unavailable']) {
    const view = viewFor(readRoute(`http://localhost/?review=${state}`))
    assert.equal(view.matches.length, 4)
    assert.match(view.status, /remain available/)
    assert.doesNotMatch(view.status, /0 matching/)
  }
  const empty = viewFor(readRoute('http://localhost/?review=empty'))
  assert.equal(empty.matches.length, 0)
  assert.equal(empty.selected.id, ROOT_ID)
  assert.match(empty.status, /0 matching sources/)
})

test('modified, secondary, download and other-document activations remain native', () => {
  const anchor = { href: 'http://localhost/?inspect=rlc-lab', target: '', hasAttribute: name => name === 'data-inspect-link' }
  const click = { button: 0, defaultPrevented: false }
  assert.equal(canEnhanceLink(click, anchor, 'http://localhost/'), true)
  for (const name of ['metaKey', 'ctrlKey', 'altKey', 'shiftKey', 'defaultPrevented']) assert.equal(canEnhanceLink({ ...click, [name]: true }, anchor, 'http://localhost/'), false)
  assert.equal(canEnhanceLink({ ...click, button: 1 }, anchor, 'http://localhost/'), false)
  assert.equal(canEnhanceLink(click, { ...anchor, target: '_blank' }, 'http://localhost/'), false)
  assert.equal(canEnhanceLink(click, { ...anchor, hasAttribute: () => true }, 'http://localhost/'), false)
  assert.equal(canEnhanceLink(click, { ...anchor, href: 'https://benebsworth.com/blog/' }, 'http://localhost/'), false)
  assert.equal(canEnhanceLink(click, { ...anchor, href: 'http://localhost/reading.html' }, 'http://localhost/'), false)
})

test('server-rendered no-JS and failed-enhancement responses contain real controls and source destinations', () => {
  const staticPage = renderIndex('http://localhost/?enhance=off&inspect=seasons-lab&type=lab')
  assert.doesNotMatch(staticPage, /<script/)
  assert.match(staticPage, /Seasons from a tilted axis/)
  assert.match(staticPage, /<form[^>]+method="get"/)
  assert.match(staticPage, /https:\/\/benebsworth.com\/lab\/seasons\//)
  assert.match(staticPage, /data-source-link href="https:\/\/benebsworth.com\/lab\/seasons\/"/)
  const failed = renderIndex('http://localhost/?enhance=broken&inspect=rlc-lab')
  assert.match(failed, /missing-enhancement.mjs/)
  assert.match(failed, /data-source-link href="https:\/\/benebsworth.com\/lab\/rlc-resonance\/"/)
  assert.match(failed, /Read source evidence/)
  assert.doesNotMatch(renderReading(), /<script/)
})

test('untrusted query text cannot create markup or an executable URL', () => {
  const page = renderIndex(`http://localhost/?q=${encodeURIComponent('"><script>bad()</script>')}&inspect=${encodeURIComponent('javascript:bad()')}`)
  assert.doesNotMatch(page, /<script>bad/)
  assert.match(page, /&lt;script&gt;/)
  assert.match(page, /This inspection link has no fixture/)
  assert.doesNotMatch(page, /href="javascript:/)
})

test('loopback HTTP responses enforce the tested fallback and restrict files to the declared map', async t => {
  const server = createWorkbenchServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`
  const response = await fetch(`${base}/?enhance=off&inspect=seasons-lab`)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-security-policy'), /script-src 'none'/)
  assert.match(response.headers.get('content-security-policy'), /connect-src 'none'/)
  assert.doesNotMatch(await response.text(), /<script/)
  assert.equal((await fetch(`${base}/missing-enhancement.mjs`)).status, 503)
  assert.equal((await fetch(`${base}/.git/config`)).status, 404)
  assert.equal((await fetch(`${base}/../package.json`)).status, 404)
  assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405)
  for (const path of ['/workbench.css', '/workbench.mjs', '/motion.mjs', '/assets/fonts/source-serif-4.woff2', '/assets/topics/custom-v6/ee.svg']) assert.equal((await fetch(base + path)).status, 200, path)
})
