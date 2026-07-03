import type { BenchmarkModel, BenchmarkTask } from '../types'

export interface GoogleConfig {
  apiKey: string
}

export interface GenerationResponse {
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
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
  const tokensIn = data.usageMetadata?.promptTokenCount ?? 0
  const tokensOut = data.usageMetadata?.candidatesTokenCount ?? 0
  return { output, tokensIn, tokensOut, runtimeMs: Date.now() - start }
}
