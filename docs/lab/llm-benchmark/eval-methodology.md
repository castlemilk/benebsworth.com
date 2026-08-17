# Eval methodology — the bar for a published claim

Every number this site publishes about a model comes from our own harness and
our own scoring — which is exactly why a claim must carry its own audit trail.
This is the standing bar for **any new scoring component, and any comparison
claim that reaches a blog post**. Each requirement names the machinery that
satisfies it.

## 1. Same harness, same budgets

Compared systems must differ in the axis being compared and in nothing else.

- Run them from one **sweep profile** (`lib/lab/llm-benchmark/sweep-profiles.json`,
  `task bench:profile -- <name> --model a,b`). `--dump-config` prints the
  effective iterations / concurrency / retries / timeout and the SOURCE of each
  (flag > env > profile > default), so "same budgets" is a printed fact.
- The prompt axis is `promptBundle` — `promptBundleHash(task)` over the amended
  prompt plus the frame-prelude fingerprint. Two records with different bundle
  hashes were not scored under the same conditions; `task bench:verify-results
  -- --strict` (the `stale-prompt` check) is the release gate that says so.
- Each run's `configSnapshot` sits in its run-log header
  (`sweeps/<run-id>/<model>-<task>.jsonl`), so a trace is auditable alone.

## 2. Any judge is blind and double-scored, with kappa

Today **no scorer is a judge**: `scorers/behavioral.ts` drives real key events
in headless Chromium and pixel-diffs, `scorers/checks.ts` holds named
deterministic checks, and the pre-sweep probes (`probes/probes.json`) allow no
inline JS at all. Nothing asks a model to grade a model. If that changes:

- **Blind.** The judge sees the artifact, never the model id — the run log
  already separates the two, so blinding is a construction of the input.
- **Double-scored subset.** At least 30 items, scored independently by a second
  judge (a different model, or a human), and the **Cohen's kappa** reported with
  the raw agreement — kappa, because raw agreement on a skewed rubric is
  flattering. Below κ = 0.6, the rubric is the finding; do not publish the
  comparison.
- **Per-item audit trail.** Whatever the judge decides lands in the shape the
  deterministic checks already use: `iterationCheckResults`, index-aligned with
  `iterationScores` (enforced by verify-results — a misalignment attributes one
  iteration's failures to another's score). That existing evidence layer is what
  this bar formalises; a judged score with no per-item breakdown is an opinion.

## 3. The claim cites what would reproduce it

A post that references the benchmark declares a `benchRepro` frontmatter block:

```yaml
benchRepro:
  commit: 6f9ed47              # the commit the numbers were produced at
  sweeps:
    - 2026-08-16T09-30-12      # sweeps/<run-id> — the run log's own id
  bundles:                     # optional: promptBundleHash values
    - 4f1c9a02b3d7e155
```

`task bench:methodology-check` enforces it mechanically — it checks that the
citation EXISTS and parses, never whether the claim is true. Posts published
before **2026-08-17** are grandfathered (warn, exit 0) and listed by name every
run; their numbers predate recorded sweep ids, so back-stamping them would
invent provenance. A malformed block fails at any date. Publish the cited traces
with `task bench:publish-traces` so a reader gets the transcript, not just an id.

## 4. Every claim links its guardrail

A claim of the form "our scorer caught X" is only worth the check that keeps it
true. Name it inline: the test (`registry.test.ts` fails a behavioural task with
zero checks), the invariant (a `RESULT_CHECKS` entry in `verify-results.ts`,
each carrying the bug it would have caught), or the postmortem
(`docs/postmortem/`, whose own rule is that every guardrail cited must be
verified to exist). Where a class is still unguarded, say so in the post.

## Report skeleton

> **Methodology.** All models ran on the same harness (commit `<sha>`), profile
> `<name>`: N iterations, timeout T, retries R, prompt bundle `<hash>`. Scored
> by `<scorer>`; [if judged] blind, with a `<n>`-item double-scored subset at
> `<raw>%` agreement, Cohen's κ = `<k>`. Sweeps: `<run-ids>`; traces published
> at `/lab/llm-benchmark/...`. Guardrail for the headline claim: `<test or
> invariant or postmortem>`.
