import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { canonical } from '../lib/knowledge-source/identity'
import { loadIntegrationSources, verifyIntegrationRevisions } from '../lib/knowledge-source/integration/repository'

if (!process.argv[1] || path.resolve(process.argv[1]) !== fileURLToPath(import.meta.url)) {
  throw new Error('Integration export requires its own CLI in a fresh Node process and stable checkout')
}
const args = process.argv.slice(2), options = new Map<string, string>()
for (let i = 0; i < args.length; i += 2) {
  if (!['--revision', '--host-revision', '--out'].includes(args[i]) || !args[i + 1] || options.has(args[i])) {
    throw new Error('Usage: node --import tsx scripts/export-knowledge-integration.mts --host-revision <exact SHA> --out <new directory> [--revision <exact SHA>]')
  }
  options.set(args[i], args[i + 1])
}
const revision = options.get('--revision') ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const hostRevision = options.get('--host-revision'), destination = options.get('--out')
if (!hostRevision || !destination) throw new Error('Exact host revision and a new output directory are required')
const result = await loadIntegrationSources(revision, hostRevision)
verifyIntegrationRevisions(result.input, hostRevision)
if (result.bridge.correspondences.some(c => ['unmatched', 'invalid'].includes(c.outcome))
  || result.bridge.edges.some(e => !['source-matched', 'ambiguous'].includes(e.outcome))
  || result.bridge.destinations.some(d => ['unmapped', 'mismatch'].includes(d.status))) {
  throw new Error('Incomplete provider comparison; retain the previous accepted artifacts and review the source gap')
}
const summary = {
  sourceRevision: revision, hostRevision, canonicalDigest: result.snapshot.digest,
  hostSnapshotIdentity: result.bridge.host.snapshotIdentity,
  canonicalNodes: result.snapshot.nodes.length, canonicalEdges: result.snapshot.edges.length,
  hostNodes: result.host.nodes.length, hostEdgeOccurrences: result.host.edges.length,
  correspondences: result.bridge.correspondences.length,
  ambiguous: result.bridge.correspondences.filter(c => c.outcome === 'ambiguous').map(c => ({ fromId: c.fromId, candidateCanonicalIds: c.candidateCanonicalIds })),
  sourceOnlyNodes: result.bridge.canonicalOnlyIds.length,
  studies: result.study.coverage,
  multilineDefinitionsRetained: result.study.glossary.filter(g => g.definition !== g.hostFirstLineDefinition).length,
  hostNormalizedTagMatches: result.host.edges.filter(e => e.evidence === 'normalized-tag-match').length,
  hostArtworkNodes: result.bridge.artwork.length, artworkFiles: result.artworkFiles.length,
  checkedDestinations: result.routeSupport.length,
  status: 'local-proposal-no-runtime-consumer',
  provenance: { freshNodeProcessRequired: true, stableCheckoutRequired: true, gitInputBytesVerified: true, executionAttestation: false },
  browserEvidence: false, productionProviderChanged: false, deployed: false,
}
const cases = ['tag:complex-analysis', 'tag:electrical-engineering', 'concept:arithmetic-intensity', 'category:cat-engineering', 'study:vol1/01-introduction']
const fixtures = {
  sourceRevision: revision, hostRevision, canonicalDigest: result.snapshot.digest,
  actual: cases.map(hostId => ({ correspondence: result.bridge.correspondences.find(c => c.fromId === hostId),
    hostNode: result.host.nodes.find(n => n.id === hostId),
    edges: result.bridge.edges.filter(e => e.source === hostId || e.target === hostId) })),
  glossary: result.study.glossary,
  syntheticOnly: ['normalized-tag-match (no current real tag/glossary overlap)', 'future punctuation collisions', 'dangling/unknown/stale provider failure cases'],
}
const files = {
  'canonical-snapshot.json': result.snapshot,
  'host-snapshot.json': result.host,
  'correspondence.json': result.bridge,
  'source-mapped-fixtures.json': fixtures,
  'input-manifest.json': { sourceRevision: revision, hostRevision, files: result.input.files },
  'destination-source-checks.json': result.routeSupport,
  'summary.json': summary,
}
const out = path.resolve(destination)
if (fs.existsSync(out)) throw new Error(`Refusing to overwrite an export: ${out}`)
fs.mkdirSync(path.dirname(out), { recursive: true })
const staging = fs.mkdtempSync(path.join(path.dirname(out), '.kg01-integration-'))
for (const [name, value] of Object.entries(files)) fs.writeFileSync(path.join(staging, name), `${JSON.stringify(JSON.parse(canonical(value)), null, 2)}\n`)
fs.renameSync(staging, out)
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
