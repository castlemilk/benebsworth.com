/** Dependency-free, loopback-only review server. No provider or deployment adapter. */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { renderIndex, renderReading } from './render.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const repo = resolve(here, '../..')
const files = new Map([
  ['/workbench.css', [resolve(here, 'workbench.css'), 'text/css; charset=utf-8']],
  ['/workbench.mjs', [resolve(here, 'workbench.mjs'), 'text/javascript; charset=utf-8']],
  ['/fixtures.mjs', [resolve(here, 'fixtures.mjs'), 'text/javascript; charset=utf-8']],
  ['/motion.mjs', [resolve(here, 'motion.mjs'), 'text/javascript; charset=utf-8']],
  ['/assets/fonts/source-serif-4.woff2', [resolve(repo, 'public/fonts/editorial/source-serif-4.woff2'), 'font/woff2']],
  ['/assets/fonts/barlow-condensed-semibold.woff2', [resolve(repo, 'public/fonts/editorial/barlow-condensed-semibold.woff2'), 'font/woff2']],
  ['/assets/fonts/caveat.woff2', [resolve(repo, 'public/fonts/editorial/caveat.woff2'), 'font/woff2']],
  ['/assets/topics/custom-v6/ee.svg', [resolve(repo, 'public/topics/custom-v6/ee.svg'), 'image/svg+xml']],
])

export function createWorkbenchServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost')
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('X-Content-Type-Options', 'nosniff')
      response.setHeader('Referrer-Policy', 'no-referrer')
      response.setHeader('Content-Security-Policy', `default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; script-src ${url.searchParams.get('enhance') === 'off' ? "'none'" : "'self'"}; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`)
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end('Method not allowed'); return }
      let body
      let type
      if (url.pathname === '/' || url.pathname === '/index.html') { body = renderIndex(url); type = 'text/html; charset=utf-8' }
      else if (url.pathname === '/reading.html') { body = renderReading(); type = 'text/html; charset=utf-8' }
      else if (url.pathname === '/missing-enhancement.mjs') { response.writeHead(503, { 'Content-Type': 'text/javascript; charset=utf-8' }); response.end('/* Deliberate failed-enhancement fixture. */'); return }
      else if (files.has(url.pathname)) { const entry = files.get(url.pathname); body = await readFile(entry[0]); type = entry[1] }
      else { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found'); return }
      response.writeHead(200, { 'Content-Type': type })
      response.end(request.method === 'HEAD' ? undefined : body)
    } catch {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('The local fixture could not be rendered.')
    }
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.BLOG_MOTION05_PORT || 8775)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Use a review port between 1024 and 65535')
  createWorkbenchServer().listen(port, '127.0.0.1', () => process.stdout.write(`Blog motion 05 review: http://127.0.0.1:${port}/\n`))
}
