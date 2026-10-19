import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { captureIntoGamma, defaultGammaCaptureOptions, evaluateGates } from './capture.js'

/**
 * The gate is the whole point: the rubric read 100 on a page with ten design
 * defects, so a capture decision that trusted the rubric alone would fill
 * Gamma's inbox with exactly the pages it exists to stop people copying.
 */
function artefact(body = 'hi'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamma-capture-'))
  const file = path.join(dir, 'page.html')
  fs.writeFileSync(file, `<html><body>${body}</body></html>`)
  return file
}

const base = { model: 'zai-coding-plan/glm-5.3', loop: 2 }

describe('captureIntoGamma', () => {
  it('declines a low rubric without invoking the client', async () => {
    const result = await captureIntoGamma(
      artefact(),
      { ...base, score: 65, fails: 1, title: 'x', notes: '' },
      { scriptPath: '/nonexistent/capture-page.mjs', apiUrl: 'http://127.0.0.1:3000' }
    )
    expect(result.captured).toBe(false)
    expect(result.reason).toContain('65 < 90')
  })

  it('declines a high rubric that still carries design defects', async () => {
    const result = await captureIntoGamma(
      artefact(),
      { ...base, score: 100, fails: 10, title: 'x', notes: '' },
      { scriptPath: '/nonexistent/capture-page.mjs', apiUrl: 'http://127.0.0.1:3000' }
    )
    expect(result.captured).toBe(false)
    expect(result.reason).toContain('10 design FAIL findings')
  })

  it('declines an unscored loop rather than guessing', async () => {
    const result = await captureIntoGamma(
      artefact(),
      { ...base, title: 'x', notes: '' },
      { scriptPath: '/nonexistent/capture-page.mjs', apiUrl: 'http://127.0.0.1:3000' }
    )
    expect(result.reason).toContain('not scored')
  })

  it('declines when there is no artefact', async () => {
    const result = await captureIntoGamma(
      '/nonexistent/page.html',
      { ...base, score: 100, fails: 0, title: 'x', notes: '' },
      { scriptPath: '/nonexistent/capture-page.mjs', apiUrl: 'http://127.0.0.1:3000' }
    )
    expect(result.reason).toContain('no artefact')
  })

  it('reports a client failure without throwing — the inbox is a side effect', async () => {
    const result = await captureIntoGamma(
      artefact(),
      { ...base, score: 100, fails: 0, title: 'x', notes: '' },
      { scriptPath: '/nonexistent/capture-page.mjs', apiUrl: 'http://127.0.0.1:3000' }
    )
    expect(result.captured).toBe(false)
  })

  // Gamma's inbox is read by people looking for examples to copy. A page that
  // scores well while shipping references to files that do not exist is exactly
  // the page that must not get there, and neither signal above can see it.
  it('declines a page whose picture references do not resolve', async () => {
    const result = await captureIntoGamma(
      // One picture that loads, one that does not: a page can satisfy the first
      // check and still ship a hole.
      artefact('<img src="data:image/png;base64,AAA"><img src="assets/data-center.jpg">'),
      { ...base, score: 96, fails: 1, title: 'x', notes: '' },
      { scriptPath: '/nonexistent/capture-page.mjs', apiUrl: 'http://127.0.0.1:3000', requireImages: true }
    )
    expect(result.captured).toBe(false)
    expect(result.reason).toContain('do not resolve')
  })

  it('declines a page with no pictures at all', async () => {
    const result = await captureIntoGamma(
      artefact(),
      { ...base, score: 96, fails: 1, title: 'x', notes: '' },
      { scriptPath: '/nonexistent/capture-page.mjs', apiUrl: 'http://127.0.0.1:3000', requireImages: true }
    )
    expect(result.captured).toBe(false)
    expect(result.reason).toContain('no pictures')
  })

  it('still declines on the client when the page carries its own pictures', async () => {
    const result = await captureIntoGamma(
      artefact('<img src="data:image/png;base64,AAA">'),
      { ...base, score: 96, fails: 1, title: 'x', notes: '' },
      { scriptPath: '/nonexistent/capture-page.mjs', apiUrl: 'http://127.0.0.1:3000', requireImages: true }
    )
    // It got past both gates; the failure now is the client, not the page.
    expect(result.captured).toBe(false)
    expect(result.reason).not.toContain('pictures')
  })

  it('leaves the check off when it is not asked for', async () => {
    const result = await captureIntoGamma(
      artefact(),
      { ...base, score: 100, fails: 0, title: 'x', notes: '' },
      { scriptPath: '/nonexistent/capture-page.mjs', apiUrl: 'http://127.0.0.1:3000' }
    )
    expect(result.reason).not.toContain('pictures')
  })
})

describe('defaultGammaCaptureOptions', () => {
  it('resolves only when Gamma is actually present', () => {
    const options = defaultGammaCaptureOptions()
    // Either this machine has Gamma (and it is wired), or it does not (and the
    // loop runs unchanged) — never a path that does not exist.
    if (options) expect(fs.existsSync(options.scriptPath)).toBe(true)
  })
})

describe('capture size limit', () => {
  it('refuses a page the inbox would reject, before POSTing it', async () => {
    // Found by failing: the first page to clear every quality gate came back
    // `413 Capture exceeds 500 KB`. A self-contained page with three photographs
    // in it is over half a megabyte, so this is the normal case, not an edge.
    const result = await captureIntoGamma(
      artefact('x'.repeat(600_000)),
      { ...base, score: 96, fails: 0, title: 'x', notes: '' },
      { scriptPath: '/nonexistent/capture-page.mjs', apiUrl: 'http://127.0.0.1:3000', maxArtefactBytes: 500_000 }
    )
    expect(result.captured).toBe(false)
    expect(result.reason).toContain('over the capture limit')
  })

  it('lets a page under the limit through the size gate', () => {
    const gates = evaluateGates(
      { score: 96, fails: 1, embeddedImages: 3, unresolvedImages: 0, artefactBytes: 480_000 },
      { requireImages: true, maxArtefactBytes: 500_000 }
    )
    expect(gates.ok).toBe(true)
  })
})
