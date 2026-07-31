import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { extname, relative, resolve } from 'node:path'

export const MARKETING_ADJECTIVES = [
  'seamless', 'seamlessly', 'robust', 'powerful', 'cutting-edge', 'effortless', 'effortlessly',
  'world-class', 'next-generation', 'revolutionary', 'blazing', 'lightning-fast', 'elegant',
  'delightful', 'turnkey', 'best-in-class', 'state-of-the-art', 'game-changing', 'first-class',
  'battle-tested', 'enterprise-grade', 'supercharge', 'unlock', 'unleash', 'empower', 'empowers',
]

export const AI_TELL_PHRASES = [
  'in conclusion', 'in summary', 'it is important to note', 'it should be noted',
  'it is worth noting', 'please note that', 'as mentioned above', 'as noted above',
  'prior to', 'subsequent to', 'aforementioned', 'henceforth', 'therein', 'whilst', 'amongst',
  'a myriad of', 'a plethora of', 'in order to', 'in the event that', 'due to the fact that',
  'begin', 'begins', 'commence', 'commences', 'initiate', 'initiates', 'originate',
  'utilize', 'utilizes', 'utilizing', 'leverage', 'leverages', 'leveraging', 'facilitate',
  'facilitates', 'ensure', 'ensures', 'ensuring', 'obtain', 'obtains', 'acquire', 'acquires',
  'demonstrate', 'demonstrates', 'additionally', 'furthermore', 'moreover', 'comprehensive',
  'comprehensively', 'utilization', 'numerous', 'myriad', 'plethora',
]

export const PHRASAL_VERBS = [
  'spin up', 'spin down', 'reach out', 'dive into', 'dives into', 'diving into', 'kick off',
  'kicks off', 'roll out', 'rolls out', 'tear down', 'ramp up', 'circle back', 'drill down',
  'spun up', 'reaching out',
]

export const MODAL_HEDGES = [
  'it is important to note', 'it should be noted', 'it is worth noting', 'please note that',
  'as mentioned', 'as noted above',
]

export const AUSTRALIAN_ALLOWLIST = new Set(['utilise', 'utilises', 'utilising', 'optimise', 'optimises', 'optimising', 'minimise', 'minimises', 'minimising', 'initialise', 'initialises', 'initialising', 'visualise', 'visualises', 'visualising'])
const USER_FACING_NAMES = /^(?:title|description|label|heading|headline|blurb|caption|alt|placeholder|message|subtitle|context|text|name|ariaLabel|aria-label)$/i
const SELECTED_ATTR = /^(?:aria-label|alt|title|placeholder|aria-description|aria-describedby)$/i

function blankRange(chars, start, end) {
  for (let i = Math.max(0, start); i < Math.min(chars.length, end); i += 1) {
    if (chars[i] !== '\n' && chars[i] !== '\r') chars[i] = ' '
  }
}

function exposeRange(chars, source, start, end) {
  for (let i = Math.max(0, start); i < Math.min(chars.length, end); i += 1) chars[i] = source[i]
}

function lineColumn(source, offset) {
  const before = source.slice(0, offset)
  const line = before.split('\n').length
  const lastNewline = before.lastIndexOf('\n')
  return { line, column: offset - lastNewline }
}

function spanFor(source, start, end) {
  const pos = lineColumn(source, start)
  return { start, end, line: pos.line, column: pos.column, text: source.slice(start, end) }
}

function makeSpans(source, chars) {
  const spans = []
  let lineStart = 0
  while (lineStart <= chars.length) {
    const lineEnd = source.indexOf('\n', lineStart) < 0 ? source.length : source.indexOf('\n', lineStart)
    const visible = chars.slice(lineStart, lineEnd).map((char, index) => ({ char, index })).filter(({ char }) => /\S/.test(char))
    if (visible.length) spans.push(spanFor(source, lineStart + visible[0].index, lineStart + visible.at(-1).index + 1))
    if (lineEnd === source.length) break
    lineStart = lineEnd + 1
  }
  return spans
}

function findClosing(source, start, delimiter) {
  let index = start
  while ((index = source.indexOf(delimiter, index)) >= 0) {
    let slashCount = 0
    for (let i = index - 1; i >= 0 && source[i] === '\\'; i -= 1) slashCount += 1
    if (slashCount % 2 === 0) return index
    index += delimiter.length
  }
  return -1
}

function findJsxTagEnd(source, start) {
  let quote = null
  let braces = 0
  for (let cursor = start + 1; cursor < source.length; cursor += 1) {
    if (quote) {
      if (source[cursor] === '\\') { cursor += 1; continue }
      if (source[cursor] === quote) quote = null
    } else if (braces && source.startsWith('//', cursor)) {
      const lineEnd = source.indexOf('\n', cursor + 2)
      if (lineEnd < 0) return -1
      cursor = lineEnd
    } else if (braces && source.startsWith('/*', cursor)) {
      const commentEnd = source.indexOf('*/', cursor + 2)
      if (commentEnd < 0) return -1
      cursor = commentEnd + 1
    } else if (source[cursor] === '"' || source[cursor] === "'" || source[cursor] === '`') quote = source[cursor]
    else if (source[cursor] === '{') braces += 1
    else if (source[cursor] === '}' && braces) braces -= 1
    else if (source[cursor] === '>' && braces === 0) return cursor
  }
  return -1
}

function maskExpressionsInRanges(chars, source, ranges, errors = []) {
  for (const [rangeStart, rangeEnd] of ranges) {
    let cursor = rangeStart
    while (cursor < rangeEnd) {
      if (chars[cursor] === ' ' || source[cursor] !== '{') { cursor += 1; continue }
      let depth = 1
      let quote = null
      let end = cursor + 1
      while (end < rangeEnd && depth) {
        const char = source[end]
        if (quote) {
          if (char === '\\') end += 2
          else { if (char === quote) quote = null; end += 1 }
          continue
        }
        if (source.startsWith('//', end)) {
          const lineEnd = source.indexOf('\n', end + 2)
          end = lineEnd < 0 ? rangeEnd : lineEnd
          continue
        }
        if (source.startsWith('/*', end)) {
          const commentEnd = source.indexOf('*/', end + 2)
          if (commentEnd < 0) { errors.push({ rule: 'masking', severity: 'error', match: 'unterminated JSX comment', ...lineColumn(source, end) }); end = rangeEnd; break }
          end = commentEnd + 2
          continue
        }
        if (char === '/' && source[end - 1] !== '*' && source[end + 1] !== '/' && source[end + 1] !== '*' && regexCanStart(source, end)) {
          const regexEnd = consumeRegex(source, end)
          if (regexEnd < 0) { errors.push({ rule: 'masking', severity: 'error', match: 'unterminated regex in JSX expression', ...lineColumn(source, end) }); end = rangeEnd; break }
          end = regexEnd
          continue
        }
        if (char === '"' || char === "'" || char === '`') quote = char
        else if (char === '{') depth += 1
        else if (char === '}') depth -= 1
        end += 1
      }
      if (depth) {
        blankRange(chars, cursor, rangeEnd)
        const nestedTag = source[rangeEnd] === '<' && source[rangeEnd + 1] !== '/'
        const nextBrace = source.indexOf('}', rangeEnd)
        const hasNestedExpressionClose = nestedTag && nextBrace >= 0
        if (!hasNestedExpressionClose) errors.push({ rule: 'masking', severity: 'error', match: 'unterminated JSX expression', ...lineColumn(source, cursor) })
        break
      }
      blankRange(chars, cursor, end)
      cursor = end
    }
  }
}

function findJsxTextRanges(source, ignoredRanges) {
  const ranges = []
  let cursor = 0
  while (cursor < source.length) {
    const tagStart = source.indexOf('<', cursor)
    if (tagStart < 0) break
    if (ignoredRanges.some(([start, end]) => tagStart >= start && tagStart < end) || !/^<\/?[A-Za-z]/.test(source.slice(tagStart))) { cursor = tagStart + 1; continue }
    const tagEnd = findJsxTagEnd(source, tagStart)
    if (tagEnd < 0) break
    if (source[tagEnd - 1] !== '/' && source[tagStart + 1] !== '/') {
      const nextTag = source.indexOf('<', tagEnd + 1)
      if (nextTag > tagEnd + 1 && !ignoredRanges.some(([start, end]) => tagEnd + 1 >= start && tagEnd + 1 < end)) ranges.push([tagEnd + 1, nextTag])
    }
    cursor = tagEnd + 1
  }
  return ranges
}

function findMathClosing(source, start, delimiter) {
  let cursor = start
  while ((cursor = source.indexOf(delimiter, cursor)) >= 0) {
    if (delimiter === '$' && (source[cursor - 1] === '$' || source[cursor + 1] === '$' || (/[A-Za-z0-9]/.test(source[cursor + 1] ?? '') && /\s/.test(source[cursor - 1] ?? '')))) {
      cursor += 1
      continue
    }
    return cursor
  }
  return -1
}

function maskUrls(chars, source) {
  const urlPattern = /(?:https?:\/\/|www\.)[^\s)<>"']+/gi
  for (const match of source.matchAll(urlPattern)) blankRange(chars, match.index, match.index + match[0].length)
}

function extractMdx(filePath, source) {
  const chars = source.split('')
  const errors = []
  const hasFrontmatter = source.startsWith('---')
  const opening = source.match(/^---(?:\r?\n)/)
  let frontmatterEnd = -1
  let frontmatterCloseEnd = -1
  if (opening) {
    const closingRe = /^---[ \t]*(?:\r?\n|$)/gm
    closingRe.lastIndex = opening[0].length
    const closing = closingRe.exec(source)
    if (closing) {
      frontmatterEnd = closing.index
      frontmatterCloseEnd = closing.index + closing[0].length
    }
  }
  if (hasFrontmatter) {
    if (!opening || frontmatterEnd < 0) {
      blankRange(chars, 0, source.length)
      errors.push({ rule: 'masking', severity: 'error', match: 'unterminated frontmatter', ...lineColumn(source, 0) })
    } else {
      const end = frontmatterCloseEnd
      blankRange(chars, 0, end)
      const header = source.slice(0, end)
      let field = null
      let offset = 0
      for (const line of header.split(/\r?\n/)) {
        const match = line.match(/^\s*(title|description|takeaways)\s*:\s*(.*)$/)
        if (match) {
          field = match[1]
          const valueStart = offset + line.indexOf(match[2])
          if (match[2]) exposeRange(chars, source, valueStart, offset + line.length)
        } else if (field === 'takeaways' && /^\s*-\s+/.test(line)) {
          const valueStart = offset + line.search(/\S/)
          const dash = source.indexOf('-', valueStart)
          exposeRange(chars, source, dash + 1, offset + line.length)
        } else if (/^\s*[A-Za-z][\w-]*\s*:/.test(line)) field = null
        offset += line.length + (header.slice(offset + line.length).startsWith('\r\n') ? 2 : 1)
      }
    }
  }

  const bodyStart = opening && frontmatterEnd >= 0 ? frontmatterCloseEnd : 0
  for (const match of source.matchAll(/<!--[\s\S]*?-->/g)) blankRange(chars, match.index, match.index + match[0].length)
  for (const match of source.matchAll(/<!--/g)) {
    if (!source.slice(match.index).includes('-->')) {
      blankRange(chars, match.index, source.length)
      errors.push({ rule: 'masking', severity: 'error', match: 'unterminated HTML comment', ...lineColumn(source, match.index) })
      break
    }
  }
  let i = bodyStart
  while (i < source.length) {
    const lineStart = i === 0 ? 0 : source.lastIndexOf('\n', i - 1) + 1
    if (i === lineStart) {
      const lineEnd = source.indexOf('\n', i) < 0 ? source.length : source.indexOf('\n', i)
      const fence = source.slice(i, lineEnd).match(/^\s*(`{3,}|~{3,})/)
      if (fence) {
        const marker = fence[1][0]
        const closeRe = new RegExp(`^\\s*${marker}{${fence[1].length},}\\s*$`)
        let cursor = lineEnd < source.length ? lineEnd + 1 : lineEnd
        let closed = false
        while (cursor <= source.length) {
          const end = source.indexOf('\n', cursor) < 0 ? source.length : source.indexOf('\n', cursor)
          if (closeRe.test(source.slice(cursor, end))) {
            blankRange(chars, i, end)
            i = end
            closed = true
            break
          }
          if (end === source.length) break
          cursor = end + 1
        }
        if (!closed) {
          blankRange(chars, i, source.length)
          errors.push({ rule: 'masking', severity: 'error', match: 'unterminated fenced code', ...lineColumn(source, i) })
          break
        }
      }
    }
    i += 1
  }

  let mathSkipUntil = bodyStart
  for (let cursor = bodyStart; cursor < source.length; cursor += 1) {
    if (cursor < mathSkipUntil) continue
    if (chars[cursor] === ' ' || chars[cursor] === '\n' || chars[cursor] === '\r') continue
    if (source[cursor] === '`') {
      const end = findClosing(source, cursor + 1, '`')
      if (end < 0) {
        blankRange(chars, cursor, source.length)
        errors.push({ rule: 'masking', severity: 'error', match: 'unterminated inline code', ...lineColumn(source, cursor) })
        break
      }
      blankRange(chars, cursor, end + 1)
      cursor = end
    } else if (source[cursor] === '$' && source[cursor - 1] !== '\\') {
      const delimiter = source[cursor + 1] === '$' ? '$$' : '$'
      const end = findMathClosing(source, cursor + delimiter.length, delimiter)
      if (delimiter === '$' && /\d/.test(source[cursor + 1] ?? '') && (end < 0 || source.slice(cursor, end).includes('\n'))) {
        chars[cursor] = ' '
        continue
      }
      if (end < 0) {
        blankRange(chars, cursor, source.length)
        errors.push({ rule: 'masking', severity: 'error', match: 'unterminated math', ...lineColumn(source, cursor) })
        break
      }
      blankRange(chars, cursor, end + delimiter.length)
      mathSkipUntil = end + delimiter.length
      cursor = end + delimiter.length
    } else if (source[cursor] === '<' && /^\/?[A-Za-z][\w.-]*/.test(source.slice(cursor + 1))) {
      const end = findJsxTagEnd(source, cursor)
      if (end < 0) {
        blankRange(chars, cursor, source.length)
        errors.push({ rule: 'masking', severity: 'error', match: 'unterminated JSX tag', ...lineColumn(source, cursor) })
        break
      }
      blankRange(chars, cursor, end + 1)
      cursor = end
    }
  }
  const jsxRanges = findJsxTextRanges(source, [])
  maskExpressionsInRanges(chars, source, jsxRanges, errors)
  maskUrls(chars, source)
  return { maskedText: chars.join(''), spans: makeSpans(source, chars), errors }
}

function isWordChar(char) { return Boolean(char && /[A-Za-z0-9_$]/.test(char)) }

function regexCanStart(source, index) {
  let cursor = index - 1
  while (cursor >= 0 && /\s/.test(source[cursor])) cursor -= 1
  if (cursor < 0) return true
  if (/[=(:,;!?&|{}[\]]/.test(source[cursor])) return true
  const prefix = source.slice(Math.max(0, cursor - 12), cursor + 1)
  return /\b(?:return|throw|case|delete|void|typeof|instanceof|in|of|yield|await)$/.test(prefix)
}

function consumeRegex(source, start) {
  let cursor = start + 1
  let inClass = false
  while (cursor < source.length) {
    if (source[cursor] === '\\') { cursor += 2; continue }
    if (source[cursor] === '[') inClass = true
    else if (source[cursor] === ']') inClass = false
    else if (source[cursor] === '/' && !inClass) {
      cursor += 1
      while (/[A-Za-z]/.test(source[cursor] ?? '')) cursor += 1
      return cursor
    }
    cursor += 1
  }
  return -1
}

function consumeQuoted(source, start, quote) {
  let cursor = start + 1
  while (cursor < source.length) {
    if (source[cursor] === '\\') { cursor += 2; continue }
    if (quote === "'" && isWordChar(source[cursor - 1]) && isWordChar(source[cursor + 1])) { cursor += 1; continue }
    if (source[cursor] === quote) return cursor + 1
    cursor += 1
  }
  return -1
}

function scanTsTokens(source, errors) {
  const tokens = []
  const ignored = []
  const walkTemplate = (start) => {
    const segments = []
    let cursor = start + 1
    let segmentStart = cursor
    while (cursor < source.length) {
      if (source[cursor] === '\\') { cursor += 2; continue }
      if (source[cursor] === '`') {
        if (segmentStart < cursor) segments.push([segmentStart, cursor])
        return { end: cursor + 1, segments }
      }
      if (source.startsWith('${', cursor)) {
        if (segmentStart < cursor) segments.push([segmentStart, cursor])
        let depth = 1
        cursor += 2
        while (cursor < source.length && depth) {
          if (source.startsWith('//', cursor)) { const end = source.indexOf('\n', cursor + 2); cursor = end < 0 ? source.length : end; continue }
          if (source.startsWith('/*', cursor)) { const end = source.indexOf('*/', cursor + 2); cursor = end < 0 ? source.length : end + 2; continue }
          if (source[cursor] === '"' || source[cursor] === "'") { const end = consumeQuoted(source, cursor, source[cursor]); cursor = end < 0 ? source.length : end; continue }
          if (source[cursor] === '`') { const nested = walkTemplate(cursor); cursor = nested.end < 0 ? source.length : nested.end; continue }
          if (source[cursor] === '{') depth += 1
          else if (source[cursor] === '}') depth -= 1
          cursor += 1
        }
        if (depth) return { end: -1, segments }
        segmentStart = cursor
        continue
      }
      cursor += 1
    }
    return { end: -1, segments }
  }
  let cursor = 0
  while (cursor < source.length) {
    if (source.startsWith('//', cursor)) { const end = source.indexOf('\n', cursor + 2); const finish = end < 0 ? source.length : end; ignored.push([cursor, finish]); cursor = finish; continue }
    if (source.startsWith('/*', cursor)) {
      const end = source.indexOf('*/', cursor + 2)
      if (end < 0) { errors.push({ rule: 'masking', severity: 'error', match: 'unterminated comment', ...lineColumn(source, cursor) }); break }
      ignored.push([cursor, end + 2]); cursor = end + 2; continue
    }
    if (source[cursor] === '/' && source[cursor + 1] !== '>' && source[cursor - 1] !== '<' && source[cursor + 1] !== '/' && source[cursor + 1] !== '*' && regexCanStart(source, cursor)) {
      const end = consumeRegex(source, cursor)
      if (end < 0) { errors.push({ rule: 'masking', severity: 'error', match: 'unterminated regex literal', ...lineColumn(source, cursor) }); break }
      ignored.push([cursor, end]); cursor = end; continue
    }
    if (source[cursor] === '"' || source[cursor] === "'") {
      const previous = source[cursor - 1]
      const next = source[cursor + 1]
      if (source[cursor] === "'" && isWordChar(previous) && isWordChar(next)) { cursor += 1; continue }
      const end = consumeQuoted(source, cursor, source[cursor])
      if (end < 0) { errors.push({ rule: 'masking', severity: 'error', match: 'unterminated string literal', ...lineColumn(source, cursor) }); break }
      tokens.push({ start: cursor, end, segments: [[cursor + 1, end - 1]] })
      ignored.push([cursor, end])
      cursor = end; continue
    }
    if (source[cursor] === '`') {
      const template = walkTemplate(cursor)
      if (template.end < 0) { errors.push({ rule: 'masking', severity: 'error', match: 'unterminated template literal', ...lineColumn(source, cursor) }); break }
      tokens.push({ start: cursor, end: template.end, segments: template.segments })
      ignored.push([cursor, template.end])
      cursor = template.end; continue
    }
    cursor += 1
  }
  return { tokens, ignored }
}

function extractTs(filePath, source) {
  const chars = source.split('').map((char) => char === '\n' || char === '\r' ? char : ' ')
  const errors = []
  const isContent = filePath.startsWith('content/') || /(?:lib\/(?:topics|skill-provenance|content)\.ts|app\/llms\.txt\/route\.ts)$/.test(filePath)
  const scanned = scanTsTokens(source, errors)
  const tokens = scanned.tokens
  const ignoredRanges = scanned.ignored
  const jsxTextRanges = findJsxTextRanges(source, ignoredRanges)

  for (const match of source.matchAll(/^\s*(?:import|export\s+type|export\s+\{)[^\n]*$/gm)) blankRange(chars, match.index, match.index + match[0].length)
  for (const [start, end] of jsxTextRanges) exposeRange(chars, source, start, end)
  for (const match of source.matchAll(/\b([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)) {
    const inIgnored = ignoredRanges.some(([start, end]) => match.index >= start && match.index < end)
    if (!inIgnored && SELECTED_ATTR.test(match[1])) {
      const valueStart = match.index + match[0].indexOf(match[3])
      exposeRange(chars, source, valueStart, valueStart + match[3].length)
    }
  }
  for (const item of tokens) {
    const before = source.slice(Math.max(0, item.start - 80), item.start)
    const name = (before.match(/([\w-]+)\s*=\s*$/) || before.match(/([\w-]+)\s*:\s*$/) || [])[1] || ''
    if (isContent || USER_FACING_NAMES.test(name)) for (const [start, end] of item.segments) exposeRange(chars, source, start, end)
  }
  maskExpressionsInRanges(chars, source, jsxTextRanges, errors)
  return { maskedText: chars.join(''), spans: makeSpans(source, chars), errors }
}

export function extractProse(filePath, source) {
  const normalized = filePath.replaceAll('\\', '/')
  const result = /\.mdx$/.test(normalized)
    ? extractMdx(normalized, source)
    : extractTs(normalized, source)
  return { ...result, file: normalized, source }
}

export function globToRegExp(glob) {
  let pattern = ''
  for (let i = 0; i < glob.length; i += 1) {
    if (glob[i] === '*' && glob[i + 1] === '*' && glob[i + 2] === '/') { pattern += '(?:.*/)?'; i += 2 }
    else if (glob[i] === '*' && glob[i + 1] === '*') { pattern += '.*'; i += 1 }
    else if (glob[i] === '*') pattern += '[^/]*'
    else if (glob[i] === '?') pattern += '[^/]'
    else pattern += glob[i].replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${pattern}$`)
}

/** @param {string|URL} filePath */
export function readManifest(filePath = new URL('./prose-sources.json', import.meta.url)) {
  return JSON.parse(readFileSync(filePath instanceof URL ? filePath : resolve(filePath), 'utf8'))
}

function walk(root, dir = '') {
  const absolute = resolve(root, dir)
  if (!existsSync(absolute)) return []
  const result = []
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['node_modules', '.next', 'out'].includes(entry.name)) continue
    const child = dir ? `${dir}/${entry.name}` : entry.name
    if (entry.isDirectory()) result.push(...walk(root, child))
    else result.push(child)
  }
  return result
}

export function resolveManifestFiles(root, manifest = readManifest()) {
  const candidates = walk(root)
  const includes = manifest.include.map(globToRegExp)
  const excludes = manifest.exclude.map(globToRegExp)
  return candidates.filter((file) => includes.some((re) => re.test(file)) && !excludes.some((re) => re.test(file))).sort()
}

function matchInsensitive(text, phrase) {
  return new RegExp(`(?<![A-Za-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`, 'gi')
}

function quotedAt(text, index) {
  let quote = false
  for (let i = 0; i < index; i += 1) {
    if (text[i] === '"' && text[i - 1] !== '\\') quote = !quote
  }
  return quote
}

function finding(file, source, start, rule, severity, match, suggestion, mode) {
  const pos = lineColumn(source, start)
  return { mode, file, line: pos.line, column: pos.column, rule, severity, match, ...(suggestion ? { suggestion } : {}) }
}

export function sortFindings(findings) {
  return [...findings].sort((a, b) => String(a.file).localeCompare(String(b.file)) || (a.line ?? 0) - (b.line ?? 0) || (a.column ?? 0) - (b.column ?? 0) || String(a.rule).localeCompare(String(b.rule)) || String(a.match ?? '').localeCompare(String(b.match ?? '')))
}

function addPhraseFindings(findings, text, source, file, phrases, rule, severity, mode, suggestions = {}) {
  for (const phrase of phrases) {
    for (const match of text.matchAll(matchInsensitive(text, phrase))) {
      if (quotedAt(text, match.index)) continue
      // Preserve exact bibliographic titles in linked reading lists. These are
      // citations, not house prose, and changing a paper's title would make
      // the reference inaccurate.
      const lineStart = text.lastIndexOf('\n', match.index - 1) + 1
      const lineEnd = text.indexOf('\n', match.index)
      const line = source.slice(lineStart, lineEnd < 0 ? source.length : lineEnd)
      if (/^\s*[-*]\s*\[[^\]]+\]\(https?:\/\//.test(line) && /\b(?:19|20)\d{2}\b/.test(line)) continue
      findings.push(finding(file, source, match.index, rule, severity, match[0], suggestions[phrase], mode))
    }
  }
}

export function lintProse(filePath, source, { mode = 'source-audit' } = {}) {
  const extracted = extractProse(filePath, source)
  const text = extracted.maskedText
  const findings = extracted.errors.map((error) => ({ ...error, mode, file: filePath, line: error.line ?? 1, column: error.column ?? 1 }))
  addPhraseFindings(findings, text, source, filePath, AI_TELL_PHRASES, 'ai-tell', 'error', mode, {
    utilize: 'use', leveraging: 'using', leverage: 'use', ensure: 'make sure', facilitate: 'help',
    demonstrate: 'show', prior: 'before', subsequent: 'after',
  })
  addPhraseFindings(findings, text, source, filePath, MARKETING_ADJECTIVES, 'marketing-adjective', 'warning', mode)
  addPhraseFindings(findings, text, source, filePath, PHRASAL_VERBS, 'phrasal-verb', 'warning', mode)
  addPhraseFindings(findings, text, source, filePath, MODAL_HEDGES, 'modal-hedge', 'warning', mode)
  for (const match of text.matchAll(/\b(?:not just\b.{0,100}\bbut also|it isn['’]t\b.{0,100}\bit['’]s)\b/gi)) findings.push(finding(filePath, source, match.index, 'reveal-construction', 'warning', match[0], undefined, mode))
  for (const match of text.matchAll(/;/g)) findings.push(finding(filePath, source, match.index, 'semicolon', 'warning', ';', 'split into two sentences', mode))
  for (const match of text.matchAll(/\b(?:am|is|are|was|were|be|been|being)\s+(?:\w+ed|done|made|sent|read|built|kept|held|set|put|run|written|shown|given|taken|found|got|seen|known)\b/gi)) findings.push(finding(filePath, source, match.index, 'passive-voice', 'warning', match[0], undefined, mode))
  for (const match of text.matchAll(/\b(?:am|is|are|was|were|be|been|being)\s+\w+ing\b/gi)) findings.push(finding(filePath, source, match.index, 'ing-main-verb', 'warning', match[0], undefined, mode))
  for (const match of text.matchAll(/\b\w{4,}(?:tion|ment|ance|ence)\s+of\b/gi)) findings.push(finding(filePath, source, match.index, 'nominalisation', 'warning', match[0], undefined, mode))

  const sentences = []
  let textOffset = 0
  for (const line of text.split('\n')) {
    for (const sentence of line.matchAll(/[^.!?:]+(?:[.!?:]|$)/g)) {
      const value = sentence[0].trim()
      if (value) sentences.push({ text: value, start: textOffset + sentence.index + sentence[0].indexOf(value) })
    }
    textOffset += line.length + 1
  }
  for (const sentence of sentences) {
    const words = sentence.text.match(/[A-Za-z0-9][A-Za-z0-9'/-]*/g)?.length ?? 0
    if (words > 20) findings.push(finding(filePath, source, sentence.start, 'long-sentence', 'warning', sentence.text, 'split the sentence', mode))
  }
  const paragraphs = [...text.matchAll(/(?:^|(?:\r?\n){2,})([\s\S]*?)(?=(?:\r?\n){2,}|$)/g)]
  for (const paragraphMatch of paragraphs) {
    const paragraph = paragraphMatch[1]
    const count = paragraph.match(/[.!?](?=\s|$)/g)?.length ?? 0
    const paragraphOffset = paragraphMatch.index + paragraphMatch[0].indexOf(paragraph)
    if (count > 6) findings.push(finding(filePath, source, paragraphOffset, 'long-paragraph', 'warning', `${count} sentences`, 'split the paragraph', mode))
  }
  const words = text.match(/[A-Za-z0-9][A-Za-z0-9'/-]*/g)?.length ?? 0
  const emDashes = [...text].filter((char) => char === '—' || char === '–').length
  const budget = Math.max(3, Math.ceil(words / 500))
  const firstDash = text.search(/[—–]/)
  if (emDashes > budget) findings.push(finding(filePath, source, firstDash, 'em-dash-budget', 'error', `${emDashes} (budget ${budget})`, 'replace some dashes with full stops or commas', mode))
  return { mode, file: filePath, words, emDashes, emDashBudget: budget, findings: sortFindings(findings), hasHardFailures: findings.some((item) => item.severity === 'error') }
}

export function lintFiles(files, { mode = 'source-audit' } = {}) {
  const reports = []
  for (const file of files) {
    try {
      reports.push(lintProse(file, readFileSync(file, 'utf8'), { mode }))
    } catch (error) {
      reports.push({ mode, file, words: 0, emDashes: 0, emDashBudget: 3, findings: [{ mode, file, line: 1, column: 1, rule: 'input', severity: 'error', match: error instanceof Error ? error.message : String(error) }], hasHardFailures: true })
    }
  }
  return reports.sort((a, b) => a.file.localeCompare(b.file))
}

export function changedManifestFiles(root, manifest, base = 'HEAD') {
  let names = []
  try { names = execFileSync('git', ['diff', '--name-only', base], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean) } catch { names = [] }
  try { names.push(...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)) } catch { /* not a git worktree */ }
  const allowed = new Set(resolveManifestFiles(root, manifest))
  return [...new Set(names.map((name) => name.replaceAll('\\', '/')).filter((name) => allowed.has(name)))].sort()
}

export { extname, relative, resolve }
