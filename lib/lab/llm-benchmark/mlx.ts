import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

/**
 * Local image generation through MLX, on Apple Silicon.
 *
 * mflux is the only runtime found that speaks Qwen-Image 2.1 natively:
 * `mlx-imagegen` does not exist, and diffusers 0.41 (latest) still builds a
 * 1.0-shaped transformer, so neither can load this checkpoint. On an M5 Max it
 * also runs about five times faster than the same model through ComfyUI — 54s
 * for 20 steps, against ~2 minutes — because the weights stay in MLX memory.
 *
 * The call is a CLI rather than an API, so this is a spawn with an argument
 * list; every failure path returns undefined so the image chain can fall
 * through to its next source instead of failing the loop.
 */

export interface MlxOptions {
  /** mflux CLI entry point, e.g. `mflux-generate-qwen-2.1`. */
  command: string
  /** Local checkpoint directory in mflux's layout. */
  model: string
  prompt: string
  outPath: string
  width?: number
  height?: number
  steps?: number
  seed?: number
  /**
   * Images per weight load. Measured on the M5 Max: three images at the
   * 8-step / 1024x576 operating point take 59s against 75s run one at a time
   * (~1.27x per image), because the 4-bit weights stay resident across the
   * batch. It is a throughput win, not a per-image one.
   */
  count?: number
  timeoutMs?: number
  /** Extra environment for the spawn (the venv's PATH, for instance). */
  env?: NodeJS.ProcessEnv
}

/**
 * The argument list, exported so the flags are testable without a 54-second run.
 *
 * The subcommand is the model-specific one: `mflux-generate-qwen-2.1`. The
 * generic `mflux-generate` reaches the Flux path and then demands a second text
 * encoder that a text-to-image checkpoint does not have.
 */
export function buildMlxArgs(options: MlxOptions): string[] {
  const args = [
    '--model',
    options.model,
    '--prompt',
    options.prompt,
    '--output',
    options.outPath,
  ]
  if (options.width) args.push('--width', String(options.width))
  if (options.height) args.push('--height', String(options.height))
  if (options.steps) args.push('--steps', String(options.steps))
  if (options.seed !== undefined) args.push('--seed', String(options.seed))
  // NOTE: with --auto-seeds, mflux ignores --output and saves into the working
  // directory as image_seed_*.png, so the adapter resolves the files from the
  // saved-path line rather than from the requested path.
  if (options.count && options.count > 1) args.push('--auto-seeds', String(options.count))
  return args
}

/** Generate one image locally. Undefined for every failure mode. */
export function generateWithMlx(options: MlxOptions): Promise<{ path: string; bytes: number } | undefined> {
  return new Promise((resolve) => {
    const args = buildMlxArgs(options)
    let settled = false
    const finish = (value: { path: string; bytes: number } | undefined): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }

    let child
    try {
      child = spawn(options.command, args, { env: { ...process.env, ...options.env } })
    } catch {
      resolve(undefined)
      return
    }

    const timer = setTimeout(() => {
      child.kill()
      finish(undefined)
    }, options.timeoutMs ?? 900_000)

    let stderr = ''
    child.stderr?.on('data', (chunk) => (stderr += String(chunk)))
    child.on('error', () => finish(undefined))
    child.on('close', (code) => {
      if (code !== 0) {
        finish(undefined)
        return
      }
      // mflux confirms the file itself: "Image saved successfully at: <path>".
      // Trusting that over the requested path matters because a run that saves
      // nothing still exits 0.
      // Every "Image saved successfully at:" line, so a batch is not silently
      // reported as one image.
      const saved = [...stderr.matchAll(/Image saved successfully at: (.+)/g)].map((m) => m[1]!.trim())
      const candidates = saved.filter((p) => fs.existsSync(p))
      if (candidates.length === 0) {
        finish(undefined)
        return
      }
      const primary = candidates[0]!
      const bytes = fs.statSync(primary).size
      if (bytes === 0) {
        finish(undefined)
        return
      }
      const dir = options.outPath.split('/').slice(0, -1).join('/')
      if (dir) fs.mkdirSync(dir, { recursive: true })
      if (primary !== options.outPath) fs.copyFileSync(primary, options.outPath)
      // The rest of a batch, copied next to the primary so a caller asking for
      // three images gets three files rather than one plus two lost somewhere.
      candidates.slice(1).forEach((p, i) => {
        const stem = options.outPath.replace(/\.[a-z0-9]+$/i, '')
        fs.copyFileSync(p, `${stem}-${String(i + 2)}${path.extname(p) || '.png'}`)
      })
      finish({ path: options.outPath, bytes })
    })
  })
}
