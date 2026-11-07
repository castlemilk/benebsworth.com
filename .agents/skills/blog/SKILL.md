---
name: blog
description: Turn a seed prompt into a source-checked, illustrated MDX blog draft for benebsworth.com, produce a review pack, and publish only the explicitly approved version.
---

# Blog from a seed

## Destination and source of truth

The target repository is https://github.com/castlemilk/benebsworth.com. The production site is https://benebsworth.com. The default branch is master. Verify the checkout's origin before writing or pushing; never substitute another portfolio repo or a standalone HTML Site.

Read `.claude/skills/writing-blog-posts/SKILL.md` in this repository for the author's voice, content loader, supported MDX components, image paths and validation commands. Preserve concurrent work. A locally installed macro may have newer uncommitted changes: compare before replacing it.

The deliverable is `content/blog/<slug>/index.mdx` with valid frontmatter. New drafts must have `release: false` and `draft: true`. Mirror every image into `public/blog/<slug>/`. Reuse registered components such as Figure; do not add imports inside MDX. HTML may be a supplementary preview, never the source deliverable.

## From seed to review

1. Interpret the seed, audience, article kind and central argument. Use the existing editorial skill and relevant repository material. Verify volatile claims against primary sources and distinguish observations from predictions. Do not invent the author's experiences.
2. Write in Ben's curious engineer-notebook voice with Australian spelling. Preserve the human's actual point instead of filling a fixed template.
3. Combine independent image inputs: **style** (visual treatment), **theme** (article mood/desk), **topic** (the specific thesis). See [image direction](references/image-direction.md). Use actual screenshots for evidence; generated illustrations cannot stand in for tested UI. Record provenance and inspect for private data.
4. Prepare MDX, frontmatter, mirrored assets and a source list. Run the repository prose, content, type, lint and relevant rendering checks. Keep passed, failed and not-run distinct.
5. Produce a concise review pack: exact commit or content fingerprint; destination and proposed URL; full article preview in the native layout; hero/thumbnail and screenshot captions; metadata; primary sources; image/AI provenance; checks and blockers; changes since last review.
6. If blockers remain, say **not ready to publish** and resolve them. Otherwise ask: **Ready to publish this version to benebsworth.com?** Include the exact version and preview. Wait for explicit approval. A later content, asset, metadata or deployment-target change requires a new review.

## Publishing

Follow [remote publishing](../../../docs/remote-blog-publishing.md). Approval of a seed or draft is not approval to publish. Never infer approval from an assistant-generated report. Do not configure credentials, permissions, billing or production environments as part of drafting.

After approval, change the draft flags in a reviewed commit and run all checks on that exact commit. Use the repository's manual publishing workflow, not a local-only checkout or an unrelated Sites project. A pushed source commit is not a deployed article. Verify the deployment receipt and live post, images, metadata and feed before reporting published.

## Invocation and test

In Codex use `$blog "some seed prompt"`; clients exposing skill slash commands may offer `/blog`. Claude's adapter is `.claude/skills/blog/SKILL.md`. Do not promise that every client implements slash-command discovery.

For a safe first test: `$blog "What I learned checking an AI agent's work" --dry-run`. Treat `--dry-run` as instructions to produce a plan, file list and review criteria without publishing, dispatching workflows or changing release flags. This is a skill workflow, not a shell command.
