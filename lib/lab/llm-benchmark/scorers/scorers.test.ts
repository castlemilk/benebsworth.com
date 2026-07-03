import { describe, it, expect } from 'vitest'
import { htmlScorer } from './html'
import { textScorer } from './text'
import { BENCHMARK_TASKS } from '../registry'

const htmlTask = BENCHMARK_TASKS.find((t) => t.id === 'n-body-field')!
const mathTask = BENCHMARK_TASKS.find((t) => t.id === 'equation-solver')!
const cryptoTask = BENCHMARK_TASKS.find((t) => t.id === 'crypto-hash-race')!

describe('html scorer', () => {
  it('scores a complete single-file HTML page highly', () => {
    const html = `<!DOCTYPE html>
<html><body>
<canvas id="c"></canvas>
<script>
const c = document.getElementById('c');
</script>
</body></html>`
    expect(htmlScorer.score(html, htmlTask)).toBeGreaterThan(60)
  })

  it('returns 0 for empty output', () => {
    expect(htmlScorer.score('', htmlTask)).toBe(0)
  })

  it('gives a low score to non-HTML output', () => {
    expect(htmlScorer.score('just prose', htmlTask)).toBeLessThan(20)
  })

  it('penalizes broken HTML', () => {
    expect(htmlScorer.score('<html><body><script>alert(1)</body></html>', htmlTask)).toBeLessThan(60)
  })
})

describe('text scorer', () => {
  it('scores a math solution with expected keywords', () => {
    const text = 'Solving x^2 + y^2 = 25 and x*y = 12 gives solution pairs (3,4) and (-3,-4).'
    expect(textScorer.score(text, mathTask)).toBeGreaterThan(40)
  })

  it('scores a crypto module with expected keywords', () => {
    const text = 'import hmac; def compare_digest(a,b): ...; def pbkdf2(password, salt): ...; def verify(value, hash): ...'
    expect(textScorer.score(text, cryptoTask)).toBeGreaterThan(40)
  })

  it('returns 0 for empty output', () => {
    expect(textScorer.score('', mathTask)).toBe(0)
  })

  it('returns a low score for irrelevant text', () => {
    expect(textScorer.score('hello world', mathTask)).toBeLessThan(30)
  })
})
