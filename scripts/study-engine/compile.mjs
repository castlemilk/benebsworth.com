import { JSDOM } from 'jsdom'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { quizMarkdown } from './quiz-markdown.mjs'

const markdown = unified().use(remarkParse).use(remarkGfm).use(remarkMath)
const safeId = /^[A-Za-z0-9][A-Za-z0-9_-]*$/
const marker = /^::(fig|chart|eq)\[([A-Za-z0-9][A-Za-z0-9_-]*)\]$/
const markerStart = /^[ \t]*::(?:fig|chart|eq)\[/
const json = (value) => JSON.stringify(value, null, 2) + '\n'
const plainText = (node) => node.value ?? node.children?.map(plainText).join('') ?? ''

function need(condition, message) {
  if (!condition) throw new Error(message)
}

function string(value, field, { empty = false, line = false } = {}) {
  need(typeof value === 'string' && (empty || value.trim()), field + ' must contain text')
  const clean = value.replace(/\r\n?/g, '\n').trim()
  need(!line || !clean.includes('\n'), field + ' must be one line')
  return clean
}

function array(value, field, min = 0) {
  need(Array.isArray(value) && value.length >= min && Array.from(value).every((item) => item != null),
    field + (min ? ' needs at least ' + min + ' entries' : ' must be an array'))
  return value
}

function object(value, field) {
  need(value !== null && typeof value === 'object' && !Array.isArray(value), field + ' must be an object')
  return value
}

function unique(known, value, field) {
  need(!known.has(value), 'Duplicate ' + field + ' "' + value + '"')
  known.add(value)
  return value
}

function id(value, field, known = new Set()) {
  need(typeof value === 'string' && safeId.test(value), field + ' must be a path-safe ID')
  unique(known, value.toLowerCase(), field)
  return value
}

function metadata(entry, field, ids) {
  const key = id(entry.id, field + ' id', ids)
  return {
    id: key,
    title: string(entry.title, field + ' ' + key + ' title', { line: true }),
    caption: string(entry.caption, field + ' ' + key + ' caption'),
  }
}

function compileCharts(entries, figureIds) {
  return entries.map((input) => {
    const { kind, xLabel, yLabel, xPoints, series } = object(input, 'Chart')
    const chart = metadata(input, 'Chart', figureIds)
    const field = 'Chart ' + chart.id
    need(['LINE', 'BAR_STACKED', 'IRON_LAW_EXPLORER'].includes(kind), field + ' has an unknown kind')
    const points = array(xPoints, field + ' xPoints', 1).map((point) => string(point, field + ' xPoint', { line: true }))
    if (kind === 'LINE') {
      need(points.every((point) => /^\d{4}-\d{2}-\d{2}/.test(point) && Number.isFinite(Date.parse(point))),
        field + ' LINE xPoints must be ISO dates')
    }
    const keys = new Set()
    const data = array(series, field + ' series', 1).map((entry) => {
      const s = object(entry, field + ' series entry')
      const key = id(s.key, field + ' series key', keys)
      need(!['name', 'date', 'constructor', 'prototype'].includes(key), field + ' uses reserved series key ' + key)
      const values = array(s.values, field + ' ' + key + ' values')
      need(values.length === points.length && values.every(Number.isFinite),
        field + ' ' + key + ' needs one finite number per xPoint')
      return { key, label: string(s.label, field + ' ' + key + ' label'), color: string(s.color, field + ' ' + key + ' color'), values }
    })
    if (kind === 'IRON_LAW_EXPLORER') {
      need(points.length === 1 && keys.size === 3 && ['movement', 'compute', 'overhead'].every((key) => keys.has(key)) &&
        data.every((s) => s.values[0] >= 0), field + ' needs one baseline and nonnegative movement, compute and overhead terms')
    }
    return { ...chart, kind, xLabel: string(xLabel ?? '', field + ' xLabel', { empty: true, line: true }),
      yLabel: string(yLabel ?? '', field + ' yLabel', { empty: true, line: true }), xPoints: points, series: data }
  })
}

function compileEquations(entries) {
  const ids = new Set()
  const numbers = new Set()
  return entries.map((input) => {
    const { number, latex, symbols } = object(input, 'Equation')
    const equation = metadata(input, 'Equation', ids)
    const field = 'Equation ' + equation.id
    need(Number.isInteger(number) && number > 0 && number <= 2_147_483_647, field + ' number must be a positive integer')
    unique(numbers, number, 'equation number')
    const formula = string(latex, field + ' latex')
    need(!/(^|\n)[ \t]*\${2,}/.test(formula), field + ' latex needs raw TeX without display fences')
    const rows = array(symbols, field + ' symbols', 1).map((item) => {
      const row = object(item, field + ' symbol entry')
      return { symbol: string(row.symbol, field + ' symbol'), name: string(row.name, field + ' symbol name'),
        meaning: string(row.meaning, field + ' symbol meaning') }
    })
    return { ...equation, number, latex: formula, symbols: rows }
  })
}

function compileQuiz(entries, chapterId, title) {
  const questionIds = new Set()
  const questions = entries.map((entry) => {
    const { kind, source, prompt, options, correctOptionId, modelAnswer, explanation } = object(entry, 'Quiz question')
    const key = id(entry.id, 'Quiz question id', questionIds)
    const field = 'Quiz question ' + key
    need(['MCQ', 'FEYNMAN', 'NUMERIC'].includes(kind), field + ' has an unknown kind')
    need(['BOOK', 'ORIGINAL'].includes(source), field + ' has an unknown source')
    const question = { id: key, kind, source, prompt: string(prompt, field + ' prompt') }
    if (kind === 'MCQ') {
      need(modelAnswer === undefined, field + ' requires explanation for MCQ')
      const optionIds = new Set()
      const choices = array(options, field + ' options', 2).map((option) => ({
        id: id(object(option, field + ' option').id, field + ' option id', optionIds),
        label: string(option.label, field + ' option label'),
      }))
      need(choices.length <= 26, field + ' supports at most 26 lettered options')
      need(choices.some((option) => option.id === correctOptionId), field + ' correctOptionId must match an option')
      return { ...question, options: choices, correctOptionId, explanation: string(explanation, field + ' explanation') }
    }
    need((options === undefined || (Array.isArray(options) && options.length === 0)) &&
      (correctOptionId === undefined || correctOptionId === ''), field + ' options and correctOptionId apply to MCQ only')
    return { ...question, modelAnswer: string(modelAnswer, field + ' modelAnswer'),
      ...(explanation === undefined ? {} : { explanation: string(explanation, field + ' explanation') }) }
  })
  return { chapterId, title: title + ' self-test', questions }
}

const svgNamespace = 'http://www.w3.org/2000/svg'
function escapeXml(text) {
  need(text.isWellFormed() && [...text].every((char) => {
    const code = char.codePointAt(0)
    return [9, 10, 13].includes(code) || (code >= 32 && code !== 0xfffe && code !== 0xffff)
  }), 'SVG text contains an invalid XML character')
  return text.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[char])
}
const svgTags = new Set('svg g title desc defs clipPath marker linearGradient radialGradient stop path rect circle ellipse line polyline polygon text tspan'.split(' '))
const svgAttrs = new Set(('xmlns id class role aria-hidden aria-label aria-labelledby aria-describedby viewBox width height ' +
  'preserveAspectRatio fill fill-rule fill-opacity opacity stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin ' +
  'stroke-miterlimit stroke-dasharray stroke-dashoffset x y x1 x2 y1 y2 cx cy r rx ry dx dy d points ' +
  'transform vector-effect clip-path clip-rule clipPathUnits font-family font-size font-weight letter-spacing text-anchor ' +
  'dominant-baseline alignment-baseline textLength lengthAdjust offset stop-color stop-opacity gradientUnits gradientTransform ' +
  'marker-start marker-mid marker-end markerWidth markerHeight markerUnits refX refY orient').split(' '))
const dimensions = new Set('width height x y x1 x2 y1 y2 cx cy r rx ry dx dy stroke-width font-size textLength markerWidth markerHeight refX refY'.split(' '))
const coordinateLists = new Set('viewBox d points transform gradientTransform'.split(' '))
const svgNumber = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i
const svgNumbers = /[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi
const maxSvg = 8192
const bounded = (value) => svgNumber.test(value) && Math.abs(Number(value)) <= maxSvg

function customSvg(diagram) {
  const field = 'Diagram ' + diagram.id + ' SVG'
  const svg = string(diagram.svg, field)
  need(svg.length <= 250_000 && /^<svg(?=[\s>])/.test(svg) && !/<!|<\?/.test(svg),
    field + ' needs a bounded SVG root without declarations')
  const source = svg.replace(/^<svg\b[^>]*>/, (root) =>
    /\sxmlns\s*=/.test(root) ? root : root.replace('<svg', '<svg xmlns="' + svgNamespace + '"'))
  let dom
  try {
    dom = new JSDOM(source, { contentType: 'image/svg+xml' })
  } catch {
    throw new Error(field + ' is malformed')
  }
  try {
    const document = dom.window.document
    const root = document.documentElement
    const bounds = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/)
    need(bounds.length === 4 && bounds.every(bounded) && bounds.slice(2).every((value) => Number(value) > 0),
      field + ' needs a finite, positive viewBox within ' + maxSvg + ' units')
    const nodes = [root, ...root.querySelectorAll('*')]
    const ids = new Map()
    const prefix = 'study-svg-' + diagram.id + '-'
    for (const node of nodes) {
      need(node.namespaceURI === svgNamespace && !node.prefix && svgTags.has(node.localName),
        field + ' has unsupported element ' + node.tagName)
      if (node.hasAttribute('id')) {
        const value = node.getAttribute('id')
        need(safeId.test(value) && !ids.has(value), field + ' needs distinct path-safe SVG IDs')
        ids.set(value, prefix + 'node-' + value)
      }
    }
    for (const node of nodes) {
      for (const { name, value } of [...node.attributes]) {
        need(svgAttrs.has(name) && (name !== 'xmlns' || value === svgNamespace) && !value.includes('\\'),
          field + ' has unsupported attribute ' + name)
        if (dimensions.has(name)) {
          need(value.trim().split(/[\s,]+/).every(bounded), field + ' ' + name + ' needs finite, bounded dimensions')
        }
        if (coordinateLists.has(name)) {
          const extra = value.replace(svgNumbers, (coordinate) => {
            need(bounded(coordinate), field + ' ' + name + ' needs finite, bounded coordinates')
            return ''
          }).replace(/matrix|translate|scale|rotate|skewX|skewY/g, '')
          need(/^[MmLlHhVvCcSsQqTtAaZz(),\s]*$/.test(extra), field + ' ' + name + ' needs finite, bounded coordinates')
        }
        if (/url\s*\(/i.test(value)) {
          const target = /^url\(#([A-Za-z0-9_-]+)\)$/.exec(value)?.[1]
          need(ids.has(target), field + ' has an unsupported SVG reference')
          node.setAttribute(name, 'url(#' + ids.get(target) + ')')
        }
        if (name === 'id') node.setAttribute(name, ids.get(value))
        if (name === 'aria-labelledby' || name === 'aria-describedby') {
          const refs = value.trim().split(/\s+/)
          need(refs.every((ref) => ids.has(ref)), field + ' has an unknown ' + name + ' reference')
          node.setAttribute(name, refs.map((ref) => ids.get(ref)).join(' '))
        }
      }
    }
    for (const [tag, fallback] of [['title', diagram.title], ['desc', diagram.caption]]) {
      const existing = [...root.children].find((node) => node.localName === tag)
      const node = existing ?? document.createElementNS(svgNamespace, tag)
      if (!node.textContent.trim()) node.textContent = fallback
      if (!existing) root.prepend(node)
      if (!node.id) node.id = prefix + tag
      root.setAttribute(tag === 'title' ? 'aria-labelledby' : 'aria-describedby', node.id)
    }
    root.setAttribute('role', 'img')
    root.removeAttribute('aria-hidden')
    return new dom.window.XMLSerializer().serializeToString(root) + '\n'
  } finally {
    dom.window.close()
  }
}

function barSvg(diagram) {
  const field = 'Diagram ' + diagram.id
  const unit = string(diagram.unit, field + ' unit', { line: true })
  need(textUnits(unit) <= 24, field + ' unit is too long for a bar label')
  const rows = array(diagram.rows, field + ' rows', 1)
  need(rows.length <= 16, field + ' supports at most 16 bar rows')
  const labels = new Set()
  const data = rows.map((entry) => {
    const row = object(entry, field + ' bar row')
    const label = string(row.label, field + ' bar label', { line: true })
    need(textUnits(label) <= 28, field + ' bar label is too long: ' + label)
    need(Number.isFinite(row.value), field + ' ' + label + ' value must be finite')
    return { label: unique(labels, label, field + ' bar label'), value: row.value }
  })
  const extent = Math.max(...data.map(({ value }) => Math.abs(value))) || 1
  // Normalize first so the span stays finite even for opposite extremes.
  const min = Math.min(0, ...data.map(({ value }) => value / extent))
  const max = Math.max(0, ...data.map(({ value }) => value / extent)) || (min === 0 ? 1 : 0)
  const position = (value) => Math.round(16 + 312 * (value / extent - min) / (max - min))
  const baseline = position(0)
  const height = 35 + data.length * 66
  const bars = data.map(({ label, value }, index) => {
    const x = position(value)
    const y = 43 + index * 66
    return '  <text x="16" y="' + y + '" font-size="15">' + escapeXml(label) + '</text>\n' +
      '  <text x="328" y="' + (y + 38) + '" font-size="14" text-anchor="end">' + value + '</text>\n' +
      '  <rect x="16" y="' + (y + 8) + '" width="312" height="12" rx="3" fill="var(--surface-2, #e7dbcb)"/>\n' +
      '  <rect x="' + Math.min(baseline, x) + '" y="' + (y + 8) + '" width="' + Math.abs(x - baseline) +
      '" height="12" rx="3" fill="var(--blog, #984720)"/>\n' +
      '  <line x1="' + baseline + '" x2="' + baseline + '" y1="' + (y + 7) + '" y2="' + (y + 21) + '" stroke="var(--fg, #4b3a2d)"/>'
  })
  const summary = data.map(({ label, value }) => label + ': ' + value + ' ' + unit).join('. ') + '.'
  return svgFrame(diagram, 344, height, summary, [
    '  <rect x="0" y="0" width="344" height="' + height + '" rx="8" fill="var(--surface, #fbf7f0)"/>',
    '  <g fill="var(--fg, #31251d)" font-family="ui-monospace, monospace">',
    '  <text x="328" y="22" font-size="13.5" text-anchor="end">' + escapeXml(unit) + '</text>',
    ...bars, '  </g>',
  ])
}

function svgFrame(diagram, width, height, summary, artwork) {
  const prefix = 'study-svg-' + diagram.id
  return [
    '<svg xmlns="' + svgNamespace + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="' + prefix +
      '-title" aria-describedby="' + prefix + '-desc" class="study-fig-fit" font-family="system-ui, sans-serif">',
    '  <title id="' + prefix + '-title">' + escapeXml(diagram.title) + '</title>',
    '  <desc id="' + prefix + '-desc">' + escapeXml(diagram.caption + ' ' + summary) + '</desc>',
    ...artwork, '</svg>', '',
  ].join('\n')
}

// Include extra space for wide characters while laying out monospaced text.
const textUnits = (value) => [...value].reduce((width, char) => width + (char.codePointAt(0) > 0xff ? 2 : 1), 0)

function flowSvg(diagram) {
  const field = 'Diagram ' + diagram.id + ' flow'
  const steps = array(diagram.steps, field + ' steps', 2)
  need(steps.length <= 6, field + ' supports at most six steps')
  const readout = []
  const artwork = []
  let y = 3
  for (const [index, entry] of steps.entries()) {
    const step = object(entry, field + ' step ' + (index + 1))
    const label = string(step.label, field + ' step label', { line: true })
    const detail = string(step.detail, field + ' step detail', { line: true })
    need(textUnits(label) <= 28, field + ' step label is too long: ' + label)
    const lines = ['']
    for (const word of detail.split(/\s+/)) {
      need(textUnits(word) <= 36, field + ' step detail contains a word too long to wrap')
      const joined = [lines.at(-1), word].filter(Boolean).join(' ')
      if (textUnits(joined) <= 36) lines[lines.length - 1] = joined
      else lines.push(word)
    }
    need(lines.length <= 3, field + ' step detail must fit on three lines')
    const cardHeight = 43 + lines.length * 17
    artwork.push(
      '  <rect x="3" y="' + y + '" width="338" height="' + cardHeight + '" rx="8" fill="var(--surface, #fbf7f0)" stroke="var(--border, #c9bbae)"/>',
      '  <text x="19" y="' + (y + 24) + '" font-size="15" font-weight="700" fill="var(--fg, #31251d)">' + escapeXml(label) + '</text>',
      '  <text font-size="13.5" fill="var(--fg, #31251d)">' + lines.map((line, row) =>
        '<tspan x="19" y="' + (y + 44 + row * 17) + '">' + escapeXml(line) + '</tspan>').join('\n    ') + '</text>',
    )
    readout.push(label + ': ' + detail)
    y += cardHeight
    if (index < steps.length - 1) {
      artwork.push('  <path d="M172 ' + (y + 4) + 'v14m-4-4 4 4 4-4" fill="none" stroke="var(--blog, #984720)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>')
      y += 24
    }
  }
  return svgFrame(diagram, 344, y + 3, readout.join(' Then '), [
    '  <g font-family="ui-monospace, monospace">', ...artwork, '  </g>',
  ])
}

function compileBlock(body, field, references) {
  const nodes = markdown.parse(body).children
  const replacements = []
  const markers = new Set()
  const inspect = (node, topLevel) => {
    if (node.type === 'heading' && topLevel) {
      need(node.depth > 3, field + ' contains a heading; use a separate recipe section for H1–H3')
    }
    if (node.type === 'paragraph') {
      const { start, end } = node.position
      const raw = body.slice(start.offset, end.offset)
      if (raw.split('\n').some((line) => markerStart.test(line))) {
        const ref = marker.exec(raw)
        need(ref && topLevel && start.column === 1 && node.children.length === 1 && node.children[0].type === 'text',
          field + ' requires a standalone, top-level marker: ' + raw)
        const [, kind, key] = ref
        need(references[kind].has(key), field + ' uses unknown ' + kind + ' marker ' + raw)
        unique(markers, raw, field + ' marker')
      }
    }
    for (const child of node.children ?? []) inspect(child, false)
  }
  for (const [index, node] of nodes.entries()) {
    inspect(node, true)
    if (node.type !== 'paragraph') continue
    const raw = body.slice(node.position.start.offset, node.position.end.offset)
    const ref = marker.exec(raw)
    if (ref?.[1] !== 'eq') continue
    const key = ref[2]
    const latex = references.eq.get(key)
    const next = nodes[index + 1]
    if (next?.type === 'math') {
      const display = body.slice(next.position.start.offset, next.position.end.offset)
      need(/^\$\$[ \t]*\n[\s\S]+\n\$\$[ \t]*$/.test(display), field + ' equation ' + key + ' requires a closed $$ display fence')
      need(next.value.trim() === latex, field + ' equation ' + key + ' differs from equations.json')
    } else {
      const after = body.slice(node.position.end.offset).trimStart()
      need(!after.startsWith('$$'), field + ' equation ' + key + ' requires a closed $$ display fence')
      replacements.push([node.position.end.offset, '\n$$\n' + latex + '\n$$'])
    }
  }
  for (const [offset, inserted] of replacements.reverse()) body = body.slice(0, offset) + inserted + body.slice(offset)
  const hasContent = nodes.some((node) => node.type !== 'html' || !node.value.trim().startsWith('<!--'))
  return { body, markers, hasContent }
}

function compilePacket(sections, intro, title, question, references) {
  const plan = []
  const blocks = []
  const headings = new Set()
  const expected = []
  const embedded = new Set()
  const trackEmbeds = (markers) => {
    for (const ref of markers) {
      if (!ref.startsWith('::eq[')) unique(embedded, ref, 'embedded figure or chart')
    }
  }
  const introduction = compileBlock(intro, 'Recipe intro', references)
  trackEmbeds(introduction.markers)
  expected.push({ heading: 'Packet introduction', markers: introduction.markers })
  let primary = 0
  for (const [index, input] of sections.entries()) {
    const { level = 2, figure, proseOnly, teaches, source } = object(input, 'Recipe section')
    need(level === 2 || level === 3, 'Recipe section level must be 2 or 3')
    const heading = '#'.repeat(level) + ' ' + string(input.heading, 'Recipe section heading', { line: true })
    const [node] = markdown.parse(heading).children
    const visible = plainText(node)
    need(node.type === 'heading' && visible, 'Recipe section needs a visible heading')
    unique(headings, visible, 'section heading')
    const field = 'Section "' + visible + '"'
    let body = string(input.body ?? '', field + ' body', { empty: true })
    if (figure !== undefined) {
      const target = marker.exec(figure)
      need(target && ['fig', 'chart'].includes(target[1]), field + ' figure needs a full ::fig or ::chart marker')
      const original = compileBlock(body, field, references)
      if (!original.markers.has(figure)) body = [body, figure].filter(Boolean).join('\n\n')
    }
    const checked = compileBlock(body, field, references)
    trackEmbeds(checked.markers)
    const assets = [...checked.markers].filter((ref) => references.primary.has(ref))
    if (proseOnly !== undefined) {
      need(figure === undefined && teaches === undefined && source === undefined &&
        [...checked.markers].every((ref) => ref.startsWith('::eq[')),
        field + ' proseOnly conflicts with figure fields or markers')
      need(checked.hasContent, field + ' proseOnly needs content')
      plan.push([visible, { proseOnly: string(proseOnly, field + ' proseOnly') }])
    } else if (checked.hasContent || figure !== undefined || teaches !== undefined || source !== undefined) {
      const chosen = figure ?? (assets.length === 1 ? assets[0] : undefined)
      need(assets.includes(chosen), field + ' needs a local primary figure or chart, or a proseOnly reason')
      plan.push([visible, { figure: chosen, teaches: string(teaches, field + ' teaches'), source: string(source, field + ' source') }])
      primary += 1
    } else {
      need(level === 2 && sections[index + 1]?.level === 3, field + ' needs content or child headings')
    }
    blocks.push([heading, checked.body].filter(Boolean).join('\n\n'))
    expected.push({ heading: visible, markers: checked.markers })
  }
  need(primary > 0, 'Diagram plan needs at least one section with a local figure or chart')
  const content = ['# ' + title + ': Study Packet', introduction.body, ...blocks].filter(Boolean).join('\n\n') + '\n'
  validatePacketStructure(content, expected)
  return {
    packet: '---\nopeningQuestion: ' + JSON.stringify(question) + '\n---\n\n' + content,
    plan: { source: 'packet.md', sections: Object.fromEntries(plan) },
  }
}

function validatePacketStructure(content, expected) {
  // Reference definitions and open fences can change how another block parses.
  // Validate the complete packet with the same Markdown syntax as the consumers.
  let index = 0
  let seen = new Set()
  const checkMarkers = () => {
    const { heading, markers } = expected[index]
    for (const ref of markers) {
      need(seen.has(ref), heading + ' needs a standalone marker in the assembled packet: ' + ref)
    }
  }
  for (const node of markdown.parse(content).children) {
    if (node.type === 'heading' && [2, 3].includes(node.depth)) {
      checkMarkers()
      index += 1
      need(expected[index]?.heading === plainText(node), 'Expected packet heading "' + expected[index]?.heading + '"')
      seen = new Set()
    }
    if (node.type === 'paragraph' && node.children.length === 1 && node.children[0].type === 'text') {
      seen.add(node.children[0].value)
    }
  }
  need(index === expected.length - 1, 'Missing packet heading "' + expected[index + 1]?.heading + '"')
  checkMarkers()
}

const figureKinds = new Map([['bars', barSvg], ['flow', flowSvg], ['custom', customSvg]])

export function compileDiagram(entry, ids = new Set()) {
  const input = object(entry, 'Diagram')
  const diagram = metadata(input, 'Diagram', ids)
  const render = figureKinds.get(input.kind)
  need(render, 'Diagram ' + diagram.id + ' has an unknown kind')
  return { manifest: { ...diagram, file: diagram.id + '.svg' }, svg: render({ ...input, ...diagram }) }
}

/** Compile the editable chapter recipe into the files consumed by /study. */
export function compileLesson(recipe) {
  object(recipe, 'Recipe')
  need(typeof recipe.id === 'string' && recipe.id.split('/').every((part) => safeId.test(part)),
    'recipe.id must contain path-safe ID segments')
  const title = string(recipe.title, 'Recipe title', { line: true })
  const question = string(recipe.question, 'Recipe question', { line: true })
  const items = (field, min = 0) => array(recipe[field] === undefined ? [] : recipe[field], 'Recipe ' + field, min)
  const figureIds = new Set()
  const artifacts = new Map()
  const diagrams = items('diagrams').map(entry => {
    const { manifest, svg } = compileDiagram(entry, figureIds)
    artifacts.set('diagrams/' + manifest.file, svg)
    return manifest
  })
  const bookFigures = items('bookFigures').map((entry) => {
    const input = object(entry, 'Book figure')
    const figure = metadata(input, 'Book figure', figureIds)
    need(typeof input.file === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(input.file) && !input.file.endsWith('.'),
      'Book figure ' + figure.id + ' file must be path-safe')
    return { ...figure, file: input.file }
  })
  const charts = compileCharts(items('charts'), figureIds)
  const equations = compileEquations(items('equations'))
  const quiz = compileQuiz(items('questions'), recipe.id, title)
  const references = {
    fig: new Set([...diagrams, ...bookFigures].map((item) => item.id)),
    chart: new Set(charts.map((item) => item.id)),
    eq: new Map(equations.map((item) => [item.id, item.latex])),
    primary: new Set([...diagrams.map((item) => '::fig[' + item.id + ']'), ...charts.map((item) => '::chart[' + item.id + ']')]),
  }
  const intro = string(recipe.intro ?? '', 'Recipe intro', { empty: true })
  const { packet, plan } = compilePacket(items('sections', 1), intro, title, question, references)
  for (const [file, data] of [
    ['diagram-plan', plan], ['diagrams', diagrams], ['charts', charts], ['equations', equations],
    ['book-figures', bookFigures], ['quiz', quiz],
  ]) artifacts.set(file + '.json', json(data))
  artifacts.set('packet.md', packet)
  artifacts.set('quiz.md', quizMarkdown(quiz))
  if (recipe.podcast !== undefined) {
    const podcast = string(recipe.podcast, 'Recipe podcast')
    for (const line of podcast.split('\n').map((text) => text.trim())) {
      if (line.startsWith('::eq[')) need(references.eq.has(marker.exec(line)?.[2]), 'Recipe podcast uses unknown equation marker ' + line)
      if (line.startsWith('::fig[')) need(diagrams.some(d => d.id === marker.exec(line)?.[2]), 'Recipe podcast uses unknown slide figure ' + line)
    }
    artifacts.set('podcast.md', podcast + '\n')
  }
  return artifacts
}
