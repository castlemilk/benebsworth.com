/**
 * Plugin validation — the "review a third-party plugin before rostering it"
 * pass.
 *
 * `registerPlugin()` throws on the FIRST violation, which is right for a
 * roster that must not boot half-mounted but wrong for a review: a reviewer
 * fixing a stranger's plugin one thrown error at a time learns the shape of
 * its problems only after N runs. `validatePlugin()` drains the SAME rule
 * stream (`registry.ts:registrationViolations`) and reports all of them,
 * plus manifest-level rules that registration deliberately does not enforce.
 *
 * Two-tier by design:
 *
 *   REGISTRATION rules  shared with `registerPlugin` — one generator, no
 *                       possible drift (`validate-plugin.test.ts` asserts the
 *                       parity fixture by fixture).
 *   MANIFEST rules      validate-only. A review gate is allowed to be
 *                       stricter than the loader: an id that is not
 *                       kebab-case, a version that is not semver-ish, or a
 *                       missing description are review defects, not runtime
 *                       hazards, and failing registration on them would break
 *                       plugins that run fine.
 *
 * The report also carries the CAPABILITY view — what the plugin actually
 * touches, next to what it claims — because that is the question a reviewer
 * is really asking: can this thing put arbitrary JS in a visitor's browser?
 *
 * Client-bundle rule: this module imports types and pure helpers only, and is
 * itself imported only by `scripts/validate-plugin.mjs` (node).
 */
import {
  PLUGIN_CAPABILITIES,
  capabilityCount,
  derivedCapabilities,
  getPlugins,
  registrationViolations,
  type BenchmarkPlugin,
  type PluginCapability,
  type PluginRule,
} from './registry'
import { PLUGIN_ID_PATTERN, validatePluginName } from './scaffold'

/** Validate-only rules — a stricter review gate than the loader. */
export type ManifestRule =
  | 'not-a-plugin'
  | 'manifest-id-kebab-case'
  | 'manifest-name-shape'
  | 'manifest-version-shape'
  | 'manifest-description-missing'
  | 'manifest-field-shape'

/** Advisory rules — reported, but never a reason to reject. */
export type WarningRule = 'overdeclared-capability' | 'task-demo-not-in-plugin' | 'task-check-not-in-plugin'

export type ValidationRule = PluginRule | ManifestRule | WarningRule

export interface ValidationProblem {
  rule: ValidationRule
  message: string
}

export interface ValidationReport {
  /** No errors. Warnings do not affect it. */
  ok: boolean
  errors: ValidationProblem[]
  warnings: ValidationProblem[]
  /** What the plugin ACTUALLY contributes — the at-a-glance reviewer view. */
  capabilities: PluginCapability[]
  /** What it CLAIMS to contribute; `undefined` when it declares nothing. */
  declaredCapabilities?: PluginCapability[]
  /** Per-capability contribution counts, for the printed table. */
  counts: Record<PluginCapability, number>
  /** Identity, echoed for the report header (may be missing on a bad plugin). */
  id?: string
  name?: string
  version?: string
  description?: string
}

export interface ValidateOptions {
  /**
   * Plugins to check collisions against. Defaults to the registered roster
   * MINUS the candidate itself — which is exactly right in every case, thanks
   * to module caching: validating a rostered plugin's own directory imports
   * the same module object the roster registered, so `p !== candidate`
   * suppresses a false "duplicate plugin id" while a genuinely new plugin
   * that squats a rostered id still trips it.
   */
  existing?: readonly BenchmarkPlugin[]
}

/** Semver-ish: MAJOR.MINOR.PATCH with an optional pre-release/build suffix. */
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z][0-9A-Za-z.-]*)?$/

/** Which shape each contribution field must have, for the untrusted-input guard. */
const FIELD_KIND: Record<PluginCapability, 'array' | 'record'> = {
  tasks: 'array',
  models: 'array',
  checks: 'record',
  scorers: 'record',
  demos: 'record',
  taskCards: 'record',
  generators: 'record',
}

const EMPTY_COUNTS: Record<PluginCapability, number> = {
  tasks: 0,
  checks: 0,
  scorers: 0,
  demos: 0,
  taskCards: 0,
  generators: 0,
  models: 0,
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Same `{rule, message}` twice is noise: a duplicate id trips once per member of the pair. */
function dedupe(problems: ValidationProblem[]): ValidationProblem[] {
  const seen = new Set<string>()
  return problems.filter((p) => {
    const key = `${p.rule}::${p.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Collect EVERY problem with a plugin candidate.
 *
 * Takes `unknown` on purpose: the interesting caller is a script that just
 * imported a stranger's module, where "is this even a plugin object?" is a
 * real question rather than a type-system given.
 */
export function validatePlugin(candidate: unknown, options: ValidateOptions = {}): ValidationReport {
  if (!isPlainObject(candidate)) {
    return {
      ok: false,
      errors: [
        {
          rule: 'not-a-plugin',
          message: `expected a BenchmarkPlugin object, got ${Array.isArray(candidate) ? 'an array' : typeof candidate}`,
        },
      ],
      warnings: [],
      capabilities: [],
      counts: { ...EMPTY_COUNTS },
    }
  }

  const errors: ValidationProblem[] = []
  const warnings: ValidationProblem[] = []
  const plugin = candidate as unknown as BenchmarkPlugin

  // --- manifest shape (validate-only) -------------------------------------
  if (typeof plugin.id === 'string' && plugin.id !== '' && !PLUGIN_ID_PATTERN.test(plugin.id)) {
    errors.push({
      rule: 'manifest-id-kebab-case',
      message: `plugin id '${plugin.id}' is not kebab-case (lowercase letters/digits, single hyphens, starting with a letter)`,
    })
  }
  if (typeof plugin.name === 'string' && plugin.name !== '') {
    const nameProblem = validatePluginName(plugin.name)
    if (nameProblem) errors.push({ rule: 'manifest-name-shape', message: nameProblem })
  }
  if (typeof plugin.version === 'string' && plugin.version !== '' && !VERSION_PATTERN.test(plugin.version)) {
    errors.push({
      rule: 'manifest-version-shape',
      message: `plugin '${plugin.id}' version '${plugin.version}' is not semver-ish (MAJOR.MINOR.PATCH)`,
    })
  }
  if (typeof plugin.description !== 'string' || plugin.description.trim() === '') {
    errors.push({
      rule: 'manifest-description-missing',
      message: `plugin '${plugin.id}' has no description — a reviewer reads it before the code`,
    })
  }

  // --- contribution field shapes ------------------------------------------
  // Untrusted input: `registrationViolations` iterates these fields and would
  // throw a TypeError on `tasks: 'nope'`, turning a reportable defect into a
  // crash. Guard first, and skip the registration rules if the shape is unsafe.
  let shapeOk = true
  for (const capability of PLUGIN_CAPABILITIES) {
    const value = (plugin as unknown as Record<string, unknown>)[capability]
    if (value === undefined) continue
    const kind = FIELD_KIND[capability]
    const valid = kind === 'array' ? Array.isArray(value) : isPlainObject(value)
    if (!valid) {
      shapeOk = false
      errors.push({
        rule: 'manifest-field-shape',
        message: `plugin '${plugin.id}' field '${capability}' must be ${kind === 'array' ? 'an array' : 'an object keyed by name'}, got ${Array.isArray(value) ? 'an array' : typeof value}`,
      })
    }
  }
  if (plugin.capabilities !== undefined && !Array.isArray(plugin.capabilities)) {
    shapeOk = false
    errors.push({
      rule: 'manifest-field-shape',
      message: `plugin '${plugin.id}' field 'capabilities' must be an array, got ${typeof plugin.capabilities}`,
    })
  }

  const counts = { ...EMPTY_COUNTS }
  let contributed: PluginCapability[] = []
  if (shapeOk) {
    for (const capability of PLUGIN_CAPABILITIES) counts[capability] = capabilityCount(plugin, capability)
    contributed = derivedCapabilities(plugin)

    // --- registration rules, single-sourced with registerPlugin ------------
    const existing = options.existing ?? getPlugins().filter((p) => (p as unknown) !== (candidate as unknown))
    for (const violation of registrationViolations(plugin, { existing })) {
      errors.push({ rule: violation.rule, message: violation.message })
    }

    // --- advisories --------------------------------------------------------
    for (const capability of plugin.capabilities ?? []) {
      if ((PLUGIN_CAPABILITIES as readonly string[]).includes(capability) && !contributed.includes(capability)) {
        warnings.push({
          rule: 'overdeclared-capability',
          message: `plugin '${plugin.id}' declares capability '${capability}' but contributes none — the declaration over-warns the reviewer`,
        })
      }
    }
    for (const task of plugin.tasks ?? []) {
      if (task.demoComponentName && !Object.hasOwn(plugin.demos ?? {}, task.demoComponentName)) {
        warnings.push({
          rule: 'task-demo-not-in-plugin',
          message: `task '${task.id}' names demo '${task.demoComponentName}', which this plugin does not ship — it must resolve as a built-in or the task page renders "Demo not found"`,
        })
      }
      for (const check of task.checks ?? []) {
        if (!Object.hasOwn(plugin.checks ?? {}, check)) {
          warnings.push({
            rule: 'task-check-not-in-plugin',
            message: `task '${task.id}' declares check '${check}', which this plugin does not ship — it must resolve as a built-in or getChecksForTask() throws`,
          })
        }
      }
    }
  }

  const deduped = dedupe(errors)
  return {
    ok: deduped.length === 0,
    errors: deduped,
    warnings: dedupe(warnings),
    capabilities: contributed,
    declaredCapabilities: Array.isArray(plugin.capabilities) ? [...plugin.capabilities] : undefined,
    counts,
    id: typeof plugin.id === 'string' ? plugin.id : undefined,
    name: typeof plugin.name === 'string' ? plugin.name : undefined,
    version: typeof plugin.version === 'string' ? plugin.version : undefined,
    description: typeof plugin.description === 'string' ? plugin.description : undefined,
  }
}

export interface PluginExportPick {
  /** The export name it settled on, for the report header. */
  exportName: string
  plugin: unknown
}

/**
 * Find the plugin export in a freshly-imported module namespace.
 *
 * A third-party `index.ts` names its export whatever it likes, so the script
 * cannot ask for a symbol by name. It picks the one object that looks like a
 * plugin; `default` wins if present, and two equally plausible candidates are
 * an ERROR rather than a coin flip — validating the wrong export would clear a
 * plugin nobody is going to register.
 */
export function pickPluginExport(mod: Record<string, unknown>): PluginExportPick | { error: string } {
  const KEYS = new Set<string>(['id', 'name', 'version', 'description', 'capabilities', ...PLUGIN_CAPABILITIES])
  const candidates = Object.entries(mod).filter(
    ([, value]) => isPlainObject(value) && Object.keys(value).some((k) => KEYS.has(k))
  )
  if (candidates.length === 0) {
    return { error: 'no BenchmarkPlugin-shaped export found (expected an object with id/name/version)' }
  }
  const byDefault = candidates.find(([exportName]) => exportName === 'default')
  if (byDefault) return { exportName: byDefault[0], plugin: byDefault[1] }
  if (candidates.length > 1) {
    return {
      error: `ambiguous plugin export — ${candidates.map(([n]) => n).join(', ')} all look like plugins; a plugin module should export exactly one (or a default)`,
    }
  }
  return { exportName: candidates[0]![0], plugin: candidates[0]![1] }
}

/**
 * Render a report for a terminal. Pure, so the script owns only the console.
 *
 * The capability table lists ALL seven extension points, not just the ones in
 * use: "contributes no demos" is the answer to the reviewer's actual question,
 * and an absent row would have to be inferred from a gap.
 */
export function formatReport(report: ValidationReport, source: string): string[] {
  const lines: string[] = []
  lines.push(`Plugin:  ${report.id ?? '<no id>'}${report.name ? ` (${report.name})` : ''} ${report.version ?? ''}`.trimEnd())
  lines.push(`Source:  ${source}`)
  if (report.description) lines.push(`About:   ${report.description}`)
  lines.push('')

  const declared = report.declaredCapabilities
  lines.push(
    declared
      ? 'CAPABILITY   DECLARED  CONTRIBUTED'
      : 'CAPABILITY   DECLARED  CONTRIBUTED   (undeclared — derived from contributions)'
  )
  for (const capability of PLUGIN_CAPABILITIES) {
    const count = report.counts[capability]
    const claim = declared ? (declared.includes(capability) ? 'yes' : 'no') : '—'
    lines.push(`${capability.padEnd(13)}${claim.padEnd(10)}${count}`)
  }
  lines.push('')
  lines.push(`Capabilities: ${report.capabilities.length > 0 ? report.capabilities.join(', ') : '<none — metadata only>'}`)
  lines.push('')

  if (report.warnings.length > 0) {
    lines.push(`WARNINGS (${report.warnings.length})`)
    for (const w of report.warnings) lines.push(`  [${w.rule}] ${w.message}`)
    lines.push('')
  }
  if (report.errors.length > 0) {
    lines.push(`ERRORS (${report.errors.length})`)
    for (const e of report.errors) lines.push(`  [${e.rule}] ${e.message}`)
    lines.push('')
    lines.push(`FAIL — ${report.errors.length} error(s). Fix these before adding it to plugins/index.ts.`)
  } else {
    lines.push('OK — no errors.')
  }
  return lines
}
