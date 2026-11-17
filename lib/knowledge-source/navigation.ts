import type { Snapshot, KnowledgeNode } from './schema'

export type SelectionResult =
  | { state: 'selected'; node: KnowledgeNode; snapshotDigest: string }
  | { state: 'redirected'; node: KnowledgeNode; previousId: string; snapshotDigest: string }
  | { state: 'removed'; previousId: string; snapshotDigest: string }
  | { state: 'stale'; previousId: string; expectedDigest: string; snapshotDigest: string }

/** Pure data handoff; the UI owner controls focus, layout, history and recovery copy. */
export function resolveSelection(snapshot: Snapshot, id: string, expectedDigest?: string): SelectionResult {
  if (expectedDigest && expectedDigest !== snapshot.digest) return { state: 'stale', previousId: id, expectedDigest, snapshotDigest: snapshot.digest }
  const direct = snapshot.nodes.find(node => node.id === id)
  if (direct) return { state: 'selected', node: direct, snapshotDigest: snapshot.digest }
  const alias = snapshot.aliases.find(candidate => candidate.from === id)
  const target = alias && snapshot.nodes.find(node => node.id === alias.to)
  return target
    ? { state: 'redirected', previousId: id, node: target, snapshotDigest: snapshot.digest }
    : { state: 'removed', previousId: id, snapshotDigest: snapshot.digest }
}

export function connectionsFor(snapshot: Snapshot, id: string) {
  return snapshot.edges.filter(edge => edge.source === id || edge.target === id).map(edge => ({
    edge,
    direction: edge.source === id ? 'outgoing' as const : 'incoming' as const,
    neighbor: snapshot.nodes.find(node => node.id === (edge.source === id ? edge.target : edge.source))!,
  }))
}

/** Human labels describe authored relationships; none implies a learning prerequisite. */
export const RELATION_LABELS = {
  tagged_with: 'Tagged with',
  classified_as: 'Editorial category',
  mentions_concept: 'Curated term in this source',
  links_to: 'Authored link',
  embeds_lab: 'Embeds this lab',
  companion_article: 'Registered companion article',
  cites: 'Listed reference',
} as const
