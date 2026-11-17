/** KG 02 source-mode contract. Pure, isolated and not imported by a route. */
import type { KnowledgeGraph } from '../../lib/knowledge/graph'
import type { KnowledgeNode, NodeKind, Snapshot } from '../../lib/knowledge-source/schema'
import type { BridgeReport, Correspondence, HOST_PROVIDER, SOURCE_PROVIDER } from '../../lib/knowledge-source/integration/bridge'
import type { HostIdentity, HostState, HostResolution, DescriptorAction, actionNodeDescriptor } from '../../lib/knowledge-source/integration/host-seam'
import type { AuthoredGlossaryOccurrence, StudySourceSlice } from '../../lib/knowledge-source/integration/study-source'

// Protocol literals are constrained by model-owned types without importing its
// server-side hashing/building module into this browser-neutral adapter.
export const CANONICAL_PROVIDER: typeof SOURCE_PROVIDER = 'blog-kg01/source-v1'
export const CONSOLE_PROVIDER: typeof HOST_PROVIDER = 'benebsworth-console'

export type ConsoleOrigin = Omit<HostIdentity, 'provider'> & { provider: typeof HOST_PROVIDER }
export type CanonicalIdentity = Omit<HostIdentity, 'provider'> & { provider: typeof SOURCE_PROVIDER }
export type CanonicalNavigation = Omit<HostState, 'provider'> & { provider: typeof SOURCE_PROVIDER }

/** Retain complete owner records. This is not a cast into the V1 fixture DTO. */
export interface SourceViewDataV2 {
  contractVersion: 2
  canonical: Snapshot
  hostGraph: KnowledgeGraph
  bridge: BridgeReport
  studyCoverage: StudySourceSlice['coverage']
  glossary: readonly AuthoredGlossaryOccurrence[]
  currentness: 'current' | 'stale' | 'unavailable'
  /** Exact source revision publication, independent of live content availability. */
  sourcePublication: 'unpublished' | 'published' | 'unknown'
}

export type SourceViewLoadV2 =
  | { status: 'ready'; data: SourceViewDataV2 }
  | { status: 'loading' | 'unavailable' | 'error'; data: SourceViewDataV2 | null; reason: string }

export interface SourceViewStateV2 {
  /** Requested URL state can be unbound/wrong-provider/stale; only the adapter resolves it. */
  navigation: HostState
  /** Raw requested qualifier is retained on failure. Never silently fall back to direct mode. */
  candidateOrigin: HostIdentity | null
  view: 'neighbourhood' | 'list' | 'categories'
  scope: 'collection' | 'neighbours'
  /** Exact canonical category ID; no conversion from fixture facets or host IDs. */
  categoryId: string | null
  page: number
  theme: 'light' | 'dark'
  /** Malformed owned URL parameters suspend actions until explicit recovery. */
  inputError: string | null
}

export interface SourceCandidateV2 {
  id: string
  /** Null means absent in this snapshot, not proven deleted from the corpus. */
  node: KnowledgeNode | null
  glossary: readonly AuthoredGlossaryOccurrence[]
}

export type SourceCandidatesV2 =
  | { status: 'unavailable'; reason: string; correspondence: Correspondence | null; candidates: SourceCandidateV2[] }
  | { status: 'choice-required' | 'singleton'; correspondence: Correspondence; candidates: SourceCandidateV2[] }

export interface SourceViewSupportV2 {
  /** Explicit host support; absent flags mean unavailable. No callbacks are installed here. */
  inspect?: boolean
  reroot?: boolean
  camera?: boolean
  source?: boolean
  copy?: boolean
  graphLinks?: boolean
}

export type SourceRecordDescriptorV2 = ReturnType<typeof actionNodeDescriptor> & {
  /** Camera is separate from the helper's focus/reroot capability. */
  camera: DescriptorAction
  blockedReason: string | null
}

export type SourceViewEventV2 =
  | { type: 'restore'; state: SourceViewStateV2 }
  | { type: 'load-current' }
  | { type: 'open-origin'; origin: HostIdentity }
  | { type: 'choose-candidate'; origin: HostIdentity; identity: HostIdentity }
  | { type: 'inspect' | 'inspect-direct' | 'reroot' | 'camera' | 'reveal'; identity: HostIdentity }
  | { type: 'clear-selection' }
  | { type: 'filters'; kinds: NodeKind[]; query: string; categoryId: string | null }
  | { type: 'presentation'; view: SourceViewStateV2['view']; scope: SourceViewStateV2['scope']; page: number }
  | { type: 'theme'; theme: SourceViewStateV2['theme'] }

export interface SourceViewTransitionV2 {
  state: SourceViewStateV2
  history: 'push' | 'replace' | 'none'
  /** Effects are intents for a future host. No DOM/focus/camera operation runs here. */
  inspectorId: string | null
  cameraId: string | null
  reason?: string
}

export type SourceRecordResolution = HostResolution
export type SourceRecordAction = DescriptorAction
