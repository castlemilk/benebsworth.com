import type { BenchmarkModel, BenchmarkTask, UsageProvenance } from '../types'

export interface OllamaConfig {
  /** Ollama host, e.g. http://localhost:11434 — defaults to env OLLAMA_HOST or localhost. */
  host?: string
  /** Optional keep_alive for model VRAM (e.g. '5m'). Omit for default. */
  keepAlive?: string
  /** Temperature for generation — benchmark harness uses 1.0 for cloud, we mirror for consistency. */
  temperature?: number
  /** num_predict max tokens — omit for model default. */
  numPredict?: number
}

export interface GenerationResponse {
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
  usageSource?: UsageProvenance
  ttftMs?: number
}

function ollamaHost(cfg?: OllamaConfig): string {
  return cfg?.host ?? process.env.OLLAMA_HOST ?? 'http://localhost:11434'
}

/**
 * Ollama chat — streaming NDJSON (one JSON per line, no SSE envelope).
 * Each line: {"message":{"role":"assistant","content":"…"},"done":false} … final line has done:true,
 * eval_count, prompt_eval_count, eval_duration, etc.
 */
async function readOllamaChatStream(
  body: ReadableStream<Uint8Array>,
  onProgress?: (bytes: number) => void
): Promise<{
  content: string
  tokensIn: number
  tokensOut: number
  sawUsage: boolean
  firstTokenAt?: number
}> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let tokensIn = 0
  let tokensOut = 0
  let sawUsage = false
  let received = 0
  let firstTokenAt: number | undefined

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    onProgress?.(received)
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const json = JSON.parse(trimmed)
        // Content can be in message.content (chat) or response (generate)
        const delta =
          json.message?.content ??
          json.response ??
          ''
        if (typeof delta === 'string' && delta.length > 0) {
          if (firstTokenAt === undefined) firstTokenAt = Date.now()
          content += delta
        }
        // Final frame carries counts/durations (ns)
        if (json.done) {
          if (typeof json.prompt_eval_count === 'number') {
            tokensIn = json.prompt_eval_count
            sawUsage = true
          }
          if (typeof json.eval_count === 'number') {
            tokensOut = json.eval_count
            sawUsage = true
          }
          // Fallback: some Ollama builds use without _count
          if (!sawUsage && typeof json.prompt_eval_count === 'undefined' && typeof json.eval_count === 'undefined') {
            // leave sawUsage false — caller will treat as estimated
          }
        }
      } catch {
        // partial line — next chunk completes it
      }
    }
  }
  // Flush any trailing buffer as one more line
  if (buffer.trim()) {
    try {
      const json = JSON.parse(buffer.trim())
      const delta = json.message?.content ?? json.response ?? ''
      if (typeof delta === 'string' && delta.length > 0) {
        if (firstTokenAt === undefined) firstTokenAt = Date.now()
        content += delta
      }
      if (json.done) {
        if (typeof json.prompt_eval_count === 'number') {
          tokensIn = json.prompt_eval_count
          sawUsage = true
        }
        if (typeof json.eval_count === 'number') {
          tokensOut = json.eval_count
          sawUsage = true
        }
      }
    } catch {
      // ignore
    }
  }
  return { content, tokensIn, tokensOut, sawUsage, firstTokenAt }
}

export async function generateOllama(
  config: OllamaConfig,
  model: BenchmarkModel,
  task: BenchmarkTask
): Promise<GenerationResponse> {
  const start = Date.now()
  const host = ollamaHost(config).replace(/\/$/, '')
  const apiModelId = model.apiModelId ?? model.id

  // The harness already appended sandbox constraints via withSandboxConstraints(task)
  // so task.prompt is the exact prompt the model should see.
  const res = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: apiModelId,
      messages: [
        {
          role: 'system',
          content: 'Respond with only the requested artifact (code, derivation, etc.) and minimal commentary.',
        },
        { role: 'user', content: task.prompt },
      ],
      stream: true,
      // qwen3.8 thinking is on by default per Ollama; qwen3.8 now runs with thinking for full reasoning depth.
      // qwen3 (non-3.8) stays non-thinking for stable compares; gemma ignores think entirely.
      think: model.id === 'qwen3.8-27b-mlx-ollama' ? true : false,
      options: {
        temperature: config.temperature ?? 1,
        num_predict: config.numPredict ?? (model.id === 'qwen3.8-27b-mlx-ollama' ? 24000 : 16384),
        reasoning_effort: model.id === 'qwen3.8-27b-mlx-ollama' ? 'medium' : 'low',
      },
      ...(config.keepAlive ? { keep_alive: config.keepAlive } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    // Helpful message when Ollama not running or model not pulled
    if (res.status === 404 && body.includes('not found')) {
      throw new Error(`Ollama: model '${apiModelId}' not found at ${host} — pull it: ollama pull ${apiModelId} (body: ${body})`)
    }
    throw new Error(`Ollama error ${res.status} at ${host}: ${body}`)
  }
  if (!res.body) throw new Error('Ollama response had no body')

  let lastLog = 0
  const { content, tokensIn, tokensOut, sawUsage, firstTokenAt } = await readOllamaChatStream(res.body, (bytes) => {
    if (bytes - lastLog >= 64 * 1024) {
      lastLog = bytes
      console.log(`[harness]   … ${model.name} (ollama) streaming, ${Math.round(bytes / 1024)}KB so far`)
    }
  })

  // Estimate if Ollama didn't report counts (older builds)
  const estIn = tokensIn || Math.max(0, Math.round(task.prompt.length / 4))
  const estOut = tokensOut || Math.max(0, Math.round(content.length / 4))

  return {
    output: content,
    tokensIn: sawUsage ? tokensIn : estIn,
    tokensOut: sawUsage ? tokensOut : estOut,
    runtimeMs: Date.now() - start,
    usageSource: sawUsage ? 'reported' : 'estimated',
    ...(firstTokenAt !== undefined ? { ttftMs: firstTokenAt - start } : {}),
  }
}
