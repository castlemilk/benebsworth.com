---
title: 'Astra extra high and SWE-2: lighthouses, racing cars and nine more tests'
date: '2026-09-22T00:00:00.000Z'
description: >-
  GPT-6 Astra at extra-high reasoning and Devin SWE-2 High run the same eleven
  tasks, including a rotating voxel lighthouse and a car racing game.
labels: 'software,machine-learning,llm,benchmarking'
release: true
heroImage: /blog/benchmarking-astra-devin/hero.webp
benchRepro:
  commit: 01ea98c5c678a2cb438739d8344933afb1fde355
  sweeps:
    - 2026-09-22T08-50-23
    - 2026-09-22T09-53-42
  scoringRun: 2026-09-22T11-23-58-astra-devin-final
markdown_url: /blog/benchmarking-astra-devin/
canonical_url: 'https://benebsworth.com/blog/benchmarking-astra-devin/'
---
I added two visual tasks to the [benchmark](/lab/llm-benchmark/): a detailed voxel lighthouse with an orbit camera, and a playable car racer. This run compares GPT-6 Astra at extra-high reasoning with SWE-2 High through the Devin CLI, across all eleven tasks.

The extra-high setting is explicit. The Codex wrapper passes `model_reasoning_effort="xhigh"` alongside `gpt-6-astra`. Devin gets the exact `swe-2-high` model identifier from its authenticated catalog. Neither relies on whichever model happened to be selected in the terminal last.

## Results

Scores are out of 100. Each cell shows the **mean (minimum to maximum)** across successful attempts. I requested three fresh attempts per task. Astra delivered **33/33** artifacts; SWE-2 delivered **32/33**, with its third lighthouse attempt hitting the 25-minute limit. Delivery does not mean every behavioural check passed.

| Task | Astra extra high | SWE-2 High |
| --- | ---: | ---: |
| [N-Body Field](/lab/llm-benchmark/3d-physics-animation/n-body-field/) | 97.0 (97 to 97) | 100.0 (100 to 100) |
| [Mini Platformer](/lab/llm-benchmark/advanced-game-building/mini-platformer/) | 99.0 (97 to 100) | 100.0 (100 to 100) |
| [Crypto Hash Race](/lab/llm-benchmark/security-tasks/crypto-hash-race/) | 98.7 (96 to 100) | 98.7 (96 to 100) |
| [Landing Page Morph](/lab/llm-benchmark/ui-building/landing-page-morph/) | 62.0 (62 to 62) | 100.0 (100 to 100) |
| [Equation Solver](/lab/llm-benchmark/advanced-mathematics/equation-solver/) | 100.0 (100 to 100) | 76.7 (30 to 100) † |
| [Physics Pendulum Wave](/lab/llm-benchmark/advanced-physics/physics-pendulum-wave/) | 100.0 (100 to 100) | 100.0 (100 to 100) |
| [Circuit Builder Teaser](/lab/llm-benchmark/advanced-electronics/circuit-builder-teaser/) | 100.0 (100 to 100) | 100.0 (100 to 100) |
| [Tic-Tac-Toe](/lab/llm-benchmark/advanced-game-building/tic-tac-toe/) | 100.0 (100 to 100) | 66.0 (30 to 100) |
| [Gateway Console](/lab/llm-benchmark/ui-building/gateway-console/) | 100.0 (100 to 100) | 100.0 (100 to 100) |
| [Voxel Lighthouse](/lab/llm-benchmark/3d-physics-animation/voxel-lighthouse/) | 97.0 (97 to 97) | 98.5 (97 to 100) · 2/3 completed |
| [Car Racer](/lab/llm-benchmark/advanced-game-building/car-racer/) | 97.0 (97 to 97) | 97.0 (97 to 97) |

Every other cell has three completed attempts. The lighthouse timeout remains in SWE-2’s trace and completion count; it is not included as a zero in the score mean. These are task-specific rubric scores, not a general coding ranking.

† One SWE-2 equation answer lists the correct four solution pairs, but its graphing script uses the browser DOM. The existing executable scorer tries that script in Node and awards 30; prose-only answers use a structural fallback. That low score is not evidence of an algebra error. This mismatch, and the landing-page animation check described below, make an overall league-table verdict unhelpful.

The new tasks are consistent on the tested interactions: all completed lighthouses and racers pass their behavioural checks. Their remaining point differences come from structural HTML heuristics. SWE-2’s Tic-Tac-Toe results are less consistent: one attempt fails to alternate turns, and another misses a winning line. Its third platformer also logs a `ty is not defined` error despite earning full points on the narrow movement checks. The trace is part of the result, not just the headline number.

## A lighthouse you can look behind

The [lighthouse task](/lab/llm-benchmark/3d-physics-animation/voxel-lighthouse/) asks for actual 3D geometry in a Minecraft / Roblox inspired style. Its brief includes a striped tower, lantern room, balcony, keeper’s cottage, rocky island, dock, boat, foliage, waves, birds and clouds. Automatic rotation reveals each side. Pointer dragging lets the reader inspect a particular view.

The automated checks cover rotation and pause, manual orbit from a frozen scene, and a camera reset that returns to the same view. They cannot tell us whether the lighthouse looks good, or whether the author used genuine 3D geometry. Those questions need the rendered artifact and source.

The first Astra attempt, pictured at the top of this post, uses WebGL geometry, depth testing and a shadow map. Its island has a stepped stone shore, stairs to the dock, a rowboat, a lit cottage, pine trees and balcony rails. The lighthouse remains easy to read against the darker sea.

![SWE-2's first lighthouse attempt: a striped voxel tower and cottage on a tiled island, with large foreground clouds obscuring the lantern.](/blog/benchmarking-astra-devin/blog/benchmarking-astra-devin/lighthouse-devin.webp)

SWE-2's first attempt uses its own projected 3D renderer on a 2D canvas: the source transforms cuboid vertices, applies perspective and sorts faces by depth. It includes the cottage, dock, boat, foliage and birds. Its large foreground clouds obscure the lantern in the reset view. That composition problem is visible here but earns no penalty from the interaction checks.

The screenshots in this post show each agent's **first attempt**, without source edits. The interactive task pages select the highest-scoring successful attempt instead.

## A racer that responds to the controls

The [car racer task](/lab/llm-benchmark/advanced-game-building/car-racer/) asks for acceleration, braking, steering, rival cars, collisions, off-road slowdown and laps with ordered checkpoints. It also asks for keyboard and touch controls.

The scorer drives the car with real keyboard events. Acceleration and steering must change the canvas and the vehicle telemetry requested in the prompt. Braking must reduce speed. Restart must clear speed and distance and restore heading.

That is a useful subset, but it is still a subset. Rival AI, collision realism, checkpoint ordering and touch controls are outside the automated checks. The telemetry also comes from the artifact itself. A passing score is evidence about the tested interactions, not proof that every part of the game works.

![Astra's first racer attempt: a full circuit surrounded by trees, with grandstands, a pond and four cars on the starting grid.](/blog/benchmarking-astra-devin/blog/benchmarking-astra-devin/racer-astra.webp)

Astra's first racer keeps the whole circuit on screen. Its scenery includes grandstands, lamp posts, a pond and forest, with the player identified as the lime car. The source includes off-road slowdown, rival movement, collisions and ordered checkpoint logic. Those features need longer playtesting than this benchmark provides.

![SWE-2's first racer attempt: a close camera follows the player car, with a track minimap and compact race controls.](/blog/benchmarking-astra-devin/blog/benchmarking-astra-devin/racer-devin.webp)

SWE-2 chooses a close following camera and a minimap. Its compact HUD makes the player car easier to pick out, while the full circuit is less visible. Both are recognisable racing games. The scores concern their tested behaviour, not a visual preference between these camera choices.

The check guardrail is [`checks.test.ts`](https://github.com/castlemilk/benebsworth.com/blob/5be874d4ba5ceb3abbfe3d75f7be0e2ba5b7f5de/lib/lab/llm-benchmark/plugins/visual-games/checks.test.ts): working fixtures pass, static fixtures fail, and missing controls keep their point budgets. An omitted button therefore cannot improve the score by shrinking its denominator.

## Methodology and reproduction

Both agents receive the same task prompts and offline execution contracts. The `astra-devin` profile uses three fresh attempts per task and four concurrent task/model jobs per sweep. Each generation has a 25-minute cap and zero transient retries. The shared runner retains its existing recovery for empty replies. Browser tasks use Chromium, with the harness’s existing 70% behavioural / 30% structural weighting. The browser runs with the recorded `partial` sandbox policy and prelude parity off. The corrected Devin sweep overlapped the first sweep on the same machine. Runtime records those conditions rather than an isolated speed comparison.

These are agent-system results. Codex and Devin bring different tools, system prompts and local rules, so the comparison does not isolate the underlying model. Both use a fresh scratch workspace under the repository's sweep directory. Three attempts can expose inconsistency but cannot establish a broad ranking of coding ability. Older rows used different prompts, scorers or sample counts. This table compares only the matched September runs.

Some older task rubrics are narrow. Landing Page Morph looks for spontaneous canvas or text changes. It does not operate the theme toggle or recognise a CSS-only transition. Equation Solver can fall back to structural scoring for a prose answer. Crypto Hash Race executes functional comparison checks but does not prove constant-time behavior. Those limits are visible in the task notes and matter when interpreting a high or low score.

The published demo is each task's highest-scoring successful attempt. Its score in the table remains the mean across successful attempts. The iteration trace exposes the other attempts, including failures.

The first Devin sweep exposed a wrapper error: Accept Edits mode allowed file creation but stopped at command approval. Its commentary could then pass through the old stdout fallback. I excluded that sweep from the comparison and cancelled its remaining lighthouse and racer attempts. Those cancellations are diagnostics, not model failures in this table. The corrected wrapper uses sandboxed Autonomous mode and asks for artifact creation through `exec`. Devin's direct file tools still prompt in that mode. A new preflight verifies both a command-created file and the final HTML. A missing artifact now fails instead of receiving a score for commentary.

Artifact review also found harness errors. Python import shims interfered with standard-library imports and split test blocks. HTML cleanup could discard the start of an already complete document. Canvas capture could read a cleared WebGL drawing buffer while the screen visibly animated. Each correction has a regression fixture.

Another staged pass failed every racer check because the CLI's TypeScript loader inserted a helper unavailable inside the browser. Vitest's different transform had hidden the bug. A new test runs the working fixture through the actual CLI loader and catches it. That staged pass is excluded too.

The final grading pass scores both sets of retained artifacts after generation finishes, one artifact at a time. It allows five seconds per screenshot and new-task control action, 20 seconds per check and 90 seconds per browser batch. Earlier screenshot and click deadlines were too short for the rendered WebGL scenes. A browser-launch race that leaked extra browser processes is also fixed. Both agents receive the same normalization and scoring, without manual source repairs or new model calls. Vendor dependencies must match bytes embedded in the original trace.

The new traces identify their source run and scorer commit. They retain original generation timestamps, runtimes and token estimates. Public traces redact credential-like strings, so a Python example in the trace may differ from the retained file used for execution.

CLI token counts are estimates. Astra ran through a Codex subscription. The Devin catalog listed SWE-2 High as free on the run date. Zero recorded API cost is not a subscription-cost or billing measurement. See the [Devin CLI documentation](https://devin.ai/cli) for the product route used here.

Astra began at commit `5be874d4ba5ceb3abbfe3d75f7be0e2ba5b7f5de`, with Codex 0.153.4, in sweep `2026-09-22T08-50-23`. The accepted Devin sweep is `2026-09-22T09-53-42`, using Devin 3000.11.1 and harness commit `2c3919956d10994da99a2d36928005b1713d58b1`. Task prompts are unchanged. The harness corrections above apply to both published sets. Final grading uses commit `01ea98c5c678a2cb438739d8344933afb1fde355` and sweep `2026-09-22T11-23-58-astra-devin-final`. It retains the 65 delivered artifacts and the one generation timeout. Task pages expose the generated output and iteration trace.

```sh
npm ci
npx playwright install chromium
task bench:devin-preflight
npx tsx scripts/run-benchmark.mjs --profile astra-devin \
  --model codex-gpt-6-astra-xhigh,devin-swe-2-high --dump-config
npx tsx scripts/run-benchmark.mjs --profile astra-devin \
  --model codex-gpt-6-astra-xhigh,devin-swe-2-high
```

The source prompts, model settings and per-check results matter more than a single average. They let us come back to a failure, reproduce it, and decide whether it belongs to the artifact or the scorer.
