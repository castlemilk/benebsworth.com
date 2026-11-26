import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createProcessor } from '@mdx-js/mdx'
import matter from 'gray-matter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import ts from 'typescript'
import { unified } from 'unified'

const markdown = unified().use(remarkParse).use(remarkGfm).use(remarkMath)
const mdx = createProcessor({ remarkPlugins: [remarkGfm, remarkMath] })
const planName = 'diagram-plan.json'
const planRoots = ['content/blog', 'study/research', 'study/mlsys']
const imageExtension = /\.(svg|png|jpe?g|webp|avif)$/i
const componentPattern = /^<([A-Z][A-Za-z0-9]*)\s*\/>$/
const markerPattern = /^::(fig|chart)\[([\w-]+)\]$/

const json = (file) => JSON.parse(readFileSync(file, 'utf8'))
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const plainText = (node) => node.value ?? node.children?.map(plainText).join('') ?? ''

function sectionsIn(body, isBlog) {
  const nodes = (isBlog ? mdx : markdown).parse(body).children.filter((node) => {
    if (node.type === 'html') return !node.value.trim().startsWith('<!--')
    if (node.type === 'mdxFlowExpression') return !/^\s*\/\*[\s\S]*\*\/\s*$/.test(node.value)
    return true
  })
  const sections = []
  let section
  for (const node of nodes) {
    if (node.type === 'heading' && node.depth <= 3) {
      // A heading that only groups subheadings has no content to review.
      if (section && (section.nodes.length || node.depth <= section.depth)) sections.push(section)
      section = node.depth >= 2 ? { heading: plainText(node), depth: node.depth, nodes: [] } : undefined
    } else {
      section?.nodes.push(node)
    }
  }
  if (section) sections.push(section)
  return sections
}

function verifyImage(file) {
  const image = statSync(file, { throwIfNoEntry: false })
  if (!image?.isFile()) throw Error(`missing image ${file}`)
  if (!image.size) throw Error(`empty image ${file}`)
}

function localImage(reference, folder) {
  if (!nonempty(reference)) throw Error('expected a local image path')
  const parts = reference.split('/')
  if (parts.includes('..') || /[\\%?#]/.test(reference) || !imageExtension.test(reference)) {
    throw Error(`expected a local image path, got ${reference}`)
  }
  const file = path.join(folder, reference)
  verifyImage(file)
  return file
}

function verifyMarker(folder, [, kind, id]) {
  // Book figures render as outbound references in the chapter, without an image.
  const manifest = kind === 'fig' ? 'diagrams' : 'charts'
  const file = path.join(folder, `${manifest}.json`)
  let entries
  try {
    entries = json(file)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    entries = []
  }
  if (!Array.isArray(entries)) throw Error(`expected an array in ${file}`)
  const matches = entries.filter((entry) => entry?.id === id)
  if (matches.length !== 1) throw Error(`expected one manifest entry for ${id}, found ${matches.length}`)
  const [entry] = matches
  if (!nonempty(entry.title) || !nonempty(entry.caption)) throw Error(`add a title and caption for ${id}`)
  if (kind === 'fig') localImage(entry.file, path.join(folder, manifest))
}

function registeredComponent(root, name) {
  const file = path.join(root, 'components/mdx/mdx-components.tsx')
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest)
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const { name: variable, initializer } of statement.declarationList.declarations) {
      if (ts.isIdentifier(variable) && variable.text === 'mdxComponents' &&
        initializer && ts.isObjectLiteralExpression(initializer)) {
        return initializer.properties.some((property) =>
          property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) &&
          property.name.text === name)
      }
    }
  }
  return false
}

function verifyFigure(reference, nodes, { root, folder, isBlog, isChapter, report }) {
  const marker = markerPattern.exec(reference)
  if (marker) {
    if (!isChapter) throw Error(`${reference} is only supported in MLSys chapter packets`)
    if (!nodes.some((node) => node.type === 'paragraph' && node.children.length === 1 &&
      node.children[0].type === 'text' && plainText(node) === reference)) {
      throw Error(`${reference} is missing in this section`)
    }
    verifyMarker(folder, marker)
    return
  }
  const component = componentPattern.exec(reference)
  if (component && isBlog) {
    if (!nodes.some((node) => node.type === 'mdxJsxFlowElement' && node.name === component[1] &&
      !node.attributes.length && !node.children.length)) {
      throw Error(`${reference} is missing in this section`)
    }
    if (!registeredComponent(root, component[1])) throw Error(`${component[1]} is missing from the MDX registry`)
    return
  }
  const embeds = nodes.flatMap((node) => node.type === 'paragraph' ? node.children : [])
    .filter((child) => child.type === 'image' && child.url === reference)
  if (!embeds.length) throw Error(`${reference} is missing in this section`)
  if (embeds.some((embed) => !nonempty(embed.alt))) report(`${reference} needs descriptive alt text`)
  if (reference.startsWith('/') && !reference.startsWith('//')) {
    localImage(reference, path.join(root, 'public'))
  } else if (isBlog && reference.startsWith('./')) {
    const source = localImage(reference, folder)
    const mirror = localImage(reference, path.join(root, 'public/blog', path.relative(path.join(root, 'content/blog'), folder)))
    if (!readFileSync(source).equals(readFileSync(mirror))) throw Error(`public mirror differs from ${source}`)
  } else {
    throw Error(`${reference} must be a public image path or a relative blog image with a public mirror`)
  }
}

export function checkDiagramPlan(planFile, root) {
  const result = { figures: 0, errors: [] }
  const relative = path.relative(root, planFile)
  const folder = path.dirname(planFile)
  const isBlog = relative.startsWith(`content/blog${path.sep}`)
  const isChapter = relative.startsWith(`study/mlsys${path.sep}`)
  const expected = isBlog ? 'index.mdx' : 'packet.md'
  const report = (message) => result.errors.push(`${relative}: ${message}`)

  try {
    const plan = json(planFile)
    if (plan?.source !== expected || !record(plan.sections)) {
      throw Error(`expected source "${expected}" and a sections object`)
    }
    const body = matter(readFileSync(path.join(folder, expected), 'utf8')).content
    const seen = new Set()
    const figuresUsed = new Map()
    for (const { heading, nodes } of sectionsIn(body, isBlog)) {
      const reportSection = (message) => report(`"${heading}" ${message}`)
      if (seen.has(heading)) {
        reportSection('is a duplicate heading. Give each section a distinct name.')
        continue
      }
      seen.add(heading)
      if (!Object.hasOwn(plan.sections, heading)) {
        reportSection('is missing from the plan')
        continue
      }
      const entry = plan.sections[heading]
      if (record(entry) && nonempty(entry.proseOnly) && Object.keys(entry).length === 1) continue
      if (!record(entry) || !nonempty(entry.figure) || !nonempty(entry.teaches) ||
        !nonempty(entry.source) || Object.hasOwn(entry, 'proseOnly')) {
        reportSection('needs figure, teaches and source fields, or a proseOnly reason')
        continue
      }
      if (figuresUsed.has(entry.figure)) {
        reportSection(`reuses the primary figure from "${figuresUsed.get(entry.figure)}"`)
        continue
      }
      figuresUsed.set(entry.figure, heading)
      try {
        verifyFigure(entry.figure, nodes, { root, folder, isBlog, isChapter, report: reportSection })
        result.figures += 1
      } catch (error) {
        reportSection(error.message)
      }
    }
    for (const heading of Object.keys(plan.sections)) {
      if (!seen.has(heading)) report(`"${heading}" has no such heading with its own content`)
    }
    if (!figuresUsed.size) report('plan needs at least one section with a figure')
  } catch (error) {
    report(error.message)
  }
  return result
}

function main(args) {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const plans = args.length ? args : planRoots.flatMap((dir) =>
    readdirSync(path.join(root, dir), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name === planName)
      .map((entry) => path.join(entry.parentPath, entry.name)),
  )
  if (!plans.length) {
    process.stderr.write('No diagram plans found.\n')
    return 1
  }
  let failed = false
  for (const plan of plans.sort()) {
    const { errors, figures } = checkDiagramPlan(path.resolve(plan), root)
    if (errors.length) {
      failed = true
      process.stderr.write(`${errors.join('\n')}\n`)
    } else {
      process.stdout.write(`${path.relative(root, path.resolve(plan))} · ${figures} sections with diagrams\n`)
    }
  }
  return Number(failed)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2))
}
