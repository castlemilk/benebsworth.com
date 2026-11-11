import { defineConfig } from '@playwright/test'

// An explicit port lets concurrent work avoid reusing an unrelated listener.
const port = Number(process.env.E2E_PORT ?? 4321)

export default defineConfig({
  testDir: './e2e',
  webServer: { command: `npx serve out -l ${port}`, port, reuseExistingServer: !process.env.E2E_PORT },
  // On CI, keep a trace and screenshot of every failure so a runner-only
  // failure can be read rather than guessed at (uploaded by site-checks.yml).
  use: {
    baseURL: `http://localhost:${port}`,
    trace: process.env.CI ? 'retain-on-failure' : 'off',
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
  },
})
