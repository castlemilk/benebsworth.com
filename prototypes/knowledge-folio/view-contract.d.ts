/** View-only DTO. IDs and semantics belong to the graph/source owner. */
export type MappingStatus = 'recorded' | 'proposed' | 'mock'
export type ViewNodeKind = 'blog' | 'lab' | 'study' | 'tag' | 'concept' | 'category'
export interface SourceReference {
  label: string
  href: string
  /** Exactly what the source records, not an inferred scientific endorsement. */
  claim: string
}
export interface ViewNode {
  id: string
  kind: ViewNodeKind
  label: string
  summary?: string
  href?: string
  sourceRefs?: SourceReference[]
  taxonomyIds: string[]
  mappingStatus: MappingStatus
  tags?: string[]
}
export interface ViewEdge {
  id: string
  source: string
  target: string
  kind: string
  label: string
  reverseLabel: string
  sourceRefs: SourceReference[]
  mappingStatus: MappingStatus
}
export interface ViewTaxonomy {
  id: string
  namespace: string
  key: string
  label: string
  sourceRefs: SourceReference[]
}
export interface ViewSnapshot {
  id: string
  label: string
  disclosure: string
  status: 'ready' | 'partial' | 'empty' | 'error'
  revision: string | null
  defaultRootId: string
  nodes: ViewNode[]
  edges: ViewEdge[]
  taxonomies: ViewTaxonomy[]
  /** Count of fixture records, never an implicit entire-blog total. */
  totalNodes: number | null
  reason?: string
  neighbourhoodTotals?: Record<string, number>
}
export interface KnowledgeViewState {
  view: 'neighbourhood' | 'list' | 'categories'
  scope: 'collection' | 'neighbours'
  rootId: string
  selectedId: string | null
  query: string
  kind: string
  categoryId: string
  page: number
  fixture: string
  theme: 'light' | 'dark'
}
