import { describe, expect, it } from 'vitest'
import type { KnowledgeNode, NodeKind, Snapshot } from '../schema'
import {
  HOST_KINDS, actionNodeDescriptor, buildHostHref, historyPlan, initialHostState,
  readHostState, resolveHost, safeHostDestination, transitionHost,
  type HostContext, type HostIdentity, type HostState,
} from './host-seam'

function fixture(): HostContext {
  const evidence = { basis: 'registry' as const, confidence: 'explicit' as const,
    locators: [{ path: 'fixtures/host.json', sha256: 'f'.repeat(64), selector: 'fixture', rawValue: 'Synthetic host seam fixture' }] }
  const node = (id: string, kind: NodeKind, label: string, href: string | null): KnowledgeNode => ({
    id, kind, key: id, label, labels: [label], evidence: [evidence],
    navigation: { href, action: href ? 'open' : kind === 'concept' ? 'inspect' : 'filter',
      availability: href ? 'source-resolved' : 'not-applicable', build: 'unverified', live: 'unverified' },
  })
  const snapshot: Snapshot = {
    schemaVersion: 1, repository: 'castlemilk/benebsworth.com', sourceRevision: 'a'.repeat(40),
    mapperVersion: 'host-fixture/1', digest: 'a'.repeat(64), inputManifestDigest: 'b'.repeat(64),
    coverage: { blog: 'complete', lab: 'registry-only', study: 'complete', concepts: 'owner-registry', citations: 'supported-mdx-syntax' },
    sources: [], originAliases: [], diagnostics: [], references: [],
    nodes: [
      node('concept:study:vol/chapter:term', 'concept', 'Scoped root', null),
      node('blog:one', 'blog', 'Shared article', '/blog/one/?x=a%2Bb#reading'),
      node('lab:one', 'lab', 'Shared experiment', '/lab/one/'),
      node('study:vol%2Fchapter', 'study', 'Real packet fixture', '/study/vol/chapter/'),
      node('tag:dynamical-systems', 'tag', 'Dynamical-systems', null),
      node('tag:dynamical%20systems', 'tag', 'Dynamical systems', null),
      node('citation:one', 'citation', 'Authored reference target', 'https://example.test/paper?q=a%2Bb#fig-2'),
    ],
    edges: ['blog:one', 'lab:one', 'study:vol%2Fchapter'].map((source, i) => ({
      id: `edge:${i}`, source, target: 'concept:study:vol/chapter:term', predicate: 'mentions_concept', evidence: [evidence],
    })),
    aliases: [{ from: 'blog:old-one', to: 'blog:one', evidence: { ...evidence, basis: 'reviewed-id-alias' } }],
  }
  return { provider: 'kg01-canonical', snapshot }
}
const identity = (context: HostContext, id: string): HostIdentity => ({ provider: context.provider, snapshot: context.snapshot.digest, id })
const selected = (context: HostContext, patch: Partial<HostState> = {}): HostState => ({
  ...initialHostState(context), rootId: context.snapshot.nodes[0].id, selectedId: 'blog:one', ...patch,
})
const graphUrl = 'https://benebsworth.com/knowledge/?q=global&facet=a&facet=b#readout'

describe('proposed canonical host seam; no runtime UI binding', () => {
  it('starts without inventing a root or selecting the first record', () => {
    const context = fixture(), state = readHostState('/knowledge/', context)
    expect(state).toEqual(initialHostState(context))
    expect(resolveHost(context, state)).toMatchObject({ root: { status: 'none' }, selection: { status: 'none' }, actionableSelected: null })
  })

  it('round-trips opaque root and selection independently with provider and digest', () => {
    const context = fixture()
    const state = selected(context, { rootId: 'concept:μ / ? # + % =', selectedId: 'tag:dynamical%20systems', query: 'shared Ω', kinds: ['study', 'tag'] })
    expect(readHostState(buildHostHref(graphUrl, state), context)).toEqual(state)
  })

  it('does not treat an old unqualified saved discovery ID as a canonical selection', () => {
    const context = fixture(), state = readHostState('/knowledge/?kgRoot=tag%3Ashared&kgSelected=blog%3Aone', context)
    expect(state).toMatchObject({ provider: '', snapshot: '', rootId: 'tag:shared', selectedId: 'blog:one' })
    expect(resolveHost(context, state)).toMatchObject({ guard: 'unbound', nodes: [], selection: { status: 'unbound' }, actionableSelected: null })
  })

  it('distinguishes empty kinds from omitted kinds and removes duplicate filters deterministically', () => {
    const context = fixture()
    expect(readHostState('/knowledge/', context).kinds).toEqual(HOST_KINDS)
    expect(readHostState('/knowledge/?kgKinds=', context).kinds).toEqual([])
    expect(readHostState('/knowledge/?kgKinds=lab,blog,lab,unknown', context).kinds).toEqual(['blog', 'lab'])
    const state = selected(context, { kinds: [] })
    expect(readHostState(buildHostHref(graphUrl, state), context).kinds).toEqual([])
    expect(resolveHost(context, state).actionableSelected).toBeNull()
  })

  it('retains requested root/selection under filters and exposes both as suspended hidden records', () => {
    const context = fixture(), state = selected(context)
    const result = transitionHost(context, state, { type: 'filters', kinds: ['lab'], query: '' })
    expect(result.state.rootId).toBe(state.rootId)
    expect(result.state.selectedId).toBe(state.selectedId)
    const host = resolveHost(context, result.state)
    expect(host.root.status).toBe('hidden')
    expect(host.selection.status).toBe('hidden')
    expect(host.actionableSelected).toBeNull()
    expect(host.edges).toEqual([])
    expect(actionNodeDescriptor(context, result.state, 'blog:one', graphUrl).capabilities.source.state).toBe('unavailable')
  })

  it('requires query visibility as well as kind visibility for an actionable selection', () => {
    const context = fixture(), state = selected(context, { query: 'experiment' })
    const host = resolveHost(context, state)
    expect(host.nodes.map(node => node.id)).toEqual(['lab:one'])
    expect(host.selection.status).toBe('hidden')
    expect(host.actionableSelected).toBeNull()
  })

  it('inspect changes only selection unless explicit reveal changes filters', () => {
    const context = fixture(), state = selected(context, { query: 'no match', kinds: ['blog'] })
    const normal = transitionHost(context, state, { type: 'inspect', identity: identity(context, 'lab:one') })
    expect(normal.state).toEqual({ ...state, selectedId: 'lab:one' })
    expect(resolveHost(context, normal.state).selection.status).toBe('hidden')
    const revealed = transitionHost(context, state, { type: 'inspect', identity: identity(context, 'lab:one'), reveal: true })
    expect(revealed.state).toMatchObject({ rootId: state.rootId, selectedId: 'lab:one', kinds: ['blog', 'lab'], query: '' })
    expect(resolveHost(context, revealed.state).selection.status).toBe('active')
  })

  it('reroot and camera movement have independent state and history effects', () => {
    const context = fixture(), state = selected(context)
    const camera = transitionHost(context, state, { type: 'camera', identity: identity(context, 'lab:one') })
    expect(camera).toEqual({ state, history: 'none', cameraId: 'lab:one' })
    const reroot = transitionHost(context, state, { type: 'reroot', identity: identity(context, 'lab:one') })
    expect(reroot.state).toEqual({ ...state, rootId: 'lab:one' })
    expect(reroot).toMatchObject({ history: 'push', cameraId: null })
    const hidden = transitionHost(context, { ...state, kinds: ['blog'] }, { type: 'camera', identity: identity(context, 'lab:one') })
    expect(hidden).toMatchObject({ history: 'none', cameraId: null, reason: 'hidden' })
  })

  it('rejects actions from another provider or snapshot even when IDs happen to match', () => {
    const context = fixture(), state = selected(context)
    for (const [change, reason] of [[{ provider: 'live-discovery' }, 'wrong-provider'], [{ snapshot: 'old' }, 'stale']] as const) {
      const result = transitionHost(context, state, { type: 'inspect', identity: { ...identity(context, 'lab:one'), ...change } })
      expect(result).toEqual({ state, history: 'none', cameraId: null, reason })
    }
  })

  it('guards stale and wrong-provider saved state before lookup without losing requested IDs', () => {
    const context = fixture()
    for (const [patch, status] of [[{ provider: 'live-discovery' }, 'wrong-provider'], [{ snapshot: 'old' }, 'stale']] as const) {
      const state = selected(context, patch), host = resolveHost(context, state)
      expect(host.selection).toMatchObject({ status, requestedId: 'blog:one' })
      expect(host.nodes).toEqual([])
      expect(host.actionableSelected).toBeNull()
      expect(transitionHost(context, state, { type: 'inspect', identity: identity(context, 'lab:one') }).history).toBe('none')
    }
  })

  it('keeps unknown saved IDs for recovery and never guesses a lexical correspondence', () => {
    const context = fixture(), state = selected(context, { rootId: 'concept:normalized-aggregate', selectedId: 'study:vol/chapter' })
    const host = resolveHost(context, readHostState(buildHostHref(graphUrl, state), context))
    expect(host.root).toEqual({ status: 'missing', requestedId: state.rootId })
    expect(host.selection).toEqual({ status: 'missing', requestedId: state.selectedId })
    expect(host.actionableSelected).toBeNull()
    expect(transitionHost(context, state, { type: 'inspect', identity: identity(context, 'concept:normalized-aggregate') }).reason).toBe('missing')
  })

  it('retains reviewed canonical alias requests and explicitly exposes their resolved identity', () => {
    const context = fixture(), state = selected(context, { selectedId: 'blog:old-one' })
    expect(resolveHost(context, state).selection).toMatchObject({ status: 'active', requestedId: 'blog:old-one', resolvedId: 'blog:one', redirected: true })
    expect(state.selectedId).toBe('blog:old-one')
    expect(actionNodeDescriptor(context, state, 'blog:old-one', graphUrl)).toMatchObject({ identity: identity(context, 'blog:one'), resolution: { requestedId: 'blog:old-one', redirected: true } })
  })

  it('diagnoses malformed requested IDs and rejects duplicate canonical identities', () => {
    const context = fixture()
    const state = selected(context, { selectedId: 'blog:one\n' })
    expect(resolveHost(context, state).selection).toEqual({ status: 'invalid', requestedId: 'blog:one\n' })
    context.snapshot.nodes.push({ ...context.snapshot.nodes[0] })
    expect(() => resolveHost(context, state)).toThrow('duplicate canonical node ID')
  })

  it('exposes dangling source edges as diagnostics but never emits them in a visible graph', () => {
    const context = fixture(), state = selected(context)
    context.snapshot.edges.push({ ...context.snapshot.edges[0], id: 'dangling', target: 'missing' })
    const host = resolveHost(context, state), visible = new Set(host.nodes.map(node => node.id))
    expect(host.danglingEdgeIds).toEqual(['dangling'])
    expect(host.edges.every(edge => visible.has(edge.source) && visible.has(edge.target))).toBe(true)
  })

  it('keeps caller inputs immutable and history metadata untouched', () => {
    const context = fixture(), current = Object.freeze(selected(context, { kinds: Object.freeze([...HOST_KINDS]) as unknown as NodeKind[] }))
    const before = JSON.stringify(context.snapshot), metadata = Object.freeze({ foreign: { slot: 7 }, router: ['keep'] })
    const transition = transitionHost(context, current, { type: 'inspect', identity: identity(context, 'lab:one'), history: 'replace' })
    const plan = historyPlan(graphUrl, transition, metadata), url = new URL(plan.href, graphUrl)
    expect(plan.method).toBe('replace')
    expect(plan.state).toBe(metadata)
    expect(url.searchParams.get('q')).toBe('global')
    expect(url.searchParams.getAll('facet')).toEqual(['a', 'b'])
    expect(url.hash).toBe('#readout')
    expect(JSON.stringify(context.snapshot)).toBe(before)
    expect(current.selectedId).toBe('blog:one')
  })

  it('does not write history for repeated selection or restoration', () => {
    const context = fixture(), state = selected(context)
    const noOp = transitionHost(context, state, { type: 'inspect', identity: identity(context, 'blog:one') })
    expect(noOp.history).toBe('none')
    expect(historyPlan(graphUrl, noOp, null)).toEqual({ method: 'none', href: graphUrl, state: null })
    const restored = transitionHost(context, state, { type: 'restore', state: { ...state, selectedId: null } })
    expect(restored).toMatchObject({ history: 'none', cameraId: null, state: { selectedId: null, rootId: state.rootId } })
  })

  it('round-trips a source-page Back/Forward sequence in an in-memory harness, not a native browser', () => {
    const context = fixture(), start = selected(context)
    const entries = [{ href: buildHostHref(graphUrl, start), metadata: { external: 'preserved' } }]
    let index = 0, state = start, writes = 0
    const commit = (transition: ReturnType<typeof transitionHost>) => {
      const plan = historyPlan(entries[index].href, transition, entries[index].metadata)
      state = transition.state
      if (plan.method === 'none') return
      const entry = { href: plan.href, metadata: plan.state as { external: string } }
      if (plan.method === 'replace') entries[index] = entry
      else { entries.splice(index + 1); entries.push(entry); index += 1 }
      writes += 1
    }
    commit(transitionHost(context, state, { type: 'inspect', identity: identity(context, 'lab:one') }))
    commit(transitionHost(context, state, { type: 'reroot', identity: identity(context, 'tag:dynamical%20systems') }))
    const accepted = { ...state }, graphIndex = index
    entries.push({ href: '/lab/one/', metadata: { external: 'source-page' } }); index += 1
    index -= 1
    commit(transitionHost(context, state, { type: 'restore', state: readHostState(entries[index].href, context) }))
    expect(state).toEqual(accepted)
    index -= 1
    commit(transitionHost(context, state, { type: 'restore', state: readHostState(entries[index].href, context) }))
    expect(state).toMatchObject({ rootId: start.rootId, selectedId: 'lab:one' })
    index = graphIndex
    commit(transitionHost(context, state, { type: 'restore', state: readHostState(entries[index].href, context) }))
    expect(state).toEqual(accepted)
    expect(writes).toBe(2)
    expect(entries[index].metadata).toEqual({ external: 'preserved' })
  })

  it('preserves safe destination bytes and rejects unsupported or ambiguous URL forms', () => {
    for (const href of ['/study/vol/chapter/', '/blog/one/?x=a%2Bb#reading', 'https://example.test/paper?q=a%2Bb#fig-2']) expect(safeHostDestination(href)).toBe(href)
    for (const href of ['javascript:alert(1)', 'data:text/plain,a', '//example.test/path', '/\\example.test/path', 'https://user:pass@example.test/', '/a b', '/a\n', 'relative/path', 'https:/example.test']) expect(safeHostDestination(href)).toBeNull()
    expect(safeHostDestination('/blog/one/', true)).toBeNull()
  })

  it('serializes ActionNode capabilities with independent flags and source-versus-graph URL meanings', () => {
    const context = fixture(), state = selected(context), node = actionNodeDescriptor(context, state, 'blog:one', graphUrl)
    expect(node).toMatchObject({ identity: identity(context, 'blog:one'), isRoot: false, isSelected: true,
      capabilities: { inspect: { intent: 'inspect' }, focus: { intent: 'reroot' }, source: { intent: 'native-anchor', href: '/blog/one/?x=a%2Bb#reading' }, copy: { kind: 'graph' } } })
    const copy = node.capabilities.copy
    if (copy.state !== 'available' || !copy.href) throw new Error('Expected graph-copy action')
    expect(readHostState(copy.href, context)).toEqual(state)
    expect(node.capabilities.source.state === 'available' && node.capabilities.source.note).toContain('live unverified')
    expect(node.sourceCopy.state).toBe('unavailable')
    const citation = actionNodeDescriptor(context, state, 'citation:one', graphUrl)
    expect(citation.sourceCopy).toMatchObject({ state: 'available', kind: 'source', href: 'https://example.test/paper?q=a%2Bb#fig-2' })
    expect(JSON.parse(JSON.stringify(node))).toEqual(node)
  })

  it('never fabricates source links for tag or source-scoped concept actions', () => {
    const context = fixture(), state = selected(context)
    for (const id of [context.snapshot.nodes[0].id, 'tag:dynamical-systems']) {
      const descriptor = actionNodeDescriptor(context, state, id, graphUrl)
      expect(descriptor.capabilities.source.state).toBe('unavailable')
      expect(descriptor.capabilities.inspect.state).toBe('available')
    }
  })

  it('disables all actions for stale, hidden, missing and unsafe destinations as applicable', () => {
    const context = fixture()
    for (const [state, id] of [
      [selected(context, { snapshot: 'old' }), 'blog:one'],
      [selected(context, { query: 'no match' }), 'blog:one'],
      [selected(context), 'missing'],
    ] as const) {
      const descriptor = actionNodeDescriptor(context, state, id, graphUrl)
      expect(Object.values(descriptor.capabilities).every(action => action.state === 'unavailable')).toBe(true)
    }
    context.snapshot.nodes[1].navigation.href = 'javascript:alert(1)'
    const descriptor = actionNodeDescriptor(context, selected(context), 'blog:one', 'javascript:bad')
    expect(descriptor.capabilities.source.state).toBe('unavailable')
    expect(descriptor.capabilities.copy.state).toBe('unavailable')
  })
})
