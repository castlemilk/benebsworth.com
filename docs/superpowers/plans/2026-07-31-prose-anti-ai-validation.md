# Prose anti-AI validation and editorial pass Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic, MDX-aware anti-slop validation and apply the existing Ben-specific writing skill to all reader-facing source prose without flattening its voice.

**Architecture:** A checked-in source manifest feeds a pure prose extraction/lint module and a small CLI. The existing `writing-blog-posts` skill documents the workflow and calls the CLI. Content changes happen in source files only; published blog siblings are regenerated and verified as derived output.

**Tech Stack:** Node.js ESM, Vitest, Next.js/MDX, existing Playwright suite, `gray-matter`-compatible frontmatter conventions, Git diff APIs.

---

## Chunk 1: Deterministic linter and source manifest

### Task 1: Define the prose source manifest

**Files:**
- Create: `scripts/prose-sources.json`
- Test: `lib/prose-lint.test.ts`

- [ ] **Step 1: Write manifest tests**

  Assert that the manifest includes the 77 blog index files, all 84 current lab MDX files, both project files, `content/about.ts`, `content/hiking.ts`, selected reader-facing app/components, `app/llms.txt/route.ts`, and selected registries. Assert that `_article-backlog.mdx`, the Trailkit skill/reference, tests, `out/`, `public/blog/**/*.md`, benchmark result blobs, and lab implementation code are excluded.

- [ ] **Step 2: Run the focused test to verify it fails**

  Run: `npx vitest run lib/prose-lint.test.ts -t "source manifest"`

  Expected: FAIL because the manifest does not exist.

- [ ] **Step 3: Add the sorted manifest**

  Store explicit include/exclude globs and the selected TS registries in JSON. Keep the manifest independent of shell glob expansion.

- [ ] **Step 4: Run the focused test**

  Run: `npx vitest run lib/prose-lint.test.ts -t "source manifest"`

  Expected: PASS.

### Task 2: Implement format-aware extraction and masking

**Files:**
- Create: `scripts/prose-lint.mjs`
- Modify: `lib/prose-lint.test.ts`

- [ ] **Step 1: Write failing extraction tests**

  Cover MDX frontmatter fields (`title`, `description`, `takeaways`), fenced and inline code, `$…$`/`$$…$$`, URLs, JSX tags/attributes, quoted prose, and line-number preservation. Cover TS/TSX visible text, selected user-facing attributes, comments, imports, identifiers, and code strings.

- [ ] **Step 2: Run the focused tests**

  Run: `npx vitest run lib/prose-lint.test.ts -t "extract|mask|line"`

  Expected: FAIL because extraction is not implemented.

- [ ] **Step 3: Implement pure extraction**

  Export `extractProse(filePath, source)` and return masked text plus source spans. Emit a `masking` error when a fence, frontmatter block, JSX attribute, or string literal cannot be parsed safely. Never treat uncertain code as prose.

- [ ] **Step 4: Run extraction tests**

  Run: `npx vitest run lib/prose-lint.test.ts -t "extract|mask|line"`

  Expected: PASS.

### Task 3: Implement rules, allowlist, and stable reporting

**Files:**
- Modify: `scripts/prose-lint.mjs`
- Modify: `lib/prose-lint.test.ts`

- [ ] **Step 1: Write failing rule tests**

  Test explicit AI-tell phrases, marketing words, vague verbs, repeated reveal constructions, long sentences/paragraphs, passive voice, nominalisations, phrasal verbs, modal hedges, semicolons, and the em-dash budget. Test warnings versus hard failures, Australian spelling, contractions, Ben's permitted hedges, technical terms, quoted copy, and deterministic sort order.

- [ ] **Step 2: Run the focused tests**

  Run: `npx vitest run lib/prose-lint.test.ts -t "rule|allowlist|severity|sort"`

  Expected: FAIL because the rules are not implemented.

- [ ] **Step 3: Implement rules**

  Pin the phrase set from the existing skill and the episode kit. Use `max(3, ceil(proseWords / 500))` as the hard em-dash threshold. Keep passive/nominalisation/`-ing`/phrasal/modal rules warning-only. Return findings with `mode` (`source-audit` or `ci`), `file`, `line`, `column`, `rule`, `severity`, `match`, and optional `suggestion`.

- [ ] **Step 4: Run the focused tests**

  Run: `npx vitest run lib/prose-lint.test.ts -t "rule|allowlist|severity|sort"`

  Expected: PASS.

### Task 4: Add CLI modes and package scripts

**Files:**
- Create: `scripts/lint-prose.mjs`
- Modify: `package.json`
- Modify: `lib/prose-lint.test.ts`

- [ ] **Step 1: Write failing CLI tests**

  Test `--files`, `--format table|json`, `--ci`, `PROSE_BASE`, sorted output, audit exit code 0, CI exit code 1 for hard findings, and exit code 2 for input/masking errors.

- [ ] **Step 2: Run the focused tests**

  Run: `npx vitest run lib/prose-lint.test.ts -t "CLI|exit|format"`

  Expected: FAIL because the CLI and scripts are not wired.

- [ ] **Step 3: Implement the CLI**

  Resolve files from the manifest without relying on shell expansion. Use `git diff --name-only "$PROSE_BASE"` plus `git ls-files --others --exclude-standard` for changed mode, filter to manifest paths, and accept explicit `--files` overrides. Print compact tables by default and stable JSON when requested.

- [ ] **Step 4: Add package scripts**

  Add `lint:prose` and `lint:prose:changed` entries that invoke the Node CLI directly.

- [ ] **Step 5: Run focused and repository tests**

  Run: `npx vitest run lib/prose-lint.test.ts` and `npm run typecheck`

  Expected: PASS.

## Chunk 2: Update the writing skill and baseline the source

### Task 5: Extend the existing blog-writing skill

**Files:**
- Modify: `.claude/skills/writing-blog-posts/SKILL.md`

- [ ] **Step 1: Add the validation section**

  Document the pinned episode kit, the manifest boundary, the linter commands, warning versus hard rules, generated sibling policy, and the fact that shared validation covers lab/project/hiking/app copy while MDX authoring details remain blog-specific.

- [ ] **Step 2: Run skill validation**

  Run: `python3 /Users/benebsworth/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/writing-blog-posts`

  Expected: PASS. The updated workflow explicitly runs `npm run lint:prose -- --ci` before the existing build/publish gates.

### Task 6: Produce a reproducible source baseline

**Files:**
- Create locally (untracked): `reports/prose-baseline.json`

- [ ] **Step 1: Run the full audit**

  Run: `mkdir -p reports && npm run lint:prose -- --format json > reports/prose-baseline.json`

  Expected: deterministic JSON with `mode: "source-audit"` and sorted files/findings; audit mode exits 0. Keep the report untracked and remove it after verification if `reports/` is not already a repository artifact directory.

- [ ] **Step 2: Categorise findings**

  Group by source family and rule. Identify safe mechanical rewrites versus sentences that require human judgment. Keep the baseline out of the commit unless existing repository policy says otherwise.

## Chunk 3: Apply the editorial pass

### Task 7: Rewrite blog posts in source batches

**Files:**
- Modify: `content/blog/**/index.mdx` (77 files, excluding `_article-backlog.mdx`)

- [ ] **Step 1: Rewrite older engineering and Kubernetes posts**

  Preserve commands, code, links, equations, frontmatter, and component tags. Replace only observed AI-tell patterns, filler, avoidable long sentences, and excess dashes. Keep the early collaborative voice and technical claims.

- [ ] **Step 2: Run the blog batch audit**

  Run: `npm run lint:prose -- --files content/blog`

  Expected: no hard findings; warnings reduced with no accidental MDX masking errors.

- [ ] **Step 3: Rewrite recent science, AI, and lab-linked posts**

  Keep intuition-first leads, cross-field asides, callouts, equations, and the author’s Australian spelling. Set `dateModified` only for material revisions.

- [ ] **Step 4: Run the full blog audit and inspect the diff**

  Run: `npm run lint:prose -- --files content/blog` and `git diff --check -- content/blog`

  Expected: no hard findings, no whitespace errors, no changed code/math/props.

### Task 8: Rewrite lab, project, hiking, and site copy

**Files:**
- Modify: `content/lab/**/*.mdx` (84 files)
- Modify: `content/projects/**/*.mdx` (2 files currently)
- Modify: `content/hiking.ts`
- Modify: `content/about.ts`
- Modify: selected files matched by `scripts/prose-sources.json` under `app/`, `components/`, and `lib/`

- [ ] **Step 1: Rewrite lab and benchmark prose**

  Keep task rubrics, model names, formulas, code, and experimental caveats exact. Use short explanatory sentences without replacing legitimate technical terms.

- [ ] **Step 2: Rewrite project, hiking, and about data**

  Keep route facts, dates, distances, certifications, and project claims unchanged. Simplify descriptions and UI-facing labels only where the linter identifies a real clarity or AI-tell issue.

- [ ] **Step 3: Rewrite app, component, and registry copy**

  Check home, navigation, metadata, empty/error states, Now, Uses, topic labels, and skill notes. Do not touch code identifiers or implementation comments.

- [ ] **Step 4: Run the source audit**

  Run: `npm run lint:prose -- --format table --ci`

  Expected: exit 0 with no hard findings and an explainable warning set.

## Chunk 4: Regenerate and verify the site

### Task 9: Regenerate blog siblings and check derived output

**Files:**
- Modify (generated): `public/blog/**/*.md`
- Modify: `scripts/gen-md-siblings.mjs`
- Test: `lib/md-siblings.test.ts`

- [ ] **Step 1: Regenerate siblings**

  Run: `npm run md:siblings`

  Expected: published blog siblings reflect source prose; drafts remain intentionally absent.

- [ ] **Step 2: Check generated drift**

  Add a non-mutating `--check` mode or exported comparison helper to `scripts/gen-md-siblings.mjs`, plus a `md:siblings:check` package script. It must render expected siblings into a temporary directory, detect stale siblings for removed/unpublished posts, compare without changing tracked output, and report a non-zero status. Cover published, draft, removed, and component-placeholder cases in `lib/md-siblings.test.ts`. Run `npm run md:siblings:check` and inspect `git diff -- public/blog`. Any generated diff must have a matching source MDX change.

### Task 10: Add prose-focused end-to-end checks

**Files:**
- Create: `e2e/prose-content.spec.ts`
- Modify: `e2e/theme.spec.ts`

- [ ] **Step 1: Add route coverage**

  Exercise `/blog/`, `/blog/hello-world/`, `/blog/how-space-itself-expands/`, `/lab/fourier-series/`, `/blog/overland-track-guide/`, `/projects/this-site/`, `/about/`, `/now/`, and `/uses/` in light and dark contexts. Assert visible headings/body copy, no page errors, and no failed local resource requests. Allowlist remote GCS/image requests.

- [ ] **Step 2: Run the focused e2e suite**

  Run: `npm run build && npm run e2e -- e2e/prose-content.spec.ts e2e/theme.spec.ts`

  Expected: PASS against the newly generated `out/` using the configured `npx serve out -l 4321` server.

### Task 11: Run the full verification gates

**Files:**
- No source changes expected.

- [ ] **Step 1: Run unit, type, lint, and build checks**

  Before running the build, save the existing `git status --short` and generated-file hashes. Run `npm run typecheck && npm run lint && npm run test && npm run build` without reverting unrelated worktree changes. The prebuild scripts may update benchmark/harness outputs; preserve those user-owned changes and review them separately.

  Expected: all commands PASS.

- [ ] **Step 2: Serve the static export and run the prose e2e suite**

  Run: `npm run e2e -- e2e/prose-content.spec.ts e2e/theme.spec.ts`

  Expected: all representative routes render in both themes with no console errors and no local 404s. Playwright uses its configured server and port 4321.

- [ ] **Step 3: Review the final diff**

  Run: `git diff --stat`, `git diff --check`, and `git status --short`

  Expected: intended source, skill, tests, package, and generator-produced sibling changes are present. Existing unrelated worktree changes and any prebuild-generated user data are preserved and called out separately.
