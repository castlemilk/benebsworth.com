import { execFileSync } from 'node:child_process'
import { describe, it, expect } from 'vitest'
describe('diagram text stream portability', () => {
  it('writes identical useful text to both stdout aliases', () => {
    const run = (target: string) => execFileSync('python3', ['scripts/render-diagram.py', 'content/blog/pll-from-first-principles/pll-feedback.json', '--llm', target], {encoding:'utf8'})
    const text=run('-')
    expect(text.length).toBeGreaterThan(100)
    expect(run('/dev/stdout')).toBe(text)
    expect(text).not.toContain('wrote LLM-friendly')
  })
})
