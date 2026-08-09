import { describe, it, expect } from 'vitest'
import { htmlScorer } from './html'
import { textScorer } from './text'
import { selectScorer } from './index'
import { behavioralScorer } from './behavioral'
import { BENCHMARK_TASKS } from '../registry'

const htmlTask = BENCHMARK_TASKS.find((t) => t.id === 'n-body-field')!
const mathTask = BENCHMARK_TASKS.find((t) => t.id === 'equation-solver')!
const cryptoTask = BENCHMARK_TASKS.find((t) => t.id === 'crypto-hash-race')!

// Both scorers are synchronous; narrow the `number | Promise<number>` interface
// return so scores can be used as matcher arguments.
const scoreHtml = (output: string) => htmlScorer.score(output, htmlTask) as number
const scoreText = (output: string, task = mathTask) => textScorer.score(output, task) as number

describe('html scorer', () => {
  it('scores a complete well-formed page with scripts at 95 or above', () => {
    const html = `<!DOCTYPE html>
<html>
<head><style>body { margin: 0; }</style></head>
<body>
<canvas id="c"></canvas>
<script>
const c = document.getElementById('c');
const ctx = c.getContext('2d');
function draw() { ctx.fillRect(0, 0, 10, 10); requestAnimationFrame(draw); }
draw();
</script>
</body></html>`
    expect(htmlScorer.score(html, htmlTask)).toBeGreaterThanOrEqual(95)
  })

  it('scores an empty shell materially lower than a working page', () => {
    const shell = '<html><body></body></html>'
    const shellScore = htmlScorer.score(shell, htmlTask)
    expect(shellScore).toBeLessThanOrEqual(60)
  })

  it('does not false-positive the broken-pattern check on well-formed scripts', () => {
    // Minimal well-formed page with a closed script: the old lookahead regex
    // flagged every page like this as broken.
    const html = `<!DOCTYPE html>
<html><body>
<canvas id="c"></canvas>
<script>
const c = document.getElementById('c');
</script>
</body></html>`
    expect(htmlScorer.score(html, htmlTask)).toBeGreaterThanOrEqual(95)
  })

  it('returns 0 for empty output', () => {
    expect(htmlScorer.score('', htmlTask)).toBe(0)
  })

  it('gives a low score to non-HTML output', () => {
    expect(htmlScorer.score('just prose', htmlTask)).toBeLessThan(20)
  })

  it('penalizes an unclosed script tag', () => {
    expect(htmlScorer.score('<html><body><script>alert(1)</body></html>', htmlTask)).toBeLessThan(60)
  })

  it('penalizes doubled-bracket garbage', () => {
    const clean = '<html><body><p>hi</p><script>go();</script></body></html>'
    const garbage = '<html><body><p>hi</p><<script>go();</script></body></html>'
    expect(scoreHtml(garbage)).toBeLessThan(scoreHtml(clean))
  })
})

describe('text scorer', () => {
  it('scores a correct equation solution with two distinct pairs highly', () => {
    const text = 'Solving x^2 + y^2 = 25 and x*y = 12 gives solution pairs (3,4) and (-3,-4).'
    expect(textScorer.score(text, mathTask)).toBeGreaterThanOrEqual(60)
  })

  it('recognizes unicode-minus pairs and x=/y= assignment form', () => {
    const text = 'x = 3, then y = 4. Also (−3, −4) works since xy = 12 and x² + y² = 25.'
    expect(textScorer.score(text, mathTask)).toBeGreaterThanOrEqual(60)
  })

  it('no longer scores keyword-stuffed garbage as a correct solution', () => {
    const garbage = scoreText('x y 12 25 = ...')
    expect(garbage).toBeLessThan(50)
    const correct = scoreText('The real solutions are (3,4), (4,3), (-3,-4) and (-4,-3).')
    expect(correct).toBeGreaterThan(garbage)
  })

  it('scores a crypto module with expected keywords', () => {
    const text = 'import hmac; def compare_digest(a,b): ...; def pbkdf2(password, salt): ...; def verify(value, hash): ...'
    expect(textScorer.score(text, cryptoTask)).toBeGreaterThan(40)
  })

  it('does not penalize legitimate code that handles exceptions', () => {
    const base =
      'import hmac, hashlib, os\nsalt = os.urandom(16)\nkey = hashlib.pbkdf2_hmac("sha256", pw, salt, 100000)\ndef verify(a, b):\n    return hmac.compare_digest(a, b)'
    const withExcept = base + '\ntry:\n    verify(a, b)\nexcept Exception:\n    raise ValueError("error")'
    expect(scoreText(withExcept, cryptoTask)).toBeGreaterThanOrEqual(scoreText(base, cryptoTask))
  })

  it('penalizes genuine runtime-error transcripts', () => {
    const clean = 'result = compare_digest(a, b) with salt and pbkdf2 verify: passed 12 of 12'
    const traceback =
      clean + '\nTraceback (most recent call last):\n  File "x.py", line 1\nSyntaxError: invalid syntax'
    expect(scoreText(traceback, cryptoTask)).toBeLessThan(scoreText(clean, cryptoTask))
  })

  it('returns 0 for empty output', () => {
    expect(textScorer.score('', mathTask)).toBe(0)
  })

  it('returns a low score for irrelevant text', () => {
    expect(textScorer.score('hello world', mathTask)).toBeLessThan(30)
  })
})

describe('selectScorer', () => {
  it('routes HTML categories to the behavioral scorer and the rest to text', () => {
    // HTML categories now use the Playwright-backed behavioral scorer (which
    // composites 70% behavioral + 30% structural). The structural htmlScorer
    // remains exported for callers that want the legacy pure-structural score.
    expect(selectScorer(htmlTask)).toBe(behavioralScorer)
    expect(selectScorer(mathTask)).toBe(textScorer)
    expect(selectScorer(cryptoTask)).toBe(textScorer)
  })
})
