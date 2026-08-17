import type { BenchmarkModel, BenchmarkTask, UsageProvenance } from '../types'

export interface GoogleConfig {
  apiKey: string
}

export interface GenerationResponse {
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
  /** See the canonical contract on `GenerationResponse` in ../types. */
  usageSource?: UsageProvenance
}

export async function generateGoogle(
  config: GoogleConfig,
  model: BenchmarkModel,
  task: BenchmarkTask
): Promise<GenerationResponse> {
  const start = Date.now()
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: 'Respond with only the requested artifact (code, derivation, etc.) and minimal commentary.',
            },
          ],
        },
        contents: [{ role: 'user', parts: [{ text: task.prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const candidate = data.candidates?.[0]
  const part = candidate?.content?.parts?.[0]
  const output = part?.text ?? ''
  // Provenance before counts: `data.usageMetadata` present means the numbers below are
  // the provider's own. Absent, the `?? 0` fallbacks are OURS, and a zero we
  // invented must never be published as a provider statement.
  const usageSource: UsageProvenance = data.usageMetadata ? 'reported' : 'estimated'
  const tokensIn = data.usageMetadata?.promptTokenCount ?? 0
  const tokensOut = data.usageMetadata?.candidatesTokenCount ?? 0
  return { output, tokensIn, tokensOut, usageSource, runtimeMs: Date.now() - start }
}
