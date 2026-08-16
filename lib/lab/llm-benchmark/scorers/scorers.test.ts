import { describe, it, expect } from 'vitest'
import { htmlScorer } from './html'
import { textScorer } from './text'
import { behavioralTaskIds, selectScorer } from './index'
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

  it("prefers the task's own scorer declaration over its category", () => {
    // A text-scored task sitting in an HTML-runnable category, and vice versa.
    // Both would resolve the other way under the heuristic alone.
    expect(selectScorer({ ...htmlTask, scorer: 'text' })).toBe(textScorer)
    expect(selectScorer({ ...mathTask, scorer: 'behavioral' })).toBe(behavioralScorer)
    // 'html' is a registered name even though no shipped task declares it.
    expect(selectScorer({ ...mathTask, scorer: 'html' })).toBe(htmlScorer)
  })

  it('falls back to the category heuristic when no scorer is declared', () => {
    const { scorer: _htmlScorerName, ...unstampedHtml } = htmlTask
    const { scorer: _mathScorerName, ...unstampedMath } = mathTask
    expect(selectScorer(unstampedHtml)).toBe(behavioralScorer)
    expect(selectScorer(unstampedMath)).toBe(textScorer)
    // A category nobody has heard of is text — the pre-existing default.
    expect(selectScorer({ ...unstampedMath, category: 'brand-new-category' })).toBe(textScorer)
  })

  it('resolves every shipped task exactly as the pre-registry heuristic did', () => {
    // Behaviour lock: stamping `scorer` on the registry must not have moved a
    // single task to a different scorer. This replays the OLD implementation
    // (category set only, ignoring task.scorer) over the full registry.
    const LEGACY_HTML_CATEGORIES = new Set([
      '3d-physics-animation',
      'advanced-game-building',
      'advanced-physics',
      'advanced-electronics',
      'ui-building',
    ])
    for (const task of BENCHMARK_TASKS) {
      const legacy = LEGACY_HTML_CATEGORIES.has(task.category) ? behavioralScorer : textScorer
      expect(selectScorer(task), `${task.id} scorer`).toBe(legacy)
    }
  })
})

describe('behavioralTaskIds', () => {
  it('returns exactly the built-in behaviourally-scored tasks plus plugin tasks', () => {
    // The BUILT-IN half is pinned by hand — that is the regression net (a task
    // that silently stops being behaviourally scored, or one that quietly
    // starts). The PLUGIN half is derived from the roster instead: pinning it
    // would make every contributed task a core-file edit, which is exactly the
    // coupling the plugin system exists to remove. Deriving still asserts
    // something real — that a plugin task declaring `scorer: 'behavioral'`
    // reaches `behavioralTaskIds` at all.
    const builtins = [
      'circuit-builder-teaser',
      'landing-page-morph',
      'mini-platformer',
      'n-body-field',
      'physics-pendulum-wave',
    ]
    const contributed = BENCHMARK_TASKS.filter((t) => t.pluginId && t.scorer === 'behavioral').map(
      (t) => t.id,
    )
    // Sanity: the shipped roster contributes at least the community-tasks one,
    // so the derived half can never go vacuously empty.
    expect(contributed).toContain('tic-tac-toe')
    expect([...behavioralTaskIds(BENCHMARK_TASKS)].sort()).toEqual(
      [...builtins, ...contributed].sort(),
    )
  })

  it('picks up a task declared behavioral regardless of its category', () => {
    const extra = { ...mathTask, id: 'future-task', scorer: 'behavioral' as const }
    expect(behavioralTaskIds([...BENCHMARK_TASKS, extra]).has('future-task')).toBe(true)
  })
})
