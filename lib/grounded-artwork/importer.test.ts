import { spawnSync } from 'node:child_process'
import { it, expect } from 'vitest'

// The scan now verifies 105 works/945 assets; retain a finite bound with CPU headroom.
it('gates imported art integrity, safe SVG and bounded thumbnails through the owned CLI regressions', () => {
  const run = spawnSync(process.execPath, ['--test', 'scripts/tests/import-grounded-artwork.test.mjs'], { encoding: 'utf8', timeout: 60000 })
  expect(run.error).toBeUndefined()
  expect(run.status, run.stdout + run.stderr).toBe(0)
  expect(run.stdout).toMatch(/(?:pass|passed) 18/)
}, 65000)
