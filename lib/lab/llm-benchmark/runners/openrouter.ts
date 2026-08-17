import type { BenchmarkModel, BenchmarkTask, UsageProvenance } from '../types'

export interface OpenRouterConfig {
  apiKey: string
  baseUrl?: string
  /** Site URL reported to OpenRouter's stats (optional). */
  referer?: string
  /** Site/app name reported to OpenRouter's stats (optional). */
  title?: string
}

export interface GenerationResponse {
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
  /** See the canonical contract on `GenerationResponse` in ../types. */
  usageSource?: UsageProvenance
  /** See the canonical contract on `GenerationResponse` in ../types. */
  ttftMs?: number
}

/**
 * Read a chat-completions SSE stream, accumulating ONLY the final-answer
 * `content` deltas (never `reasoning_content` — free-tier reasoning models can
 * emit huge thinking traces that would swamp the artifact). Usage arrives in
 * the terminal chunk when `stream_options.include_usage` is set.
 */
async function readChatStream(
  body: ReadableStream<Uint8Array>,
  onProgress?: (bytes: number) => void
): Promise<{
  content: string
  tokensIn: number
  tokensOut: number
  /** True iff the stream carried a `usage` block — i.e. the counts are the provider's own. */
  sawUsage: boolean
  firstTokenAt?: number
}> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let tokensIn = 0
  let tokensOut = 0
  // Provenance, not a count: distinguishes "the provider said 0" from "the
  // provider said nothing and these zeros are ours".
  let sawUsage = false
  let received = 0
  let finishReason: string | undefined
  // Wall-clock of the first NON-EMPTY content delta — a true first-token
  // boundary. Never moved by a later delta, and never set by a reasoning-only
  // or keep-alive chunk (which is why it is stamped inside the content branch
  // rather than on the first byte off the socket).
  let firstTokenAt: number | undefined

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    onProgress?.(received)
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? '' // last entry may be a partial line
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const choice = json.choices?.[0]
        if (typeof choice?.delta?.content === 'string' && choice.delta.content.length > 0) {
          if (firstTokenAt === undefined) firstTokenAt = Date.now()
          content += choice.delta.content
        }
        if (typeof choice?.finish_reason === 'string') finishReason = choice.finish_reason
        if (json.usage) {
          sawUsage = true
          tokensIn = json.usage.prompt_tokens ?? tokensIn
          tokensOut = json.usage.completion_tokens ?? tokensOut
        }
      } catch {
        // A split SSE payload or keep-alive comment — the next chunk completes it.
      }
    }
  }

  // Truncated generations are diagnosable failures, not empty successes.
  if (!content.trim() && finishReason === 'length') {
    throw new Error(
      `generation truncated at the completion-token limit before any content was emitted (${tokensOut} tokens, all reasoning)`
    )
  }

  return { content, tokensIn, tokensOut, sawUsage, firstTokenAt }
}

export async function generateOpenRouter(
  config: OpenRouterConfig,
  model: BenchmarkModel,
  task: BenchmarkTask
): Promise<GenerationResponse> {
  const start = Date.now()
  // Registry ids are filesystem-safe slugs (e.g. 'nemotron-3-ultra'); the
  // OpenRouter API needs the full vendor slug (e.g. 'nvidia/nemotron-3-ultra-550b-a55b:free').
  const apiModelId = model.apiModelId ?? model.id
  const res = await fetch(`${config.baseUrl ?? 'https://openrouter.ai/api/v1'}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      ...(config.referer ? { 'HTTP-Referer': config.referer } : {}),
      ...(config.title ? { 'X-Title': config.title } : {}),
    },
    body: JSON.stringify({
      model: apiModelId,
      messages: [
        {
          role: 'system',
          content:
            'Respond with only the requested artifact (code, derivation, etc.) and minimal commentary.',
        },
        { role: 'user', content: task.prompt },
      ],
      temperature: 1,
      // Streaming is not optional: free-tier endpoints queue and can take many
      // minutes for a single artifact. A non-streaming request sits silent the
      // whole time and middleboxes drop the idle connection; SSE chunks keep
      // it alive.
      stream: true,
      stream_options: { include_usage: true },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter error ${res.status}: ${body}`)
  }
  if (!res.body) throw new Error('OpenRouter response had no body')

  let lastLog = 0
  const { content, tokensIn, tokensOut, sawUsage, firstTokenAt } = await readChatStream(res.body, (bytes) => {
    if (bytes - lastLog >= 64 * 1024) {
      lastLog = bytes
      console.log(`[harness]   … ${model.name} streaming, ${Math.round(bytes / 1024)}KB so far`)
    }
  })

  return {
    output: content,
    tokensIn,
    tokensOut,
    runtimeMs: Date.now() - start,
    // 'reported' only when the stream actually carried a usage block. Without
    // one there is no fallback estimate here — tokensIn/tokensOut stay 0 —
    // and a zero we invented is emphatically not a provider statement.
    usageSource: sawUsage ? 'reported' : 'estimated',
    // Measured from the SAME `start` as runtimeMs (i.e. before the fetch), so
    // TTFT includes connect + queue + prefill — which is the point: that is the
    // half of the latency that is not decoding.
    ...(firstTokenAt !== undefined ? { ttftMs: firstTokenAt - start } : {}),
  }
}
