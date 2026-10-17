# Do design skills change what a model builds?

One question, two arms, one task. The landing-page task (`landing-page-morph`),
the same model, the same single iteration, and the only difference is whether
three design skills are prepended to the prompt.

## The result

| arm | rubric score | wall clock | output tokens | cost | artefact |
|---|---|---|---|---|---|
| baseline | **65** | 519s | 6,863 | $0.00 | `baseline.html` (27KB) |
| + design skills | **100** | 538s | 11,391 | $0.00 | `skills.html` (45KB) |

The rubric is the site's own: 35% responsive layout, 30% accessibility, 25%
visual consistency, 10% theme behaviour.

**What one iteration is worth: not much.** This is n=1 per arm. A deterministic
rubric can move a long way on a single sample, and 65 → 100 is the kind of jump
that needs replication before anyone calls it an effect. What it *is* good for
is showing the difference is real and worth measuring: the two pages are not
the same page with different polish.

## What actually changed

The baseline is competent and follows the brief literally: a centred hero on a
gradient, a pill badge above the headline, a two-tone accent phrase inside it,
three centred stats, and four identical icon-topped feature cards.

The skills arm takes a different approach to the same brief: a specific product
claim as the headline, one type face at display size, no gradient, no badge, and
an interactive migration demo in the hero instead of a feature grid. Every one
of those is on the banned list the skills carry — badge above a headline,
accent word inside a headline, gradient ground, icon-card row — so the rubric
and the design house style are pointing at the same thing.

## Reproducing

```bash
# baseline
RUN_MODELS=glm-5.3-coding-plan RUN_TASKS=landing-page-morph RUN_ITERATIONS=1 \
  RUN_PLUGINS=none npx tsx scripts/run-benchmark.mjs --bust-cache

# same arm, three design skills prepended to the prompt
RUN_MODELS=glm-5.3-coding-plan RUN_TASKS=landing-page-morph RUN_ITERATIONS=1 \
  RUN_PLUGINS=none \
  RUN_SKILLS_DIR=/Users/benebsworth/projects/harness/.agents/skills/omega \
  RUN_SKILLS=frontend-design,high-end-visual-design,minimalist-ui \
  npx tsx scripts/run-benchmark.mjs --bust-cache
```

The skills come from the harness's skill library, where they are vendored for
the agent to use. `--skills-dir` with no `--skills` is refused, and a name that
resolves to nothing prints a warning and runs the arm without skills, because an
arm that silently lost its injection is worse than one that says so.

Neither arm is published in `lib/lab/llm-benchmark/results.json`: the model is
GLM 5.3, and one of the two rows is an intervention, not the model. Publishing
the skills row as the model's score would be the exact mistake this experiment
exists to avoid. The evidence lives here instead.
