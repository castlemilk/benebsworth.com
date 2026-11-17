/**
 * DOM-event regression tests, not browser rendering or native acceptance.
 *
 * The actual application module runs against JSDOM. Only unimplemented scroll
 * methods are stubbed; no geometry, native keyboard traversal, source-page
 * navigation, accessibility-tree behaviour or physical input is certified.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { SOURCE_REVISION } from './fixtures.mjs'

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8')
const baseURL = 'https://kg02.test/prototypes/knowledge-folio/'
const articleId = 'blog:chaos-in-one-equation'
const labId = 'lab:logistic-bifurcation'
let importSequence = 0

async function withApp(query, run) {
  const url = new URL(baseURL)
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  const dom = new JSDOM(html, { url: url.href, pretendToBeVisual: true })
  const { window } = dom
  const errors = []
  window.addEventListener('error', event => errors.push(event.error || event.message))
  // JSDOM does not compute layout or implement viewport scrolling.
  window.HTMLElement.prototype.scrollIntoView = function () {}
  window.scrollTo = function () {}
  const globals = {
    window,
    document: window.document,
    history: window.history,
    location: window.location,
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    ResizeObserver: undefined,
  }
  const previous = new Map()
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
  }
  const modules = []
  const mount = async () => {
    const appModule = await import(`./app.mjs?dom-test=${++importSequence}`)
    modules.push(appModule)
    return appModule
  }
  const byId = id => window.document.getElementById(id)
  const one = selector => window.document.querySelector(selector)
  const all = selector => [...window.document.querySelectorAll(selector)]
  const nodeControl = id => byId(`kg-node-${encodeURIComponent(id)}`)
  const params = () => new URL(window.location.href).searchParams
  const click = element => {
    assert.ok(element, 'the action exists in the rendered DOM')
    element.focus()
    element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
  }
  const change = (id, value) => {
    const element = byId(id)
    element.focus()
    element.value = value
    element.dispatchEvent(new window.Event('change', { bubbles: true }))
  }
  const submit = value => {
    byId('kg-query').value = value
    byId('kg-query').focus()
    byId('kg-search').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
  }
  const key = (element, key, options = {}) => {
    element.focus()
    const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options })
    element.dispatchEvent(event)
    return event
  }
  const assertUniqueIds = () => {
    const ids = all('[id]').map(element => element.id)
    assert.equal(new Set(ids).size, ids.length, 'every emitted DOM id is unique')
  }
  try {
    const app = await mount()
    await run({ window, document: window.document, app, mount, byId, one, all, nodeControl, params, click, change, submit, key, assertUniqueIds })
    assert.deepEqual(errors, [], 'the actual event handlers produced no uncaught DOM errors')
  } finally {
    for (const appModule of modules.reverse()) appModule.disposeKnowledgeFolio()
    window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
}

test('DOM: inspecting preserves the root; only explicit exploration changes it', async () => {
  await withApp({}, ({ byId, nodeControl, params, click }) => {
    assert.equal(byId('kg-view-title').textContent, 'Logistic map')
    click(nodeControl(articleId))
    assert.equal(params().get('kgSelected'), articleId)
    assert.equal(params().get('kgRoot'), null)
    assert.equal(byId('kg-view-title').textContent, 'Logistic map')
    assert.equal(byId('kg-inspector-title').textContent, 'Chaos hides in one line of algebra')
    assert.equal(byId('kg-primary-source').href, 'https://benebsworth.com/blog/chaos-in-one-equation/')
    click(byId('kg-reroot'))
    assert.equal(params().get('kgRoot'), articleId)
    assert.equal(byId('kg-view-title').textContent, 'Chaos hides in one line of algebra')
    assert.equal(byId('kg-inspector-title').textContent, 'Chaos hides in one line of algebra')
  })
})

test('DOM: repeated selections retain graph controls, focused identity and a single history entry per transition', async () => {
  await withApp({}, ({ window, document, nodeControl, click }) => {
    const article = nodeControl(articleId)
    const lab = nodeControl(labId)
    click(article)
    assert.strictEqual(nodeControl(articleId), article)
    assert.strictEqual(document.activeElement, article)
    const historyLength = window.history.length
    click(article)
    assert.equal(window.history.length, historyLength)
    assert.strictEqual(document.activeElement, article)
    click(lab)
    assert.strictEqual(nodeControl(articleId), article)
    assert.strictEqual(nodeControl(labId), lab)
    assert.strictEqual(document.activeElement, lab)
    assert.equal(lab.getAttribute('aria-current'), 'true')
    assert.equal(article.hasAttribute('aria-current'), false)
  })
})

test('DOM: reversed inspector relationships retain direction labels and recover focus to the selected control', async () => {
  await withApp({ kgRoot: articleId }, ({ document, one, byId, nodeControl, params, click, assertUniqueIds }) => {
    const outward = one(`#kg-inspector .kg-related-title[data-inspect="${labId}"]`)
    assert.match(outward.parentElement.querySelector('.kg-relation').textContent, /^Embeds lab · recorded$/u)
    const outwardId = outward.id
    click(outward)
    assert.equal(params().get('kgRoot'), articleId)
    assert.strictEqual(document.activeElement, nodeControl(labId))
    const reversed = one(`#kg-inspector .kg-related-title[data-inspect="${articleId}"]`)
    assert.match(reversed.parentElement.querySelector('.kg-relation').textContent, /^Embedded by article · recorded$/u)
    assert.notEqual(reversed.id, outwardId)
    assert.equal(byId(outwardId), null)
    click(reversed)
    assert.strictEqual(document.activeElement, nodeControl(articleId))
    assert.equal(byId('kg-inspector-title').textContent, 'Chaos hides in one line of algebra')
    assertUniqueIds()
  })
})

test('DOM: submitted search and kind filters update the list while preserving root and selection', async () => {
  await withApp({ kgSelected: articleId }, ({ document, byId, all, params, submit, change }) => {
    const queryControl = byId('kg-query')
    const kindControl = byId('kg-kind')
    submit('chaos')
    assert.equal(params().get('kgView'), 'list')
    assert.equal(params().get('kgQ'), 'chaos')
    assert.strictEqual(document.activeElement, byId('kg-view-title'))
    change('kg-kind', 'lab')
    assert.equal(params().get('kgKind'), 'lab')
    assert.equal(params().get('kgSelected'), articleId)
    assert.equal(params().get('kgRoot'), null)
    assert.deepEqual(all('.kg-results [data-node-id]').map(node => node.dataset.nodeId), [
      'lab:double-pendulum', labId, 'lab:lorenz-attractor',
    ])
    assert.strictEqual(byId('kg-query'), queryControl)
    assert.strictEqual(byId('kg-kind'), kindControl)
    assert.strictEqual(document.activeElement, kindControl)
    assert.match(byId('kg-inspector').textContent, /outside the current result page or filters/u)
  })
})

test('DOM: all 999 synthetic neighbours remain reachable across 84 list pages after a six-neighbour diagram cap', async () => {
  await withApp({ kgFixture: 'large' }, ({ document, byId, one, all, params, click }) => {
    assert.equal(all('.kg-network [data-node-id]').length, 7)
    assert.match(one('.kg-figure-footer').textContent, /6 of 999 available neighbours shown/u)
    click(one('.kg-figure-footer [data-kg-nav]'))
    assert.equal(params().get('kgScope'), 'neighbours')
    const visited = new Set()
    let pages = 0
    while (true) {
      pages += 1
      const records = all('.kg-results [data-node-id]')
      assert.ok(records.length > 0 && records.length <= 12)
      for (const record of records) {
        assert.notEqual(record.dataset.nodeId, 'mock:hub')
        assert.equal(visited.has(record.dataset.nodeId), false, 'pagination does not duplicate a record')
        visited.add(record.dataset.nodeId)
      }
      const next = byId('kg-next')
      if (!next) break
      assert.ok(pages < 100, 'the pagination reaches a final page')
      click(next)
      assert.strictEqual(document.activeElement, byId('kg-view-title'))
      assert.equal(params().get('kgScope'), 'neighbours')
    }
    assert.equal(pages, 84)
    assert.equal(visited.size, 999)
    assert.equal(all('.kg-results [data-node-id]').length, 3)
    assert.match(one('.kg-pagination').textContent, /Page 84 of 84/u)
    assert.match(one('.kg-pagination').textContent, /End of results/u)
  })
})

test('DOM: category overview retains all 20 blog topics and nine Lab categories, including distinct engineering keys', async () => {
  await withApp({ kgView: 'categories' }, ({ byId, one, all, params, click }) => {
    assert.equal(all('.kg-category-rows a').length, 29)
    assert.equal(one('[aria-label="Blog topics"] .kg-category-rows').children.length, 20)
    assert.equal(one('[aria-label="Lab categories"] .kg-category-rows').children.length, 9)
    assert.equal(byId('kg-taxonomy-blog-topic:ee').textContent, 'Electrical Eng')
    assert.equal(byId('kg-taxonomy-lab-category:engineering').textContent, 'Electrical Engineering')
    assert.equal(byId('kg-category').options.length, 30)
    click(byId('kg-taxonomy-lab-category:engineering'))
    assert.equal(params().get('kgCategory'), 'lab-category:engineering')
    assert.equal(params().get('kgView'), 'list')
    assert.match(byId('kg-view').textContent, /No items match these filters/u)
    assert.equal(byId('kg-category').value, 'lab-category:engineering')
  })
})

test('DOM: missing source metadata removes the previous primary action and optional tags without replacing identity', async () => {
  await withApp({ kgSelected: labId }, ({ byId, nodeControl, params, click, change }) => {
    assert.equal(byId('kg-primary-source').href, 'https://benebsworth.com/lab/logistic-bifurcation/')
    change('kg-fixture', 'missing')
    click(nodeControl(labId))
    assert.equal(params().get('kgSelected'), labId)
    assert.equal(byId('kg-inspector-title').textContent, 'Logistic Bifurcation')
    assert.equal(byId('kg-primary-source'), null)
    assert.match(byId('kg-inspector').textContent, /No standalone source link was supplied/u)
    assert.match(byId('kg-inspector').textContent, /Source evidence was not supplied/u)
    assert.doesNotMatch(byId('kg-inspector').textContent, /Original tags/u)
    assert.match(byId('kg-inspector').textContent, /Mock record for interface review/u)
  })
})

test('DOM: empty responses and failures are distinct and retry does not fabricate success', async () => {
  await withApp({ kgFixture: 'empty', kgSelected: 'requested:record' }, ({ byId, params }) => {
    assert.match(byId('kg-view-title').textContent, /There are no items/u)
    assert.equal(byId('kg-retry'), null)
    assert.equal(params().get('kgSelected'), 'requested:record')
    assert.equal(byId('kg-inspector-title').textContent, 'No source loaded.')
  })
  await withApp({ kgFixture: 'error', kgSelected: 'requested:record' }, ({ byId, params, click }) => {
    assert.equal(byId('kg-view-title').textContent, 'The graph is unavailable.')
    const retry = byId('kg-retry')
    click(retry)
    click(retry)
    assert.match(byId('kg-status').textContent, /^Retry 2:.*No successful result/u)
    assert.strictEqual(byId('kg-retry'), retry)
    assert.equal(byId('kg-view-title').textContent, 'The graph is unavailable.')
    assert.equal(params().get('kgSelected'), 'requested:record')
    assert.equal(byId('kg-primary-source'), null)
  })
})

test('DOM: partial coverage exposes unknown totals in both diagram and list', async () => {
  await withApp({ kgFixture: 'partial' }, ({ byId, one, params, click }) => {
    assert.match(byId('kg-availability').textContent, /Coverage is incomplete/u)
    assert.match(one('.kg-figure-footer').textContent, /loaded neighbours · total unknown/u)
    click(byId('kg-view-list'))
    assert.equal(params().get('kgView'), 'list')
    assert.match(byId('kg-view').textContent, /matching loaded items; overall total unknown/u)
    assert.doesNotMatch(byId('kg-view').textContent, /0 total/u)
  })
})

test('DOM: Close and inspector Escape return focus; modified or outside Escape leaves selection intact', async () => {
  await withApp({}, ({ document, byId, nodeControl, params, click, key }) => {
    const origin = nodeControl(labId)
    click(origin)
    const modified = key(byId('kg-primary-source'), 'Escape', { ctrlKey: true })
    assert.equal(modified.defaultPrevented, false)
    assert.equal(params().get('kgSelected'), labId)
    const outside = key(byId('kg-query'), 'Escape')
    assert.equal(outside.defaultPrevented, false)
    assert.equal(params().get('kgSelected'), labId)
    click(byId('kg-inspector-close'))
    assert.equal(params().get('kgSelected'), '')
    assert.equal(byId('kg-inspector-title').textContent, 'Choose an item.')
    assert.strictEqual(document.activeElement, origin)
    click(origin)
    const escape = key(byId('kg-primary-source'), 'Escape')
    assert.equal(escape.defaultPrevented, true)
    assert.equal(params().get('kgSelected'), '')
    assert.strictEqual(document.activeElement, origin)
  })
})

test('DOM: missing root and selection deep links remain explicit and injected markup stays text', async () => {
  const missing = 'missing:<img src=x onerror="bad()">'
  await withApp({ kgRoot: missing, kgSelected: 'missing:selected' }, ({ byId, one, params }) => {
    assert.equal(byId('kg-view-title').textContent, 'This root is unavailable.')
    assert.match(byId('kg-view').textContent, /missing:<img src=x/u)
    assert.equal(byId('kg-inspector-title').textContent, 'Selection unavailable.')
    assert.equal(params().get('kgRoot'), missing)
    assert.equal(params().get('kgSelected'), 'missing:selected')
    assert.equal(one('#kg-view img'), null)
    assert.equal(byId('kg-primary-source'), null)
  })
})

test('DOM: unavailable result pages do not silently clamp; explicit recovery retains the search and root', async () => {
  await withApp({ kgView: 'list', kgQ: 'chaos', kgKind: 'lab', kgPage: '999', kgSelected: articleId }, ({ document, byId, all, params, click }) => {
    assert.match(byId('kg-view').textContent, /This page is no longer available/u)
    assert.equal(params().get('kgPage'), '999')
    assert.equal(all('.kg-results [data-node-id]').length, 0)
    click(byId('kg-recover-page'))
    assert.equal(params().get('kgPage'), null)
    assert.equal(params().get('kgQ'), 'chaos')
    assert.equal(params().get('kgKind'), 'lab')
    assert.equal(params().get('kgSelected'), articleId)
    assert.equal(params().get('kgRoot'), null)
    assert.equal(all('.kg-results [data-node-id]').length, 3)
    assert.strictEqual(document.activeElement, byId('kg-view-title'))
  })
})

test('DOM: source actions keep canonical destinations; evidence IDs remain unique across selection and view changes', async () => {
  await withApp({}, ({ byId, all, nodeControl, click, assertUniqueIds }) => {
    const assertSafeSources = () => {
      for (const anchor of all('a[data-kg-source]')) {
        const url = new URL(anchor.getAttribute('href'))
        assert.equal(url.protocol, 'https:')
        assert.equal(url.username, '')
        assert.equal(url.password, '')
        assert.ok(['benebsworth.com', 'github.com'].includes(url.hostname))
        assert.ok(![...url.searchParams.keys()].some(key => key.startsWith('kg')))
        if (url.hostname === 'github.com') assert.ok(url.pathname.includes(`/blob/${SOURCE_REVISION}/`))
      }
      assertUniqueIds()
      const evidenceIds = all('.kg-evidence a').map(anchor => anchor.id)
      assert.ok(evidenceIds.every(Boolean))
      assert.equal(new Set(evidenceIds).size, evidenceIds.length)
    }
    assert.equal(byId('kg-primary-source').href, 'https://benebsworth.com/blog/chaos-in-one-equation/#eqn:logistic-map')
    assertSafeSources()
    click(nodeControl(articleId))
    assertSafeSources()
    click(nodeControl(labId))
    assertSafeSources()
    click(byId('kg-view-list'))
    assertSafeSources()
    click(nodeControl('study:editorial-system'))
    assert.equal(byId('kg-primary-source').href, 'https://benebsworth.com/lab/editorial-system/')
    assert.match(byId('kg-inspector').textContent, /No connections are recorded/u)
    assertSafeSources()
    click(byId('kg-view-categories'))
    assertSafeSources()
  })
})

test('DOM: unknown fixtures are unavailable rather than silently substituted, and their labels cannot create markup', async () => {
  const fixture = 'unknown:<img src=x onerror="bad()">'
  await withApp({ kgFixture: fixture, kgSelected: 'original:selection' }, ({ byId, one, params, click }) => {
    assert.equal(byId('kg-view-title').textContent, 'The graph is unavailable.')
    assert.match(byId('kg-view').textContent, /Unknown fixture: unknown:<img/u)
    assert.equal(byId('kg-fixture').value, fixture)
    assert.equal(one('#kg-view img'), null)
    click(byId('kg-retry'))
    assert.match(byId('kg-status').textContent, /No successful result was returned/u)
    assert.equal(params().get('kgFixture'), fixture)
    assert.equal(params().get('kgSelected'), 'original:selection')
    assert.equal(byId('kg-primary-source'), null)
  })
})

test('DOM: selecting a result preserves list identity; zero matches retain the inspector and permit clear recovery', async () => {
  await withApp({ kgView: 'list' }, ({ document, byId, nodeControl, all, params, click, submit }) => {
    const article = nodeControl(articleId)
    click(article)
    assert.strictEqual(nodeControl(articleId), article)
    assert.strictEqual(document.activeElement, article)
    submit('no-record-matches-this-query')
    assert.equal(all('.kg-results [data-node-id]').length, 0)
    assert.match(byId('kg-view').textContent, /No items match these filters/u)
    assert.equal(params().get('kgSelected'), articleId)
    assert.equal(byId('kg-inspector-title').textContent, 'Chaos hides in one line of algebra')
    click(byId('kg-empty-clear'))
    assert.equal(params().get('kgQ'), null)
    assert.equal(params().get('kgSelected'), articleId)
    assert.equal(all('.kg-results [data-node-id]').length, 10)
  })
})

test('DOM emulation: same-document Back and Forward restore URL state, inspector and recorded focus', async () => {
  await withApp({}, async ({ window, document, byId, nodeControl, params, click }) => {
    const travel = direction => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`JSDOM did not emit popstate for ${direction}`)), 1000)
      window.addEventListener('popstate', () => { clearTimeout(timeout); resolve() }, { once: true })
      window.history[direction]()
    })
    click(nodeControl(articleId))
    click(nodeControl(labId))
    await travel('back')
    assert.equal(params().get('kgSelected'), articleId)
    assert.equal(byId('kg-inspector-title').textContent, 'Chaos hides in one line of algebra')
    assert.equal(params().get('kgRoot'), null)
    assert.notStrictEqual(document.activeElement, document.body)
    await travel('forward')
    assert.equal(params().get('kgSelected'), labId)
    assert.equal(byId('kg-inspector-title').textContent, 'Logistic Bifurcation')
    assert.strictEqual(document.activeElement, nodeControl(labId))
    assert.equal(window.history.state.kg02.originId, `kg-node-${encodeURIComponent(labId)}`)
  })
})

test('DOM: theme changes replace history and preserve graph controls and selected identity', async () => {
  await withApp({ kgSelected: labId }, ({ window, document, byId, nodeControl, params, click }) => {
    const control = nodeControl(labId)
    const length = window.history.length
    click(byId('kg-theme'))
    assert.equal(document.body.dataset.theme, 'dark')
    assert.equal(params().get('kgTheme'), 'dark')
    assert.equal(params().get('kgSelected'), labId)
    assert.equal(window.history.length, length)
    assert.strictEqual(nodeControl(labId), control)
    assert.equal(byId('kg-theme').getAttribute('aria-pressed'), 'true')
    click(byId('kg-theme'))
    assert.equal(document.body.dataset.theme, 'light')
    assert.equal(params().get('kgTheme'), null)
    assert.equal(window.history.length, length)
  })
})

test('DOM: teardown detaches handlers and a fresh mount processes each action once', async () => {
  await withApp({}, async ({ window, app, mount, byId, nodeControl, params, click }) => {
    app.disposeKnowledgeFolio()
    const previousURL = window.location.href
    click(byId('kg-theme'))
    assert.equal(window.location.href, previousURL)
    await mount()
    click(byId('kg-theme'))
    assert.equal(params().get('kgTheme'), 'dark', 'one handler toggles once rather than two handlers cancelling each other')
    const length = window.history.length
    click(nodeControl(articleId))
    assert.equal(window.history.length, length + 1)
    assert.equal(params().get('kgSelected'), articleId)
    assert.equal(byId('kg-inspector-title').textContent, 'Chaos hides in one line of algebra')
  })
})
