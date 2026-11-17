import { execFileSync } from 'node:child_process'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadIntegrationSources, verifyIntegrationRevisions } from '../../lib/knowledge-source/integration/repository'
import { buildKnowledgeSnapshot } from '../../lib/knowledge-source/build'
import { buildIntegrationBridge } from '../../lib/knowledge-source/integration/bridge'
import type { HostIdentity } from '../../lib/knowledge-source/integration/host-seam'
import { CANONICAL_PROVIDER, CONSOLE_PROVIDER } from './view-contract-v2'
import type { SourceViewDataV2, SourceViewLoadV2, SourceViewStateV2, SourceViewSupportV2 } from './view-contract-v2'
import { initialSourceViewState, readSourceViewState } from './source-state-v2'
import { describeSourceSelection, resolveSourceCandidates, resolveSourceView, revalidateSourceAction, sourceEnvelopeError, sourceViewData, transitionSourceView } from './source-view-v2'

let data: SourceViewDataV2
let ready: SourceViewLoadV2
const support: SourceViewSupportV2 = { inspect: true, reroot: true, camera: true, source: true, copy: true, graphLinks: true }
const graphUrl = 'https://benebsworth.com/knowledge/?q=foreign&keep=1&keep=2#folio'
const canonical = (id: string): HostIdentity => ({ provider: CANONICAL_PROVIDER, snapshot: data.canonical.digest, id })
const origin = (id: string): HostIdentity => ({ provider: CONSOLE_PROVIDER, snapshot: data.bridge.host.snapshotIdentity, id })
const idOf = (kind: 'blog' | 'lab' | 'study' | 'citation') => data.canonical.nodes.find(node => node.kind === kind)!.id
const selected = (id = idOf('blog')): SourceViewStateV2 => ({ ...initialSourceViewState(data), navigation: { ...initialSourceViewState(data).navigation, selectedId: id } })
const altered = (): SourceViewDataV2 => structuredClone(data)
const load = (changed: SourceViewDataV2): SourceViewLoadV2 => ({ status: 'ready', data: changed })
const allActions = (descriptor: NonNullable<ReturnType<typeof describeSourceSelection>>) => [...Object.values(descriptor.capabilities), descriptor.camera, descriptor.sourceCopy]

beforeAll(async () => {
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const real = await loadIntegrationSources(revision, revision)
  // The actual checkout's captured input bytes and inventories must match Git.
  verifyIntegrationRevisions(real.input, revision)
  data = sourceViewData({ canonical: real.snapshot, hostGraph: real.host, bridge: real.bridge,
    studyCoverage: real.study.coverage, glossary: real.study.glossary, currentness: 'current', sourcePublication: 'published' })
  ready = { status: 'ready', data }
})

describe('actual merged source envelope', () => {
  it('retains the complete canonical/host/correspondence data and narrow study coverage', () => {
    expect(sourceEnvelopeError(data)).toBeNull()
    expect([data.canonical.nodes.length, data.canonical.edges.length, data.hostGraph.nodes.length, data.hostGraph.edges.length]).toEqual([998, 1637, 508, 746])
    expect(data.studyCoverage).toEqual({ curriculumChapters: 71, packetChapters: 3, glossaryOccurrences: 36, studyReferences: 'not-extracted' })
    expect(data.glossary).toHaveLength(36)
    expect(data.glossary.filter(item => item.definition !== item.hostFirstLineDefinition)).toHaveLength(9)
    expect(data.canonical.coverage.lab).toBe('registry-only')
    expect(data.canonical.references.filter(item => item.status === 'outside-coverage')).toHaveLength(35)
    expect(data.bridge.canonicalOnlyIds).toHaveLength(480)
    const wrapped = sourceViewData(data)
    for (const key of ['canonical', 'hostGraph', 'bridge', 'glossary', 'studyCoverage'] as const) expect(wrapped[key]).toBe(data[key])
  })

  it.each(['complex-analysis', 'dynamical-systems', 'electrical-engineering', 'general-relativity', 'machine-learning', 'neural-networks', 'signal-processing', 'solid-state', 'statistical-mechanics'])('requires explicit choice for actual tag:%s', key => {
    const requested = origin(`tag:${key}`)
    const candidates = resolveSourceCandidates(ready, requested)
    expect(candidates.status).toBe('choice-required')
    expect(candidates.candidates).toHaveLength(2)
    const start = selected()
    start.navigation.rootId = idOf('study')
    const chooser = transitionSourceView(ready, start, { type: 'open-origin', origin: requested }, support)
    expect(chooser.state.navigation.selectedId).toBeNull()
    expect(chooser.state.navigation.rootId).toBe(start.navigation.rootId)
    expect(chooser.inspectorId).toBeNull()
    expect(describeSourceSelection(ready, chooser.state, support, graphUrl)?.blockedReason).toBe('choice-required')
    for (const candidate of candidates.candidates) {
      const generic = transitionSourceView(ready, chooser.state, { type: 'inspect', identity: canonical(candidate.id) }, support)
      expect(generic.reason).toBe('choice-required')
      const chosen = transitionSourceView(ready, chooser.state, { type: 'choose-candidate', origin: requested, identity: canonical(candidate.id) }, support)
      expect(chosen.state.navigation.selectedId).toBe(candidate.id)
      expect(chosen.state.candidateOrigin).toEqual(requested)
      expect(chosen.state.navigation.rootId).toBe(start.navigation.rootId)
      expect(chosen.inspectorId).toBe(candidate.id)
      expect(data.canonical.aliases).toEqual([])
    }
  })

  it('keeps both chapter-owned Arithmetic intensity definitions and each candidate evidence', () => {
    const result = resolveSourceCandidates(ready, origin('concept:arithmetic-intensity'))
    expect(result.status).toBe('choice-required')
    expect(new Set(result.candidates.map(candidate => candidate.node?.ownerId)).size).toBe(2)
    for (const candidate of result.candidates) {
      expect(candidate.node).toBe(data.canonical.nodes.find(node => node.id === candidate.id))
      expect(candidate.glossary).toHaveLength(1)
      expect(candidate.glossary[0].ownerId).toBe(candidate.node!.ownerId)
      expect(candidate.glossary[0].conceptId).toBe(candidate.id)
      expect(candidate.node!.evidence).not.toBe(result.correspondence!.support.evidence)
    }
  })

  it('resolves a qualified study singleton while preserving its encoded canonical ID and native source anchor', () => {
    const requested = origin('study:vol1/01-introduction')
    const result = transitionSourceView(ready, initialSourceViewState(data), { type: 'open-origin', origin: requested }, support)
    expect(result.state.navigation.selectedId).toBe('study:vol1%2F01-introduction')
    expect(result.state.navigation.rootId).toBeNull()
    const descriptor = describeSourceSelection(ready, result.state, support, graphUrl)!
    expect(descriptor.capabilities.source).toMatchObject({ state: 'available', intent: 'native-anchor', href: '/study/vol1/01-introduction/' })
    expect(descriptor.sourceCopy.state).toBe('unavailable')
  })

  it('permits direct canonical-only records without a fabricated host correspondence', () => {
    for (const kind of ['citation', 'category', 'concept'] as const) {
      const node = data.canonical.nodes.find(item => item.kind === kind && data.bridge.canonicalOnlyIds.includes(item.id))!
      const next = transitionSourceView(ready, initialSourceViewState(data), { type: 'inspect-direct', identity: canonical(node.id) }, support)
      expect(next.state.candidateOrigin).toBeNull()
      expect(resolveSourceView(ready, next.state).actionableSelected?.id).toBe(node.id)
    }
  })

  it('preserves every actual native destination and its unverified build/live qualifications', () => {
    const nodes = data.canonical.nodes.filter(node => node.navigation.action === 'open')
    expect(nodes).toHaveLength(638)
    for (const node of nodes) {
      const descriptor = describeSourceSelection(ready, selected(node.id), support, graphUrl)!
      expect(descriptor.capabilities.source).toMatchObject({ state: 'available', intent: 'native-anchor', href: node.navigation.href })
      expect(descriptor.capabilities.source).toHaveProperty('note', expect.stringContaining('build unverified; live unverified'))
    }
  })
})

describe('source navigation and explicit host capabilities', () => {
  it('keeps root, selection and camera independent and emits an inspector intent even for repeated Inspect', () => {
    const start = selected(idOf('lab'))
    start.navigation.rootId = idOf('blog')
    const inspected = transitionSourceView(ready, start, { type: 'inspect', identity: canonical(idOf('lab')) }, support)
    expect(inspected.history).toBe('none')
    expect(inspected.inspectorId).toBe(idOf('lab'))
    const rooted = transitionSourceView(ready, start, { type: 'reroot', identity: canonical(idOf('study')) }, support)
    expect(rooted.state.navigation).toMatchObject({ rootId: idOf('study'), selectedId: idOf('lab') })
    expect(rooted.inspectorId).toBeNull()
    const camera = transitionSourceView(ready, rooted.state, { type: 'camera', identity: canonical(idOf('study')) }, support)
    expect(camera.state).toBe(rooted.state)
    expect(camera.history).toBe('none')
    expect(camera.cameraId).toBe(idOf('study'))
  })

  it('retains hidden requests, suspends all actions and requires a separate Reveal', () => {
    const start = selected(idOf('lab'))
    start.navigation.rootId = idOf('blog')
    const filtered = transitionSourceView(ready, start, { type: 'filters', kinds: ['blog'], query: '', categoryId: null }, support)
    const view = resolveSourceView(ready, filtered.state)
    expect(view.root.status).toBe('active')
    expect(view.selection.status).toBe('hidden')
    expect(filtered.state.navigation.selectedId).toBe(idOf('lab'))
    expect(allActions(describeSourceSelection(ready, filtered.state, support, graphUrl)!).every(action => action.state === 'unavailable' && action.reason === 'hidden')).toBe(true)
    expect(transitionSourceView(ready, filtered.state, { type: 'inspect', identity: canonical(idOf('lab')) }, support).reason).toBe('hidden')
    const revealed = transitionSourceView(ready, filtered.state, { type: 'reveal', identity: canonical(idOf('lab')) }, support)
    expect(revealed.state.navigation).toMatchObject({ selectedId: idOf('lab'), rootId: idOf('blog'), query: '' })
    expect(revealed.state.navigation.kinds).toContain('lab')
    expect(revealed.inspectorId).toBeNull()
    expect(revealed.cameraId).toBeNull()
    expect(resolveSourceView(ready, revealed.state).selection.status).toBe('active')
  })

  it('uses only explicit category membership and never treats pagination/display scope as hidden', () => {
    const membership = data.canonical.edges.find(edge => edge.predicate === 'classified_as')!
    const state = selected(membership.source)
    state.categoryId = membership.target
    const resolved = resolveSourceView(ready, state)
    const allowed = new Set([membership.target, ...data.canonical.edges.filter(edge => edge.predicate === 'classified_as' && edge.target === membership.target).map(edge => edge.source)])
    expect(resolved.nodes.every(node => allowed.has(node.id))).toBe(true)
    expect(resolved.nodes.some(node => node.id === membership.target)).toBe(true)
    expect(resolveSourceView(ready, { ...state, page: 999, scope: 'neighbours' }).selection.status).toBe('active')
    const outside = data.canonical.nodes.find(node => !allowed.has(node.id))!
    const hidden = { ...state, navigation: { ...state.navigation, selectedId: outside.id } }
    expect(resolveSourceView(ready, hidden).selection.status).toBe('hidden')
    expect(transitionSourceView(ready, hidden, { type: 'reveal', identity: canonical(outside.id) }, support).state.categoryId).toBeNull()
  })

  it('requires installed host support instead of treating serialized descriptors as callbacks', () => {
    const descriptor = describeSourceSelection(ready, selected(idOf('citation')), {}, graphUrl)!
    expect(allActions(descriptor).every(action => action.state === 'unavailable')).toBe(true)
    expect(transitionSourceView(ready, selected(), { type: 'inspect', identity: canonical(idOf('blog')) }).reason).toBe('inspect-unsupported')
    expect(describeSourceSelection(ready, selected(), { ...support, graphLinks: false }, graphUrl)?.capabilities.copy).toMatchObject({ state: 'unavailable', reason: 'graph-links-unsupported' })
  })

  it('builds graph-copy with the complete qualified wrapper and keeps source-copy separate', () => {
    const start = selected(idOf('citation'))
    start.navigation.rootId = idOf('blog')
    start.view = 'list'
    start.page = 3
    const descriptor = describeSourceSelection(ready, start, support, graphUrl)!
    expect(descriptor.capabilities.copy).toMatchObject({ state: 'available', intent: 'copy', kind: 'graph' })
    const action = descriptor.capabilities.copy
    if (action.state !== 'available') throw new Error('Expected available graph copy')
    expect(readSourceViewState(action.href!, data)).toEqual(start)
    expect(descriptor.sourceCopy).toMatchObject({ state: 'available', intent: 'copy', kind: 'source', href: data.canonical.nodes.find(node => node.id === idOf('citation'))!.navigation.href })
  })

  it('restores without side effects and uses replace only for theme changes', () => {
    const start = selected()
    const restored = transitionSourceView(ready, initialSourceViewState(data), { type: 'restore', state: start }, support)
    expect(restored).toEqual({ state: start, history: 'none', inspectorId: null, cameraId: null })
    expect(transitionSourceView(ready, start, { type: 'theme', theme: 'dark' }, support).history).toBe('replace')
    expect(transitionSourceView(ready, start, { type: 'filters', kinds: start.navigation.kinds, query: 'source', categoryId: null }, support).history).toBe('push')
  })

  it('never mutates supplied records or earlier state', () => {
    const before = JSON.stringify(data)
    const start = selected()
    const stateBefore = JSON.stringify(start)
    const next = transitionSourceView(ready, start, { type: 'reroot', identity: canonical(idOf('study')) }, support)
    describeSourceSelection(ready, next.state, support, graphUrl)
    resolveSourceCandidates(ready, origin('concept:arithmetic-intensity'))
    expect(JSON.stringify(data)).toBe(before)
    expect(JSON.stringify(start)).toBe(stateBefore)
  })
})

describe('clearly synthetic failure and interruption variants of the real capture', () => {
  it.each([
    ['wrong-provider', (value: HostIdentity) => ({ ...value, provider: 'other-provider' })],
    ['stale-origin', (value: HostIdentity) => ({ ...value, snapshot: 'old-capture' })],
    ['unbound-origin', (value: HostIdentity) => ({ ...value, snapshot: '' })],
  ] as const)('rejects %s on the host origin', (reason, mutate) => {
    expect(resolveSourceCandidates(ready, mutate(origin('tag:complex-analysis')))).toMatchObject({ status: 'unavailable', reason })
  })

  it('rejects mismatched canonical digest and source revision independently', () => {
    for (const key of ['canonicalSnapshotIdentity', 'sourceRevision'] as const) {
      const changed = altered()
      changed.bridge[key] = 'stale'
      expect(resolveSourceCandidates(load(changed), origin('tag:complex-analysis'))).toMatchObject({ status: 'unavailable', reason: 'stale-bridge' })
    }
  })

  it('rejects a nonmember, changed origin and missing candidate without alias or first-candidate fallback', () => {
    const requested = origin('tag:complex-analysis')
    const chooser = transitionSourceView(ready, selected(), { type: 'open-origin', origin: requested }, support).state
    expect(transitionSourceView(ready, chooser, { type: 'choose-candidate', origin: requested, identity: canonical(idOf('blog')) }, support).reason).toBe('candidate-mismatch')
    expect(transitionSourceView(ready, chooser, { type: 'choose-candidate', origin: origin('tag:machine-learning'), identity: canonical('tag:complex-analysis') }, support).reason).toBe('origin-changed')
    const changed = altered()
    changed.canonical.nodes = changed.canonical.nodes.filter(node => node.id !== 'tag:complex%20analysis')
    expect(resolveSourceCandidates(load(changed), requested)).toMatchObject({ status: 'unavailable', reason: 'missing-candidate-in-snapshot' })
  })

  it('keeps a stale origin suspended until explicit direct inspection or recovery', () => {
    const state = selected('tag:complex-analysis')
    state.candidateOrigin = { ...origin('tag:complex-analysis'), snapshot: 'old' }
    expect(describeSourceSelection(ready, state, support, graphUrl)?.sourceCopy).toEqual({ state: 'unavailable', reason: 'stale-origin' })
    const direct = transitionSourceView(ready, state, { type: 'inspect-direct', identity: canonical(idOf('citation')) }, support)
    expect(direct.state.candidateOrigin).toBeNull()
    expect(direct.state.navigation.selectedId).toBe(idOf('citation'))
    const recovered = transitionSourceView(ready, state, { type: 'load-current' }, support)
    expect(recovered.state.navigation).toMatchObject({ provider: CANONICAL_PROVIDER, snapshot: data.canonical.digest, rootId: null, selectedId: null })
    expect(recovered.state.candidateOrigin).toBeNull()
    expect(recovered.history).toBe('push')
  })

  it.each(['unbound', 'wrong-provider', 'stale'] as const)('does not rebind %s navigation or silently clear its requests', reason => {
    const state = selected()
    state.navigation.rootId = idOf('study')
    if (reason === 'unbound') state.navigation.snapshot = ''
    if (reason === 'wrong-provider') state.navigation.provider = CONSOLE_PROVIDER
    if (reason === 'stale') state.navigation.snapshot = 'old-capture'
    const blocked = transitionSourceView(ready, state, { type: 'clear-selection' }, support)
    expect(blocked.state).toBe(state)
    expect(blocked.reason).toBe(reason)
    expect(allActions(describeSourceSelection(ready, state, support, graphUrl)!).every(action => action.state === 'unavailable' && action.reason === reason)).toBe(true)
  })

  it('distinguishes loading/error/unavailable from an accepted empty graph and retains last-good data', () => {
    for (const status of ['loading', 'error', 'unavailable'] as const) {
      const failed: SourceViewLoadV2 = { status, data, reason: 'Synthetic transport failure' }
      expect(resolveSourceView(failed, selected()).blockedReason).toBe(`${status}: Synthetic transport failure`)
      expect(allActions(describeSourceSelection(failed, selected(), support, graphUrl)!).every(action => action.state === 'unavailable')).toBe(true)
      expect(failed.data).toBe(data)
    }
    expect(describeSourceSelection({ status: 'unavailable', data: null, reason: 'Not loaded' }, selected(), support)).toBeNull()
    const empty = altered()
    // Coherent, clearly synthetic empty model output, not a truncated real capture.
    empty.canonical = buildKnowledgeSnapshot({ repository: 'castlemilk/benebsworth.com', revision: data.canonical.sourceRevision,
      mapperVersion: 'kg02/synthetic-empty', complete: true, files: [], documents: [], categories: [], aliases: [], diagnostics: [],
      coverage: data.canonical.coverage }).snapshot
    empty.hostGraph = { nodes: [], edges: [] }
    empty.glossary = []
    empty.studyCoverage = { curriculumChapters: 71, packetChapters: 0, glossaryOccurrences: 0, studyReferences: 'not-extracted' }
    empty.bridge = buildIntegrationBridge({ snapshot: empty.canonical, host: empty.hostGraph, hostRevision: data.canonical.sourceRevision,
      glossary: [], artworkFiles: [], artworkMappingFile: { path: 'fixtures/synthetic-empty-artwork.ts', sha256: '0'.repeat(64) } })
    const resolution = resolveSourceView(load(empty), initialSourceViewState(empty))
    expect(resolution.blockedReason).toBeNull()
    expect(resolution.nodes).toEqual([])
    expect(resolution.selection.status).toBe('none')
  })

  it('preserves a missing requested ID and its reason before any URL explanation', () => {
    const state = selected('concept:synthetic-missing')
    const descriptor = describeSourceSelection(ready, state, support, null)!
    expect(state.navigation.selectedId).toBe('concept:synthetic-missing')
    expect(descriptor.resolution.status).toBe('missing')
    expect(allActions(descriptor).every(action => action.state === 'unavailable' && action.reason === 'missing')).toBe(true)
  })

  it.each(['https:///example.test/path', 'https:////example.test/path', 'https://example.test/\npath'])('rejects malformed original graph input before URL repair: %s', href => {
    expect(describeSourceSelection(ready, selected(), support, href)?.capabilities.copy).toEqual({ state: 'unavailable', reason: 'invalid-absolute-graph-url' })
  })

  it('rejects malformed source input while preserving valid native anchors byte-for-byte', () => {
    const changed = altered()
    const node = changed.canonical.nodes.find(item => item.id === idOf('blog'))!
    node.navigation.href = 'https:///example.test/path'
    const descriptor = describeSourceSelection(load(changed), selected(), support, graphUrl)!
    expect(descriptor.capabilities.source).toEqual({ state: 'unavailable', reason: 'invalid-source-destination' })
    expect(descriptor.sourceCopy.state).toBe('unavailable')
  })

  it('revalidates an action after selection, support, filter or snapshot changes', () => {
    const start = selected()
    const identity = describeSourceSelection(ready, start, support, graphUrl)!.identity
    expect(revalidateSourceAction(ready, start, identity, 'inspect', support).state).toBe('available')
    expect(revalidateSourceAction(ready, selected(idOf('lab')), identity, 'inspect', support)).toEqual({ state: 'unavailable', reason: 'identity-changed' })
    expect(revalidateSourceAction(ready, start, identity, 'inspect', {})).toEqual({ state: 'unavailable', reason: 'inspector-unsupported' })
    const hidden = { ...start, navigation: { ...start.navigation, kinds: [] } }
    expect(revalidateSourceAction(ready, hidden, identity, 'source-copy', support)).toEqual({ state: 'unavailable', reason: 'hidden' })
    const changed = altered()
    changed.canonical.digest = 'new-digest'
    changed.bridge.canonicalSnapshotIdentity = 'new-digest'
    expect(revalidateSourceAction(load(changed), start, identity, 'inspect', support)).toEqual({ state: 'unavailable', reason: 'stale' })
  })

  it('retains long labels and unpublished source status without changing identities or native destinations', () => {
    const changed = altered()
    const node = changed.canonical.nodes.find(item => item.id === idOf('blog'))!
    node.label = 'Synthetic long label — '.repeat(100)
    changed.sourcePublication = 'unpublished'
    const descriptor = describeSourceSelection(load(changed), selected(), support, graphUrl)!
    expect(descriptor.title).toBe(node.label)
    expect(descriptor.identity.id).toBe(node.id)
    expect(descriptor.capabilities.source).toMatchObject({ state: 'available', href: node.navigation.href })
    expect(changed.sourcePublication).toBe('unpublished')
  })
})
