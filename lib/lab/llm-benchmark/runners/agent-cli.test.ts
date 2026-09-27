import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BenchmarkModel, BenchmarkTask } from '../types'
vi.mock('./cli', () => ({ generateFromCli: vi.fn() }))
import { generateFromCli } from './cli'
import { generateCodex } from './codex'
import { DEVIN_FILE_DELIVERY, generateDevin } from './devin'

const model: BenchmarkModel = {
  id: 'astra-xhigh', name: 'Astra', provider: 'Codex', apiModelId: 'gpt-6-astra',
  reasoningEffort: 'xhigh', costPer1kInputUsd: 0, costPer1kOutputUsd: 0,
  contextWindow: 1000000, capabilities: '',
}
const task = { id: 'lighthouse', prompt: 'Build the scene.' } as BenchmarkTask
const generate = vi.mocked(generateFromCli)
beforeEach(() => generate.mockReset())

describe('agent CLI model and artifact contracts', () => {
  it('pins Astra extra high even when the local Codex default differs', async () => {
    await generateCodex({ timeoutMs: 1234 }, model, task, 2)
    const config = generate.mock.calls[0][0]
    expect(config.buildArgs('prompt', model)).toContain('model="gpt-6-astra"')
    expect(config.buildArgs('prompt', model)).toContain('model_reasoning_effort="xhigh"')
    expect(config.timeoutMs).toBe(1234)
    expect(config.artifactName?.(2)).toBe('artifact-astra-xhigh-lighthouse-2.html')
  })

  it('runs the exact SWE-2 variant noninteractively and keeps prompt as one argument', async () => {
    const swe = { ...model, id: 'devin-swe-2-high', provider: 'Devin', apiModelId: 'swe-2-high' }
    await generateDevin({ timeoutMs: 5678 }, swe, task, 1)
    const config = generate.mock.calls[0][0]
    const prompt = 'quotes " and $() stay literal\nnext line'
    expect(config.command).toBe('devin')
    expect(config.buildArgs(prompt, swe)).toEqual([
      '--model', 'swe-2-high', '--sandbox', '--permission-mode', 'autonomous',
      '--respect-workspace-trust', 'false', '--print', prompt + DEVIN_FILE_DELIVERY,
    ])
    expect(config.artifactViaFile).toBe(true)
    expect(config.requireArtifactFile).toBe(true)
    expect(config.artifactName?.(1)).not.toBe(config.artifactName?.(2))
    expect(config.timeoutMs).toBe(5678)
    expect(generate.mock.calls[0].slice(1)).toEqual([swe, task, 1])
  })


  it('refuses an unspecified Devin model instead of silently using the account default', async () => {
    await expect(generateDevin({}, { ...model, apiModelId: undefined }, task)).rejects.toThrow('model id missing')
    expect(generate).not.toHaveBeenCalled()
  })
})
