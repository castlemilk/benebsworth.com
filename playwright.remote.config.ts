import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// Keep the existing suite; a remote check must never reuse a stale local server.
const port = Number(process.env.E2E_PORT || 4339)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid E2E_PORT')
// defineConfig(base, override) appends webServer entries, which would start the
// base server and this one on the same port. Replace the base server instead.
export default defineConfig({
  ...base,
  webServer: {
    command: `node_modules/.bin/serve out -l ${port}`,
    port,
    reuseExistingServer: false,
  },
  use: { ...base.use, baseURL: `http://localhost:${port}` },
})
