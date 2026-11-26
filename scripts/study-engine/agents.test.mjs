import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { createDispatcher, invokeCodex } from './agents.mjs';

const request = { role: 'writer', model: 'test-model', effort: 'medium', prompt: 'Write an object.' };
const usage = { input: 10, cachedInput: 2, output: 4 };
const zeroUsage = { input: 0, cachedInput: 0, output: 0 };

async function tempDir(t) {
  const dir = await mkdtemp(join(tmpdir(), 'study-agents-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('caches validated replies and charges simultaneous requests once', async (t) => {
  const cacheDir = await tempDir(t);
  let calls = 0;
  const invoke = async () => {
    calls += 1;
    return { text: '\x60\x60\x60json\n{"ok":true}\n\x60\x60\x60', usage };
  };
  const dispatch = createDispatcher({ cacheDir, invoke });
  const [fresh, concurrent] = await Promise.all([dispatch(request), dispatch(request)]);
  const persisted = await createDispatcher({ cacheDir, invoke })(request);
  assert.equal(calls, 1);
  assert.deepEqual(fresh, {
    text: '{"ok":true}', role: request.role, model: request.model,
    usage, cached: false, key: fresh.key,
  });
  assert.match(fresh.key, /^[0-9a-f]{64}$/);
  assert.deepEqual(concurrent, { ...fresh, cached: true, usage: zeroUsage, originalUsage: usage });
  assert.deepEqual(persisted, concurrent);
  assert.deepEqual(await readdir(cacheDir), [fresh.key + '.json']);
});

test('keys independently on every dispatch input', async (t) => {
  const cacheDir = await tempDir(t);
  const dispatch = createDispatcher({ cacheDir, invoke: async () => ({ text: '{}', usage }) });
  const outcomes = await Promise.all([
    dispatch(request),
    dispatch({ ...request, role: 'reviewer' }),
    dispatch({ ...request, model: 'another-model' }),
    dispatch({ ...request, effort: 'low' }),
    dispatch({ ...request, prompt: 'Different prompt.' }),
  ]);
  assert.equal(new Set(outcomes.map(({ key }) => key)).size, outcomes.length);
});

test('invalid replies and unknown usage leave the cache empty and can be retried', async (t) => {
  const cacheDir = await tempDir(t);
  const replies = [
    { text: '[]', usage },
    { text: '{}', usage: { input: 10, output: 4 } },
    { text: '{}', usage },
  ];
  const dispatch = createDispatcher({ cacheDir, invoke: async () => replies.shift() });
  await assert.rejects(dispatch(request), { message: /JSON object/, code: 'INVALID_AGENT_REPLY', usage });
  await assert.rejects(dispatch(request), /usage/);
  assert.deepEqual(await readdir(cacheDir), []);
  assert.equal((await dispatch(request)).cached, false);
});

test('beforeInvoke gates only uncached provider calls', async (t) => {
  const cacheDir = await tempDir(t);
  let admitted = 0;
  let calls = 0;
  const invoke = async () => {
    calls += 1;
    return { text: '{}', usage };
  };
  const dispatch = createDispatcher({
    cacheDir, invoke,
    beforeInvoke: async (input) => {
      assert.deepEqual(input, request);
      admitted += 1;
    },
  });
  await Promise.all([dispatch(request), dispatch(request)]);
  const dispatchWithZeroBudget = createDispatcher({
    cacheDir, invoke,
    beforeInvoke: () => { throw new Error('Budget exhausted'); },
  });
  assert.equal((await dispatchWithZeroBudget(request)).cached, true);
  await assert.rejects(dispatchWithZeroBudget({ ...request, prompt: 'New prompt.' }), /Budget exhausted/);
  assert.equal(admitted, 1);
  assert.equal(calls, 1);
});

test('runs the Codex CLI in an empty temporary directory and reads JSON events', async (t) => {
  const fixture = await tempDir(t);
  const bin = join(fixture, 'bin');
  const receipt = join(fixture, 'receipt.json');
  await mkdir(bin);
  await writeFile(join(bin, 'codex'), [
    '#!' + process.execPath,
    "const fs = require('node:fs');",
    'const args = process.argv.slice(2);',
    "const cwd = args[args.indexOf('--cd') + 1];",
    "const prompt = fs.readFileSync(0, 'utf8');",
    'fs.writeFileSync(process.env.STUDY_TEST_RECEIPT, JSON.stringify({ args, cwd, prompt, files: fs.readdirSync(cwd) }));',
    "if (prompt === 'fail') process.exit(7);",
    'const emit = (event) => console.log(JSON.stringify(event));',
    "emit({ type: 'item.completed', item: { type: 'agent_message', text: '{}' } });",
    "emit({ type: 'item.completed', item: { type: 'agent_message', text: '{\"last\":true}' } });",
    "if (prompt !== 'missing') emit({ type: 'turn.completed', usage: { input_tokens: 10, cached_input_tokens: 2, output_tokens: 4 } });",
  ].join('\n'), { mode: 0o755 });
  const originalPath = process.env.PATH;
  const originalReceipt = process.env.STUDY_TEST_RECEIPT;
  process.env.PATH = bin + ':' + originalPath;
  process.env.STUDY_TEST_RECEIPT = receipt;
  t.after(() => {
    process.env.PATH = originalPath;
    if (originalReceipt === undefined) delete process.env.STUDY_TEST_RECEIPT;
    else process.env.STUDY_TEST_RECEIPT = originalReceipt;
  });

  assert.deepEqual(await invokeCodex(request), { text: '{"last":true}', usage });
  const run = JSON.parse(await readFile(receipt, 'utf8'));
  for (const arg of ['exec', '--json', '--ephemeral', '--skip-git-repo-check', '--ignore-user-config', '--strict-config', 'read-only', request.model, 'model_reasoning_effort="medium"']) {
    assert.ok(run.args.includes(arg), arg);
  }
  for (const feature of ['shell_tool', 'apps', 'plugins', 'hooks', 'skill_search', 'multi_agent', 'goals', 'view_image', 'image_generation', 'browser_use', 'computer_use', 'sleep_tool']) {
    assert.ok(run.args.some((arg, i) => arg === '--disable' && run.args[i + 1] === feature), feature);
  }
  assert.ok(run.args.some((arg, i) => arg === '--enable' && run.args[i + 1] === 'omit_skill_descriptions'));
  assert.equal(run.prompt, request.prompt);
  assert.deepEqual(run.files, []);
  await assert.rejects(readdir(run.cwd), { code: 'ENOENT' });
  await assert.rejects(invokeCodex({ ...request, prompt: 'fail' }), /7/);
  await assert.rejects(invokeCodex({ ...request, prompt: 'missing' }), /usage/);
});

test('separate processes share one cold call and recover a dead claimant', async (t) => {
  const dir = await tempDir(t);
  const worker = join(dir, 'worker.mjs');
  const counter = join(dir, 'calls');
  const marker = join(dir, 'started');
  await writeFile(worker, `
import { appendFile, writeFile } from 'node:fs/promises';
import { createDispatcher } from ${JSON.stringify(pathToFileURL(join(process.cwd(), 'scripts/study-engine/agents.mjs')).href)};
const [cacheDir, counter, marker, mode] = process.argv.slice(2);
const dispatch = createDispatcher({ cacheDir, claimTimeoutMs: 4000,
  beforeInvoke: async () => appendFile(counter, 'gate\\n'),
  invoke: async () => {
    await writeFile(marker, 'started');
    if (mode === 'crash') process.exit(42);
    await new Promise(r => setTimeout(r, 250));
    return { text: '{"ok":true}', usage: { input: 10, cachedInput: 2, output: 4 } };
  },
});
console.log(JSON.stringify(await dispatch(${JSON.stringify(request)})));
`);
  const run = (cacheDir, mode = 'normal') => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [worker, cacheDir, counter, marker, mode], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
  const raceDir = join(dir, 'race');
  const pair = await Promise.all([run(raceDir), run(raceDir)]);
  for (const child of pair) assert.equal(child.code, 0, child.stderr);
  const replies = pair.map(({ stdout }) => JSON.parse(stdout));
  assert.deepEqual(replies.map((reply) => reply.cached).sort(), [false, true]);
  assert.equal(replies[0].text, replies[1].text);
  assert.deepEqual(replies.find((reply) => reply.cached).usage, zeroUsage);
  assert.equal((await readFile(counter, 'utf8')).trim().split('\n').length, 1);
  const crashDir = join(dir, 'crash');
  assert.equal((await run(crashDir, 'crash')).code, 42);
  const recovered = await run(crashDir);
  assert.equal(recovered.code, 0, recovered.stderr);
  assert.equal(JSON.parse(recovered.stdout).cached, false);
});
