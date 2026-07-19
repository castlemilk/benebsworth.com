import type { BenchmarkModel, BenchmarkTask } from '../types'

export interface MoonshotConfig {
  apiKey: string
  baseUrl?: string
}

export interface GenerationResponse {
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
}

/**
 * Read a chat-completions SSE stream, accumulating ONLY the final-answer
 * `content` deltas (never `reasoning_content` — K3's thinking trace can be
 * tens of thousands of tokens and would swamp the artifact). Usage arrives in
 * the terminal chunk when `stream_options.include_usage` is set.
 */
async function readChatStream(
  body: ReadableStream<Uint8Array>,
  onProgress?: (bytes: number) => void
): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let tokensIn = 0
  let tokensOut = 0
  let received = 0
  let finishReason: string | undefined

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
        if (typeof choice?.delta?.content === 'string') content += choice.delta.content
        if (typeof choice?.finish_reason === 'string') finishReason = choice.finish_reason
        if (json.usage) {
          tokensIn = json.usage.prompt_tokens ?? tokensIn
          tokensOut = json.usage.completion_tokens ?? tokensOut
        }
      } catch {
        // A split SSE payload or keep-alive comment — the next chunk completes it.
      }
    }
  }

  // Truncated generations are diagnosable failures, not empty successes: e.g.
  // K2.7 can burn its whole 32k completion budget on reasoning_content and get
  // cut before emitting a single content token (finish_reason 'length').
  if (!content.trim() && finishReason === 'length') {
    throw new Error(
      `generation truncated at the completion-token limit before any content was emitted (${tokensOut} tokens, all reasoning)`
    )
  }

  return { content, tokensIn, tokensOut }
}

export async function generateMoonshot(
  config: MoonshotConfig,
  model: BenchmarkModel,
  task: BenchmarkTask
): Promise<GenerationResponse> {
  const start = Date.now()
  // Registry ids are URL-safe (e.g. 'kimi-k2.7'); Moonshot API model names use hyphens.
  const apiModelId = model.apiModelId ?? model.id.replace(/\./g, '-')
  const res = await fetch(`${config.baseUrl ?? 'https://api.moonshot.cn/v1'}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
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
      // Streaming is not optional here: K3 runs thinking mode by default and a
      // single artifact can take 10–15+ minutes to generate. A non-streaming
      // request sits silent the whole time and middleboxes drop the idle
      // connection ("fetch failed" after ~900s); SSE chunks keep it alive.
      stream: true,
      stream_options: { include_usage: true },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Moonshot error ${res.status}: ${body}`)
  }
  if (!res.body) throw new Error('Moonshot response had no body')

  let lastLog = 0
  const { content, tokensIn, tokensOut } = await readChatStream(res.body, (bytes) => {
    // Liveness in the harness log: a generation that stops emitting bytes is
    // visible as a stalled progress line instead of a silent hang.
    if (bytes - lastLog >= 64 * 1024) {
      lastLog = bytes
      console.log(`[harness]   … ${model.name} streaming, ${Math.round(bytes / 1024)}KB so far`)
    }
  })

  return { output: content, tokensIn, tokensOut, runtimeMs: Date.now() - start }
}
