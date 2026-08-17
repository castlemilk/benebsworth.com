import type { BenchmarkModel, BenchmarkTask, UsageProvenance } from '../types'

export interface AnthropicConfig {
  apiKey: string
  baseUrl?: string
}

export interface GenerationResponse {
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
  /** See the canonical contract on `GenerationResponse` in ../types. */
  usageSource?: UsageProvenance
}

export async function generateAnthropic(
  config: AnthropicConfig,
  model: BenchmarkModel,
  task: BenchmarkTask
): Promise<GenerationResponse> {
  const start = Date.now()
  const res = await fetch(`${config.baseUrl ?? 'https://api.anthropic.com/v1'}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: 4096,
      system:
        'Respond with only the requested artifact (code, derivation, etc.) and minimal commentary.',
      messages: [{ role: 'user', content: task.prompt }],
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const content = data.content?.[0]
  const output = content?.type === 'text' ? content.text : ''
  // Provenance before counts: `data.usage` present means the numbers below are
  // the provider's own. Absent, the `?? 0` fallbacks are OURS, and a zero we
  // invented must never be published as a provider statement.
  const usageSource: UsageProvenance = data.usage ? 'reported' : 'estimated'
  const tokensIn = data.usage?.input_tokens ?? 0
  const tokensOut = data.usage?.output_tokens ?? 0
  return { output, tokensIn, tokensOut, usageSource, runtimeMs: Date.now() - start }
}
