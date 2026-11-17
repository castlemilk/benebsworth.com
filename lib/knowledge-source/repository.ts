import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import ts from 'typescript'
import { getAllPosts, isPublished, type LoadedPost } from '../content'
import { TOPIC, topicFor } from '../topics'
import { CATEGORIES, LAB_EFFECTS, LAB_CONCEPT_GUIDE_SLUGS, isLabConceptGuide } from '../lab/registry'
import { SPATIAL_CATALOG } from '../lab/spatial/catalog'
import { extractMdxReferences } from './extract-mdx'
import { MAPPER_VERSION, type CategorySource, type ContentSource, type Diagnostic, type Evidence, type Locator, type ReferenceSource, type SourceFile, type SourceInput } from './schema'

/** Metadata extraction only: importing this adapter never runs a lab or its renderer. */
const POLICY_PATHS = [
  'lib/knowledge-source/schema.ts',
  'lib/knowledge-source/repository.ts',
  'lib/knowledge-source/extract-mdx.ts',
  'lib/knowledge-source/build.ts',
  'lib/knowledge-source/identity.ts',
  'lib/knowledge-source/navigation.ts',
  'lib/knowledge-source/revision.ts',
  'lib/content.ts',
  'lib/topics.ts',
  'lib/lab/registry.ts',
  'lib/lab/spatial/catalog.ts',
  'lib/gen/content.ts',
  'package.json',
  'package-lock.json',
  'components/mdx/mdx-components.tsx',
  'components/mdx/mdx-options.ts',
  'public/_redirects',
  'app/blog/[slug]/page.tsx',
  'app/lab/[slug]/page.tsx',
] as const

interface CapturedFile extends SourceFile { text: string }
type Captured = Map<string, CapturedFile>

const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const identity = ({ path: filePath, sha256 }: SourceFile): SourceFile => ({ path: filePath, sha256 })

// A watch process must not attach new source hashes to already cached policy
// functions. Module-relative paths bind these hashes to the code actually loaded,
// independently of any later cwd change. A source change requires a fresh import.
const importedPolicyHashes = new Map([
  ['lib/content.ts', new URL('../content.ts', import.meta.url)],
  ['lib/topics.ts', new URL('../topics.ts', import.meta.url)],
  ['lib/lab/registry.ts', new URL('../lab/registry.ts', import.meta.url)],
  ['lib/lab/spatial/catalog.ts', new URL('../lab/spatial/catalog.ts', import.meta.url)],
  ['lib/knowledge-source/extract-mdx.ts', new URL('./extract-mdx.ts', import.meta.url)],
  ['lib/knowledge-source/schema.ts', new URL('./schema.ts', import.meta.url)],
  ['lib/knowledge-source/repository.ts', new URL('./repository.ts', import.meta.url)],
  ['package.json', new URL('../../package.json', import.meta.url)],
  ['package-lock.json', new URL('../../package-lock.json', import.meta.url)],
].map(([filePath, url]) => [String(filePath), digest(fs.readFileSync(url))]))

function inputPaths(): string[] {
  const posts = fs.readdirSync(path.join(process.cwd(), 'content/blog'))
    .filter(slug => fs.existsSync(path.join(process.cwd(), 'content/blog', slug, 'index.mdx')))
    .map(slug => `content/blog/${slug}/index.mdx`)
  const explainers = LAB_EFFECTS.map(entry => `content/lab/${entry.slug}.mdx`)
    .filter(file => fs.existsSync(path.join(process.cwd(), file)))
  return [...new Set([...POLICY_PATHS, ...posts, ...explainers])].sort()
}

function capture(): Captured {
  const captured: Captured = new Map()
  for (const filePath of inputPaths()) {
    const bytes = fs.readFileSync(path.join(process.cwd(), filePath))
    captured.set(filePath, { path: filePath, sha256: digest(bytes), text: bytes.toString('utf8') })
  }
  return captured
}

function file(captured: Captured, filePath: string): CapturedFile {
  const found = captured.get(filePath)
  if (!found) throw new Error(`Incomplete knowledge source manifest: ${filePath}`)
  return found
}

function unchanged(before: Captured, after: Captured): void {
  const a = [...before.values()].map(identity)
  const b = [...after.values()].map(identity)
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error('Knowledge source manifest changed during extraction; retain the last complete snapshot')
  }
}

function parse(source: CapturedFile): ts.SourceFile {
  return ts.createSourceFile(source.path, source.text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

function unwrap(node: ts.Expression): ts.Expression {
  return ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)
    ? unwrap(node.expression) : node
}

function variable(source: ts.SourceFile, name: string): ts.Expression {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer) {
        return unwrap(declaration.initializer)
      }
    }
  }
  throw new Error(`Unsupported source registry: ${source.fileName} ${name}`)
}

function property(object: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment {
  const result = object.properties.find(item => ts.isPropertyAssignment(item)
    && (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) && item.name.text === name)
  if (!result || !ts.isPropertyAssignment(result)) throw new Error(`Missing literal registry field: ${name}`)
  return result
}

function literal(node: ts.Expression): string {
  if (!ts.isStringLiteral(node) && !ts.isNoSubstitutionTemplateLiteral(node)) throw new Error('Registry metadata must remain a literal')
  return node.text
}

function objectVariable(source: ts.SourceFile, name: string): ts.ObjectLiteralExpression {
  const result = variable(source, name)
  if (!ts.isObjectLiteralExpression(result)) throw new Error(`Expected object registry: ${name}`)
  return result
}

function objects(source: ts.SourceFile, name: string): ts.ObjectLiteralExpression[] {
  const result = variable(source, name)
  if (!ts.isArrayLiteralExpression(result)) throw new Error(`Expected array registry: ${name}`)
  return result.elements.filter(ts.isObjectLiteralExpression)
}

/** Decode only literal data and explicitly supplied constant-object fields. */
function literalData(expression: ts.Expression, bindings: Record<string, unknown> = {}): unknown {
  const node = unwrap(expression)
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(item => literalData(item as ts.Expression, bindings))
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(item => {
    if (!ts.isPropertyAssignment(item) || !(ts.isIdentifier(item.name) || ts.isStringLiteral(item.name))) throw new Error('Unsupported computed registry data')
    return [item.name.text, literalData(item.initializer, bindings)]
  }))
  if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
    const binding = bindings[node.expression.text]
    if (binding && typeof binding === 'object' && Object.hasOwn(binding, node.name.text)) return (binding as Record<string, unknown>)[node.name.text]
  }
  throw new Error('Registry data must remain statically decodable literals')
}

function assertImportedRegistries(topics: ts.SourceFile, labs: ts.SourceFile, spatial: ts.SourceFile): void {
  const accents = literalData(variable(topics, 'ACCENT'))
  const expectedTopics = literalData(variable(topics, 'TOPIC'), { ACCENT: accents })
  if (!isDeepStrictEqual(TOPIC, expectedTopics)) throw new Error('Imported topic metadata differs from captured source')
  if (!isDeepStrictEqual(CATEGORIES, literalData(variable(labs, 'CATEGORIES')))) throw new Error('Imported Lab categories differ from captured source')
  const expectedSpatial = literalData(variable(spatial, 'SPATIAL_CATALOG'))
  if (!isDeepStrictEqual(SPATIAL_CATALOG, expectedSpatial)) throw new Error('Imported spatial metadata differs from captured source')
  const spatialProjection = (expectedSpatial as Array<Record<string, string>>).map(entry => ({
    slug: entry.slug, title: entry.title, blurb: entry.blurb, category: entry.category,
    tags: ['3d', entry.category, 'interactive'], homeEmbedSafe: false,
  }))
  const effects = variable(labs, 'LAB_EFFECTS')
  if (!ts.isArrayLiteralExpression(effects)) throw new Error('Unsupported Lab registry')
  const expectedEffects = effects.elements.flatMap(entry => {
    if (ts.isSpreadElement(entry) && ts.isIdentifier(entry.expression) && entry.expression.text === 'SPATIAL_ENTRIES') return spatialProjection
    if (ts.isObjectLiteralExpression(entry)) return [literalData(entry)]
    throw new Error('Unsupported Lab registry member')
  })
  if (!isDeepStrictEqual(LAB_EFFECTS, expectedEffects)) throw new Error('Imported Lab metadata differs from captured source')
  const guides = literalData(variable(labs, 'LAB_CONCEPT_GUIDE_SLUG_LIST')) as string[]
  if (!isDeepStrictEqual([...LAB_CONCEPT_GUIDE_SLUGS].sort(), [...guides].sort())
    || LAB_EFFECTS.some(lab => isLabConceptGuide(lab.slug) !== guides.includes(lab.slug))) {
    throw new Error('Imported Lab guide membership differs from captured source')
  }
}

function located(source: CapturedFile, ast: ts.SourceFile, node: ts.Node, selector: string): Locator {
  const start = node.getStart(ast)
  return {
    ...identity(source), selector, rawValue: node.getText(ast),
    lineStart: ast.getLineAndCharacterOfPosition(start).line + 1,
    lineEnd: ast.getLineAndCharacterOfPosition(Math.max(start, node.end - 1)).line + 1,
  }
}

/** Read locations only from the frontmatter already accepted by the site's loader. */
function frontmatter(source: CapturedFile, field: string): Locator | undefined {
  const lines = source.text.split('\n')
  if (lines[0].trim() !== '---') throw new Error(`Missing frontmatter: ${source.path}`)
  for (let i = 1; i < lines.length && lines[i].trim() !== '---'; i++) {
    if (!lines[i].startsWith(`${field}:`)) continue
    let end = i
    while (end + 1 < lines.length && /^\s+\S/.test(lines[end + 1])) end++
    return {
      ...identity(source), selector: `frontmatter.${field}`,
      rawValue: lines.slice(i, end + 1).join('\n'), lineStart: i + 1, lineEnd: end + 1,
    }
  }
  return undefined
}

function requiredFrontmatter(source: CapturedFile, name: string): Locator {
  const locator = frontmatter(source, name)
  if (!locator) throw new Error(`Missing source locator: ${source.path} ${name}`)
  return locator
}

const evidence = (basis: Evidence['basis'], confidence: Evidence['confidence'], locators: Locator[], rule?: string): Evidence => ({
  basis, confidence, locators, ...(rule ? { rule } : {}),
})

/** Only the observed whole-origin, path-preserving www rule is supported here. */
function originAliases(source: CapturedFile, diagnostics: Diagnostic[]): NonNullable<SourceInput['originAliases']> {
  const rules = source.text.split(/\r?\n/).flatMap((rawValue, index) => {
    const text = rawValue.trim()
    return !text || text.startsWith('#') ? [] : [{ text, locator: {
      ...identity(source), selector: `redirects.line[${index + 1}]`, rawValue, lineStart: index + 1, lineEnd: index + 1,
    } }]
  })
  if (rules.length === 0) return []
  const supported = /^https:\/\/www\.benebsworth\.com\/\*\s+https:\/\/benebsworth\.com\/:splat\s+301$/
  // Unknown/path-specific precedence could override a catch-all. Do not apply a
  // partial redirect interpretation when another rule appears in this file.
  if (rules.length !== 1 || !supported.test(rules[0].text)) {
    diagnostics.push(...rules.map(rule => ({
      code: 'unsupported_redirect_coverage', severity: 'warning' as const,
      message: 'Redirect configuration is outside the sole supported origin-alias rule; no redirects were inferred.',
      locator: rule.locator,
    })))
    return []
  }
  return [{
    from: 'https://www.benebsworth.com', to: 'https://benebsworth.com',
    evidence: evidence('registry', 'explicit', [rules[0].locator], 'static-host:origin-preserving-301'),
  }]
}

function topicEvidence(post: LoadedPost, source: CapturedFile, ast: ts.SourceFile): { key: string; evidence: Evidence } {
  const marker = topicFor(post)
  const key = Object.entries(TOPIC).find(([, topic]) => topic === marker)?.[0]
  if (!key) throw new Error(`Unregistered blog topic: ${post.slug}`)
  const overrides = objectVariable(ast, 'BY_SLUG')
  const explicit = overrides.properties.find(item => ts.isPropertyAssignment(item)
    && ts.isStringLiteral(item.name) && item.name.text === post.slug)
  if (explicit && ts.isPropertyAssignment(explicit)) {
    if (explicit.initializer.getText(ast) !== `TOPIC.${key}`) throw new Error('Imported topic registry differs from captured source')
    return { key, evidence: evidence('editorial-rule', 'deterministic', [located(source, ast, explicit, `BY_SLUG[${JSON.stringify(post.slug)}]`)], 'topicFor:slug-override') }
  }
  const rules = objects(ast, 'TAG_RULES')
  const tags = post.tags.map(tag => tag.toLowerCase().trim())
  for (const [index, rule] of rules.entries()) {
    const match = property(rule, 'match')
    if (!ts.isArrayLiteralExpression(match.initializer)) throw new Error('Unsupported TAG_RULES match expression')
    const values = match.initializer.elements.map(value => literal(value as ts.Expression))
    if (!values.some(value => tags.includes(value))) continue
    if (property(rule, 'topic').initializer.getText(ast) !== `TOPIC.${key}`) throw new Error('Imported topic rules differ from captured source')
    return { key, evidence: evidence('editorial-rule', 'deterministic', [located(source, ast, rule, `TAG_RULES[${index}]`)], 'topicFor:first-matching-tag-rule') }
  }
  if (key !== 'technology') throw new Error('Unsupported topicFor default')
  let fallback: ts.ReturnStatement | undefined
  const visit = (node: ts.Node): void => {
    if (ts.isReturnStatement(node) && node.expression?.getText(ast) === 'TOPIC.technology') fallback = node
    ts.forEachChild(node, visit)
  }
  visit(ast)
  if (!fallback) throw new Error('Missing default topic rule')
  return { key, evidence: evidence('editorial-rule', 'deterministic', [located(source, ast, fallback, 'topicFor.default')], 'topicFor:default') }
}

async function references(source: CapturedFile, body: string, offset: number, diagnostics: Diagnostic[]): Promise<ReferenceSource[]> {
  const extracted = await extractMdxReferences(body, offset)
  if (extracted.diagnostics.some(item => item.code === 'mdx_parse_error' || item.code === 'invalid_line_offset')) {
    throw new Error(`Knowledge reference extraction failed for ${source.path}; retain the last complete snapshot`)
  }
  for (const diagnostic of extracted.diagnostics) {
    diagnostics.push({
      code: diagnostic.code, severity: 'warning', message: diagnostic.message,
      ...(diagnostic.locator ? { locator: { ...identity(source), ...diagnostic.locator } } : {}),
    })
  }
  return extracted.references.map(reference => ({
    predicate: reference.predicate,
    target: 'labSlug' in reference.target ? { kind: 'lab', key: reference.target.labSlug } : reference.target,
    label: reference.label,
    evidence: evidence(reference.predicate === 'embeds_lab' ? 'literal-embed' : 'authored-link', 'explicit', [{ ...identity(source), ...reference.locator }]),
  }))
}

/**
 * A complete source-only manifest. Existing getAllPosts reads full files; this
 * adapter never extracts excluded bodies or exports their title/tags/references.
 * No source record is a claim that a URL is built, reachable, or deployed.
 */
export async function loadRepositoryInput(revision: string): Promise<SourceInput> {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Expected an exact 40-character repository revision')
  const before = capture()
  for (const [filePath, expectedHash] of importedPolicyHashes) {
    if (file(before, filePath).sha256 !== expectedHash) throw new Error(`Loaded mapping policy is stale: ${filePath}; reload the source adapter`)
  }
  const sourceTopics = file(before, 'lib/topics.ts'), topicsAst = parse(sourceTopics)
  const sourceLabs = file(before, 'lib/lab/registry.ts'), labsAst = parse(sourceLabs)
  const sourceSpatial = file(before, 'lib/lab/spatial/catalog.ts'), spatialAst = parse(sourceSpatial)
  assertImportedRegistries(topicsAst, labsAst, spatialAst)
  const policyFiles = POLICY_PATHS.map(filePath => identity(file(before, filePath)))
  const diagnostics: Diagnostic[] = []
  const categories: CategorySource[] = []
  const documents: ContentSource[] = []

  for (const [key, topic] of Object.entries(TOPIC)) {
    const entry = property(objectVariable(topicsAst, 'TOPIC'), key)
    categories.push({
      namespace: 'blog-topic', key, label: topic.label, icon: topic.icon,
      evidence: evidence('registry', 'explicit', [located(sourceTopics, topicsAst, entry, `TOPIC.${key}`)]),
    })
  }
  const categoryEntries = objects(labsAst, 'CATEGORIES')
  for (const category of CATEGORIES) {
    const entry = categoryEntries.find(item => literal(property(item, 'key').initializer) === category.key)
    if (!entry || literal(property(entry, 'label').initializer) !== category.label) throw new Error('Imported Lab categories differ from captured source')
    categories.push({
      namespace: 'lab-category', key: category.key, label: category.label,
      evidence: evidence('registry', 'explicit', [located(sourceLabs, labsAst, entry, `CATEGORIES[${JSON.stringify(category.key)}]`)]),
    })
  }

  const posts = getAllPosts()
  const expectedPostPaths = [...before.keys()].filter(filePath => /^content\/blog\/[^/]+\/index\.mdx$/.test(filePath))
  if (posts.length !== expectedPostPaths.length || new Set(posts.map(post => post.slug)).size !== posts.length) {
    throw new Error('Content loader did not return the complete blog manifest')
  }
  for (const post of posts) {
    const source = file(before, `content/blog/${post.slug}/index.mdx`)
    const pubLocators = ['draft', 'release'].flatMap(name => {
      const locator = frontmatter(source, name)
      return locator ? [locator] : []
    })
    const publication = post.draft ? 'draft' : post.release === false ? 'unreleased' : 'published'
    if (!isPublished(post)) {
      documents.push({
        kind: 'blog', key: post.slug, title: '', href: `/blog/${post.slug}/`, subtype: 'article', publication,
        evidence: evidence('authored-metadata', 'explicit', pubLocators), dependencies: [identity(source), ...policyFiles],
        tags: [], concepts: [], references: [],
      })
      continue
    }
    if (!source.text.endsWith(post.body)) throw new Error(`Post body changed during source capture: ${post.slug}`)
    const offset = source.text.slice(0, source.text.length - post.body.length).split('\n').length - 1
    const tagLocator = frontmatter(source, 'tags') ?? frontmatter(source, 'labels')
    const category = topicEvidence(post, sourceTopics, topicsAst)
    documents.push({
      kind: 'blog', key: post.slug, title: post.title, href: `/blog/${post.slug}/`, subtype: 'article', publication,
      evidence: evidence('authored-metadata', 'explicit', [requiredFrontmatter(source, 'title'), ...pubLocators]),
      dependencies: [identity(source), ...policyFiles],
      tags: post.tags.map(value => {
        if (!tagLocator) throw new Error(`Tags have no authored source: ${post.slug}`)
        return { value, evidence: evidence('authored-metadata', 'explicit', [{ ...tagLocator, rawValue: value }]) }
      }),
      category: { namespace: 'blog-topic', ...category }, concepts: [],
      references: await references(source, post.body, offset, diagnostics),
    })
  }

  const labEntries = objects(labsAst, 'LAB_EFFECTS'), spatialEntries = objects(spatialAst, 'SPATIAL_CATALOG')
  if (labEntries.length + spatialEntries.length !== LAB_EFFECTS.length) throw new Error('Imported Lab manifest differs from captured source')
  for (const lab of LAB_EFFECTS) {
    const spatial = SPATIAL_CATALOG.find(entry => entry.slug === lab.slug)
    const ast = spatial ? spatialAst : labsAst, source = spatial ? sourceSpatial : sourceLabs
    const entry = (spatial ? spatialEntries : labEntries).find(item => literal(property(item, 'slug').initializer) === lab.slug)
    if (!entry || literal(property(entry, 'title').initializer) !== lab.title || literal(property(entry, 'category').initializer) !== lab.category) {
      throw new Error(`Imported Lab metadata differs from captured source: ${lab.slug}`)
    }
    const selector = `${spatial ? 'SPATIAL_CATALOG' : 'LAB_EFFECTS'}[${JSON.stringify(lab.slug)}]`
    const entryLocator = located(source, ast, entry, selector)
    const related: ReferenceSource[] = []
    if (spatial) related.push({
      predicate: 'companion_article', target: { kind: 'blog', key: spatial.blogSlug }, label: spatial.blogSlug,
      evidence: evidence('registry', 'explicit', [located(source, ast, property(entry, 'blogSlug'), `${selector}.blogSlug`)]),
    })
    const explainer = before.get(`content/lab/${lab.slug}.mdx`)
    if (explainer) related.push(...await references(explainer, explainer.text, 0, diagnostics))
    const tagLocator = spatial
      ? located(sourceSpatial, spatialAst, variable(spatialAst, 'SPATIAL_ENTRIES'), 'SPATIAL_ENTRIES.tags')
      : located(sourceLabs, labsAst, property(entry, 'tags'), `${selector}.tags`)
    documents.push({
      kind: 'lab', key: lab.slug, title: lab.title, href: `/lab/${lab.slug}/`,
      subtype: isLabConceptGuide(lab.slug) ? 'guide' : 'simulation', publication: 'published',
      evidence: evidence('registry', 'explicit', [entryLocator]),
      dependencies: [...policyFiles, ...(explainer ? [identity(explainer)] : [])],
      tags: lab.tags.map(value => ({ value, evidence: evidence('registry', spatial ? 'deterministic' : 'explicit', spatial ? [entryLocator, tagLocator] : [tagLocator], spatial ? 'SPATIAL_ENTRIES:3d-category-interactive' : undefined) })),
      category: { namespace: 'lab-category', key: lab.category, evidence: evidence('registry', 'explicit', [located(source, ast, property(entry, 'category'), `${selector}.category`)]) },
      concepts: [], references: related,
    })
  }

  unchanged(before, capture())
  return {
    repository: 'castlemilk/benebsworth.com', revision,
    mapperVersion: `${MAPPER_VERSION}:${digest(JSON.stringify(policyFiles))}`,
    complete: true, files: [...before.values()].map(identity), categories,
    documents: documents.sort((a, b) => `${a.kind}:${a.key}` < `${b.kind}:${b.key}` ? -1 : `${a.kind}:${a.key}` > `${b.kind}:${b.key}` ? 1 : 0),
    aliases: [], originAliases: originAliases(file(before, 'public/_redirects'), diagnostics), diagnostics,
    coverage: { blog: 'complete', lab: 'registry-only', study: 'unavailable', concepts: 'curated-source-scoped', citations: 'supported-mdx-syntax' },
  }
}
