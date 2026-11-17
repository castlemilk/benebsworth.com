import type { KnowledgeNode, NodeKind, Snapshot } from '../schema'
import { resolveSelection } from '../navigation'

/** Proposal only: no runtime consumer, browser history, UI callbacks or lexical aliases. */
export const HOST_KINDS: readonly NodeKind[] = ['blog', 'lab', 'study', 'concept', 'tag', 'category', 'citation']
export interface HostContext { provider: string; snapshot: Snapshot }
export interface HostIdentity { provider: string; id: string; snapshot: string }
export interface HostState {
  provider: string; snapshot: string
  rootId: string | null; selectedId: string | null
  kinds: NodeKind[]; query: string
}
export type HostGuard = 'current' | 'unbound' | 'wrong-provider' | 'stale'
export interface HostResolution {
  status: 'none' | 'active' | 'hidden' | 'missing' | 'invalid' | Exclude<HostGuard, 'current'>
  requestedId: string | null
  resolvedId?: string
  redirected?: boolean
  node?: KnowledgeNode
}
const keys = { provider: 'kgProvider', snapshot: 'kgSnapshot', rootId: 'kgRoot', selectedId: 'kgSelected', kinds: 'kgKinds', query: 'kgQuery' } as const
const parseUrl = (href: string) => new URL(href, 'https://knowledge.invalid/')
const orderKinds = (values: readonly NodeKind[]) => HOST_KINDS.filter(kind => values.includes(kind))
const hasControl = (value: string, maximum = 31) => Array.from(value).some(character => character.charCodeAt(0) <= maximum || character.charCodeAt(0) === 127)
const validId = (id: string) => Boolean(id) && id.length <= 4096 && id.trim() === id && !hasControl(id)
const same = (left: HostState, right: HostState) => JSON.stringify(left) === JSON.stringify(right)
const normalize = (state: HostState): HostState => ({ ...state, kinds: orderKinds(state.kinds) })

export function initialHostState(context: HostContext): HostState {
  return { provider: context.provider, snapshot: context.snapshot.digest, rootId: null, selectedId: null, kinds: [...HOST_KINDS], query: '' }
}

/** Existing unqualified IDs are unbound, not silently treated as canonical IDs. */
export function readHostState(href: string, context: HostContext): HostState {
  const p = parseUrl(href).searchParams
  const requested = Boolean(p.get(keys.rootId) || p.get(keys.selectedId))
  return {
    provider: p.get(keys.provider) ?? (requested ? '' : context.provider),
    snapshot: p.get(keys.snapshot) ?? (requested ? '' : context.snapshot.digest),
    rootId: p.get(keys.rootId) || null,
    selectedId: p.get(keys.selectedId) || null,
    kinds: p.has(keys.kinds) ? orderKinds(p.get(keys.kinds)!.split(',') as NodeKind[]) : [...HOST_KINDS],
    query: p.get(keys.query) ?? '',
  }
}

/** Only owned parameters change; IDs are opaque, and foreign repeated keys/hash survive. */
export function buildHostHref(href: string, state: HostState): string {
  const url = parseUrl(href)
  const values = { ...normalize(state), kinds: orderKinds(state.kinds).join(',') }
  for (const [key, parameter] of Object.entries(keys)) {
    url.searchParams.set(parameter, String(values[key as keyof typeof values] ?? ''))
  }
  return `${url.pathname}${url.search}${url.hash}`
}

export function hostGuard(context: HostContext, state: HostState): HostGuard {
  if (!state.provider || !state.snapshot) return 'unbound'
  if (state.provider !== context.provider) return 'wrong-provider'
  return state.snapshot === context.snapshot.digest ? 'current' : 'stale'
}

/** Requested identities survive filtering; hidden records have no actionable selection. */
export function resolveHost(context: HostContext, state: HostState) {
  const { snapshot } = context
  const guard = hostGuard(context, state)
  const allIds = new Set<string>()
  for (const node of snapshot.nodes) {
    if (!validId(node.id) || allIds.has(node.id)) throw new Error(`Invalid or duplicate canonical node ID: ${node.id}`)
    allIds.add(node.id)
  }
  const terms = state.query.trim().toLowerCase().split(/\s+/u).filter(Boolean)
  const nodes = guard === 'current' ? snapshot.nodes.filter(node => state.kinds.includes(node.kind)
    && terms.every(term => [node.label, ...node.labels].join('\n').toLowerCase().includes(term))) : []
  const visible = new Set(nodes.map(node => node.id))
  const resolve = (id: string | null): HostResolution => {
    if (id === null) return { status: 'none', requestedId: null }
    if (guard !== 'current') return { status: guard, requestedId: id }
    if (!validId(id)) return { status: 'invalid', requestedId: id }
    const result = resolveSelection(snapshot, id, state.snapshot)
    if (result.state === 'removed') return { status: 'missing', requestedId: id }
    if (result.state === 'stale') return { status: 'stale', requestedId: id }
    return { status: visible.has(result.node.id) ? 'active' : 'hidden', requestedId: id,
      resolvedId: result.node.id, redirected: result.state === 'redirected', node: result.node }
  }
  const root = resolve(state.rootId), selection = resolve(state.selectedId)
  return {
    guard, nodes, edges: snapshot.edges.filter(edge => visible.has(edge.source) && visible.has(edge.target)),
    danglingEdgeIds: snapshot.edges.filter(edge => !allIds.has(edge.source) || !allIds.has(edge.target)).map(edge => edge.id),
    root, selection, actionableSelected: selection.status === 'active' ? selection.node! : null,
  }
}

export type HostEvent =
  | { type: 'inspect' | 'reroot'; identity: HostIdentity; reveal?: boolean; history?: 'push' | 'replace' }
  | { type: 'camera'; identity: HostIdentity }
  | { type: 'filters'; kinds: NodeKind[]; query: string; history?: 'push' | 'replace' }
  | { type: 'clear-selection'; history?: 'push' | 'replace' }
  | { type: 'restore'; state: HostState }
export interface HostTransition {
  state: HostState; history: 'push' | 'replace' | 'none'; cameraId: string | null; reason?: string
}

/** Host executes any returned effect. Back/Forward restore emits no write or camera effect. */
export function transitionHost(context: HostContext, current: HostState, event: HostEvent): HostTransition {
  if (event.type === 'restore') return { state: normalize(event.state), history: 'none', cameraId: null }
  const unchanged = (reason?: string): HostTransition => ({ state: current, history: 'none', cameraId: null, ...(reason ? { reason } : {}) })
  if (hostGuard(context, current) !== 'current') return unchanged(hostGuard(context, current))
  let next = normalize(current)
  if ('identity' in event) {
    if (event.identity.provider !== context.provider) return unchanged('wrong-provider')
    if (event.identity.snapshot !== context.snapshot.digest) return unchanged('stale')
    if (!validId(event.identity.id)) return unchanged('invalid-id')
    const result = resolveHost(context, { ...current, selectedId: event.identity.id }).selection
    if (result.status !== 'active' && result.status !== 'hidden') return unchanged(result.status)
    if (event.type === 'camera') return result.status === 'active'
      ? { state: current, history: 'none', cameraId: result.resolvedId! } : unchanged('hidden')
    next = { ...next, [event.type === 'inspect' ? 'selectedId' : 'rootId']: event.identity.id }
    if (event.reveal) next = { ...next, query: '', kinds: orderKinds([...next.kinds, result.node!.kind]) }
  } else if (event.type === 'filters') next = { ...next, kinds: orderKinds(event.kinds), query: event.query }
  else next = { ...next, selectedId: null }
  return same(normalize(current), next) ? unchanged()
    : { state: next, history: ('history' in event && event.history) || 'push', cameraId: null }
}

/** Caller-owned history metadata is passed through untouched, including non-object values. */
export function historyPlan(href: string, transition: HostTransition, existingHistoryState: unknown) {
  return {
    method: transition.history,
    href: transition.history === 'none' ? href : buildHostHref(href, transition.state),
    state: existingHistoryState,
  }
}

/** Navigation guard only. It returns original bytes and never synthesizes an ID or route. */
export function safeHostDestination(value: string | null, absolute = false): string | null {
  if (!value || value.trim() !== value || hasControl(value, 32) || value.includes('\\')) return null
  const relative = value.startsWith('/') && !value.startsWith('//')
  if ((!relative || absolute) && !/^https?:\/\//iu.test(value)) return null
  try {
    const parsed = parseUrl(value)
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? value : null
  } catch { return null }
}

export type DescriptorAction = { state: 'unavailable'; reason: string } | {
  state: 'available'; intent: 'inspect' | 'reroot' | 'camera' | 'native-anchor' | 'copy'
  identity?: HostIdentity; href?: string; note?: string; kind?: 'graph' | 'source'
}

/** Serialized proposal matching ActionNode meanings; no callbacks or runtime DTO cast. */
export function actionNodeDescriptor(context: HostContext, state: HostState, id: string, graphUrl: string) {
  const host = resolveHost(context, state)
  const requested = resolveHost(context, { ...state, selectedId: id }).selection
  const identity: HostIdentity = { provider: state.provider, id: requested.resolvedId ?? id, snapshot: state.snapshot }
  const node = requested.node
  const unavailable = (reason: string): DescriptorAction => ({ state: 'unavailable', reason })
  const blocked = unavailable(requested.status)
  const active = requested.status === 'active' && node !== undefined
  const href = active && node.navigation.action === 'open' ? safeHostDestination(node.navigation.href) : null
  const note = node ? `${node.navigation.availability}; build ${node.navigation.build}; live ${node.navigation.live}; fragment unchecked` : 'No current resolved destination'
  const source: DescriptorAction = href ? { state: 'available', intent: 'native-anchor', href, note } : unavailable(active ? 'No actionable content destination' : requested.status)
  const safeGraph = safeHostDestination(graphUrl, true)
  const graphCopy = active && safeGraph ? new URL(buildHostHref(safeGraph, { ...state, selectedId: id }), safeGraph).href : null
  return {
    identity, title: node?.label ?? id, kindLabel: node?.kind ?? 'Unavailable record',
    evidence: { status: requested.status === 'stale' ? 'stale' as const : !active ? 'unavailable' as const
      : node.evidence.length ? 'recorded' as const : 'unavailable' as const,
    text: active && node.evidence.length ? 'Source mapping recorded; scientific support is not inferred.' : `Selection ${requested.status}; full evidence remains host-owned.` },
    isRoot: active && host.root.status === 'active' && host.root.resolvedId === requested.resolvedId,
    isSelected: active && host.selection.status === 'active' && host.selection.resolvedId === requested.resolvedId,
    resolution: requested,
    capabilities: {
      inspect: active ? { state: 'available', intent: 'inspect', identity } as DescriptorAction : blocked,
      focus: active ? { state: 'available', intent: 'reroot', identity } as DescriptorAction : blocked,
      source,
      copy: graphCopy ? { state: 'available', intent: 'copy', href: graphCopy, kind: 'graph' } as DescriptorAction : unavailable(active ? 'No absolute graph URL supplied' : requested.status),
    },
    sourceCopy: href && safeHostDestination(href, true)
      ? { state: 'available', intent: 'copy', href, kind: 'source' } as DescriptorAction
      : unavailable('Source copy requires an exact absolute source URL supplied by the host'),
  }
}
