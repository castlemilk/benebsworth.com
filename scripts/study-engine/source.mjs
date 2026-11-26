const bytes = (text) => Buffer.byteLength(text, 'utf8')
const headingName = (line) => line.replace(/^##\s+/, '').replace(/\s+\{[^}]*\}\s*$/, '').trim()

function parse(qmd) {
  if (typeof qmd !== 'string' || !qmd.trim()) throw new Error('QMD source must be a non-empty string')
  const lines = qmd.split('\n'), sections = []
  let frontmatter = lines[0]?.trim() === '---', fence = null, current = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (frontmatter) {
      if (i > 0 && /^(---|\.\.\.)\s*$/.test(line)) frontmatter = false
      continue
    }
    const mark = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/)
    if (fence) {
      if (mark && mark[1][0] === fence[0] && mark[1].length >= fence.length && !mark[2].trim()) fence = null
      continue
    }
    if (mark) { fence = mark[1]; continue }
    if (/^#\s+\S/.test(line) && current) { current.endLine = i; current = null }
    if (/^##\s+\S/.test(line)) {
      if (current) current.endLine = i
      current = { heading: headingName(line), startLine: i + 1, endLine: lines.length, unlisted: /\.unlisted\b/.test(line) }
      sections.push(current)
    }
  }
  return { lines, sections: sections.filter((s) => !s.unlisted && s.heading) }
}

export function indexChapter(qmd) {
  return parse(qmd).sections.map(({ heading, startLine, endLine }) => ({ heading, startLine, endLine }))
}

export function packSection(qmd, heading, options = {}) {
  const { lines, sections } = parse(qmd)
  if (typeof heading !== 'string' || !heading.trim()) throw new Error('Section heading must be non-empty')
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new Error('Options must be an object')
  const { maxBytes = 7000, terms = [] } = options
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 256) throw new Error('maxBytes must be an integer of at least 256')
  if (!Array.isArray(terms) || terms.some((term) => typeof term !== 'string' || !term.trim())) throw new Error('terms must be an array of non-empty strings')
  const matches = sections.filter((s) => s.heading.toLowerCase() === heading.trim().toLowerCase())
  if (matches.length !== 1) throw new Error(matches.length ? `Ambiguous section heading: ${heading}` : `Unknown section heading: ${heading}`)
  const section = matches[0], blocks = []
  let start = null, fence = null, inMath = false
  function flush(end) {
    if (start !== null) {
      const text = lines.slice(start, end).join('\n')
      if (text.trim()) blocks.push({ startLine: start + 1, endLine: end, text })
      start = null
    }
  }
  for (let i = section.startLine; i < section.endLine; i++) {
    const line = lines[i], mark = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/)
    if (fence) {
      if (mark && mark[1][0] === fence[0] && mark[1].length >= fence.length && !mark[2].trim()) fence = null
      continue
    }
    if (mark) { flush(i); fence = mark[1]; continue }
    if (!inMath && (!line.trim() || /^\s*:::{1,}\s*(?:\{.*\})?\s*$/.test(line) || /^\s*!\[/.test(line))) { flush(i); continue }
    if (start === null) start = i
    if (/^\s*\$\$/.test(line)) inMath = !inMath
    if (!inMath && /^#{3,6}\s/.test(line)) flush(i + 1)
  }
  flush(section.endLine)
  if (!blocks.length) throw new Error(`Section has no textual content: ${heading}`)
  const sectionHeading = { startLine: section.startLine, endLine: section.startLine, text: lines[section.startLine - 1] }
  if (bytes(sectionHeading.text) > maxBytes) throw new Error('maxBytes is too small for the section heading')
  const needles = terms.map((term) => term.toLocaleLowerCase('en-US'))
  const ranked = blocks.map((block, index) => ({ block, index, score: needles.reduce((n, term) => n + (block.text.toLocaleLowerCase('en-US').includes(term) ? 1 : 0), 0) }))
  if (needles.length) ranked.sort((a, b) => b.score - a.score || a.index - b.index)
  let used = bytes(sectionHeading.text)
  const chosen = []
  for (const item of ranked) {
    const size = bytes(item.block.text)
    if (used + size <= maxBytes) { chosen.push(item); used += size }
  }
  chosen.sort((a, b) => a.index - b.index)
  const excerpts = [sectionHeading, ...chosen.map(({ block }) => block)]
  return { heading: section.heading, excerpts, sourceBytes: bytes(qmd), excerptBytes: used,
    omitted: chosen.length !== blocks.length,
    needsVerification: excerpts.some(({ text }) => /`\{(?:python|r|julia|ojs)\}\s*[^`]+`|\{\{<\s*(?:var|meta)\b/i.test(text)),
  }
}
