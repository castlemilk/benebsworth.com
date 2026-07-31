import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('generated markdown siblings', () => {
  it('are in sync with published blog sources without mutating them', () => {
    expect(() => {
      execFileSync('node', ['scripts/gen-md-siblings.mjs', '--check'], {
        cwd: process.cwd(),
        stdio: 'pipe',
      })
    }).not.toThrow()
  })
})
