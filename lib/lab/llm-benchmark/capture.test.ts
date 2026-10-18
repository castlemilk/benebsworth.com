import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { captureIntoGamma, defaultGammaCaptureOptions } from './capture.js'

/**
 * The gate is the whole point: the rubric read 100 on a page with ten design
 * defects, so a capture decision that trusted the rubric alone would fill
 * Gamma's inbox with exactly the pages it exists to stop people copying.
 */
function artefact(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamma-capture-'))
  const file = path.join(dir, 'page.html')
  fs.writeFileSync(file, '<html><body>hi</body></html>')
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
})

describe('defaultGammaCaptureOptions', () => {
  it('resolves only when Gamma is actually present', () => {
    const options = defaultGammaCaptureOptions()
    // Either this machine has Gamma (and it is wired), or it does not (and the
    // loop runs unchanged) — never a path that does not exist.
    if (options) expect(fs.existsSync(options.scriptPath)).toBe(true)
  })
})
