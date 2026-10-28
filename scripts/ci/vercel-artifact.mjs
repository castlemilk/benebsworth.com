import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { validateOutput } from './vercel-preview.mjs';

export const CLI_VERSION = '59.13.1';
export const ARTIFACT_LABEL = 'ci:vercel-artifact';
export function verifyArtifactRequest(event, env) {
  if (env.GITHUB_REPOSITORY !== 'castlemilk/benebsworth.com') throw new Error('Unexpected repository');
  const source = env.ARTIFACT_SOURCE_SHA;
  if (!/^[a-f0-9]{40}$/.test(source || '')) throw new Error('Exact artifact source SHA required');
  if (env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
    if (source !== env.GITHUB_SHA || event.inputs?.confirm_sha !== source) throw new Error('Manual SHA confirmation mismatch');
  } else if (env.GITHUB_EVENT_NAME === 'pull_request') {
    if (!['labeled', 'synchronize', 'reopened'].includes(event.action) ||
        event.pull_request?.head?.repo?.full_name !== 'castlemilk/benebsworth.com' ||
        event.pull_request?.base?.repo?.full_name !== 'castlemilk/benebsworth.com' ||
        event.pull_request?.head?.sha !== source ||
        !event.pull_request?.labels?.some(label => label.name === ARTIFACT_LABEL)) {
      throw new Error('PR artifact requires same-repository exact head and explicit opt-in label');
    }
  } else throw new Error('Unsupported artifact event');
  return source;
}
export const PROFILE = JSON.parse(fs.readFileSync(new URL('./vercel-artifact-profile.json', import.meta.url), 'utf8'));
export const PROJECT = PROFILE.project;

// An intentional public-only validation profile, NOT a snapshot of live settings.
// Runtime credentials remain on the hosting platform; none enter this process.
export function buildEnvironment(inherited, home) {
  return {
    PATH: inherited.PATH, HOME: home, CI: '1',
    VERCEL_TELEMETRY_DISABLED: '1', NEXT_TELEMETRY_DISABLED: '1',
  };
}

function checkCheckout(root) {
  for (const dir of [root]) {
    for (const name of fs.readdirSync(dir)) {
      if (name === '.vercel' || (name !== '.env.example' && (name === '.env' || name.startsWith('.env.')))) {
        throw new Error('Artifact build requires a clean checkout without local configuration');
      }
    }
  }
}

export function inventory(directory) {
  const files = [];
  const root = fs.realpathSync(directory);
  function walk(rel = '') {
    const filename = path.join(directory, rel);
    const st = fs.lstatSync(filename);
    if (st.isSymbolicLink()) {
      const target = fs.readlinkSync(filename);
      const resolved = fs.realpathSync(filename);
      const parent = path.dirname(filename);
      if (path.isAbsolute(target) || !resolved.startsWith(root + path.sep) ||
          resolved === parent || parent.startsWith(resolved + path.sep)) {
        throw new Error('Artifact symlinks must stay inside standalone output');
      }
      files.push({ path: rel.split(path.sep).join('/'), symlink: target,
        sha256: crypto.createHash('sha256').update(target).digest('hex') });
    } else if (st.isDirectory()) {
      for (const name of fs.readdirSync(filename).sort()) {
        if (name === '.git' || name === '.env' || name.startsWith('.env.')) throw new Error('Forbidden artifact file');
        walk(path.join(rel, name));
      }
    } else if (st.isFile()) {
      files.push({ path: rel.split(path.sep).join('/'), size: st.size,
        sha256: crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex') });
    } else throw new Error('Artifact contains a special file');
  }
  walk();
  return files;
}

export function runArtifactBuild(root, { inherited = process.env, spawn = spawnSync } = {}) {
  if (inherited.VERCEL_TOKEN) throw new Error('Artifact job must never receive a deployment token');
  const sourceSha = inherited.ARTIFACT_SOURCE_SHA || inherited.GITHUB_SHA;
  if (!/^[a-f0-9]{40}$/.test(sourceSha || '')) throw new Error('An exact source SHA is required');
  checkCheckout(root);
  const sha = spawn('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  if (sha.status !== 0 || sha.stdout.trim() !== sourceSha) throw new Error('Checkout SHA mismatch');
  const cache = path.join(root, '.vercel');
  const artifact = path.join(root, 'vercel-artifact');
  const output = path.join(cache, 'output');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-artifact-home-'));
  try {
    fs.rmSync(artifact, { recursive: true, force: true });
    fs.mkdirSync(cache);
    fs.writeFileSync(path.join(cache, 'project.json'), JSON.stringify(PROJECT));
    // No pull, no remote link resolution, and no deployment command.
    const env = buildEnvironment(inherited, home);
    const version = spawn('vercel', ['--version'], { cwd: root, env, encoding: 'utf8' });
    const versionLines = `${version.stdout || ''}\n${version.stderr || ''}`.split(/\r?\n/).map(line => line.trim());
    if (version.status !== 0 || !versionLines.some(line => line === CLI_VERSION || line === `Vercel CLI ${CLI_VERSION}`)) {
      throw new Error('Pinned CLI version required');
    }
    const build = spawn('vercel', ['build', '--target=preview', '--standalone', '--non-interactive'], { cwd: root, env, stdio: 'inherit' });
    if (build.error || build.status !== 0) throw new Error('Credential-free Build Output compilation failed');
    const buildMetadata = JSON.parse(fs.readFileSync(path.join(output, 'builds.json'), 'utf8'));
    if (buildMetadata.target !== 'preview' || buildMetadata.error || buildMetadata.builds?.some(item => item.error)) {
      throw new Error('Expected successful preview-target output');
    }
    // Establish containment before the existing validator follows any link.
    const files = inventory(output);
    validateOutput(root);
    const validation = { buildOutputVersion: 3, target: 'preview', requiredStaticAssets: 6, files: files.length };
    fs.mkdirSync(path.join(artifact, '.vercel'), { recursive: true });
    fs.cpSync(output, path.join(artifact, '.vercel/output'), { recursive: true, dereference: false, verbatimSymlinks: true });
    fs.writeFileSync(path.join(artifact, '.vercel/project.json'), JSON.stringify({ projectId: PROJECT.projectId, orgId: PROJECT.orgId }));
    fs.writeFileSync(path.join(artifact, 'manifest.json'), JSON.stringify({
      schemaVersion: 1, repository: 'castlemilk/benebsworth.com', sha: sourceSha,
      runId: inherited.GITHUB_RUN_ID || null, runAttempt: inherited.GITHUB_RUN_ATTEMPT || null,
      target: 'preview', cliVersion: CLI_VERSION, nodeVersion: process.version,
      project: PROJECT, configurationProfile: 'credential-free-validation',
      releaseApproved: false, publicEnvironment: PROFILE.publicEnvironment, settingsEvidence: PROFILE.evidence, validation, files,
    }, null, 2) + '\n');
    return { artifact, files: files.length };
  } finally {
    fs.rmSync(cache, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv[2] === 'verify-request') {
      verifyArtifactRequest(JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')), process.env);
    } else console.log(JSON.stringify(runArtifactBuild(process.cwd())));
  }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
