/** Prepared for an authorised browser review. Not executed in the authoring session. */
import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export default defineConfig({
  testDir: './browser', testMatch: '*.spec.mjs', fullyParallel: false, workers: 1,
  retries: 0, reporter: 'list', outputDir: join(tmpdir(), 'blog-motion05-browser'),
  use: { baseURL: 'http://127.0.0.1:8776', browserName: 'chromium', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: 'node workbenches/blog-motion05/serve.mjs',
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    env: { BLOG_MOTION05_PORT: '8776' },
    url: 'http://127.0.0.1:8776', reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop-light', use: { viewport: { width: 1280, height: 900 }, colorScheme: 'light' } },
    { name: 'narrow-light', use: { viewport: { width: 390, height: 844 }, colorScheme: 'light' } },
    { name: 'narrow-dark', use: { viewport: { width: 390, height: 844 }, colorScheme: 'dark' } },
  ],
})
