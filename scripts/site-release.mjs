#!/usr/bin/env node
// Portable release evidence. This script never uploads or changes source files.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
export function validateSha(value) {
  if (!/^[0-9a-f]{40}$/.test(value ?? '')) throw new Error('Expected a full lowercase 40-character commit SHA')
  return value
}
export function validateArticlePath(value) {
  if (!/^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(value ?? '')) throw new Error('Expected /blog/<published-slug>/')
  return value
}
export function assertCommit(root, expected) {
  validateSha(expected)
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  if (git('rev-parse', 'HEAD') !== expected) throw new Error('Checkout does not match the selected commit')
  if (git('status', '--porcelain', '--untracked-files=normal')) throw new Error('Release requires a clean, fully committed checkout')
  if (readdirSync(root).some((name) => name.startsWith('.env') && name !== '.env.example')) throw new Error('Remote release must use explicit workflow configuration, not local .env files')
}
export function inventory(directory) {
  const files = {}
  function visit(dir, prefix = '') {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name), rel = prefix + name
      const stat = lstatSync(path)
      if (stat.isSymbolicLink()) throw new Error(`Export contains symlink: ${rel}`)
      if (stat.isDirectory()) visit(path, rel + '/')
      else if (stat.isFile() && rel !== 'build-info.json') files[rel] = sha256(readFileSync(path))
      else if (!stat.isFile()) throw new Error(`Export contains unsupported entry: ${rel}`)
    }
  }
  visit(directory)
  for (const required of ['index.html', 'blog/index.html', 'sitemap.xml', 'pagefind/pagefind.js']) {
    if (!files[required]) throw new Error(`Incomplete export: ${required}`)
  }
  return files
}
export function assertAnalytics(root, measurementId) {
  if (!/^G-[A-Z0-9]+$/.test(measurementId ?? '')) throw new Error('Production requires NEXT_PUBLIC_GA_MEASUREMENT_ID (existing public GA4 setting)')
  const marker = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  if (!Object.keys(inventory(join(root, 'out'))).some((file) => file.endsWith('.html') && readFileSync(join(root, 'out', file), 'utf8').includes(marker))) {
    throw new Error('Export is missing the configured production GA4 loader')
  }
}
export function stamp(root, commit) {
  assertCommit(root, commit)
  const files = inventory(join(root, 'out'))
  const info = { commit, artifactSha256: sha256(JSON.stringify(files)), builtAt: new Date().toISOString() }
  mkdirSync(join(root, '.next'), { recursive: true })
  writeFileSync(join(root, '.next/site-release.json'), JSON.stringify({ info, files }, null, 2) + '\n')
  writeFileSync(join(root, 'out/build-info.json'), JSON.stringify(info, null, 2) + '\n')
  return info
}
export function verifyArtifact(root, commit) {
  assertCommit(root, commit)
  const manifest = JSON.parse(readFileSync(join(root, '.next/site-release.json'), 'utf8'))
  const info = JSON.parse(readFileSync(join(root, 'out/build-info.json'), 'utf8'))
  if (info.commit !== commit || JSON.stringify(info) !== JSON.stringify(manifest.info)) throw new Error('Build receipt does not match selected commit')
  if (sha256(JSON.stringify(inventory(join(root, 'out')))) !== info.artifactSha256) throw new Error('Export changed after validation')
  return manifest
}
export function sitemapPaths(xml) {
  if (!xml.includes('<urlset')) throw new Error('Expected a sitemap urlset')
  const paths = new Set([...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((match) => new URL(match[1].trim().replaceAll('&amp;', '&')).pathname))
  if (!paths.size) throw new Error('Sitemap has no URLs')
  return paths
}
export function assertPreservesRoutes(liveXml, builtXml) {
  const live = sitemapPaths(liveXml), built = sitemapPaths(builtXml)
  const missing = [...live].filter((path) => !built.has(path))
  if (missing.length) throw new Error(`Release would remove ${missing.length} published routes: ${missing.join(', ')}`)
  return { liveRoutes: live.size, builtRoutes: built.size, missing: [] }
}
export async function readPublic(url, fetcher = fetch) {
  const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { 'Cache-Control': 'no-cache' } })
  if (!response.ok) throw new Error(`Read-only verification failed: ${url} HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}
// Cloudflare Web Analytics may append its known beacon to otherwise static HTML.
// Do not strip arbitrary scripts, attributes or article text to manufacture a pass.
export function normalizeEdgeHtml(html) {
  return html
    .replace(/<!--\s*Cloudflare Web Analytics\s*-->/g, '')
    .replace(/<script\b(?=[^>]*\bsrc=["']https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js(?:\/[^"']*)?["'])(?=[^>]*\bdata-cf-beacon=)[^>]*>\s*<\/script>/g, '')
    .replace(/\s+(<\/body>)/g, '$1')
}
export async function preflight(root, base, fetcher = fetch) {
  const live = await readPublic(`${base}/sitemap.xml?release-check=${Date.now()}`, fetcher)
  return assertPreservesRoutes(live.toString(), readFileSync(join(root, 'out/sitemap.xml'), 'utf8'))
}
export function articleFiles(root, files, articlePath) {
  validateArticlePath(articlePath)
  const htmlFile = `${articlePath.slice(1)}index.html`
  if (!files[htmlFile]) throw new Error('Selected article is absent from the validated export (possibly a draft)')
  const html = readFileSync(join(root, 'out', htmlFile), 'utf8')
  const paths = new Set([articlePath, `${articlePath}index.md`])
  const base = 'https://benebsworth.com'
  // Check the article plus a bounded set of its own images/OG image.
  for (const match of html.matchAll(/(?:src|content)="([^"]+)"/g)) {
    const url = new URL(match[1].replaceAll('&amp;', '&'), base)
    if (url.origin === new URL(base).origin && url.pathname.startsWith(articlePath) && /\.(?:png|webp|jpe?g|svg|avif)$/.test(url.pathname)) paths.add(url.pathname)
    if (paths.size >= 10) break
  }
  for (const path of paths) {
    const file = path === articlePath ? htmlFile : path.slice(1)
    if (!files[file]) throw new Error(`Referenced article asset absent from export: ${path}`)
  }
  return { htmlFile, paths: [...paths] }
}
export async function verifyLive(root, base, commit, articlePath, fetcher = fetch) {
  const { info, files } = verifyArtifact(root, commit)
  const { htmlFile, paths } = articleFiles(root, files, articlePath)
  const liveInfo = JSON.parse((await readPublic(`${base}/build-info.json?release-check=${Date.now()}`, fetcher)).toString())
  if (liveInfo.commit !== info.commit || liveInfo.artifactSha256 !== info.artifactSha256) throw new Error('Live build receipt differs from the validated export')
  for (const path of paths) {
    const file = path === articlePath ? htmlFile : path.slice(1)
    const data = await readPublic(`${base}${path}?release-check=${Date.now()}`, fetcher)
    const matches = file.endsWith('.html')
      ? normalizeEdgeHtml(data.toString()) === normalizeEdgeHtml(readFileSync(join(root, 'out', file), 'utf8'))
      : sha256(data) === files[file]
    if (!matches) throw new Error(`Live bytes differ from validated export: ${path}`)
  }
  return { commit, artifactSha256: info.artifactSha256, checked: [...paths] }
}

async function main() {
  const [command, expected, articlePath] = process.argv.slice(2), root = process.cwd()
  const base = 'https://benebsworth.com'
  let result
  if (command === 'assert-clean') { assertCommit(root, expected); result = { commit: expected, clean: true } }
  else if (command === 'assert-analytics') { assertAnalytics(root, process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID); result = { analytics: 'present' } }
  else if (command === 'stamp') result = stamp(root, expected)
  else if (command === 'verify-artifact') { result = verifyArtifact(root, expected).info }
  else if (command === 'check-article') { result = articleFiles(root, verifyArtifact(root, expected).files, articlePath) }
  else if (command === 'preflight') result = await preflight(root, base)
  else if (command === 'verify-live') result = await verifyLive(root, base, expected, articlePath)
  else throw new Error('Usage: site-release.mjs assert-clean|stamp|verify-artifact <sha> | preflight | verify-live <sha> /blog/<slug>/')
  process.stdout.write(JSON.stringify(result, null, 2) + '\n')
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { process.stderr.write(error.message + '\n'); process.exitCode = 1 })
}
