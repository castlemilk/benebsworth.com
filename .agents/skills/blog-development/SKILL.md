---
name: blog-development
description: Improve Ben Ebsworth's blog through branch recovery, bounded implementation, visual critique, regression tests and verified release checkpoints. Use for blog navigation, articles, Labs, category artwork and related review loops.
---

# Blog development

Continue the real application, not an imagined replacement. The output of each cycle is a bounded improvement with reproducible evidence and an explicit next decision.

## Recover before implementing

1. Read the latest user direction and the canonical backlog: https://chatgpt.com/space/page_8d9cfc951e9081918a9b9e720f19cb92. Respect its Agent Instructions. If inaccessible, use the last verified repository checkpoint and identify the gap; do not invent current claims.
2. Inspect existing checkout, AGENTS.md, Git status, worktree common directory, remote branch and PR base/head. Reuse the current owner and one build/browser session. Do not spawn tasks when the user asks to work here.
3. If the checkout is missing, use the existing authorized Git connection to list remote branches and clone the intended branch into a fresh directory. Test access now rather than assuming a past restriction still holds. Never reset or clean someone else's checkout. Read [recovery.md](references/recovery.md) for recovery and dependency failures.
4. Distinguish the remote branch, unpublished local changes, build output and generated artwork. None substitutes for another. Check PR base as well as head: an editorial stack may target another feature branch rather than main.
5. Record the source SHA and dirty files before edits. If existing changes overlap, reconcile or stop that edit; do not overwrite them.

## Pick one coherent slice

Maintain Ready, In progress, Awaiting feedback, Blocked and Done states. Keep at most eight Ready items and add at most three evidence-backed candidates per cycle. Each item needs impact/effort, source baseline, acceptance criteria, dependencies, owner, evidence and next decision. Archive completed work without losing receipts. Coordinate with the combined product loop through this same queue; latest product priorities take precedence over an old rotation.

Use a complete journey as the review boundary, even when the fix is small: discovery → filter/search → article or experiment → return. Do not treat a passing isolated component as a successful journey.

## Preserve this blog's identity

- Editorial hierarchy, readable technical prose, red handwritten annotations and curved sketch connectors.
- Custom topic symbols: EE circuit, Cosmology black hole, Physics atom, Software floppy disk, Algorithms graph and a distinct AI brain. Reuse approved SVGs and visible labels; do not silently generate replacement logos.
- Canonical technology marks such as Kubernetes retain their geometry and colours. Preserve an existing verified raster fallback rather than fabricating a vector.
- Soft coloured lozenges, circular hand-drawn marks where approved, light/dark legibility and restrained motion with reduced-motion support.
- Scientific diagrams remain exact code/data-driven diagrams. Concept artwork is not scientific evidence or proof of working WebGL.
- Topic changes must not silently reclassify curated posts, change existing Labs filter keys or equate AI with Algorithms.

## Run the feedback layers honestly

Load available design-taste-frontend, gpt-taste, frontend-design, Impeccable and Hallmark skills when present. Do not run unknown installers to obtain them. If unavailable, apply each as a distinct **manual review lens**, never claim an installed/executed check.

1. **design-taste-frontend:** hierarchy, composition, density and editorial rhythm across the whole screen. Is the primary task obvious?
2. **gpt-taste:** remove generic card grids, empty decoration and stock AI styling. Does each detail serve the topic and this author's identity?
3. **frontend-design:** typography, spacing, responsive layout, artwork crops and cohesive navigation. Examine desktop and narrow light/dark states.
4. **Impeccable:** keyboard/focus, names and selected states, contrast, target sizes, errors/empty states, reduced motion and interruption recovery.
5. **Hallmark:** distinctive finish and consistency across entry, cards, section headers, article markers and controls. Verify the polish does not obscure meaning.

For each layer record a concrete observation, severity, proposed correction and acceptance evidence. Major composition defects block visual acceptance even if tests pass.

## Use imagegen to explore, not to fake completion

When requested or useful for a meaningful new direction, load the available imagegen skill. Build a prompt from actual screenshot findings and approved art direction. Label inputs as reference or edit target. Generate a small set of differentiated concepts, preserving reviewed originals and exact logos. Label mockups **concept / not implemented** and charts **schematic** when appropriate. Inspect the result for inaccurate labels, invented content, weak contrast and visual drift. Keep prompts/version/asset identity. Never present a mockup as the running application, or regenerate a vector icon system as raster art.

## Present decisions at real stages

- Scope: current-state UI, observed problem, two or three concrete options and a recommendation.
- Prototype: actual screenshots or clearly labelled sampled motion, critique findings and next options.
- Verified result: before/after UI, tests separately from aesthetic acceptance, limitations and next choice.

Use native image attachments where supported. If capture is blocked, state visually unverified. Do not repeatedly resend unanswered choices. Silence is not design approval; continue only independent safe tests/preparation while a required decision is pending. Previously approved narrow fixes need no redundant style vote.

## Implement and verify

Add focused regression tests that fail against the previous behavior. Prefer actual component/DOM and journey checks over string-only assertions. Keep static asset identity checks as supplementary evidence.

Read the repository scripts and lockfile. Run scoped tests, type checks, relevant lint, then the full suite and production build for the final candidate. Bound workers and do not overlap builds. Include existing postbuild steps such as OG rewriting and Pagefind. Count skipped tests explicitly. Build success does not imply rendered design acceptance.

Verify actual browser behavior: repeated clicks, search/clear, selected state, keyboard focus, navigation and Back/Forward, long content, empty states, narrow width, themes and reduced motion where relevant. Use the environment's supported preview/browser path. Record what was not tested.

## Solidify the win

Update the checkpoint described in [checkpoint.md](references/checkpoint.md) before switching scope or waiting. Preserve prompts, reviewed assets and source changes through the authorized repository/Space path, not merely transient files. Do not claim a backup unless it is readable at that destination.

Separate: local source → local tested build → remote commit/PR → exact CI → deployed revision → live behavior. A merge or deployment must remain within the current specific authorization; the skill itself grants none. Use existing release paths, preserve audience, and stop for credentials/security/spending or unresolved product decisions. Never merge an unrelated editorial stack to ship a small icon fix.

After a completed stage, continue the next authorized stage. Stop dependent work at a concrete access/approval blocker, failed acceptance gate or requested decision, not at an arbitrary timer. Report meaningful results concisely; keep unchanged background checks quiet.
