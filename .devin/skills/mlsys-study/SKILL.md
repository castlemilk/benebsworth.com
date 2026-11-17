---
name: mlsys-study
description: Step-through study loop for the Machine Learning Systems book (mlsysbook.ai, Harvard CS249r) — chapter study packets, review, quizzes, and one draft blog essay per chapter.
argument-hint: "[volN/NN] [packet|quiz|post]"
allowed-tools:
  - read
  - edit
  - grep
  - glob
  - exec
---

Read and follow the shared `.agents/skills/mlsys-study/SKILL.md` in this repository (resolve from the Git root). It owns the packet → review → test → post loop, the `study/` layout, progress tracking, and the blog-post handoff. Do not duplicate or bypass it.

Treat the user's invocation arguments as plain text: an optional unit (`vol1/08`) and/or phase (`packet`, `quiz`, `post`). Defaults: next unfinished unit in `study/mlsys/curriculum.md` order, next incomplete phase.
