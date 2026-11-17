import fs from 'node:fs'
import type { SourceInput } from './schema'
import { deepFreeze, sha256 } from './identity'

const LOADED_POLICY_HASH = sha256(fs.readFileSync(new URL('./curation.ts', import.meta.url)))

/**
 * A bounded authored-term mapping, not a global scientific ontology. Each quote
 * anchors a term to one source. No cross-source equivalence is asserted.
 */
export const CURATED_TERMS = deepFreeze([
  { slug: 'every-wire-is-an-rlc-circuit', key: 'inductance', label: 'Inductance', quote: 'It has **inductance**, because current flowing through it sets up a magnetic field' },
  { slug: 'every-wire-is-an-rlc-circuit', key: 'capacitance', label: 'Capacitance', quote: 'It has **capacitance**, because the trace and the ground plane beneath it are two conductors' },
  { slug: 'every-wire-is-an-rlc-circuit', key: 'damping-ratio', label: 'Damping ratio', quote: 'the damping ratio $\\zeta$ sets whether it actually does' },
  { slug: 'chaos-in-one-equation', key: 'logistic-map', label: 'Logistic map', quote: 'The line is the logistic map, and it started life as a toy model of a population.' },
  { slug: 'chaos-in-one-equation', key: 'lyapunov-exponent', label: 'Lyapunov exponent', quote: 'The rate of that pulling-apart is the Lyapunov exponent' },
  { slug: 'a-star-search-visually', key: 'uniform-cost-search', label: 'Uniform-cost search', quote: 'is **uniform-cost search**: a priority queue of frontier nodes' },
  { slug: 'a-p-electron-is-never-between-its-lobes', key: 'orbital', label: 'Orbital', quote: 'An orbital is a standing wave, and a standing wave does not travel anywhere.' },
] as const)

/** Apply only to a source captured by the loader, with exact byte/quote checks. */
export function withCuratedTerms(input: SourceInput): SourceInput {
  const output = structuredClone(input)
  const policyPath = 'lib/knowledge-source/curation.ts'
  const policy = { path: policyPath, sha256: sha256(fs.readFileSync(policyPath, 'utf8')) }
  if (policy.sha256 !== LOADED_POLICY_HASH) throw new Error('Curation policy changed after import; start a fresh Node process before rebuilding')
  if (output.files.some(file => file.path === policyPath)) throw new Error('Curation policy already applied')
  output.files.push(policy)
  output.mapperVersion += `:curation:${policy.sha256}`
  for (const term of CURATED_TERMS) {
    const doc = output.documents.find(candidate => candidate.kind === 'blog' && candidate.key === term.slug)
    // An omitted or newly unpublished source contributes nothing, including no diagnostics.
    if (!doc || doc.publication !== 'published') continue
    const sourcePath = `content/blog/${term.slug}/index.mdx`
    const source = output.files.find(file => file.path === sourcePath)
    const raw = fs.readFileSync(sourcePath, 'utf8')
    if (!source || sha256(raw) !== source.sha256) throw new Error(`Curation source changed: ${sourcePath}`)
    const offset = raw.indexOf(term.quote)
    if (offset < 0 || raw.indexOf(term.quote, offset + 1) >= 0) throw new Error(`Curated quote is missing or ambiguous: ${term.slug}/${term.key}`)
    const lineStart = raw.slice(0, offset).split('\n').length
    doc.concepts.push({ key: term.key, label: term.label, evidence: {
      basis: 'curated-term', confidence: 'editorial', rule: 'source-scoped-term/v1; occurrence only, no equivalence or prerequisite',
      locators: [{ ...source, selector: `curated-term:${term.key}`, rawValue: term.quote,
        lineStart, lineEnd: lineStart + term.quote.split('\n').length - 1 }],
    } })
    if (!doc.dependencies.some(file => file.path === policy.path)) doc.dependencies.push(policy)
  }
  return output
}
