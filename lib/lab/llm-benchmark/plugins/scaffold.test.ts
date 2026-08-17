import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PLUGIN_ID_PATTERN,
  validatePluginId,
  validatePluginName,
  pascalCase,
  camelCase,
  templateVars,
  renderTemplate,
  nextSteps,
} from './scaffold'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = path.resolve(HERE, '../../../../scripts/templates/plugin')

function template(name: string): string {
  return readFileSync(path.join(TEMPLATE_DIR, name), 'utf8')
}

describe('plugin id validation', () => {
  it('accepts kebab-case ids', () => {
    for (const id of ['community-tasks', 'a', 'a1', 'gateway-behavior-tasks']) {
      expect(PLUGIN_ID_PATTERN.test(id), id).toBe(true)
      expect(validatePluginId(id), id).toBeNull()
    }
  })

  it('rejects non-kebab-case ids with a reason', () => {
    for (const id of ['CommunityTasks', 'community_tasks', '-leading', 'trailing-', 'double--hyphen', '1st', 'has space']) {
      expect(PLUGIN_ID_PATTERN.test(id), id).toBe(false)
      expect(validatePluginId(id), id).toMatch(/kebab-case/)
    }
  })

  it('rejects an empty id', () => {
    expect(validatePluginId('')).toMatch(/required/)
  })

  it('rejects an id already on the roster', () => {
    expect(validatePluginId('community-tasks', { registeredIds: ['community-tasks'] })).toMatch(
      /already registered/
    )
  })

  it('rejects an id whose directory already exists (even if unrostered)', () => {
    // The two collision sources are NOT the same set: a scaffold that nobody
    // wired into the roster has a directory and no registration.
    expect(validatePluginId('half-wired', { registeredIds: [], existingDirs: ['half-wired'] })).toMatch(
      /already exists/
    )
  })
})

describe('plugin name validation', () => {
  it('accepts a normal display name', () => {
    expect(validatePluginName('Community Tasks')).toBeNull()
  })

  it('rejects blank names', () => {
    expect(validatePluginName('')).toMatch(/required/)
    expect(validatePluginName('   ')).toMatch(/required/)
  })

  it('rejects quotes and backslashes (interpolated into JSON and TS literals)', () => {
    expect(validatePluginName('Say "hi"')).toMatch(/no quotes/)
    expect(validatePluginName("it's")).toMatch(/no quotes/)
    expect(validatePluginName('back\\slash')).toMatch(/no quotes/)
  })
})

describe('naming derivations', () => {
  it('pascal- and camel-cases a kebab id', () => {
    expect(pascalCase('community-tasks')).toBe('CommunityTasks')
    expect(camelCase('community-tasks')).toBe('communityTasks')
    expect(pascalCase('demo')).toBe('Demo')
    expect(camelCase('demo')).toBe('demo')
  })

  it('derives every template var from the id and name', () => {
    expect(templateVars('gateway-tasks', 'Gateway Tasks')).toEqual({
      PLUGIN_ID: 'gateway-tasks',
      PLUGIN_NAME: 'Gateway Tasks',
      PLUGIN_EXPORT: 'gatewayTasks',
      PLUGIN_PASCAL: 'GatewayTasks',
      TASK_ID: 'gateway-tasks-starter',
      TASK_TITLE: 'Gateway Tasks Starter',
      CHECK_RENDERS: 'gateway-tasks-renders',
      CHECK_RESPONDS: 'gateway-tasks-responds',
      DEMO_COMPONENT: 'GatewayTasksDemo',
    })
  })
})

describe('renderTemplate', () => {
  it('substitutes every placeholder occurrence', () => {
    expect(renderTemplate('__A__ then __A__ and __B__', { A: 'x', B: 'y' })).toBe('x then x and y')
  })

  it('throws on an unknown placeholder rather than emitting it', () => {
    // A surviving `__TASK_ID__` compiles nowhere and reads like a typo; the
    // author would find it long after the scaffold command succeeded.
    expect(() => renderTemplate('hello __MISSING__', { A: 'x' })).toThrow(/__MISSING__/)
  })

  it('leaves text without placeholders untouched', () => {
    expect(renderTemplate('nothing to do', {})).toBe('nothing to do')
  })
})

describe('templates render into the shape the registry expects', () => {
  const vars = templateVars('demo-plugin', 'Demo Plugin')

  it('renders every shipped template with no leftover placeholders', () => {
    for (const name of ['manifest.json.tmpl', 'index.ts.tmpl', 'checks.ts.tmpl', 'demo.tsx.tmpl', 'roster.tmpl']) {
      expect(() => renderTemplate(template(name), vars), name).not.toThrow()
    }
  })

  it('produces a manifest whose task row matches the generated index.ts', () => {
    const manifest = JSON.parse(renderTemplate(template('manifest.json.tmpl'), vars))
    expect(manifest.id).toBe('demo-plugin')
    expect(manifest.name).toBe('Demo Plugin')
    expect(manifest.tasks[0].id).toBe('demo-plugin-starter')
    expect(manifest.tasks[0].checks).toEqual(['demo-plugin-renders', 'demo-plugin-responds'])

    const index = renderTemplate(template('index.ts.tmpl'), vars)
    expect(index).toContain(`id: '${manifest.tasks[0].id}'`)
    expect(index).toContain(`scorer: '${manifest.tasks[0].scorer}'`)
    for (const check of manifest.tasks[0].checks) expect(index).toContain(`'${check}'`)
  })

  it('declares the capabilities it actually scaffolds, in both files', () => {
    // The scaffold models the practice: a declaration registration verifies.
    // If it ever declared less than the generated index.ts ships,
    // `registerPlugin` would reject the scaffold the moment it was rostered.
    const manifest = JSON.parse(renderTemplate(template('manifest.json.tmpl'), vars))
    expect(manifest.capabilities).toEqual(['tasks', 'checks', 'demos'])
    const index = renderTemplate(template('index.ts.tmpl'), vars)
    expect(index).toContain("capabilities: ['tasks', 'checks', 'demos']")
  })

  it('keeps the client-bundle rule: checks import types only', () => {
    const checks = renderTemplate(template('checks.ts.tmpl'), vars)
    expect(checks).toContain('import type { CheckContext, CheckFn }')
    // A value import of sandbox.ts would drag Playwright into the client bundle.
    expect(checks).not.toMatch(/^import\s+\{/m)
  })

  it('declares a point budget for each generated check', () => {
    const checks = renderTemplate(template('checks.ts.tmpl'), vars)
    expect(checks).toContain('MAX_POINTS')
    expect(checks).toMatch(/POINT BUDGET \+ THRESHOLD RATIONALE/)
    expect(checks).toContain('maxPoints: MAX_POINTS.renders')
    expect(checks).toContain('maxPoints: MAX_POINTS.responds')
  })

  it('generates a client demo whose export matches demoComponentName', () => {
    const demo = renderTemplate(template('demo.tsx.tmpl'), vars)
    expect(demo.startsWith("'use client'")).toBe(true)
    expect(demo).toContain(`export function ${vars.DEMO_COMPONENT}(`)
    expect(renderTemplate(template('index.ts.tmpl'), vars)).toContain(
      `demoComponentName: '${vars.DEMO_COMPONENT}'`
    )
  })

  it('prints roster lines that match the generated export name', () => {
    const roster = renderTemplate(template('roster.tmpl'), vars)
    expect(roster).toContain(`{ ${vars.PLUGIN_EXPORT} }`)
    expect(roster).toContain(`registerPlugin(${vars.PLUGIN_EXPORT})`)
    expect(renderTemplate(template('index.ts.tmpl'), vars)).toContain(
      `export const ${vars.PLUGIN_EXPORT}: BenchmarkPlugin`
    )
  })
})

describe('nextSteps', () => {
  it('names the roster, the stub check and the guide', () => {
    const steps = nextSteps('demo-plugin').join('\n')
    expect(steps).toContain('plugins/index.ts')
    expect(steps).toContain('demo-plugin-responds')
    expect(steps).toContain('docs/lab/llm-benchmark/plugins-authoring.md')
  })
})
