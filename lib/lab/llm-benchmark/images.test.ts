import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { imageBrief, imagePrompt, inlineLocalImages, planImageSubjects, queryFromArtifact } from './images.js'

/**
 * The inliner is the half that cannot be faked: the task ships one
 * self-contained HTML file, so a picture that is referenced but not embedded is
 * exactly the "images don't load" failure these tests exist to prevent.
 */
function tmpDir(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-images-'))
  for (const [name, contents] of Object.entries(files)) {
    const full = path.join(root, name)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, contents)
  }
  return root
}

describe('inlineLocalImages', () => {
  it('embeds a local image as a data URI', () => {
    const dir = tmpDir({ 'images/hero.jpg': 'JPEGDATA' })
    const html = '<img src="images/hero.jpg" alt="A hero">'
    const result = inlineLocalImages(html, dir)

    expect(result.html).toContain('data:image/jpeg;base64,')
    expect(result.html).toContain('alt="A hero"')
    expect(result.inlined).toEqual(['images/hero.jpg'])
    expect(result.unresolved).toEqual([])
  })

  it('reports a reference that resolves to nothing instead of shipping it', () => {
    const dir = tmpDir({})
    const result = inlineLocalImages('<img src="images/missing.jpg">', dir)
    expect(result.inlined).toEqual([])
    expect(result.unresolved).toEqual(['images/missing.jpg'])
  })

  it('leaves remote and already-inline references alone', () => {
    const dir = tmpDir({ 'images/hero.jpg': 'X' })
    const html =
      '<img src="https://example.com/a.jpg"><img src="data:image/png;base64,AA">'
    const result = inlineLocalImages(html, dir)
    expect(result.html).toBe(html)
    expect(result.inlined).toEqual([])
  })

  it('refuses a path that escapes the loop directory', () => {
    const dir = tmpDir({})
    const result = inlineLocalImages('<img src="../../etc/passwd">', dir)
    expect(result.inlined).toEqual([])
    expect(result.unresolved).toEqual(['../../etc/passwd'])
  })

  it('skips a file too large to inline rather than producing a 12MB document', () => {
    const dir = tmpDir({ 'images/huge.png': 'x'.repeat(2_000) })
    const result = inlineLocalImages('<img src="images/huge.png">', dir, { maxBytes: 500 })
    expect(result.skippedTooLarge).toEqual(['images/huge.png'])
    expect(result.html).toContain('src="images/huge.png"')
  })

  it('inlines several references at once', () => {
    const dir = tmpDir({ 'images/a.png': 'A', 'images/b.svg': '<svg/>' })
    const result = inlineLocalImages('<img src="images/a.png"><img src=\'images/b.svg\'>', dir)
    expect(result.inlined).toEqual(['images/a.png', 'images/b.svg'])
    expect(result.html).toContain('data:image/png;base64,QQ==')
    expect(result.html).toContain('data:image/svg+xml;base64,')
  })

  it('inlines the compacted JPEG when the reference names an oversized PNG', () => {
    // What the loop hit in practice: a generated 1.6MB PNG beside its compacted
    // JPEG. Refusing the reference because the PNG is heavy would leave the page
    // broken when the same picture is sitting there in embeddable form.
    const dir = tmpDir({ 'images/hero.png': 'x'.repeat(2_000), 'images/hero.jpg': 'small' })
    const result = inlineLocalImages('<img src="images/hero.png">', dir, { maxBytes: 500 })
    expect(result.inlined).toEqual(['images/hero.png'])
    expect(result.skippedTooLarge).toEqual([])
    expect(result.html).toContain('data:image/jpeg;base64,' + Buffer.from('small').toString('base64'))
  })

  it('never substitutes the inspector\'s screenshots for a missing image', () => {
    // .taste-skill/ holds pictures *of* the page. Embedding one as "the
    // photograph the page asked for" looks like a resolved reference and is not.
    const dir = tmpDir({ '.taste-skill/inspect/desktop-fold.jpg': 'a screenshot' })
    const result = inlineLocalImages('<img src="assets/photograph.jpg">', dir)
    expect(result.substituted).toEqual([])
    expect(result.unresolved).toEqual(['assets/photograph.jpg'])
    expect(result.html).toContain('src="assets/photograph.jpg"')
  })

  it('substitutes real generated images in turn rather than repeating one', () => {
    const dir = tmpDir({ 'hero.jpg': 'one', 'detail.jpg': 'two' })
    const result = inlineLocalImages('<img src="a.jpg"><img src="b.jpg"><img src="c.jpg">', dir)
    expect(result.unresolved).toEqual([])
    expect(result.substituted.map((s) => s.split(' <- ')[1])).toEqual(['detail.jpg', 'hero.jpg', 'detail.jpg'])
  })
})

describe('imageBrief', () => {
  it('states the path and what each photograph actually shows', () => {
    // The brief used to promise `images/hero.jpg` while the file landed in the
    // loop root, and it told the model to write alt text for a picture it had
    // never seen. Both are how alt text ends up describing a CERN data centre
    // over a photograph of a bridge.
    const brief = imageBrief([{ fileName: 'hero.jpg', description: 'a shipping container yard at dusk under sodium lamps' }])
    expect(brief).toContain('images/hero.jpg')
    expect(brief).toContain('a shipping container yard at dusk under sodium lamps')
    expect(brief).toMatch(/do not reference any image/)
  })
})

describe('imagePrompt', () => {
  it('asks for a photograph with light, lens and framing, and forbids lettering', () => {
    const prompt = imagePrompt('hero', 'a shipping container yard at dusk under sodium lamps')
    expect(prompt).toContain('35mm')
    expect(prompt).toMatch(/no text or lettering/i)
    expect(prompt).toContain('a shipping container yard at dusk under sodium lamps')
  })

  it('frames the detail as a close-up rather than a second establishing shot', () => {
    const prompt = imagePrompt('detail', 'a shipping container yard at dusk')
    expect(prompt).toContain('85mm')
    expect(prompt).toMatch(/close-up/i)
  })
})

describe('planImageSubjects', () => {
  const page = '<h1>Every pull request, running in seconds.</h1>'

  it('takes the two subjects from the model that wrote the page', async () => {
    const asked = await planImageSubjects(page, async () => 'Thinking… {"hero":"a container yard at dusk","detail":"corrugated steel under rain"}')
    expect(asked).toEqual({ hero: 'a container yard at dusk', detail: 'corrugated steel under rain' })
  })

  it('returns nothing rather than guessing when the model does not answer with JSON', async () => {
    expect(await planImageSubjects(page, async () => 'I would rather not.')).toBeUndefined()
    expect(await planImageSubjects(page, async () => '{"hero":"x"}')).toBeUndefined()
  })

  it('never sends page content through a throwaway parse failure', async () => {
    expect(await planImageSubjects(page, async () => '{')).toBeUndefined()
  })
})

describe('queryFromArtifact', () => {
  it('takes its terms from what the page is about, not a mood word', () => {
    const html =
      '<title>Meridian</title><h1>See every request.</h1><h2>Streaming telemetry</h2><h2>Alerting</h2>'
    const query = queryFromArtifact(html)
    expect(query).toContain('streaming')
    expect(query).toContain('telemetry')
    expect(query).not.toContain('gradient')
  })

  it('still returns something for a page with no headings', () => {
    expect(queryFromArtifact('<div>hello</div>').length).toBeGreaterThan(0)
  })
})

describe('imageBrief', () => {
  it('tells the model how to reference a picture and why an unresolved path is worse', () => {
    const brief = imageBrief([{ fileName: 'hero.jpg', credit: 'Wikimedia, CC BY' }])
    expect(brief).toContain('images/hero.jpg')
    expect(brief).toContain('Wikimedia, CC BY')
    expect(brief).toContain('alt')
    expect(brief).toMatch(/broken picture/)
  })

  it('is empty when there are no images', () => {
    expect(imageBrief([])).toBe('')
  })
})
