import { describe, it, expect } from 'vitest'
import { mkdtemp, rm, writeFile, chmod, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, delimiter, isAbsolute } from 'node:path'
import {
  CLI_COMMANDS,
  CLI_PROVIDERS,
  DEFAULT_CLI_TIMEOUT_MS,
  installHint,
  missingCliCommands,
  resolveCliCommands,
  resolveCommand,
  resolveExecutionTarget,
} from './execution-target'
import { isCliProvider } from './provider'
import type { CliRunnerConfig } from './cli'

const TEST_MODEL = {
  id: 'test-model',
  name: 'Test',
  provider: 'Test',
  costPer1kInputUsd: 0,
  costPer1kOutputUsd: 0,
  contextWindow: 1000,
  capabilities: '',
}

const TEST_TASK = {
  id: 'test-task',
  category: 'ui-building' as const,
  title: 'T',
  blurb: '',
  prompt: 'build it',
  runtimeHint: '',
  iterationsDefault: 1,
  methodNotes: '',
  demoComponentName: 'D',
  slug: 't',
}

function baseConfig(overrides: Partial<CliRunnerConfig> = {}): CliRunnerConfig {
  return {
    command: 'fake-cli',
    buildArgs: (prompt) => ['run', prompt],
    ...overrides,
  }
}

describe('resolveCommand', () => {
  it('finds a binary that is on PATH', async () => {
    // `node` is by definition present: it is running this test.
    const found = await resolveCommand('node')
    expect('missing' in found).toBe(false)
    if ('missing' in found) return
    expect(isAbsolute(found.path)).toBe(true)
    expect(found.path.endsWith('node')).toBe(true)
  })

  it('reports a missing binary with an install hint', async () => {
    const result = await resolveCommand('definitely-not-a-real-cmd-xyz')
    expect(result).toMatchObject({ missing: true })
    if (!('missing' in result)) return
    expect(result.hint.length).toBeGreaterThan(0)
  })

  it('names the provider install route for a known CLI command', async () => {
    const result = await resolveCommand('opencode', { PATH: '' })
    expect(result).toMatchObject({ missing: true })
    if (!('missing' in result)) return
    expect(result.hint).toBe(installHint('opencode'))
    expect(result.hint).toMatch(/opencode/i)
  })

  it('does not mistake a DIRECTORY on PATH for the executable', async () => {
    // access(X_OK) succeeds on directories — the stat/isFile check is what
    // stops `<dir>/opencode/` (e.g. a checkout) from resolving as the binary.
    const dir = await mkdtemp(join(tmpdir(), 'exec-target-'))
    try {
      await mkdir(join(dir, 'opencode'))
      const result = await resolveCommand('opencode', { PATH: dir })
      expect(result).toMatchObject({ missing: true })
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('finds an executable file on a supplied PATH, and skips a non-executable one', async () => {
    const first = await mkdtemp(join(tmpdir(), 'exec-target-a-'))
    const second = await mkdtemp(join(tmpdir(), 'exec-target-b-'))
    try {
      await writeFile(join(first, 'agy'), '#!/bin/sh\n')
      await chmod(join(first, 'agy'), 0o644) // present but not executable
      await writeFile(join(second, 'agy'), '#!/bin/sh\n')
      await chmod(join(second, 'agy'), 0o755)
      const result = await resolveCommand('agy', { PATH: [first, second].join(delimiter) })
      expect(result).toEqual({ path: join(second, 'agy') })
    } finally {
      await rm(first, { recursive: true, force: true })
      await rm(second, { recursive: true, force: true })
    }
  })

  it('resolves a path-bearing command directly rather than scanning PATH', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'exec-target-'))
    try {
      const bin = join(dir, 'local-cli')
      await writeFile(bin, '#!/bin/sh\n')
      await chmod(bin, 0o755)
      expect(await resolveCommand(bin, { PATH: '' })).toEqual({ path: bin })
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('CLI_COMMANDS', () => {
  it('covers exactly the providers isCliProvider knows about', () => {
    // The two sets MUST NOT drift: a provider that classifies as CLI but has
    // no command has no pre-flight, and a command with no provider is dead.
    for (const provider of Object.keys(CLI_COMMANDS)) {
      expect(isCliProvider({ ...TEST_MODEL, provider })).toBe(true)
    }
    expect([...CLI_PROVIDERS].sort()).toEqual(Object.keys(CLI_COMMANDS).sort())
    expect(isCliProvider({ ...TEST_MODEL, provider: 'OpenRouter' })).toBe(false)
  })

  it('has an install hint for every known command', () => {
    for (const command of Object.values(CLI_COMMANDS)) {
      expect(installHint(command)).toMatch(new RegExp(command))
    }
  })
})

describe('resolveExecutionTarget', () => {
  it('labels the target with model, task and iteration', () => {
    const target = resolveExecutionTarget(baseConfig(), TEST_MODEL, TEST_TASK, 2)
    expect(target.label).toBe('test-model-test-task-2')
  })

  it('defaults the timeout to 10 minutes and honours an explicit one', () => {
    expect(resolveExecutionTarget(baseConfig(), TEST_MODEL, TEST_TASK, 0).timeoutMs).toBe(
      DEFAULT_CLI_TIMEOUT_MS
    )
    expect(DEFAULT_CLI_TIMEOUT_MS).toBe(10 * 60 * 1000)
    expect(
      resolveExecutionTarget(baseConfig({ timeoutMs: 1234 }), TEST_MODEL, TEST_TASK, 0).timeoutMs
    ).toBe(1234)
  })

  it('appends the INLINE suffix and requests no scratch when artifactViaFile is off', () => {
    const target = resolveExecutionTarget(baseConfig(), TEST_MODEL, TEST_TASK, 0)
    expect(target.artifactViaFile).toBe(false)
    expect(target.needsEphemeralScratch).toBe(false)
    expect(target.scratchDir).toBeUndefined()
    expect(target.promptSuffix).toMatch(/Do not create any files/)
    expect(target.args).toEqual(['run', TEST_TASK.prompt + target.promptSuffix])
  })

  it('appends the FILE suffix naming the per-iteration artifact when artifactViaFile is on', () => {
    const target = resolveExecutionTarget(
      baseConfig({ artifactViaFile: true, artifactName: (i) => `artifact-${i}.html` }),
      TEST_MODEL,
      TEST_TASK,
      3
    )
    expect(target.artifactName).toBe('artifact-3.html')
    expect(target.promptSuffix).toContain('./artifact-3.html')
    expect(target.needsEphemeralScratch).toBe(true)
  })

  it('falls back to the constant artifact filename when the config names none', () => {
    const target = resolveExecutionTarget(baseConfig({ artifactViaFile: true }), TEST_MODEL, TEST_TASK, 0)
    expect(target.artifactName).toBe('artifact.html')
  })

  it('places the scratch dir under the sweep root, keyed by the label', () => {
    const target = resolveExecutionTarget(
      baseConfig({ artifactViaFile: true }),
      TEST_MODEL,
      TEST_TASK,
      1,
      { sweepRoot: '/sweeps/run-1' }
    )
    expect(target.scratchDir).toBe(join('/sweeps/run-1', 'scratch', 'test-model-test-task-1'))
    expect(target.cwd).toBe(target.scratchDir)
    expect(target.needsEphemeralScratch).toBe(false)
  })

  it('keeps the config cwd and env when there is no scratch dir', () => {
    const target = resolveExecutionTarget(
      baseConfig({ cwd: '/work', env: { FOO: 'bar' } }),
      TEST_MODEL,
      TEST_TASK,
      0
    )
    expect(target.cwd).toBe('/work')
    expect(target.env).toEqual({ FOO: 'bar' })
  })
})

describe('resolveCliCommands / missingCliCommands', () => {
  const models = [
    { id: 'deepseek-v4-flash-free', provider: 'OpenCode' },
    { id: 'another-opencode', provider: 'OpenCode' },
    { id: 'gemini-3.6-flash-agy', provider: 'Agy' },
    { id: 'kimi-k2.7', provider: 'Moonshot AI' },
  ]
  const fakeResolver = async (command: string) =>
    command === 'agy' ? { path: '/bin/agy' } : { missing: true as const, hint: `install ${command}` }

  it('resolves one entry per distinct CLI command, ignoring API providers', async () => {
    const rows = await resolveCliCommands(models, fakeResolver)
    expect(rows.map((r) => r.command)).toEqual(['opencode', 'agy'])
    expect(rows[0].modelIds).toEqual(['deepseek-v4-flash-free', 'another-opencode'])
    expect(rows[1].resolution).toEqual({ path: '/bin/agy' })
  })

  it('reports every missing command at once, with the models that need it', async () => {
    const missing = await missingCliCommands(models, async (command) => ({
      missing: true as const,
      hint: `install ${command}`,
    }))
    expect(missing).toEqual([
      {
        command: 'opencode',
        hint: 'install opencode',
        modelIds: ['deepseek-v4-flash-free', 'another-opencode'],
      },
      { command: 'agy', hint: 'install agy', modelIds: ['gemini-3.6-flash-agy'] },
    ])
  })

  it('is empty when every targeted CLI resolves', async () => {
    expect(await missingCliCommands(models, fakeResolver)).toEqual([
      {
        command: 'opencode',
        hint: 'install opencode',
        modelIds: ['deepseek-v4-flash-free', 'another-opencode'],
      },
    ])
    expect(await missingCliCommands([models[2]], fakeResolver)).toEqual([])
  })

  it('is empty when no CLI provider is targeted', async () => {
    expect(await missingCliCommands([models[3]], fakeResolver)).toEqual([])
  })
})
