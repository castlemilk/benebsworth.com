import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Default to 'node': all planned unit tests are pure-logic / fs-based and need
  // no DOM. (jsdom fails to start workers under vitest 4 due to the
  // @asamuzakjp/css-color ESM/CJS conflict.) DOM-needing tests can opt in
  // per-file with `// @vitest-environment jsdom`.
  test: {
    environment: 'node',
    globals: true,
    // Only run app unit tests. Exclude legacy Gatsby tests and Playwright e2e
    // specs (the latter import @playwright/test and are run via `npm run e2e`).
    include: ['{components,lib,app}/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'legacy', 'e2e', 'out', '.next'],
  },
})
