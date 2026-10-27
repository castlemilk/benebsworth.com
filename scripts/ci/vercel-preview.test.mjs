import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { ORG_ID, PROJECT_ID, validateOutput, validateProject, validateUrl } from './vercel-preview.mjs'

test('preparation source-build guard affects only the new migration branch', () => {
  const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))
  assert.deepEqual(config.git.deploymentEnabled, {
    'codex/github-actions-vercel-previews-20261027': false,
  })
  assert.deepEqual(Object.keys(config).sort(), ['$schema', 'git'])
  assert.deepEqual(Object.keys(config.git), ['deploymentEnabled'])
})

test('only the existing blog project and team are accepted', () => {
  assert.doesNotThrow(() => validateProject({ projectId: PROJECT_ID, orgId: ORG_ID }))
  assert.throws(() => validateProject({ projectId: 'another-project', orgId: ORG_ID }))
  assert.throws(() => validateProject({ projectId: PROJECT_ID, orgId: 'another-team' }))
  assert.throws(() => validateProject({}))
})

test('only a single safe deployment origin can reach GitHub output/summary', () => {
  assert.equal(validateUrl('https://benebsworth-example.vercel.app'), 'https://benebsworth-example.vercel.app')
  for (const value of [undefined, '', 'http://example.vercel.app', 'https://vercel.app',
    'https://example.vercel.app.attacker.test', 'https://example.com',
    'https://user:pass@example.vercel.app', 'https://example.vercel.app:8443',
    'https://example.vercel.app/', 'https://example.vercel.app?query',
    'https://example.vercel.app\nurl=poison', 'https://example.vercel.app#fragment']) {
    assert.throws(() => validateUrl(value), String(value))
  }
})

test('upload requires the full version-3 static payload including postbuild search', () => {
  const root = mkdtempSync(join(tmpdir(), 'blog-prebuilt-'))
  const write = (file, value) => {
    const path = join(root, '.vercel/output', file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, value)
  }
  try {
    assert.throws(() => validateOutput(root))
    write('config.json', '{"version":2}')
    assert.throws(() => validateOutput(root), /version 3/)
    write('config.json', '{"version":3}')
    write('builds.json', '{"target":"production"}')
    assert.throws(() => validateOutput(root), /preview build/)
    write('builds.json', '{"target":"preview","error":{}}')
    assert.throws(() => validateOutput(root), /preview build/)
    write('builds.json', '{"target":"preview","builds":[{"error":{}}]}')
    assert.throws(() => validateOutput(root), /preview build/)
    write('builds.json', '{"target":"preview"}')
    for (const file of ['index.html', 'blog/index.html', 'sitemap.xml', 'robots.txt', 'opengraph-image.png']) write(`static/${file}`, 'fixture')
    assert.throws(() => validateOutput(root), /pagefind/)
    write('static/pagefind/pagefind.js', '')
    assert.throws(() => validateOutput(root), /empty/)
    write('static/pagefind/pagefind.js', 'fixture')
    assert.doesNotThrow(() => validateOutput(root))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('workflow preserves exact-SHA, preview-only, prebuilt-only, opt-in security contract', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/vercel-preview.yml', import.meta.url), 'utf8')
  assert.match(workflow, /branches-ignore: \[master\]/)
  assert.match(workflow, /github\.ref_name != 'master'/)
  assert.match(workflow, /vars\.VERCEL_PREVIEW_CI_ENABLED == 'true'/)
  assert.match(workflow, /name: preview-deploy/)
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/)
  assert.match(workflow, /persist-credentials: false/)
  assert.match(workflow, /vercel pull --yes --environment=preview --git-branch=/)
  assert.match(workflow, /vercel build --target=preview/)
  assert.match(workflow, /vercel deploy --prebuilt --target=preview/)
  assert.match(workflow, /--meta githubDeployment=1/)
  assert.match(workflow, /--meta githubCommitRef=/)
  assert.match(workflow, /branch_sha.*gh api/)
  assert.match(workflow, /encodeURIComponent\(process.env.PREVIEW_BRANCH\)/)
  assert.match(workflow, /"\$branch_sha" != "\$PREVIEW_SHA"/)
  assert.doesNotMatch(workflow, /pull_request_target:|--prod\b|vercel promote|vercel alias|upload-artifact|--token/)
  assert.equal((workflow.match(/vercel deploy /g) ?? []).length, 1, 'no source-upload fallback')
  assert.equal((workflow.match(/secrets\.VERCEL_TOKEN/g) ?? []).length, 2, 'token only on pull and upload')
  assert.doesNotMatch(workflow.split('- name: Build on')[1].split('- name: Upload only')[0], /VERCEL_TOKEN|secrets\./)
  for (const match of workflow.matchAll(/uses: ([^\s]+)/g)) assert.match(match[1], /@[0-9a-f]{40}$/)
})
