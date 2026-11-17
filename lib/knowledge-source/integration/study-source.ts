import fs from 'node:fs'
import path from 'node:path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { compare, conceptId, contentId, normalizeTag, sha256 } from '../identity'
import type { ContentSource, Evidence, SourceFile } from '../schema'

export interface AuthoredGlossaryOccurrence {
  ownerId: string
  conceptId: string
  term: string
  definition: string
  /** The current host loader's first-line projection, not the full definition. */
  hostFirstLineDefinition: string
  normalizedHostKey: string
  evidence: Evidence
}

interface CapturedFile extends SourceFile { text: string }
export interface StudyCurriculumChapter {
  volumeId: string
  sourceDir: string
  slug: string
  title: string
  line: number
  raw: string
}
export interface StudySourceSlice {
  documents: ContentSource[]
  files: SourceFile[]
  glossary: AuthoredGlossaryOccurrence[]
  coverage: {
    curriculumChapters: number
    packetChapters: number
    glossaryOccurrences: number
    studyReferences: 'not-extracted'
  }
}

const CURRICULUM = 'study/mlsys/curriculum.md'
/** Captured source policy; execution provenance still requires a fresh process. */
export const STUDY_POLICY_PATHS = [
  'lib/knowledge-source/integration/study-source.ts',
  'lib/study/load.ts',
  'lib/study/shared.ts',
  'lib/gen/study.ts',
  'app/study/[volume]/[chapter]/page.tsx',
  'app/study/concepts/page.tsx',
] as const
const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 }
function fail(message: string): never { throw new Error(`knowledge study source: ${message}`) }
const identity = ({ path: filePath, sha256: hash }: SourceFile): SourceFile => ({ path: filePath, sha256: hash })
const cleanLine = (line: string) => line.replace(/\r$/, '')
const hostKey = (term: string) => term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Fence-aware structural scan. Raw lines remain intact for exact locators. */
function ordinaryLines(lines: string[]): boolean[] {
  let fence: { mark: string; length: number } | undefined
  return lines.map(raw => {
    const line = cleanLine(raw)
    const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (fence) {
      if (match && match[1][0] === fence.mark && match[1].length >= fence.length && !match[2].trim()) fence = undefined
      return false
    }
    if (match) {
      fence = { mark: match[1][0], length: match[1].length }
      return false
    }
    return true
  })
}

/** Parse the current curriculum contract without importing the study runtime. */
export function parseStudyCurriculum(text: string): StudyCurriculumChapter[] {
  const lines = text.split('\n')
  const ordinary = ordinaryLines(lines)
  const chapters: StudyCurriculumChapter[] = []
  const volumes = new Map<string, { declared: number; actual: number }>()
  const seen = new Set<string>()
  let volume: string | undefined
  for (let i = 0; i < lines.length; i++) {
    if (!ordinary[i]) continue
    const line = cleanLine(lines[i])
    const header = line.match(/^##\s+Volume\s+([IVXLC]+)\s*:\s*(.+?)\s*\((\d+)\s*ch\)\s*$/)
    if (header) {
      if (!ROMAN[header[1]]) fail(`unsupported volume at curriculum line ${i + 1}`)
      volume = `vol${ROMAN[header[1]]}`
      if (volumes.has(volume)) fail(`duplicate curriculum volume ${volume}`)
      volumes.set(volume, { declared: Number(header[3]), actual: 0 })
      continue
    }
    if (!/^-\s*\[/.test(line)) continue
    const row = line.match(/^-\s*\[(.)\]\s*`([^`]+)`\s*:\s*(.+)$/)
    if (!row || !volume) fail(`malformed or unscoped chapter at curriculum line ${i + 1}`)
    const source = row[2].match(/^(vol[1-5])\/([0-9]{2}_[a-z0-9]+(?:[_-][a-z0-9]+)*)$/)
    if (!source || source[1] !== volume) fail(`unsafe or mismatched chapter path at curriculum line ${i + 1}`)
    const sourceDir = source[2]
    const slug = sourceDir.replace(/_/g, '-')
    const key = `${volume}/${slug}`
    if (seen.has(key)) fail(`duplicate curriculum chapter ${key}`)
    seen.add(key)
    const rest = row[3].trim()
    const sections = rest.match(/^(.*?)\s*·\s*\*(.+)\*\s*$/)
    const title = (sections ? sections[1] : rest).trim()
    if (!title) fail(`missing chapter title at curriculum line ${i + 1}`)
    chapters.push({ volumeId: volume, sourceDir, slug, title, line: i + 1, raw: lines[i] })
    volumes.get(volume)!.actual++
  }
  if (!volumes.size) fail('curriculum contains no supported volume headers')
  for (const [id, counts] of volumes) {
    if (counts.actual !== counts.declared) fail(`curriculum ${id} declares ${counts.declared} chapters but contains ${counts.actual}`)
  }
  return chapters
}

/**
 * Preserve each authored glossary list item, including continuation blocks that
 * the current host index omits. Markdown is parsed only; nothing is executed.
 * This does not extract study citations.
 */
export function parseStudyGlossary(text: string, ownerKey: string, source: SourceFile): AuthoredGlossaryOccurrence[] {
  if (!/^vol[1-5]\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ownerKey)) fail(`unsafe glossary owner ${ownerKey}`)
  const lines = text.split('\n')
  const tree = unified().use(remarkParse).parse(text)
  const starts = tree.children.flatMap((node, index) => node.type === 'heading' && node.depth === 2
    && node.children.length === 1 && node.children[0].type === 'text' && node.children[0].value === 'Glossary' ? [index] : [])
  if (starts.length > 1) fail(`multiple glossary sections in ${source.path}`)
  if (!starts.length) return []
  const start = starts[0]
  let end = tree.children.findIndex((node, index) => index > start && node.type === 'heading' && node.depth === 2)
  if (end < 0) end = tree.children.length
  const items = tree.children.slice(start + 1, end).flatMap(node => node.type === 'list' && !node.ordered ? node.children : [])
  const result: AuthoredGlossaryOccurrence[] = []
  const keys = new Set<string>()
  for (const item of items) {
    if (!item.position) fail(`missing Markdown location in ${source.path}`)
    const i = item.position.start.line - 1
    const last = item.position.end.line - 1
    const match = cleanLine(lines[i]).match(/^ {0,3}-\s*\*\*(.+?)\*\*:\s*(.+)$/)
    if (!match) continue
    const term = match[1].trim()
    const key = normalizeTag(term)
    if (!key) fail(`empty glossary term in ${source.path}:${i + 1}`)
    if (keys.has(key)) fail(`duplicate source glossary key ${key} in ${source.path}`)
    keys.add(key)
    const rawValue = lines.slice(i, last + 1).join('\n')
    const firstLine = match[2].trim()
    const definition = [firstLine, ...lines.slice(i + 1, last + 1).map(line => cleanLine(line).trim())].join('\n')
    result.push({
      ownerId: contentId('study', ownerKey), conceptId: conceptId('study', ownerKey, key), term,
      definition, hostFirstLineDefinition: firstLine, normalizedHostKey: hostKey(term),
      evidence: {
        basis: 'authored-metadata', confidence: 'explicit',
        rule: 'study-glossary-occurrence/v1; source-scoped authored definition, not semantic equivalence',
        locators: [{ ...identity(source), selector: `glossary.term:${key}`, rawValue, lineStart: i + 1, lineEnd: last + 1 }],
      },
    })
  }
  return result.sort((a, b) => compare(a.conceptId, b.conceptId))
}

/** Reject symlinked/nonregular source paths and escaping path components. */
function captureFile(root: string, relative: string, optional = false): CapturedFile | null {
  if (path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..')) {
    fail(`unsafe source path ${relative}`)
  }
  const parts = relative.split('/')
  let current = root
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i])
    let stat: fs.Stats
    try { stat = fs.lstatSync(current) } catch (error) {
      if (optional && (error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
    if (stat.isSymbolicLink()) fail(`symlinked source path ${relative}`)
    if (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile()) fail(`nonregular source path ${relative}`)
  }
  const fd = fs.openSync(current, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW)
  try {
    const bytes = fs.readFileSync(fd)
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return { path: relative, sha256: sha256(bytes), text }
  } finally { fs.closeSync(fd) }
}

function captureSlice(root: string) {
  const curriculum = captureFile(root, CURRICULUM)!
  const policy = STUDY_POLICY_PATHS.map(relative => captureFile(root, relative)!)
  const chapters = parseStudyCurriculum(curriculum.text)
  const packets = chapters.map(chapter => ({
    chapter,
    file: captureFile(root, `study/mlsys/${chapter.volumeId}/${chapter.slug}/packet.md`, true),
  }))
  const files = [curriculum, ...policy, ...packets.flatMap(packet => packet.file ? [packet.file] : [])]
    .sort((a, b) => compare(a.path, b.path))
  return { curriculum, policy, chapters, packets, files }
}

/**
 * Fresh-process, stable-checkout supplement. Packet presence controls inventory;
 * references remain explicitly unextracted. No host loader caches are consumed.
 */
export function readStudySources(root = process.cwd()): StudySourceSlice {
  const canonicalRoot = fs.realpathSync(root)
  const captured = captureSlice(canonicalRoot)
  const documents: ContentSource[] = []
  const glossary: AuthoredGlossaryOccurrence[] = []
  for (const { chapter, file } of captured.packets) {
    if (!file) continue
    const key = `${chapter.volumeId}/${chapter.slug}`
    const occurrences = parseStudyGlossary(file.text, key, file)
    glossary.push(...occurrences)
    const firstLine = file.text.split('\n')[0]
    const evidence: Evidence = {
      basis: 'registry', confidence: 'explicit',
      rule: 'study-packet-inventory/v1; curriculum membership plus packet.md existence, independent of status character',
      locators: [
        { ...identity(captured.curriculum), selector: `curriculum.chapter:${key}`, rawValue: chapter.raw, lineStart: chapter.line, lineEnd: chapter.line },
        { ...identity(file), selector: 'packet-file-presence', rawValue: firstLine, lineStart: 1, lineEnd: 1 },
      ],
    }
    documents.push({
      kind: 'study', key, title: chapter.title, href: `/study/${chapter.volumeId}/${chapter.slug}/`,
      subtype: 'packet', publication: 'published', evidence,
      dependencies: [captured.curriculum, ...captured.policy, file].map(identity).sort((a, b) => compare(a.path, b.path)),
      tags: [], concepts: occurrences.map(occurrence => ({ key: normalizeTag(occurrence.term), label: occurrence.term, evidence: occurrence.evidence })),
      references: [],
    })
  }
  const recaptured = captureSlice(canonicalRoot)
  if (JSON.stringify(captured.files.map(identity)) !== JSON.stringify(recaptured.files.map(identity))) {
    fail('source bytes or packet inventory changed while reading; retry in a fresh process')
  }
  return {
    documents: documents.sort((a, b) => compare(a.key, b.key)), files: captured.files.map(identity),
    glossary: glossary.sort((a, b) => compare(a.conceptId, b.conceptId)),
    coverage: { curriculumChapters: captured.chapters.length, packetChapters: documents.length,
      glossaryOccurrences: glossary.length, studyReferences: 'not-extracted' },
  }
}
