import { describe, it, expect } from 'vitest'
import { withSandboxConstraints, appliedSandboxConstraints, SANDBOX_CONSTRAINTS } from './prompts'
import { hashPrompt } from './runlog'
import type { BenchmarkTask } from './types'

function makeTask(overrides: Partial<BenchmarkTask> = {}): BenchmarkTask {
  return {
    id: 'demo-task',
    category: '3d-physics-animation',
    title: 'Demo Task',
    blurb: 'demo',
    prompt: 'Base prompt.',
    runtimeHint: '',
    iterationsDefault: 5,
    methodNotes: '',
    demoComponentName: 'NBodyFieldDemo',
    slug: 'demo-task',
    ...overrides,
  }
}

describe('withSandboxConstraints', () => {
  it('returns the original task unchanged for text-output categories', () => {
    const task = makeTask({ category: 'advanced-mathematics', prompt: 'Just solve x.' })
    const out = withSandboxConstraints(task)
    expect(out.prompt).toBe('Just solve x.')
    expect(out).toBe(task)
  })

  it('returns the original task unchanged for security-tasks (text)', () => {
    const task = makeTask({ category: 'security-tasks', prompt: 'Write a Python module.' })
    const out = withSandboxConstraints(task)
    expect(out.prompt).toBe('Write a Python module.')
    expect(out).toBe(task)
  })

  it('appends the sandbox contract for every HTML-runnable category', () => {
    const categories = [
      '3d-physics-animation',
      'advanced-game-building',
      'advanced-physics',
      'advanced-electronics',
      'ui-building',
    ] as const
    for (const category of categories) {
      const task = makeTask({ category, prompt: 'X' })
      const out = withSandboxConstraints(task)
      expect(out.prompt, `category=${category} should append constraints`).toBe('X' + SANDBOX_CONSTRAINTS)
    }
  })

  it('preserves every other field of the task', () => {
    const task = makeTask({ prompt: 'Build it.' })
    const out = withSandboxConstraints(task)
    expect(out.id).toBe(task.id)
    expect(out.title).toBe(task.title)
    expect(out.category).toBe(task.category)
    expect(out.iterationsDefault).toBe(task.iterationsDefault)
    expect(out.demoComponentName).toBe(task.demoComponentName)
  })

  it('requires <!DOCTYPE html> and a full <html>/<head>/<body> skeleton in the appended contract', () => {
    const task = makeTask({ prompt: 'Build it.' })
    const out = withSandboxConstraints(task)
    // Document structure rules — the most impactful guidance for dumber models
    // whose artifacts previously rendered in quirks mode with wrong canvas sizing.
    expect(out.prompt).toMatch(/<!DOCTYPE html>/)
    expect(out.prompt).toMatch(/<html>/)
    expect(out.prompt).toMatch(/<head>/)
    expect(out.prompt).toMatch(/<body>/)
  })

  it('instructs CSS-sized canvas + a window resize listener', () => {
    const task = makeTask({ prompt: 'Build it.' })
    const out = withSandboxConstraints(task)
    expect(out.prompt).toMatch(/width:\s*100%/)
    expect(out.prompt).toMatch(/resize/i)
  })

  it('instructs try/catch around the top-level script and visible error rendering', () => {
    const task = makeTask({ prompt: 'Build it.' })
    const out = withSandboxConstraints(task)
    expect(out.prompt).toMatch(/try\s*\/\s*catch/i)
    expect(out.prompt).toMatch(/role=["']alert["']/)
  })

  it('still prohibits alert/confirm/prompt (feedback must render into the page)', () => {
    const task = makeTask({ prompt: 'Build it.' })
    const out = withSandboxConstraints(task)
    expect(out.prompt).toMatch(/No alert\/confirm\/prompt/)
  })
})

describe('per-task sandboxConstraints override', () => {
  const CUSTOM = 'BOARD — render nine clickable cells.'

  it('undefined + HTML category → the global contract is appended (heuristic)', () => {
    const task = makeTask({ category: 'ui-building', prompt: 'X' })
    expect(withSandboxConstraints(task).prompt).toBe('X' + SANDBOX_CONSTRAINTS)
  })

  it('undefined + text category → untouched', () => {
    const task = makeTask({ category: 'advanced-mathematics', prompt: 'Solve x.' })
    expect(withSandboxConstraints(task)).toBe(task)
  })

  it('empty string + HTML category → NO contract, overriding the heuristic', () => {
    const task = makeTask({ category: 'ui-building', prompt: 'X', sandboxConstraints: '' })
    const out = withSandboxConstraints(task)
    expect(out.prompt).toBe('X')
    expect(appliedSandboxConstraints(task)).toBe('')
  })

  it('custom text + text category → appended despite the category (explicit beats heuristic)', () => {
    const task = makeTask({
      category: 'advanced-mathematics',
      prompt: 'Solve x.',
      sandboxConstraints: CUSTOM,
    })
    const out = withSandboxConstraints(task)
    expect(out.prompt).toBe(`Solve x.\n\n${CUSTOM}`)
    expect(out.prompt).not.toContain('EXECUTION ENVIRONMENT')
  })

  it('custom text + HTML category → the custom contract replaces the global one', () => {
    const task = makeTask({
      category: 'advanced-game-building',
      prompt: 'Build it.',
      sandboxConstraints: CUSTOM,
    })
    const out = withSandboxConstraints(task)
    expect(out.prompt).toBe(`Build it.\n\n${CUSTOM}`)
    expect(out.prompt).not.toContain('EXECUTION ENVIRONMENT')
  })

  it('separates a custom contract from the prompt with a blank line, like the global one', () => {
    const task = makeTask({ prompt: 'Build it.', sandboxConstraints: CUSTOM })
    expect(withSandboxConstraints(task).prompt).toMatch(/Build it\.\n\nBOARD/)
    expect(SANDBOX_CONSTRAINTS.startsWith('\n\n')).toBe(true)
  })

  it('preserves every other field and never mutates the original task', () => {
    const task = makeTask({ prompt: 'Build it.', sandboxConstraints: CUSTOM, checks: ['a'] })
    const snapshot = JSON.parse(JSON.stringify(task))
    const out = withSandboxConstraints(task)
    expect(task).toEqual(snapshot)
    expect({ ...out, prompt: task.prompt }).toEqual(task)
  })

  it('appliedSandboxConstraints reports the exact text the amended prompt gained', () => {
    const cases: BenchmarkTask[] = [
      makeTask({ category: 'ui-building', prompt: 'X' }),
      makeTask({ category: 'advanced-mathematics', prompt: 'X' }),
      makeTask({ category: 'ui-building', prompt: 'X', sandboxConstraints: '' }),
      makeTask({ category: 'ui-building', prompt: 'X', sandboxConstraints: CUSTOM }),
    ]
    for (const task of cases) {
      expect(withSandboxConstraints(task).prompt).toBe(task.prompt + appliedSandboxConstraints(task))
    }
  })

  it('changes the amended prompt — and therefore the cache key — when the override changes', () => {
    const base = makeTask({ prompt: 'Build it.' })
    const a = withSandboxConstraints({ ...base, sandboxConstraints: 'CONTRACT A' })
    const b = withSandboxConstraints({ ...base, sandboxConstraints: 'CONTRACT B' })
    const inherited = withSandboxConstraints(base)
    expect(a.prompt).not.toBe(b.prompt)
    expect(a.prompt).not.toBe(inherited.prompt)
    // promptHash (runlog) and the cache key (cache.ts) are both derived from
    // the amended prompt, so an override edit re-runs rather than replaying.
    expect(hashPrompt(a.prompt)).not.toBe(hashPrompt(b.prompt))
    expect(hashPrompt(a.prompt)).not.toBe(hashPrompt(inherited.prompt))
  })
})
