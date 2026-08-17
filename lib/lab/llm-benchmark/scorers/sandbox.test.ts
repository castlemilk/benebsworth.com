import { describe, it, expect, afterEach } from 'vitest'
import type { BrowserContext, Page } from 'playwright'

import { FRAME_PRELUDE } from '../frame-prelude'
import { BENCHMARK_TASKS } from '../registry'
import { scoreWithBreakdown } from './behavioral'
import { runChecks } from './sandbox'
import { resetSandboxRuntime, setSandboxBackend, type SandboxBackend } from './sandbox-backend'

const ARTIFACT = '<html><head></head><body><canvas id="c"></canvas></body></html>'

/**
 * A backend that records what reached `setContent` and nothing else — the seam
 * the parity flag acts on. Spying here (rather than launching a browser) keeps
 * the assertion about the BYTES THE PAGE RECEIVED, which is the whole question.
 */
function recordingBackend(): { backend: SandboxBackend; contents: string[] } {
  const contents: string[] = []
  const page = {
    on: () => {},
    setContent: async (html: string) => {
      contents.push(html)
    },
    waitForTimeout: async () => {},
    evaluate: async () => null,
    close: async () => {},
  } as unknown as Page
  const context = {
    newPage: async () => page,
    close: async () => {},
  } as unknown as BrowserContext
  const backend: SandboxBackend = {
    name: 'chromium',
    enforcement: 'partial',
    launch: async () => ({ newContext: async () => context }),
    close: async () => {},
  }
  return { backend, contents }
}

afterEach(() => {
  resetSandboxRuntime()
})

describe('prelude parity', () => {
  it('loads the raw artifact by default', () => {
    const { backend, contents } = recordingBackend()
    setSandboxBackend(backend)
    return runChecks(ARTIFACT, []).then(() => {
      expect(contents).toEqual([ARTIFACT])
    })
  })

  it('wraps the artifact with the display prelude when parity is on', async () => {
    const { backend, contents } = recordingBackend()
    setSandboxBackend(backend, { backend: 'chromium', enforcement: 'partial', preludeParity: true })
    await runChecks(ARTIFACT, [])
    expect(contents).toHaveLength(1)
    expect(contents[0]).toContain(FRAME_PRELUDE)
    expect(contents[0]).toContain('<canvas id="c">')
    // The wrap is the DISPLAY path's, byte for byte — not a second prelude.
    expect(contents[0]).not.toBe(ARTIFACT)
  })
})

describe('structural backend end to end', () => {
  it('falls back to the structural score with a reason naming the backend', async () => {
    const task = BENCHMARK_TASKS.find((t) => t.id === 'mini-platformer')!
    setSandboxBackend(
      {
        name: 'structural',
        enforcement: 'partial',
        launch: async () => {
          throw new Error('sandbox backend "structural": no browser available (BENCH_SANDBOX=structural)')
        },
        close: async () => {},
      },
      { backend: 'structural', enforcement: 'partial', preludeParity: false }
    )
    const result = await scoreWithBreakdown(ARTIFACT, task)
    // The documented behaviouralFallback shape — one path, not a second one
    // invented for the no-browser backend.
    expect(result.checks).toEqual([])
    expect(result.behavioralMax).toBe(0)
    expect(result.fallbackReason).toMatch(/structural/)
    expect(result.score).toBe(result.structural)
  })
})
