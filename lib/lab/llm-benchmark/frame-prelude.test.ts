import { describe, it, expect } from 'vitest'
import { withPrelude, isFullHtmlDoc, needsRuntimeCompiler } from './frame-prelude'

describe('withPrelude', () => {
  it('prepends a DOCTYPE when the artifact is missing one', () => {
    const html = '<html><head><title>x</title></head><body>y</body></html>'
    const out = withPrelude(html)
    expect(out.toLowerCase().startsWith('<!doctype html>')).toBe(true)
    // The DOCTYPE must come before any other node — a DOCTYPE after content
    // still triggers quirks mode in some renderers.
    expect(/^<!doctype html>/i.test(out.trimStart())).toBe(true)
  })

  it('does not double-prepend DOCTYPE when already present', () => {
    const html = '<!DOCTYPE html><html><head></head><body>y</body></html>'
    const out = withPrelude(html)
    expect(out.match(/<!doctype/gi)?.length).toBe(1)
  })

  it('injects a viewport meta when the artifact omits one', () => {
    const html = '<!DOCTYPE html><html><head></head><body></body></html>'
    const out = withPrelude(html)
    expect(/<meta[^>]*name=["']viewport["']/i.test(out)).toBe(true)
  })

  it('does not duplicate the viewport meta when one already exists', () => {
    const html =
      '<!DOCTYPE html><html><head><meta name="viewport" content="width=600"></head><body></body></html>'
    const out = withPrelude(html)
    expect(out.match(/<meta[^>]*name=["']viewport["']/gi)?.length).toBe(1)
  })

  it('inserts the prelude into <head> when present', () => {
    const html = '<!DOCTYPE html><html><head><title>x</title></head><body>y</body></html>'
    const out = withPrelude(html)
    // FRAME_PRELUDE starts with <style> — should appear right after <head>
    expect(out.indexOf('<title>x</title>')).toBeGreaterThan(0)
    expect(out.indexOf('background:#0c0c10')).toBeGreaterThan(0)
    // Reset CSS must come BEFORE the body so the body sees the reset.
    expect(out.indexOf('margin:0;padding:0')).toBeLessThan(out.indexOf('<body'))
  })

  it('inserts a synthesized <head> when the artifact has <html> but no <head>', () => {
    const html = '<!DOCTYPE html><html><body>y</body></html>'
    const out = withPrelude(html)
    expect(/<head>[\s\S]*<\/head>/i.test(out)).toBe(true)
    expect(out.indexOf('background:#0c0c10')).toBeGreaterThan(0)
  })

  it('inserts prelude before content when neither <head> nor <html> is present', () => {
    const html = '<canvas id="c"></canvas><script>draw();</script>'
    const out = withPrelude(html)
    // Should not throw, should inject both reset CSS and the localStorage shim.
    expect(out.indexOf('background:#0c0c10')).toBeGreaterThan(0)
    expect(out.indexOf('localStorage')).toBeGreaterThan(0)
  })

  it('includes the localStorage / sessionStorage shim', () => {
    const html = '<!DOCTYPE html><html><body>y</body></html>'
    expect(withPrelude(html)).toMatch(/Object\.defineProperty\(window,\s*['"]localStorage['"]/)
  })

  it('includes the runtime-error reporter that posts to the parent', () => {
    const html = '<!DOCTYPE html><html><body>y</body></html>'
    const out = withPrelude(html)
    expect(out).toMatch(/__llmDemoError/)
    expect(out).toMatch(/parent\.postMessage/)
  })

  it('includes a renderable error-overlay element the parent can read', () => {
    // The overlay is what the parent iframe wrapper reads back to surface
    // silent failures; without it, JS errors stay invisible behind a blank canvas.
    const html = '<!DOCTYPE html><html><body>y</body></html>'
    const out = withPrelude(html)
    expect(out).toMatch(/id=["']__llm-demo-error["']/)
  })

  it('handles an artifact that is just a bare script tag', () => {
    const html = '<script>init();</script>'
    const out = withPrelude(html)
    // Must not crash; must inject CSS reset and DOCTYPE.
    expect(out.toLowerCase()).toContain('<!doctype html>')
    expect(out).toContain('init();')
  })

  it('handles an artifact that contains <!doctype html> in a comment or attribute', () => {
    const html = '<div title="<!DOCTYPE html> is required">x</div>'
    const out = withPrelude(html)
    // The DOCTYPE we prepend is the real declaration, not just a substring.
    expect(out.toLowerCase().startsWith('<!doctype html>')).toBe(true)
  })
})

describe('isFullHtmlDoc', () => {
  it('recognises documents that start with <!doctype html>', () => {
    expect(isFullHtmlDoc('<!DOCTYPE html><html></html>')).toBe(true)
  })

  it('recognises documents that have an <html> tag within the first 400 chars', () => {
    expect(isFullHtmlDoc('<html><body>x</body></html>')).toBe(true)
  })

  it('rejects snippets without an html root', () => {
    expect(isFullHtmlDoc('const x = 1;\nconsole.log(x);')).toBe(false)
  })
})

describe('needsRuntimeCompiler', () => {
  it('flags babel-style type tags', () => {
    expect(needsRuntimeCompiler('<script type="text/babel">x()</script>')).toBe(true)
  })

  it('passes through plain classic scripts', () => {
    expect(needsRuntimeCompiler('<script>x()</script>')).toBe(false)
  })
})
