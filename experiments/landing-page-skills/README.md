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

## What one iteration is worth: not much

This is n=1 per arm, and the replication attempt did not complete: a second
skills run timed out three times at the 600s per-call cap. The baseline's single
run finished in 519s, so the arm that reads as "better" is also the one that sits
next to the cap. The skills arm emitted 11,391 output tokens against the
baseline's 6,863: +66% output for the same brief, and the extra time is the
visible cost. Anything that treats the rubric delta as free is wrong.

Re-running the arm needs `--timeout-ms` above 600000 to have a chance, and the
run log records the retries, so a failed replication is visible rather than
quietly averaged away.

## A failed rerun overwrites a good score

Worth knowing before anyone runs this again: the timed-out rerun replaced the
recorded score of 100 with `0 / timeout` in `lib/lab/llm-benchmark/results.json`.
`mergeResults` keys on (model, task, iteration) and takes the fresh record
whatever its outcome, so a flaky timeout destroys a good published score — the
opposite of the usual merge rule, where a re-run is an update only when it
succeeded. The published file was restored from git after the run; the fix
belongs in the merge, not in this experiment.


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

## The rubric and the human disagree, and that is the finding

The automated score says the skills arm is better (100 vs 65). Judged by eye, the
baseline is the better page. Both judgements are recorded, because the gap
between them is what the next iteration has to fix.

The rubric scores what it can measure: responsive behaviour, accessibility
landmarks and focus, colour contrast, theme behaviour — 95 of the 100 points
between those bands. Its "visual consistency" band (25%) rewards restraint and
compliance, which is exactly the direction the design skills push. So a plainer,
more literal page scores well without being a page anyone would buy: the skills
arm loses nothing measurable by being sparser and stranger, and the baseline's
gradient and badge cost it nothing because nothing penalises them.

A rubric cannot see craft. Hierarchy, whether the first screen states what the
product is, whether the type is deliberate, and whether the page reads as a real
commercial product are all judgeable by a person and invisible to the scorer.

### What changed in the judgement process

`review.html` is the review surface, and it is built around that disagreement
rather than around the score:

- **Full-screen rendering** for each arm. A landing page is a scroll, not a card;
  clipped to 640px both pages look like fragments of something, and the whole
  judgement is about what a visitor sees as they scroll.
- **Blinded arms.** The two pages are labelled A and B, the assignment is
  shuffled on demand, and which one had skills is withheld until you press
  reveal. A judge who knows the intervention is not a blind judge, and the rubric
  score is shown beside each page only as a reference to disagree with.
- **Criteria the rubric is blind to**, scored per arm: does the first screen
  state what the product is, does one thing lead the hierarchy, is the type
  deliberate, does it read as a real product, would you trust the brand with
  money, and does anything feel generated.
- **The verdict is recorded next to the score**, downloaded as `judgement.json`,
  including which arm won each criterion. A disagreement between the human and
  the rubric is a result, not a thing to be reconciled away.

Until the human judgement exists in a comparable form for every model on the
site, the rubric's `visual consistency` band should be read as a floor for
mechanical consistency, never as a measure of whether a page is good.


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
  npx tsx scripts/run-benchmark.mjs --bust-cache --timeout-ms 1200000
```

`--timeout-ms 1200000` is not optional for the skills arm: at the 600s default
it timed out on all three attempts.

The skills come from the harness's skill library, where they are vendored for
the agent to use. `--skills-dir` with no `--skills` is refused, and a name that
resolves to nothing prints a warning and runs the arm without skills, because an
arm that silently lost its injection is worse than one that says so.

Neither arm is published in `lib/lab/llm-benchmark/results.json`: the model is
GLM 5.3, and one of the two rows is an intervention, not the model. Publishing
the skills row as the model's score would be the exact mistake this experiment
exists to avoid. The evidence lives here instead.
