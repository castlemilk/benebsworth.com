import type { Browser, BrowserContext, BrowserContextOptions } from 'playwright'

import type { SandboxBackendName, SandboxEnforcement } from '../types'

/**
 * The sandbox seam: ONE interface, swappable backends (#12).
 *
 * Behavioural scoring used to be welded to a local Playwright Chromium with
 * hardcoded launch args — so a container without browser deps could not score
 * at all without a code edit, a remote browser was unreachable, and the policy
 * a run actually applied was never recorded anywhere.
 *
 * Three rules, borrowed from dsh's `ctx.sandbox`:
 *
 *  1. **The vocabulary is small and closed** (`SandboxBackendName`): chromium,
 *     structural, remote. Not an open registry — a backend describes the
 *     MACHINE, not a plugin's contribution.
 *  2. **Enforcement is a reported fact, never an assumption.** This harness
 *     launches Chromium with `--no-sandbox` so it works in containers; the
 *     honest report for that is `partial`, and `classifyEnforcement` derives it
 *     from the args actually passed rather than from a hand-written constant
 *     that could drift from them.
 *  3. **The policy is resolved once per process and logged** — it lands in the
 *     run log as a `sandboxPolicy` event (appended by `aggregateRuns`, the
 *     moment scoring happens), so "which sandbox produced this number?" is
 *     answerable from the trace alone.
 *
 * PLAYWRIGHT IS NEVER IMPORTED EAGERLY here or in `sandbox.ts` — only through
 * `await import('playwright')` inside a backend's `launch()`, plus `import
 * type` (erased at build). That is the load-bearing property behind
 * `BENCH_SANDBOX=structural`: on a machine with no browser binaries, nothing on
 * this path tries to load one. `sandbox-backend.test.ts` asserts it against the
 * source text.
 */

/** The closed vocabulary, in the order the error message lists it. */
export const SANDBOX_BACKEND_NAMES: readonly SandboxBackendName[] = [
  'chromium',
  'structural',
  'remote',
]

/**
 * The exact args local Chromium launches with — unchanged from before the
 * seam existed, and exported so the enforcement classifier reads the SAME
 * list the browser gets (an enforcement level derived from a copy is a lie
 * waiting to happen).
 */
export const CHROMIUM_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-web-security',
] as const

/**
 * Flags that weaken the sandbox promise. `--disable-gpu` /
 * `--disable-dev-shm-usage` are NOT here: they change rendering and shared
 * memory, not isolation.
 */
const WEAKENING_FLAGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-web-security',
  '--single-process',
  '--disable-site-isolation-trials',
]

/** `partial` iff any launch arg weakens isolation. Prefix-matched so
 *  `--disable-web-security=1`-style spellings are not missed. */
export function classifyEnforcement(args: readonly string[]): SandboxEnforcement {
  const weakened = args.some((arg) => WEAKENING_FLAGS.some((flag) => arg.startsWith(flag)))
  return weakened ? 'partial' : 'full'
}

/** A launched backend: the one capability `runChecks` needs from a browser. */
export interface SandboxSession {
  newContext(options?: BrowserContextOptions): Promise<BrowserContext>
}

export interface SandboxBackend {
  readonly name: SandboxBackendName
  /** Reported, not assumed — see `classifyEnforcement`. */
  readonly enforcement: SandboxEnforcement
  /** Launch (or reuse) the browser. REJECTS on a backend that has none. */
  launch(): Promise<SandboxSession>
  /** Best-effort teardown; safe to call when nothing was ever launched. */
  close(): Promise<void>
}

/** The complete policy in force for a scoring run, resolved once per process. */
export interface SandboxPolicy {
  backend: SandboxBackendName
  enforcement: SandboxEnforcement
  /**
   * Whether the scorer wraps artifacts in the DISPLAY prelude (`withPrelude`)
   * before loading them — i.e. whether scoring and display ran the same
   * environment. Default FALSE, which is the behaviour every stored
   * behavioural score was produced under; see
   * `docs/lab/llm-benchmark/prelude-parity-measurement.md`.
   */
  preludeParity: boolean
}

function isTruthy(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true'
}

/**
 * Read a policy out of an environment. PURE — takes the env, throws on a bad
 * one, memoizes nothing. `resolveSandboxPolicy()` is the memoized process-wide
 * accessor built on it.
 *
 * An unknown `BENCH_SANDBOX` is FATAL rather than a fall-back-to-default:
 * "`BENCH_SANDBOX=jsdom` quietly scored with a real browser" is exactly the
 * failure this seam exists to prevent.
 */
export function readSandboxPolicy(env: Record<string, string | undefined>): SandboxPolicy {
  const requested = env.BENCH_SANDBOX?.trim()
  const name = (requested === undefined || requested === '' ? 'chromium' : requested) as
    | SandboxBackendName
    | string
  if (!SANDBOX_BACKEND_NAMES.includes(name as SandboxBackendName)) {
    throw new Error(
      `BENCH_SANDBOX="${requested}" is not a sandbox backend ` +
        `(known: ${SANDBOX_BACKEND_NAMES.join(', ')})`
    )
  }
  const preludeParity = isTruthy(env.BENCH_PRELUDE_PARITY)

  if (name === 'remote') {
    if (!env.PLAYWRIGHT_WS_ENDPOINT) {
      throw new Error(
        'BENCH_SANDBOX=remote needs PLAYWRIGHT_WS_ENDPOINT (the ws:// address of a Playwright server)'
      )
    }
    // The far side owns its launch flags; this side cannot observe them, and
    // "unknowable" reports as `partial` — never as `full`.
    return { backend: 'remote', enforcement: 'partial', preludeParity }
  }
  if (name === 'structural') {
    // No browser, so no isolation to promise.
    return { backend: 'structural', enforcement: 'partial', preludeParity }
  }
  return { backend: 'chromium', enforcement: classifyEnforcement(CHROMIUM_LAUNCH_ARGS), preludeParity }
}

/** Build the backend a policy names. */
export function createBackend(policy: SandboxPolicy): SandboxBackend {
  switch (policy.backend) {
    case 'structural':
      return structuralBackend(policy.enforcement)
    case 'remote':
      return remoteBackend(policy.enforcement)
    case 'chromium':
      return localChromiumBackend(policy.enforcement)
  }
}

function localChromiumBackend(enforcement: SandboxEnforcement): SandboxBackend {
  // The browser is shared across every check in the process (cold start ~1s,
  // subsequent page loads ~50ms) — the same lifetime the pre-seam
  // `getBrowser()` had, now owned by the backend.
  let browser: Promise<Browser> | undefined
  return {
    name: 'chromium',
    enforcement,
    async launch() {
      if (!browser) {
        const { chromium } = await import('playwright')
        browser = chromium.launch({ headless: true, args: [...CHROMIUM_LAUNCH_ARGS] })
      }
      const b = await browser
      return { newContext: (options) => b.newContext(options) }
    },
    async close() {
      if (!browser) return
      try {
        await (await browser).close()
      } catch {
        // Best-effort cleanup; ignore close errors (browser already gone).
      } finally {
        browser = undefined
      }
    },
  }
}

/**
 * The no-browser backend. It does not emulate a DOM (jsdom is not a dependency
 * and adding one to fake a renderer would produce behavioural verdicts nobody
 * should trust) — it REFUSES to launch, and the composite scorer's existing
 * `behaviouralFallback` path turns that refusal into a structural-only score
 * with a stated reason. One documented fallback shape, not two.
 */
function structuralBackend(enforcement: SandboxEnforcement): SandboxBackend {
  return {
    name: 'structural',
    enforcement,
    async launch(): Promise<SandboxSession> {
      throw new Error(
        'sandbox backend "structural": no browser, so behavioural checks cannot run ' +
          '(BENCH_SANDBOX=structural) — scoring falls back to the structural score'
      )
    },
    async close() {},
  }
}

/**
 * Connect to a Playwright server (`PLAYWRIGHT_WS_ENDPOINT`) instead of
 * launching locally — the shape a containerised CI with a browser sidecar
 * needs.
 *
 * HONESTLY UNTESTED against a real remote endpoint: nothing in this repo runs a
 * Playwright server, so what is verified is the selection, the enforcement
 * report and the connect call — not a live session.
 */
function remoteBackend(enforcement: SandboxEnforcement): SandboxBackend {
  let browser: Promise<Browser> | undefined
  return {
    name: 'remote',
    enforcement,
    async launch() {
      if (!browser) {
        const endpoint = process.env.PLAYWRIGHT_WS_ENDPOINT
        if (!endpoint) throw new Error('sandbox backend "remote": PLAYWRIGHT_WS_ENDPOINT is unset')
        const { chromium } = await import('playwright')
        browser = chromium.connect(endpoint)
      }
      const b = await browser
      return { newContext: (options) => b.newContext(options) }
    },
    async close() {
      if (!browser) return
      try {
        await (await browser).close()
      } catch {
        // Best-effort: a dropped remote connection is not a scoring failure.
      } finally {
        browser = undefined
      }
    },
  }
}

// ---------------------------------------------------------------------------
// process-wide resolution
// ---------------------------------------------------------------------------

let policy: SandboxPolicy | undefined
let backend: SandboxBackend | undefined

/**
 * The policy for THIS process, resolved on first use and then frozen.
 *
 * Once, not per call: the run log records the policy a record was scored
 * under, and a policy that could change mid-sweep would make that record a
 * guess.
 */
export function resolveSandboxPolicy(): SandboxPolicy {
  if (!policy) policy = readSandboxPolicy(process.env)
  return policy
}

/** The backend for this process, built from the resolved policy. */
export function getSandboxBackend(): SandboxBackend {
  if (!backend) backend = createBackend(resolveSandboxPolicy())
  return backend
}

/**
 * TEST SEAM. Install a backend (and optionally the policy it implies) without
 * touching the environment. Production code never calls this.
 */
export function setSandboxBackend(next: SandboxBackend, nextPolicy?: SandboxPolicy): void {
  backend = next
  policy = nextPolicy ?? {
    backend: next.name,
    enforcement: next.enforcement,
    preludeParity: false,
  }
}

/** TEST SEAM. Drop the memoized policy/backend (does NOT close a browser —
 *  `closeSandbox()` owns that). */
export function resetSandboxRuntime(): void {
  policy = undefined
  backend = undefined
}

/** Close whatever backend this process launched. Idempotent. */
export async function closeSandboxBackend(): Promise<void> {
  const current = backend
  backend = undefined
  if (current) await current.close()
}
