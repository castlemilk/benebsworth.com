import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CHROMIUM_LAUNCH_ARGS,
  classifyEnforcement,
  createBackend,
  readSandboxPolicy,
  resetSandboxRuntime,
  resolveSandboxPolicy,
  SANDBOX_BACKEND_NAMES,
} from './sandbox-backend'

const HERE = dirname(fileURLToPath(import.meta.url))

afterEach(() => {
  resetSandboxRuntime()
})

describe('sandbox backend selection', () => {
  it('defaults to local chromium with the prelude parity flag off', () => {
    // The whole point of the default: an existing sweep scores exactly as it
    // did before the seam existed — raw artifact, local browser.
    const policy = readSandboxPolicy({})
    expect(policy.backend).toBe('chromium')
    expect(policy.preludeParity).toBe(false)
  })

  it('selects the structural backend from BENCH_SANDBOX', () => {
    expect(readSandboxPolicy({ BENCH_SANDBOX: 'structural' }).backend).toBe('structural')
  })

  it('selects the remote backend when an endpoint is configured', () => {
    const policy = readSandboxPolicy({
      BENCH_SANDBOX: 'remote',
      PLAYWRIGHT_WS_ENDPOINT: 'ws://browser:3000/',
    })
    expect(policy.backend).toBe('remote')
    // Remote policy is set on the far side and is not observable from here.
    expect(policy.enforcement).toBe('partial')
  })

  it('rejects an unknown BENCH_SANDBOX value, naming the vocabulary', () => {
    // A typo'd backend must not silently fall back to Chromium — that is how a
    // CI job "runs the fallback" and quietly scores with a browser instead.
    expect(() => readSandboxPolicy({ BENCH_SANDBOX: 'jsdom' })).toThrow(/jsdom/)
    for (const name of SANDBOX_BACKEND_NAMES) {
      expect(() => readSandboxPolicy({ BENCH_SANDBOX: 'jsdom' })).toThrow(new RegExp(name))
    }
  })

  it('rejects the remote backend with no endpoint, naming the variable', () => {
    expect(() => readSandboxPolicy({ BENCH_SANDBOX: 'remote' })).toThrow(/PLAYWRIGHT_WS_ENDPOINT/)
  })

  it('reads the prelude parity flag, default off', () => {
    expect(readSandboxPolicy({ BENCH_PRELUDE_PARITY: '1' }).preludeParity).toBe(true)
    expect(readSandboxPolicy({ BENCH_PRELUDE_PARITY: 'true' }).preludeParity).toBe(true)
    expect(readSandboxPolicy({ BENCH_PRELUDE_PARITY: '0' }).preludeParity).toBe(false)
    expect(readSandboxPolicy({ BENCH_PRELUDE_PARITY: '' }).preludeParity).toBe(false)
  })

  it('resolves the process policy exactly once', () => {
    const first = resolveSandboxPolicy()
    const second = resolveSandboxPolicy()
    // Identity, not equality: every consumer must see the SAME resolved policy,
    // so the one logged into the run log is the one that scored the record.
    expect(second).toBe(first)
  })
})

describe('chromium enforcement honesty', () => {
  it('reports partial when a sandbox-disabling flag is present', () => {
    expect(classifyEnforcement(['--no-sandbox'])).toBe('partial')
    expect(classifyEnforcement(['--disable-gpu', '--disable-setuid-sandbox'])).toBe('partial')
    expect(classifyEnforcement(['--disable-web-security'])).toBe('partial')
  })

  it('reports full only when no flag weakens the sandbox', () => {
    expect(classifyEnforcement([])).toBe('full')
    expect(classifyEnforcement(['--disable-gpu', '--disable-dev-shm-usage'])).toBe('full')
  })

  it('classifies the args this harness actually launches with as partial', () => {
    // Not a hypothetical: the shipped args include --no-sandbox so the browser
    // works in containers. The log must say so rather than claim `full`.
    expect(CHROMIUM_LAUNCH_ARGS).toContain('--no-sandbox')
    expect(classifyEnforcement(CHROMIUM_LAUNCH_ARGS)).toBe('partial')
    expect(readSandboxPolicy({}).enforcement).toBe('partial')
  })
})

describe('structural backend', () => {
  it('refuses to launch, with a reason naming the backend and the env var', async () => {
    const backend = createBackend(readSandboxPolicy({ BENCH_SANDBOX: 'structural' }))
    expect(backend.name).toBe('structural')
    expect(backend.enforcement).toBe('partial')
    await expect(backend.launch()).rejects.toThrow(/structural/)
    await expect(backend.launch()).rejects.toThrow(/BENCH_SANDBOX/)
    // close() on a backend that never launched is a no-op, not a crash.
    await expect(backend.close()).resolves.toBeUndefined()
  })

  it('never pulls Playwright in at module load', () => {
    // The structural backend exists for machines with no browser deps, so an
    // eager `import { chromium } from 'playwright'` anywhere on the sandbox
    // module path would defeat it before selection is even read. Playwright may
    // only be reached through `await import` (or an erased `import type`).
    for (const file of ['sandbox-backend.ts', 'sandbox.ts']) {
      const source = readFileSync(join(HERE, file), 'utf8')
      const eager = source
        .split('\n')
        .filter((line) => /from\s+['"]playwright['"]/.test(line))
        .filter((line) => !/^\s*import\s+type\b/.test(line))
      expect(eager, `${file} must not import playwright eagerly:\n  ${eager.join('\n  ')}`).toEqual(
        []
      )
    }
  })
})
