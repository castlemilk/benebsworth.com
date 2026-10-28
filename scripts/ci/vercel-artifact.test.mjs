import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildEnvironment, inventory, runArtifactBuild, verifyArtifactRequest, PROJECT, CLI_VERSION } from './vercel-artifact.mjs';

function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-test-'));
  try { return fn(root); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}
const sha = 'a'.repeat(40);
function mock(root, calls, fail = false) {
  return (cmd, args, options) => {
    calls.push({ cmd, args, options });
    if (cmd === 'git') return { status: 0, stdout: sha };
    if (args[0] === '--version') return { status: 0, stdout: CLI_VERSION };
    if (fail) return { status: 1 };
    const out = path.join(root, '.vercel/output');
    fs.mkdirSync(path.join(out, 'static'), { recursive: true });
    fs.writeFileSync(path.join(out, 'config.json'), JSON.stringify({ version: 3 }));
    fs.writeFileSync(path.join(out, 'builds.json'), JSON.stringify({ target: 'preview' }));
    for (const file of ['index.html', 'blog/index.html', 'sitemap.xml', 'robots.txt', 'opengraph-image.png', 'pagefind/pagefind.js']) {
      fs.mkdirSync(path.dirname(path.join(out, 'static', file)), { recursive: true });
      fs.writeFileSync(path.join(out, 'static', file), 'fixture');
    }
    return { status: 0 };
  };
}
test('build environment excludes inherited secrets and auth homes', () => {
  const env = buildEnvironment({ PATH: '/bin', DATABASE_URL: 'secret', GH_TOKEN: 'secret', HOME: '/unsafe' }, '/clean');
  assert.equal(env.HOME, '/clean'); assert.equal(env.GH_TOKEN, undefined); assert.equal(env.DATABASE_URL, undefined);
});
test('explicit public settings preserve known identity/root and locked install contract', () => {
  assert.equal(PROJECT.settings.rootDirectory, null); assert.equal(PROJECT.settings.installCommand, '');
  assert.equal(PROJECT.settings.framework, 'nextjs'); assert.equal(PROJECT.settings.nodeVersion, '24.x');
});
test('credential-free build packages only standalone output and provenance', () => fixture(root => {
  const calls = []; const result = runArtifactBuild(root, { inherited: { GITHUB_SHA: sha, PATH: '/bin' }, spawn: mock(root, calls) });
  const build = calls.find(c => c.args[0] === 'build');
  assert.deepEqual(build.args, ['build', '--target=preview', '--standalone', '--non-interactive']);
  assert.equal(build.options.env.VERCEL_TOKEN, undefined);
  assert.equal(fs.existsSync(path.join(root, '.vercel')), false);
  assert.equal(fs.existsSync(build.options.env.HOME), false);
  const manifest = JSON.parse(fs.readFileSync(path.join(result.artifact, 'manifest.json')));
  assert.equal(manifest.sha, sha); assert.equal(manifest.releaseApproved, false);
  assert.equal(manifest.files.length, 8); assert.ok(manifest.files.every(f => /^[a-f0-9]{64}$/.test(f.sha256)));
  assert.ok(calls.every(c => !c.args.includes('pull') && !c.args.includes('deploy')));
}));
test('tokens and checkout dotenv/project caches fail closed', () => fixture(root => {
  assert.throws(() => runArtifactBuild(root, { inherited: { VERCEL_TOKEN: 'x' } }), /token/);
  fs.writeFileSync(path.join(root, '.env.local'), 'A=1');
  assert.throws(() => runArtifactBuild(root, { inherited: { GITHUB_SHA: sha } }), /clean checkout/);
}));
test('failed build removes temporary config without artifact', () => fixture(root => {
  assert.throws(() => runArtifactBuild(root, { inherited: { GITHUB_SHA: sha }, spawn: mock(root, [], true) }), /compilation failed/);
  assert.equal(fs.existsSync(path.join(root, '.vercel')), false);
  assert.equal(fs.existsSync(path.join(root, 'vercel-artifact')), false);
}));
test('inventory rejects escaping symlinks and dotenv files', () => fixture(root => {
  fs.symlinkSync('/etc/hosts', path.join(root, 'bad'));
  assert.throws(() => inventory(root), /symlinks/); fs.unlinkSync(path.join(root, 'bad'));
  fs.writeFileSync(path.join(root, '.env'), 'A=1'); assert.throws(() => inventory(root), /Forbidden/);
}));
test('inventory preserves portable contained function aliases', () => fixture(root => {
  fs.writeFileSync(path.join(root, 'actual'), 'content');
  fs.symlinkSync('actual', path.join(root, 'alias'));
  const entry = inventory(root).find(item => item.path === 'alias');
  assert.equal(entry.symlink, 'actual'); assert.match(entry.sha256, /^[a-f0-9]{64}$/);
}));
test('wrong checkout SHA fails before compiling or preparing config', () => fixture(root => {
  const calls = [];
  assert.throws(() => runArtifactBuild(root, { inherited: { GITHUB_SHA: 'b'.repeat(40) }, spawn: mock(root, calls) }), /SHA mismatch/);
  assert.equal(calls.length, 1); assert.equal(fs.existsSync(path.join(root, '.vercel')), false);
}));
test('wrong CLI version fails closed including near-match versions', () => fixture(root => {
  const base = mock(root, []);
  assert.throws(() => runArtifactBuild(root, {
    inherited: { GITHUB_SHA: sha },
    spawn: (cmd, args, opts) => args[0] === '--version' ? { status: 0, stdout: '59.13.10' } : base(cmd, args, opts),
  }), /Pinned CLI version/);
  assert.equal(fs.existsSync(path.join(root, '.vercel')), false);
}));
test('broken, cyclic and ancestor directory symlinks fail closed', () => fixture(root => {
  fs.symlinkSync('missing', path.join(root, 'link'));
  assert.throws(() => inventory(root), /ENOENT/); fs.unlinkSync(path.join(root, 'link'));
  fs.symlinkSync('link', path.join(root, 'link'));
  assert.throws(() => inventory(root), /ELOOP/); fs.unlinkSync(path.join(root, 'link'));
  fs.mkdirSync(path.join(root, 'nested')); fs.symlinkSync('..', path.join(root, 'nested/parent'));
  assert.throws(() => inventory(root), /symlinks/);
}));

const repo = 'castlemilk/benebsworth.com';
const prEvent = () => ({ action: 'labeled', pull_request: {
  head: { sha, repo: { full_name: repo } }, base: { repo: { full_name: repo } },
  labels: [{ name: 'ci:vercel-artifact' }],
} });
const prEnv = { GITHUB_REPOSITORY: repo, GITHUB_EVENT_NAME: 'pull_request', ARTIFACT_SOURCE_SHA: sha, GITHUB_SHA: 'b'.repeat(40) };
test('PR opt-in validates exact head not synthetic merge SHA across permitted events', () => {
  for (const action of ['labeled', 'synchronize', 'reopened']) {
    const event = prEvent(); event.action = action;
    assert.equal(verifyArtifactRequest(event, prEnv), sha);
  }
});
test('PR guard rejects missing label, fork, wrong base repository, SHA and unsupported event', () => {
  const mutations = [
    e => { e.pull_request.labels = []; },
    e => { e.pull_request.head.repo.full_name = 'outsider/tradeview'; },
    e => { e.pull_request.base.repo.full_name = 'outsider/tradeview'; },
    e => { e.pull_request.head.sha = 'b'.repeat(40); },
    e => { e.action = 'opened'; },
  ];
  for (const mutate of mutations) { const event = prEvent(); mutate(event); assert.throws(() => verifyArtifactRequest(event, prEnv)); }
  assert.throws(() => verifyArtifactRequest(prEvent(), { ...prEnv, GITHUB_REPOSITORY: 'outsider/tradeview' }));
  assert.throws(() => verifyArtifactRequest(prEvent(), { ...prEnv, GITHUB_EVENT_NAME: 'pull_request_target' }));
});
test('dispatch requires full SHA to match both selection and explicit confirmation', () => {
  const env = { GITHUB_REPOSITORY: repo, GITHUB_EVENT_NAME: 'workflow_dispatch', ARTIFACT_SOURCE_SHA: sha, GITHUB_SHA: sha };
  assert.equal(verifyArtifactRequest({ inputs: { confirm_sha: sha } }, env), sha);
  assert.throws(() => verifyArtifactRequest({ inputs: { confirm_sha: 'b'.repeat(40) } }, env));
  assert.throws(() => verifyArtifactRequest({ inputs: { confirm_sha: sha } }, { ...env, GITHUB_SHA: 'b'.repeat(40) }));
  assert.throws(() => verifyArtifactRequest({ inputs: { confirm_sha: 'aaaaaaa' } }, { ...env, ARTIFACT_SOURCE_SHA: 'aaaaaaa' }));
});
test('artifact manifest binds explicit PR head rather than merge SHA', () => fixture(root => {
  const result = runArtifactBuild(root, { inherited: prEnv, spawn: mock(root, []) });
  assert.equal(JSON.parse(fs.readFileSync(path.join(result.artifact, 'manifest.json'))).sha, sha);
}));
test('workflow contract is opt-in, exact-head, read-only and credential-free', () => {
  const workflow = fs.readFileSync(new URL('../../.github/workflows/vercel-artifact.yml', import.meta.url), 'utf8');
  assert.match(workflow, /types: \[labeled, synchronize, reopened\]/);
  assert.match(workflow, /github\.repository == 'castlemilk\/benebsworth\.com'/);
  assert.match(workflow, /github\.event\.pull_request\.head\.repo\.full_name == 'castlemilk\/benebsworth\.com'/);
  assert.match(workflow, /contains\(github\.event\.pull_request\.labels\.\*\.name, 'ci:vercel-artifact'\)/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(workflow, /ARTIFACT_SOURCE_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /permissions:\n {2}contents: read/);
  assert.match(workflow, /vercel-artifact\.mjs verify-request/);
  assert.match(workflow, /test "\$ARTIFACT_SOURCE_SHA" = "\$\(git rev-parse HEAD\)"/);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\.|\benvironment:|\bwrite\b|\bvercel (?:pull|deploy|promote)\b/);
  for (const match of workflow.matchAll(/uses: ([^\s]+)/g)) assert.match(match[1], /@[a-f0-9]{40}$/);
});

test('profile keeps blog identity explicit and distinguishes local settings from live parity', () => {
  assert.equal(PROJECT.projectId, 'prj_sxj2GQBYr1GDrSADoiKBve3nAlmO');
  assert.equal(PROJECT.orgId, 'team_xE5DMN3hIo8aPqyHNkBybg8r');
  assert.equal(PROJECT.settings.buildCommand, 'npm run build');
  const profile = JSON.parse(fs.readFileSync(new URL('./vercel-artifact-profile.json', import.meta.url)));
  assert.deepEqual(profile.publicEnvironment, {});
  assert.equal(profile.releaseApproved, false);
  assert.match(profile.evidence.rootDirectory, /not exposed/);
  assert.match(profile.evidence.otherSettings, /not a live settings snapshot/);
});

test('production metadata and missing postbuild assets cannot produce an artifact', () => {
  for (const failure of ['production', 'missing-pagefind']) fixture(root => {
    const base = mock(root, []);
    const spawn = (cmd, args, options) => {
      const result = base(cmd, args, options);
      if (args[0] === 'build') {
        if (failure === 'production') fs.writeFileSync(path.join(root, '.vercel/output/builds.json'), '{"target":"production"}');
        else fs.unlinkSync(path.join(root, '.vercel/output/static/pagefind/pagefind.js'));
      }
      return result;
    };
    assert.throws(() => runArtifactBuild(root, { inherited: { GITHUB_SHA: sha }, spawn }));
    assert.equal(fs.existsSync(path.join(root, 'vercel-artifact')), false);
    assert.equal(fs.existsSync(path.join(root, '.vercel')), false);
  });
});


test('ongoing push build accepts only exact live editorial revision', () => {
  const env = { GITHUB_REPOSITORY: 'castlemilk/benebsworth.com', GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/codex/gamma-blog-editorial-20261027', GITHUB_SHA: sha, ARTIFACT_SOURCE_SHA: sha };
  assert.equal(verifyArtifactRequest({ after: sha, deleted: false }, env), sha);
  assert.throws(() => verifyArtifactRequest({ after: sha }, { ...env, GITHUB_REF: 'refs/heads/other' }), /editorial/);
  assert.throws(() => verifyArtifactRequest({ after: 'b'.repeat(40) }, env), /editorial/);
  assert.throws(() => verifyArtifactRequest({ after: sha, deleted: true }, env), /editorial/);
});
