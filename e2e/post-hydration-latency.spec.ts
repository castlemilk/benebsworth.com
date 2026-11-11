import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'

// docs/postmortem/0009. When a post's JavaScript landed well after its HTML,
// the theme provider's first-visit re-render reached Suspense boundaries React
// had not hydrated yet, and the post stayed on the root loading skeleton for
// good. Serving the export with a fixed delay on every response recreates that
// timing: before the fix, 11 of 12 first-visit loads stuck at 30 ms and 45 ms.
// Playwright's route delays and Chrome's network throttling did not reproduce
// it, so this spec runs its own server, and six loads make a regression all but
// certain to fail.

const OUT = path.join(process.cwd(), 'out')
const LATENCY_MS = 40
const LOADS = 6
const POST = '/blog/how-dram-remembers-a-bit/'
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

let server: http.Server
let origin = ''

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
    const file = path.join(OUT, pathname.endsWith('/') ? `${pathname}index.html` : pathname)
    setTimeout(() => {
      if (!file.startsWith(OUT + path.sep)) return void res.writeHead(403).end()
      fs.readFile(file, (err, body) => {
        if (err) return void res.writeHead(404).end()
        res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' }).end(body)
      })
    }, LATENCY_MS)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

test('a first-visit blog post hydrates out of its loading skeleton when every request is slow', async ({ browser }) => {
  for (let load = 1; load <= LOADS; load++) {
    // A fresh context has no stored theme: the first-visit path that failed.
    const context = await browser.newContext()
    await context.route('https://www.googletagmanager.com/**', (route) => route.abort())
    await context.route('https://storage.googleapis.com/**', (route) => route.abort())
    const page = await context.newPage()
    await page.goto(origin + POST)
    // Role locators skip the hidden streamed copy of the article, and the
    // stuck state hides the real <main>, so this only passes on a revealed post.
    await expect(page.getByRole('main').getByRole('article').first(), `load ${load} of ${LOADS}`).toBeVisible({ timeout: 15_000 })
    await context.close()
  }
})
