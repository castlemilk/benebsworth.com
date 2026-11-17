import type { KnowledgeGraph, KGNode } from '../../knowledge/graph'
import type { Evidence, KnowledgeNode, Snapshot, SourceFile } from '../schema'
import { canonical, categoryId, compare, deepFreeze, sha256, sortedUnique } from '../identity'
import type { AuthoredGlossaryOccurrence } from './study-source'

/** Reproduces the observed console's discovery key, never canonical identity. */
export const normalizeHostLexeme = (value: string) => value.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const HOST_PROVIDER = 'benebsworth-console' as const
export const SOURCE_PROVIDER = 'blog-kg01/source-v1' as const

export interface Correspondence {
  fromProvider: typeof HOST_PROVIDER
  fromId: string
  fromSnapshotIdentity: string
  candidateCanonicalIds: string[]
  outcome: 'source-matched' | 'unmatched' | 'ambiguous' | 'invalid'
  support: {
    kind: 'content-key' | 'study-packet-key' | 'registry-category' | 'lexical-tag' | 'glossary-and-lexical-tags' | 'unmapped'
    evidence: Evidence[]
  }
  /** Candidates are discovery correspondences, not canonical IdAlias redirects. */
  semanticEquivalence: false
  lossNotes: string[]
}
export interface ProjectedHostEdge {
  id: string
  source: string
  target: string
  hostKind: KnowledgeGraph['edges'][number]['kind']
  hostEvidence: KnowledgeGraph['edges'][number]['evidence'] | null
  /** All compatible source edges; an ambiguous host occurrence picks none. */
  candidateCanonicalEdgeIds: string[]
  outcome: 'source-matched' | 'ambiguous' | 'unmatched' | 'invalid'
  evidence: Evidence[]
  lossNotes: string[]
}
export interface BridgeReport {
  version: 1
  sourceRevision: string
  canonicalSnapshotIdentity: string
  host: { provider: typeof HOST_PROVIDER; revision: string; digest: string; snapshotIdentity: string; nodes: number; edgeOccurrences: number }
  correspondences: Correspondence[]
  edges: ProjectedHostEdge[]
  categories: { hostId: string; canonicalId: string; registryKey: string }[]
  artwork: { hostId: string; path: string; file: SourceFile; mappingFile: SourceFile; illustrative: true; scope: 'host-presentation-only' }[]
  destinations: { hostId: string; hostHref: string | null; canonicalHrefs: string[]; status: 'matched-content-route' | 'discovery-index-only' | 'no-destination' | 'mismatch' | 'unmapped' }[]
  canonicalOnlyIds: string[]
  gaps: string[]
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const fail = (message: string): never => { throw new Error(`knowledge bridge: ${message}`) }
function uniqueNodes<T extends { id: string }>(nodes: readonly T[], name: string): Map<string, T> {
  const map = new Map(nodes.map(node => [node.id, node]))
  if (map.size !== nodes.length) fail(`${name} has duplicate node IDs`)
  return map
}
function noDangling(nodes: Map<string, unknown>, edges: readonly { source: string; target: string }[], name: string) {
  for (const edge of edges) if (!nodes.has(edge.source) || !nodes.has(edge.target)) fail(`${name} has a dangling edge: ${edge.source} → ${edge.target}`)
}
export function projectVisibleHostGraph(graph: KnowledgeGraph, kinds: readonly KGNode['kind'][]): KnowledgeGraph {
  const all = uniqueNodes(graph.nodes, 'host')
  noDangling(all, graph.edges, 'host')
  const allowed = new Set(kinds)
  const nodes = graph.nodes.filter(node => allowed.has(node.kind))
  const ids = new Set(nodes.map(node => node.id))
  return clone({ nodes, edges: graph.edges.filter(edge => ids.has(edge.source) && ids.has(edge.target)) })
}

/** A sidecar comparison. It neither replaces nor mutates either provider. */
export function buildIntegrationBridge(input: {
  snapshot: Snapshot
  host: KnowledgeGraph
  hostRevision: string
  glossary: AuthoredGlossaryOccurrence[]
  artworkFiles: SourceFile[]
  artworkMappingFile: SourceFile
}): BridgeReport {
  const { snapshot, host, glossary } = input
  if (!/^[a-f0-9]{40}$/.test(input.hostRevision)) fail('exact host revision required')
  const sourceNodes = uniqueNodes(snapshot.nodes, 'canonical snapshot')
  const hostNodes = uniqueNodes(host.nodes, 'host')
  noDangling(sourceNodes, snapshot.edges, 'canonical snapshot')
  noDangling(hostNodes, host.edges, 'host')
  const sortedHost = {
    nodes: [...host.nodes].sort((a, b) => compare(a.id, b.id)),
    edges: [...host.edges].sort((a, b) => compare(canonical(a), canonical(b))),
  }
  const hostDigest = sha256(canonical(sortedHost))
  const fromSnapshotIdentity = `git:${input.hostRevision}:sha256:${hostDigest}`
  const content = new Map(snapshot.nodes.filter(n => ['blog', 'lab', 'study'].includes(n.kind))
    .map(n => [`${n.kind}:${n.key}`, n]))
  const categories = snapshot.nodes.filter(n => n.kind === 'category' && n.namespace === 'lab-category')
    .map(n => ({ hostId: `category:cat-${n.key}`, canonicalId: categoryId('lab-category', n.key), registryKey: n.key }))
    .sort((a, b) => compare(a.hostId, b.hostId))
  const categoryByHost = new Map(categories.map(c => [c.hostId, c]))
  const tagsByKey = new Map<string, KnowledgeNode[]>()
  for (const node of snapshot.nodes.filter(n => n.kind === 'tag')) {
    // Host normalization operates on authored spellings before canonical NFC.
    // Decomposed accents can produce a different host key; use only observed
    // spellings and preserve the many-host-to-one-canonical case explicitly.
    for (const key of new Set(node.labels.map(normalizeHostLexeme).filter(Boolean))) {
      tagsByKey.set(key, [...(tagsByKey.get(key) ?? []), node])
    }
  }
  const glossaryByKey = new Map<string, AuthoredGlossaryOccurrence[]>()
  for (const occurrence of glossary) {
    const owner = sourceNodes.get(occurrence.ownerId)
    const concept = sourceNodes.get(occurrence.conceptId)
    if (!owner || owner.kind !== 'study' || !concept || concept.kind !== 'concept' || concept.ownerId !== owner.id) fail('glossary owner/concept is absent or mismatched')
    if (!occurrence.normalizedHostKey || occurrence.normalizedHostKey !== normalizeHostLexeme(occurrence.term)) fail('invalid glossary discovery key')
    const key = occurrence.normalizedHostKey
    glossaryByKey.set(key, [...(glossaryByKey.get(key) ?? []), occurrence])
  }
  for (const category of categories) {
    const observed = hostNodes.get(category.hostId)
    if (observed && observed.kind !== 'category') fail(`host category kind collision: ${category.hostId}`)
  }
  const correspondences: Correspondence[] = sortedHost.nodes.map(node => {
    let candidates: KnowledgeNode[] = []
    let kind: Correspondence['support']['kind'] = 'unmapped'
    const lossNotes: string[] = []
    if (node.kind === 'blog' || node.kind === 'lab' || node.kind === 'study') {
      const found = content.get(node.id)
      if (found?.kind === node.kind) candidates = [found]
      kind = node.kind === 'study' ? 'study-packet-key' : 'content-key'
    } else if (node.kind === 'category') {
      const mapping = categoryByHost.get(node.id)
      if (mapping && sourceNodes.has(mapping.canonicalId)) candidates = [sourceNodes.get(mapping.canonicalId)!]
      kind = 'registry-category'
      lossNotes.push('Only the Lab registry namespace maps here; blog topics remain separate.')
    } else if (node.kind === 'tag' && node.id.startsWith('tag:')) {
      candidates = tagsByKey.get(node.id.slice(4)) ?? []
      kind = 'lexical-tag'
      lossNotes.push('Console normalization loses punctuation/spacing distinctions. No semantic equivalence or redirect is implied.')
    } else if (node.kind === 'concept' && node.id.startsWith('concept:')) {
      const key = node.id.slice(8)
      const terms = glossaryByKey.get(key) ?? []
      candidates = [...terms.map(t => sourceNodes.get(t.conceptId)!), ...(tagsByKey.get(key) ?? [])]
      kind = 'glossary-and-lexical-tags'
      lossNotes.push('Definitions retain their source owners. Matching tags are lexical discovery only; curated article concepts are not inferred into this group.')
      if (terms.some(t => t.definition !== t.hostFirstLineDefinition)) lossNotes.push('Host glossary display omits authored continuation lines; the source evidence retains the full bullet.')
    }
    const candidateCanonicalIds = [...new Set(candidates.map(n => n.id))].sort(compare)
    return {
      fromProvider: HOST_PROVIDER, fromId: node.id, fromSnapshotIdentity, candidateCanonicalIds,
      outcome: candidateCanonicalIds.length > 1 ? 'ambiguous' : candidateCanonicalIds.length ? 'source-matched' : 'unmatched',
      support: { kind, evidence: sortedUnique(candidates.flatMap(n => n.evidence)) }, semanticEquivalence: false, lossNotes,
    }
  })
  const binding = new Map(correspondences.map(c => [c.fromId, c]))
  const counts = new Map<string, number>()
  const totals = new Map<string, number>()
  for (const edge of sortedHost.edges) totals.set(canonical(edge), (totals.get(canonical(edge)) ?? 0) + 1)
  const edges: ProjectedHostEdge[] = sortedHost.edges.map(edge => {
    const key = canonical(edge), ordinal = counts.get(key) ?? 0
    counts.set(key, ordinal + 1)
    const source = binding.get(edge.source)!, target = binding.get(edge.target)!
    const sourceKind = hostNodes.get(edge.source)!.kind
    const targetKind = hostNodes.get(edge.target)!.kind
    const valid = (edge.evidence === 'authored-glossary' && edge.kind === 'concept' && sourceKind === 'study' && targetKind === 'concept')
      || (edge.evidence === 'normalized-tag-match' && edge.kind === 'concept' && ['blog', 'lab'].includes(sourceKind) && targetKind === 'concept')
      || (edge.evidence === 'shared-tag' && edge.kind === 'tag' && ['blog', 'lab'].includes(sourceKind) && targetKind === 'tag')
      || (edge.evidence === 'registry-category' && edge.kind === 'category' && sourceKind === 'lab' && targetKind === 'category')
    const predicate = edge.evidence === 'authored-glossary' ? 'mentions_concept'
      : edge.evidence === 'registry-category' ? 'classified_as' : 'tagged_with'
    const matched = valid && source.candidateCanonicalIds.length === 1 ? snapshot.edges.filter(e =>
      e.source === source.candidateCanonicalIds[0] && e.predicate === predicate && target.candidateCanonicalIds.includes(e.target)
      && (edge.evidence !== 'authored-glossary' || glossary.some(g => g.ownerId === e.source && g.conceptId === e.target))) : []
    return {
      id: `host-edge:${sha256(canonical([edge, ordinal]))}`, source: edge.source, target: edge.target,
      hostKind: edge.kind, hostEvidence: edge.evidence ?? null,
      candidateCanonicalEdgeIds: matched.map(e => e.id).sort(compare), outcome: valid ? matched.length > 1 ? 'ambiguous' : matched.length ? 'source-matched' : 'unmatched' : 'invalid',
      evidence: sortedUnique(matched.flatMap(e => e.evidence)),
      lossNotes: [
        ...(!valid ? ['Missing or inconsistent authored edge classification; no predicate was inferred.'] : []),
        ...(matched.length > 1 ? ['Several source edges fit this normalized host occurrence; the original occurrence-to-edge association is unavailable. Candidates are not an automatic choice.'] : []),
        ...((totals.get(key) ?? 0) > 1 ? ['Duplicate host occurrences are preserved; canonical source edges aggregate evidence.'] : []),
        ...(edge.evidence === 'normalized-tag-match' ? ['Projected to tagged_with only. No concept-membership, prerequisite or scientific-equivalence edge is created.'] : []),
      ],
    }
  })
  const assetByPath = new Map(input.artworkFiles.map(file => [file.path, file]))
  const artwork: BridgeReport['artwork'] = sortedHost.nodes.flatMap(node => {
    if (!node.art) return []
    if (!/^\/topics\/artwork\/[a-z0-9-]+\.png$/.test(node.art)) fail(`unsupported artwork path: ${node.art}`)
    const file = assetByPath.get(`public${node.art}`) ?? fail(`artwork source is absent: ${node.art}`)
    return [{ hostId: node.id, path: node.art, file, mappingFile: input.artworkMappingFile, illustrative: true as const, scope: 'host-presentation-only' as const }]
  })
  const destinations: BridgeReport['destinations'] = sortedHost.nodes.map(node => {
    const correspondence = binding.get(node.id)!
    const hrefs = [...new Set(correspondence.candidateCanonicalIds.map(id => sourceNodes.get(id)!.navigation.href).filter((href): href is string => !!href))].sort(compare)
    const isContent = ['blog', 'lab', 'study'].includes(node.kind)
    const status = isContent ? correspondence.candidateCanonicalIds.length !== 1 ? 'unmapped'
      : hrefs.length === 1 && hrefs[0] === node.href ? 'matched-content-route' : 'mismatch'
      : !node.href ? 'no-destination' : node.kind === 'concept' && node.href === '/study/concepts/' ? 'discovery-index-only' : 'mismatch'
    return { hostId: node.id, hostHref: node.href ?? null, canonicalHrefs: hrefs, status }
  })
  const projected = new Set(correspondences.flatMap(c => c.candidateCanonicalIds))
  const gaps = [
    'Comparison sidecar only; production provider/route and other owners\' UI are unchanged.',
    'Canonical citation nodes, blog-topic categories and curated article concepts have no automatic console projection.',
    'Study packet inventory and authored glossary are included; study citations/assets are not exhaustively extracted.',
    'Artwork paths and file hashes preserve current presentation; they do not establish original artwork licence/provenance or factual evidence.',
    'Destination equality is a source check; built URLs, live HTTP, history, focus and native browser behavior remain separate acceptance gates.',
  ]
  return deepFreeze(clone({
    version: 1 as const, sourceRevision: snapshot.sourceRevision,
    // This is exactly the SOURCE_PROVIDER token used by host-seam/ActionNode.
    canonicalSnapshotIdentity: snapshot.digest,
    host: { provider: HOST_PROVIDER, revision: input.hostRevision, digest: hostDigest, snapshotIdentity: fromSnapshotIdentity, nodes: host.nodes.length, edgeOccurrences: host.edges.length },
    correspondences, edges, categories, artwork, destinations,
    canonicalOnlyIds: snapshot.nodes.filter(n => !projected.has(n.id)).map(n => n.id).sort(compare), gaps,
  }))
}

/** Even an identical-looking host ID must traverse the qualified sidecar. */
export function resolveHostCorrespondence(report: BridgeReport, identity: { provider: string; id: string; snapshot: string }) {
  if (identity.provider !== report.host.provider || identity.snapshot !== report.host.snapshotIdentity) {
    return { outcome: 'invalid' as const, candidateCanonicalIds: [], reason: 'Wrong provider or stale snapshot; reload correspondence before resolving.' }
  }
  return report.correspondences.find(c => c.fromId === identity.id)
    ?? { outcome: 'unmatched' as const, candidateCanonicalIds: [], reason: 'No correspondence in this complete comparison.' }
}
