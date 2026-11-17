import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeKatex from 'rehype-katex'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeStringify from 'rehype-stringify'
import katex from 'katex'
import type { Element, ElementContent, Root, RootContent, Text } from 'hast'
import type { EquationSymbol } from '@/lib/gen/study'

/**
 * Plain-markdown pipeline for generated study packets — deliberately NOT MDX.
 * Packets are agent-authored; a stray `<` or `{` in prose must not break the
 * static export. Same remark/rehype stack as MdxContent so packet pages look
 * like the rest of the site (KaTeX, pretty-code, slugs).
 *
 * Packet-only syntax on top:
 *   ==text==        → <mark class="study-mark"> (reading-highlight marker)
 *   > [!kind] note  → <aside class="study-note"> callout blocks; kinds:
 *                     note, observation, caution, method, connection, question
 */

type HastNode = Root | Element | Text | ElementContent

const SKIP_PARENTS = new Set(['pre', 'code', 'script', 'style'])

function hasClass(el: Element, cls: string): boolean {
  const c = el.properties?.className
  return Array.isArray(c) ? c.includes(cls) : typeof c === 'string' && c.split(' ').includes(cls)
}

function isSkippable(node: HastNode): node is Element {
  return node.type === 'element' && (SKIP_PARENTS.has((node as Element).tagName) || hasClass(node as Element, 'katex'))
}

/**
 * Collect a `{…}` gloss that may span sibling nodes — GFM linkifies
 * `[x](y)` before this transform runs, so a gloss can straddle elements.
 * Returns the nodes for the gloss card and the text left after `}`.
 */
function collectGloss(firstText: string, siblings: RootContent[], from: number) {
  const inner: ElementContent[] = []
  const tail = firstText.match(/^\{([\s\S]*?)\}(.*)$/)
  if (tail) {
    if (tail[1]) inner.push({ type: 'text', value: tail[1] })
    return { inner, consumed: 0, rest: tail[2] }
  }
  inner.push({ type: 'text', value: firstText.slice(1) })
  let ci = from
  while (ci < siblings.length) {
    const node = siblings[ci]
    if (node.type === 'text') {
      const cut = node.value.indexOf('}')
      if (cut >= 0) {
        if (cut > 0) inner.push({ type: 'text', value: node.value.slice(0, cut) })
        return { inner, consumed: ci - from + 1, rest: node.value.slice(cut + 1) }
      }
      inner.push(node)
    } else if (node.type === 'element') {
      inner.push(node)
    } else {
      break
    }
    ci += 1
  }
  // No closing `}` — not a gloss; caller emits the text untouched.
  return null
}

/** `==mark=={optional gloss}` → `<mark class="study-mark">` + hover card. */
function rehypeStudyMarks() {
  return (tree: Root) => {
    const glossLabel = (): ElementContent => ({
      type: 'element',
      tagName: 'span',
      properties: { className: ['study-mark-gloss-label'] },
      children: [{ type: 'text', value: 'Why it matters' }],
    })
    const walk = (parent: Root | Element) => {
      const out: RootContent[] = []
      const kids = parent.children
      for (let ci = 0; ci < kids.length; ci += 1) {
        const child = kids[ci]
        if (child.type === 'element') {
          if (!isSkippable(child)) walk(child)
          out.push(child)
          continue
        }
        if (child.type !== 'text' || !child.value.includes('==')) {
          out.push(child)
          continue
        }
        const parts = child.value.split(/==/)
        // Odd number of `==` markers → unmatched; emit untouched.
        if (parts.length % 2 === 0) {
          out.push(child)
          continue
        }
        for (let i = 0; i < parts.length; i += 1) {
          const part = parts[i]
          if (i % 2 === 0) {
            if (part !== '') out.push({ type: 'text', value: part })
            continue
          }
          const markChildren: ElementContent[] = [{ type: 'text', value: part }]
          // A `{gloss}` glued to the closing == rides the hover card. It can
          // run into later sibling nodes (e.g. a link), which get consumed.
          const next = parts[i + 1] ?? ''
          if (next.startsWith('{')) {
            const gloss = collectGloss(next, kids as RootContent[], ci + 1)
            if (gloss) {
              markChildren.push({
                type: 'element',
                tagName: 'span',
                properties: { className: ['study-mark-gloss'], role: 'note' },
                children: [glossLabel(), ...gloss.inner],
              })
              for (const node of gloss.inner) {
                if (node.type === 'element') walk(node)
              }
              ci += gloss.consumed
              parts[i + 1] = gloss.rest
            }
          }
          out.push({ type: 'element', tagName: 'mark', properties: { className: ['study-mark'] }, children: markChildren })
        }
      }
      parent.children = out as typeof parent.children
    }
    walk(tree)
  }
}

const NOTE_KINDS = new Set(['note', 'observation', 'caution', 'method', 'connection', 'question'])

/** `> [!kind] Title` blockquotes → `.study-note` asides. */
function rehypeStudyCallouts() {
  return (tree: Root) => {
    const walk = (parent: Root | Element) => {
      for (const child of parent.children) {
        if (child.type === 'element') walk(child)
      }
      parent.children = parent.children.map((child) => {
        if (child.type !== 'element' || child.tagName !== 'blockquote') return child
        // hast keeps '\n' whitespace text nodes between elements — find the
        // first real paragraph, not children[0].
        const first = child.children.find((c): c is Element => c.type === 'element' && c.tagName === 'p')
        const t = first?.children.find((c): c is Text => c.type === 'text')
        if (!first || !t) return child
        const m = t.value.match(/^\[!([a-z]+)\]\s*([^\n]*)\n?([\s\S]*)$/i)
        if (!m) return child
        const kind = m[1].toLowerCase()
        if (!NOTE_KINDS.has(kind)) return child
        const title = m[2].trim()
        const tIdx = first.children.indexOf(t)
        const inline: ElementContent[] = [
          ...(m[3] ? [{ type: 'text', value: m[3] } as Text] : []),
          ...first.children.slice(tIdx + 1),
        ]
        const body: ElementContent[] = []
        if (inline.length) body.push({ ...first, children: inline })
        body.push(...child.children.slice(child.children.indexOf(first) + 1).filter((c) => c.type !== 'text' || c.value.trim()))
        const head: ElementContent[] = [
          { type: 'element', tagName: 'p', properties: { className: ['study-note-kind'] }, children: [{ type: 'text', value: kind }] },
        ]
        if (title) {
          head.push({ type: 'element', tagName: 'p', properties: { className: ['study-note-title'] }, children: [{ type: 'text', value: title }] })
        }
        return {
          type: 'element',
          tagName: 'aside',
          properties: { className: ['study-note'], 'data-kind': kind },
          children: [
            { type: 'element', tagName: 'div', properties: { className: ['study-note-head'] }, children: head },
            { type: 'element', tagName: 'div', properties: { className: ['study-note-body'] }, children: body },
          ],
        } as Element
      })
    }
    walk(tree)
  }
}

const EQ_REF = /^::eq\[([A-Za-z0-9_-]+)\]$/
const FIG_REF = /^::(fig|chart)\[([A-Za-z0-9_-]+)\]$/

/** Trimmed text of a `<p>` that contains exactly one text node — the marker
 * paragraph shape every `::*` directive uses. Returns null for anything else. */
function markerText(node: RootContent): string | null {
  if (node.type !== 'element' || node.tagName !== 'p') return null
  if (node.children.length !== 1) return null
  const c = node.children[0]
  return c.type === 'text' ? c.value.trim() : null
}

/** Author-visible stub for a directive that can't resolve — silent drops
 *  hide packet bugs; a dashed stub fails the eyeball check instead. */
function missingStub(kind: string, id: string): ElementContent {
  return {
    type: 'element',
    tagName: 'p',
    properties: { className: ['study-fig-missing'], 'data-fig-missing': id },
    children: [{ type: 'text', value: `[missing ${kind}: ${id}]` }],
  }
}

/** Minimal shape the figure transform needs — keeps markdown.ts free of load.ts imports. */
export type InlineFigureData = {
  title?: string
  caption?: string
  svg?: string
  imageUri?: string
  sourceHref?: string
}

/** Ids the inline-figure transform actually embedded — the page filters
 * galleries from this so a marker inside a code fence (rendered literally,
 * never transformed) can't drop a figure silently. */
export type StudyEmbedReport = { figIds: Set<string>; chartIds: Set<string> }

/** `::fig[id]` / `::chart[id]` marker paragraph → {kind,id}, or null. */
function figRefOf(node: RootContent): { kind: 'fig' | 'chart'; id: string } | null {
  const text = markerText(node)
  const m = text?.match(FIG_REF)
  return m ? { kind: m[1] as 'fig' | 'chart', id: m[2] } : null
}

/**
 * `::fig[id]` on its own line inlines the figure at the point of discussion:
 * SVG markup raw, raster via data URI, caption + optional "book figure" badge
 * from the chapter manifests. `::chart[id]` emits a placeholder figure that
 * PacketAnnotator portals a StudyChartFigure into (charts are React, so they
 * can't be stringified server-side). Embedded ids keep `id="fig-<id>"` — the
 * page filters them out of the end galleries so each anchor exists once.
 */
function rehypeInlineFigures(
  figures: Map<string, InlineFigureData>,
  bookFigureIds: Set<string>,
  chartInfo: Map<string, { title?: string; captionHtml: string }>,
  embeds?: StudyEmbedReport,
) {
  const repl = (kind: 'fig' | 'chart', id: string): ElementContent => {
    const shared = {
      className: kind === 'chart' ? ['study-chart-embed', 'not-prose'] : ['study-fig', 'not-prose'],
      'data-pagefind-ignore': true,
    }
    if (kind === 'chart') {
      const info = chartInfo.get(id)
      // Unknown chart ids get the missing stub, same as unknown figures —
      // an empty placeholder would hide the authoring error.
      if (!info) return missingStub('chart', id)
      const captionKids: ElementContent[] = []
      if (info?.title) {
        captionKids.push({ type: 'element', tagName: 'span', properties: { className: ['study-fig-title'] }, children: [{ type: 'text', value: info.title }] })
      }
      if (info?.captionHtml) {
        captionKids.push({ type: 'raw', value: `<span class="study-fig-caption">${info.captionHtml}</span>` } as unknown as ElementContent)
      }
      return {
        type: 'element',
        tagName: 'figure',
        properties: { ...shared, id: `fig-${id}`, 'data-study-chart': id },
        children: [
          { type: 'element', tagName: 'div', properties: { className: ['study-chart-slot'] }, children: [] },
          ...(captionKids.length ? [{ type: 'element', tagName: 'figcaption', properties: {}, children: captionKids } as ElementContent] : []),
        ],
      }
    }
    const f = figures.get(id)
    if (f && bookFigureIds.has(id)) {
      return {
        type: 'element', tagName: 'figure', properties: { ...shared, id: `fig-${id}` },
        children: [{
          type: 'element', tagName: 'a', properties: { href: f.sourceHref ?? 'https://mlsysbook.ai/' },
          children: [{ type: 'text', value: `Read the source book figure: ${f.title ?? id}` }],
        }, { type: 'element', tagName: 'figcaption', properties: {}, children: [
          { type: 'text', value: 'Machine Learning Systems, Vijay Janapa Reddi. Reference image not republished; consult the source chapter.' },
        ] }],
      }
    }
    if (!f || (!f.svg && !f.imageUri)) {
      return missingStub('figure', id)
    }
    const kids: ElementContent[] = []
    if (f.svg) {
      kids.push({ type: 'raw', value: f.svg } as unknown as ElementContent)
    } else {
      kids.push({
        type: 'element',
        tagName: 'img',
        properties: { src: f.imageUri, alt: f.title ?? id, className: ['study-fig-img'] },
        children: [],
      })
    }
    const captionKids: ElementContent[] = []
    if (bookFigureIds.has(id)) {
      captionKids.push({
        type: 'element',
        tagName: 'span',
        properties: { className: ['study-fig-badge'] },
        children: [{ type: 'text', value: 'book figure · CC-BY-NC-SA 4.0' }],
      })
    }
    if (f.title) captionKids.push({ type: 'element', tagName: 'span', properties: { className: ['study-fig-title'] }, children: [{ type: 'text', value: f.title }] })
    if (f.caption) captionKids.push({ type: 'element', tagName: 'span', properties: { className: ['study-fig-caption'] }, children: [{ type: 'text', value: f.caption }] })
    if (captionKids.length) kids.push({ type: 'element', tagName: 'figcaption', properties: {}, children: captionKids })
    return { type: 'element', tagName: 'figure', properties: { ...shared, id: `fig-${id}` }, children: kids }
  }
  const walk = (parent: Root | Element) => {
    const kids = parent.children
    for (let ci = 0; ci < kids.length; ci += 1) {
      const child = kids[ci]
      const ref = figRefOf(child)
      if (ref) {
        ;(ref.kind === 'chart' ? embeds?.chartIds : embeds?.figIds)?.add(ref.id)
        kids[ci] = repl(ref.kind, ref.id) as unknown as RootContent
        continue
      }
      if (child.type === 'element') walk(child)
    }
  }
  return (tree: Root) => walk(tree)
}

/** `::eq[id]` marker paragraph → id, or null. */
function eqRefOf(node: RootContent): string | null {
  const m = markerText(node)?.match(EQ_REF)
  return m ? m[1] : null
}

/**
 * `::eq[id]` on its own line + a `$$…$$` display block → the same explainer
 * chrome as the MDX `Equation` component: `.equation-math-wrap` with a hover Σ
 * button, plus a symbol drilldown panel. Symbol rows come from the chapter's
 * `equations.json` so a packet never repeats its own symbol data. Display math
 * without a ref is still wrapped for consistent formatting; the toggle is
 * wired client-side by PacketAnnotator (delegated `data-eq-explainer` clicks).
 */
function rehypeEquationExplainers(symbols: Map<string, EquationSymbol[]>) {
  const sigma: Element = {
    type: 'element',
    tagName: 'svg',
    properties: {
      xmlns: 'http://www.w3.org/2000/svg', width: 12, height: 12, viewBox: '0 0 24 24',
      fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
      'aria-hidden': 'true',
    },
    children: [{ type: 'element', tagName: 'path', properties: { d: 'M18 7V5H6l6 7-6 7h12v-2' }, children: [] }],
  }
  return (tree: Root) => {
    const walk = (parent: Root | Element) => {
      const kids = parent.children
      // The marker paragraph stays in place until its $$ sibling arrives, so
      // an orphaned ::eq becomes a missing stub instead of vanishing quietly.
      let pendingRef: string | null = null
      let pendingIdx = -1
      const flushMissing = () => {
        if (pendingRef !== null && pendingIdx >= 0) {
          kids[pendingIdx] = missingStub('equation', pendingRef) as unknown as RootContent
        }
        pendingRef = null
        pendingIdx = -1
      }
      for (let ci = 0; ci < kids.length; ci += 1) {
        const child = kids[ci]
        const ref = eqRefOf(child)
        if (ref) {
          flushMissing()
          pendingRef = ref
          pendingIdx = ci
          continue
        }
        if (child.type === 'element' && hasClass(child, 'katex-display')) {
          const refId = pendingRef
          const mIdx = pendingIdx
          pendingRef = null
          pendingIdx = -1
          if (refId !== null) {
            // Remove the marker paragraph — the explainer it named is consumed.
            kids.splice(mIdx, 1)
            if (mIdx < ci) ci -= 1
          }
          const rows = refId ? symbols.get(refId) : undefined
          const wrapChildren: ElementContent[] = [child]
          const bodyChildren: ElementContent[] = [
            { type: 'element', tagName: 'div', properties: { className: ['equation-math-wrap'] }, children: wrapChildren },
          ]
          if (rows && rows.length > 0) {
            const panelId = `eqs-${refId}`
            wrapChildren.push({
              type: 'element',
              tagName: 'button',
              properties: {
                type: 'button',
                className: ['equation-explainer'],
                'aria-label': `Explain the ${rows.length === 1 ? 'symbol' : `${rows.length} symbols`} in this equation`,
                'aria-expanded': 'false',
                'aria-controls': panelId,
                'data-eq-explainer': true,
              },
              children: [sigma],
            })
            bodyChildren.push({
              type: 'element',
              tagName: 'div',
              properties: { className: ['equation-symbols'], 'data-pagefind-ignore': true },
              children: [{
                type: 'element',
                tagName: 'div',
                properties: { id: panelId, className: ['equation-symbols-panel'], 'aria-hidden': 'true' },
                children: [{
                  type: 'element',
                  tagName: 'div',
                  properties: { className: ['equation-symbols-inner'] },
                  children: [{
                    type: 'element',
                    tagName: 'dl',
                    properties: {},
                    children: rows.map((s): Element => ({
                      type: 'element',
                      tagName: 'div',
                      properties: { className: ['equation-symbol-row'] },
                      children: [
                        {
                          type: 'element',
                          tagName: 'dt',
                          properties: {},
                          children: [{
                            type: 'raw',
                            value: katex.renderToString(s.symbol, { throwOnError: false, output: 'html' }),
                          } as unknown as ElementContent],
                        },
                        {
                          type: 'element',
                          tagName: 'dd',
                          properties: {},
                          children: [
                            ...(s.name ? [{
                              type: 'element',
                              tagName: 'span',
                              properties: { className: ['equation-symbol-name'] },
                              children: [{ type: 'text', value: s.name }],
                            } as Element] : []),
                            {
                              type: 'element',
                              tagName: 'span',
                              properties: { className: ['equation-symbol-meaning'] },
                              children: [{ type: 'text', value: s.meaning }],
                            },
                          ],
                        },
                      ],
                    })),
                  }],
                }],
              }],
            })
          }
          kids[ci] = {
            type: 'element',
            tagName: 'div',
            properties: { className: ['equation', 'equation-packet'] },
            children: bodyChildren,
          } as ElementContent
          continue
        }
        if (child.type === 'text' && !child.value.trim()) continue
        if (child.type === 'element') walk(child)
        flushMissing()
      }
      flushMissing()
    }
    walk(tree)
  }
}

// Processor is built once and reused across every render call — the plugin
// chain is pure configuration, .process() carries per-document state.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeKatex, { strict: false, throwOnError: false })
  .use(rehypePrettyCode, { theme: 'github-dark' })
  .use(rehypeStudyCallouts)
  .use(rehypeStudyMarks)
  .use(rehypeStringify)

export async function renderMarkdown(
  source: string,
  opts?: {
    equationSymbols?: Map<string, EquationSymbol[]>
    inlineFigures?: Map<string, InlineFigureData>
    bookFigureIds?: Set<string>
    chartInfo?: Map<string, { title?: string; captionHtml: string }>
    embeds?: StudyEmbedReport
  },
): Promise<string> {
  if (!opts?.equationSymbols && !opts?.inlineFigures && !opts?.chartInfo) return String(await processor.process(source))
  const packetPipeline = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeKatex, { strict: false, throwOnError: false })
    .use(rehypePrettyCode, { theme: 'github-dark' })
    .use(rehypeStudyCallouts)
    .use(rehypeStudyMarks)
    .use(rehypeEquationExplainers, opts.equationSymbols ?? new Map())
    .use(rehypeInlineFigures, opts.inlineFigures ?? new Map(), opts.bookFigureIds ?? new Set(), opts.chartInfo ?? new Map(), opts.embeds)
    .use(rehypeStringify, { allowDangerousHtml: true })
  return String(await packetPipeline.process(source))
}
