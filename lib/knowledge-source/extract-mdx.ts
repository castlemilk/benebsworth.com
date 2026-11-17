import { createProcessor } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

export type ReferenceLocator = {
  selector: string
  /** Exact authored syntax, not a rewritten or fetched destination. */
  rawValue: string
  lineStart: number
  lineEnd: number
}

export type ExtractedReference = {
  predicate: 'links_to' | 'cites' | 'embeds_lab'
  target: { href: string } | { labSlug: string }
  label: string
  locator: ReferenceLocator
}

export type ExtractionDiagnostic = {
  code: string
  message: string
  locator?: ReferenceLocator
}

type Position = {
  start: { line: number; column: number; offset?: number }
  end: { line: number; column: number; offset?: number }
}

type Attribute = {
  type: string
  name?: string
  value?: string | { type: string; value: string } | null
  position?: Position
}

type SyntaxNode = {
  type: string
  name?: string | null
  value?: string
  url?: string
  identifier?: string
  depth?: number
  attributes?: Attribute[]
  children?: SyntaxNode[]
  position?: Position
}

const ignoredNodes = new Set([
  'code', 'inlineCode', 'math', 'inlineMath', 'html',
  'mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression',
])

const bibliographyHeadings = new Set([
  'references', 'bibliography', 'sources', 'citations',
  'further reading', 'reading further',
  'references and further reading', 'references & further reading',
  'sources and further reading', 'sources & further reading',
])

const codeElements = new Set(['code', 'pre', 'script', 'style'])

function isIgnored(node: SyntaxNode): boolean {
  return ignoredNodes.has(node.type)
    || ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && codeElements.has(node.name ?? ''))
}

function headingLevel(node: SyntaxNode): number | undefined {
  if (node.type === 'heading') return node.depth
  if (node.type === 'paragraph' && node.children?.length === 1) return headingLevel(node.children[0])
  if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && /^h[1-6]$/.test(node.name ?? '')) return Number(node.name?.slice(1))
  return undefined
}

const normaliseIdentifier = (value: string) => value.trim().replace(/\s+/gu, ' ').toUpperCase().toLowerCase()

function textContent(node: SyntaxNode): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? ''
  if (isIgnored(node)) return ''
  return (node.children ?? []).map(textContent).join('')
}

function isExternalCitation(href: string): boolean {
  try {
    const url = new URL(href, 'https://benebsworth.com/')
    return /^(https?:)?\/\//i.test(href)
      && (url.protocol === 'http:' || url.protocol === 'https:')
      && !['benebsworth.com', 'www.benebsworth.com'].includes(url.hostname)
  } catch {
    return false
  }
}

/**
 * Parse authored MDX without compiling, importing or evaluating it. Dynamic
 * expressions deliberately remain unresolved. This function performs no I/O.
 * A parse diagnostic means extraction failed; [] alone does not imply success.
 */
export function extractMdxReferences(body: string, lineOffset = 0): {
  references: ExtractedReference[]
  diagnostics: ExtractionDiagnostic[]
} {
  const references: ExtractedReference[] = []
  const diagnostics: ExtractionDiagnostic[] = []
  if (!Number.isSafeInteger(lineOffset) || lineOffset < 0) {
    return { references, diagnostics: [{ code: 'invalid_line_offset', message: 'lineOffset must be a non-negative safe integer.' }] }
  }

  let root: SyntaxNode
  try {
    root = createProcessor({ remarkPlugins: [remarkGfm, remarkMath] }).parse(body) as unknown as SyntaxNode
  } catch (error) {
    const problem = error as { message?: string; line?: number }
    const line = typeof problem?.line === 'number' ? problem.line : 1
    return {
      references,
      diagnostics: [{
        code: 'mdx_parse_error',
        message: `MDX extraction failed: ${problem?.message ?? String(error)}`,
        locator: {
          selector: 'mdx.parse', rawValue: body.split(/\r?\n/)[line - 1] ?? '',
          lineStart: line + lineOffset, lineEnd: line + lineOffset,
        },
      }],
    }
  }

  function locator(node: { position?: Position }, selector: string): ReferenceLocator {
    const position = node.position
    return {
      selector,
      rawValue: body.slice(position?.start.offset ?? 0, position?.end.offset ?? 0),
      lineStart: (position?.start.line ?? 1) + lineOffset,
      lineEnd: (position?.end.line ?? position?.start.line ?? 1) + lineOffset,
    }
  }

  const definitions = new Map<string, { node: SyntaxNode; selector: string }>()
  const conflictingDefinitions = new Set<string>()
  const footnotes = new Map<string, SyntaxNode>()
  const usedFootnotes = new Set<string>()
  let hasLocalBindings = false

  function collect(node: SyntaxNode, selector: string, insideFootnote = false) {
    if (node.type === 'mdxjsEsm') {
      hasLocalBindings = true
      diagnostics.push({
        code: 'unsupported_local_binding',
        message: 'Local MDX ESM bindings are not resolved; JSX link and lab-embed extraction is suppressed for this document. Ordinary Markdown links remain available.',
        locator: locator(node, selector),
      })
      return
    }
    if (isIgnored(node)) return
    const id = normaliseIdentifier(node.identifier ?? '')
    if (node.type === 'definition') {
      const previous = definitions.get(id)
      if (previous && previous.node.url !== node.url) {
        conflictingDefinitions.add(id)
        diagnostics.push({ code: 'conflicting_definition', message: `Conflicting Markdown link definitions for ${id}.`, locator: locator(node, selector) })
      } else if (!previous) definitions.set(id, { node, selector })
      return
    }
    if (node.type === 'footnoteDefinition') {
      // mdast-util-to-hast resolves the first definition for an identifier.
      // Keep that exact rendered-source correspondence, and disclose shadowed
      // definitions instead of extracting their invisible citation content.
      if (!footnotes.has(id)) footnotes.set(id, node)
      else diagnostics.push({
        code: 'duplicate_footnote_definition',
        message: `Duplicate footnote definition ${id}; only the first definition is rendered and extracted.`,
        locator: locator(node, selector),
      })
      insideFootnote = true
    }
    if (node.type === 'footnoteReference' && !insideFootnote) usedFootnotes.add(id)
    node.children?.forEach((child, index) => collect(child, `${selector}.children[${index}]`, insideFootnote))
  }
  collect(root, 'mdx')

  // Only footnotes reachable from authored references are rendered. Close over
  // nested footnotes without traversing an unreferenced definition's sources.
  for (const id of usedFootnotes) {
    const findNested = (node: SyntaxNode) => {
      if (isIgnored(node)) return
      if (node.type === 'footnoteReference') usedFootnotes.add(normaliseIdentifier(node.identifier ?? ''))
      node.children?.forEach(findNested)
    }
    const definition = footnotes.get(id)
    if (definition) findNested(definition)
  }

  function addLink(node: SyntaxNode, href: string, selector: string, citation: boolean) {
    references.push({
      predicate: citation && isExternalCitation(href) ? 'cites' : 'links_to',
      target: { href }, label: textContent(node).trim() || href,
      locator: locator(node, selector),
    })
  }

  function literalAttribute(node: SyntaxNode, name: string, selector: string): string | undefined {
    const attributes = node.attributes ?? []
    if (attributes.some((attribute) => attribute.type !== 'mdxJsxAttribute')) {
      diagnostics.push({ code: 'dynamic_attribute', message: `${node.name} has spread attributes; ${name} cannot be resolved statically.`, locator: locator(node, selector) })
      return undefined
    }
    const matching = attributes.filter((attribute) => attribute.name === name)
    if (matching.length !== 1) {
      diagnostics.push({ code: matching.length ? 'ambiguous_attribute' : 'missing_attribute', message: `${node.name} needs one literal ${name} attribute.`, locator: locator(node, selector) })
      return undefined
    }
    const attribute = matching[0]
    if (typeof attribute.value !== 'string') {
      diagnostics.push({ code: 'dynamic_attribute', message: `${node.name}.${name} is not a quoted literal; no expression was evaluated.`, locator: locator(attribute, `${selector}.attributes.${name}`) })
      return undefined
    }
    if (!attribute.value.trim()) {
      diagnostics.push({ code: 'empty_target', message: `${node.name}.${name} is empty.`, locator: locator(attribute, `${selector}.attributes.${name}`) })
      return undefined
    }
    return attribute.value
  }

  function unresolvedInlineReferences(node: SyntaxNode, selector: string) {
    const start = node.position?.start.offset
    const end = node.position?.end.offset
    if (start === undefined || end === undefined) return
    const source = body.slice(start, end)
    const masked = Array.from({ length: source.length }, () => ' ')
    // Only parser-recognised text is considered. Code, links already resolved
    // by Markdown, JSX attributes and expressions cannot invent diagnostics.
    const retainText = (child: SyntaxNode) => {
      if (child.type === 'text') {
        for (let offset = child.position?.start.offset ?? 0; offset < (child.position?.end.offset ?? 0); offset++) {
          if (offset >= start && offset < end) masked[offset - start] = body[offset]
        }
      } else if (['emphasis', 'strong', 'delete', 'paragraph', 'heading', 'tableCell'].includes(child.type)) {
        child.children?.forEach(retainText)
      }
    }
    retainText(node)
    const visible = masked.join('')
    const isEscaped = (index: number) => {
      let slashCount = 0
      while (index > 0 && source[--index] === '\\') slashCount++
      return slashCount % 2 === 1
    }
    const record = (index: number, length: number, code: string, message: string) => {
      const before = body.slice(0, start + index)
      const rawValue = source.slice(index, index + length)
      const lineStart = before.split('\n').length + lineOffset
      diagnostics.push({ code, message, locator: { selector, rawValue, lineStart, lineEnd: lineStart + rawValue.split('\n').length - 1 } })
    }
    for (const match of visible.matchAll(/\[([^\][\n]+)\]\s*\[([^\][\n]*)\]/g)) {
      if (isEscaped(match.index)) continue
      const raw = source.slice(match.index, match.index + match[0].length)
      const closingLabel = raw.indexOf(']')
      const rawIdentifier = raw.slice(closingLabel + 1).trim().slice(1, -1)
      const id = normaliseIdentifier(rawIdentifier || raw.slice(1, closingLabel))
      if (!definitions.has(id)) record(match.index, match[0].length, 'unresolved_reference', `Markdown link reference ${id} has no definition.`)
    }
    for (const match of visible.matchAll(/\[\^([^\]\n]+)\]/g)) {
      if (isEscaped(match.index)) continue
      const id = normaliseIdentifier(match[1])
      if (!footnotes.has(id)) record(match.index, match[0].length, 'unresolved_footnote', `Footnote reference ${id} has no definition.`)
    }
  }

  function walkChildren(node: SyntaxNode, selector: string, citationDepth: number | undefined, inFootnote: boolean) {
    let activeDepth = citationDepth
    node.children?.forEach((child, index) => {
      const depth = headingLevel(child)
      if (depth !== undefined) {
        if (activeDepth !== undefined && depth <= activeDepth) activeDepth = undefined
        const title = textContent(child).trim().toLowerCase().replace(/[:.]$/, '').trim()
        if (bibliographyHeadings.has(title)) activeDepth = depth
      }
      walk(child, `${selector}.children[${index}]`, activeDepth, inFootnote)
    })
  }

  function walk(node: SyntaxNode, selector: string, citationDepth?: number, inFootnote = false) {
    if (isIgnored(node) || node.type === 'definition') return
    if (node.type === 'footnoteDefinition') {
      const id = normaliseIdentifier(node.identifier ?? '')
      if (!usedFootnotes.has(id) || footnotes.get(id) !== node) return
      inFootnote = true
    }
    const citation = inFootnote || citationDepth !== undefined
    if (node.type === 'link') {
      addLink(node, node.url ?? '', selector, citation)
      return
    }
    if (node.type === 'linkReference') {
      const id = normaliseIdentifier(node.identifier ?? '')
      const definition = definitions.get(id)
      if (!definition || conflictingDefinitions.has(id)) {
        diagnostics.push({ code: 'unresolved_reference', message: `Markdown reference ${id} has no unambiguous definition.`, locator: locator(node, selector) })
      } else {
        const definitionLocator = locator(definition.node, definition.selector)
        const evidence = `${selector}; definition[${JSON.stringify(id)}]=${definition.selector}@${definitionLocator.lineStart}`
        addLink(node, definition.node.url ?? '', evidence, citation)
        references[references.length - 1].locator.rawValue += `\n${definitionLocator.rawValue}`
      }
      return
    }
    // Names such as LabSide and Link are meaningful only under the known MDX
    // provider. A local import/export can shadow them. Do not guess its binding
    // or execute its module; retain ordinary Markdown evidence separately.
    if (!hasLocalBindings && (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement')) {
      const attribute = node.name === 'SpatialLab' ? 'slug' : ['LabSide', 'LabCanvas'].includes(node.name ?? '') ? 'effect' : undefined
      if (attribute) {
        const slug = literalAttribute(node, attribute, selector)
        if (slug !== undefined) {
          const targetAttribute = node.attributes?.find((entry) => entry.name === attribute)
          references.push({ predicate: 'embeds_lab', target: { labSlug: slug }, label: slug, locator: locator(targetAttribute ?? node, `${selector}.${node.name}[${attribute}]`) })
        }
      } else if (node.name === 'a' || node.name === 'Link') {
        const href = literalAttribute(node, 'href', selector)
        if (href !== undefined) addLink(node, href, `${selector}.${node.name}[href]`, citation)
      }
    }
    if (['paragraph', 'heading', 'tableCell'].includes(node.type)) unresolvedInlineReferences(node, selector)
    walkChildren(node, selector, citationDepth, inFootnote)
  }
  walk(root, 'mdx')
  return { references, diagnostics }
}
