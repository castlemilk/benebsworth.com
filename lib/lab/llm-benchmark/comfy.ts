import fs from 'node:fs'
import path from 'node:path'

/**
 * Local image generation through ComfyUI.
 *
 * The hosted routes are not dependable: OpenRouter's balance sits negative, and
 * BrandBrain's image providers run through the same account. A local ComfyUI
 * with a quantized open model costs nothing per image and has no quota, which
 * makes it the only rung in the chain that cannot fail for want of credit.
 *
 * The rung is deliberately dumb — POST the graph, poll the run, fetch the file —
 * because everything that makes generation good (which model, which VAE, how many
 * steps) is already decided in the workflow, and the caller only supplies a brief.
 */

/** The model files a Qwen-Image graph names. Defaults match the local install. */
export interface ComfyModelFiles {
  unet?: string
  clip?: string
  vae?: string
}

export interface ComfyImageOptions extends ComfyModelFiles {
  /** ComfyUI base URL. */
  url?: string
  prompt: string
  /** Where the generated file must land. */
  outPath: string
  width?: number
  height?: number
  steps?: number
  cfg?: number
  seed?: number
  /** Local generation can take minutes on MPS; be patient before giving up. */
  timeoutMs?: number
  filenamePrefix?: string
}

export const DEFAULT_COMFY_URL = 'http://127.0.0.1:8188'

/**
 * The workflow graph, as ComfyUI's API expects it.
 *
 * Exported and pure so the links can be tested without a server: a wrong edge
 * fails at queue time with a type mismatch, which is how the VAE decode and a
 * missing node were caught here.
 */
export function buildQwenImageWorkflow(options: ComfyImageOptions): Record<string, unknown> {
  const width = options.width ?? 1328
  const height = options.height ?? 768
  return {
    '1': { class_type: 'UnetLoaderGGUF', inputs: { unet_name: options.unet ?? 'qwen-image-2.1-UC-Q4_K_M.gguf' } },
    // The text encoder must match the transformer generation: Qwen-Image 2.1
    // pairs with Qwen3-VL (4096-dim), not 1.0's Qwen2.5-VL (3584-dim).
    '2': {
      class_type: 'CLIPLoader',
      inputs: { clip_name: options.clip ?? 'qwen3vl_8b_bf16.safetensors', type: 'qwen_image', device: 'cpu' },
    },
    '3': { class_type: 'VAELoader', inputs: { vae_name: options.vae ?? 'qwen_image_2.1_vae_bf16.safetensors' } },
    '4': { class_type: 'CLIPTextEncode', inputs: { text: options.prompt, clip: ['2', 0] } },
    // 16-channel latents: EmptySD3LatentImage, not EmptyLatentImage.
    '5': { class_type: 'EmptySD3LatentImage', inputs: { width, height, batch_size: 1 } },
    '6': {
      class_type: 'KSampler',
      inputs: {
        model: ['1', 0],
        positive: ['4', 0],
        negative: ['4', 0],
        latent_image: ['5', 0],
        seed: options.seed ?? 4242,
        steps: options.steps ?? 20,
        // Qwen-Image is flow-matching: cfg 1.0 with the brief as its own
        // negative. Raising it invents artefacts rather than sharpening them.
        cfg: options.cfg ?? 1.0,
        sampler_name: 'euler',
        scheduler: 'simple',
        denoise: 1.0,
      },
    },
    // The sampler emits a LATENT; SaveImage needs pixels, so the VAE decode is a
    // node, not an option.
    '8': { class_type: 'VAEDecode', inputs: { samples: ['6', 0], vae: ['3', 0] } },
    // snake_case: the API takes snake_case input names, and a camelCase key is a
    // silently MISSING required input rather than an error.
    '7': { class_type: 'SaveImage', inputs: { images: ['8', 0], filename_prefix: options.filenamePrefix ?? 'harness/local' } },
  }
}

interface ComfyHistoryImage {
  filename?: string
  subfolder?: string
  type?: string
}

async function call<T>(url: string, path_: string, init?: RequestInit): Promise<T | undefined> {
  try {
    const response = await fetch(url + path_, init)
    if (!response.ok) return undefined
    return (await response.json()) as T
  } catch {
    return undefined
  }
}

/**
 * Queue one image and bring it back to disk.
 *
 * Returns undefined for every failure mode — no server, a rejected graph, a
 * failed run, no output — because the caller treats local generation as one
 * rung among several and must fall through to the next source rather than fail
 * the loop.
 */
export async function generateWithComfy(options: ComfyImageOptions): Promise<{ path: string; bytes: number } | undefined> {
  const url = (options.url ?? DEFAULT_COMFY_URL).replace(/\/$/, '')
  const graph = buildQwenImageWorkflow({ ...options, filenamePrefix: options.filenamePrefix ?? 'harness/local' })
  const body = { prompt: graph }
  const queued = await call<{ prompt_id?: string; error?: unknown }>(url, '/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const promptId = queued?.prompt_id
  if (!promptId) return undefined

  const deadline = Date.now() + (options.timeoutMs ?? 1_800_000)
  let image: ComfyHistoryImage | undefined
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 4000))
    const history = await call<Record<string, { outputs?: Record<string, { images?: ComfyHistoryImage[] }>; status?: { status_str?: string } }>>(url, `/history/${promptId}`)
    const entry = history?.[promptId]
    if (!entry) continue
    const status = entry.status?.status_str
    if (status === 'error') return undefined
    const images = Object.values(entry.outputs ?? {}).flatMap((output) => output.images ?? [])
    if (images.length > 0) {
      image = images[0]
      break
    }
  }
  if (!image?.filename) return undefined

  const query = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder ?? '',
    type: image.type ?? 'output',
  })
  const fetched = await fetch(`${url}/view?${query.toString()}`)
  if (!fetched.ok) return undefined
  const bytes = Buffer.from(await fetched.arrayBuffer())
  if (bytes.byteLength === 0) return undefined

  fs.mkdirSync(path.dirname(options.outPath), { recursive: true })
  fs.writeFileSync(options.outPath, bytes)
  return { path: options.outPath, bytes: bytes.byteLength }
}
