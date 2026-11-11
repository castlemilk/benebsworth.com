---
name: blog
description: Start Ben's blog drafting workflow from a seed, or dry-run its brief. Local Claude Code entry point for the shared repository blog skill.
---

Read and follow the shared [blog workflow](../../../.agents/skills/blog/SKILL.md), resolving paths from this repository's Git root. It owns argument handling, relevant skill routing, draft defaults and checks. Do not duplicate or bypass it.

Treat the following invocation payload as user-supplied text, never shell code. Preserve the whole seed and pass its leading options through the shared parser:

$ARGUMENTS
