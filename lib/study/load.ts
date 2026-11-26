import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { cache } from 'react'
import { progressKey } from './shared'
import {
  ChapterStatus,
  ChartKind,
  VolumeState,
  QuestionKind,
  QuestionSource,
  type StudyChapter,
  type StudyChart,
  type StudyCourse,
  type StudyDiagram,
  type StudyEquation,
  type StudyQuiz,
  type StudyTranscript,
  type StudyVolume,
  type TranscriptSegment,
} from '@/lib/gen/study'

/**
 * Loader for the /study microfrontend. The on-disk layout is the contract the
 * `mlsys-study` skill maintains:
 *
 *   study/mlsys/curriculum.md            — volume/chapter map + status chars
 *   study/mlsys/progress.md              — packet/review/quiz/post table
 *   study/mlsys/<vol>/<NN-slug>/packet.md
 *   study/mlsys/<vol>/<NN-slug>/quiz.json  (proto StudyQuiz JSON)
 *   study/mlsys/<vol>/<NN-slug>/equations.json (proto StudyEquation[])
 *   study/mlsys/<vol>/<NN-slug>/charts.json    (proto StudyChart[])
 *   study/mlsys/<vol>/<NN-slug>/diagrams.json (optional manifest)
 *   study/mlsys/<vol>/<NN-slug>/diagrams/*.svg
 *
 * curriculum.md is the source of truth for the map; everything else is
 * discovered from the chapter directory it points at.
 */

const previewRoot = process.env.NODE_ENV === 'development' ? process.env.MLSYS_PREVIEW_ROOT : undefined
const STUDY_DIR = previewRoot ? path.resolve(previewRoot) : path.join(process.cwd(), 'study', 'mlsys')
const CURRICULUM_MD = path.join(STUDY_DIR, 'curriculum.md')
const PROGRESS_MD = path.join(STUDY_DIR, 'progress.md')

const COURSE_META = {
  id: 'mlsys',
  title: 'Machine Learning Systems',
  sourceTitle: 'Machine Learning Systems: Foundations, Scaling, Agentic AI, and Physical AI',
  sourceAuthor: 'Vijay Janapa Reddi · Harvard CS249r',
  sourceUrl: 'https://mlsysbook.ai',
  license: 'CC-BY-NC-SA 4.0',
} as const

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 }

const STATUS_CHAR: Record<string, ChapterStatus> = {
  P: ChapterStatus.PACKET,
  R: ChapterStatus.REVIEWED,
  Q: ChapterStatus.QUIZZED,
  B: ChapterStatus.POSTED,
}

function slugFromSourceDir(dir: string): string {
  // "01_introduction" → "01-introduction"; matches the packet dir convention.
  return dir.replace(/_/g, '-')
}

/** Parse `## Volume I: Title[, qualifier] (N ch)` headers. */
function parseVolumeHeader(line: string): { number: number; title: string; state: VolumeState; count: number } | null {
  const m = line.match(/^##\s+Volume\s+([IVXLC]+)\s*:\s*(.+?)\s*\((\d+)\s*ch\)\s*$/)
  if (!m) return null
  let title = m[2].trim()
  let state = VolumeState.ACTIVE
  if (/,\s*in preparation$/i.test(title)) {
    state = VolumeState.IN_PREPARATION
    title = title.replace(/,\s*in preparation$/i, '')
  } else if (/,\s*preview$/i.test(title)) {
    state = VolumeState.PREVIEW
    title = title.replace(/,\s*preview$/i, '')
  }
  return { number: ROMAN[m[1]] ?? 0, title, state, count: Number(m[3]) }
}

/** Parse `- [X] \`volN/NN_slug\`: Title · *sec1; sec2*` rows. */
function parseChapterLine(line: string): { source: string; status: ChapterStatus; title: string; sections: string[] } | null {
  const m = line.match(/^-\s*\[(.)\]\s*`([^`]+)`\s*:\s*(.+)$/)
  if (!m) return null
  const status = STATUS_CHAR[m[1].trim()] ?? ChapterStatus.CHAPTER_STATUS_UNSPECIFIED
  const rest = m[3].trim()
  const sm = rest.match(/^(.*?)\s*·\s*\*(.+)\*\s*$/)
  const title = (sm ? sm[1] : rest).trim()
  const sections = sm ? sm[2].split(';').map((s) => s.trim()).filter(Boolean) : []
  return { source: m[2], status, title, sections }
}

let courseCache: StudyCourse | null = null

export function getCourse(): StudyCourse {
  if (courseCache) return courseCache
  const text = fs.readFileSync(CURRICULUM_MD, 'utf8')
  const volumes: StudyVolume[] = []
  let current: StudyVolume | null = null

  for (const line of text.split('\n')) {
    const vol = parseVolumeHeader(line)
    if (vol) {
      current = {
        id: `vol${vol.number}`,
        number: vol.number,
        title: vol.title,
        state: vol.state,
        chapterCount: vol.count,
        chapters: [],
      }
      volumes.push(current)
      continue
    }
    const ch = parseChapterLine(line)
    if (ch && current) {
      const [volumeId, sourceDir] = ch.source.split('/')
      const slug = slugFromSourceDir(sourceDir)
      const packetDir = path.join(STUDY_DIR, volumeId, slug)
      const chapter: StudyChapter = {
        id: ch.source,
        volumeId,
        slug,
        sourceDir,
        title: ch.title,
        status: ch.status,
        sections: ch.sections.map((title) => ({ title })),
        hasPacket: fs.existsSync(path.join(packetDir, 'packet.md')),
        hasQuiz: fs.existsSync(path.join(packetDir, 'quiz.json')),
        diagrams: readDiagramManifest(packetDir),
        equations: readJsonArray<StudyEquation>(packetDir, 'equations.json'),
        charts: readJsonArray<StudyChart>(packetDir, 'charts.json', validateChart),
      }
      current.chapters.push(chapter)
    }
  }

  courseCache = { ...COURSE_META, volumes }
  return courseCache
}

function readDiagramManifest(packetDir: string): StudyDiagram[] {
  return readFigureDir(packetDir, 'diagrams', 'diagrams.json')
}

function readBookFigureManifest(packetDir: string): StudyDiagram[] {
  return readFigureDir(packetDir, 'book-figures', 'book-figures.json')
}

/** Shared manifest/dir reader for `diagrams/` (originals) and `book-figures/` (mirrored book assets). */
function readFigureDir(packetDir: string, subdir: string, manifestName: string): StudyDiagram[] {
  const dir = path.join(packetDir, subdir)
  const manifestPath = path.join(packetDir, manifestName)
  if (fs.existsSync(manifestPath)) {
    const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Array<Partial<StudyDiagram>>
    return raw.map((d) => ({
      id: d.id ?? String(d.file ?? '').replace(/\.[a-z]+$/, ''),
      title: d.title ?? '',
      file: String(d.file ?? ''),
      caption: d.caption ?? '',
    }))
  }
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(svg|png|webp|jpe?g)$/i.test(f))
    .sort()
    .map((f) => ({ id: f.replace(/\.[a-z]+$/, ''), title: f.replace(/\.[a-z]+$/, '').replace(/-/g, ' '), file: f, caption: '' }))
}

const CHART_KINDS = new Set<ChartKind>(Object.values(ChartKind).filter((v) => v !== ChartKind.UNRECOGNIZED))

function validateChart(c: StudyChart, file: string) {
  if (!CHART_KINDS.has(c.kind)) throw new Error(`${file}: chart ${c.id} has bad kind "${c.kind}"`)
  if (!c.xPoints?.length || !c.series?.length) {
    throw new Error(`${file}: chart ${c.id} needs xPoints + series`)
  }
  // LINE x-points feed `new Date(x)` on the client; anything that doesn't
  // parse crashes hydration post-SSR. Fail the build instead.
  if (c.kind === ChartKind.LINE) {
    const bad = c.xPoints.filter((x) => !/^\d{4}-\d{2}-\d{2}/.test(x) || Number.isNaN(Date.parse(x)))
    if (bad.length) throw new Error(`${file}: chart ${c.id} LINE xPoints must be ISO dates, got ${bad.join(', ')}`)
  }
  for (const s of c.series) {
    // Missing key binds every Bar to dataKey=undefined — rects render at
    // height 0 and nothing throws (ch8 shipped three empty charts this way).
    if (!s.key) throw new Error(`${file}: chart ${c.id} series "${s.label}" is missing key`)
    if (s.values?.length !== c.xPoints.length) {
      throw new Error(`${file}: chart ${c.id} series "${s.key}" has ${s.values?.length ?? 0} values for ${c.xPoints.length} x points`)
    }
  }
}

/** Read a chapter-level JSON manifest mirroring a proto repeated field. */
function readJsonArray<T>(packetDir: string, name: string, validate?: (item: T, file: string) => void): T[] {
  const p = path.join(packetDir, name)
  if (!fs.existsSync(p)) return []
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as T[]
  if (validate) for (const item of raw) validate(item, `${packetDir}/${name}`)
  return raw
}

/** progress.md rows keyed by `volN/NN` prefix → packet/review/quiz/post state. */
export type ProgressRow = {
  packetAt?: string
  reviewedAt?: string
  quizScore?: string
  postSlug?: string
  notes?: string
}

export function getProgressRows(): Map<string, ProgressRow> {
  const rows = new Map<string, ProgressRow>()
  if (!fs.existsSync(PROGRESS_MD)) return rows
  const text = fs.readFileSync(PROGRESS_MD, 'utf8')
  for (const line of text.split('\n')) {
    const m = line.match(/^\|\s*(vol\d+)\/(\d+)\s/)
    if (!m) continue
    const cells = line.split('|').map((c) => c.trim()).filter((_, i) => i > 0 && i < 7)
    const cell = (i: number) => {
      const v = cells[i] ?? ''
      return v === '—' || v === '' ? undefined : v.replace(/^✅\s*/, '')
    }
    rows.set(`${m[1]}/${m[2]}`, {
      packetAt: cell(1),
      reviewedAt: cell(2),
      quizScore: cell(3),
      postSlug: cell(4),
      notes: cell(5),
    })
  }
  return rows
}

export type LoadedFigure = StudyDiagram & { svg?: string; imageUri?: string; sourceHref?: string }

export type LoadedChapter = {
  chapter: StudyChapter
  volume: StudyVolume
  packetBody: string | null
  openingQuestion?: string
  quiz: StudyQuiz | null
  figures: LoadedFigure[]
  bookFigures: LoadedFigure[]
  audioUrl: string | null
  transcript: { segments: TranscriptSegment[]; hosts: Record<string, string> }
  progress: ProgressRow | undefined
  prev: StudyChapter | null
  next: StudyChapter | null
}

function chapterDir(ch: Pick<StudyChapter, 'volumeId' | 'slug'>): string {
  return path.join(STUDY_DIR, ch.volumeId, ch.slug)
}

// cache() dedupes the two loads each chapter page makes — generateMetadata
// and the page component both call this within the same request/render.
export const getChapter = cache(function getChapter(volumeParam: string, chapterParam: string): LoadedChapter | undefined {
  const course = getCourse()
  const volume = course.volumes.find((v) => v.id === volumeParam)
  const chapter = volume?.chapters.find((c) => c.slug === chapterParam)
  if (!volume || !chapter) return undefined

  const dir = chapterDir(chapter)
  const packetPath = path.join(dir, 'packet.md')
  const quizPath = path.join(dir, 'quiz.json')
  const packet = fs.existsSync(packetPath) ? matter(fs.readFileSync(packetPath, 'utf8')) : null
  const quiz = fs.existsSync(quizPath) ? parseQuizJson(fs.readFileSync(quizPath, 'utf8'), chapter.id) : null
  const figures: LoadedFigure[] = chapter.diagrams.map((d) => {
    const svgPath = path.join(dir, 'diagrams', d.file)
    return { ...d, svg: fs.existsSync(svgPath) ? fs.readFileSync(svgPath, 'utf8') : '' }
  })
  // Book images remain reference-only; published pages link to their source.
  const bookFigures: LoadedFigure[] = readBookFigureManifest(dir).map((d) => ({
    ...d, sourceHref: `https://mlsysbook.ai/${chapter.id}/${chapter.id.split('/')[1]}.html`,
  }))

  const audioFile = path.join(process.cwd(), 'public', 'study-audio', volume.id, `${chapter.slug}.m4a`)
  const audioUrl = !previewRoot && fs.existsSync(audioFile) ? `/study-audio/${volume.id}/${chapter.slug}.m4a` : null
  const transcript = readTranscript(dir)

  const flat = course.volumes.flatMap((v) => v.chapters)
  const idx = flat.findIndex((c) => c.id === chapter.id)

  return {
    chapter,
    volume,
    packetBody: packet?.content ?? null,
    openingQuestion: typeof packet?.data.openingQuestion === 'string' ? packet.data.openingQuestion.trim() : undefined,
    quiz,
    figures,
    bookFigures,
    audioUrl,
    transcript,
    progress: getProgressRows().get(progressKey(chapter)),
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null,
  }
})

const KINDS = new Set<QuestionKind>(Object.values(QuestionKind).filter((v) => v !== QuestionKind.UNRECOGNIZED))
const SOURCES = new Set<QuestionSource>(Object.values(QuestionSource).filter((v) => v !== QuestionSource.UNRECOGNIZED))

/** quiz.json mirrors the StudyQuiz proto; validate enums so bad files fail the build loudly. */
function parseQuizJson(raw: string, chapterId: string): StudyQuiz {
  const data = JSON.parse(raw) as StudyQuiz
  for (const q of data.questions ?? []) {
    if (!KINDS.has(q.kind)) throw new Error(`${chapterId}/quiz.json: question ${q.id} has bad kind "${q.kind}"`)
    if (!SOURCES.has(q.source)) throw new Error(`${chapterId}/quiz.json: question ${q.id} has bad source "${q.source}"`)
    if (q.kind === QuestionKind.MCQ && (!q.options?.length || !q.correctOptionId)) {
      throw new Error(`${chapterId}/quiz.json: MCQ ${q.id} needs options + correctOptionId`)
    }
  }
  return { chapterId: data.chapterId ?? chapterId, title: data.title ?? 'Self-test', questions: data.questions ?? [] }
}

/** transcript.json mirrors StudyTranscript; malformed segments are dropped
 *  rather than failing the page (karaoke degrades to player-only). */
function readTranscript(dir: string): { segments: TranscriptSegment[]; hosts: Record<string, string> } {
  const p = path.join(dir, 'transcript.json')
  const empty = { segments: [] as TranscriptSegment[], hosts: {} as Record<string, string> }
  if (!fs.existsSync(p)) return empty
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8')) as StudyTranscript
    return {
      hosts: data.hosts ?? {},
      segments: (data.segments ?? [])
        .filter(
          (s): s is TranscriptSegment =>
            typeof s?.speaker === 'string' && typeof s?.text === 'string' &&
            typeof s?.start === 'number' && typeof s?.end === 'number' && s.end > s.start,
        )
        .map((s) => {
          // Malformed words drop the whole array to the interpolation
          // fallback — a partial zip would skew every word's timing (a stray
          // {end:0} would pin earlier words "done").
          const words = (s.words ?? []).filter(
            (w) =>
              typeof w?.text === 'string' && typeof w?.start === 'number' &&
              typeof w?.end === 'number' && w.end >= w.start,
          )
          return { ...s, words: words.length === (s.words ?? []).length ? words : [] }
        }),
    }
  } catch {
    return empty
  }
}

export type GlossaryEntry = {
  term: string
  def: string
  volume: string
  slug: string
  title: string
}

/** Aggregate every packet's `## Glossary` bullets (`- **Term**: def`) for the concept index. */
export function getGlossaryIndex(): GlossaryEntry[] {
  const entries: GlossaryEntry[] = []
  for (const v of getCourse().volumes) {
    for (const c of v.chapters) {
      const p = path.join(chapterDir(c), 'packet.md')
      if (!fs.existsSync(p)) continue
      const body = fs.readFileSync(p, 'utf8')
      const gi = body.search(/^## Glossary\s*$/m)
      if (gi === -1) continue
      const rest = body.slice(gi)
      const next = rest.slice(1).search(/^## /m)
      const section = next === -1 ? rest : rest.slice(0, next + 1)
      for (const line of section.split('\n')) {
        const m = line.match(/^\s*-\s*\*\*(.+?)\*\*:\s*(.+)$/)
        if (m) entries.push({ term: m[1].trim(), def: m[2].trim(), volume: v.id, slug: c.slug, title: c.title })
      }
    }
  }
  return entries.sort((a, b) => a.term.localeCompare(b.term))
}

// Re-exported so server callers can treat load.ts as the module surface.
export { chapterHref, progressKey } from './shared'

export function getAllChapterParams(): Array<{ volume: string; chapter: string }> {
  return getCourse().volumes.flatMap((v) =>
    v.chapters.map((c) => ({ volume: v.id, chapter: c.slug })),
  )
}
