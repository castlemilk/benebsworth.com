import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { articleFiles, assertAnalytics, assertCommit, assertForward, assessDrift, readLiveCommit, assertPreservesRoutes, normalizeEdgeHtml, readPublic, stamp, validateArticlePath, validateSha, verifyArtifact, verifyLive } from './site-release.mjs'

const xml = (...paths) => `<urlset>${paths.map((p) => `<url><loc>https://benebsworth.com${p}</loc></url>`).join('')}</urlset>`
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'site-release-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const write = (path, value) => { mkdirSync(join(root, path, '..'), { recursive: true }); writeFileSync(join(root, path), value) }
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  git('init'); write('.gitignore', 'out/\n.next/\n'); git('add', '.gitignore')
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'fixture')
  const commit = git('rev-parse', 'HEAD')
  for (const name of ['index.html', 'blog/index.html', 'pagefind/pagefind.js']) write(`out/${name}`, name)
  write('out/sitemap.xml', xml('/', '/blog/post/'))
  write('out/blog/post/index.html', '<html><img src="/blog/post/hero.webp"></html>')
  write('out/blog/post/index.md', 'Article text')
  write('out/blog/post/hero.webp', 'fixture-image')
  return { root, commit, write, git }
}
test('only explicit complete SHA and article path are accepted', () => {
  for (const value of ['', 'master', 'abc', 'A'.repeat(40), ';id']) assert.throws(() => validateSha(value))
  assert.equal(validateSha('a'.repeat(40)), 'a'.repeat(40))
  for (const value of ['/', '/blog/../', '/blog/post/?x=1', 'https://other.test/blog/post/']) assert.throws(() => validateArticlePath(value))
})
test('missing production routes and malformed/empty sitemaps fail closed', () => {
  assert.throws(() => assertPreservesRoutes(xml('/', '/blog/published/'), xml('/')), /would remove/)
  assert.deepEqual(assertPreservesRoutes(xml('/'), xml('/', '/blog/new/')).missing, [])
  assert.throws(() => assertPreservesRoutes('<html>blocked</html>', xml('/')))
  assert.throws(() => assertPreservesRoutes('<urlset/>', xml('/')))
})
test('stamp binds a clean source commit to the entire export', (t) => {
  const f = fixture(t); stamp(f.root, f.commit)
  assert.equal(verifyArtifact(f.root, f.commit).info.commit, f.commit)
  f.write('out/blog/post/hero.webp', 'changed'); assert.throws(() => verifyArtifact(f.root, f.commit), /changed after validation/)
})
test('dirty source and wrong commit cannot be released', (t) => {
  const f = fixture(t)
  assert.throws(() => assertCommit(f.root, 'b'.repeat(40)), /selected commit/)
  f.write('new-draft.mdx', 'uncommitted'); assert.throws(() => stamp(f.root, f.commit), /fully committed/)
})
test('missing required build phases cannot be stamped', (t) => {
  const f = fixture(t); rmSync(join(f.root, 'out/pagefind/pagefind.js'))
  assert.throws(() => stamp(f.root, f.commit), /Incomplete export/)
})
test('ignored local environment files cannot silently affect a release', (t) => {
  const f = fixture(t)
  execFileSync('git', ['config', 'core.excludesFile', '/dev/null'], { cwd: f.root })
  f.write('.git/info/exclude', '.env.local\n')
  f.write('.env.local', 'EXAMPLE=fixture')
  assert.throws(() => stamp(f.root, f.commit), /not local .env files/)
})
test('403 is a verification failure and is not retried', async () => {
  let calls = 0
  await assert.rejects(readPublic('https://example.invalid', async () => { calls++; return new Response('Forbidden', { status: 403 }) }), /HTTP 403/)
  assert.equal(calls, 1)
})
test('existing production analytics configuration remains required', (t) => {
  const f = fixture(t)
  assert.throws(() => assertAnalytics(f.root, ''), /requires NEXT_PUBLIC_GA/)
  assert.throws(() => assertAnalytics(f.root, 'G-EXAMPLE'), /missing the configured/)
  f.write('out/index.html', 'https://www.googletagmanager.com/gtag/js?id=G-EXAMPLE')
  assertAnalytics(f.root, 'G-EXAMPLE')
})
test('selected draft, missing article and missing Markdown fail before upload', (t) => {
  const f = fixture(t); stamp(f.root, f.commit)
  const { files } = verifyArtifact(f.root, f.commit)
  assert.throws(() => articleFiles(f.root, files, '/blog/draft/'), /possibly a draft/)
  assert.equal(articleFiles(f.root, files, '/blog/post/').paths.length, 3)
  delete files['blog/post/index.md']
  assert.throws(() => articleFiles(f.root, files, '/blog/post/'), /asset absent/)
})
test('upload entry point refuses unconfirmed, push and non-master requests before tooling runs', () => {
  const env = { PATH: process.env.PATH, EXPECTED_SHA: 'a'.repeat(40), ARTICLE_PATH: '/blog/post/', CLOUDFLARE_API_TOKEN: 'fixture', CLOUDFLARE_ACCOUNT_ID: 'fixture' }
  for (const extra of [
    { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/master' },
    { GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/master', PUBLISH_CONFIRMATION: 'publish-benebsworth.com' },
    { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/draft', PUBLISH_CONFIRMATION: 'publish-benebsworth.com' },
  ]) {
    const result = spawnSync('bash', ['scripts/publish-checked-site.sh'], { env: { ...env, ...extra }, encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /confirmation is required|manual release workflow on master/)
    assert.equal(result.stdout, '')
  }
})
test('live receipt, article, Markdown and image must match the validated bytes', async (t) => {
  const { readFileSync } = await import('node:fs')
  const f = fixture(t); stamp(f.root, f.commit)
  const fetcher = async (url) => {
    const path = new URL(url).pathname
    return new Response(readFileSync(join(f.root, 'out', path === '/blog/post/' ? 'blog/post/index.html' : path)))
  }
  const receipt = await verifyLive(f.root, 'https://example.invalid', f.commit, '/blog/post/', fetcher)
  assert.equal(receipt.checked.length, 3)
  await assert.rejects(verifyLive(f.root, 'https://example.invalid', f.commit, '/blog/draft/', fetcher), /possibly a draft/)
  await assert.rejects(verifyLive(f.root, 'https://example.invalid', f.commit, '/blog/post/', async () => new Response(JSON.stringify({ commit: 'b'.repeat(40) }))), /Live build receipt/)
})
test('only the known Cloudflare analytics injection is ignored in HTML comparison', () => {
  const original = '<body>Article</body>'
  const beacon = '<script defer src="https://static.cloudflareinsights.com/beacon.min.js/v123" data-cf-beacon=\'{}\'></script>'
  assert.equal(normalizeEdgeHtml(`<body>Article<!-- Cloudflare Web Analytics -->${beacon}\n</body>`), original)
  assert.notEqual(normalizeEdgeHtml('<body>Changed article</body>'), original)
  assert.notEqual(normalizeEdgeHtml('<body>Article<script src="https://other.test/beacon.min.js"></script></body>'), original)
})

// docs/postmortem/0010: production only moves forward along master.
function history(t) {
  const f = fixture(t)
  const commit = (message, branch) => {
    if (branch) f.git('checkout', '-q', '-B', branch)
    f.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-q', '--allow-empty', '-m', message)
    return f.git('rev-parse', 'HEAD')
  }
  const live = commit('uplift released')
  const next = commit('later master work')
  f.git('checkout', '-q', f.commit)
  const stale = commit('stale branch without the uplift', 'stale')
  return { ...f, live, next, stale }
}
test('a release must contain the commit production serves', (t) => {
  const h = history(t)
  assert.equal(assertForward(h.root, h.live, h.next).forward, true)
  assert.equal(assertForward(h.root, h.live, h.live).forward, true)
  assert.throws(() => assertForward(h.root, h.live, h.stale), /roll production back or sideways/)
  assert.throws(() => assertForward(h.root, h.next, h.live), /roll production back or sideways/)
})
test('only a typed rollback naming the live commit bypasses the forward check', (t) => {
  const h = history(t)
  assert.throws(() => assertForward(h.root, h.next, h.live, 'yes'), /ALLOW_PROD_ROLLBACK=/)
  assert.equal(assertForward(h.root, h.next, h.live, h.next).override, 'ALLOW_PROD_ROLLBACK')
})
test('a live commit missing from local history fails instead of passing', (t) => {
  const h = history(t)
  assert.throws(() => assertForward(h.root, 'c'.repeat(40), h.next), /not in this checkout/)
})
test('an unreadable or malformed live receipt refuses to publish blind', async () => {
  await assert.rejects(readLiveCommit('https://example.invalid', async () => new Response('missing', { status: 404 })), /refusing to publish blind/)
  await assert.rejects(readLiveCommit('https://example.invalid', async () => new Response('{"commit":"abc"}')), /40-character/)
  assert.equal(await readLiveCommit('https://example.invalid', async () => new Response(JSON.stringify({ commit: 'a'.repeat(40) }))), 'a'.repeat(40))
})
test('drift flags production off master and long-unreleased master work', () => {
  const live = 'a'.repeat(40), master = 'b'.repeat(40)
  assert.equal(assessDrift({ live, master, liveOnMaster: false, unreleased: 0, oldestUnreleasedHours: 0 }).ok, false)
  assert.equal(assessDrift({ live: master, master, liveOnMaster: true, unreleased: 0, oldestUnreleasedHours: 0 }).ok, true)
  assert.equal(assessDrift({ live, master, liveOnMaster: true, unreleased: 3, oldestUnreleasedHours: 5 }).ok, true)
  assert.match(assessDrift({ live, master, liveOnMaster: true, unreleased: 3, oldestUnreleasedHours: 80 }).reason, /Publish checked site/)
})
