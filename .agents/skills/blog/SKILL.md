---
name: blog
description: Turn a seed into a researched, illustrated draft for benebsworth.com, or dry-run its brief. Use for a blog seed request in this repository; orchestrates its editorial, image and validation workflows without publishing.
---

# Blog from a seed

Turn the user's seed into a reviewable site-native draft. Use the relevant skills and context deeply; do not load every installed skill or invoke tools just because they exist. This entry point authors drafts. Publishing, pushing, merging, external messages and new scheduled jobs are outside this workflow.

## Invocation and arguments

In Codex CLI/IDE, use `$blog "seed prompt"` or select `blog` through `/skills`. In local Claude Code, the repo adapter supports `/blog "seed prompt"`. These are host-specific invocations, not a universal slash-command registration. See [invocation details](references/invocation.md). For a remote draft, PR handoff or a separately authorised release, read [the remote publishing path](../../../docs/remote-blog-publishing.md). A seed request still creates a draft only; this macro does not push, merge or dispatch publication.

Grammar, interpreted as text:

```text
[--dry-run] [--kind auto|technical|personal|science]
[--slug lower-case-slug] [--images auto|reuse|none] [--] seed text
```

Use the entire trailing seed, including spaces, links and quoted phrases. Leading options are optional; the first non-option begins the seed. `--` allows a seed beginning with dashes. Never interpolate the seed into shell commands. The read-only [argument parser](scripts/parse_seed.py) accepts a JSON object with an `arguments` string on stdin and returns normalized options, safe defaults and proposed paths. Use a tool's structured stdin or a safely quoted input; no `eval`, command substitution or dynamic-context shell injection. If the host appends `ARGUMENTS:`, take its value as the payload. In Codex, use the text accompanying the skill mention. Empty input needs one short question for the seed; unknown options need correction rather than silently changing intent.

Defaults: `kind=auto`, `images=auto`, `release: false`, `draft: true`. A supplied slug must be a safe directory name; otherwise choose a short descriptive slug after the brief and check for collisions. Never overwrite an existing post unless the user requested revising that post.

## Remote handoff

When remote work is requested, use an accessible repository clone/branch and the same editorial guidance; no Mac path is required. Inspect current master, open PRs and the production source receipt before choosing a base. The deployed site may include source absent from master. Follow the linked release document for validation, asset tracking and exact-commit evidence. Preparing a remote PR package is safe by default; pushing or opening a PR requires the user to request that external step. Existing Vercel integration may create public previews on pushes independently of the new Cloudflare workflow. Treat draft flags as site visibility controls, not confidentiality. Report workflow source, CI result, upload result and live verification separately. Never treat a configured workflow or a green Vercel comment check as proof of Cloudflare publication.

## First establish the brief

Resolve all repo paths from the Git root. Check `git status` and applicable instructions before edits. Preserve other work, including dirty science/lab content. Read `CLAUDE.md`, `.impeccable.md`, and [writing-blog-posts](../../../.claude/skills/writing-blog-posts/SKILL.md). That skill owns tone, MDX, image mirroring, components and checks; reuse it rather than copying its implementation here.

Read two relevant early voice examples from `hello-world`, `getting-started-with-tekton` and `two-number-sum`, then one nearby article for current conventions. Infer audience, intent, article form, central claim, useful length and output slug from the seed. State material assumptions briefly. Ask only for an essential missing fact, such as a personal experience the thesis depends on; proceed with independent work while waiting. Do not turn missing personal evidence into invented anecdotes or feelings.

Return a compact working brief containing:

- Seed, chosen kind, audience, purpose, thesis and assumptions.
- Observations supplied by the user; externally verifiable claims; opinions/predictions; unknowns. Keep these distinct.
- Relevant skills/context and why each applies; bounded research questions and proposed primary sources.
- Outline, provisional taxonomy from the actual loader/topic rules, and exact proposed output paths.
- Style + theme + topic image brief, reuse candidates, draft alt text and provenance.
- Checks to run, plus unavailable capabilities or essential questions.

For `--dry-run`, stop after that brief and one composed image prompt (or a reuse/no-image decision). Read local context as needed, but do not write files, fetch external sources, generate images, draft full articles, run a build, upload or publish. Identify sources as proposed and image QA as pending. This mode tests planning, not completion.

## Route by the actual work

| Need | Context and workflow to select |
|---|---|
| Technical deep dive | The relevant code/specification and nearby technical post. Use an available domain skill only if its scope matches, such as cloud architecture for cloud design. Use CI-fix skills only for an actual CI investigation, not merely an article mentioning CI. |
| Personal essay | Supplied observations and the early first-person voice. Separate what Ben did from what a vendor advertises. If observations are absent, use an explicitly provisional outline or opinion framing; never invent lived experience or measured savings. |
| Science/maths explainer | A primary source or authoritative reference, existing MDX/lab components and the actual model. Use the circuit-simulator skill for circuit-specific work when relevant. Verify the relationship and maths; generated artwork is not scientific evidence. |
| New interactive figure/UI | Inspect the registered MDX palette first. Use relevant available frontend/design guidance and browser QA only when new implementation is needed. No bespoke component merely to use another skill. |
| Artwork | Read [style + theme + topic](../../../.claude/skills/writing-blog-posts/references/blog-image-composition.md) and the available/requested imagegen skill. Keep art theme, site taxonomy and authorship independent. |
| Current OpenAI claims | Use available official OpenAI documentation tools/guidance. Check current capabilities against official sources; label predictions as opinions, not roadmaps. |

Discover available capabilities as needed. Missing optional tools should reduce scope honestly, not trigger unrelated installations, credential hunting, permission changes or a substitute claim of completion. Domain skills never authorize benchmark spending, deployments or external messages through this macro.

## Research, write and illustrate

Bound research by the brief: start with two to four questions and a small set of primary sources, usually three to five. Follow supplied links and relevant code first. Expand only for an unresolved claim or material contradiction. Record URLs, checked dates and the claims they support in review notes. Do not invent verification, timings, coverage or personal reactions. User observations can support first-person passages; sources support public facts; future expectations stay qualified. Keep private client names, credentials, runtime inventory and internal processes out of the article.

Build the article around the claim, concrete examples, trade-offs and remaining uncertainty. Follow the editorial skill's voice, Australian spelling and MDX conventions. Use existing components when they aid understanding. Do not force equations into an essay or arbitrary word counts/callouts into a short post.

Use actual `lib/content.ts`, `lib/topics.ts` and nearby frontmatter for metadata. New source goes to `content/blog/<slug>/index.mdx`, explicitly with `release: false` and `draft: true`. The user's request is a draft task even if a referenced runbook contains deploy commands. Never enable publication in the working checkout to make a preview appear.

Images follow the installed composition reference. Inspect existing approved assets first; reuse them when their subject and provenance fit. `--images reuse` permits existing artwork and supported derivatives, not fresh generation; `none` skips new artwork and records any missing hero. `auto` chooses reuse or the smallest useful generation set. A single master may support a thumbnail and inline header if both crops work; a separate header is justified only by its role. Use imagegen for generated artwork and supported processing for crop/resize/WebP. Mirror selected assets under both `content/blog/<slug>/` and `public/blog/<slug>/`. A remote handoff must include the actual tracked bytes in both locations; Library IDs and local sandbox paths are review references, not deployable image URLs. Keep private prompts and source notes out of this public repository and its public asset directory. Keep original assets and truthful captions/alt text; no generated text or fake screenshots.

Record text provenance, artwork provenance and review state separately. Planned images remain planned until generation succeeds. Existing article authorship is unknown unless evidenced. Review-only metadata such as `editorial-provenance.json` belongs alongside the source, not in the public mirror; do not claim unsupported loader fields create public labels.

## Verify and hand off

Use the existing Task workflows and scripts, reading their summaries for current arguments:

- Gate affected prose with `node scripts/lint-prose.mjs --files content/blog/<slug>/index.mdx --ci`; compile MDX and check required metadata, image mirrors and descriptive alt text.
- Regenerate Markdown siblings through `task build:gen:md`; confirm the draft is excluded and no public draft sibling remains.
- Run `task build` for a completed site draft. Because native draft routes are excluded, validate the actual rendered article in a disposable preview copy when needed. Temporarily enable only that copy, restore it afterward, and keep the authoring draft flags unchanged. Protect concurrent work from generated-file changes by using an isolated validation copy when appropriate.
- Run relevant existing tests. Use `task test:unit` for the unit suite; for a narrow existing test, invoke its installed runner with a specific file. New UI/components require their appropriate type, interaction and browser checks. Do not claim build/test coverage from a prose-only dry run.
- Inspect actual images and rendered content at mobile and desktop, light and dark. Check 160×112/128×96 cards, 85% opacity, hover and the 430×490 social artwork crop; verify current component dimensions rather than trusting stale numbers. Check readability, factual fidelity, cropping and loading, not just successful generation.

Place private review files under `output/blog/<slug>/`: `ARTICLE.md`, `brief.md`, `sources.md`, `image-brief.md`, `verification.md` and a portable `preview.html` when available. Keep them outside `public/`. Report exact completed checks, warnings and remaining blockers; distinguish source draft from disposable preview output.

Use a supported native artifact/Library route when available, following its skill and preserving existing identities on revision. Otherwise return accessible local files and the verified limitation. Never upload elsewhere as a workaround. Give the user a concise draft summary, paths/artifacts, image identities when supported, provenance and review decisions. Finish at review: no commit, push, publication, deployment or external communication.
