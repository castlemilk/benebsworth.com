import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildQwenImageWorkflow, generateWithComfy } from './comfy.js'

/**
 * The graph is only correct if every edge type-checks against ComfyUI's
 * declared node signatures; a wrong edge fails at queue time. These tests pin
 * the three edges that were actually wrong while bringing this up — the missing
 * VAE decode, the 16-channel latent, and the encoder that has to match the
 * transformer generation — so they cannot regress silently.
 */
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buildQwenImageWorkflow', () => {
  const graph = buildQwenImageWorkflow({ prompt: 'a calm field', outPath: '/tmp/x.png' }) as Record<
    string,
    { class_type: string; inputs: Record<string, unknown> }
  >

  it('samples a 16-channel latent, not a plain image latent', () => {
    expect(graph['5']?.class_type).toBe('EmptySD3LatentImage')
  })

  it('decodes the latent before saving: the sampler emits LATENT, SaveImage needs IMAGE', () => {
    expect(graph['8']?.class_type).toBe('VAEDecode')
    expect(graph['8']?.inputs.samples).toEqual(['6', 0])
    expect(graph['7']?.inputs.images).toEqual(['8', 0])
  })

  it('pairs the 2.1 transformer with the Qwen3-VL encoder', () => {
    expect(graph['2']?.inputs.clip_name).toBe('qwen3vl_8b_bf16.safetensors')
    expect(graph['3']?.inputs.vae_name).toBe('qwen_image_2.1_vae_bf16.safetensors')
  })

  it('samples flow-matching: cfg 1.0 with the brief as its own negative', () => {
    expect(graph['6']?.inputs.cfg).toBe(1.0)
    expect(graph['6']?.inputs.positive).toEqual(graph['6']?.inputs.negative)
  })

  it('uses snake_case input names, which the API requires and a typo hides', () => {
    // A camelCase key is a silently missing required input: ComfyUI accepts the
    // graph, runs every other node, and reports "Required input is missing:
    // filename_prefix" at the last step.
    expect(graph['7']?.inputs).toHaveProperty('filename_prefix')
    expect(graph['7']?.inputs).not.toHaveProperty('filenamePrefix')
  })

  it('honours the requested geometry', () => {
    const wide = buildQwenImageWorkflow({ prompt: 'p', outPath: '/tmp/x.png', width: 1920, height: 640, steps: 12, seed: 7 }) as Record<string, { inputs: Record<string, unknown> }>
    expect(wide['5']?.inputs).toMatchObject({ width: 1920, height: 640 })
    expect(wide['6']?.inputs).toMatchObject({ steps: 12, seed: 7 })
  })
})

describe('generateWithComfy', () => {
  it('returns undefined when no server is listening, so the chain falls through', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    await expect(generateWithComfy({ prompt: 'p', outPath: '/tmp/never.png', timeoutMs: 1000 })).resolves.toBeUndefined()
  })

  it('returns undefined when the graph is rejected rather than throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { type: 'prompt_outputs_failed_validation' } }), { status: 400 }))
    )
    await expect(generateWithComfy({ prompt: 'p', outPath: '/tmp/never.png', timeoutMs: 1000 })).resolves.toBeUndefined()
  })

  it('returns undefined when the run completes with no image', async () => {
    const responses = [
      new Response(JSON.stringify({ prompt_id: 'p1' }), { status: 200 }),
      new Response(JSON.stringify({ p1: { status: { status_str: 'success' }, outputs: {} } }), { status: 200 }),
    ]
    let call = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        const response = responses[Math.min(call, responses.length - 1)]
        call += 1
        return response
      })
    )
    await expect(generateWithComfy({ prompt: 'p', outPath: '/tmp/never.png', timeoutMs: 2000 })).resolves.toBeUndefined()
  })
})
