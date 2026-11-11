import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { checkBlogAssets, collectAssetReferences, isPublished, resolveBlogAsset, sanitizeDraftExport } from './check-blog-assets.mjs'

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-assets-'))
  const trackedFiles = new Set()
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const write = (file, content = 'image bytes', tracked = true) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    fs.writeFileSync(path.join(root, file), content)
    if (tracked) trackedFiles.add(file)
  }
  const post = (slug = 'example', flags = '', body = '', extra = '') => write(`content/blog/${slug}/index.mdx`,
    `---\ntitle: Example\ndate: "2026-10-24T00:00:00.000Z"\n${flags}${extra}---\n${body}\n`)
  const asset = (name = 'example/hero.webp') => {
    write(`content/blog/${name}`)
    write(`public/blog/${name}`)
  }
  const check = () => checkBlogAssets({ root, trackedFiles })
  return { root, trackedFiles, write, post, asset, check }
}

test('publish flags agree with lib/content.ts defaults and explicit draft gates', () => {
  assert.equal(isPublished({}), true)
  assert.equal(isPublished({ release: true, draft: false }), true)
  assert.equal(isPublished({ release: false }), false)
  assert.equal(isPublished({ draft: true }), false)
  assert.equal(isPublished({ release: false, draft: false }), false)
})

test('published Markdown, reference images, JSX literal expressions and file links validate', (t) => {
  const f = fixture(t)
  f.post('example', '', [
    '![hero](./hero.webp "Title")',
    '![reference][detail]',
    '[detail]: ./nested/detail.png',
    '<Figure src={"/blog/example/nested/detail.png"} />',
    '<img srcSet="/blog/example/hero.webp 1x, /blog/example/nested/detail.png 2x" />',
    '[download](./notes.pdf)',
    '[another article](/blog/other/)',
    '![remote](https://example.invalid/picture.png)',
    '```mdx\n![example only](./does-not-exist.png)\n```',
  ].join('\n\n'), 'heroImage: /blog/example/hero.webp\n')
  for (const name of ['example/hero.webp', 'example/nested/detail.png', 'example/notes.pdf']) f.asset(name)
  const result = f.check()
  assert.deepEqual(result.errors, [])
  assert.equal(result.checkedAssets.length, 3)
  assert.equal(result.posts[0].published, true)
})

test('supports the actual legacy Markdown basename rewrite, without weakening JSX paths', () => {
  assert.equal(resolveBlogAsset('/minikube.png', 'install-minikube', 'markdown-image'), 'blog/install-minikube/minikube.png')
  assert.equal(resolveBlogAsset('./nested/a.png', 'example', 'markdown-image'), 'blog/example/a.png')
  assert.equal(resolveBlogAsset('/blog/example/nested/a.png', 'example'), 'blog/example/nested/a.png')
  assert.throws(() => resolveBlogAsset('/topics/technology.png', 'example', 'hero'), /local hero image/)
})

test('relative heroes cannot pass while cards and OG resolve a different path', (t) => {
  const f = fixture(t)
  f.post('example', '', '', 'heroImage: hero.webp\n')
  f.asset()
  assert.equal(f.check().errors[0].code, 'asset-url')
})

test('reports missing mirrors, untracked assets and byte mismatches independently', (t) => {
  const f = fixture(t)
  f.post('example', '', '![one](./one.png)\n\n![two](./two.png)\n\n![three](./three.png)')
  f.write('public/blog/example/one.png')
  f.asset('example/two.png')
  f.trackedFiles.delete('public/blog/example/two.png')
  f.asset('example/three.png')
  f.write('public/blog/example/three.png', 'different bytes')
  const codes = f.check().errors.map((error) => error.code)
  assert.deepEqual(codes.sort(), ['asset-mismatch', 'asset-missing', 'asset-untracked'])
})

test('requires actual YAML booleans, title and a valid date', (t) => {
  const f = fixture(t)
  f.write('content/blog/example/index.mdx', '---\nrelease: "false"\ndraft: "true"\ndate: invalid\n---\nText')
  assert.deepEqual(f.check().errors.map((error) => error.code).sort(), ['date', 'flag-type', 'flag-type', 'title'])
})

test('valid drafts still require mirrored assets but have no public Markdown sibling', (t) => {
  const f = fixture(t)
  f.post('example', 'draft: true\nrelease: false\n', '![hero](hero.webp)')
  f.asset()
  assert.deepEqual(f.check().errors, [])
  assert.equal(f.check().posts[0].published, false)
  f.write('public/blog/example/index.md', 'private draft text')
  assert.equal(f.check().errors[0].code, 'draft-markdown')
})

test('rejects traversal, encoded traversal, malformed URLs and source symlinks', (t) => {
  for (const url of ['/blog/example/../secret.png', './%2e%2e/secret.png', '/blog/example/%252e%252e/secret.png', '/blog/example/a\\b.png', '/blog/example/%', 'javascript:alert(1)']) {
    assert.throws(() => resolveBlogAsset(url, 'example'))
  }
  const f = fixture(t)
  f.post('example', '', '![hero](hero.webp)')
  f.asset()
  fs.unlinkSync(path.join(f.root, 'content/blog/example/hero.webp'))
  fs.symlinkSync(path.join(f.root, 'public/blog/example/hero.webp'), path.join(f.root, 'content/blog/example/hero.webp'))
  assert.equal(f.check().errors[0].code, 'asset-path')
})

test('dynamic JSX asset URLs fail closed instead of silently escaping validation', () => {
  const result = collectAssetReferences('<Figure src={assetPath} />')
  assert.match(result.errors[0], /cannot statically check Figure.src/)
})

test('published posts cannot depend on assets removed with a draft', (t) => {
  const f = fixture(t)
  f.post('example', '', '<Figure src="/blog/private-note/hero.webp" />')
  f.post('private-note', 'release: false\n')
  f.asset('private-note/hero.webp')
  assert.deepEqual(f.check().errors.map((error) => error.code), ['draft-dependency'])
})

test('Git tracking is read from the index when no test override is supplied', (t) => {
  const f = fixture(t)
  f.post('example', '', '', 'heroImage: /blog/example/hero.webp\n')
  f.asset()
  execFileSync('git', ['init', '--quiet'], { cwd: f.root })
  execFileSync('git', ['add', '--', 'content'], { cwd: f.root })
  const result = checkBlogAssets({ root: f.root })
  assert.deepEqual(result.errors.map((error) => error.code), ['asset-untracked'])
  assert.match(result.errors[0].message, /public\/blog\/example\/hero.webp/)
})

test('--base only warns on unchanged legacy content mirrors and gates changed posts', (t) => {
  const f = fixture(t)
  f.post('example', '', '', 'heroImage: /blog/example/hero.webp\n')
  f.write('public/blog/example/hero.webp')
  execFileSync('git', ['init', '--quiet'], { cwd: f.root })
  execFileSync('git', ['add', '--', '.'], { cwd: f.root })
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Legacy baseline'], { cwd: f.root })
  const old = checkBlogAssets({ root: f.root, base: 'HEAD' })
  assert.deepEqual(old.errors, [])
  assert.deepEqual(old.warnings.map((warning) => warning.code), ['legacy-mirror'])
  assert.equal(checkBlogAssets({ root: f.root }).errors[0].code, 'asset-missing')
  f.post('example', '', 'New article text', 'heroImage: /blog/example/hero.webp\n')
  const changedPost = checkBlogAssets({ root: f.root, base: 'HEAD' })
  assert.deepEqual(changedPost.errors.map((error) => error.code), ['asset-missing'])
  assert.deepEqual(changedPost.warnings, [])
})

test('--base does not exempt modified assets, mismatches or missing public files', (t) => {
  const f = fixture(t)
  f.post('example', '', '', 'heroImage: /blog/example/hero.webp\n')
  f.write('public/blog/example/hero.webp')
  const options = { root: f.root, trackedFiles: f.trackedFiles, base: 'baseline', changedFiles: ['public/blog/example/hero.webp'] }
  assert.equal(checkBlogAssets(options).errors[0].code, 'asset-missing')
  f.write('content/blog/example/hero.webp', 'different')
  options.changedFiles = []
  assert.equal(checkBlogAssets(options).errors[0].code, 'asset-mismatch')
  fs.unlinkSync(path.join(f.root, 'public/blog/example/hero.webp'))
  assert.equal(checkBlogAssets(options).errors[0].code, 'asset-missing')
  assert.deepEqual(checkBlogAssets(options).warnings, [])
})

test('sanitisation removes only draft export assets and stale export Markdown', (t) => {
  const f = fixture(t)
  f.post('private-note', 'release: false\n')
  f.post('published')
  f.write('out/blog/private-note/hero.webp')
  f.write('out/blog/private-note/index.md', 'stale export text')
  f.write('out/blog/published/index.html', 'published page')
  f.write('public/blog/private-note/hero.webp')
  f.write('out/keep.txt', 'keep')
  const result = sanitizeDraftExport(f.check())
  assert.deepEqual(result, { removed: ['out/blog/private-note'], errors: [] })
  assert.equal(fs.existsSync(path.join(f.root, 'out/blog/private-note')), false)
  for (const file of ['content/blog/private-note/index.mdx', 'public/blog/private-note/hero.webp', 'out/blog/published/index.html', 'out/keep.txt']) assert.equal(fs.existsSync(path.join(f.root, file)), true)
})

test('unexpected draft HTML prevents all deletion, including other draft exports', (t) => {
  const f = fixture(t)
  f.post('first-draft', 'draft: true\n')
  f.post('second-draft', 'release: false\n')
  f.write('out/blog/first-draft/hero.webp')
  f.write('out/blog/second-draft/index.html', 'routing regression')
  const result = sanitizeDraftExport(f.check())
  assert.equal(result.errors.length, 1)
  assert.deepEqual(result.removed, [])
  assert.equal(fs.existsSync(path.join(f.root, 'out/blog/first-draft/hero.webp')), true)
})

test('sanitisation refuses symlinked out, draft directories and nested assets', (t) => {
  for (const shape of ['out', 'draft', 'nested']) {
    const f = fixture(t)
    f.post('private-note', 'draft: true\n')
    f.write('public/blog/private-note/secret.txt', 'must survive')
    if (shape === 'out') fs.symlinkSync(path.join(f.root, 'public'), path.join(f.root, 'out'))
    else {
      fs.mkdirSync(path.join(f.root, 'out/blog'), { recursive: true })
      if (shape === 'draft') fs.symlinkSync(path.join(f.root, 'public/blog/private-note'), path.join(f.root, 'out/blog/private-note'))
      else {
        fs.mkdirSync(path.join(f.root, 'out/blog/private-note'))
        fs.symlinkSync(path.join(f.root, 'public/blog/private-note'), path.join(f.root, 'out/blog/private-note/nested'))
      }
    }
    if (shape === 'out') assert.throws(() => sanitizeDraftExport(f.check()), /symlink/)
    else assert.equal(sanitizeDraftExport(f.check()).errors.length, 1)
    assert.equal(fs.readFileSync(path.join(f.root, 'public/blog/private-note/secret.txt'), 'utf8'), 'must survive')
  }
})

test('sanitisation rejects invalid metadata and missing build output', (t) => {
  const f = fixture(t)
  f.post('private-note', 'draft: "true"\n')
  assert.equal(sanitizeDraftExport(f.check()).errors[0].code, 'export-directory')
  f.write('out/blog/private-note/hero.webp')
  assert.equal(sanitizeDraftExport(f.check()).errors[0].code, 'draft-state')
  assert.equal(fs.existsSync(path.join(f.root, 'out/blog/private-note/hero.webp')), true)
})
