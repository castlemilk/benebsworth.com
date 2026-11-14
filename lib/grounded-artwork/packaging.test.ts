import { spawnSync } from 'node:child_process'
import { it, expect } from 'vitest'

// Fresh-checkout preparation is owned by npm/Task hooks, never concurrent test
// workers. These regressions mutate only isolated temporary fixture directories.
it('gates bounded lossless source expansion, all output bytes and build hooks', () => {
  const run = spawnSync(process.execPath, ['--test', 'scripts/tests/prepare-grounded-artwork.test.mjs'], { encoding: 'utf8', timeout: 240000 })
  expect(run.error).toBeUndefined()
  expect(run.status, run.stdout + run.stderr).toBe(0)
  expect(run.stdout).toMatch(/(?:pass|passed) 14/)
}, 250000)
