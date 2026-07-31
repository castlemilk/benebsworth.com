# Prose anti-AI validation and editorial pass

## Status

Approved scope from the user on 2026-07-31. This design applies the existing `writing-blog-posts` house style and adds the STE-flavored anti-slop checks from the linked episode.

## Goal

Review the site's reader-facing prose, preserve Ben's curious engineer's-notebook voice, reduce detectable AI writing patterns, and make the same rules enforceable for future content.

## Scope

The source-of-truth content includes:

- All published and draft posts under `content/blog/**/index.mdx` (77 posts).
- All current lab prose under `content/lab/**/*.mdx` (84 files on disk: 81 tracked files plus the 3 harness suites already present in this worktree).
- Project pages under `content/projects/**/*.mdx` (2 files: `this-site.mdx` and `nutry.mdx`).
- Trail and hiking guide prose, including data in `content/hiking.ts`. The Trailkit skill and reference remain authoring instructions, not shipped copy, so they are explicitly excluded from the linter.
- Reader-facing copy in `app/`, `components/`, and other source modules: home, About, Now, Uses, navigation, footer, metadata, empty states, and errors.

Generated output is not hand-edited. `public/blog/**/*.md` remains a generated sibling of the MDX source and is regenerated after content changes. Build output, test fixtures, code, commands, math, URLs, JSX attributes, and internal implementation comments are outside the prose rewrite scope unless they are visibly shipped as user-facing copy.

The validation reference is the pinned episode kit at [woosal1337/blog/videos/ep01-the-cure-for-ai-slop](https://github.com/woosal1337/blog/tree/main/videos/ep01-the-cure-for-ai-slop), specifically `ste-writing-skill.md` and `ste-lint.py` as inspected for this task on 2026-07-30. The implementation copies the relevant rule names and thresholds into repository code so later upstream changes cannot silently alter this site's checks.

## Editorial rules

The existing `writing-blog-posts` skill remains authoritative for voice and technical content:

- Lead with the post's counter-intuitive claim.
- Keep intuition before derivation and show failure modes.
- Use the author's collaborative `we` and occasional `I`, with direct reader address where useful.
- Keep British/Australian spelling, contractions, humour, honest hedges, and one genuine aside when they fit.
- Keep sentence-case headings, defined acronyms, concrete units, and the existing MDX component rhythm.
- Keep em dashes rare, with a budget of roughly one per 600–800 prose words.

Update `.claude/skills/writing-blog-posts/SKILL.md` to add the shared prose-validation workflow, the linter commands, the source/generated boundary, the warning-vs-hard rule policy, and the requirement to run the linter before the existing build/publish gates. Add an explicit note that this shared validation also applies to lab, project, hiking, and reader-facing app copy even though the skill's MDX authoring details remain blog-specific.

The linked STE guide supplies the form checks, adapted for this voice:

- Prefer short common words and active verbs.
- Remove filler, marketing adjectives, stacked transitions, nominalisations, and avoidable passive voice.
- Split run-on sentences and paragraphs that carry too many ideas.
- Keep one name for one concept.
- Do not apply strict STE dictionary lockdown, American spelling, or no-contraction rules to essays.

## Linter design

Add a repository-local, deterministic linter in `scripts/lint-prose.mjs`, driven by a checked-in `scripts/prose-sources.json` manifest. The manifest includes `content/**/*.mdx` except `content/blog/_article-backlog.mdx`, plus `content/about.ts`, `content/hiking.ts`, `content/projects/**/*.mdx`, reader-facing `app/**/*.tsx`/`app/**/*.ts`, reader-facing `components/**/*.tsx`, and selected registries such as `lib/topics.ts`, `lib/skill-provenance.ts`, `lib/content.ts`, and `app/llms.txt/route.ts`. It excludes tests, benchmark result blobs, generated output, lab implementation code, and comments. The linter accepts explicit files and globs, prints per-file JSON or a compact table, and exits non-zero only for hard violations in CI mode. Add `lint:prose` and `lint:prose:changed` package scripts. Use `reports/prose-baseline.json` as the reproducible local baseline path, keep it out of `out/` and generated `public/blog/`, and do not commit it unless the repository already tracks audit reports.

Define `lint:prose` as the full source audit over sorted explicit globs. Define `lint:prose:changed` as a Node entry point that reads `PROSE_BASE` (default `HEAD`) and lints only changed files under the supported source globs. Both commands must work without shell-specific glob or pipe behaviour, and both accept `--files <paths...>`, `--format table|json`, and `--ci`. In `--ci` mode, return exit code 1 for hard findings and 2 for input or masking errors. In audit mode, return 0 after printing warnings so the first baseline can be measured.

The linter has format-specific extraction before checking prose:

- For MDX, check `title`, `description`, and `takeaways` as explicit reader-facing frontmatter fields; mask the rest of frontmatter, fenced code, inline code, display/inline math, URLs, JSX tags, and JSX attributes. Preserve quoted prose and map every finding back to its source line.
- For `content/about.ts`, `content/hiking.ts`, the selected TS registries named in the manifest, app metadata, and TSX, inspect only visible string literals and JSX text plus selected user-facing attributes (`aria-label`, `alt`, `title`, `placeholder`, button/link labels, and metadata descriptions). Exclude imports, identifiers, comments, test fixtures, generated benchmark HTML, and code strings.
- If masking or extraction cannot prove that a region is safe, emit a deterministic `masking` error and fail CI rather than linting the region as prose.

It then checks prose for:

- AI-tell phrases from the current house style and the linked STE linter.
- Marketing adjectives and vague verbs such as `leverage`, `utilize`, and `ensure`.
- Repeated `not just … but …` and `it isn't … it's …` reveal constructions.
- Long sentences and long paragraphs.
- Passive voice, `-ing` main verbs, nominalisations, phrasal verbs, modal hedges, semicolons, and em-dash counts.
- Inconsistent names for the same concept where a rule can identify the spelling or phrase mechanically.

The report includes file, line, rule, severity, matched text, and a suggested replacement when the rule has a safe one. Sort findings by path, line, column, and rule for stable output. Warnings remain visible but do not block the build. The report distinguishes `source-audit` mode from `ci` mode. Hard failures are limited to explicit AI-tell phrases, malformed masking, and an em-dash budget over `max(3, ceil(prose_words / 500))`; all other rules are warnings. A small `allowlist` covers legitimate technical terms, quoted copy, Australian spelling (`utilise`, `optimise`, `minimise`, `initialise`, `visualise`), deliberate house-style phrases, and Ben's permitted hedges (`perhaps`, `probably`, `I think`, `could`).

Add unit coverage in `scripts/lint-prose.test.mjs` (or the repository's existing Vitest location if that is the established convention) for masking, rule detection, false-positive protection, line mapping, visible JSX/TS string extraction, and exit status. Add fixtures for technical terms, contractions, Australian spelling, code/math/URLs/JSX, quoted copy, and allowed hedges. Add a package script for a full source audit and a CI-safe check for changed content.

## Content workflow

1. Run the linter over the source scope and save a baseline report outside the generated site.
2. Rewrite the highest-value violations by hand, preserving facts, equations, examples, links, component structure, and the author's voice.
3. Prefer local sentence edits over global search-and-replace. Do not rewrite code, commands, math, URLs, or JSX props.
4. Re-run the linter after each content group. Review the diff for meaning drift and accidental changes to frontmatter or MDX tags.
5. Set `dateModified` only when a post receives a material editorial revision. Do not change dates for punctuation-only cleanup.
6. Run `npm run md:siblings` to regenerate crawler-readable siblings for published posts. Draft and unreleased source prose is still linted, but it has no generated sibling by design. Generated sibling diffs are expected artifacts and must be regenerated, never hand-edited; stale siblings for removed or unpublished posts must be deleted by the generator or reported as an error.
7. Build the static site and inspect representative old, recent, lab, hiking, and project pages.

## Verification

The acceptance checks are:

- The linter's unit tests pass and its baseline report is reproducible.
- The changed source has no hard linter failures.
- `npm run md:siblings` completes and generated siblings contain the revised prose and component placeholders. The check compares fresh generator output with the working tree and permits only those generated sibling diffs. No sibling is required for lab or project MDX because those routes do not use the blog sibling generator.
- `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` pass.
- Playwright exercises `/blog/`, `/blog/hello-world/` (pre-AI), `/blog/how-space-itself-expands/` (recent science), `/lab/fourier-series/`, `/blog/overland-track-guide/`, `/projects/this-site/`, `/about/`, `/now/`, and `/uses/` in light and dark themes. Each route must have no console errors, and all local resources must load. Remote GCS/image requests may be allowlisted and recorded separately so they do not make the local prose regression flaky. Visible headings and body copy must match the revised source.
- Existing MDX component, math, image, navigation, and responsive rendering checks remain green.
- No generated `out/` file is hand-edited. Any `public/blog/**/*.md` diff must be produced by `npm run md:siblings`; a source review must show the corresponding MDX change.

## Non-goals

- Do not change the site's visual design or MDX component APIs.
- Do not rewrite technical claims without a source or an explicit correction.
- Do not flatten every post into strict Simplified Technical English.
- Do not add an AI detector that makes probabilistic claims about authorship. The linter reports observable writing patterns only.
