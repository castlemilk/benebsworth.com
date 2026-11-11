import { defineConfig } from '@playwright/test'

// An explicit port lets concurrent work avoid reusing an unrelated listener.
const port = Number(process.env.E2E_PORT ?? 4321)

export default defineConfig({
  testDir: './e2e',
  webServer: { command: `npx serve out -l ${port}`, port, reuseExistingServer: !process.env.E2E_PORT },
  use: { baseURL: `http://localhost:${port}` },
})
