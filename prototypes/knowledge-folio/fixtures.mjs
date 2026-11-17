/**
 * View-only fixtures for the isolated knowledge folio prototype.
 *
 * These records do not import or replace the shared knowledge graph model.
 * "recorded" means recorded in the pinned repository source, not that a
 * scientific claim or the destination's live deployment has been verified.
 */
export const SOURCE_REVISION = '1121edc4ae6ac8de415b5395d8fadc11450fc55f'
export const defaultRootId = 'concept:logistic-map:proposal'

const repositoryBase = `https://github.com/castlemilk/benebsworth.com/blob/${SOURCE_REVISION}/`
const siteBase = 'https://benebsworth.com'
const paths = {
  topics: 'lib/topics.ts',
  labs: 'lib/lab/registry.ts',
  chaos: 'content/blog/chaos-in-one-equation/index.mdx',
  lorenz: 'content/blog/lorenz-and-the-limits-of-prediction/index.mdx',
  logistic: 'content/lab/logistic-bifurcation.mdx',
  editorial: 'app/lab/editorial-system/page.tsx',
}

function sourceRef(path, label, claim) {
  return { label, href: `${repositoryBase}${path}`, claim }
}

// Preserve every original registry key and label. These namespaces remain
// separate even when their display labels match. No crosswalk is inferred.
const blogTopics = [
  ['kubernetes', 'Kubernetes'],
  ['istio', 'Service Mesh'],
  ['tekton', 'CI/CD · Tekton'],
  ['kustomize', 'Config · Kustomize'],
  ['minikube', 'Local Dev'],
  ['gcp', 'Google Cloud'],
  ['react', 'React'],
  ['algorithms', 'Algorithms'],
  ['general', 'Field Notes'],
  ['technology', 'Engineering'],
  ['ai', 'AI'],
  ['maths', 'Mathematics'],
  ['physics', 'Physics'],
  ['software', 'Software'],
  ['ee', 'Electrical Eng'],
  ['cosmology', 'Cosmology'],
  ['chemistry', 'Chemistry'],
  ['biology', 'Life Sciences'],
  ['earth', 'Earth & Space'],
  ['hiking', 'Hiking'],
]

const labCategories = [
  ['art', 'Generative Art'],
  ['maths', 'Mathematics'],
  ['physics', 'Physics'],
  ['chemistry', 'Chemistry'],
  ['biology', 'Life Sciences'],
  ['earth', 'Earth & Space'],
  ['engineering', 'Electrical Engineering'],
  ['ai', 'AI & Machine Learning'],
  ['cosmology', 'Cosmology'],
]

function taxonomies() {
  return [
    ...blogTopics.map(([key, label]) => ({
      id: `blog-topic:${key}`,
      namespace: 'Blog topics',
      key,
      label,
      sourceRefs: [sourceRef(paths.topics, 'Blog topic registry', `TOPIC.${key} records the label “${label}”.`)],
    })),
    ...labCategories.map(([key, label]) => ({
      id: `lab-category:${key}`,
      namespace: 'Lab categories',
      key,
      label,
      sourceRefs: [sourceRef(paths.labs, 'Lab category registry', `CATEGORIES records key “${key}” with label “${label}”.`)],
    })),
  ]
}

function sourceFixture() {
  const nodes = [
    {
      id: defaultRootId,
      kind: 'concept',
      label: 'Logistic map',
      summary: 'A proposed concept scoped to the named equation in “Chaos hides in one line of algebra”. It is not a normalized glossary hub or an assertion that similarly tagged systems are equivalent.',
      href: `${siteBase}/blog/chaos-in-one-equation/#eqn:logistic-map`,
      sourceRefs: [
        sourceRef(paths.chaos, 'Named equation in the article', 'The article names the logistic map and gives its Equation component the authored id “eqn:logistic-map”. The concept-node mapping is proposed.'),
        sourceRef(paths.logistic, 'Equation in the Lab explanation', 'The lab explanation explicitly shows xₙ₊₁ = r xₙ(1 − xₙ). Associating it with this source-scoped concept node is proposed, not an approved glossary mapping.'),
      ],
      taxonomyIds: [],
      mappingStatus: 'proposed',
    },
    {
      id: 'tag:chaos',
      kind: 'tag',
      label: 'chaos',
      summary: 'The exact metadata tag “chaos”, preserved separately from concepts and category names. Shared tagging describes an editorial association.',
      sourceRefs: [
        sourceRef(paths.chaos, 'Article tags', 'The article’s labels include the exact tag “chaos”.'),
        sourceRef(paths.labs, 'Lab tags', 'The three selected lab entries include the exact tag “chaos”.'),
      ],
      taxonomyIds: [],
      mappingStatus: 'recorded',
    },
    {
      id: 'blog:chaos-in-one-equation',
      kind: 'blog',
      label: 'Chaos hides in one line of algebra',
      summary: 'An article about the logistic map, period doubling and sensitivity to initial conditions. Its authored experiments provide the links shown here.',
      href: `${siteBase}/blog/chaos-in-one-equation/`,
      sourceRefs: [sourceRef(paths.chaos, 'Article source', 'The frontmatter records this title, the labels maths, chaos and dynamical-systems, and release: true. The body explicitly embeds the three connected labs.')],
      taxonomyIds: ['blog-topic:maths'],
      mappingStatus: 'recorded',
      tags: ['maths', 'chaos', 'dynamical-systems'],
    },
    {
      id: 'blog:lorenz-and-the-limits-of-prediction',
      kind: 'blog',
      label: 'The Lorenz Attractor and the Limits of Prediction',
      summary: 'An article examining determinism, finite-precision observations and the Lorenz model. It explicitly embeds the Lorenz Attractor lab.',
      href: `${siteBase}/blog/lorenz-and-the-limits-of-prediction/`,
      sourceRefs: [sourceRef(paths.lorenz, 'Article source', 'The frontmatter records this title, the labels mathematics, chaos, dynamical systems and physics, and release: true. The body embeds lorenz-attractor.')],
      taxonomyIds: ['blog-topic:maths'],
      mappingStatus: 'recorded',
      tags: ['mathematics', 'chaos', 'dynamical systems', 'physics'],
    },
    {
      id: 'lab:logistic-bifurcation',
      kind: 'lab',
      label: 'Logistic Bifurcation',
      summary: 'Explore the logistic-map bifurcation diagram and its cobweb inset. This is the lab explicitly embedded in the article, not measured population data.',
      href: `${siteBase}/lab/logistic-bifurcation/`,
      sourceRefs: [
        sourceRef(paths.labs, 'Lab registry entry', 'The logistic-bifurcation entry records this title, category maths, and tags chaos, bifurcation and dynamical systems.'),
        sourceRef(paths.logistic, 'Lab explanation', 'The authored explanation describes the logistic map, growth-rate controls, iterations and the cobweb inset.'),
      ],
      taxonomyIds: ['lab-category:maths'],
      mappingStatus: 'recorded',
      tags: ['chaos', 'bifurcation', 'dynamical systems'],
    },
    {
      id: 'lab:lorenz-attractor',
      kind: 'lab',
      label: 'Lorenz Attractor',
      summary: 'The registered Lorenz-system lab. Both selected articles explicitly embed this experiment.',
      href: `${siteBase}/lab/lorenz-attractor/`,
      sourceRefs: [sourceRef(paths.labs, 'Lab registry entry', 'The lorenz-attractor entry records this title, category maths, and tags chaos, ode and butterfly effect.')],
      taxonomyIds: ['lab-category:maths'],
      mappingStatus: 'recorded',
      tags: ['chaos', 'ode', 'butterfly effect'],
    },
    {
      id: 'lab:double-pendulum',
      kind: 'lab',
      label: 'Double Pendulum',
      summary: 'The registered double-pendulum lab, explicitly embedded in “Chaos hides in one line of algebra”.',
      href: `${siteBase}/lab/double-pendulum/`,
      sourceRefs: [sourceRef(paths.labs, 'Lab registry entry', 'The double-pendulum entry records this title, category maths, and tags chaos and ode.')],
      taxonomyIds: ['lab-category:maths'],
      mappingStatus: 'recorded',
      tags: ['chaos', 'ode'],
    },
    {
      id: 'study:editorial-system',
      kind: 'study',
      label: 'Research folio — editorial study',
      summary: 'A design and component study with the visible heading “The shape of a quiet signal.” Its damped-signal illustration is not experimental data. No scientific relationship to the other fixture records is asserted.',
      href: `${siteBase}/lab/editorial-system/`,
      sourceRefs: [sourceRef(paths.editorial, 'Editorial study source', 'The page metadata uses this title. The page labels itself a component study and design proposal, not a published article or scientific result.')],
      taxonomyIds: [],
      mappingStatus: 'recorded',
    },
    {
      id: 'category:blog-topic:maths',
      kind: 'category',
      label: 'Mathematics · Blog topics',
      summary: 'The maths key in the blog topic registry. Explicit per-slug overrides place both selected articles here.',
      sourceRefs: [sourceRef(paths.topics, 'Blog topic and slug mappings', 'TOPIC.maths is labelled Mathematics; BY_SLUG maps chaos-in-one-equation and lorenz-and-the-limits-of-prediction to it.')],
      taxonomyIds: ['blog-topic:maths'],
      mappingStatus: 'recorded',
    },
    {
      id: 'category:lab-category:maths',
      kind: 'category',
      label: 'Mathematics · Lab categories',
      summary: 'The maths key in the Lab category registry. Kept separate from the blog topic namespace even though both display Mathematics.',
      sourceRefs: [sourceRef(paths.labs, 'Lab category and membership', 'CATEGORIES labels maths as Mathematics; the three selected labs declare category maths.')],
      taxonomyIds: ['lab-category:maths'],
      mappingStatus: 'recorded',
    },
  ]

  const edges = [
    {
      id: 'proposal:logistic-map:article',
      source: defaultRootId,
      target: 'blog:chaos-in-one-equation',
      kind: 'concept',
      label: 'Named in article',
      reverseLabel: 'Names this concept',
      sourceRefs: [sourceRef(paths.chaos, 'Authored logistic-map equation', 'The named equation supports this source-scoped concept proposal; it does not establish an approved global glossary mapping.')],
      mappingStatus: 'proposed',
    },
    {
      id: 'proposal:logistic-map:lab',
      source: defaultRootId,
      target: 'lab:logistic-bifurcation',
      kind: 'concept',
      label: 'Equation shown in lab',
      reverseLabel: 'Shows this proposed concept’s equation',
      sourceRefs: [sourceRef(paths.logistic, 'Authored equation in the Lab explanation', 'The lab explanation shows xₙ₊₁ = r xₙ(1 − xₙ). This source-scoped association remains proposed and does not equate tags, concepts or scientific systems.')],
      mappingStatus: 'proposed',
    },
    ...['logistic-bifurcation', 'lorenz-attractor', 'double-pendulum'].map(slug => ({
      id: `embed:chaos-in-one-equation:${slug}`,
      source: 'blog:chaos-in-one-equation',
      target: `lab:${slug}`,
      kind: 'embed',
      label: 'Embeds lab',
      reverseLabel: 'Embedded by article',
      sourceRefs: [sourceRef(paths.chaos, 'Explicit article embed', `The article’s authored MDX includes effect="${slug}". This records an embed, not scientific equivalence.`)],
      mappingStatus: 'recorded',
    })),
    {
      id: 'embed:lorenz-and-the-limits-of-prediction:lorenz-attractor',
      source: 'blog:lorenz-and-the-limits-of-prediction',
      target: 'lab:lorenz-attractor',
      kind: 'embed',
      label: 'Embeds lab',
      reverseLabel: 'Embedded by article',
      sourceRefs: [sourceRef(paths.lorenz, 'Explicit article embed', 'The article’s authored MDX includes effect="lorenz-attractor".')],
      mappingStatus: 'recorded',
    },
  ]

  for (const node of nodes.filter(node => node.tags?.includes('chaos'))) {
    const path = node.kind === 'lab' ? paths.labs : node.id === 'blog:chaos-in-one-equation' ? paths.chaos : paths.lorenz
    edges.push({
      id: `tag:${node.id}:chaos`,
      source: node.id,
      target: 'tag:chaos',
      kind: 'tag',
      label: 'Tagged chaos',
      reverseLabel: 'Used by',
      sourceRefs: [sourceRef(path, 'Exact metadata tag', 'This record contains the exact tag “chaos”. No normalization or equivalence inference is applied.')],
      mappingStatus: 'recorded',
    })
  }

  for (const node of nodes.filter(node => node.kind === 'blog' || node.kind === 'lab')) {
    const taxonomyId = node.taxonomyIds[0]
    edges.push({
      id: `category:${node.id}:${taxonomyId}`,
      source: node.id,
      target: `category:${taxonomyId}`,
      kind: 'category',
      label: 'Filed under Mathematics',
      reverseLabel: node.kind === 'blog' ? 'Contains article' : 'Contains lab',
      sourceRefs: [sourceRef(node.kind === 'blog' ? paths.topics : paths.labs, 'Recorded category membership', `The original registry assigns this record to ${taxonomyId}. Namespaces are preserved.`)],
      mappingStatus: 'recorded',
    })
  }

  return {
    id: 'source',
    label: 'Source-backed reading neighbourhood',
    disclosure: `A compact view fixture from repository revision ${SOURCE_REVISION.slice(0, 7)}. Titles, tags, category membership and article embeds are recorded in source. The Logistic map concept is a proposed source-scoped mapping. Original destinations have not been verified live.`,
    status: 'ready',
    revision: SOURCE_REVISION,
    defaultRootId,
    nodes,
    edges,
    taxonomies: taxonomies(),
    totalNodes: nodes.length,
  }
}

function largeFixture() {
  const rootId = 'mock:hub'
  const nodes = [{
    id: rootId,
    kind: 'concept',
    label: 'Synthetic neighbourhood with 999 connections',
    summary: 'A deterministic stress-test root. Every connection and record in this scenario is invented for interface testing.',
    sourceRefs: [],
    taxonomyIds: [],
    mappingStatus: 'mock',
  }]
  const edges = []
  const kinds = ['blog', 'lab', 'study', 'tag', 'concept', 'category']
  for (let index = 1; index < 1000; index += 1) {
    const number = String(index).padStart(4, '0')
    const kind = kinds[(index - 1) % kinds.length]
    const id = `mock:node:${number}`
    nodes.push({
      id,
      kind,
      label: `Synthetic ${kind} ${number}`,
      summary: 'Invented performance-fixture data, with no source document or scientific meaning.',
      sourceRefs: [],
      taxonomyIds: [],
      mappingStatus: 'mock',
    })
    edges.push({
      id: `mock:edge:${number}`,
      source: rootId,
      target: id,
      kind: 'mock',
      label: 'Synthetic connection',
      reverseLabel: 'Synthetic root',
      sourceRefs: [],
      mappingStatus: 'mock',
    })
  }
  return {
    id: 'large',
    label: 'Synthetic large graph',
    disclosure: 'All 1,000 nodes and 999 edges are synthetic, deterministic interface-test data. Registry category labels remain the source-backed vocabulary; synthetic records claim no category membership.',
    status: 'ready',
    revision: SOURCE_REVISION,
    defaultRootId: rootId,
    nodes,
    edges,
    taxonomies: taxonomies(),
    totalNodes: nodes.length,
  }
}

/** Return fresh fixture records so scenario changes cannot leak between runs. */
export function loadFixture(name = 'source') {
  if (name === 'large') return largeFixture()
  const fixture = sourceFixture()
  if (name === 'source') return fixture

  fixture.id = name
  if (name === 'empty') {
    fixture.label = 'Synthetic empty response'
    fixture.disclosure = 'A simulated valid response containing no graph records. This does not describe the live blog.'
    fixture.status = 'empty'
    fixture.nodes = []
    fixture.edges = []
    fixture.totalNodes = 0
    return fixture
  }
  if (name === 'error') {
    fixture.label = 'Synthetic load failure'
    fixture.disclosure = 'A simulated unavailable response for recovery testing. This is not a report of an actual service failure.'
    fixture.status = 'error'
    fixture.nodes = []
    fixture.edges = []
    fixture.totalNodes = null
    fixture.reason = 'The simulated graph response could not be loaded. Retry or return to the source fixture.'
    return fixture
  }
  if (name === 'partial') {
    fixture.label = 'Synthetic partial response'
    fixture.disclosure = 'The visible records retain their pinned source evidence. The incomplete response and unknown total are simulated for interface testing.'
    fixture.status = 'partial'
    fixture.nodes = fixture.nodes.slice(0, 7)
    const available = new Set(fixture.nodes.map(node => node.id))
    fixture.edges = fixture.edges.filter(edge => available.has(edge.source) && available.has(edge.target))
    fixture.totalNodes = null
    fixture.reason = 'Only part of this simulated response is available. The total number of records and connections is unknown.'
    return fixture
  }
  if (name === 'missing') {
    fixture.label = 'Synthetic missing source metadata'
    fixture.disclosure = 'The destination URL, source references and optional tags of Logistic Bifurcation are deliberately omitted. This synthetic omission does not imply that the real lab or its sources are missing.'
    fixture.status = 'partial'
    const node = fixture.nodes.find(node => node.id === 'lab:logistic-bifurcation')
    delete node.href
    delete node.tags
    node.sourceRefs = []
    node.mappingStatus = 'mock'
    node.summary = 'Synthetic missing-data case: this record has no supplied destination, source reference or optional tags. Its identity remains visible for recovery.'
    fixture.reason = 'A simulated record is missing source metadata; known neighbouring records remain available.'
    return fixture
  }
  if (name === 'long-label') {
    fixture.label = 'Synthetic long-label case'
    fixture.disclosure = 'The source-backed neighbourhood is supplemented by one explicitly synthetic study and connection to exercise long labels and unbroken identifiers.'
    const id = 'mock:long-label'
    fixture.nodes.push({
      id,
      kind: 'study',
      label: 'Synthetic long-label study: comparing multiple explanatory views while preserving the distinction between a selected record and the neighbourhood root — UnbrokenIdentifierABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      summary: 'Invented interface-test content. The length and unbroken identifier are deliberate; this is not a published study or a scientific relationship.',
      sourceRefs: [],
      taxonomyIds: [],
      mappingStatus: 'mock',
    })
    fixture.edges.push({
      id: 'mock:long-label-connection',
      source: defaultRootId,
      target: id,
      kind: 'mock',
      label: 'Synthetic long-label connection',
      reverseLabel: 'Synthetic connection to root',
      sourceRefs: [],
      mappingStatus: 'mock',
    })
    fixture.totalNodes = fixture.nodes.length
    return fixture
  }
  throw new RangeError(`Unknown knowledge-folio fixture: ${String(name)}`)
}
