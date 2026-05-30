import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  webServer: { command: 'npx serve out -l 4321', port: 4321, reuseExistingServer: true },
  use: { baseURL: 'http://localhost:4321' },
})
