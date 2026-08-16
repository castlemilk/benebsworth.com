/**
 * Pure helpers behind `scripts/plugin-scaffold.mjs`.
 *
 * The script owns the filesystem and the console; everything decidable
 * without either — id/name validation, the naming derivations, placeholder
 * substitution, the roster snippet — lives here so it is unit-testable
 * (same split as `sweep.ts` vs `scripts/sweep-clean.mjs`).
 *
 * The generated FILE BODIES are not here: they live as `.tmpl` files under
 * `scripts/templates/plugin/`. Keeping them out of the TypeScript tree is
 * deliberate — a template contains lines like `from './checks'`, and
 * `layering.test.ts` scans every in-tree `.ts` file's import specifiers with
 * a text regex, so an inlined template would register as an unresolvable
 * import from this module.
 */

/** kebab-case: lowercase alphanumeric words joined by single hyphens. */
export const PLUGIN_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

/** Placeholders are `__SCREAMING_SNAKE__`; any left over is a template bug. */
const PLACEHOLDER_PATTERN = /__[A-Z][A-Z0-9_]*__/g

export interface PluginIdCheck {
  /** Plugin ids already registered by the roster (`getPlugins()`). */
  registeredIds?: string[]
  /** Directory names already present under `plugins/`. */
  existingDirs?: string[]
}

/**
 * Returns a human-readable reason the id is unusable, or `null` if it is
 * fine. Both collision sources matter and they are NOT the same set: an id
 * can have a directory but no roster entry (a scaffold nobody wired up yet)
 * or a roster entry whose code lives elsewhere.
 */
export function validatePluginId(id: string, checks: PluginIdCheck = {}): string | null {
  if (!id) return 'plugin id is required'
  if (!PLUGIN_ID_PATTERN.test(id)) {
    return `invalid plugin id '${id}' — must be kebab-case (e.g. 'community-tasks'): lowercase letters/digits, single hyphens, starting with a letter`
  }
  if ((checks.registeredIds ?? []).includes(id)) {
    return `plugin id '${id}' is already registered in the roster (plugins/index.ts)`
  }
  if ((checks.existingDirs ?? []).includes(id)) {
    return `plugins/${id}/ already exists — refusing to overwrite it`
  }
  return null
}

/**
 * Returns a reason the display name is unusable, or `null`. The name is
 * interpolated into JSON and into a TypeScript string literal, so quotes and
 * backslashes are rejected rather than escaped — a plugin display name has
 * no business containing either.
 */
export function validatePluginName(name: string): string | null {
  if (!name || !name.trim()) return 'plugin name is required'
  if (/["'\\]/.test(name)) return `invalid plugin name ${JSON.stringify(name)} — no quotes or backslashes`
  return null
}

/** `community-tasks` → `CommunityTasks`. */
export function pascalCase(id: string): string {
  return id
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/** `community-tasks` → `communityTasks`. */
export function camelCase(id: string): string {
  const pascal = pascalCase(id)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

/** Every substitution the templates may reference. */
export function templateVars(id: string, name: string): Record<string, string> {
  const pascal = pascalCase(id)
  return {
    PLUGIN_ID: id,
    PLUGIN_NAME: name,
    PLUGIN_EXPORT: camelCase(id),
    PLUGIN_PASCAL: pascal,
    TASK_ID: `${id}-starter`,
    TASK_TITLE: `${name} Starter`,
    CHECK_RENDERS: `${id}-renders`,
    CHECK_RESPONDS: `${id}-responds`,
    DEMO_COMPONENT: `${pascal}Demo`,
  }
}

/**
 * Substitute `__KEY__` placeholders. Throws when a placeholder survives —
 * a silent leftover would ship `__TASK_ID__` into generated source, which
 * compiles nowhere and reads like a typo rather than a missing variable.
 */
export function renderTemplate(source: string, vars: Record<string, string>): string {
  const rendered = source.replace(PLACEHOLDER_PATTERN, (match) => {
    const key = match.slice(2, -2)
    return key in vars ? vars[key] : match
  })
  const leftover = [...new Set(rendered.match(PLACEHOLDER_PATTERN) ?? [])]
  if (leftover.length > 0) {
    throw new Error(`unsubstituted placeholder(s) in template: ${leftover.join(', ')}`)
  }
  return rendered
}

/**
 * Post-scaffold checklist printed by the script (also in the authoring
 * guide). The roster lines themselves are `scripts/templates/plugin/
 * roster.tmpl`, rendered with the same vars, so the printed snippet cannot
 * drift from the export name the generated `index.ts` actually emits.
 */
export function nextSteps(id: string): string[] {
  // Same derivations the templates use, so the checklist names the real
  // symbols. The display name plays no part in either of them.
  const vars = templateVars(id, id)
  return [
    `Add the roster lines to lib/lab/llm-benchmark/plugins/index.ts (import beside the others, registerPlugin() below them). Later registrations win name collisions, so order = precedence.`,
    `Fill in the task row in plugins/${id}/index.ts: prompt, blurb, runtimeHint, methodNotes, and a real category from BENCHMARK_CATEGORIES (the stub uses 'advanced-game-building').`,
    `Implement the two checks in plugins/${id}/checks.ts — '${vars.CHECK_RESPONDS}' is a deliberate always-fail stub. State each check's point budget AND the threshold rationale in its comment.`,
    `Replace the placeholder demo in plugins/${id}/demo.tsx; its export name must stay '${vars.DEMO_COMPONENT}' to match demoComponentName.`,
    `Add coverage to lib/lab/llm-benchmark/plugins/registry.test.ts: the task merges into BENCHMARK_TASKS with pluginId '${id}', and its declared checks resolve through getChecksForTask().`,
    `Run: task verify && task build (the task page statically generates from BENCHMARK_TASKS).`,
    `Docs: docs/lab/llm-benchmark/plugins-authoring.md`,
  ]
}
