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
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Moonshot error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const choice = data.choices?.[0]
  const output = choice?.message?.content ?? ''
  const tokensIn = data.usage?.prompt_tokens ?? 0
  const tokensOut = data.usage?.completion_tokens ?? 0
  return { output, tokensIn, tokensOut, runtimeMs: Date.now() - start }
}
