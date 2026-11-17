import { BASELINE, FIXTURES, ROOT_ID, escapeHtml as h, readRoute, routeUrl, viewFor } from './fixtures.mjs'

const check = value => value ? ' checked' : ''
const selected = value => value ? ' selected' : ''
const hide = value => value ? ' hidden' : ''
const nativeLink = (href, label, attributes = '') => `<a href="${h(href)}" ${attributes}>${h(label)}</a>`
const hidden = (name, value) => `<input type="hidden" name="${h(name)}" value="${h(value)}">`

function shell(title, body, script = '') {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="robots" content="noindex,nofollow"><title>${h(title)} · Blog motion 05</title><link rel="stylesheet" href="/workbench.css"></head>
<body class="bm05-document"><main data-blog-motion05>${body}</main>${script}</body></html>`
}

export function renderIndex(value = 'http://localhost/') {
  const url = value instanceof URL ? value : new URL(value)
  const route = readRoute(url)
  const view = viewFor(route)
  const item = view.selected
  const rows = FIXTURES.map(record => {
    const matches = view.matches.includes(record)
    const current = record.id === route.inspect
    return `<li data-record="${record.id}" data-kind="${record.kind}"${hide(!matches && !current)} data-context="${!matches}">
      <div class="bm-row-copy"><span class="bm-meta">${h(record.kind)} <span data-context-label${hide(matches)}>· outside this filter</span></span>
      <h3>${nativeLink(record.href, record.label)}</h3><p class="bm-taxonomy">${h(record.taxonomy)}</p></div>
      <a class="bm-inspect" data-inspect-link data-id="${record.id}" href="${h(routeUrl(url, { inspect: record.id }))}"${current ? ' aria-current="true"' : ''} aria-label="Inspect ${h(record.label)}"><span data-motion-decoration aria-hidden="true" class="bm-selection-mark"></span><span data-inspect-text>${current ? 'Inspected' : 'Inspect'}</span><span aria-hidden="true">↗</span></a>
    </li>`
  }).join('\n')
  const script = route.enhance === 'off' ? '' : `<script type="module" src="/${route.enhance === 'broken' ? 'missing-enhancement' : 'workbench'}.mjs"></script>`
  const keep = hidden('inspect', route.inspect) + hidden('review', route.review) + hidden('motion', route.motion) + hidden('enhance', route.enhance)
  const reviewKeep = hidden('inspect', route.inspect) + hidden('q', route.q) + hidden('type', route.type) + hidden('enhance', route.enhance)

  return shell('Selection without losing your place', `
  <div class="bm-sheet">
    <nav class="bm-topline" aria-label="Workbench navigation"><a href="#sources">Skip to sources</a><span>Ben Ebsworth · research folio</span><a href="#review">Review controls</a></nav>
    <header class="bm-intro"><p class="bm-eyebrow">Interaction study / motion 05</p><h1>Selection without<br class="bm-wide-only"> losing your place.</h1><p class="bm-deck">Read a source, inspect its context, then continue. The meaning changes immediately. A brief ink cue helps you find what changed.</p>
      <p class="bm-note">Keep the words still.<span aria-hidden="true" class="bm-note-stroke"></span></p>
    </header>
    <section class="bm-stage" aria-label="Inspection interaction specimen">
      <div class="bm-source-column">
        <div class="bm-section-heading"><h2 id="sources">Sources to inspect</h2><span class="bm-meta">4 source-backed fixtures</span></div>
        <p class="bm-root"><span class="bm-meta">Fixed reading root</span>${nativeLink(FIXTURES[0].href, FIXTURES[0].label)}<span>Inspecting another source leaves this root unchanged.</span></p>
        <form class="bm-filters" data-filter-form action="/" method="get" aria-label="Filter specimen sources">
          ${keep}<label>Find a source<input name="q" type="search" maxlength="256" value="${h(route.q)}" placeholder="Title or category"></label>
          <label>Kind<select name="type"><option value="all"${selected(route.type === 'all')}>All sources</option><option value="article"${selected(route.type === 'article')}>Articles</option><option value="lab"${selected(route.type === 'lab')}>Labs</option></select></label>
          <button type="submit">Apply</button><a class="bm-control" data-clear-link href="${h(routeUrl(url, { q: '', type: 'all', review: 'ready' }))}">Clear</a>
        </form>
        <p class="bm-status" id="result-status" role="status" aria-live="polite" aria-atomic="true">${h(view.status)}</p>
        <p class="bm-empty" data-empty${hide(view.matches.length !== 0)}>No matching sources. Clear the filter to read the full fixture set.</p>
        <p class="bm-recovery" data-recovery${hide(route.review !== 'unavailable')}>No successful empty response is implied. <a data-retry-link href="${h(routeUrl(url, { review: 'ready' }))}">Retry this specimen</a></p>
        <ol class="bm-sources" aria-label="Source list" aria-busy="${route.review === 'loading'}">${rows}</ol>
        <p class="bm-scope">These are two authored article–lab pairs. The seasons pair tests longer labels and a different category; it is not a claimed neighbour of the RLC root.</p>
      </div>
      <aside class="bm-inspector" aria-labelledby="inspection-title">
        <div class="bm-section-heading"><h2 id="inspection-title">Inspection</h2><a href="#inspection">Go to details</a></div>
        <div id="inspection" tabindex="-1" class="bm-inspection-body">
          <span data-motion-decoration aria-hidden="true" class="bm-inspector-rail"></span>
          <p class="bm-eyebrow" data-inspector-kind>${h(item?.kind || 'Missing fixture')}</p>
          <h3 data-inspector-title>${h(item?.label || 'This inspection link has no fixture')}</h3>
          <p class="bm-taxonomy" data-inspector-taxonomy>${h(item?.taxonomy || 'The requested ID is not in this bounded source set.')}</p>
          <p data-inspector-evidence>${h(item?.evidence || 'The URL is retained. Choose a listed source to recover; an unknown ID is not silently replaced with the reading root.')}</p>
          <div class="bm-inspector-links"><a data-source-link href="${h(item?.href || 'https://benebsworth.com/blog/')}">${item ? `Open ${h(item.kind)}` : 'Browse writing'} <span aria-hidden="true">↗</span></a><a data-evidence-link href="${h(item?.evidenceHref || `https://github.com/castlemilk/benebsworth.com/tree/${BASELINE}`)}">Read source evidence <span aria-hidden="true">↗</span></a></div>
          <p class="bm-inspector-state" data-inspector-outside${hide(!view.outside)}>This source is outside the current filter. Inspection is retained.</p>
          <p class="bm-meta">Selection is not keyboard focus.</p>
        </div>
        <div class="bm-art-study"><div class="bm-art" data-motion-decoration aria-hidden="true"><img src="/assets/topics/custom-v6/ee.svg" alt="" width="80" height="80"></div><p><span class="bm-meta">Category ink</span>Existing circuit symbol.<br>A metaphor, not a circuit model.</p></div>
        <div class="bm-enhanced-only" hidden><button data-art-replay type="button">Review art arrival</button><p class="bm-small" data-motion-result>Brief optional feedback; content is already visible.</p></div>
      </aside>
    </section>
    <section class="bm-return" aria-labelledby="return-title"><span class="bm-meta">A reading journey</span><h2 id="return-title">Leave a place to come back to.</h2><p>Scroll here, inspect a source, and open the local reading fixture. Use browser Back to check the previous position, selection and filter. This is a local navigation exercise; the original articles remain separate native links.</p><a class="bm-reading-link" href="/reading.html#reading-checkpoint">Open the reading fixture <span aria-hidden="true">↗</span></a></section>
    <details class="bm-review" id="review"><summary>Review controls and evidence boundaries</summary><div class="bm-review-content">
      <p>These controls exercise this standalone specimen. They do not change the blog, scientific models, operating-system preferences or stored user data.</p>
      <form data-review-form action="/" method="get">${reviewKeep}
        <label>Response fixture<select name="review"><option value="ready"${selected(route.review === 'ready')}>Ready</option><option value="loading"${selected(route.review === 'loading')}>Waiting, previous sources retained</option><option value="unavailable"${selected(route.review === 'unavailable')}>Unavailable, previous sources retained</option><option value="empty"${selected(route.review === 'empty')}>Valid empty result</option></select></label>
        <fieldset><legend>Optional motion</legend><label><input type="radio" name="motion" value="system"${check(route.motion === 'system')}> Follow browser preferences</label><label><input type="radio" name="motion" value="off"${check(route.motion === 'off')}> Always static</label></fieldset><button type="submit">Apply review state</button>
      </form>
      <p>Forced colours and reduced motion always take precedence. Theme follows the browser’s light/dark preference. Keyboard focus has a solid outline; inspection has an explicit label and side rule.</p>
      <nav class="bm-review-links" aria-label="Enhancement test cases">${nativeLink(routeUrl(url, { enhance: 'off' }), 'Without JavaScript', 'data-review-link data-route-key="enhance" data-route-value="off"')}${nativeLink(routeUrl(url, { enhance: 'broken' }), 'Failed enhancement module', 'data-review-link data-route-key="enhance" data-route-value="broken"')}${nativeLink(routeUrl(url, { enhance: 'on' }), 'Normal enhancement', 'data-review-link data-route-key="enhance" data-route-value="on"')}${nativeLink(routeUrl(url, { inspect: 'missing-fixture' }), 'Unknown inspection ID', 'data-review-link data-route-key="inspect" data-route-value="missing-fixture"')}</nav>
      <p data-enhancement-status>Server-rendered specimen. Native links and GET forms work before enhancement.</p>
      <p class="bm-small">First-entry guide state remains with InteractiveStudy. This workbench does not replay or replace it. No generated artwork or scientific data is used.</p>
      <p class="bm-meta">Source baseline ${BASELINE.slice(0, 12)} · isolated review only · not deployed</p>
    </div></details>
    <footer class="bm-footer"><span>Blog motion 05</span><a href="https://github.com/castlemilk/benebsworth.com/blob/${BASELINE}/DESIGN.md">Editorial direction</a><span>Native destinations. Stable words.</span></footer>
  </div>`, script)
}

export function renderReading() {
  return shell('Reading position fixture', `<article class="bm-sheet bm-reading">
    <nav class="bm-topline" aria-label="Reading fixture navigation"><a href="/">Source workbench</a><span>Local reading fixture</span></nav>
    <header class="bm-intro"><p class="bm-eyebrow">Return-to-reading review</p><h1>A place in the margin.</h1><p class="bm-deck">This page provides a real document boundary for checking browser history and reading position.</p></header>
    <section><h2>Before the checkpoint</h2><p>The workbench’s source titles and links are drawn from a pinned repository revision. Its inspection controls are a separate interaction specimen. Following a source opens its original destination; this local page exists only to exercise navigation.</p><p>Nothing on this page changes scroll restoration, starts an animation, calls a provider, or records your reading activity. Its links are ordinary anchors.</p></section>
    <section id="reading-checkpoint" tabindex="-1"><p class="bm-meta">Reading checkpoint</p><h2>Keep the argument in view.</h2><p>Use browser Back after reading this paragraph. The previous workbench entry should recover its own selection, filter and reading position. A URL fragment does not authorise a script to drag you back to a heading on every history traversal.</p><p>Keyboard focus and the currently inspected source serve different purposes. An inspection cue may identify changed context while the focused link stays in the source list. Reading the context is an explicit action.</p><p>The static response contains the source list and the inspector. If enhancement fails, a native navigation still resolves the same query. With JavaScript disabled, a full page load is expected; no working graph application is claimed.</p></section>
    <section><h2>Continue to the authored source.</h2><p>The original article and its real lab retain their own content and interaction contracts. This fixture does not reproduce, certify or change the simulation.</p><p>${nativeLink(FIXTURES[0].href, FIXTURES[0].label)}</p><p>${nativeLink(FIXTURES[1].href, 'Open the RLC Resonance lab')}</p><p><a href="/?inspect=${ROOT_ID}">Open a fresh workbench entry</a>. To restore the previous entry, use the browser’s Back command.</p></section>
    <footer class="bm-footer"><span>Static reading specimen</span><span>No scripts</span></footer>
  </article>`)
}
