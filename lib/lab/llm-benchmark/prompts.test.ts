import { describe, it, expect } from 'vitest'
import { withSandboxConstraints, SANDBOX_CONSTRAINTS } from './prompts'
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
