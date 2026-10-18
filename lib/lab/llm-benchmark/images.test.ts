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

  it('accepts the right picture under the wrong extension', () => {
    // The loop told the model `images/hero.jpg`; it wrote `images/hero.png`.
    // Same stem, same picture — the difference is three characters, not a
    // different file.
    const dir = tmpDir({ 'images/hero.jpg': 'aisle' })
    const result = inlineLocalImages('<img src="images/hero.png" alt="a">', dir)
    expect(result.unresolved).toEqual([])
    expect(result.inlined).toEqual(['images/hero.png'])
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

  it('gives a substituted picture the caption that matches it', () => {
    // The alt on this tag was written for a picture the model invented. After a
    // swap it describes the wrong image, which is worse than no alt at all.
    const dir = tmpDir({ 'images/hero.jpg': 'aisle' })
    const html = '<img src="assets/data-center-cern.jpg" alt="Racks at the CERN data centre">'
    const result = inlineLocalImages(html, dir, {
      descriptions: { 'hero.jpg': 'a data centre aisle at night under amber lights' },
    })
    expect(result.substituted).toHaveLength(1)
    expect(result.html).toContain('alt="a data centre aisle at night under amber lights"')
    expect(result.html).not.toContain('CERN')
  })

  it('leaves honest alt text alone when the reference resolved on its own', () => {
    const dir = tmpDir({ 'images/hero.jpg': 'aisle' })
    const html = '<img src="images/hero.jpg" alt="the aisle the model was told about">'
    const result = inlineLocalImages(html, dir, { descriptions: { 'hero.jpg': 'something else entirely' } })
    expect(result.html).toContain('alt="the aisle the model was told about"')
  })

  it('adds an alt to a substituted picture that had none', () => {
    const dir = tmpDir({ 'images/hero.jpg': 'aisle' })
    const result = inlineLocalImages('<img src="assets/nothing.jpg">', dir, {
      descriptions: { 'hero.jpg': 'a data centre aisle at night' },
    })
    expect(result.html).toContain('alt="a data centre aisle at night"')
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

  it('carries the page palette rather than a vague instruction', () => {
    expect(imagePrompt('hero', 'a rack aisle at night', 'slate, amber, near-black')).toContain(
      'palette of slate, amber, near-black'
    )
  })

  it('frames the detail as a close-up rather than a second establishing shot', () => {
    const prompt = imagePrompt('detail', 'a shipping container yard at dusk')
    expect(prompt).toContain('85mm')
    expect(prompt).toMatch(/close-up/i)
  })
})

describe('planImageSubjects', () => {
  const page = '<h1>Every pull request, running in seconds.</h1>'

  it('reads the page as prose, not as markup', async () => {
    // The page the loop actually passes in: an injected stylesheet up front and
    // a megabyte of base64 where the pictures are. Sliced raw, the model reads
    // CSS and base64 and answers about nothing — which is exactly what happened.
    const noisy = `<html><head><style>${'a{color:red}'.repeat(2000)}</style></head><body><h1>Preview environments</h1><img src="data:image/png;base64,${'QUJD'.repeat(20_000)}"><p>Ephemeral, per-branch.</p></body></html>`
    let sent = ''
    await planImageSubjects(noisy, async (prompt) => {
      sent = prompt
      return '{"hero":"a container yard at dusk","detail":"steel rails under rain"}'
    })
    expect(sent).toContain('Preview environments')
    expect(sent).toContain('Ephemeral, per-branch.')
    expect(sent).not.toContain('base64')
    expect(sent).not.toContain('color:red')
  })

  it('takes the subjects and the palette from the model that wrote the page', async () => {
    const asked = await planImageSubjects(
      page,
      async () =>
        'Thinking… {"hero":"a container yard at dusk","detail":"corrugated steel under rain","palette":"slate, amber, near-black"}'
    )
    expect(asked).toEqual({
      hero: 'a container yard at dusk',
      detail: 'corrugated steel under rain',
      palette: 'slate, amber, near-black',
    })
  })

  it('still works when the model names no palette', async () => {
    const asked = await planImageSubjects(page, async () => '{"hero":"a container yard at dusk","detail":"steel rails under rain"}')
    expect(asked?.palette).toBe('')
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
