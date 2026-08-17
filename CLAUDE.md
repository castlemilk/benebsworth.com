# benebsworth.com

Static Next.js site (`output: 'export'`) served from **Cloudflare Pages**, with a
blog, a hiking section, an interactive lab, and an LLM benchmark harness.

## Task is the entry point

Every core command lives in `Taskfile.yml` + `taskfiles/*.yml`. Each task
declares its real inputs, its real outputs, and the domain knowledge needed to
run it correctly — the gotchas are in the tasks, not in someone's head.

```bash
task                      # list every task
task <name> --summary     # long-form docs for one task: inputs, outputs, gotchas
task doctor               # what's installed, what credentials are missing, what each one blocks
task setup                # one-time per clone: node check + npm ci + git hooks
```

`package.json` scripts are **thin aliases** that delegate to Task (`npm run
build` runs `task build`). Never reimplement a pipeline in package.json — edit
the taskfile. There is deliberately no `prebuild`/`postbuild` pair any more:
those phases are steps of `task build`, and duplicating them would run twice.

Requires [Task](https://taskfile.dev) (`brew install go-task`).

### The commands that matter

| Command | What it does |
|---|---|
| `task dev` | Next dev server on :3000 (no pre/post phases — see below) |
| `task build` | Full static export into `out/`, fingerprinted |
| `task build:clean` | From-scratch build (clears `.next` and `out/`) |
| `task verify` | eslint → typecheck → prose → unit tests (~60s) |
| `task ci` | verify + clean build + e2e (~3-6 min) |
| `task test:unit` / `task test:e2e` | Vitest / Playwright-against-the-built-site |
| `task lint` | eslint + typecheck + prose linter |
| `task deploy:staging` | Build + publish to next.benebsworth.com, then verify |
| `task deploy:prod` | Build + publish to benebsworth.com (prompts first) |
| `task bench` | LLM benchmark harness usage + knobs |
| `task infra` | Terraform stacks (Cloudflare live; AWS dormant) |

## Git hooks

Version-controlled in `.githooks/`, activated per clone with
`task git:hooks:install` (also run by `task setup`).

| Hook | Runs | Cost |
|---|---|---|
| pre-commit | eslint on **staged** files, typecheck, prose lint on **changed** prose | ~15s |
| pre-push | unit tests + full production build | ~2-4 min |

The build is in the push gate on purpose: this site's characteristic failure is
a build-time one — a bad MDX file, a broken benchmark registry entry, or a
missing demo export typechecks clean and only explodes during the static export.

Bypass either with `SKIP_HOOKS=1` or git's `--no-verify`. Run them by hand as
`task git:pre-commit` / `task git:pre-push`, or both via `task git:hooks:test`.

## Things that will bite you

**The build is three phases, and all three matter.** Pre (`.md` siblings +
benchmark output artifacts) → `next build` → post (OG image rename + Pagefind
index). Skipping a phase produces a build that looks fine locally and 404s in
production.

**OG images are emitted extensionless.** Next writes `opengraph-image` with no
extension; static hosting rewrites extensionless paths to `<path>/index.html`,
so every og:image 404s. The postbuild renames them to `.png` and rewrites the
HTML references. Never skip the postbuild.

**`task dev` does not run the pre/post phases.** No `.md` siblings, no benchmark
output JSON, no OG `.png`, no search index. Verify anything touching those with
a real `task build` plus `task test:serve` or `task test:e2e`.

**e2e tests the built `out/`, not the dev server.** `reuseExistingServer: true`
means Playwright will happily use a stale process already on :4321. Confirm the
listener is yours (`lsof -nP -iTCP:4321 -sTCP:LISTEN`) before believing a pass.

**`buf generate` wipes hand-written code.** `lib/gen/content.ts` carries a manual
`LabCategory` / `LabEffect.category` block that is not in the `.proto`.
`task build:gen:proto` typechecks afterwards and fails loudly if the block was
lost — re-apply it from the diff.

**The benchmark harness spends real money.** Always scope it: `task bench:smoke`
for wiring, `task bench:run MODELS=...` for real work. `results.json` is written
incrementally and merge-protected, so a killed or quota-blocked run cannot
destroy good baseline data. Seeded sample records carry `source: 'seeded'` and
must stay disclosed in the UI.

**A subtle + systemic + costly fix ships with a postmortem** — a write-up in
`docs/postmortem/` naming the guardrails it motivated (criteria + template there).

**Infra ≠ content deploy.** A site update is `task deploy:staging`. Terraform is
a separate system; confusing the two has cost hours. Always plan before apply.

## Layout

```
app/                Next App Router routes
components/         React components (lab effects, benchmark demos, trailkit MDX)
content/            MDX sources — blog posts, hikes, lab + benchmark copy
lib/                loaders, benchmark registry/harness/runners, generated proto types
scripts/            build/codegen/harness scripts that the taskfiles wrap
taskfiles/          the task definitions (build, lint, test, deploy, benchmark, infra, git)
.githooks/          version-controlled git hooks
infra/              Terraform: cloudflare (live), envs/{prod,staging} (dormant AWS), gcp
e2e/                Playwright specs
.claude/skills/     deep runbooks: deploying-the-site, llm-benchmark, writing-blog-posts, ...
```

For depth beyond this file, read the task summaries (`task <name> --summary`) and
the skills in `.claude/skills/`.

## Codebase questions: query the graph first

A committed, queryable code graph lives in `graphify-out/` (rebuilt by the
post-commit hook on source changes — expect a one-commit lag). Before grepping
or reading through the tree, try:

```bash
graphify explain "SymbolOrConcept"   # neighbors, degree, community
graphify path A B                    # shortest path between two symbols
graphify query "how does X reach Y"  # BFS subgraph for a question
```

`GRAPH_REPORT.md` lists god nodes and communities — a 30-second map of what
connects to what.
