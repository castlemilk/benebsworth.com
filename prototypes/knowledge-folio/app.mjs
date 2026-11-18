import { loadFixture } from './fixtures.mjs'
import { readViewState, buildViewHref, indexSnapshot, getNeighbourhood, queryNodes, safeSourceHref } from './view-state.mjs'

// Consumer-only presentation. The source model and scientific content are not
// inferred here. All graph relationships come from the supplied fixture.
const $ = id => document.getElementById(id)
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const kinds = { blog: 'Article', lab: 'Lab', study: 'Study', concept: 'Concept', tag: 'Tag', category: 'Category' }
const sourceActions = { blog: 'Read article', lab: 'Try lab', study: 'Open design study', concept: 'Read named passage', tag: 'Open source page', category: 'Open category page' }
const fixtureNames = new Set(['source', 'empty', 'error', 'partial', 'missing', 'long-label', 'large'])
const nodeElementId = id => `kg-node-${encodeURIComponent(id)}`
let snapshot, index, state, previousViewKey, previousInspectorKey, previousFixture
let lastOriginId = null
let disposed = false
let drawingFrame = 0
let resizeObserver
let retries = 0

function href(patch) { return buildViewHref(location.href, patch, snapshot.defaultRootId) }
function navLink(label, patch, attributes = '') {
  return `<a data-kg-nav data-kg-patch="${escape(JSON.stringify(patch))}" href="${escape(href(patch))}" ${attributes}>${escape(label)}</a>`
}
function sourceLink(url, label, className = '', id = '') {
  const safe = safeSourceHref(url)
  return safe ? `<a data-kg-source href="${escape(safe)}"${className ? ` class="${className}"` : ''}${id ? ` id="${id}"` : ''}>${escape(label)}</a>` : ''
}
function sourceRefs(refs, namespace) {
  if (!refs?.length) return '<p class="kg-muted">Source evidence was not supplied for this record.</p>'
  return `<ul class="kg-evidence">${refs.map((ref, position) => `<li>${sourceLink(ref.href, ref.label, '', `kg-source-${escape(encodeURIComponent(namespace))}-${position}`) || escape(ref.label)}<span>${escape(ref.claim)}</span></li>`).join('')}</ul>`
}
function relatedEdges(id) {
  return (index.adjacency.get(id) ?? []).filter(edge => index.byId.has(edge.source) && index.byId.has(edge.target))
}
function otherNode(edge, id) { return index.byId.get(edge.source === id ? edge.target : edge.source) }
function relation(edge, id) { return edge.source === id ? edge.label : edge.reverseLabel || edge.label }

function rememberView() {
  if (disposed) return
  const existing = history.state && typeof history.state === 'object' ? history.state : {}
  history.replaceState({ ...existing, kg02: { focusId: document.activeElement?.id || null, originId: lastOriginId, scrollY: window.scrollY } }, '', location.href)
}

function navigate(nextHref, { replace = false, focusId = null } = {}) {
  const next = new URL(nextHref, location.href)
  if (next.origin !== location.origin || next.pathname !== location.pathname) return
  if (next.href === location.href) {
    if (focusId) focusElement(focusId)
    return
  }
  rememberView()
  const existing = history.state && typeof history.state === 'object' ? history.state : {}
  history[replace ? 'replaceState' : 'pushState']({ ...existing, kg02: { originId: lastOriginId, focusId: focusId || document.activeElement?.id || null, scrollY: window.scrollY } }, '', next.href)
  render({ syncQuery: true })
  if (focusId) focusElement(focusId)
  rememberView()
}

function focusElement(id, scroll = true) {
  const element = $(id) || $('kg-view-title') || $('kg-main')
  element.focus({ preventScroll: true })
  if (scroll) element.scrollIntoView({ block: 'nearest', behavior: 'instant' })
}

function restoreView(saved) {
  if (!saved) return
  lastOriginId = saved.originId || null
  if (saved.focusId) focusElement(saved.focusId, false)
  if (Number.isFinite(saved.scrollY)) window.scrollTo({ top: saved.scrollY, behavior: 'instant' })
}

function loadCurrentSnapshot() {
  const name = new URL(location.href).searchParams.get('kgFixture') || 'source'
  if (previousFixture !== name) {
    snapshot = fixtureNames.has(name) ? loadFixture(name) : {
      id: name, label: 'Unavailable review fixture', disclosure: 'This review scenario was not found. Your requested URL has been retained.',
      status: 'error', revision: null, defaultRootId: '', nodes: [], edges: [], taxonomies: [], totalNodes: null,
      reason: `Unknown fixture: ${name}`,
    }
    index = indexSnapshot(snapshot)
    previousFixture = name
    previousViewKey = previousInspectorKey = null
    retries = 0
    renderCategoryOptions()
  }
  state = readViewState(location.href, snapshot.defaultRootId)
}

function renderCategoryOptions() {
  const namespaces = [...new Set(snapshot.taxonomies.map(item => item.namespace))]
  $('kg-category').innerHTML = '<option value="">Every category</option>' + namespaces.map(namespace => `<optgroup label="${escape(namespace)}">${snapshot.taxonomies.filter(item => item.namespace === namespace).map(item => `<option value="${escape(item.id)}">${escape(item.label)}</option>`).join('')}</optgroup>`).join('')
}

function syncSelect(element, value, fallbackLabel) {
  for (const option of element.querySelectorAll('[data-unknown]')) option.remove()
  if (![...element.options].some(option => option.value === value)) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = `${fallbackLabel}: ${value}`
    option.dataset.unknown = 'true'
    element.append(option)
  }
  element.value = value
}

function renderChrome(syncQuery) {
  document.body.dataset.theme = state.theme
  $('kg-theme').textContent = state.theme === 'dark' ? 'Light paper' : 'Dark paper'
  $('kg-theme').setAttribute('aria-pressed', String(state.theme === 'dark'))
  $('kg-disclosure').textContent = snapshot.disclosure
  $('kg-revision').textContent = snapshot.revision ? `Source revision: ${snapshot.revision}. Original URLs are source-derived; this prototype makes no deployment claim.` : 'Synthetic review data. No source or deployment claim.'
  for (const link of document.querySelectorAll('[data-view]')) {
    link.href = href({ view: link.dataset.view, page: 1 })
    if (link.dataset.view === state.view) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }
  if (syncQuery) $('kg-query').value = state.query
  document.querySelector('#kg-search label').textContent = state.scope === 'neighbours' ? 'Search the root’s loaded neighbours' : 'Find a concept, article or experiment'
  $('kg-filter-line').hidden = state.view !== 'list'
  syncSelect($('kg-kind'), state.kind, 'Unavailable type')
  syncSelect($('kg-category'), state.categoryId, 'Unavailable category')
  syncSelect($('kg-fixture'), state.fixture, 'Unavailable fixture')
  $('kg-clear').href = href({ query: '', kind: '', categoryId: '', page: 1, view: 'list' })
  for (const [id, selectedId] of [['kg-start-concept', 'concept:logistic-map:proposal'], ['kg-start-article', 'blog:chaos-in-one-equation'], ['kg-start-lab', 'lab:logistic-bifurcation']]) {
    $(id).href = href({ fixture: 'source', rootId: 'concept:logistic-map:proposal', selectedId, view: 'neighbourhood', scope: 'collection', query: '', kind: '', categoryId: '', page: 1 })
  }
  const root = index.byId.get(state.rootId)
  const selected = index.byId.get(state.selectedId)
  $('kg-context').innerHTML = `<p><span class="kg-label">Root of neighbourhood</span><br><strong>${escape(root?.label || state.rootId || 'No root available')}</strong></p><button type="button" id="kg-inspector-jump" data-action="jump-inspector">${selected ? `Inspecting: ${escape(selected.label)} ↓` : state.selectedId ? 'Inspect unavailable selection ↓' : 'Open inspector ↓'}</button>`
  $('kg-availability').innerHTML = snapshot.status === 'partial'
    ? `<div class="kg-availability"><strong>Coverage is incomplete.</strong> ${snapshot.nodes.length} items are loaded; total size and unreturned connections are unknown.</div>`
    : index.danglingEdges ? `<div class="kg-availability">${index.danglingEdges} recorded relationship endpoints are unavailable. They have not been presented as complete connections.</div>` : ''
}

function message(title, text, actions = '', primary = true) {
  return `<div class="kg-message"><${primary ? 'h2 id="kg-view-title" tabindex="-1"' : 'h3'}>${escape(title)}</${primary ? 'h2' : 'h3'}><p>${escape(text)}</p>${actions}</div>`
}

function renderNeighbourhood() {
  const neighbourhood = getNeighbourhood(snapshot, index, state.rootId, 6)
  if (!neighbourhood.root) return message('This root is unavailable.', `The requested item “${state.rootId}” is not in this snapshot. Your selection and URL have been kept.`, navLink('Browse the available items', { view: 'list', scope: 'collection', query: '', kind: '', categoryId: '', page: 1 }))
  const root = neighbourhood.root
  const members = [root, ...neighbourhood.nodeIds.map(id => index.byId.get(id))]
  const count = neighbourhood.total === null ? `${neighbourhood.shown} loaded neighbours · total unknown` : `${neighbourhood.shown} of ${neighbourhood.total} available neighbours shown`
  return `<div class="kg-view-heading"><div><span class="kg-label">One step from the root</span><h2 id="kg-view-title" tabindex="-1">${escape(root.label)}</h2><p class="kg-caption">Inspect an item to read its source trail. Only “Explore from this item” changes the root.</p></div></div>
    <div class="kg-neighbourhood" id="kg-neighbourhood">
      <svg class="kg-connections" id="kg-connections" aria-hidden="true"></svg>
      <ol class="kg-network" style="--kg-rows:${Math.max(1, members.length - 1)}" aria-label="Root and its immediate neighbours">
        ${members.map((node, position) => {
          const edge = position ? neighbourhood.edges.find(candidate => candidate.source === node.id || candidate.target === node.id) : null
          return `<li class="kg-node${position ? '' : ' kg-node-root'}">${navLink('', { selectedId: node.id }, `id="${nodeElementId(node.id)}" data-node-id="${escape(node.id)}" data-inspect="${escape(node.id)}"${position ? '' : ' data-root-node'}`).replace('></a>', `><span class="kg-label">${position ? escape(kinds[node.kind] || node.kind) : 'Neighbourhood root'}</span><span class="kg-node-label">${escape(node.label)}</span><span class="kg-edge-name">${edge ? escape(relation(edge, root.id)) + (edge.mappingStatus === 'proposed' ? ' · proposed' : edge.mappingStatus === 'mock' ? ' · mock' : ' · recorded') : escape(kinds[node.kind] || node.kind) + (node.mappingStatus === 'proposed' ? ' · proposed mapping' : '')}</span></a>`)}</li>`
        }).join('')}
      </ol>
    </div>
    <div class="kg-figure-footer"><span>${escape(count)}<br>Counts refer to this fixture.</span>${navLink('List all loaded neighbours', { view: 'list', scope: 'neighbours', query: '', kind: '', categoryId: '', page: 1 })}</div>
    <p class="kg-legend">Solid lines: recorded relationships. Dashed: proposed mappings. Dotted: mock review relationships. Lines do not imply scientific equivalence.</p>
    ${neighbourhood.shown === 0 ? `<p class="kg-caption">${snapshot.status === 'partial' ? 'No connections are loaded for this root. Coverage is incomplete.' : 'No connections are recorded for this root in the sample.'}</p>` : ''}
    ${neighbourhood.truncated ? '<p class="kg-caption">The diagram is capped at six neighbours to keep titles readable. The inspector and searchable list retain access to all loaded records.</p>' : ''}`
}

function renderList() {
  if (state.scope === 'neighbours' && !index.byId.has(state.rootId)) return message('This neighbourhood is unavailable.', `The requested root “${state.rootId}” is not in the loaded snapshot. No substitute neighbourhood is shown.`, navLink('Browse the entire loaded collection', { scope: 'collection', query: '', kind: '', categoryId: '', page: 1 }))
  const result = queryNodes(snapshot, state)
  const description = snapshot.status === 'partial' ? `${result.total} matching loaded items; overall total unknown.` : `${result.total} matching items in this fixture.`
  const scopeLabel = state.scope === 'neighbours' ? `Neighbours of ${index.byId.get(state.rootId).label}` : 'The entire loaded collection'
  const heading = `<div class="kg-view-heading"><div><span class="kg-label">${escape(scopeLabel)}</span><h2 id="kg-view-title" tabindex="-1">${state.query ? `Results for “${escape(state.query)}”` : 'The reading index'}</h2><p class="kg-caption">${escape(description)} Source links lead to the original writing and experiments.</p><p class="kg-caption">${state.scope === 'neighbours' ? navLink('Search the entire collection', { scope: 'collection', page: 1 }) : navLink('Only the root’s loaded neighbours', { scope: 'neighbours', page: 1 })}</p></div></div>`
  if (result.outOfRange) return heading + message('This page is no longer available.', `Page ${state.page} is outside the ${Math.max(1, result.pages)} available result pages. The requested page has not been silently changed.`, navLink('Go to the last available page', { page: Math.max(1, result.pages) }, 'id="kg-recover-page"'), false)
  if (!result.total) return heading + message('No items match these filters.', snapshot.status === 'partial' ? 'Try a shorter query or clear the filters. Unloaded records may still match.' : 'Try a shorter query or clear the filters. The inspector retains your selected item.', navLink('Clear search and filters', { query: '', kind: '', categoryId: '', page: 1 }, 'id="kg-empty-clear"'), false)
  return heading + `<ol class="kg-results">${result.items.map(node => `<li class="kg-result"><span class="kg-label">${escape(kinds[node.kind] || node.kind)}${node.mappingStatus === 'mock' ? ' · mock' : node.mappingStatus === 'proposed' ? ' · proposed' : ''}</span><div>${navLink(node.label, { selectedId: node.id }, `class="kg-result-title" id="${nodeElementId(node.id)}" data-node-id="${escape(node.id)}" data-inspect="${escape(node.id)}"`)}<p>${escape(node.summary)}</p>${state.scope === 'neighbours' ? `<ul class="kg-list-relations">${(index.adjacency.get(state.rootId) || []).filter(edge => edge.source === node.id || edge.target === node.id).map(edge => `<li>${escape(relation(edge, state.rootId))} · ${escape(edge.mappingStatus)}<details><summary>Relationship evidence</summary>${sourceRefs(edge.sourceRefs, `list-${node.id}-${edge.id}`)}</details></li>`).join('')}</ul>` : ''}<div class="kg-result-links">${sourceLink(node.href, sourceActions[node.kind] || 'Open source', '', `kg-list-source-${escape(encodeURIComponent(node.id))}`)} ${navLink('Explore from here', { rootId: node.id, selectedId: node.id, view: 'neighbourhood' }, `data-reroot="${escape(node.id)}"`)}</div></div></li>`).join('')}</ol><nav class="kg-pagination" aria-label="Result pages">${state.page > 1 ? navLink('← Previous page', { page: state.page - 1 }, 'id="kg-previous" data-page-link') : '<span></span>'}<span>Page ${result.page} of ${result.pages} · ${result.items.length} shown</span>${state.page < result.pages ? navLink('Next page →', { page: state.page + 1 }, 'id="kg-next" data-page-link') : '<span>End of results</span>'}${result.pages > 2 && state.page < result.pages ? navLink(`Last page (${result.pages})`, { page: result.pages }, 'id="kg-last" data-page-link') : ''}</nav>`
}

function renderCategories() {
  const namespaces = [...new Set(snapshot.taxonomies.map(item => item.namespace))]
  return `<div class="kg-view-heading"><div><span class="kg-label">Keep the source taxonomies intact</span><h2 id="kg-view-title" tabindex="-1">Ways into the collection.</h2><p class="kg-caption">${snapshot.taxonomies.length} registry entries in ${namespaces.length} namespaces. Matching labels are not merged. Counts describe content included in this fixture.</p></div></div>${namespaces.length ? namespaces.map(namespace => `<section class="kg-category-group" aria-label="${escape(namespace)}"><h3>${escape(namespace)}</h3><ul class="kg-category-rows">${snapshot.taxonomies.filter(taxonomy => taxonomy.namespace === namespace).map(taxonomy => {
    const count = snapshot.nodes.filter(node => node.kind !== 'category' && node.taxonomyIds?.includes(taxonomy.id)).length
    return `<li>${navLink(taxonomy.label, { view: 'list', scope: 'collection', categoryId: taxonomy.id, kind: '', query: '', page: 1 }, `id="kg-taxonomy-${escape(taxonomy.id)}"`)}<span>${count} in sample</span></li>`
  }).join('')}</ul>${sourceRefs(snapshot.taxonomies.find(item => item.namespace === namespace).sourceRefs, `taxonomy-${namespace}`)}</section>`).join('') : '<p class="kg-caption">No category records were supplied in this mock fixture.</p>'}`
}

function renderContent() {
  if (snapshot.status === 'error') return message('The graph is unavailable.', snapshot.reason || 'The simulated request failed. No successful empty result has been inferred.', `<button id="kg-retry" type="button" data-action="retry">Retry simulation</button> ${navLink('Load the source sample', { fixture: 'source', rootId: 'concept:logistic-map:proposal', selectedId: 'concept:logistic-map:proposal', page: 1 })}`)
  if (snapshot.status === 'empty') return message('There are no items in this sample.', 'This is a successful empty fixture, separate from a failed request. Choose another fixture to continue.', navLink('Load the source sample', { fixture: 'source', rootId: 'concept:logistic-map:proposal', selectedId: 'concept:logistic-map:proposal', page: 1 }))
  return state.view === 'list' ? renderList() : state.view === 'categories' ? renderCategories() : renderNeighbourhood()
}

function renderInspector() {
  const node = index.byId.get(state.selectedId)
  const head = `<div class="kg-inspector-head"><span class="kg-label">Inspecting${node ? ` · ${escape(kinds[node.kind] || node.kind)}` : ''}</span>${state.selectedId ? navLink('Close', { selectedId: null }, 'id="kg-inspector-close" data-close-inspector') : ''}</div>`
  if (snapshot.status === 'error' || snapshot.status === 'empty') return `${head}<h2 id="kg-inspector-title">No source loaded.</h2><p>The requested selection is preserved in the URL. Evidence will appear when a record is available.</p>`
  if (!state.selectedId) return `${head}<h2 id="kg-inspector-title">Choose an item.</h2><p>Inspect any title to see its original source and the evidence for each connection. The neighbourhood root stays where you put it.</p>`
  if (!node) return `${head}<h2 id="kg-inspector-title">Selection unavailable.</h2><p>The requested item is missing from this snapshot.</p><p><code>${escape(state.selectedId)}</code></p><p class="kg-muted">Its ID remains in the URL. No other item has been substituted.</p>${navLink('Inspect the current root', { selectedId: state.rootId }, 'class="kg-primary-link"')}`
  const neighbourhood = getNeighbourhood(snapshot, index, state.rootId)
  const inNeighbourhood = node.id === state.rootId || neighbourhood.nodeIds.includes(node.id)
  const visibleInList = queryNodes(snapshot, state).items.some(item => item.id === node.id)
  const outside = state.view === 'neighbourhood' && !inNeighbourhood ? 'This selection is outside the displayed neighbourhood. The root is unchanged.' : state.view === 'list' && !visibleInList ? 'This selection is outside the current result page or filters. It remains available here.' : ''
  const edges = relatedEdges(node.id)
  const visibleEdges = edges.slice(0, 8)
  return `${head}<h2 id="kg-inspector-title">${escape(node.label)}</h2>
    ${sourceLink(node.href, sourceActions[node.kind] || 'Open original source', 'kg-primary-link', 'kg-primary-source') || '<p class="kg-muted">No standalone source link was supplied. Recorded source evidence appears below when available.</p>'}
    ${node.mappingStatus === 'proposed' ? '<p class="kg-mapping">Proposed concept mapping. The cited passages exist; the shared-model association is not approved.</p>' : node.mappingStatus === 'mock' ? '<p class="kg-mapping">Mock record for interface review. It is not part of the blog.</p>' : ''}
    <p>${escape(node.summary)}</p>${outside ? `<p class="kg-mapping">${escape(outside)}</p>` : ''}
    <section class="kg-inspector-section"><h3>Why this item is here</h3>${sourceRefs(node.sourceRefs, `node-${node.id}`)}</section>
    <section class="kg-inspector-section"><h3>Connections in this sample</h3>${edges.length ? `<ul class="kg-related">${visibleEdges.map(edge => {
      const other = otherNode(edge, node.id)
      return `<li><span class="kg-relation">${escape(relation(edge, node.id))} · ${escape(edge.mappingStatus)}</span>${navLink(other.label, { selectedId: other.id }, `class="kg-related-title" id="kg-related-${escape(encodeURIComponent(edge.id))}-to-${escape(encodeURIComponent(other.id))}" data-inspect="${escape(other.id)}"`)}<details><summary>Relationship evidence</summary>${sourceRefs(edge.sourceRefs, `edge-${node.id}-${edge.id}`)}</details></li>`
    }).join('')}</ul>${edges.length > visibleEdges.length ? `<p class="kg-muted">${visibleEdges.length} of ${edges.length} loaded relationships shown here.</p>${navLink('List every loaded connection', { rootId: node.id, selectedId: node.id, view: 'list', scope: 'neighbours', query: '', kind: '', categoryId: '', page: 1 })}` : ''}` : `<p class="kg-muted">${snapshot.status === 'partial' ? 'No connections are loaded for this selection. Coverage is incomplete.' : 'No connections are recorded for this item in the sample.'}</p>`}</section>
    ${node.tags?.length ? `<section class="kg-inspector-section"><h3>Original tags</h3><p class="kg-muted">${node.tags.map(escape).join(' · ')}</p><p class="kg-muted">Original spellings are preserved.</p></section>` : ''}
    <div class="kg-inspector-actions">${navLink('Explore from this item →', { rootId: node.id, selectedId: node.id, view: 'neighbourhood' }, 'id="kg-reroot" data-reroot')}
    <button type="button" id="kg-return-origin" data-action="return-origin">Return to the item control</button><p class="kg-muted">Source pages keep their original URLs. Use browser Back to return to this view.</p></div>`
}

function updateNodeSelection() {
  for (const link of document.querySelectorAll('[data-node-id]')) {
    const selected = link.dataset.nodeId === state.selectedId
    link.dataset.selected = String(selected)
    if (selected) link.setAttribute('aria-current', 'true')
    else link.removeAttribute('aria-current')
    link.href = href({ selectedId: link.dataset.nodeId })
  }
}

function drawConnections() {
  if (drawingFrame) cancelAnimationFrame(drawingFrame)
  drawingFrame = requestAnimationFrame(() => {
    drawingFrame = 0
    const svg = $('kg-connections'), figure = $('kg-neighbourhood'), root = figure?.querySelector('[data-root-node]')
    if (!svg || !root || disposed) return
    const frame = figure.getBoundingClientRect(), from = root.getBoundingClientRect()
    svg.setAttribute('viewBox', `0 0 ${frame.width} ${frame.height}`)
    svg.replaceChildren()
    for (const target of figure.querySelectorAll('[data-node-id]:not([data-root-node])')) {
      const to = target.getBoundingClientRect()
      const x1 = from.right - frame.left, y1 = from.top + from.height / 2 - frame.top
      const x2 = to.left - frame.left, y2 = to.top + to.height / 2 - frame.top
      const curve = Math.max(8, (x2 - x1) * .55)
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const edge = (index.adjacency.get(state.rootId) || []).find(item => item.source === target.dataset.nodeId || item.target === target.dataset.nodeId)
      path.setAttribute('d', `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`)
      path.dataset.proposed = String(edge?.mappingStatus === 'proposed')
      path.dataset.mock = String(edge?.mappingStatus === 'mock')
      path.dataset.selected = String(target.dataset.nodeId === state.selectedId)
      svg.append(path)
    }
  })
}

function render({ syncQuery = false } = {}) {
  if (disposed) return
  const activeElement = document.activeElement
  const activeId = activeElement?.id
  loadCurrentSnapshot()
  renderChrome(syncQuery)
  const viewKey = JSON.stringify([state.fixture, state.view, state.scope, state.rootId, state.query, state.kind, state.categoryId, state.page])
  const viewChanged = viewKey !== previousViewKey
  if (viewChanged) {
    resizeObserver?.disconnect()
    $('kg-view').innerHTML = renderContent()
    previousViewKey = viewKey
    if (typeof ResizeObserver !== 'undefined' && $('kg-neighbourhood')) {
      resizeObserver = new ResizeObserver(drawConnections)
      resizeObserver.observe($('kg-neighbourhood'))
    }
  }
  const inspectorKey = JSON.stringify([state.fixture, state.selectedId, state.rootId, state.view, state.scope, state.query, state.kind, state.categoryId, state.page])
  if (inspectorKey !== previousInspectorKey) {
    $('kg-inspector').innerHTML = renderInspector()
    previousInspectorKey = inspectorKey
  }
  updateNodeSelection()
  for (const link of document.querySelectorAll('[data-kg-patch]')) link.href = href(JSON.parse(link.dataset.kgPatch))
  drawConnections()
  // Selection updates retain graph/list elements. For an inspector-origin
  // link that disappears, restore to the new selection's graph/list control
  // or the stable inspector container, never silently to document.body.
  if (activeElement && activeElement !== document.body && !activeElement.isConnected) {
    const replacement = (activeId && $(activeId)) || (viewChanged ? $('kg-view-title') : $(nodeElementId(state.selectedId))) || $('kg-inspector')
    replacement.focus({ preventScroll: true })
  }
  const root = index.byId.get(state.rootId)?.label || state.rootId
  const selected = index.byId.get(state.selectedId)?.label
  $('kg-status').textContent = selected ? `Inspecting ${selected}. Neighbourhood root: ${root}.` : state.selectedId ? 'Selected item is unavailable. Requested identity has been retained.' : 'Inspector closed. Choose an item to inspect.'
}

function onClick(event) {
  const action = event.target.closest('[data-action]')?.dataset.action
  if (action === 'jump-inspector') { lastOriginId = document.activeElement?.id || null; focusElement('kg-inspector'); return }
  if (action === 'return-origin') { focusElement($(lastOriginId) ? lastOriginId : nodeElementId(state.selectedId)); return }
  if (action === 'retry') {
    retries += 1
    $('kg-status').textContent = `Retry ${retries}: the mock failure remains unavailable. No successful result was returned.`
    return
  }
  const link = event.target.closest('a')
  if (!link) return
  if (link.hasAttribute('data-kg-source')) rememberView()
  if (!link.hasAttribute('data-kg-nav') || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  if (link.hasAttribute('data-inspect')) lastOriginId = link.id || nodeElementId(link.dataset.inspect)
  const closing = link.hasAttribute('data-close-inspector')
  const desiredFocus = closing ? ($(lastOriginId) ? lastOriginId : nodeElementId(state.selectedId)) : link.hasAttribute('data-reroot') || link.hasAttribute('data-page-link') ? 'kg-view-title' : null
  navigate(link.href, { focusId: desiredFocus })
}

function onSubmit(event) {
  event.preventDefault()
  navigate(href({ view: 'list', query: $('kg-query').value, page: 1 }), { focusId: 'kg-view-title' })
}
function onChange(event) {
  if (event.target.id === 'kg-kind' || event.target.id === 'kg-category') navigate(href({ view: 'list', kind: $('kg-kind').value, categoryId: $('kg-category').value, query: $('kg-query').value, page: 1 }))
  if (event.target.id === 'kg-fixture') {
    const fixture = loadFixture(event.target.value)
    navigate(href({ fixture: event.target.value, rootId: fixture.defaultRootId, selectedId: fixture.defaultRootId, view: 'neighbourhood', scope: 'collection', query: '', kind: '', categoryId: '', page: 1 }), { focusId: 'kg-view-title' })
  }
}
function onKeyDown(event) {
  if (event.key === 'Escape' && !event.defaultPrevented && !event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey && $('kg-inspector').contains(event.target) && state.selectedId) {
    event.preventDefault()
    const target = $(lastOriginId) ? lastOriginId : nodeElementId(state.selectedId)
    navigate(href({ selectedId: null }), { focusId: target })
  }
}
function onPopState(event) { render({ syncQuery: true }); restoreView(event.state?.kg02) }
function onPageShow(event) { if (event.persisted) { render({ syncQuery: true }); restoreView(history.state?.kg02) } }
function onTheme() { navigate(href({ theme: state.theme === 'dark' ? 'light' : 'dark' }), { replace: true }) }

document.addEventListener('click', onClick)
$('kg-search').addEventListener('submit', onSubmit)
document.addEventListener('change', onChange)
document.addEventListener('keydown', onKeyDown)
$('kg-theme').addEventListener('click', onTheme)
window.addEventListener('popstate', onPopState)
window.addEventListener('pageshow', onPageShow)
window.addEventListener('pagehide', rememberView)
window.addEventListener('resize', drawConnections)
render({ syncQuery: true })
restoreView(history.state?.kg02)
document.fonts?.ready.then(() => { if (!disposed) drawConnections() })

// Explicit teardown seam for the motion/embedding owner. No global shortcuts,
// animation loop, force simulation, shared tokens or framework dependencies.
export function disposeKnowledgeFolio() {
  rememberView()
  disposed = true
  resizeObserver?.disconnect()
  if (drawingFrame) cancelAnimationFrame(drawingFrame)
  document.removeEventListener('click', onClick)
  $('kg-search').removeEventListener('submit', onSubmit)
  document.removeEventListener('change', onChange)
  document.removeEventListener('keydown', onKeyDown)
  $('kg-theme').removeEventListener('click', onTheme)
  window.removeEventListener('popstate', onPopState)
  window.removeEventListener('pageshow', onPageShow)
  window.removeEventListener('pagehide', rememberView)
  window.removeEventListener('resize', drawConnections)
}
