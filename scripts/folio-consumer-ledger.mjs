/** Static source inventory only. Run with --check to detect stale generated docs. */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import ts from 'typescript'
import matter from 'gray-matter'
import { createProcessor } from '@mdx-js/mdx'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'

const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))
const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]).sort()
const parseTs = file => ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const visit = (node, fn) => { fn(node); ts.forEachChild(node, child => visit(child, fn)) }
const registryFile = 'components/mdx/mdx-components.tsx'
let names
visit(parseTs(registryFile), node => {
  if (ts.isVariableDeclaration(node) && node.name.getText() === 'mdxComponents') {
    names = node.initializer.properties.map(p => p.name.getText()).filter(name => /^[A-Z]/.test(name)).sort()
  }
})
assert.equal(names.length, 96, 'Registry changed: reconcile coverage/backlog and this baseline')
assert.equal(new Set(names).size, names.length)
const nameSet = new Set(names)
const entries = new Map(names.map(name => [name, { name, role: name === 'Gear' ? 'data-only child rendered by GearList' : ['InteractiveStudy', 'LabCanvas', 'LabSide', 'AnnotatedBlock', 'AnnotationTarget', 'MarginNote', 'StatGroup', 'Stages', 'TrailGrid', 'GearList'].includes(name) ? 'composition/layout primitive (may also render visible UI)' : 'rendered component', blogConsumers: [], labMdxConsumers: [], reviewFixtures: [], internalJsxReferences: [], visualAcceptance: 'not established by this static inventory' }]))
const processor = createProcessor({ remarkPlugins: [remarkGfm, remarkMath] })
function mdxUses(file, raw = read(file)) {
  const { content } = matter(raw)
  const offset = raw.indexOf(content)
  const prefixLines = raw.slice(0, offset).split('\n').length - 1
  const found = new Map()
  const scan = node => {
    if (['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type) && nameSet.has(node.name)) {
      const lines = found.get(node.name) ?? []
      lines.push(node.position.start.line + prefixLines)
      found.set(node.name, lines)
    }
    for (const child of node.children ?? []) scan(child)
  }
  try { scan(processor.parse(content)) } catch (error) { error.message = `${file}: ${error.message}`; throw error }
  return found
}
const posts = []
const blogFiles = walk('content/blog').filter(f => /^content\/blog\/[^/]+\/index\.mdx$/.test(f))
for (const file of blogFiles) {
  const raw = read(file)
  const { data } = matter(raw)
  const slug = file.split('/')[2]
  const published = data.release !== false && !(data.draft ?? false)
  const post = { file, slug, route: published ? `/blog/${slug}/` : null, publication: published ? 'published-by-source-rules' : 'excluded-from-public-routes', draft: Boolean(data.draft ?? false), release: data.release !== false }
  posts.push(post)
  for (const [name, lines] of mdxUses(file, raw)) entries.get(name).blogConsumers.push({ ...post, lines })
}
// Only registry-backed generic lab MDX has a proven dynamic route here. Dedicated pages are not inferred from a filename.
const labSlugs = new Set([...read('lib/lab/registry.ts').matchAll(/slug:\s*'([^']+)'/g)].map(m => m[1]))
const labFiles = walk('content/lab').filter(f => f.endsWith('.mdx'))
const unmappedLabFiles = []
for (const file of labFiles) {
  const slug = path.basename(file, '.mdx')
  const genericRoute = /^content\/lab\/[^/]+\.mdx$/.test(file) && labSlugs.has(slug) && !['circuit-sim', 'universe-scale', 'black-hole-sim'].includes(slug)
  if (!genericRoute) { unmappedLabFiles.push(file); continue }
  for (const [name, lines] of mdxUses(file)) entries.get(name).labMdxConsumers.push({ file, route: `/lab/${slug}/`, lines })
}
function jsxUses(file) {
  const found = new Map()
  const source = parseTs(file)
  visit(source, node => {
    if (!(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))) return
    const name = node.tagName.getText(source)
    if (!nameSet.has(name)) return
    const lines = found.get(name) ?? []
    lines.push(source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1)
    found.set(name, lines)
  })
  return found
}
for (const slug of ['editorial-system', 'folio-review']) {
  // These route-local files are imported by their page; tests are deliberately excluded.
  for (const file of walk(`app/lab/${slug}`).filter(f => f.endsWith('.tsx') && !/\.(test|spec)\./.test(f))) {
    for (const [name, lines] of jsxUses(file)) entries.get(name).reviewFixtures.push({ route: `/lab/${slug}/`, file, lines, evidence: 'route-local JSX source, not browser execution' })
  }
}
// This is a source-reference list, not inferred route coverage. Includes genuine wrapper composition.
for (const file of walk('components').filter(f => f.endsWith('.tsx') && !/\.(test|spec)\./.test(f) && f !== registryFile)) {
  for (const [name, lines] of jsxUses(file)) entries.get(name).internalJsxReferences.push({ file, lines })
}
const components = [...entries.values()]
for (const entry of components) {
  entry.coverage = entry.blogConsumers.some(p => p.route) ? 'published-blog-consumer' : entry.blogConsumers.length ? 'unpublished-blog-consumer-only' : entry.labMdxConsumers.length || entry.reviewFixtures.length ? 'fixture-or-lab-only' : entry.internalJsxReferences.length ? 'internal-composition-only' : 'no-consumer-found-in-scanned-scope'
}
const totals = {
  registeredNames: names.length,
  blogSourceFiles: posts.length,
  publishedBlogSourceFiles: posts.filter(p => p.route).length,
  excludedBlogSourceFiles: posts.filter(p => !p.route).length,
  namesWithPublishedBlogConsumer: components.filter(c => c.blogConsumers.some(p => p.route)).length,
  namesWithOnlyUnpublishedBlogConsumers: components.filter(c => c.coverage === 'unpublished-blog-consumer-only').length,
  namesWithReviewFixture: components.filter(c => c.reviewFixtures.length).length,
  namesWithLabMdxConsumer: components.filter(c => c.labMdxConsumers.length).length,
  namesWithoutDirectBlogConsumer: components.filter(c => !c.blogConsumers.length).length,
  namesWithoutAnyMappedRoute: components.filter(c => !c.blogConsumers.some(p => p.route) && !c.labMdxConsumers.length && !c.reviewFixtures.length).length,
}
const ledger = {
  schemaVersion: 1,
  scope: 'Working-tree static FOLIO-001 baseline; no visual, runtime, deployed or release acceptance implied.',
  sourceRegistry: registryFile,
  publicationRule: 'lib/content.ts: release !== false && !Boolean(draft ?? false); app/blog/[slug]/page.tsx gates params and page. Dates are not a publishing gate. Excluded posts have null route, never invented public URLs.',
  method: 'TypeScript AST registry and JSX scan; MDX AST counts opening component elements, excluding fenced examples/comments; source line numbers include frontmatter. Direct use is distinguished from internal composition. Native HTML mappings are outside the 96 custom names.',
  limitations: ['Source rules establish eligibility, not deployed existence.', 'Review routes use direct route-local JSX; fixture variants and interaction states are not certified.', 'Internal JSX references are name-based source pointers, not exhaustive call graphs or route proofs; JSX aliases and createElement are outside this scan.', 'Other dedicated lab applications and non-blog consumers are outside this scoped route inventory.', 'No visual-acceptance evidence is added by this generated ledger.'],
  totals,
  nonRouteBlogMdxFiles: walk('content/blog').filter(f => f.endsWith('.mdx') && !blogFiles.includes(f)),
  labMdxFilesWithoutGenericRouteMapping: unmappedLabFiles,
  posts,
  components,
}
const noDirect = components.filter(c => !c.blogConsumers.length)
const noRoute = components.filter(c => !c.blogConsumers.some(p => p.route) && !c.labMdxConsumers.length && !c.reviewFixtures.length)
const md = `# Folio consumer ledger\n\nFOLIO-001 · deterministic working-tree source baseline, not visual acceptance.\n\n[Full per-name JSON](folio-consumer-ledger.json) records all **${totals.registeredNames}** registered custom names, exact files/lines, every direct blog consumer, publishing flags, mapped lab/review fixtures and separate internal composition references. Registry and authored content are unchanged.\n\n## Source coverage\n\n- **${totals.blogSourceFiles}** loadable blog sources: **${totals.publishedBlogSourceFiles}** published by source rules; **${totals.excludedBlogSourceFiles}** excluded by draft/release flags. Excluded posts have no public route in this ledger. Publication is not date-gated.\n- **${totals.namesWithPublishedBlogConsumer} / 96** names have a published blog consumer; **${totals.namesWithOnlyUnpublishedBlogConsumers}** have only unpublished blog consumers.\n- **${totals.namesWithReviewFixture}** names occur in the real route-local JSX for \`/lab/editorial-system/\` and/or \`/lab/folio-review/\`; **${totals.namesWithLabMdxConsumer}** occur in registry-backed generic lab explainers. These categories overlap blog consumers.\n- **${totals.namesWithoutDirectBlogConsumer}** names have no direct blog MDX use: ${noDirect.map(c => '`' + c.name + '`').join(', ')}.\n- **${totals.namesWithoutAnyMappedRoute}** names have no direct published-blog, mapped lab-MDX or review fixture: ${noRoute.map(c => '`' + c.name + '`').join(', ') || 'none'}. Consult internal references before calling a wrapper unused.\n\n## Gaps are not all the same\n\n${noDirect.map(c => `- **${c.name}:** ${c.coverage}; ${c.reviewFixtures.length ? 'review route: ' + [...new Set(c.reviewFixtures.map(f => f.route))].join(', ') + '; ' : ''}${c.internalJsxReferences.length} internal JSX source file(s).`).join('\n')}\n\n\`Gear\` deliberately returns null: its props are rendered by \`GearList\`. It requires parent-context proof, not a standalone visual card. Shared wrappers can be exercised internally without appearing as direct MDX tags; internal references are not automatically promoted to route proof.\n\nEvery name still needs applicable FOLIO-026 consuming-browser evidence (theme/viewport/state, provenance and keyboard behaviour). This inventory neither invalidates existing scoped screenshots nor treats them as acceptance for untested names or states. Draft-only consumers need a truthful review fixture rather than a fabricated public article route.\n\n## Reproduce / completeness gate\n\n\`node scripts/folio-consumer-ledger.mjs\` regenerates only this Markdown file and its JSON companion. \`node scripts/folio-consumer-ledger.mjs --check\` fails on stale output or a registry size change. Uses existing TypeScript, gray-matter and MDX parser dependencies; no build or browser is invoked.\n\nThe AST scan excludes fenced examples/comments and reports actual element lines. It inventories \`content/blog/<slug>/index.mdx\`, consistent with \`lib/content.ts\`; non-route MDX and unmapped dedicated-lab content are separately listed, not assigned invented routes. Internal references are name-based pointers, not a complete import/call graph. Exact authored prose/frontmatter, security and publishing rules are preserved.\n`
const outputs = [['docs/design/folio-consumer-ledger.json', JSON.stringify(ledger, null, 2) + '\n'], ['docs/design/FOLIO-CONSUMER-LEDGER.md', md]]
for (const [file, text] of outputs) {
  if (process.argv.includes('--check')) assert.equal(exists(file) ? read(file) : '', text, `${file} is stale; rerun node scripts/folio-consumer-ledger.mjs`)
  else fs.writeFileSync(path.join(root, file), text)
}
process.stdout.write(JSON.stringify(totals, null, 2) + '\n')
process.stdout.write((process.argv.includes('--check') ? 'PASS: complete, deterministic ledger matches current source.' : 'Wrote source-only consumer ledger.') + '\n')
