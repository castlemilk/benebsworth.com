import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, chmod, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, delimiter } from 'node:path'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { readManifestSnapshot, writeManifest } from './src/manifest.mjs'
import { saveProposal, loadProposal } from './src/proposal-cache.mjs'

async function fakeStorage(t, generation) {
  const dir = await mkdtemp(join(tmpdir(), 'hike-mcp-test-'))
  const state = join(dir, 'state.json')
  const oldPath = process.env.PATH
  const oldState = process.env.HIKE_TEST_STATE
  t.after(async () => {
    process.env.PATH = oldPath
    if (oldState === undefined) delete process.env.HIKE_TEST_STATE
    else process.env.HIKE_TEST_STATE = oldState
    await rm(dir, { recursive: true, force: true })
  })
  const program = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync(process.env.HIKE_TEST_STATE, 'utf8'));
const isGcloud = process.argv[1].endsWith('/gcloud');
const flag = args.find((arg) => arg.startsWith('--if-generation-match='));
if (isGcloud && (!flag || flag.slice('--if-generation-match='.length) !== state.generation)) process.exit(1);
const file = isGcloud ? args[2] : args[args.length - 2];
state.manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
state.argument = flag || null;
fs.writeFileSync(process.env.HIKE_TEST_STATE, JSON.stringify(state));
`
  for (const name of ['gcloud', 'gsutil']) {
    const target = join(dir, name)
    await writeFile(target, program)
    await chmod(target, 0o700)
  }
  await writeFile(state, JSON.stringify({ generation, manifest: { gallery: ['original'] } }))
  process.env.PATH = dir + delimiter + oldPath
  process.env.HIKE_TEST_STATE = state
  return { dir, read: async () => JSON.parse(await readFile(state, 'utf8')) }
}

test('a stale proposal cannot overwrite a newer manifest', async (t) => {
  const store = await fakeStorage(t, '18')
  await assert.rejects(writeManifest('test-hike', { gallery: ['stale'] }, store.dir, '17'))
  assert.deepEqual((await store.read()).manifest, { gallery: ['original'] })
})

test('a proposal without its original generation cannot write', async (t) => {
  const store = await fakeStorage(t, '18')
  await assert.rejects(writeManifest('test-hike', { gallery: ['stale'] }, store.dir))
  assert.deepEqual((await store.read()).manifest, { gallery: ['original'] })
})

test('generation remains exact even beyond JavaScript integer precision', async (t) => {
  const store = await fakeStorage(t, '9007199254740993')
  await writeManifest('test-hike', { gallery: ['new'] }, store.dir, '9007199254740993')
  const state = await store.read()
  assert.deepEqual(state.manifest, { gallery: ['new'] })
  assert.equal(state.argument, '--if-generation-match=9007199254740993')
})

test('new manifests require that the object still does not exist', async (t) => {
  const store = await fakeStorage(t, '0')
  await writeManifest('test-hike', { gallery: ['new'] }, store.dir, '0')
  assert.equal((await store.read()).argument, '--if-generation-match=0')
})

test('manifest reads retain the exact object generation and fail closed without it', async (t) => {
  const originalFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = originalFetch })
  globalThis.fetch = async () => new Response(JSON.stringify({ gallery: ['photo'] }), {
    status: 200, headers: { 'x-goog-generation': '9007199254740993' },
  })
  assert.deepEqual(await readManifestSnapshot('test-hike'), {
    manifest: { hero: undefined, og: undefined, gallery: ['photo'] }, generation: '9007199254740993',
  })
  globalThis.fetch = async () => new Response(JSON.stringify({ gallery: [] }), { status: 200 })
  assert.equal((await readManifestSnapshot('test-hike')).generation, null)
  globalThis.fetch = async () => new Response(null, { status: 404 })
  assert.equal((await readManifestSnapshot('test-hike')).generation, '0')
  globalThis.fetch = async () => new Response(null, { status: 503 })
  await assert.rejects(readManifestSnapshot('test-hike'), /HTTP 503/)
})

test('overlapping proposal saves keep the manifest, proposal and generation together', async (t) => {
  const slug = `test-${randomUUID()}`
  const run = (value) => ({ manifest: { gallery: [value] }, proposal: { gallery: [value] },
    generation: value, metas: [], partial: false })
  const first = await saveProposal(slug, run('1'), '', 'first')
  t.after(async () => { await rm(first.dir, { recursive: true, force: true }) })
  const writes = Array.from({ length: 12 }, (_, i) => saveProposal(slug, run(String(i + 2)), '', String(i)))
  const reads = Array.from({ length: 25 }, () => loadProposal(slug))
  const snapshots = await Promise.all(reads)
  await Promise.all(writes)
  snapshots.push(await loadProposal(slug))
  for (const snapshot of snapshots) {
    assert.equal(snapshot.manifest.gallery[0], snapshot.generation)
    assert.equal(snapshot.proposal.gallery[0], snapshot.generation)
  }
})

test('a later proposal does not replace an earlier review report', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'hike-review-test-'))
  const slug = `test-${randomUUID()}`
  t.after(async () => { await rm(dir, { recursive: true, force: true }) })
  const report1 = join(dir, 'first.html')
  const report2 = join(dir, 'second.html')
  await writeFile(report1, 'first proposal')
  await writeFile(report2, 'second proposal')
  const run = (generation) => ({ manifest: {}, proposal: { gallery: [] }, generation, metas: [], partial: false })
  const first = await saveProposal(slug, run('1'), report1, 'first')
  t.after(async () => { await rm(first.dir, { recursive: true, force: true }) })
  const second = await saveProposal(slug, run('2'), report2, 'second')
  assert.notEqual(first.reportPath, second.reportPath)
  assert.equal(await readFile(first.reportPath, 'utf8'), 'first proposal')
  assert.equal(await readFile(second.reportPath, 'utf8'), 'second proposal')
  assert.equal((await loadProposal(slug)).reportPath, second.reportPath)
})

test('invalid slugs cannot escape the proposal directory', async (t) => {
  const store = await fakeStorage(t, '0')
  await assert.rejects(writeManifest('../outside', { gallery: [] }, store.dir, '0'), /Invalid hike slug/)
  await assert.rejects(loadProposal('../outside'), /Invalid hike slug/)
  await assert.rejects(saveProposal('../outside', {}, '', ''), /Invalid hike slug/)
})

test('legacy cached proposals without an atomic record cannot be written', async (t) => {
  const store = await fakeStorage(t, '18')
  const slug = `test-${randomUUID()}`
  const saved = await saveProposal(slug, { manifest: {}, proposal: { gallery: [] }, generation: '18', metas: [] }, '', '')
  t.after(async () => { await rm(saved.dir, { recursive: true, force: true }) })
  await rm(join(saved.dir, 'proposal-record.json'))
  const legacy = await loadProposal(slug)
  assert.equal(legacy.generation, undefined)
  await assert.rejects(writeManifest(slug, legacy.proposal, saved.dir, legacy.generation))
  assert.deepEqual((await store.read()).manifest, { gallery: ['original'] })
})

test('the real MCP write tool rejects stale proposals and accepts a matching version', async (t) => {
  const store = await fakeStorage(t, '18')
  const slug = `test-${randomUUID()}`
  const run = (generation) => ({ manifest: { gallery: ['original'] }, proposal: { gallery: ['new'] },
    generation, metas: [], partial: false })
  const saved = await saveProposal(slug, run('17'), '', 'first')
  t.after(async () => { await rm(saved.dir, { recursive: true, force: true }) })
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('./mcp/server.mjs', import.meta.url))],
    env: process.env,
    stderr: 'pipe',
  })
  try {
    await client.connect(transport)
    const missingId = await client.callTool({ name: 'write_manifest', arguments: { slug, confirm: true } })
    assert.equal(missingId.isError, true)
    const rejected = await client.callTool({ name: 'write_manifest', arguments: { slug, proposalId: saved.proposalId, confirm: true } })
    assert.equal(rejected.isError, true)
    assert.deepEqual((await store.read()).manifest, { gallery: ['original'] })
    const newer = await saveProposal(slug, run('18'), '', 'second')
    const oldReview = await client.callTool({ name: 'write_manifest', arguments: { slug, proposalId: saved.proposalId, confirm: true } })
    assert.equal(oldReview.isError, true)
    const accepted = await client.callTool({ name: 'write_manifest', arguments: { slug, proposalId: newer.proposalId, confirm: true } })
    assert.notEqual(accepted.isError, true)
    assert.deepEqual((await store.read()).manifest, { gallery: ['new'] })
  } finally {
    await client.close()
  }
})
