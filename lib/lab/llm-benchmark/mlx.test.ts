import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildMlxArgs, generateWithMlx } from './mlx.js'

/**
 * The mflux CLI is 54 seconds per image, so the argument list is the part worth
 * testing directly; the failure paths use a real stub executable on PATH rather
 * than a mocked spawn, because an ESM namespace cannot be spied and a stub
 * proves the exit code and stderr are actually read.
 */
describe('buildMlxArgs', () => {
  it('uses the model-specific subcommand, via the caller-supplied command', () => {
    const args = buildMlxArgs({
      command: 'mflux-generate-qwen-2.1',
      model: '/models/qwen',
      prompt: 'a calm field',
      outPath: '/tmp/a.png',
    })
    expect(args.slice(0, 2)).toEqual(['--model', '/models/qwen'])
    expect(args).toContain('--prompt')
    expect(args).toContain('/tmp/a.png')
  })

  it('passes geometry, steps and seed only when asked', () => {
    const full = buildMlxArgs({
      command: 'mflux-generate-qwen-2.1',
      model: '/m',
      prompt: 'p',
      outPath: '/tmp/a.png',
      width: 1328,
      height: 768,
      steps: 20,
      seed: 0,
    })
    expect(full).toContain('--width')
    expect(full).toContain('1328')
    expect(full).toContain('--steps')
    // seed 0 is a real seed, not "unset".
    expect(full[full.indexOf('--seed') + 1]).toBe('0')

    const bare = buildMlxArgs({ command: 'mflux-generate-qwen-2.1', model: '/m', prompt: 'p', outPath: '/tmp/a.png' })
    expect(bare).not.toContain('--width')
    expect(bare).not.toContain('--seed')
  })
})

describe('generateWithMlx', () => {
  const base = { model: '/m', prompt: 'p' }

  function stubScript(dir: string, name: string, body: string): string {
    const file = path.join(dir, name)
    fs.writeFileSync(file, body)
    fs.chmodSync(file, 0o755)
    return file
  }

  it('returns undefined when the command does not exist', async () => {
    await expect(
      generateWithMlx({ ...base, command: '/nonexistent/mflux-generate-qwen-2.1', outPath: '/tmp/never.png' })
    ).resolves.toBeUndefined()
  })

  it('returns undefined on a non-zero exit, ignoring a half-written file', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mlx-exit-'))
    const out = path.join(dir, 'a.png')
    fs.writeFileSync(out, 'partial')
    const command = stubScript(dir, 'failing', '#!/bin/sh\nprintf "boom\\n" >&2\nexit 1\n')
    await expect(generateWithMlx({ ...base, command, outPath: out })).resolves.toBeUndefined()
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('returns undefined when the run exits 0 but saved nothing', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mlx-empty-'))
    const out = path.join(dir, 'a.png')
    const command = stubScript(dir, 'silent', '#!/bin/sh\nprintf "done, no image\\n" >&2\nexit 0\n')
    await expect(generateWithMlx({ ...base, command, outPath: out })).resolves.toBeUndefined()
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('accepts the file mflux reports saving, even when it is not the requested path', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mlx-ok-'))
    const elsewhere = path.join(dir, 'mflux-1.png')
    fs.writeFileSync(elsewhere, 'PNG')
    const out = path.join(dir, 'wanted.png')
    const command = stubScript(
      dir,
      'ok',
      `#!/bin/sh\nprintf 'Image saved successfully at: ${elsewhere}\\n' >&2\nexit 0\n`
    )
    const result = await generateWithMlx({ ...base, command, outPath: out })
    expect(result?.bytes).toBe(3)
    expect(fs.existsSync(out)).toBe(true)
    fs.rmSync(dir, { recursive: true, force: true })
  })
})
