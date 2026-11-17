import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadFixture, defaultRootId, SOURCE_REVISION } from './fixtures.mjs'

const repositoryRoot = new URL('../../', import.meta.url)
const read = path => readFileSync(new URL(path, repositoryRoot), 'utf8')
const source = loadFixture()
const nodeById = id => source.nodes.find(node => node.id === id)
const articlePaths = {
  'blog:chaos-in-one-equation': 'content/blog/chaos-in-one-equation/index.mdx',
  'blog:lorenz-and-the-limits-of-prediction': 'content/blog/lorenz-and-the-limits-of-prediction/index.mdx',
}

function publishedFrontmatter(path) {
  const text = read(path)
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1]
  assert.ok(frontmatter, `${path} has authored frontmatter`)
  const title = frontmatter.match(/^title:\s*(.+)$/mu)?.[1].replace(/^"|"$/gu, '')
  const tags = frontmatter.match(/^labels:\s*(.+)$/mu)?.[1].split(',').map(tag => tag.trim())
  return { text, frontmatter, title, tags }
}

function assertGraphIntegrity(fixture) {
  const ids = new Set(fixture.nodes.map(node => node.id))
  const edgeIds = new Set(fixture.edges.map(edge => edge.id))
  assert.equal(ids.size, fixture.nodes.length, `${fixture.id}: node identifiers are unique`)
  assert.equal(edgeIds.size, fixture.edges.length, `${fixture.id}: edge identifiers are unique`)
  const taxonomyIds = new Set(fixture.taxonomies.map(taxonomy => taxonomy.id))
  for (const node of fixture.nodes) {
    assert.ok(['blog', 'lab', 'study', 'tag', 'concept', 'category'].includes(node.kind))
    assert.ok(['recorded', 'proposed', 'mock'].includes(node.mappingStatus))
    assert.equal(typeof node.label, 'string')
    assert.equal(typeof node.summary, 'string')
    assert.ok(Array.isArray(node.sourceRefs))
    assert.ok(Array.isArray(node.taxonomyIds))
    for (const taxonomyId of node.taxonomyIds) assert.ok(taxonomyIds.has(taxonomyId))
  }
  for (const edge of fixture.edges) {
    assert.ok(ids.has(edge.source), `${fixture.id}: ${edge.id} source exists`)
    assert.ok(ids.has(edge.target), `${fixture.id}: ${edge.id} target exists`)
    assert.notEqual(edge.source, edge.target)
    assert.ok(edge.label && edge.reverseLabel)
    assert.ok(['recorded', 'proposed', 'mock'].includes(edge.mappingStatus))
  }
}

test('source fixture uses ten distinct, source-recorded or explicitly proposed nodes', () => {
  assert.equal(source.nodes.length, 10)
  assert.equal(source.totalNodes, 10)
  assert.equal(source.status, 'ready')
  assert.equal(source.defaultRootId, defaultRootId)
  assert.equal(source.revision, SOURCE_REVISION)
  assert.equal(SOURCE_REVISION, '1121edc4ae6ac8de415b5395d8fadc11450fc55f')
  assert.equal(nodeById(defaultRootId).mappingStatus, 'proposed')
  assert.equal(source.nodes.filter(node => node.mappingStatus === 'proposed').length, 1)
  assertGraphIntegrity(source)
})

test('every blog topic and Lab category exactly matches its registry label and namespace', () => {
  const topicBlock = read('lib/topics.ts').split('const TOPIC = {')[1].split('} satisfies')[0]
  const topicEntries = [...topicBlock.matchAll(/^\s*(\w+):\s*\{[^\n]*label:\s*'([^']+)'/gmu)].map(match => [match[1], match[2]])
  const categoryBlock = read('lib/lab/registry.ts').split('export const CATEGORIES:')[1].split('// Lightweight metadata')[0]
  const categoryEntries = [...categoryBlock.matchAll(/key:\s*'([^']+)',\s*label:\s*'([^']+)'/gu)].map(match => [match[1], match[2]])
  const blog = source.taxonomies.filter(taxonomy => taxonomy.namespace === 'Blog topics')
  const lab = source.taxonomies.filter(taxonomy => taxonomy.namespace === 'Lab categories')
  assert.equal(blog.length, 20)
  assert.equal(lab.length, 9)
  assert.deepEqual(blog.map(({ key, label }) => [key, label]), topicEntries)
  assert.deepEqual(lab.map(({ key, label }) => [key, label]), categoryEntries)
  for (const taxonomy of blog) assert.equal(taxonomy.id, `blog-topic:${taxonomy.key}`)
  for (const taxonomy of lab) assert.equal(taxonomy.id, `lab-category:${taxonomy.key}`)
  assert.ok(blog.some(taxonomy => taxonomy.id === 'blog-topic:ee'))
  assert.ok(lab.some(taxonomy => taxonomy.id === 'lab-category:engineering'))
  assert.notEqual(nodeById('category:blog-topic:maths').id, nodeById('category:lab-category:maths').id)
})

test('article titles, tags, publication flags and destination slugs match authored content', () => {
  for (const [id, path] of Object.entries(articlePaths)) {
    const actual = publishedFrontmatter(path)
    const node = nodeById(id)
    assert.equal(node.label, actual.title)
    assert.deepEqual(node.tags, actual.tags)
    assert.match(actual.frontmatter, /^release:\s*true$/mu)
    assert.equal(node.href, `https://benebsworth.com/blog/${id.slice('blog:'.length)}/`)
  }
  assert.ok(nodeById('blog:chaos-in-one-equation').tags.includes('dynamical-systems'))
  assert.ok(nodeById('blog:lorenz-and-the-limits-of-prediction').tags.includes('dynamical systems'))
})

test('Lab titles, raw tags and category membership match their exact registry records', () => {
  const registry = read('lib/lab/registry.ts')
  for (const node of source.nodes.filter(node => node.kind === 'lab')) {
    const slug = node.id.slice('lab:'.length)
    const line = registry.split('\n').find(line => line.includes(`{ slug: '${slug}',`))
    assert.ok(line, `${slug} exists in the original registry`)
    const title = line.match(/title:\s*'([^']+)'/u)?.[1]
    const tags = [...line.match(/tags:\s*\[([^\]]+)\]/u)[1].matchAll(/'([^']+)'/gu)].map(match => match[1])
    const category = line.match(/category:\s*'([^']+)'/u)?.[1]
    assert.equal(node.label, title)
    assert.deepEqual(node.tags, tags)
    assert.deepEqual(node.taxonomyIds, [`lab-category:${category}`])
    assert.equal(node.href, `https://benebsworth.com/lab/${slug}/`)
  }
  assert.ok(nodeById('lab:logistic-bifurcation').tags.includes('dynamical systems'))
  assert.ok(!nodeById('lab:logistic-bifurcation').tags.includes('dynamical-systems'))
})

test('every recorded article-to-lab relationship is an explicit authored MDX embed', () => {
  const embeds = source.edges.filter(edge => edge.kind === 'embed')
  assert.equal(embeds.length, 4)
  for (const edge of embeds) {
    const article = read(articlePaths[edge.source])
    const slug = edge.target.slice('lab:'.length)
    assert.match(article, new RegExp(`<Lab(?:Side|Canvas)\\s+effect="${slug}"`, 'u'))
    assert.equal(edge.mappingStatus, 'recorded')
    assert.equal(edge.label, 'Embeds lab')
    assert.equal(edge.reverseLabel, 'Embedded by article')
  }
})

test('tag edges record exact tags and never equate a tag with the concept proposal', () => {
  const edges = source.edges.filter(edge => edge.kind === 'tag')
  assert.equal(edges.length, 5)
  for (const edge of edges) {
    assert.equal(edge.target, 'tag:chaos')
    assert.ok(nodeById(edge.source).tags.includes('chaos'))
    assert.equal(edge.mappingStatus, 'recorded')
  }
  assert.ok(!source.edges.some(edge => [edge.source, edge.target].includes(defaultRootId) && [edge.source, edge.target].includes('tag:chaos')))
})

test('category edges retain the namespace and match explicit source membership', () => {
  const topics = read('lib/topics.ts')
  const edges = source.edges.filter(edge => edge.kind === 'category')
  assert.equal(edges.length, 5)
  for (const edge of edges) {
    const node = nodeById(edge.source)
    assert.equal(edge.target, `category:${node.taxonomyIds[0]}`)
    if (node.kind === 'blog') assert.ok(topics.includes(`'${node.id.slice('blog:'.length)}': TOPIC.maths`))
  }
  assert.ok(!source.edges.some(edge => edge.source.startsWith('category:') && edge.target.startsWith('category:')))
})

test('proposed concept has a real authored equation anchor without claiming approved normalization', () => {
  const concept = nodeById(defaultRootId)
  assert.match(read(articlePaths['blog:chaos-in-one-equation']), /<Equation id="eqn:logistic-map"/u)
  assert.match(read('components/mdx/equation.tsx'), /<figure id=\{id\}/u)
  assert.equal(concept.href, 'https://benebsworth.com/blog/chaos-in-one-equation/#eqn:logistic-map')
  assert.equal(concept.mappingStatus, 'proposed')
  const relations = source.edges.filter(edge => edge.source === defaultRootId || edge.target === defaultRootId)
  assert.equal(relations.length, 2)
  assert.ok(relations.every(edge => edge.mappingStatus === 'proposed'))
  assert.ok(read('content/lab/logistic-bifurcation.mdx').includes('x_{n+1} = r\\,x_n(1 - x_n)'))
  assert.deepEqual(relations.map(edge => edge.target), ['blog:chaos-in-one-equation', 'lab:logistic-bifurcation'])
})

test('study inspector uses the real editorial study and has no invented scientific edges', () => {
  const node = nodeById('study:editorial-system')
  const study = read('app/lab/editorial-system/page.tsx')
  assert.ok(study.includes(`title:'${node.label}'`))
  assert.ok(study.includes('Not a published article or scientific result.'))
  assert.equal(node.href, 'https://benebsworth.com/lab/editorial-system/')
  assert.equal(node.mappingStatus, 'recorded')
  assert.ok(!source.edges.some(edge => edge.source === node.id || edge.target === node.id))
})

test('source evidence is pinned to the inspected revision and resolves to existing repository files', () => {
  const prefix = `https://github.com/castlemilk/benebsworth.com/blob/${SOURCE_REVISION}/`
  for (const record of [...source.nodes, ...source.edges, ...source.taxonomies]) {
    assert.ok(record.sourceRefs.length > 0)
    for (const reference of record.sourceRefs) {
      assert.ok(reference.label && reference.claim)
      assert.ok(reference.href.startsWith(prefix))
      const path = reference.href.slice(prefix.length)
      assert.doesNotThrow(() => read(path))
    }
  }
  for (const node of source.nodes.filter(node => node.href)) {
    assert.equal(new URL(node.href).origin, 'https://benebsworth.com')
  }
  assert.match(source.disclosure, /not been verified live/u)
})

test('empty, error and partial responses remain distinguishable; unknown totals are null', () => {
  const empty = loadFixture('empty')
  const error = loadFixture('error')
  const partial = loadFixture('partial')
  assert.equal(empty.status, 'empty')
  assert.equal(empty.totalNodes, 0)
  assert.equal(empty.nodes.length, 0)
  assert.equal(error.status, 'error')
  assert.equal(error.totalNodes, null)
  assert.ok(error.reason)
  assert.equal(partial.status, 'partial')
  assert.equal(partial.totalNodes, null)
  assert.equal(partial.nodes.length, 7)
  assert.ok(partial.nodes.some(node => node.id === partial.defaultRootId))
  assertGraphIntegrity(partial)
})

test('missing-data scenario deliberately omits URL, source references and optional tags', () => {
  const fixture = loadFixture('missing')
  const missing = fixture.nodes.find(node => node.id === 'lab:logistic-bifurcation')
  assert.equal(fixture.status, 'partial')
  assert.ok(!Object.hasOwn(missing, 'href'))
  assert.ok(!Object.hasOwn(missing, 'tags'))
  assert.deepEqual(missing.sourceRefs, [])
  assert.equal(missing.mappingStatus, 'mock')
  assert.match(fixture.disclosure, /synthetic omission/iu)
  assertGraphIntegrity(fixture)
})

test('long labels are explicitly synthetic and include an unbroken wrapping challenge', () => {
  const fixture = loadFixture('long-label')
  const node = fixture.nodes.find(node => node.id === 'mock:long-label')
  assert.ok(node.label.length > 250)
  assert.ok(node.label.split(/\s+/u).some(word => word.length > 100))
  assert.equal(node.mappingStatus, 'mock')
  assert.equal(fixture.totalNodes, 11)
  assert.deepEqual(node.sourceRefs, [])
  assertGraphIntegrity(fixture)
})

test('large fixture contains exactly 1,000 deterministic synthetic records and 999 root neighbours', () => {
  const fixture = loadFixture('large')
  assert.equal(fixture.nodes.length, 1000)
  assert.equal(fixture.totalNodes, 1000)
  assert.equal(fixture.edges.length, 999)
  assert.equal(fixture.defaultRootId, 'mock:hub')
  assert.equal(new Set(fixture.edges.map(edge => edge.target)).size, 999)
  assert.ok(fixture.edges.every(edge => edge.source === fixture.defaultRootId))
  assert.ok(fixture.nodes.every(node => node.mappingStatus === 'mock' && node.sourceRefs.length === 0 && !node.href))
  assert.ok(fixture.edges.every(edge => edge.mappingStatus === 'mock' && edge.sourceRefs.length === 0))
  assert.deepEqual(fixture, loadFixture('large'))
  assertGraphIntegrity(fixture)
})

test('scenarios return independent records and reject unknown scenario names', () => {
  const first = loadFixture('source')
  first.nodes[0].label = 'Changed only in this caller'
  first.edges[0].sourceRefs[0].claim = 'Changed only in this caller'
  first.taxonomies[0].label = 'Changed only in this caller'
  const fresh = loadFixture('source')
  assert.equal(fresh.nodes[0].label, 'Logistic map')
  assert.notEqual(fresh.edges[0].sourceRefs[0].claim, first.edges[0].sourceRefs[0].claim)
  assert.equal(fresh.taxonomies[0].label, 'Kubernetes')
  assert.ok(loadFixture('source').nodes.find(node => node.id === 'lab:logistic-bifurcation').href)
  assert.throws(() => loadFixture('invented-scenario'), RangeError)
})

test('fixture module remains independent of the shared knowledge graph and framework', () => {
  const fixtureModule = readFileSync(fileURLToPath(new URL('./fixtures.mjs', import.meta.url)), 'utf8')
  assert.doesNotMatch(fixtureModule, /^\s*import\s/gmu)
  assert.doesNotMatch(fixtureModule, /(?:require\s*\(|import\s*\()\s*['"][^'"]*(?:knowledge\/graph|react|next)/u)
})
