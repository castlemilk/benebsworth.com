import { spawnSync } from 'node:child_process'
import { it, expect } from 'vitest'

it('gates imported art integrity, safe SVG and bounded thumbnails through the owned CLI regressions', () => {
  const run = spawnSync(process.execPath, ['--test', 'scripts/tests/import-grounded-artwork.test.mjs'], { encoding: 'utf8', timeout: 25000 })
  expect(run.error).toBeUndefined()
  expect(run.status, run.stdout + run.stderr).toBe(0)
  expect(run.stdout).toMatch(/(?:pass|passed) 5/)
}, 30000)
