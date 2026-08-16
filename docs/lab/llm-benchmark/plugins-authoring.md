# Authoring a benchmark plugin

A plugin contributes tasks, behavioral checks, scorers, demo components and
task-page cards to the benchmark harness without editing a core file. The
built-in set is not privileged — it is just the first registrant.

Start here:

```
task bench:plugin-scaffold -- my-plugin "My Plugin"
```

That writes `lib/lab/llm-benchmark/plugins/my-plugin/` and prints the roster
lines plus a wiring checklist. The rest of this document is what the scaffold
leaves you to decide.

Worked example: `lib/lab/llm-benchmark/plugins/community-tasks/` (tic-tac-toe
with two DOM-based checks and a demo).

---

## Anatomy

```
lib/lab/llm-benchmark/plugins/<id>/
  manifest.json   descriptive metadata (NOT loaded at run time — see below)
  index.ts        the BenchmarkPlugin export; the source of truth
  checks.ts       behavioral checks (import type ONLY)
  demo.tsx        'use client' demo component(s)
```

`index.ts` exports a `BenchmarkPlugin`
(`plugins/registry.ts:BenchmarkPlugin`):

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Stable, unique across all plugins. Kebab-case. Stamped onto contributed tasks. |
| `name` | yes | Display name (attribution chip, sweep diagnostics). |
| `version` | yes | Semver-ish string, shown for attribution. |
| `description` | no | One line. |
| `tasks` | no | `BenchmarkTask[]` merged into `BENCHMARK_TASKS`. |
| `checks` | no | `Record<name, CheckFn>` merged into the named check registry. |
| `scorers` | no | `Record<name, Scorer>` — the names a task row's `scorer` may use. |
| `demos` | no | `Record<demoComponentName, ComponentType<{ className?: string }>>`. |
| `taskCards` | no | `Record<taskId, ComponentType<{ task }>>` — extra UI on a task page. |

Every field except the three identity fields is optional; a metadata-only
plugin is legal.

**`manifest.json` is documentation, not configuration.** Nothing imports it —
`registerPlugin()` reads the `index.ts` export. It exists so a human (or a
future loader) can see a plugin's shape without reading TypeScript. Keep it in
sync by hand, or delete it; the scaffold's
`lib/lab/llm-benchmark/plugins/scaffold.test.ts` asserts the generated
manifest and `index.ts` agree, and nothing enforces that afterwards.

---

## Extension points

### Tasks — `registry.ts:BENCHMARK_TASKS` ← `plugins/registry.ts:pluginTasks()`

`registry.ts` spreads `pluginTasks()` into `BENCHMARK_TASKS` at module load.
Contributed rows are the same `BenchmarkTask` shape as built-ins
(`types.ts:BenchmarkTask`), with these rules:

- `id` and `slug` must be unique across built-ins **and** every other plugin
  (`registry.test.ts` asserts both).
- `category` must be a slug in `BENCHMARK_CATEGORIES`. The five HTML-runnable
  ones — `3d-physics-animation`, `advanced-game-building`, `advanced-physics`,
  `advanced-electronics`, `ui-building` — must also declare
  `scorer: 'behavioral'`, or `registry.test.ts` fails the row.
- `demoComponentName` must resolve in
  `components/lab/llm-benchmark/demos/demo-registry.tsx` (built-ins plus this
  plugin's `demos`), otherwise the task page renders "Demo not found".
- Never set `pluginId` yourself. `registerPlugin()` stamps it and throws on a
  row that sets its own (`plugins/registry.ts:registerPlugin`).
- Pre/post MDX under `content/lab/llm-benchmark/tasks/<slug>.mdx` is
  **optional** — tic-tac-toe ships without it and builds fine.

A contributed task legitimately has **zero results** until its first sweep.
`registry.test.ts`'s data-loss floor (every task keeps ≥20 result records, and
a flagship model covers the whole board) skips rows with a `pluginId` for
exactly that reason. Do not add results by hand to satisfy it.

### Prompt contract — `prompts.ts:withSandboxConstraints`

The harness appends a sandbox contract to the prompt before it reaches the
model: what the iframe allows (opaque origin, no network, no runtime
compilation) and what a good artifact looks like. A task may ship its own via
`BenchmarkTask.sandboxConstraints` instead of editing `prompts.ts`. Explicit
beats the category heuristic, exactly like `scorer`:

| `sandboxConstraints` | Applied to the prompt |
| --- | --- |
| absent (`undefined`) | the global `SANDBOX_CONSTRAINTS`, **iff** the category is one of the five HTML-runnable ones. What every built-in does. |
| `''` | nothing, even for an HTML-runnable category — an explicit "this task gets no scaffolding". |
| non-empty string | that text, blank-line separated, **whatever the category**. It REPLACES the global contract; to extend instead, interpolate `SANDBOX_CONSTRAINTS` into your own string. |

Two consequences worth knowing before you write one:

- **It changes the cache key.** The amended prompt is hashed into the run
  log's `promptHash` and keys the response cache, so editing a task's
  contract makes the next sweep re-run it rather than replay a cached
  response. That is the intended behaviour — a task scored under a different
  contract is a different measurement — but it means a contract edit costs a
  sweep.
- **It is public.** The task page renders the *applied* contract in a
  collapsed "Sandbox contract" disclosure under the prompt
  (`components/lab/llm-benchmark/sandbox-contract.tsx`), labelled global or
  task-specific, or a one-line "none" note. The text comes from
  `appliedSandboxConstraints(task)`, so it cannot drift from what was sent.

Write one when the global contract is *wrong* for your task, not merely
verbose. The worked example is tic-tac-toe: the global contract spends most
of its guidance on canvas CSS sizing, resize listeners and
`requestAnimationFrame`, which a DOM board does not have, and says nothing
about the two things its checks assert — a click marks a cell whose own text
content is the mark, and a three-in-a-row announces a winner in visible page
text. Its override keeps the sandbox-hygiene half of the global contract
verbatim and replaces the canvas half with board rules. Constraints that the
checks do not test are decoration; constraints the checks test but the prompt
never stated are a trap.

### Checks — `scorers/checks.ts:getChecksForTask` / `CHECK_REGISTRY`

`scorers/checks.ts` merges `pluginChecks()` into `CHECK_REGISTRY` at load. A
task row's `checks: string[]` is resolved by name; an unknown name **throws**
rather than silently scoring with no checks. A task with no `checks` list
falls back to the per-task map, and a task with neither falls back to
structural HTML scoring — quiet and plausible, which is why the registry test
insists every behaviourally-scored task resolves at least one check.

A `CheckFn` (`scorers/sandbox.ts:CheckFn`) receives a `CheckContext` with the
loaded Playwright `page`, the artifact `html`, and `captureCanvas()`, and
returns `{ name, passed, points, maxPoints, detail? }`.

**Checks MUST declare their point budget and threshold rationale.** Mirror the
calibration comments in `scorers/checks.ts`: state the maximum points, why
that share, and why any numeric threshold is where it is. Totals are
calibrated so a fully-working artifact lands near the structural scorer's
ceiling (95-100) and a broken one drops to 30-50 rather than the 100 a
tag-balance check would hand it. A budget without a rationale is a magic
number that nobody can later re-tune.

Two further conventions from the worked example:

- Locate elements generically (`[data-cell], button, td, [role="button"]`) so
  any reasonable implementation passes the locator step. The behavioural claim
  should be about *response*, not about markup the prompt never demanded.
- A stub check should **fail**, not pass. The scaffold's second check returns
  `passed: false, detail: 'stub check — not implemented yet'`; an always-pass
  stub silently inflates every score for that task.

### Scorers — `scorers/index.ts:registeredScorerNames` / `selectScorer`

`scorers/index.ts` merges `pluginScorers()` into the scorer table. A task row's
`scorer` field must name a registered scorer (`registry.test.ts` checks it).
`selectScorer(task)` reads the explicit field first and only falls back to the
category heuristic when it is absent.

### Demos — `components/lab/llm-benchmark/demos/demo-registry.tsx`

`DEMO_COMPONENTS` spreads `pluginDemos()` **after** the built-ins, so a plugin
wins a name collision. Demo conventions: `'use client'`, named export matching
`demoComponentName`, props exactly `{ className?: string }`, theming through
the CSS custom properties (`--color-stage`, `--color-surface`, `--color-fg`,
`--color-muted`, `--color-border`), self-contained (no network, clean up any
rAF/timer).

### Task cards — `plugins/registry.ts:pluginTaskCard`

`Record<taskId, ComponentType<{ task: BenchmarkTask }>>`, rendered as an extra
slot on that task's page. Optional; the scaffold omits it.

---

## The client-bundle rule

Anything imported at **run time** by `plugins/registry.ts` or
`demo-registry.tsx` reaches the browser bundle. `scorers/sandbox.ts` pulls in
Playwright.

> Plugin check files MUST use `import type { CheckFn }` — never a runtime
> import of `scorers/sandbox.ts`.

Demo components may import React freely. The rule is stated in the module doc
of `plugins/registry.ts` and asserted for the generated template in
`plugins/scaffold.test.ts`.

`eslint.config.mjs` has `@typescript-eslint/no-import-type-side-effects: error`
and `consistent-type-imports`, which catch the accidental half of this; a
deliberate value import of a sandbox symbol will not be caught by lint, only
by a fat client bundle.

---

## Registering: the roster

`plugins/index.ts` is the roster — one static import plus one
`registerPlugin()` call per plugin:

```ts
import { myPlugin } from './my-plugin'

registerPlugin(myPlugin)
```

Static imports, not dynamic discovery: Next.js requires them for client
components, and the harness runs under `tsx`.

**Order is precedence.** `pluginChecks()`, `pluginScorers()`, `pluginDemos()`
and `pluginTaskCards()` merge by name in registration order, so a **later**
plugin wins a same-named check/scorer/demo — which is how a plugin
deliberately overrides a built-in. Task **ids**, by contrast, are not
last-wins: a duplicate id is a bug the registry test catches, and a duplicate
plugin id throws at registration.

`unregisterPlugin(id)` unwinds a plugin's contributions; it exists for tests
and hot reload. Consumers must treat plugin state as derived — query the
getters, never cache.

### An unrostered scaffold is dead code, deliberately

`task bench:plugin-scaffold` does **not** edit the roster. Until you add the
import, nothing loads the plugin: `tsconfig.json` includes `**/*.ts`, so it is
still typechecked, and ESLint still lints it, but no test or route sees it.
`task verify` stays green.

This is verified, not assumed. `layering.test.ts` scans every non-test `.ts`
under `lib/lab/llm-benchmark/` and asserts every relative import resolves, so
a scaffold with a broken relative import *would* fail — the generated files
import only `../registry`, `../../types`, `./checks` and `./demo`, all of
which exist from the moment they are written.

(The same scan is why the file templates live as `.tmpl` files under
`scripts/templates/plugin/` rather than as string literals in a `.ts` module:
a template line like `from './checks'` inside `plugins/scaffold.ts` would be
read by the scanner as an unresolvable import from that module.)

Once rostered, the contributed task joins `BENCHMARK_TASKS`, gets a statically
generated page at `/lab/llm-benchmark/<category>/<slug>/`, and renders a
`pluginId` attribution chip
(`app/lab/llm-benchmark/[category]/[task]/page.tsx`) reading
"<plugin name> plugin".

---

## Sweeps: plugin bundle selection

A sweep chooses which plugins mount, and therefore which contributed tasks
run (`sweep-profiles.ts`).

| Given | Active plugin set |
| --- | --- |
| nothing anywhere | ALL registered plugins (default, backward compatible) |
| `--plugins none` / `RUN_PLUGINS=none` / `"plugins": []` | built-ins only |
| `--plugins a,b` / `"plugins": ["a","b"]` | exactly that set |

Precedence is flag > env > profile > default, like every other knob. Relevant
symbols: `sweep-profiles.ts:PLUGINS_NONE`, `resolveSweepConfig`,
`isTaskEnabled`, `filterTasksByPlugins`, `excludedPluginTaskConflicts`.

Bundle selection is **not** a task allowlist: it decides which plugins mount,
and built-in tasks are unaffected. An unknown plugin id exits 1 with the
roster printed. Asking for a plugin task while excluding its plugin
(`--task my-task --plugins none`) is a fatal contradiction, not a silently
smaller sweep. `--dump-config` prints a `plugins` row with provenance, and the
resolved set is recorded in every run log header's `configSnapshot.plugins`.

The stored profile `builtins-only` (`sweep-profiles.json`) is `"plugins": []`
— the core task set only.

---

## Checklist

1. `task bench:plugin-scaffold -- <id> "<Name>"`.
2. Fill in the task row: prompt, blurb, runtimeHint, methodNotes, category.
3. Implement both checks; state each budget **and** its threshold rationale.
   If the global sandbox contract is wrong for the task, set
   `sandboxConstraints` (and say why in a comment).
4. Replace the placeholder demo (keep the export name).
5. Add the roster lines to `plugins/index.ts`.
6. Add coverage to `plugins/registry.test.ts`: the task merges into
   `BENCHMARK_TASKS` with your `pluginId`, and its declared checks resolve
   through `getChecksForTask()`.
7. `task verify` — lint, typecheck, prose, unit tests.
8. `task build` — confirms the task page statically generates and the demo
   resolves.
9. Sweep it when you want real numbers: `task bench:run TASKS=<task-id>
   MODELS=<model-id> ITER=1` (real spend).
