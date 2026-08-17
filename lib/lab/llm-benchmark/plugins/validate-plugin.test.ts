import { describe, it, expect } from 'vitest'
import {
  validatePlugin,
  pickPluginExport,
  formatReport,
  type ValidationRule,
} from './validate-plugin'
import { PLUGIN_RULES, registerPlugin, unregisterPlugin, derivedCapabilities, type BenchmarkPlugin } from './registry'
import { communityTasks } from './community-tasks'
import { echoProvider } from './echo-provider'
import type { BenchmarkModel, BenchmarkTask, PluginGenerate } from '../types'

// NOTE: this file imports `./registry` directly and NEVER `./index`, so the
// roster is not loaded and `getPlugins()` is empty here. Every collision rule
// below therefore has to be given its `existing` set explicitly — which is the
// honest way to test them anyway.

const task: BenchmarkTask = {
  id: 'fixture-task',
  category: 'advanced-game-building',
  title: 'Fixture Task',
  blurb: '',
  prompt: 'do the thing',
  runtimeHint: '',
  iterationsDefault: 1,
  methodNotes: '',
  demoComponentName: 'FixtureDemo',
  slug: 'fixture-task',
  scorer: 'behavioral',
  checks: ['fixture-check'],
}

const model: BenchmarkModel = {
  id: 'fixture-model',
  name: 'Fixture Model',
  provider: 'OpenRouter',
  costPer1kInputUsd: 0,
  costPer1kOutputUsd: 0,
  contextWindow: 1000,
  capabilities: '',
}

const generate: PluginGenerate = async () => ({ output: 'x', tokensIn: 1, tokensOut: 1, runtimeMs: 1 })

/** A plugin with nothing wrong with it — every fixture below is this, spoiled. */
function clean(overrides: Partial<BenchmarkPlugin> = {}): BenchmarkPlugin {
  return {
    id: 'fixture-plugin',
    name: 'Fixture Plugin',
    version: '1.0.0',
    description: 'A fixture.',
    tasks: [task],
    checks: { 'fixture-check': async () => ({ name: 'fixture-check', passed: true, points: 1, maxPoints: 1 }) },
    demos: { FixtureDemo: () => null },
    ...overrides,
  }
}

describe('validatePlugin: a clean plugin', () => {
  it('reports ok with the derived capabilities and no errors', () => {
    const report = validatePlugin(clean(), { existing: [] })
    expect(report.ok).toBe(true)
    expect(report.errors).toEqual([])
    expect(report.capabilities).toEqual(['tasks', 'checks', 'demos'])
    expect(report.declaredCapabilities).toBeUndefined()
    expect(report.counts).toMatchObject({ tasks: 1, checks: 1, demos: 1, scorers: 0, models: 0 })
  })

  it('validates the two shipped worked examples', () => {
    // The examples must model the practice they document, capabilities and all.
    for (const plugin of [communityTasks, echoProvider]) {
      const report = validatePlugin(plugin, { existing: [] })
      expect(report.errors, plugin.id).toEqual([])
      expect(report.warnings, plugin.id).toEqual([])
      expect(report.declaredCapabilities, plugin.id).toEqual(derivedCapabilities(plugin))
    }
  })
})

describe('validatePlugin: collects ALL problems, register throws only the first', () => {
  it('reports three rules at once from a plugin violating three', () => {
    const broken = clean({
      description: undefined, // manifest-description-missing
      tasks: [task, { ...task }], // duplicate-task-id
      models: [{ ...model, provider: 'NoSuchProvider' }], // model-provider-unrunnable
    })
    const report = validatePlugin(broken, { existing: [] })
    expect(report.ok).toBe(false)
    expect(report.errors.map((e) => e.rule).sort()).toEqual([
      'duplicate-task-id',
      'manifest-description-missing',
      'model-provider-unrunnable',
    ])

    // Registration sees only the first REGISTRATION-tier one and stops there.
    expect(() => registerPlugin(broken)).toThrow(/declares task 'fixture-task' twice/)
    unregisterPlugin('fixture-plugin')
  })

  it('reports a duplicate id pair once, not once per member', () => {
    const report = validatePlugin(clean({ tasks: [task, { ...task }] }), { existing: [] })
    expect(report.errors.filter((e) => e.rule === 'duplicate-task-id')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Rule parity — the anti-drift test.
//
// One fixture per registration rule, each violating exactly that rule. For
// every one: registerPlugin THROWS, validatePlugin REPORTS, and the message is
// identical. A rule that ever gets special-cased into only one of the two
// paths fails here.
// ---------------------------------------------------------------------------

const OWNER: BenchmarkPlugin = {
  id: 'owner-plugin',
  name: 'Owner',
  version: '1.0.0',
  description: 'Owns a generator and a model.',
  generators: { OwnedProvider: async () => generate },
  models: [{ ...model, id: 'owned-model', provider: 'OwnedProvider' }],
}

interface ParityCase {
  rule: ValidationRule
  plugin: BenchmarkPlugin
  existing: BenchmarkPlugin[]
}

const PARITY_CASES: ParityCase[] = [
  { rule: 'identity-required', plugin: clean({ version: '' }), existing: [] },
  { rule: 'duplicate-plugin-id', plugin: clean(), existing: [clean()] },
  {
    rule: 'unknown-capability',
    plugin: clean({ capabilities: ['tasks', 'checks', 'demos', 'runners' as 'tasks'] }),
    existing: [],
  },
  {
    rule: 'undeclared-capability',
    plugin: clean({ capabilities: ['tasks', 'checks'] }), // ships demos too
    existing: [],
  },
  { rule: 'task-sets-plugin-id', plugin: clean({ tasks: [{ ...task, pluginId: 'someone-else' }] }), existing: [] },
  { rule: 'duplicate-task-id', plugin: clean({ tasks: [task, { ...task }] }), existing: [] },
  {
    rule: 'generator-shadows-builtin',
    plugin: clean({ capabilities: undefined, generators: { OpenAI: async () => generate } }),
    existing: [],
  },
  {
    rule: 'generator-already-provided',
    plugin: clean({ generators: { OwnedProvider: async () => generate } }),
    existing: [OWNER],
  },
  { rule: 'model-sets-plugin-id', plugin: clean({ models: [{ ...model, pluginId: 'x' }] }), existing: [] },
  { rule: 'duplicate-model-id', plugin: clean({ models: [model, { ...model }] }), existing: [] },
  { rule: 'model-id-taken', plugin: clean({ models: [{ ...model, id: 'owned-model' }] }), existing: [OWNER] },
  {
    rule: 'model-provider-unrunnable',
    plugin: clean({ models: [{ ...model, provider: 'NoSuchProvider' }] }),
    existing: [],
  },
]

describe('rule parity: registerPlugin and validatePlugin never drift', () => {
  it.each(PARITY_CASES)('$rule fires on both paths with the same message', ({ rule, plugin, existing }) => {
    const report = validatePlugin(plugin, { existing })
    const reported = report.errors.find((e) => e.rule === rule)
    expect(reported, `validate did not report ${rule}`).toBeDefined()

    // Register mode: seed `existing` through the real registry, then register.
    for (const p of existing) registerPlugin(p)
    try {
      expect(() => registerPlugin(plugin), `register did not throw for ${rule}`).toThrow(reported!.message)
    } finally {
      for (const p of existing) unregisterPlugin(p.id)
      unregisterPlugin(plugin.id)
    }
  })

  it('covers every registration rule the registry can emit', () => {
    // A new rule in registry.ts with no fixture here is exactly the drift this
    // suite exists to prevent, so the coverage itself is asserted.
    const covered = new Set(PARITY_CASES.map((c) => c.rule))
    for (const rule of PLUGIN_RULES) {
      // `denied-capability` is the one rule with no validate-side fixture: the
      // deny list is a property of the CALL SITE, not of the plugin, so it is
      // exercised in registry.test.ts instead.
      if (rule === 'denied-capability') continue
      expect(covered.has(rule as ValidationRule), `no parity fixture for rule '${rule}'`).toBe(true)
    }
  })
})

describe('manifest rules (validate-only, stricter than the loader)', () => {
  it('rejects a non-kebab-case id', () => {
    const report = validatePlugin(clean({ id: 'Fixture_Plugin' }), { existing: [] })
    expect(report.errors.map((e) => e.rule)).toContain('manifest-id-kebab-case')
    // …but registration still accepts it: a review gate may be stricter than
    // the loader, and failing load on a cosmetic id would break working plugins.
    expect(() => registerPlugin(clean({ id: 'Fixture_Plugin' }))).not.toThrow()
    unregisterPlugin('Fixture_Plugin')
  })

  it('rejects a non-semver-ish version', () => {
    for (const version of ['v1', '1', '1.0', 'latest']) {
      expect(validatePlugin(clean({ version }), { existing: [] }).errors.map((e) => e.rule), version).toContain(
        'manifest-version-shape'
      )
    }
    for (const version of ['1.0.0', '0.1.0', '2.3.4-beta.1', '1.0.0+build7']) {
      expect(validatePlugin(clean({ version }), { existing: [] }).errors.map((e) => e.rule), version).not.toContain(
        'manifest-version-shape'
      )
    }
  })

  it('requires a description and a sane display name', () => {
    expect(validatePlugin(clean({ description: '  ' }), { existing: [] }).errors.map((e) => e.rule)).toContain(
      'manifest-description-missing'
    )
    expect(validatePlugin(clean({ name: 'Say "hi"' }), { existing: [] }).errors.map((e) => e.rule)).toContain(
      'manifest-name-shape'
    )
  })

  it('reports a malformed contribution field instead of crashing on it', () => {
    // The interesting caller just imported a stranger's module; `tasks: 'nope'`
    // would make the rule stream throw a TypeError mid-iteration.
    const report = validatePlugin({ ...clean(), tasks: 'nope' as unknown as BenchmarkTask[] }, { existing: [] })
    expect(report.ok).toBe(false)
    expect(report.errors.map((e) => e.rule)).toContain('manifest-field-shape')
  })

  it('rejects a candidate that is not a plugin object at all', () => {
    for (const value of [undefined, null, 42, 'plugin', []]) {
      const report = validatePlugin(value, { existing: [] })
      expect(report.ok).toBe(false)
      expect(report.errors[0]!.rule).toBe('not-a-plugin')
      expect(report.capabilities).toEqual([])
    }
  })
})

describe('capabilities', () => {
  it('derives them from the contributions when undeclared', () => {
    const report = validatePlugin(clean({ models: [model], generators: { P: async () => generate } }), {
      existing: [],
    })
    expect(report.capabilities).toEqual(['tasks', 'checks', 'demos', 'generators', 'models'])
    expect(report.declaredCapabilities).toBeUndefined()
  })

  it('warns (but does not fail) on over-declaration', () => {
    const report = validatePlugin(clean({ capabilities: ['tasks', 'checks', 'demos', 'scorers'] }), { existing: [] })
    expect(report.ok).toBe(true)
    expect(report.warnings.map((w) => w.rule)).toEqual(['overdeclared-capability'])
    expect(report.warnings[0]!.message).toMatch(/declares capability 'scorers' but contributes none/)
  })

  it('errors on under-declaration — the lie that matters', () => {
    const report = validatePlugin(clean({ capabilities: ['tasks', 'checks'] }), { existing: [] })
    expect(report.ok).toBe(false)
    expect(report.errors.map((e) => e.rule)).toEqual(['undeclared-capability'])
    expect(report.errors[0]!.message).toMatch(/contributes 'demos' but does not declare it/)
  })

  it('warns when a task names a demo or check the plugin does not ship', () => {
    const report = validatePlugin(clean({ demos: {}, checks: {} }), { existing: [] })
    expect(report.warnings.map((w) => w.rule).sort()).toEqual(['task-check-not-in-plugin', 'task-demo-not-in-plugin'])
    expect(report.ok).toBe(true) // built-ins may legitimately supply them
  })
})

describe('pickPluginExport', () => {
  it('finds the single plugin-shaped export', () => {
    const picked = pickPluginExport({ communityTasks, SOME_CONSTANT: 'text', helper: () => null })
    expect(picked).toMatchObject({ exportName: 'communityTasks', plugin: communityTasks })
  })

  it('prefers a default export over a named one', () => {
    const picked = pickPluginExport({ other: clean(), default: communityTasks })
    expect(picked).toMatchObject({ exportName: 'default', plugin: communityTasks })
  })

  it('refuses to guess between two plausible exports', () => {
    const picked = pickPluginExport({ a: clean({ id: 'a' }), b: clean({ id: 'b' }) })
    expect(picked).toHaveProperty('error')
    expect((picked as { error: string }).error).toMatch(/ambiguous/)
  })

  it('reports a module with no plugin export', () => {
    const picked = pickPluginExport({ helper: () => null, VERSION: '1' })
    expect((picked as { error: string }).error).toMatch(/no BenchmarkPlugin-shaped export/)
  })
})

describe('formatReport', () => {
  it('prints every capability row, declared beside contributed', () => {
    const text = formatReport(
      validatePlugin(clean({ capabilities: ['tasks', 'checks', 'demos'] }), { existing: [] }),
      'roster'
    ).join('\n')
    for (const capability of ['tasks', 'checks', 'scorers', 'demos', 'taskCards', 'generators', 'models']) {
      expect(text, capability).toContain(capability)
    }
    expect(text).toContain('OK — no errors.')
  })

  it('prints every error with its rule name and fails loudly', () => {
    const text = formatReport(
      validatePlugin(clean({ description: undefined, tasks: [task, { ...task }] }), { existing: [] }),
      'dir'
    ).join('\n')
    expect(text).toContain('[duplicate-task-id]')
    expect(text).toContain('[manifest-description-missing]')
    expect(text).toMatch(/FAIL — 2 error\(s\)/)
  })

  it('says so when capabilities are derived rather than declared', () => {
    const text = formatReport(validatePlugin(clean(), { existing: [] }), 'dir').join('\n')
    expect(text).toContain('undeclared — derived from contributions')
  })
})
