import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))
const evidenceRoot = path.join(repositoryRoot, 'test-results/kg02-review')

/**
 * Isolated static-prototype verification. This does not start the production
 * Next app, control the user's browser, publish the prototype or alter routes.
 * A dedicated port and reuseExistingServer:false reject a stale listener.
 */
export default defineConfig({
  testDir: fileURLToPath(new URL('.', import.meta.url)),
  testMatch: 'knowledge.browser.spec.mjs',
  outputDir: path.join(evidenceRoot, 'results'),
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(evidenceRoot, 'report.json') }],
  ],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:4873/prototypes/knowledge-folio/',
    viewport: { width: 1280, height: 900 },
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-AU',
    timezoneId: 'Australia/Melbourne',
    // The default is Playwright's installed Chromium. A reviewer may explicitly
    // select a system binary; record its version with the resulting evidence.
    launchOptions: process.env.KG02_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.KG02_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: 'python3 -m http.server 4873 --bind 127.0.0.1',
    cwd: repositoryRoot,
    url: 'http://127.0.0.1:4873/prototypes/knowledge-folio/',
    reuseExistingServer: false,
    timeout: 15_000,
  },
})
