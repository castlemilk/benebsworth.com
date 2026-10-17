import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { imageBrief, inlineLocalImages, queryFromArtifact } from './images.js'

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
    expect(brief).toMatch(/worse than no/)
  })

  it('is empty when there are no images', () => {
    expect(imageBrief([])).toBe('')
  })
})
