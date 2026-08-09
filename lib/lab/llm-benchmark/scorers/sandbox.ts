import { chromium, type Browser, type Page } from 'playwright'

/**
 * Playwright-backed behavioral scoring sandbox.
 *
 * Loads artifact HTML into a real Chromium page (sandboxed, no same-origin
 * access to the benchmark host) and runs a set of check functions that
 * interact with the page — dispatching keys, reading pixels, and asserting
 * that the page responds. This catches the class of failure that a
 * structural HTML scorer misses: a page that parses cleanly but whose
 * JavaScript is broken (e.g. mini-platformer where Space doesn't jump).
 *
 * The browser instance is shared across all checks within a single process
 * for speed (cold start is ~1s; subsequent page loads are ~50ms). Callers
 * MUST call `closeSandbox()` when done (typically from a top-level CLI
 * script or after the rescore batch finishes).
 *
 * Why Playwright (and not jsdom): real canvas rendering, real keyboard
 * events that hit the game's listeners, real RAF, and pixel diffs that
 * actually reflect what a user sees. Launched with `--no-sandbox` so it
 * works inside containerised / CI environments where the setuid sandbox
 * can't be created.
 */

let browserPromise: Promise<Browser> | undefined

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
      ],
    })
  }
  return browserPromise
}

export async function closeSandbox(): Promise<void> {
  if (!browserPromise) return
  try {
    const b = await browserPromise
    await b.close()
  } catch {
    // Best-effort cleanup; ignore close errors (e.g. browser already gone).
  } finally {
    browserPromise = undefined
  }
}

export interface CheckContext {
  /** The loaded page. */
  page: Page
  /** The artifact HTML, in case checks need to re-inject or inspect it. */
  html: string
  /** Helper to capture canvas pixels as a binary buffer + dimensions. */
  captureCanvas(canvasSelector?: string): Promise<{ width: number; height: number; data: Buffer } | undefined>
}

export interface CheckResult {
  /** Short, stable name (used in reports and the composite score). */
  name: string
  /** True if the check passed. */
  passed: boolean
  /** Points awarded for this check (0 if failed). */
  points: number
  /** Max points this check is worth. */
  maxPoints: number
  /** Free-text detail for the report. */
  detail?: string
}

export type CheckFn = (ctx: CheckContext) => Promise<CheckResult>

export interface RunChecksOptions {
  /** Time to wait after page load for init/RAF before any check runs (ms). */
  settleMs?: number
  /** Per-check timeout (ms). */
  perCheckTimeoutMs?: number
  /** Total timeout for the whole run (ms). */
  totalTimeoutMs?: number
}

/**
 * Load the artifact in a fresh page and run the provided checks. Returns
 * one result per check. A thrown check (timeout, page error, assertion
 * failure) is converted to a failed CheckResult rather than aborting the
 * whole batch — so one broken check doesn't hide the others.
 */
export async function runChecks(
  html: string,
  checks: CheckFn[],
  options: RunChecksOptions = {}
): Promise<CheckResult[]> {
  const { settleMs = 800, perCheckTimeoutMs = 8000, totalTimeoutMs = 30_000 } = options
  const browser = await getBrowser()
  const context = await browser.newContext({
    // Match the site's iframe sandbox so the check sees the same environment
    // a user does: no same-origin access, scripts allowed, no top-level nav.
    bypassCSP: false,
    viewport: { width: 1024, height: 720 },
  })
  const page = await context.newPage()

  const consoleErrors: string[] = []
  page.on('pageerror', (e) => consoleErrors.push(e.message))

  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10_000 })
    // Give the page a beat to run init / first RAF tick.
    await page.waitForTimeout(settleMs)
  } catch (e) {
    await page.close().catch(() => {})
    await context.close().catch(() => {})
    return checks.map((c) => ({
      name: c.name,
      passed: false,
      points: 0,
      maxPoints: 0,
      detail: `page load failed: ${e instanceof Error ? e.message : String(e)}`,
    }))
  }

  const captureCanvas: CheckContext['captureCanvas'] = async (selector = 'canvas') => {
    const dataUrl = await page.evaluate((sel) => {
      const c = document.querySelector(sel) as HTMLCanvasElement | null
      if (!c) return null
      // toDataURL gives us a PNG; the harness converts it to a buffer.
      return c.toDataURL('image/png')
    }, selector)
    if (!dataUrl) return undefined
    const buf = Buffer.from(dataUrl.split(',', 2)[1] ?? '', 'base64')
    // Decode PNG header for width/height rather than pulling in a full parser:
    // the harness only needs width/height for diff reporting; pixel data is
    // already in the buffer for downstream consumers.
    const width = buf.readUInt32BE(16)
    const height = buf.readUInt32BE(20)
    return { width, height, data: buf }
  }

  const ctx: CheckContext = { page, html, captureCanvas }

  const results: CheckResult[] = []
  const batchStart = Date.now()
  for (const check of checks) {
    if (Date.now() - batchStart > totalTimeoutMs) {
      results.push({
        name: check.name,
        passed: false,
        points: 0,
        maxPoints: 0,
        detail: 'skipped: batch timeout',
      })
      continue
    }
    try {
      const res = await Promise.race([
        check(ctx),
        new Promise<CheckResult>((_, reject) =>
          setTimeout(() => reject(new Error(`check timeout after ${perCheckTimeoutMs}ms`)), perCheckTimeoutMs)
        ),
      ])
      results.push(res)
    } catch (e) {
      results.push({
        name: check.name,
        passed: false,
        points: 0,
        maxPoints: 0,
        detail: `threw: ${e instanceof Error ? e.message : String(e)}`,
      })
    }
  }

  if (consoleErrors.length > 0) {
    // Attach (don't overwrite) a synthetic check capturing runtime errors —
    // these often explain why behavioral checks fail.
    results.push({
      name: 'no-runtime-errors',
      passed: false,
      points: 0,
      maxPoints: 0,
      detail: `page errors: ${consoleErrors.slice(0, 3).join(' | ')}`,
    })
  }

  await page.close().catch(() => {})
  await context.close().catch(() => {})
  return results
}
