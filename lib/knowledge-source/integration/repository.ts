import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { buildKnowledgeGraph } from '../../knowledge/graph'
import { getAllChapterParams } from '../../study/load'
import { buildKnowledgeSnapshot } from '../build'
import { withCuratedTerms } from '../curation'
import { loadRepositoryInput } from '../repository'
import { verifyInputRevision } from '../revision'
import { canonical, compare, sha256 } from '../identity'
import type { SourceFile, SourceInput } from '../schema'
import { buildIntegrationBridge } from './bridge'
import { readStudySources } from './study-source'

/** Explicit supplemental policy inventory; no runtime consumer imports this. */
const POLICIES = [
  'lib/knowledge-source/integration/bridge.ts',
  'lib/knowledge-source/integration/host-seam.ts',
  'lib/knowledge-source/integration/study-source.ts',
  'lib/knowledge-source/integration/repository.ts',
  'scripts/export-knowledge-integration.mts',
  'lib/knowledge/graph.ts', 'lib/knowledge/topic-art.ts',
  'lib/study/load.ts', 'lib/study/shared.ts', 'lib/gen/study.ts',
  'app/knowledge/page.tsx', 'components/knowledge/knowledge-console.tsx',
  'app/study/[volume]/[chapter]/page.tsx', 'app/study/concepts/page.tsx',
  'app/lab/circuit-sim/page.tsx', 'app/lab/universe-scale/page.tsx', 'app/lab/black-hole-sim/page.tsx',
] as const

function supplementalFiles(): SourceFile[] {
  const art = fs.readdirSync('public/topics/artwork').filter(file => file.endsWith('.png'))
    .map(file => `public/topics/artwork/${file}`)
  return [...POLICIES, ...art].sort(compare).map(file => ({ path: file, sha256: sha256(fs.readFileSync(file)) }))
}
function mergeFiles(files: SourceFile[]): SourceFile[] {
  const result = new Map<string, SourceFile>()
  for (const file of files) {
    if (result.has(file.path) && result.get(file.path)!.sha256 !== file.sha256) throw new Error(`Integration source changed during capture: ${file.path}`)
    result.set(file.path, file)
  }
  return [...result.values()].sort((a, b) => compare(a.path, b.path))
}

/**
 * Fresh-process supplied-input capture, not execution attestation. The CLI must
 * separately verify every captured input at both declared Git revisions.
 */
export async function loadIntegrationSources(revision: string, hostRevision: string) {
  const before = supplementalFiles()
  const base = withCuratedTerms(await loadRepositoryInput(revision))
  const study = readStudySources()
  const host = buildKnowledgeGraph()
  const files = mergeFiles([...base.files, ...study.files, ...before])
  const input: SourceInput = {
    ...base, revision, files,
    mapperVersion: `${base.mapperVersion}+console-bridge/1:${sha256(canonical(before))}`,
    documents: [...base.documents, ...study.documents].map(doc => ({ ...doc, dependencies: mergeFiles([...doc.dependencies, ...before]) })),
    coverage: { ...base.coverage, study: 'complete' },
  }
  // Complete here denotes the packet-node inventory, not all packet citations.
  // That narrower boundary is retained in study.coverage in every export.
  const { snapshot } = buildKnowledgeSnapshot(input)
  const artworkFiles = before.filter(file => file.path.startsWith('public/topics/artwork/'))
  const artworkMappingFile = before.find(file => file.path === 'lib/knowledge/topic-art.ts')!
  const bridge = buildIntegrationBridge({ snapshot, host, hostRevision, glossary: study.glossary, artworkFiles, artworkMappingFile })
  const chapterRoutes = new Set(getAllChapterParams().map(p => `/study/${p.volume}/${p.chapter}/`))
  const routeSupport = bridge.destinations.filter(d => d.hostHref).map(destination => {
    const node = host.nodes.find(n => n.id === destination.hostId)!
    let routeFile: string
    if (node.kind === 'blog') routeFile = 'app/blog/[slug]/page.tsx'
    else if (node.kind === 'lab') {
      const slug = node.id.slice(4)
      routeFile = ['circuit-sim', 'universe-scale', 'black-hole-sim'].includes(slug)
        ? `app/lab/${slug}/page.tsx` : 'app/lab/[slug]/page.tsx'
    } else if (node.kind === 'study') {
      if (!chapterRoutes.has(destination.hostHref!)) throw new Error(`Study destination absent from static parameters: ${destination.hostHref}`)
      routeFile = 'app/study/[volume]/[chapter]/page.tsx'
    } else if (node.kind === 'concept' && destination.hostHref === '/study/concepts/') routeFile = 'app/study/concepts/page.tsx'
    else throw new Error(`Unsupported host destination: ${destination.hostId}`)
    if (!files.some(f => f.path === routeFile)) throw new Error(`Missing captured route policy: ${routeFile}`)
    return { hostId: node.id, href: destination.hostHref!, routeFile, status: 'registry-and-route-source' as const, built: false, live: false }
  })
  if (canonical(before) !== canonical(supplementalFiles())) throw new Error('Integration policies or artwork inventory changed during capture')
  for (const file of files) if (sha256(fs.readFileSync(file.path)) !== file.sha256) throw new Error(`Integration source changed during capture: ${file.path}`)
  return { input, snapshot, host, study, bridge, routeSupport, artworkFiles }
}

/** Check Git bytes and packet inventory; never silently borrow the old export. */
export function verifyIntegrationRevisions(input: SourceInput, hostRevision: string): void {
  verifyInputRevision(input)
  verifySupplementalInventories(input.files, [input.revision, hostRevision])
  // Verify the existing owner's graph inputs against the independently pinned
  // master as well. New KG01 modules intentionally exist only at the local head.
  verifyInputRevision({ ...input, revision: hostRevision, files: input.files.filter(file =>
    !file.path.startsWith('lib/knowledge-source/') && !file.path.startsWith('scripts/export-knowledge-')) })
}

/** Inventory checks at BOTH revisions prevent omitted files borrowing old provenance. */
export function verifySupplementalInventories(files: SourceFile[], revisions: string[], readTree = (revision: string, directory: string): string[] =>
  execFileSync('git', ['ls-tree', '-r', '--name-only', revision, '--', directory], { encoding: 'utf8' }).trim().split('\n')) {
  const domains = [
    { directory: 'study/mlsys', accept: (file: string) => file.endsWith('/packet.md'), label: 'Study packet' },
    { directory: 'public/topics/artwork', accept: (file: string) => file.endsWith('.png'), label: 'Artwork' },
  ]
  for (const revision of new Set(revisions)) {
    if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Exact supplemental inventory revision required')
    for (const domain of domains) {
      const captured = files.map(file => file.path).filter(file => file.startsWith(`${domain.directory}/`) && domain.accept(file)).sort(compare)
      const committed = readTree(revision, domain.directory).filter(domain.accept).sort(compare)
      if (canonical(committed) !== canonical(captured)) throw new Error(`${domain.label} inventory differs at ${revision}`)
    }
  }
}
