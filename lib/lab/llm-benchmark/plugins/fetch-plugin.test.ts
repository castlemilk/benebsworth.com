import { describe, it, expect } from 'vitest'
import { THIRD_PARTY_DIR, repoDirName, fetchTargetProblem, reviewChecklist } from './fetch-plugin'

// No network anywhere in this file: the script owns `git clone`, these helpers
// own every decision that can be made without it.

describe('repoDirName', () => {
  it('derives the repo name from the URL forms git actually accepts', () => {
    expect(repoDirName('https://github.com/acme/bench-plugin.git')).toBe('bench-plugin')
    expect(repoDirName('https://github.com/acme/bench-plugin')).toBe('bench-plugin')
    expect(repoDirName('https://github.com/acme/bench-plugin/')).toBe('bench-plugin')
    expect(repoDirName('git@github.com:acme/bench-plugin.git')).toBe('bench-plugin')
    expect(repoDirName('ssh://git@host:2222/acme/bench-plugin.git')).toBe('bench-plugin')
    expect(repoDirName('  https://example.com/a/b/deep-plugin.GIT  ')).toBe('deep-plugin')
    expect(repoDirName('../local/checkout')).toBe('checkout')
  })

  it('refuses a name that would escape the target directory', () => {
    // The value is joined onto a path; sanitizing is how a traversal ships.
    for (const url of ['', '   ', '/', 'https://github.com/acme/.git', '..', 'https://host/a/..']) {
      expect(repoDirName(url), url).toBeNull()
    }
  })
})

describe('fetchTargetProblem', () => {
  it('passes a fresh target', () => {
    expect(fetchTargetProblem('https://github.com/acme/bench-plugin.git', ['other'])).toBeNull()
  })

  it('requires a URL', () => {
    expect(fetchTargetProblem('')).toMatch(/git URL is required/)
  })

  it('explains an underivable name rather than inventing one', () => {
    expect(fetchTargetProblem('https://github.com/acme/.git')).toMatch(/cannot derive a directory name/)
  })

  it('refuses an existing directory — re-cloning would swap reviewed code', () => {
    const problem = fetchTargetProblem('https://github.com/acme/bench-plugin.git', ['bench-plugin'])
    expect(problem).toMatch(/already exists/)
    expect(problem).toContain(`${THIRD_PARTY_DIR}/bench-plugin`)
  })
})

describe('reviewChecklist', () => {
  it('names the validate command, the demo read, and the manual roster step', () => {
    const text = reviewChecklist('bench-plugin').join('\n')
    expect(text).toContain('task bench:plugin-validate')
    expect(text).toContain(`${THIRD_PARTY_DIR}/bench-plugin/demo.tsx`)
    expect(text).toContain('plugins/index.ts')
    expect(text).toContain("deny: ['demos']")
    // The honest gitignore answer: the site builds from this code, so it is
    // committed after review rather than hidden.
    expect(text).toMatch(/NOT gitignored/)
  })
})
