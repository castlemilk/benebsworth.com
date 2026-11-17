/** Additive KG 01 handoff. Nothing here is imported by the site's runtime. */
export const SCHEMA_VERSION = 1 as const
export const MAPPER_VERSION = 'blog-kg01/1' as const

export type ContentKind = 'blog' | 'lab' | 'study'
export type NodeKind = ContentKind | 'concept' | 'tag' | 'category' | 'citation'
export type Predicate = 'tagged_with' | 'classified_as' | 'mentions_concept'
  | 'links_to' | 'embeds_lab' | 'companion_article' | 'cites'

/** SHA-256 of the exact UTF-8 file bytes, at Snapshot.sourceRevision. */
export interface SourceFile { path: string; sha256: string }
export interface Locator extends SourceFile {
  /** Field/AST selector and literal value at this exact source revision. */
  selector: string
  rawValue: string
  /** One-based, inclusive source-file lines, when known. */
  lineStart?: number
  lineEnd?: number
}
export interface Evidence {
  basis: 'authored-metadata' | 'authored-link' | 'literal-embed' | 'registry'
    | 'editorial-rule' | 'curated-term' | 'reviewed-id-alias'
  /** Confidence in mapping/extraction, never a probability of scientific truth. */
  confidence: 'explicit' | 'deterministic' | 'editorial'
  locators: Locator[]
  rule?: string
}
export interface CategorySource {
  namespace: 'blog-topic' | 'lab-category' | 'study-category'
  key: string
  label: string
  icon?: string
  evidence: Evidence
}
export interface ConceptSource {
  /** An authored/curated stable key scoped to its owning content record. */
  key: string
  label: string
  evidence: Evidence
}
export interface ReferenceSource {
  predicate: 'links_to' | 'embeds_lab' | 'companion_article' | 'cites'
  target: { kind: ContentKind; key: string } | { href: string }
  label: string
  evidence: Evidence
}
export interface ContentSource {
  kind: ContentKind
  key: string
  title: string
  href: string
  subtype: 'article' | 'simulation' | 'guide' | 'packet'
  publication: 'published' | 'draft' | 'unreleased'
  evidence: Evidence
  /** All files that affect this record; used to invalidate incremental fragments. */
  dependencies: SourceFile[]
  tags: { value: string; evidence: Evidence }[]
  category?: { namespace: CategorySource['namespace']; key: string; evidence: Evidence }
  concepts: ConceptSource[]
  references: ReferenceSource[]
}
export interface IdAlias { from: string; to: string; evidence: Evidence }
/** An explicit hosting rule for a whole origin, not a guessed route redirect. */
export interface OriginAlias { from: string; to: string; evidence: Evidence }
export interface Diagnostic {
  code: string
  severity: 'info' | 'warning' | 'error'
  message: string
  nodeId?: string
  /** Only locators from published sources may enter a public snapshot. */
  locator?: Locator
}
export interface SourceInput {
  repository: 'castlemilk/benebsworth.com'
  revision: string
  /** Explicit version/hash of the extraction policy; cache cannot cross this boundary. */
  mapperVersion: string
  /** A partial or failed read MUST NOT retire last-good content. */
  complete: boolean
  files: SourceFile[]
  categories: CategorySource[]
  documents: ContentSource[]
  aliases: IdAlias[]
  originAliases?: OriginAlias[]
  diagnostics: Diagnostic[]
  coverage: {
    blog: 'complete'
    lab: 'registry-only' | 'complete'
    study: 'unavailable' | 'complete'
    concepts: 'curated-source-scoped' | 'owner-registry'
    citations: 'supported-mdx-syntax'
  }
}
export interface Navigation {
  /** Never derive a URL from an ID or label in the UI. */
  href: string | null
  action: 'open' | 'filter' | 'inspect'
  availability: 'source-resolved' | 'external-unchecked' | 'not-applicable'
  /** Source existence is not built/browser/live evidence. */
  build: 'unverified'
  live: 'unverified'
}
export interface KnowledgeNode {
  id: string
  kind: NodeKind
  key: string
  label: string
  /** Preserves observed spellings for a discovery tag, without merging concepts. */
  labels: string[]
  subtype?: ContentSource['subtype'] | 'external-reference'
  namespace?: CategorySource['namespace']
  ownerId?: string
  icon?: string
  navigation: Navigation
  evidence: Evidence[]
}
export interface KnowledgeEdge {
  id: string
  source: string
  target: string
  predicate: Predicate
  evidence: Evidence[]
}
export interface ResolvedReference {
  id: string
  source: string
  predicate: ReferenceSource['predicate']
  /** Authored query and fragment are preserved, even when the entity resolves. */
  href: string | null
  /** Safe resolved destination for the graph UI; relative URLs use the source route as base. */
  navigationHref: string | null
  targetId: string | null
  status: 'resolved' | 'external-unchecked' | 'missing' | 'excluded' | 'invalid' | 'outside-coverage'
  anchor: 'unverified' | 'not-applicable'
  evidence: Evidence
  resolvedViaAlias?: IdAlias
  resolvedViaOriginAlias?: OriginAlias
}
export interface Snapshot {
  schemaVersion: typeof SCHEMA_VERSION
  repository: SourceInput['repository']
  sourceRevision: string
  mapperVersion: string
  coverage: SourceInput['coverage']
  /** Full private input manifest fingerprint; excluded metadata itself is never emitted. */
  inputManifestDigest: string
  digest: string
  sources: SourceFile[]
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  references: ResolvedReference[]
  aliases: IdAlias[]
  originAliases: OriginAlias[]
  diagnostics: Diagnostic[]
}
