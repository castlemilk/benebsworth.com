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
| `description` | no | One line. Required by `validatePlugin` — a reviewer reads it before the code. |
| `capabilities` | no | What this plugin touches, declared for a reviewer. Optional but **verified** — see [Trust](#trust-validating-a-plugin-you-did-not-write). |
| `tasks` | no | `BenchmarkTask[]` merged into `BENCHMARK_TASKS`. |
| `checks` | no | `Record<name, CheckFn>` merged into the named check registry. |
| `scorers` | no | `Record<name, Scorer>` — the names a task row's `scorer` may use. |
| `demos` | no | `Record<demoComponentName, ComponentType<{ className?: string }>>`. |
| `taskCards` | no | `Record<taskId, ComponentType<{ task }>>` — extra UI on a task page. |
| `generators` | no | `Record<providerName, () => Promise<PluginGenerate>>` — a provider the harness has no built-in runner for. Lazy factories only. |
| `models` | no | `BenchmarkModel[]` merged into `BENCHMARK_MODELS`, stamped with `pluginId`. |

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

### Providers — `plugins/registry.ts:generators` + `models`

A plugin can ship a **provider**: the generator that talks to it, and the
models that run on it, with no edit to `runners/provider.ts`. Worked example:
`lib/lab/llm-benchmark/plugins/echo-provider/` (deliberately unrostered — it
generates fake output; copy its shape, not its roster status).

```ts
// index.ts — client-bundle safe: types and a lazy import, no node code.
export const echoProvider: BenchmarkPlugin = {
  id: 'echo-provider',
  name: 'Echo Provider',
  version: '1.0.0',
  models: [{ id: 'echo-1', name: 'Echo 1', provider: 'Echo', /* … */ }],
  generators: { Echo: () => import('./generate').then((m) => m.echoGenerate) },
}
```

**The seam is generation, not the run loop.** A `PluginGenerate`
(`types.ts`) answers one question — given a model, a task and an iteration
index, what did the provider return (`{ output, tokensIn, tokensOut,
runtimeMs }`)? Everything wrapped around that call is inherited unchanged:
transient retries with backoff, the response cache, empty-body recovery,
run-log `request`/`response`/`retry`/`clean` events, the per-model quota
circuit breaker, output cleaning, dependency inlining, and scoring. That is
deliberate — a plugin that replaced `runTask` would fork the trust story, with
two code paths producing numbers that claim to be comparable. (The TODO's
original sketch said `runners: Record<string, BenchmarkRunnerFactory>`; the
shipped seam is one level lower for that reason.)

Rules, all enforced at registration (`registerPlugin`) unless noted:

- The **key is the provider name** — the exact `BenchmarkModel.provider`
  string. `configForModel` consults this map only when its built-in switch
  does not know the provider; the built-in cases are untouched.
- A key that collides with a built-in provider (`providers.ts:BUILTIN_PROVIDERS`
  — OpenAI, Anthropic, Google, Moonshot AI, OpenRouter, Agy, Codex, OpenCode)
  is **rejected**. Unlike checks/scorers/demos, provider keys are not
  last-wins: shadowing a built-in silently reroutes an existing model's
  traffic.
- A key another plugin already provides is **rejected** too.
- A contributed model whose `provider` is neither built-in nor
  generator-backed is **rejected** — it could never run.
- Model `id`s must be unique across plugins (rejected at registration) and
  against built-ins (thrown by the registry merge at module load — a
  duplicate would make `getModel()` return the built-in row while results
  recorded under that id look like the plugin's).
- Never set `pluginId` on a model; `registerPlugin` stamps it.

**The lazy factory is not optional.** The generator implementation is
node-only (it spawns a CLI, holds an API key, imports `node:*`), and
`plugins/registry.ts` is reachable from `demo-registry.tsx` and therefore from
the browser bundle. `index.ts` must reference the implementation only through
`() => import('./generate')`; `runners/provider.ts` — node-only already —
awaits it at first use and caches the resolved function per provider for the
process (`clearPluginGeneratorCache()` exists for tests and hot reload).

An unknown provider with no plugin generator still throws, now listing both
the built-in and the plugin-provided sets.

One known gap: `isCliProvider()` (which turns a timeout into `cli_timeout` —
"the model was too slow" — rather than `endpoint_hung` — "the endpoint died")
reads a hard-coded set of built-in CLI providers, so a plugin provider that
spawns a CLI has its timeouts classified as `endpoint_hung`. Everything else
in the failure taxonomy applies unchanged. Fix it when a plugin CLI provider
actually exists, not before.

### Task cards — `plugins/registry.ts:pluginTaskCard`

`Record<taskId, ComponentType<{ task: BenchmarkTask }>>`, rendered as an extra
slot on that task's page. Optional; the scaffold omits it.

---

## The client-bundle rule

Anything imported at **run time** by `plugins/registry.ts` or
`demo-registry.tsx` reaches the browser bundle. `scorers/sandbox.ts` pulls in
Playwright.

> Plugin check files MUST use `import type { CheckFn }` — never a runtime
> import of `scorers/sandbox.ts`. Plugin generators MUST be declared as lazy
> `() => import('./generate')` factories — never a static import of the
> implementation.

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

## Trust: validating a plugin you did not write

A plugin can register a task whose **demo runs arbitrary JS in every visitor's
browser**, and its checks run in the scoring harness. Reviewing that by reading
the diff does not scale, so three things make the review mechanical.

### 1. Declare what you touch — `capabilities`

```ts
export const communityTasks: BenchmarkPlugin = {
  id: 'community-tasks',
  // …
  capabilities: ['tasks', 'checks', 'demos'],
}
```

Optional, but **verified when present**:

| Situation | Registration | Validation |
| --- | --- | --- |
| declares exactly what it ships | mounts | ok |
| ships MORE than it declares | **rejected** (`undeclared-capability`) | error |
| declares MORE than it ships | mounts | warning (`overdeclared-capability`) |
| declares nothing | mounts | capabilities **derived** from the contributions |
| declares a name that is not a capability | **rejected** (`unknown-capability`) | error |

The asymmetry is the point. Declaring less than you ship is the lie that
matters — the declaration is what a reviewer reads *instead of* the diff, so a
plugin that quietly adds a demo after review must not load. Declaring more than
you ship only over-warns the reviewer, so it loads and merely warns.

An undeclared plugin is still reviewable: validation derives the set from the
contributions and prints it either way. Declaring is better because it is a
claim the loader will hold you to. Both worked examples declare
(`community-tasks` → `tasks, checks, demos`; `echo-provider` →
`generators, models`), and the scaffold's templates ship the field.

The vocabulary is `PLUGIN_CAPABILITIES` in `plugins/registry.ts` — the seven
extension points: `tasks`, `checks`, `scorers`, `demos`, `taskCards`,
`generators`, `models`.

### 2. Validate before rostering — `task bench:plugin-validate`

```
task bench:plugin-validate -- community-tasks                              # roster id
task bench:plugin-validate -- lib/lab/llm-benchmark/plugins/echo-provider  # directory
```

A path that exists on disk is **imported for review and deliberately not
registered** — looking at a plugin must not mount it. Anything else is read out
of the roster. The report is the capability table (declared beside contributed,
all seven rows — "contributes no demos" is the answer to the reviewer's actual
question) followed by every warning and every error with its rule name. Exit 1
on errors; warnings never fail.

`registerPlugin()` throws on the **first** violation, which is right for a
loader and useless for a review — fixing a stranger's plugin one thrown error
per run teaches you nothing about its shape. `validatePlugin()` collects them
all.

**The two modes cannot drift.** Every rule registration enforces lives in one
lazy generator, `registry.ts:registrationViolations()`. `registerPlugin` takes
its first violation and throws (the stream is lazy, so later rules are never
evaluated — same message, same first failure as before this existed);
`validatePlugin` drains it. A rule added there is enforced by registration AND
reported by validation, and `plugins/validate-plugin.test.ts` holds a parity
matrix — one fixture per rule in `PLUGIN_RULES`, asserting both paths fire with
the identical message, and failing when a rule has no fixture at all.

Validation additionally applies **manifest rules the loader does not**:
kebab-case `id`, semver-ish `version`, a display name without quotes, and a
present `description`. A review gate is allowed to be stricter than the loader —
failing registration on a cosmetic id would break plugins that run fine. It also
warns when a task names a check or demo the plugin does not ship (legal — it may
resolve as a built-in — but worth a look).

### 3. Deny a capability at the roster — `registerPlugin(plugin, { deny })`

```ts
// plugins/index.ts — the one place plugins enter the build.
registerPlugin(sketchyPlugin, { deny: ['demos'] })
```

Registration fails if the plugin ships a denied capability. Its tasks and checks
mount; the contribution that would run its JS in a visitor's browser does not.

That is the whole policy mechanism: one parameter, at the one place a plugin
enters, controlled by the reviewer. No config file and no policy engine —
either of which would put the trust decision somewhere other than the diff you
are reviewing.

### 4. Fetching a third-party plugin

```
npx tsx scripts/plugin-fetch.mjs <git-url>
```

Shallow-clones into `plugins/third-party/<repo-name>/`, drops the nested `.git`
(a repo inside a repo commits as a broken gitlink), prints the cloned commit for
your commit message, and **stops** with the review checklist: validate it, read
the demo and the checks, compare the capability table against the diff, add the
roster line by hand, commit.

It refuses an existing target directory — re-cloning over a reviewed plugin
would silently swap approved code for whatever the remote holds today.

`third-party/` is **not** gitignored, and that is deliberate. Once a plugin is
reviewed and rostered the site builds from it, so its code has to be in the
repo; hiding it would mean shipping code that is not committed, which is a worse
failure than a large diff.

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
`isTaskEnabled`, `filterTasksByPlugins`, `excludedPluginTaskConflicts`,
`excludedPluginModelConflicts`.

Bundle selection is **not** a task allowlist: it decides which plugins mount,
and built-in tasks are unaffected. An unknown plugin id exits 1 with the
roster printed. Asking for a plugin task while excluding its plugin
(`--task my-task --plugins none`) is a fatal contradiction, not a silently
smaller sweep. `--dump-config` prints a `plugins` row with provenance, and the
resolved set is recorded in every run log header's `configSnapshot.plugins`.

**Contributed MODELS are gated the same way.** `filterTasksByPlugins` only ever
filtered tasks, but a plugin's models are merged into `BENCHMARK_MODELS`
unconditionally and its generators register the same way — so `--model
<your-model> --plugins none` used to run your model and your generator while
the run log's header claimed `plugins: []`. Naming a model whose plugin the
sweep does not mount is now fatal, with the same message shape as the task
conflict. The gate lives in `scripts/run-benchmark.mjs`, **not** inside
`pluginGenerator()`: the runner is sweep-agnostic (library callers, unit tests
and `retrace` use it with no bundle set at all), so the sweep is the only place
that can honestly enforce a sweep-scoped rule.

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
6. `task bench:plugin-validate -- <id>` — every rule at once, plus the
   capability table. Keep `capabilities` truthful: registration rejects a
   plugin that ships more than it declares.
7. Add coverage to `plugins/registry.test.ts`: the task merges into
   `BENCHMARK_TASKS` with your `pluginId`, and its declared checks resolve
   through `getChecksForTask()`. Shipping a provider? Mirror
   `runners/provider.test.ts`'s "plugin-provided generators" block — register
   the pair, run `runTask`, assert the aggregate.
8. `task verify` — lint, typecheck, prose, unit tests.
9. `task build` — confirms the task page statically generates and the demo
   resolves.
10. Sweep it when you want real numbers: `task bench:run TASKS=<task-id>
    MODELS=<model-id> ITER=1` (real spend).
