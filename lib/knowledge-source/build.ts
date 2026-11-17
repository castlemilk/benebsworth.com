import {
  SCHEMA_VERSION, type ContentSource, type Diagnostic, type Evidence, type IdAlias,
  type KnowledgeEdge, type KnowledgeNode, type Locator, type OriginAlias, type Predicate,
  type ReferenceSource, type ResolvedReference, type Snapshot, type SourceFile, type SourceInput,
} from './schema'
import { canonical, categoryId, citationId, compare, conceptId, contentId, deepFreeze, edgeId, hasControlCharacters, normalizeTag, sha256, sortedUnique, tagId } from './identity'

const ORIGIN = 'https://benebsworth.com'
type Fragment = { nodes: KnowledgeNode[]; edges: KnowledgeEdge[]; references: ReferenceSource[] }
type CacheState = { policy: string; documents: Map<string, { fingerprint: string; fragment: Fragment }> }
/** In-process cache handle. Persisted/untrusted cache objects are deliberately rejected. */
export interface BuildCache { readonly mapperVersion: string; readonly documentCount: number }
const cacheStates = new WeakMap<BuildCache, CacheState>()
export interface BuildResult {
  snapshot: Snapshot
  cache: BuildCache
  stats: { reused: number; rebuilt: number; removed: number }
}

function fail(message: string): never { throw new Error(`knowledge source: ${message}`) }
function evidence(value: Evidence): Evidence {
  return { ...value, locators: sortedUnique(value.locators) }
}
function nodeNavigation(href: string | null, action: 'open' | 'filter' | 'inspect' = 'open') {
  return { href, action, availability: href === null ? 'not-applicable' as const : 'source-resolved' as const, build: 'unverified' as const, live: 'unverified' as const }
}
function relation(source: string, predicate: Predicate, target: string, proof: Evidence): KnowledgeEdge {
  return { id: edgeId(source, predicate, target), source, target, predicate, evidence: [evidence(proof)] }
}
function normalizedDocument(doc: ContentSource): ContentSource {
  return {
    ...doc, evidence: evidence(doc.evidence), dependencies: sortedUnique(doc.dependencies),
    tags: sortedUnique(doc.tags.map(t => ({ ...t, evidence: evidence(t.evidence) }))),
    concepts: doc.concepts.map(c => ({ ...c, evidence: evidence(c.evidence) }))
      .sort((a, b) => compare(canonical(a), canonical(b))),
    references: sortedUnique(doc.references.map(r => ({ ...r, evidence: evidence(r.evidence) }))),
    ...(doc.category ? { category: { ...doc.category, evidence: evidence(doc.category.evidence) } } : {}),
  }
}
function fragmentFor(doc: ContentSource): Fragment {
  const id = contentId(doc.kind, doc.key)
  const nodes: KnowledgeNode[] = [{ id, kind: doc.kind, key: doc.key, label: doc.title, labels: [doc.title],
    subtype: doc.subtype, navigation: nodeNavigation(doc.href), evidence: [doc.evidence] }]
  const edges: KnowledgeEdge[] = []
  for (const tag of doc.tags) {
    if (!normalizeTag(tag.value)) fail(`empty tag in ${id}`)
    const target = tagId(tag.value)
    nodes.push({ id: target, kind: 'tag', key: normalizeTag(tag.value), label: normalizeTag(tag.value),
      labels: [tag.value], navigation: nodeNavigation(null, 'filter'), evidence: [tag.evidence] })
    edges.push(relation(id, 'tagged_with', target, tag.evidence))
  }
  if (doc.category) edges.push(relation(id, 'classified_as', categoryId(doc.category.namespace, doc.category.key), doc.category.evidence))
  const seenConcepts = new Set<string>()
  for (const concept of doc.concepts) {
    const target = conceptId(doc.kind, doc.key, concept.key)
    if (seenConcepts.has(target)) fail(`duplicate source-scoped concept ${target}`)
    seenConcepts.add(target)
    nodes.push({ id: target, kind: 'concept', key: concept.key, label: concept.label, labels: [concept.label], ownerId: id,
      navigation: nodeNavigation(null, 'inspect'), evidence: [concept.evidence] })
    edges.push(relation(id, 'mentions_concept', target, concept.evidence))
  }
  return { nodes, edges, references: doc.references }
}
function route(href: string): string {
  const url = new URL(href, ORIGIN)
  if (url.origin !== ORIGIN || !href.startsWith('/') || href.startsWith('//') || url.pathname !== href || url.search || url.hash) fail(`content href must be a local canonical route: ${href}`)
  return url.pathname.replace(/\/$/, '') || '/'
}
function validateFiles(files: SourceFile[]): Map<string, SourceFile> {
  const byPath = new Map<string, SourceFile>()
  for (const file of files) {
    if (!file.path || file.path.startsWith('/') || file.path.includes('\\') || file.path.split('/').some(p => p === '..' || !p)
      || !/^[a-f0-9]{64}$/.test(file.sha256)) fail('invalid source-file identity')
    if (byPath.has(file.path)) fail(`duplicate source-file path ${file.path}`)
    byPath.set(file.path, file)
  }
  return byPath
}
function validateEvidence(proof: Evidence, files: Map<string, SourceFile>) {
  if (!proof.locators.length) fail('an assertion has no source locator')
  if (!['explicit', 'deterministic', 'editorial'].includes(proof.confidence)) fail('invalid confidence')
  if (!['authored-metadata', 'authored-link', 'literal-embed', 'registry', 'editorial-rule', 'curated-term', 'reviewed-id-alias'].includes(proof.basis)) fail('invalid evidence basis')
  for (const locator of proof.locators) {
    if (files.get(locator.path)?.sha256 !== locator.sha256) fail(`missing/stale source locator ${locator.path}`)
    if (!locator.selector || typeof locator.rawValue !== 'string') fail('invalid source selector')
    if (locator.lineStart !== undefined && (!Number.isInteger(locator.lineStart) || locator.lineStart < 1
      || !Number.isInteger(locator.lineEnd) || (locator.lineEnd ?? 0) < locator.lineStart)) fail('invalid source line range')
    if (locator.lineStart === undefined && locator.lineEnd !== undefined) fail('line end requires line start')
  }
}
function checkAliases(aliases: IdAlias[], nodes: Map<string, KnowledgeNode>, files: Map<string, SourceFile>): IdAlias[] {
  const used = new Set<string>()
  for (const alias of aliases) {
    validateEvidence(alias.evidence, files)
    if (alias.evidence.basis !== 'reviewed-id-alias') fail('ID aliases require explicit reviewed provenance')
    if (used.has(alias.from) || nodes.has(alias.from) || alias.from === alias.to) fail(`ambiguous ID alias ${alias.from}`)
    used.add(alias.from)
    const target = nodes.get(alias.to)
    if (!target || alias.from.split(':')[0] !== target.kind) fail('ID aliases must point directly to an existing node of the same kind')
    if (target.kind === 'concept' && alias.from.split(':').slice(0, 3).join(':') !== alias.to.split(':').slice(0, 3).join(':')) fail('concept aliases cannot merge source scopes')
    if (target.kind === 'category' && alias.from.split(':')[1] !== target.namespace) fail('category aliases cannot merge taxonomies')
  }
  return sortedUnique(aliases.map(a => ({ ...a, evidence: evidence(a.evidence) })))
}

/** Build atomically from a COMPLETE input manifest. No network, clock, MDX execution or UI code. */
export function buildKnowledgeSnapshot(input: SourceInput, previous?: BuildCache): BuildResult {
  // The immutable snapshot/cache must never freeze or retain caller-owned objects.
  input = structuredClone(input)
  if (!input.complete) fail('incomplete source read; retain the previous snapshot')
  if (input.repository !== 'castlemilk/benebsworth.com' || !/^[a-f0-9]{40}$/.test(input.revision)) fail('repository and exact source revision are required')
  if (!input.mapperVersion) fail('mapper version is required')
  const files = validateFiles(input.files)
  const originAliases = (input.originAliases ?? []).map(alias => ({ ...alias, evidence: evidence(alias.evidence) }))
    .sort((a, b) => compare(canonical(a), canonical(b)))
  const originAliasMap = new Map<string, OriginAlias>()
  for (const alias of originAliases) {
    validateEvidence(alias.evidence, files)
    let parsed: URL
    try { parsed = new URL(alias.from) } catch { fail('invalid origin alias') }
    if (parsed.origin !== alias.from || !['http:', 'https:'].includes(parsed.protocol)
      || alias.from === ORIGIN || alias.to !== ORIGIN || originAliasMap.has(alias.from)) fail('invalid or conflicting canonical-origin alias')
    originAliasMap.set(alias.from, alias)
  }
  const prior = previous ? cacheStates.get(previous) : undefined
  if (previous && !prior) fail('unrecognized cache; rebuild from sources instead of trusting serialized fragments')
  const policy = sha256(canonical([SCHEMA_VERSION, input.mapperVersion, sortedUnique(input.categories), sortedUnique(input.aliases), originAliases]))
  const cacheDocuments: CacheState['documents'] = new Map()
  const stats = { reused: 0, rebuilt: 0, removed: 0 }
  const nodes = new Map<string, KnowledgeNode>()
  const edges = new Map<string, KnowledgeEdge>()
  const documents = new Map<string, ContentSource>()
  const routes = new Map<string, string>()
  const pending: { source: string; href: string; reference: ReferenceSource }[] = []
  const diagnostics: Diagnostic[] = [...input.diagnostics]
  const addNode = (node: KnowledgeNode) => {
    const existing = nodes.get(node.id)
    if (!existing) { nodes.set(node.id, node); return }
    if (existing.kind !== node.kind || !['tag', 'citation'].includes(node.kind)) fail(`duplicate graph identity ${node.id}`)
    const labels = sortedUnique([...existing.labels, ...node.labels])
    nodes.set(node.id, { ...existing, labels,
      label: node.kind === 'citation' ? labels[0] : existing.label,
      evidence: sortedUnique([...existing.evidence, ...node.evidence]) })
  }
  const addEdge = (edge: KnowledgeEdge) => {
    const existing = edges.get(edge.id)
    edges.set(edge.id, existing ? { ...existing, evidence: sortedUnique([...existing.evidence, ...edge.evidence]) } : edge)
  }
  for (const category of [...input.categories].sort((a, b) => compare(canonical(a), canonical(b)))) {
    if (!['blog-topic', 'lab-category', 'study-category'].includes(category.namespace)) fail('unknown category namespace')
    validateEvidence(category.evidence, files)
    addNode({ id: categoryId(category.namespace, category.key), kind: 'category', namespace: category.namespace,
      key: category.key, label: category.label, labels: [category.label], ...(category.icon ? { icon: category.icon } : {}),
      navigation: nodeNavigation(null, 'filter'), evidence: [evidence(category.evidence)] })
  }
  for (const rawDoc of input.documents) {
    if (!['blog', 'lab', 'study'].includes(rawDoc.kind)) fail('unsupported content kind')
    const id = contentId(rawDoc.kind, rawDoc.key)
    if (documents.has(id)) fail(`duplicate content identity ${id}`)
    if (!['published', 'draft', 'unreleased'].includes(rawDoc.publication)) fail('unknown publication state')
    documents.set(id, rawDoc)
    const key = route(rawDoc.href)
    if (routes.has(key)) fail(`colliding canonical route ${key}`)
    routes.set(key, id)
    if (rawDoc.publication !== 'published') continue
    const doc = normalizedDocument(rawDoc)
    if (!doc.title) fail(`missing title ${id}`)
    for (const reference of doc.references) {
      if (!['links_to', 'embeds_lab', 'companion_article', 'cites'].includes(reference.predicate)) fail('unsupported relationship semantics')
    }
    const proofs = [doc.evidence, ...doc.tags.map(x => x.evidence), ...doc.concepts.map(x => x.evidence), ...doc.references.map(x => x.evidence), ...(doc.category ? [doc.category.evidence] : [])]
    proofs.forEach(proof => validateEvidence(proof, files))
    for (const dependency of doc.dependencies) if (files.get(dependency.path)?.sha256 !== dependency.sha256) fail(`stale dependency ${dependency.path}`)
    const fingerprint = sha256(canonical(doc))
    const cached = prior?.policy === policy ? prior.documents.get(id) : undefined
    const fragment = cached?.fingerprint === fingerprint ? cached.fragment : deepFreeze(fragmentFor(doc))
    if (cached?.fingerprint === fingerprint) stats.reused++; else stats.rebuilt++
    cacheDocuments.set(id, { fingerprint, fragment })
    fragment.nodes.forEach(addNode)
    fragment.edges.forEach(addEdge)
    fragment.references.forEach(reference => pending.push({ source: id, href: doc.href, reference }))
  }
  if (prior) stats.removed = [...prior.documents.keys()].filter(id => !cacheDocuments.has(id)).length
  const aliases = checkAliases(input.aliases, nodes, files)
  for (const alias of aliases) if (documents.has(alias.from)) fail('ID aliases cannot shadow an existing unpublished identity')
  const aliasMap = new Map(aliases.map(a => [a.from, a.to]))
  const references: ResolvedReference[] = []
  for (const { source, href: sourceHref, reference } of pending) {
    let href: string | null = null
    let navigationHref: string | null = null
    let targetId: string | null = null
    let status: ResolvedReference['status'] = 'missing'
    let anchor: ResolvedReference['anchor'] = 'not-applicable'
    let resolvedViaAlias: IdAlias | undefined
    let resolvedViaOriginAlias: OriginAlias | undefined
    if ('kind' in reference.target) {
      const requested = contentId(reference.target.kind, reference.target.key)
      resolvedViaAlias = aliases.find(alias => alias.from === requested)
      const resolved = aliasMap.get(requested) ?? requested
      const target = documents.get(resolved)
      if (target) {
        href = target.publication === 'published' ? target.href : null
        status = target.publication === 'published' ? 'resolved' : 'excluded'
        if (status === 'resolved') { targetId = resolved; navigationHref = href }
      } else if (reference.target.kind === 'study' && input.coverage.study === 'unavailable') status = 'outside-coverage'
    } else {
      href = reference.target.href
      let url: URL | undefined
      try { url = new URL(href, `${ORIGIN}${sourceHref}`) } catch { status = 'invalid' }
      if (url) {
        resolvedViaOriginAlias = originAliasMap.get(url.origin)
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || hasControlCharacters(href, true)) status = 'invalid'
        else if ((url.hostname === 'benebsworth.com' && !url.port) || resolvedViaOriginAlias) {
          anchor = url.hash ? 'unverified' : 'not-applicable'
          const requested = routes.get(url.pathname.replace(/\/$/, '') || '/')
          const target = requested ? documents.get(requested) : undefined
          if (target) {
            status = target.publication === 'published' ? 'resolved' : 'excluded'
            if (status === 'resolved') { targetId = requested ?? null; navigationHref = `${url.pathname}${url.search}${url.hash}` }
          }
          else if (/^\/blog\/[^/]+\/?$/.test(url.pathname)) status = 'missing'
          else if (/^\/lab\/[^/]+\/?$/.test(url.pathname) && input.coverage.lab === 'complete') status = 'missing'
          else if (/^\/study\/[^/]+\/?$/.test(url.pathname) && input.coverage.study === 'complete') status = 'missing'
          else status = 'outside-coverage'
        } else {
          status = 'external-unchecked'
          navigationHref = url.href
          targetId = citationId(url.href)
          const label = reference.label || href
          addNode({ id: targetId, kind: 'citation', key: url.href, label, labels: [label], subtype: 'external-reference',
            navigation: { ...nodeNavigation(url.href), availability: 'external-unchecked' }, evidence: [reference.evidence] })
        }
      }
    }
    const predicate = reference.predicate
    if (targetId && ((predicate === 'embeds_lab' && nodes.get(targetId)?.kind !== 'lab')
      || (predicate === 'companion_article' && nodes.get(targetId)?.kind !== 'blog'))) fail(`invalid ${predicate} target`)
    const record: ResolvedReference = { id: `reference:${sha256(canonical([source, reference]))}`,
      source, predicate, href, navigationHref, targetId, status, anchor, evidence: reference.evidence,
      ...(resolvedViaAlias ? { resolvedViaAlias } : {}),
      ...(resolvedViaOriginAlias ? { resolvedViaOriginAlias } : {}) }
    references.push(record)
    if (targetId) {
      const edge = relation(source, predicate, targetId, reference.evidence)
      if (resolvedViaAlias) edge.evidence = sortedUnique([...edge.evidence, resolvedViaAlias.evidence])
      if (resolvedViaOriginAlias) edge.evidence = sortedUnique([...edge.evidence, resolvedViaOriginAlias.evidence])
      addEdge(edge)
    }
    if (['missing', 'excluded', 'invalid'].includes(status)) diagnostics.push({ code: `reference-${status}`, severity: status === 'invalid' ? 'error' : 'warning', nodeId: source,
      message: status === 'excluded' ? 'An authored reference is excluded by the publication policy; no target metadata is exposed.' : `Authored reference is ${status}; it is not a navigable graph edge.`,
      locator: reference.evidence.locators[0] })
  }
  for (const edge of edges.values()) if (!nodes.has(edge.source) || !nodes.has(edge.target)) fail(`dangling graph edge ${edge.id}`)
  const usedFiles = new Set<string>()
  const recordProof = (proof: Evidence) => proof.locators.forEach(locator => usedFiles.add(locator.path))
  nodes.forEach(n => n.evidence.forEach(recordProof))
  edges.forEach(e => e.evidence.forEach(recordProof))
  references.forEach(r => recordProof(r.evidence))
  aliases.forEach(a => recordProof(a.evidence))
  originAliases.forEach(a => recordProof(a.evidence))
  // Include published dependency hashes so policy/route changes can mark a snapshot stale.
  for (const doc of input.documents) if (doc.publication === 'published') doc.dependencies.forEach(f => usedFiles.add(f.path))
  diagnostics.forEach(d => {
    if (d.nodeId && documents.get(d.nodeId)?.publication !== 'published') fail('diagnostics must not expose unpublished/unknown content')
    if (d.locator) {
      if (!usedFiles.has(d.locator.path)) fail('diagnostics must not expose unpublished source locators')
      validateEvidence({ basis: 'authored-metadata', confidence: 'explicit', locators: [d.locator] }, files)
      usedFiles.add(d.locator.path)
    }
  })
  const body: Omit<Snapshot, 'digest'> = {
    schemaVersion: SCHEMA_VERSION, repository: input.repository, sourceRevision: input.revision,
    mapperVersion: input.mapperVersion, coverage: input.coverage,
    inputManifestDigest: sha256(canonical(sortedUnique(input.files))),
    sources: [...usedFiles].sort(compare).map(path => files.get(path) ?? fail(`missing manifest file ${path}`)),
    nodes: [...nodes.values()].sort((a, b) => compare(a.id, b.id)),
    edges: [...edges.values()].sort((a, b) => compare(a.id, b.id)),
    references: sortedUnique(references).sort((a, b) => compare(a.id, b.id)), aliases, originAliases,
    diagnostics: sortedUnique(diagnostics),
  }
  const snapshot = deepFreeze({ ...body, digest: sha256(canonical(body)) })
  const cache = Object.freeze({ mapperVersion: input.mapperVersion, documentCount: cacheDocuments.size })
  cacheStates.set(cache, { policy, documents: cacheDocuments })
  return { snapshot, cache, stats }
}

export function snapshotFreshness(snapshot: Snapshot, currentRevision: string | null, currentFiles: SourceFile[] | null) {
  if (!currentRevision || !currentFiles) return { status: 'unavailable' as const, changed: [] as string[], missing: [] as string[] }
  const files = validateFiles(currentFiles)
  const missing = snapshot.sources.filter(f => !files.has(f.path)).map(f => f.path)
  const changed = snapshot.sources.filter(f => files.has(f.path) && files.get(f.path)?.sha256 !== f.sha256).map(f => f.path)
  const manifestMatches = sha256(canonical(sortedUnique(currentFiles))) === snapshot.inputManifestDigest
  return { status: currentRevision === snapshot.sourceRevision && manifestMatches && !missing.length && !changed.length ? 'current' as const : 'stale' as const, changed, missing }
}

export function sourceUrl(snapshot: Snapshot, locator: Locator): string {
  const hash = snapshot.sources.find(s => s.path === locator.path)?.sha256
  if (hash !== locator.sha256) fail('locator is not in this snapshot')
  const suffix = locator.lineStart ? `#L${locator.lineStart}${locator.lineEnd !== locator.lineStart ? `-L${locator.lineEnd}` : ''}` : ''
  return `https://github.com/${snapshot.repository}/blob/${snapshot.sourceRevision}/${locator.path.split('/').map(encodeURIComponent).join('/')}${suffix}`
}
