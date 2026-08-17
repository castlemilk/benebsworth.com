/**
 * Producer-side stamping of `GenerationResponse.usageSource`.
 *
 * The CLI side of the same contract lives in `cli.test.ts` (char fallback +
 * the codex parseTokens path); this file covers the API providers, where the
 * question is exactly "did the response carry a usage block".
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { generateMoonshot } from './moonshot'
import { generateOpenRouter } from './openrouter'
import { generateOpenAI } from './openai'
import { generateAnthropic } from './anthropic'
import { generateGoogle } from './google'
import type { BenchmarkModel, BenchmarkTask } from '../types'

const MODEL: BenchmarkModel = {
  id: 'test-model',
  name: 'Test',
  provider: 'Test',
  costPer1kInputUsd: 0,
  costPer1kOutputUsd: 0,
  contextWindow: 1000,
  capabilities: '',
}

const TASK: BenchmarkTask = {
  id: 't',
  category: 'ui-building',
  title: 'T',
  blurb: '',
  prompt: 'do it',
  runtimeHint: '',
  iterationsDefault: 1,
  methodNotes: '',
  demoComponentName: 'D',
  slug: 't',
}

/** A minimal chat-completions SSE body; `usage` omitted when null. */
function sseBody(usage: { prompt_tokens: number; completion_tokens: number } | null): Response {
  const chunks = [
    'data: {"choices":[{"delta":{"content":"<h1>hello</h1>"}}]}\n\n',
    'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
    ...(usage ? [`data: {"choices":[],"usage":${JSON.stringify(usage)}}\n\n`] : []),
    'data: [DONE]\n\n',
  ]
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c))
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

function mockFetch(response: Response): void {
  vi.stubGlobal('fetch', vi.fn(async () => response))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('streaming API providers stamp usage provenance', () => {
  for (const [name, generate] of [
    ['moonshot', () => generateMoonshot({ apiKey: 'k' }, MODEL, TASK)],
    ['openrouter', () => generateOpenRouter({ apiKey: 'k' }, MODEL, TASK)],
  ] as const) {
    it(`${name}: 'reported' when the stream carried a usage block`, async () => {
      mockFetch(sseBody({ prompt_tokens: 111, completion_tokens: 222 }))
      const res = await generate()
      expect(res.tokensIn).toBe(111)
      expect(res.tokensOut).toBe(222)
      expect(res.usageSource).toBe('reported')
    })

    it(`${name}: 'estimated' when no usage block arrived (the zeros are ours)`, async () => {
      mockFetch(sseBody(null))
      const res = await generate()
      expect(res.tokensIn).toBe(0)
      expect(res.tokensOut).toBe(0)
      // The counts are a fallback we invented, so they must not claim the
      // provider's authority — even though nothing was "estimated" from chars.
      expect(res.usageSource).toBe('estimated')
    })
  }
})

describe('non-streaming API providers stamp usage provenance', () => {
  const cases = [
    {
      name: 'openai',
      run: () => generateOpenAI({ apiKey: 'k' }, MODEL, TASK),
      reported: { choices: [{ message: { content: 'hi' } }], usage: { prompt_tokens: 7, completion_tokens: 9 } },
      bare: { choices: [{ message: { content: 'hi' } }] },
      tokens: [7, 9],
    },
    {
      name: 'anthropic',
      run: () => generateAnthropic({ apiKey: 'k' }, MODEL, TASK),
      reported: { content: [{ type: 'text', text: 'hi' }], usage: { input_tokens: 7, output_tokens: 9 } },
      bare: { content: [{ type: 'text', text: 'hi' }] },
      tokens: [7, 9],
    },
    {
      name: 'google',
      run: () => generateGoogle({ apiKey: 'k' }, MODEL, TASK),
      reported: {
        candidates: [{ content: { parts: [{ text: 'hi' }] } }],
        usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 9 },
      },
      bare: { candidates: [{ content: { parts: [{ text: 'hi' }] } }] },
      tokens: [7, 9],
    },
  ] as const

  for (const c of cases) {
    it(`${c.name}: 'reported' when the response carried usage`, async () => {
      mockFetch(new Response(JSON.stringify(c.reported), { status: 200 }))
      const res = await c.run()
      expect([res.tokensIn, res.tokensOut]).toEqual([...c.tokens])
      expect(res.usageSource).toBe('reported')
    })

    it(`${c.name}: 'estimated' when the response carried none`, async () => {
      mockFetch(new Response(JSON.stringify(c.bare), { status: 200 }))
      const res = await c.run()
      expect([res.tokensIn, res.tokensOut]).toEqual([0, 0])
      expect(res.usageSource).toBe('estimated')
    })
  }
})
