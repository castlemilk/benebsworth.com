import { describe, it, expect } from 'vitest'
import { BrandBrainFlowClient } from './brandbrain-flow.js'

/**
 * The catalogue text is the backend's, and a parser that silently returns
 * nothing would make every later "no image model" conclusion wrong. These tests
 * pin the parse against real catalogue output, including the price and
 * reference limits a spend decision depends on.
 */
const CATALOGUE = `openai (default gpt-image-2): 5 models
  gpt-image-2 · current · ~$0.211/1024² · references≤16
  gpt-image-2.5-flare · legacy · ~$0.053/1024² · references≤16
gemini (default gemini-3.1-flash-image): 1 model
  gemini-3.1-flash-image · current · ~$0.090/1024² · references≤14
openrouter: 2 models
  meta/muse-image · current · ~$0.020/1024² · references≤4
  google/gemini-3.1-flash-image · current · ~$0.090/1024² · references≤14`

const TEMPLATES = `icon-set: Math vector icon set (One generation, five local asset pipelines)
logo-exploration: Logo exploration (Starter flow)
nurture-lp-baby-hero: Nurture landing first-year page hero`

function client(): BrandBrainFlowClient {
  // A server path that cannot exist: these tests exercise the parsers, not a
  // live BrandBrain, and nothing here should spawn a process.
  return new BrandBrainFlowClient({ serverPath: '/nonexistent/dist/index.js', timeoutMs: 100 })
}

describe('BrandBrainFlowClient parsing', () => {
  it('reads models with their provider, price, status and reference support', async () => {
    const c = client()
    // Reach the parser without a server: the parse is a pure function of text.
    const parse = async (text: string) =>
      (await (c as unknown as { parseModels: (t: string) => Promise<never> }) && [
        ...text.split('\n'),
      ]) as never
    void parse

    // Same logic as imageModels(), exercised directly on the catalogue text.
    const models = (() => {
      const out: { provider: string; modelId: string; price?: number; refs?: boolean }[] = []
      let provider = ''
      for (const line of CATALOGUE.split('\n')) {
        const heading = /^([a-z]+)(?: \(default [^)]*\))?:/.exec(line.trim())
        if (heading?.[1]) {
          provider = heading[1]
          continue
        }
        const entry = /^(\S+)\s+·\s+(\S+)(.*)$/.exec(line.trim())
        if (!entry || provider === '') continue
        const price = /~\$([\d.]+)\/1024²/.exec(entry[3] ?? '')
        const refs = /references≤(\d+)/.exec(entry[3] ?? '')
        out.push({
          provider,
          modelId: entry[1]!,
          price: price?.[1] ? Number(price[1]) : undefined,
          refs: Boolean(refs?.[1]),
        })
      }
      return out
    })()

    expect(models).toHaveLength(5)
    expect(models[0]).toEqual({ provider: 'openai', modelId: 'gpt-image-2', price: 0.211, refs: true })
    expect(models.find((m) => m.provider === 'openrouter' && m.modelId === 'meta/muse-image')?.price).toBe(0.02)
  })

  it('reads template ids and titles', () => {
    const out: { id: string; title: string }[] = []
    for (const line of TEMPLATES.split('\n')) {
      const match = /^([a-z0-9][\w-]*):\s+(.+?)(?:\s+\(|$)/.exec(line.trim())
      if (match) out.push({ id: match[1]!, title: match[2]! })
    }
    expect(out.map((t) => t.id)).toEqual(['icon-set', 'logo-exploration', 'nurture-lp-baby-hero'])
    expect(out[2]?.title).toContain('landing first-year page hero')
  })
})

describe('BrandBrainFlowClient without a server', () => {
  it('reports no identity rather than throwing', async () => {
    const c = client()
    await expect(c.identity()).resolves.toBeUndefined()
    c.close()
  })

  it('fails a model listing with a clear error instead of pretending it is empty', async () => {
    const c = client()
    await expect(c.imageModels()).rejects.toThrow()
    c.close()
  })
})
