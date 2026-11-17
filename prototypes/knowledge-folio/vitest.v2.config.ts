import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/** Explicit opt-in source suite; does not change the site's shared test config. */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../../', import.meta.url)) } },
  test: {
    environment: 'node',
    maxWorkers: 1,
    include: ['prototypes/knowledge-folio/*-v2.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
