import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, mkdtemp, readFile, readlink, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ADAPTER_REVISION = 2;
const ZERO_USAGE = { input: 0, cachedInput: 0, output: 0 };

function validatedReply(reply) {
  const { input, cachedInput, output } = reply?.usage ?? {};
  if (![input, cachedInput, output].every((value) => Number.isSafeInteger(value) && value >= 0) || cachedInput > input) {
    throw new Error('Codex reply is missing valid token usage');
  }
  const usage = { input, cachedInput, output };

  const trimmed = typeof reply.text === 'string' ? reply.text.trim() : '';
  const text = (trimmed.match(/^\x60{3}(?:json)?\s*\n([\s\S]*?)\n\s*\x60{3}$/i)?.[1] ?? trimmed).trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return { text, usage };
  } catch {
    // Use the same diagnostic for syntactically invalid JSON and unsupported top-level values.
  }
  throw Object.assign(new Error('Codex reply must be a JSON object'), { code: 'INVALID_AGENT_REPLY', usage });
}

export async function invokeCodex({ model, effort, prompt }) {
  const cwd = await mkdtemp(join(tmpdir(), 'study-codex-'));
  try {
    const args = [
      'exec', '--json', '--ephemeral', '--skip-git-repo-check', '--ignore-user-config', '--strict-config',
      '-s', 'read-only', '--cd', cwd, '--model', model,
      '-c', 'model_reasoning_effort=' + JSON.stringify(effort),
      '-c', 'approval_policy="never"', '-c', 'web_search="disabled"',
      '--disable', 'shell_tool', '--disable', 'apps', '--disable', 'plugins', '--disable', 'hooks',
      '--enable', 'omit_skill_descriptions', '--disable', 'skill_search',
      '--disable', 'multi_agent', '--disable', 'goals', '--disable', 'view_image',
      '--disable', 'image_generation', '--disable', 'browser_use', '--disable', 'computer_use',
      '--disable', 'sleep_tool',
      '-',
    ];
    const stdout = await new Promise((resolve, reject) => {
      const child = execFile('codex', args, {
        cwd, timeout: 5 * 60_000, killSignal: 'SIGKILL', maxBuffer: 16 * 1024 * 1024,
      }, (error, stdout, stderr) => {
        if (error) {
          const details = stderr.trim().slice(-1200);
          reject(new Error('Codex CLI failed (' + (error.code ?? error.signal ?? 'unknown') + ')' + (details ? '\n' + details : '')));
        } else {
          resolve(stdout);
        }
      });
      child.stdin.on('error', (error) => {
        if (error.code !== 'EPIPE') reject(error);
      });
      child.stdin.end(prompt);
    });

    let text;
    let usage;
    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
        text = event.item.text;
      }
      if (event.type === 'turn.completed') {
        usage = {
          input: event.usage?.input_tokens,
          cachedInput: event.usage?.cached_input_tokens,
          output: event.usage?.output_tokens,
        };
      }
    }
    return validatedReply({ text, usage });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

async function readCached(path) {
  try {
    return validatedReply(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if (error.code && !['ENOENT', 'INVALID_AGENT_REPLY'].includes(error.code)) throw error;
    return null;
  }
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function target(path) {
  try { return await readlink(path); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
function ownerIsDead(value) {
  const match = /^(\d+):[0-9a-f-]+$/.exec(value ?? '');
  if (!match) return false;
  try { process.kill(Number(match[1]), 0); return false; } catch (error) { return error.code === 'ESRCH'; }
}
async function release(path, owner) {
  if (await target(path) === owner) await unlink(path).catch((error) => { if (error.code !== 'ENOENT') throw error; });
}
async function claim(path, timeoutMs) {
  const owner = `${process.pid}:${randomUUID()}`;
  // Local filesystem and local PIDs only. A crash inside recovery can strand
  // the gate: timeout reports its path; inspect its symlink PID and remove it
  // manually only after confirming that process is gone.
  const gate = path + '.recovery';
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await target(gate))) {
      try {
        await symlink(owner, path);
        if (!(await target(gate))) return owner;
        await release(path, owner);
      } catch (error) { if (error.code !== 'EEXIST') throw error; }
      if (ownerIsDead(await target(path))) {
        try {
          await symlink(owner, gate);
          try {
            if (ownerIsDead(await target(path))) await unlink(path).catch((error) => { if (error.code !== 'ENOENT') throw error; });
          } finally { await release(gate, owner); }
        } catch (error) { if (error.code !== 'EEXIST') throw error; }
      }
    }
    await pause(50);
  }
  throw new Error('Timed out waiting for cache claim: ' + path + ' (inspect ' + gate + ' if present)');
}

export function createDispatcher({ cacheDir, invoke = invokeCodex, beforeInvoke, claimTimeoutMs = 360_000 }) {
  if (!Number.isSafeInteger(claimTimeoutMs) || claimTimeoutMs < 1) throw new TypeError('claimTimeoutMs must be a positive integer');
  const inFlight = new Map();
  return async ({ role, model, effort, prompt }) => {
    const request = { role, model, effort, prompt };
    if (!Object.values(request).every((value) => typeof value === 'string' && value.trim())) {
      throw new TypeError('Dispatch requires nonempty role, model, effort and prompt strings');
    }
    const key = createHash('sha256').update(JSON.stringify([ADAPTER_REVISION, role, model, effort, prompt])).digest('hex');
    const path = join(cacheDir, key + '.json');
    const result = (reply, cached) => ({
      text: reply.text, model, role, usage: cached ? { ...ZERO_USAGE } : { ...reply.usage }, cached, key,
      ...(cached ? { originalUsage: { ...reply.usage } } : {}),
    });

    if (inFlight.has(key)) return result((await inFlight.get(key)).reply, true);
    const pending = (async () => {
      const cached = await readCached(path);
      if (cached) return { reply: cached, cached: true };
      await mkdir(cacheDir, { recursive: true });
      const claimPath = path + '.claim';
      const owner = await claim(claimPath, claimTimeoutMs);
      try {
        const cachedAfterClaim = await readCached(path);
        if (cachedAfterClaim) return { reply: cachedAfterClaim, cached: true };
        // Discard a corrupt cache entry only while holding the exclusive claim.
        await rm(path, { force: true });
        await beforeInvoke?.(request);
        const reply = validatedReply(await invoke(request));
        const temporary = path + '.' + randomUUID() + '.tmp';
        try {
          await writeFile(temporary, JSON.stringify(reply), { mode: 0o600, flag: 'wx' });
          await link(temporary, path);
        } finally { await rm(temporary, { force: true }); }
        return { reply, cached: false };
      } finally {
        await release(claimPath, owner);
      }
    })();
    inFlight.set(key, pending);
    try {
      const { reply, cached } = await pending;
      return result(reply, cached);
    } finally {
      inFlight.delete(key);
    }
  };
}
