import type { KnowledgeNode } from '../../lib/knowledge-source/schema'
import type { DescriptorAction, HostIdentity, HostResolution } from '../../lib/knowledge-source/integration/host-seam'
import { actionNodeDescriptor, hostGuard, resolveHost, transitionHost } from '../../lib/knowledge-source/integration/host-seam'
import { CANONICAL_PROVIDER, CONSOLE_PROVIDER } from './view-contract-v2'
import type { SourceCandidatesV2, SourceRecordDescriptorV2, SourceViewDataV2, SourceViewEventV2, SourceViewLoadV2, SourceViewStateV2, SourceViewSupportV2, SourceViewTransitionV2 } from './view-contract-v2'
import { buildSourceViewHref, initialSourceViewState, safeViewHref } from './source-state-v2'

const context = (data: SourceViewDataV2) => ({ provider: CANONICAL_PROVIDER, snapshot: data.canonical })
const unavailable = (reason: string): DescriptorAction => ({ state: 'unavailable', reason })
const sameIdentity = (a: HostIdentity, b: HostIdentity) => a.provider === b.provider && a.snapshot === b.snapshot && a.id === b.id
const validId = (id: string) => Boolean(id) && id.length <= 4096 && id.trim() === id
  && !Array.from(id).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)

/** Keeps every supplied owner record and definition, without a V1 projection. */
export function sourceViewData(input: Omit<SourceViewDataV2, 'contractVersion'>): SourceViewDataV2 {
  return { ...input, contractVersion: 2 }
}

/** Binding checks on trusted model output; not a replacement for its source/digest verification. */
export function sourceEnvelopeError(data: SourceViewDataV2): string | null {
  if (data.contractVersion !== 2 || data.canonical.schemaVersion !== 1 || data.bridge.version !== 1) return 'unsupported-contract'
  if (data.canonical.repository !== 'castlemilk/benebsworth.com') return 'wrong-repository'
  if (!data.canonical.digest || !data.canonical.sourceRevision || data.bridge.canonicalSnapshotIdentity !== data.canonical.digest
    || data.bridge.sourceRevision !== data.canonical.sourceRevision) return 'stale-bridge'
  if (data.bridge.host.provider !== CONSOLE_PROVIDER || !data.bridge.host.snapshotIdentity) return 'invalid-host-envelope'
  if (data.bridge.host.nodes !== data.hostGraph.nodes.length || data.bridge.host.edgeOccurrences !== data.hostGraph.edges.length) return 'host-inventory-mismatch'
  return null
}

function loadError(load: SourceViewLoadV2): string | null {
  if (load.status !== 'ready') return `${load.status}: ${load.reason}`
  return sourceEnvelopeError(load.data) ?? (load.data.currentness === 'current' ? null : `source-${load.data.currentness}`)
}

/** A lexical/source correspondence never becomes a canonical alias. */
export function resolveSourceCandidates(load: SourceViewLoadV2, origin: HostIdentity): SourceCandidatesV2 {
  const failed = (reason: string): SourceCandidatesV2 => ({ status: 'unavailable', reason, correspondence: null, candidates: [] })
  const error = loadError(load)
  if (error || !load.data) return failed(error ?? 'unavailable')
  const data = load.data
  if (!origin.provider || !origin.snapshot || !origin.id) return failed('unbound-origin')
  if (origin.provider !== data.bridge.host.provider) return failed('wrong-provider')
  if (origin.snapshot !== data.bridge.host.snapshotIdentity) return failed('stale-origin')
  if (!validId(origin.id)) return failed('invalid-origin')
  const matches = data.bridge.correspondences.filter(item => item.fromId === origin.id)
  if (matches.length !== 1) return failed(matches.length ? 'duplicate-correspondence' : 'unmatched-origin')
  const correspondence = matches[0]
  if (correspondence.fromProvider !== origin.provider || correspondence.fromSnapshotIdentity !== origin.snapshot
    || correspondence.semanticEquivalence !== false) return failed('invalid-correspondence')
  const candidates = correspondence.candidateCanonicalIds.map(id => {
    const node = data.canonical.nodes.find(item => item.id === id) ?? null
    return { id, node, glossary: data.glossary.filter(item => item.conceptId === id && item.ownerId === node?.ownerId) }
  })
  const blocked = (reason: string): SourceCandidatesV2 => ({ status: 'unavailable', reason, correspondence, candidates })
  if (correspondence.outcome === 'unmatched' || correspondence.outcome === 'invalid') return blocked(correspondence.outcome)
  if (new Set(correspondence.candidateCanonicalIds).size !== candidates.length
    || (correspondence.outcome === 'source-matched' ? candidates.length !== 1 : candidates.length < 2)) return blocked('invalid-candidate-set')
  if (candidates.some(candidate => !candidate.node)) return blocked('missing-candidate-in-snapshot')
  return { status: correspondence.outcome === 'ambiguous' ? 'choice-required' : 'singleton', correspondence, candidates }
}

function choiceError(load: SourceViewLoadV2, state: SourceViewStateV2): string | null {
  if (!state.candidateOrigin) return null
  const candidates = resolveSourceCandidates(load, state.candidateOrigin)
  if (candidates.status === 'unavailable') return candidates.reason
  if (state.navigation.selectedId === null) return 'choice-required'
  return candidates.candidates.some(candidate => candidate.id === state.navigation.selectedId) ? null : 'candidate-mismatch'
}

function suspended(id: string | null, reason: string, previous?: HostResolution): HostResolution {
  if (id === null) return { status: 'none', requestedId: null }
  const status = reason.includes('stale') ? 'stale' : reason === 'wrong-provider' ? 'wrong-provider'
    : reason.includes('unbound') ? 'unbound' : 'invalid'
  return { ...previous, status, requestedId: id }
}

/** Category means this category and its explicit classified_as members only. */
export function resolveSourceView(load: SourceViewLoadV2, state: SourceViewStateV2) {
  const error = loadError(load) ?? state.inputError
  const empty = (reason: string) => ({
    nodes: [] as KnowledgeNode[], edges: [] as SourceViewDataV2['canonical']['edges'],
    root: suspended(state.navigation.rootId, reason), selection: suspended(state.navigation.selectedId, reason),
    actionableSelected: null as KnowledgeNode | null, blockedReason: reason,
    candidateReason: null as string | null, danglingEdgeIds: [] as string[],
  })
  if (error || !load.data) return empty(error ?? 'unavailable')
  const data = load.data
  let host: ReturnType<typeof resolveHost>
  try { host = resolveHost(context(data), state.navigation) } catch { return empty('invalid-canonical-snapshot') }
  if (host.guard !== 'current') return { ...empty(host.guard), root: host.root, selection: host.selection }
  const category = state.categoryId === null ? null : data.canonical.nodes.find(node => node.id === state.categoryId && node.kind === 'category')
  if (state.categoryId !== null && !category) return empty('missing-category-in-snapshot')
  const members = category ? new Set([category.id, ...data.canonical.edges.filter(edge => edge.predicate === 'classified_as' && edge.target === category.id).map(edge => edge.source)]) : null
  const nodes = members ? host.nodes.filter(node => members.has(node.id)) : host.nodes
  const visible = new Set(nodes.map(node => node.id))
  const visibility = (resolution: HostResolution): HostResolution => resolution.status === 'active' && !visible.has(resolution.resolvedId!)
    ? { ...resolution, status: 'hidden' } : resolution
  const root = visibility(host.root)
  let selection = visibility(host.selection)
  const candidateReason = choiceError(load, state)
  if (candidateReason) selection = suspended(state.navigation.selectedId, candidateReason, selection)
  return { nodes, edges: host.edges.filter(edge => visible.has(edge.source) && visible.has(edge.target)), root, selection,
    actionableSelected: selection.status === 'active' ? selection.node! : null,
    blockedReason: null, candidateReason, danglingEdgeIds: host.danglingEdgeIds }
}

/** Selected-inspector descriptor only. No ActionNode cast, callbacks or DOM work. */
export function describeSourceSelection(load: SourceViewLoadV2, state: SourceViewStateV2,
  support: SourceViewSupportV2 = {}, originalGraphUrl: string | null = null): SourceRecordDescriptorV2 | null {
  if (!load.data) return null
  const data = load.data, view = resolveSourceView(load, state)
  const reason = view.blockedReason ?? view.candidateReason ?? (view.selection.status === 'active' ? null : view.selection.status)
  // Validate original bytes BEFORE a URL parser can repair malformed authority/control input.
  const graphUrl = safeViewHref(originalGraphUrl, true)
  let descriptor: ReturnType<typeof actionNodeDescriptor>
  try { descriptor = actionNodeDescriptor(context(data), state.navigation, state.navigation.selectedId ?? '', graphUrl ?? '') }
  catch { return null }
  const blocked = reason ? unavailable(reason) : null
  const requireSupport = (action: DescriptorAction, enabled: boolean | undefined, feature: string) =>
    blocked ?? (!enabled ? unavailable(`${feature}-unsupported`) : action)
  const rawSource = descriptor.capabilities.source
  const source = rawSource.state === 'available' && safeViewHref(rawSource.href ?? null)
    ? rawSource : unavailable(view.selection.node?.navigation.action === 'open' ? 'invalid-source-destination' : 'no-content-destination')
  const nativeHref = view.selection.node?.navigation.action === 'open' ? view.selection.node.navigation.href : null
  const absoluteSource = safeViewHref(nativeHref, true)
  const sourceCopy: DescriptorAction = absoluteSource
    ? { state: 'available', intent: 'copy', kind: 'source', href: absoluteSource }
    : unavailable('Source copy requires an exact absolute source URL supplied by the host')
  const graphHref = graphUrl && support.graphLinks ? buildSourceViewHref(graphUrl, state) : null
  const graphCopy: DescriptorAction = graphHref
    ? { state: 'available', intent: 'copy', kind: 'graph', href: graphHref }
    : unavailable(!support.graphLinks ? 'graph-links-unsupported' : 'invalid-absolute-graph-url')
  const identity = descriptor.identity
  return { ...descriptor, resolution: view.selection,
    isRoot: !reason && view.root.status === 'active' && view.root.resolvedId === view.selection.resolvedId,
    isSelected: !reason && view.selection.status === 'active',
    evidence: reason ? { status: reason.includes('stale') ? 'stale' : 'unavailable', text: `Selection ${reason}; source records remain available for recovery.` } : descriptor.evidence,
    capabilities: {
      inspect: requireSupport(descriptor.capabilities.inspect, support.inspect, 'inspector'),
      focus: requireSupport(descriptor.capabilities.focus, support.reroot, 'reroot'),
      source: requireSupport(source, support.source, 'native-source'),
      copy: requireSupport(graphCopy, support.copy, 'copy'),
    },
    sourceCopy: requireSupport(sourceCopy, support.copy, 'copy'),
    camera: requireSupport({ state: 'available', intent: 'camera', identity }, support.camera, 'camera'),
    blockedReason: reason }
}

export type SourceActionV2 = 'inspect' | 'reroot' | 'camera' | 'source' | 'graph-copy' | 'source-copy'

/** Call at activation and again before committing any asynchronous host effect. */
export function revalidateSourceAction(load: SourceViewLoadV2, state: SourceViewStateV2, identity: HostIdentity,
  action: SourceActionV2, support: SourceViewSupportV2 = {}, originalGraphUrl: string | null = null): DescriptorAction {
  const descriptor = describeSourceSelection(load, state, support, originalGraphUrl)
  if (!descriptor) return unavailable(loadError(load) ?? 'unavailable')
  if (descriptor.blockedReason) return unavailable(descriptor.blockedReason)
  if (!sameIdentity(identity, descriptor.identity)) return unavailable('identity-changed')
  if (action === 'camera') return descriptor.camera
  if (action === 'source-copy') return descriptor.sourceCopy
  return descriptor.capabilities[action === 'reroot' ? 'focus' : action === 'graph-copy' ? 'copy' : action]
}

function identityError(data: SourceViewDataV2, identity: HostIdentity): string | null {
  if (!identity.provider || !identity.snapshot) return 'unbound'
  if (identity.provider !== CANONICAL_PROVIDER) return 'wrong-provider'
  if (identity.snapshot !== data.canonical.digest) return 'stale'
  return validId(identity.id) ? null : 'invalid-id'
}

/** Pure semantic transitions. Caller owns browser history, focus, scroll and effects. */
export function transitionSourceView(load: SourceViewLoadV2, current: SourceViewStateV2, event: SourceViewEventV2,
  support: SourceViewSupportV2 = {}): SourceViewTransitionV2 {
  const unchanged = (reason?: string): SourceViewTransitionV2 => ({ state: current, history: 'none', inspectorId: null, cameraId: null, ...(reason ? { reason } : {}) })
  const finish = (state: SourceViewStateV2, history: 'push' | 'replace' = 'push', inspectorId: string | null = null): SourceViewTransitionV2 => ({
    state, history: JSON.stringify(state) === JSON.stringify(current) ? 'none' : history, inspectorId, cameraId: null,
  })
  if (event.type === 'restore') return { state: event.state, history: 'none', inspectorId: null, cameraId: null }
  const error = loadError(load)
  if (error || !load.data) return unchanged(error ?? 'unavailable')
  const data = load.data
  if (event.type === 'load-current') return finish({ ...initialSourceViewState(data), view: current.view, scope: current.scope, theme: current.theme })
  if (current.inputError) return unchanged(current.inputError)
  const guard = hostGuard(context(data), current.navigation)
  if (guard !== 'current') return unchanged(guard)
  if (event.type === 'theme') return finish({ ...current, theme: event.theme }, 'replace')
  if (event.type === 'presentation') {
    if (!Number.isSafeInteger(event.page) || event.page < 1) return unchanged('invalid-page')
    return finish({ ...current, view: event.view, scope: event.scope, page: event.page })
  }
  if (event.type === 'clear-selection') return finish({ ...current, candidateOrigin: null, navigation: { ...current.navigation, selectedId: null } })
  if (event.type === 'filters') {
    if (event.categoryId !== null && !data.canonical.nodes.some(node => node.kind === 'category' && node.id === event.categoryId)) return unchanged('missing-category-in-snapshot')
    const result = transitionHost(context(data), current.navigation, { type: 'filters', kinds: event.kinds, query: event.query })
    return finish({ ...current, navigation: result.state, categoryId: event.categoryId, page: 1 })
  }
  if (event.type === 'open-origin') {
    const candidates = resolveSourceCandidates(load, event.origin)
    if (candidates.status === 'unavailable') return unchanged(candidates.reason)
    const chooser = { ...current, candidateOrigin: { ...event.origin }, navigation: { ...current.navigation, selectedId: null }, page: 1 }
    if (candidates.status === 'choice-required') return finish(chooser)
    const result = transitionSourceView(load, chooser, { type: 'choose-candidate', origin: event.origin,
      identity: { provider: CANONICAL_PROVIDER, snapshot: data.canonical.digest, id: candidates.candidates[0].id } }, support)
    if (result.reason) return { ...finish(chooser), reason: result.reason }
    return finish(result.state, 'push', result.inspectorId)
  }
  const qualified = identityError(data, event.identity)
  if (qualified) return unchanged(qualified)
  if (event.type === 'choose-candidate') {
    if (!current.candidateOrigin || !sameIdentity(current.candidateOrigin, event.origin)) return unchanged('origin-changed')
    const candidates = resolveSourceCandidates(load, event.origin)
    if (candidates.status === 'unavailable') return unchanged(candidates.reason)
    if (!candidates.candidates.some(candidate => candidate.id === event.identity.id)) return unchanged('candidate-mismatch')
  } else if (event.type !== 'inspect-direct' && event.type !== 'reveal') {
    const candidateError = choiceError(load, current)
    if (candidateError) return unchanged(candidateError)
    if (current.candidateOrigin && event.identity.id !== current.navigation.selectedId) return unchanged('candidate-mismatch')
  }
  // Direct inspection is explicit. It cannot accidentally inherit a chooser origin.
  const targetState = { ...current, candidateOrigin: null, navigation: { ...current.navigation, selectedId: event.identity.id } }
  const target = resolveSourceView(load, targetState)
  if (target.blockedReason) return unchanged(target.blockedReason)
  if (event.type === 'reveal') {
    if (current.candidateOrigin) {
      const candidates = resolveSourceCandidates(load, current.candidateOrigin)
      if (candidates.status === 'unavailable') return unchanged(candidates.reason)
      if (!candidates.candidates.some(candidate => candidate.id === event.identity.id)) return unchanged('candidate-mismatch')
    }
    const selection = target.selection
    if (selection.status !== 'hidden' && selection.status !== 'active') return unchanged(selection.status)
    if (selection.status === 'active') return unchanged()
    const revealed = transitionHost(context(data), current.navigation, { type: 'filters', query: '', kinds: [...current.navigation.kinds, selection.node!.kind] })
    return finish({ ...current, navigation: revealed.state, categoryId: null, page: 1 })
  }
  if (target.selection.status !== 'active') return unchanged(target.selection.status)
  const intent = event.type === 'choose-candidate' || event.type === 'inspect-direct' ? 'inspect' : event.type
  const supported = intent === 'inspect' ? support.inspect : intent === 'reroot' ? support.reroot : support.camera
  if (!supported) return unchanged(`${intent}-unsupported`)
  const result = transitionHost(context(data), current.navigation, { type: intent, identity: event.identity })
  if (result.reason) return unchanged(result.reason)
  if (intent === 'camera') return { ...unchanged(), cameraId: result.cameraId }
  const next = { ...current, navigation: result.state, ...(event.type === 'inspect-direct' ? { candidateOrigin: null } : {}) }
  // Repeated Inspect still asks the future host to open/focus its inspector.
  return finish(next, 'push', intent === 'inspect' ? target.selection.resolvedId! : null)
}
