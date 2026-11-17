import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { loadRepositoryInput } from '../lib/knowledge-source/repository'
import { withCuratedTerms } from '../lib/knowledge-source/curation'
import { buildKnowledgeSnapshot } from '../lib/knowledge-source/build'
import { verifyInputRevision } from '../lib/knowledge-source/revision'
import { canonical, contentId } from '../lib/knowledge-source/identity'

const args = process.argv.slice(2)
const options = new Map<string, string>()
for (let i = 0; i < args.length; i += 2) {
  if (!['--revision', '--out'].includes(args[i]) || !args[i + 1] || options.has(args[i])) {
    throw new Error('Usage: node --import tsx scripts/export-knowledge-source.mts [--revision <exact SHA>] [--out <new output directory>]')
  }
  options.set(args[i], args[i + 1])
}
const revision = options.get('--revision') ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const input = withCuratedTerms(await loadRepositoryInput(revision))
// A dirty or incompletely captured input cannot borrow a commit's provenance.
verifyInputRevision(input)
const { snapshot } = buildKnowledgeSnapshot(input)
const summary = {
  sourceRevision: snapshot.sourceRevision, mapperVersion: snapshot.mapperVersion,
  digest: snapshot.digest, inputManifestDigest: snapshot.inputManifestDigest,
  status: 'implemented-source-only', builtGraphRoute: false, browserEvidence: false, deployed: false,
  coverage: snapshot.coverage,
  nodes: snapshot.nodes.length, edges: snapshot.edges.length, referenceOccurrences: snapshot.references.length,
  kinds: Object.fromEntries([...new Set(snapshot.nodes.map(n => n.kind))].map(kind => [kind, snapshot.nodes.filter(n => n.kind === kind).length])),
  referenceStates: Object.fromEntries([...new Set(snapshot.references.map(r => r.status))].sort().map(state => [state, snapshot.references.filter(r => r.status === state).length])),
  publication: { publishedArticles: input.documents.filter(d => d.kind === 'blog' && d.publication === 'published').length,
    excludedArticles: input.documents.filter(d => d.kind === 'blog' && d.publication !== 'published').length },
  diagnostics: snapshot.diagnostics,
}
const fixtureSlugs = [
  'every-wire-is-an-rlc-circuit', 'chaos-in-one-equation', 'a-star-search-visually',
  'a-p-electron-is-never-between-its-lobes', 'the-nautilus-is-not-a-golden-spiral', 'earth-is-closest-to-the-sun-in-winter',
]
const fixture = {
  fixtureVersion: 1, sourceRevision: snapshot.sourceRevision, snapshotDigest: snapshot.digest,
  purpose: 'Real source mappings for owner integration review; no scientific equivalence, browser or live evidence.',
  cases: fixtureSlugs.map(slug => {
    const id = contentId('blog', slug)
    const edges = snapshot.edges.filter(edge => edge.source === id || (edge.target === id && edge.predicate === 'companion_article'))
    const ids = new Set([id, ...edges.flatMap(edge => [edge.source, edge.target])])
    return { nodeId: id, nodes: snapshot.nodes.filter(node => ids.has(node.id)), edges,
      references: snapshot.references.filter(reference => reference.source === id) }
  }),
  ownerHandoff: {
    studyPackets: 'No verified study-packet registry. Synthetic study adapter tests are not published source records.',
    draftGraph: 'Mac graph.ts/graph.test.ts unavailable here; structural compatibility requires that owner review.',
    pending: ['study publication/registry contract', 'reviewed cross-source glossary aliases', 'dedicated nonregistry Lab route inventory', 'export/anchor/browser acceptance'],
  },
}
const serialize = (value: unknown) => `${JSON.stringify(JSON.parse(canonical(value)), null, 2)}\n`
const destination = options.get('--out')
if (destination) {
  const out = path.resolve(destination)
  if (fs.existsSync(out)) throw new Error(`Refusing to overwrite an existing output directory: ${out}`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  const staging = fs.mkdtempSync(path.join(path.dirname(out), '.kg01-export-'))
  fs.writeFileSync(path.join(staging, 'knowledge-source-snapshot.json'), serialize(snapshot))
  fs.writeFileSync(path.join(staging, 'source-mapped-fixtures.json'), serialize(fixture))
  fs.writeFileSync(path.join(staging, 'summary.json'), serialize(summary))
  fs.renameSync(staging, out)
}
process.stdout.write(serialize(summary))
