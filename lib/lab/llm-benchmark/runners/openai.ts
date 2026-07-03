import type { BenchmarkModel, BenchmarkTask } from '../types'

export interface OpenAIConfig {
  apiKey: string
  baseUrl?: string
}

export interface GenerationResponse {
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
}

export async function generateOpenAI(
  config: OpenAIConfig,
  model: BenchmarkModel,
  task: BenchmarkTask
): Promise<GenerationResponse> {
  const start = Date.now()
  const res = await fetch(`${config.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: model.id,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful coding assistant. Respond with only the requested artifact (code, derivation, etc.) and minimal commentary.',
        },
        { role: 'user', content: task.prompt },
      ],
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const choice = data.choices?.[0]
  const output = choice?.message?.content ?? ''
  const tokensIn = data.usage?.prompt_tokens ?? 0
  const tokensOut = data.usage?.completion_tokens ?? 0
  return { output, tokensIn, tokensOut, runtimeMs: Date.now() - start }
}
