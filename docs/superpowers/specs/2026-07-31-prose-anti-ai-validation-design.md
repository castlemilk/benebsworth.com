# Prose anti-AI validation and editorial pass

## Status

Approved scope from the user on 2026-07-31. This design applies the existing `writing-blog-posts` house style and adds the STE-flavored anti-slop checks from the linked episode.

## Goal

Review the site's reader-facing prose, preserve Ben's curious engineer's-notebook voice, reduce detectable AI writing patterns, and make the same rules enforceable for future content.

## Scope

The source-of-truth content includes:

- All published and draft posts under `content/blog/**/index.mdx` (77 posts).
- Lab explainers under `content/lab/**/*.mdx` (84 files).
- Project pages under `content/projects/**/*.mdx`.
- Trail and hiking guide prose, including data in `content/hiking.ts` and the Trailkit writing skill where it supplies reader-facing copy.
- Reader-facing copy in `app/`, `components/`, and other source modules: home, About, Now, Uses, navigation, footer, metadata, empty states, and errors.

Generated output is not hand-edited. `public/blog/**/*.md` remains a generated sibling of the MDX source and is regenerated after content changes. Build output, test fixtures, code, commands, math, URLs, JSX attributes, and internal implementation comments are outside the prose rewrite scope unless they are visibly shipped as user-facing copy.

## Editorial rules

The existing `writing-blog-posts` skill remains authoritative for voice and technical content:

- Lead with the post's counter-intuitive claim.
- Keep intuition before derivation and show failure modes.
- Use the author's collaborative `we` and occasional `I`, with direct reader address where useful.
- Keep British/Australian spelling, contractions, humour, honest hedges, and one genuine aside when they fit.
- Keep sentence-case headings, defined acronyms, concrete units, and the existing MDX component rhythm.
- Keep em dashes rare, with a budget of roughly one per 600–800 prose words.

The linked STE guide supplies the form checks, adapted for this voice:

- Prefer short common words and active verbs.
- Remove filler, marketing adjectives, stacked transitions, nominalisations, and avoidable passive voice.
- Split run-on sentences and paragraphs that carry too many ideas.
- Keep one name for one concept.
- Do not apply strict STE dictionary lockdown, American spelling, or no-contraction rules to essays.

## Linter design

Add a repository-local, deterministic linter in `scripts/lint-prose.mjs`. It accepts explicit files and globs, prints per-file JSON or a compact table, and exits non-zero only for hard violations in CI mode.

The linter first masks frontmatter, fenced code, inline code, display/inline math, URLs, JSX tags, and JSX attributes. It then checks prose for:

- AI-tell phrases from the current house style and the linked STE linter.
- Marketing adjectives and vague verbs such as `leverage`, `utilize`, and `ensure`.
- Repeated `not just … but …` and `it isn't … it's …` reveal constructions.
- Long sentences and long paragraphs.
- Passive voice, `-ing` main verbs, nominalisations, phrasal verbs, modal hedges, semicolons, and em-dash counts.
- Inconsistent names for the same concept where a rule can identify the spelling or phrase mechanically.

The report includes file, line, rule, severity, matched text, and a suggested replacement when the rule has a safe one. Warnings remain visible but do not block the build. Hard failures are limited to explicit AI-tell phrases, malformed masking, and an em-dash budget that is exceeded by a substantial margin. A small `allowlist` section in the linter covers legitimate technical terms and deliberate house-style phrases.

Add unit coverage in `scripts/lint-prose.test.mjs` (or the repository's existing Vitest location if that is the established convention) for masking, rule detection, false-positive protection, line mapping, and exit status. Add a package script for a full source audit and a CI-safe check for changed content.

## Content workflow

1. Run the linter over the source scope and save a baseline report outside the generated site.
2. Rewrite the highest-value violations by hand, preserving facts, equations, examples, links, component structure, and the author's voice.
3. Prefer local sentence edits over global search-and-replace. Do not rewrite code, commands, math, URLs, or JSX props.
4. Re-run the linter after each content group. Review the diff for meaning drift and accidental changes to frontmatter or MDX tags.
5. Set `dateModified` only when a post receives a material editorial revision. Do not change dates for punctuation-only cleanup.
6. Run `npm run md:siblings` to regenerate crawler-readable siblings.
7. Build the static site and inspect representative old, recent, lab, hiking, and project pages.

## Verification

The acceptance checks are:

- The linter's unit tests pass and its baseline report is reproducible.
- The changed source has no hard linter failures.
- `npm run md:siblings` completes and generated siblings contain the revised prose and component placeholders.
- `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` pass.
- Playwright exercises the blog index, representative pre-AI and recent posts, a lab explainer, a hiking guide, and About/Now/Uses in light and dark themes.
- Existing MDX component, math, image, navigation, and responsive rendering checks remain green.
- No generated `out/` or `public/blog/**/*.md` file is edited as a source change.

## Non-goals

- Do not change the site's visual design or MDX component APIs.
- Do not rewrite technical claims without a source or an explicit correction.
- Do not flatten every post into strict Simplified Technical English.
- Do not add an AI detector that makes probabilistic claims about authorship. The linter reports observable writing patterns only.
