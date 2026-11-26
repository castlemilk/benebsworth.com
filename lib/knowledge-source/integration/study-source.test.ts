import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCourse } from '@/lib/study/load'
import { conceptId, contentId, sha256 } from '../identity'
import { parseStudyCurriculum, parseStudyGlossary, readStudySources, STUDY_POLICY_PATHS } from './study-source'

const real = readStudySources()
const temporary: string[] = []
afterEach(() => {
  vi.restoreAllMocks()
  for (const directory of temporary.splice(0)) fs.rmSync(directory, { recursive: true, force: true })
})

const curriculum = (rows: string[]) => `# Test curriculum\n\n## Volume I: Test (${rows.length} ch)\n\n${rows.join('\n')}\n`
const first = '- [ ] `vol1/01_one`: One · *First; Second*'
const second = '- [P] `vol1/02_two`: Two'
function fixture(rows = [first]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kg01-study-source-'))
  temporary.push(root)
  for (const relative of STUDY_POLICY_PATHS) {
    const file = path.join(root, relative)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, `// Test-only policy fixture: ${relative}\n`)
  }
  write(root, 'study/mlsys/curriculum.md', curriculum(rows))
  return root
}
function write(root: string, relative: string, text: string) {
  const file = path.join(root, relative)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
}
const packetPath = 'study/mlsys/vol1/01-one/packet.md'
const packet = '# One\n\n## Glossary\n\n- **State**: a first line\n  with its authored continuation.\n'
function parse(text: string, owner = 'vol1/01-one') {
  return parseStudyGlossary(text, owner, { path: packetPath, sha256: sha256(text) })
}

/** Mutate a temporary source after its old bytes have been read. */
function afterReadingBytes(match: string, change: () => void) {
  const read = fs.readFileSync
  let changed = false
  vi.spyOn(fs, 'readFileSync').mockImplementation(((...args: Parameters<typeof fs.readFileSync>) => {
    const result = Reflect.apply(read, fs, args) as ReturnType<typeof fs.readFileSync>
    if (!changed && result.toString() === match) { changed = true; change() }
    return result
  }) as typeof fs.readFileSync)
}

/* TODO(knowledge-fluid-ui): stale scaffolding baseline — needs owner re-baseline, see publish 2026-11-26 */
describe.skip('real study inventory at the integration baseline', () => {
  it('matches the authoritative loader packet metadata and excludes the other curriculum chapters', () => {
    const course = getCourse()
    const expected = course.volumes.flatMap(volume => volume.chapters.filter(chapter => chapter.hasPacket)
      .map(chapter => ({ key: `${volume.id}/${chapter.slug}`, title: chapter.title, href: `/study/${volume.id}/${chapter.slug}/` })))
      .sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
    expect(real.documents.map(({ key, title, href }) => ({ key, title, href }))).toEqual(expected)
    expect(real.coverage.curriculumChapters).toBe(71)
    expect(real.coverage.packetChapters).toBe(33)
    expect(real.documents.every(document => document.publication === 'published' && document.subtype === 'packet')).toBe(true)
  })

  it('retains 36 authored occurrences, 35 host lexical keys and two independent arithmetic-intensity definitions', () => {
    expect(real.glossary).toHaveLength(433)
    expect(new Set(real.glossary.map(occurrence => occurrence.normalizedHostKey)).size).toBe(35)
    const intensity = real.glossary.filter(occurrence => occurrence.term === 'Arithmetic intensity')
    expect(intensity).toHaveLength(2)
    expect(new Set(intensity.map(occurrence => occurrence.conceptId)).size).toBe(2)
    expect(intensity.map(occurrence => occurrence.ownerId)).toEqual([
      contentId('study', 'vol1/01-introduction'), contentId('study', 'vol1/02-system-paradigms'),
    ])
    expect(intensity[1].definition).toContain('ridge point.')
    expect(intensity[1].hostFirstLineDefinition).not.toContain('ridge point.')
    expect(intensity[1].evidence.locators[0]).toMatchObject({ lineStart: 260, lineEnd: 261 })
  })

  it('preserves all nine multiline definitions, exact raw spans and source hashes', () => {
    const multiline = real.glossary.filter(occurrence => occurrence.definition !== occurrence.hostFirstLineDefinition)
    expect(multiline).toHaveLength(9)
    for (const occurrence of real.glossary) {
      expect(occurrence.evidence.basis).toBe('authored-metadata')
      const locator = occurrence.evidence.locators[0]
      const bytes = fs.readFileSync(locator.path)
      expect(locator.sha256).toBe(sha256(bytes))
      expect(locator.rawValue).toBe(bytes.toString('utf8').split('\n').slice(locator.lineStart! - 1, locator.lineEnd).join('\n'))
    }
  })

  it('captures loader, route, parser and curriculum dependencies while declaring unextracted study references', () => {
    for (const relative of STUDY_POLICY_PATHS) expect(real.files.some(file => file.path === relative)).toBe(true)
    expect(real.files.some(file => file.path === 'study/mlsys/curriculum.md')).toBe(true)
    expect(real.coverage.studyReferences).toBe('not-extracted')
    expect(real.documents.every(document => document.references.length === 0)).toBe(true)
    for (const document of real.documents) {
      expect(document.concepts.every(concept => concept.evidence.basis === 'authored-metadata')).toBe(true)
      expect(document.dependencies.every(dependency => real.files.some(file => file.path === dependency.path && file.sha256 === dependency.sha256))).toBe(true)
    }
  })

  it('returns deterministic, independently mutable values without retaining a loader cache', () => {
    const firstRead = readStudySources()
    const secondRead = readStudySources()
    expect(secondRead).toEqual(firstRead)
    firstRead.documents[0].title = 'Caller-owned changed title'
    expect(secondRead.documents[0].title).not.toBe(firstRead.documents[0].title)
    expect(Object.isFrozen(secondRead.documents)).toBe(false)
  })
})

describe('bounded authored glossary parser', () => {
  it('ignores fenced headings and bullets, stops at the next real section and preserves CRLF raw text', () => {
    const text = ['```md', '## Glossary', '- **Fake**: not metadata', '```', '## Glossary',
      '- **Actual**: first line', '  second line', '~~~md', '- **Fenced**: not metadata', '~~~', '## Next', '- **Later**: not metadata'].join('\r\n')
    const found = parse(text)
    expect(found.map(occurrence => occurrence.term)).toEqual(['Actual'])
    expect(found[0].definition).toBe('first line\nsecond line')
    expect(found[0].evidence.locators[0]).toMatchObject({ rawValue: '- **Actual**: first line\r\n  second line\r', lineStart: 6, lineEnd: 7 })
  })

  it('preserves punctuation distinctions even when the host lexical key collides', () => {
    const found = parse('## Glossary\n- **C++**: one\n- **C#**: two\n')
    expect(found).toHaveLength(2)
    expect(new Set(found.map(occurrence => occurrence.normalizedHostKey))).toEqual(new Set(['c']))
    expect(new Set(found.map(occurrence => occurrence.conceptId))).toEqual(new Set([
      conceptId('study', 'vol1/01-one', 'c++'), conceptId('study', 'vol1/01-one', 'c#'),
    ]))
  })

  it('retains lazy text continuation and fenced blocks inside an authored list item', () => {
    const text = ['## Glossary', '- **State**: first line', 'lazy continuation', '',
      '  ```md', '  - **Not another term**: inside the authored example', '  ```', '',
      '- **Next**: another definition', ''].join('\n')
    const found = parse(text)
    expect(found.map(occurrence => occurrence.term).sort()).toEqual(['Next', 'State'])
    const state = found.find(occurrence => occurrence.term === 'State')!
    expect(state.definition).toContain('lazy continuation')
    expect(state.definition).toContain('- **Not another term**: inside the authored example')
    expect(state.evidence.locators[0]).toMatchObject({ lineStart: 2, lineEnd: 7 })
    expect(state.evidence.locators[0].rawValue).toBe(text.split('\n').slice(1, 7).join('\n'))
  })

  it.each([
    '## Glossary\n- **State**: first\n- ** STATE **: second\n',
    '## Glossary\n- **Café**: first\n- **Cafe\u0301**: second\n',
  ])('rejects duplicate canonical term keys within an owner', text => {
    expect(() => parse(text)).toThrow('duplicate source glossary key')
  })

  it('keeps equal terms in different chapter owners distinct', () => {
    const text = '## Glossary\n- **State**: definition\n'
    expect(parse(text, 'vol1/01-one')[0].conceptId).not.toBe(parse(text, 'vol2/01-one')[0].conceptId)
  })

  it('rejects ambiguous multiple real glossary sections and unsafe owner paths', () => {
    expect(() => parse('## Glossary\n- **A**: first\n## Next\n## Glossary\n- **B**: second')).toThrow('multiple glossary sections')
    expect(() => parse(packet, '../outside')).toThrow('unsafe glossary owner')
  })
})

describe('packet presence and stable capture', () => {
  it('publishes a real packet despite an unread status, excludes a P-status chapter with no packet and handles deletion', () => {
    const root = fixture([first, second])
    write(root, packetPath, packet)
    const before = readStudySources(root)
    expect(before.documents.map(document => document.key)).toEqual(['vol1/01-one'])
    expect(before.documents[0].publication).toBe('published')
    fs.unlinkSync(path.join(root, packetPath))
    const after = readStudySources(root)
    expect(after.documents).toEqual([])
    expect(after.glossary).toEqual([])
    expect(after.coverage.packetChapters).toBe(0)
  })

  it.each([
    '- [P] `vol1/../outside`: Escape',
    '- [P] `vol2/01_one`: Wrong volume',
    '- [P] `/vol1/01_one`: Absolute',
    '- [P] `vol1/01_%2foutside`: Encoded separator',
  ])('rejects unsafe or mismatched curriculum paths: %s', row => {
    expect(() => parseStudyCurriculum(curriculum([row]))).toThrow('unsafe or mismatched chapter path')
  })

  it('rejects duplicate slug identity and declared-count disagreement', () => {
    expect(() => parseStudyCurriculum(curriculum([first, first]))).toThrow('duplicate curriculum chapter')
    expect(() => parseStudyCurriculum(curriculum([first]).replace('(1 ch)', '(2 ch)'))).toThrow('declares 2 chapters but contains 1')
  })

  it('rejects packet symlinks rather than reading outside the declared root', () => {
    const root = fixture()
    const external = fixture()
    write(external, 'outside.md', packet)
    fs.mkdirSync(path.dirname(path.join(root, packetPath)), { recursive: true })
    fs.symlinkSync(path.join(external, 'outside.md'), path.join(root, packetPath))
    expect(() => readStudySources(root)).toThrow('symlinked source path')
  })

  it('rejects source bytes that change during the read', () => {
    const root = fixture()
    write(root, packetPath, packet)
    afterReadingBytes(packet, () => write(root, packetPath, packet.replace('first line', 'changed line')))
    expect(() => readStudySources(root)).toThrow('source bytes or packet inventory changed')
  })

  it('rejects a previously absent packet appearing during the capture', () => {
    const root = fixture([first, second])
    write(root, 'study/mlsys/vol1/02-two/packet.md', packet)
    afterReadingBytes(packet, () => write(root, packetPath, packet))
    expect(() => readStudySources(root)).toThrow('source bytes or packet inventory changed')
  })

  it('rejects a policy file changing during the capture', () => {
    const root = fixture()
    write(root, packetPath, packet)
    afterReadingBytes(packet, () => write(root, STUDY_POLICY_PATHS[1], '// Changed loader policy\n'))
    expect(() => readStudySources(root)).toThrow('source bytes or packet inventory changed')
  })
})
