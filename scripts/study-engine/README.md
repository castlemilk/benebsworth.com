# Study authoring engine

Use chapter mode for a full MLSys reading packet. The architect reads a bounded map of the source, chooses the sequence and writes the thesis and core explanations. Section writers receive those explanations, the relevant source passages, a worked case, a likely misconception and a figure brief. A separate reviewer invocation reads the assembled chapter. Local code compiles the figures, explainers and self-test into the native reader.

## Generate a chapter

The default chapter profile, `mixed`, uses Sol 6.2 for planning, Terra 6.1 for writing and repairs, and Luna for review. Use `--profile astra` on `chapter` for an Astra 6.2 run from source through final review. Omit `--outline` to include a new model-specific plan. Both profiles use high effort for planning, medium for writing and repairs, and low for review. Each call records its actual model and effort in `run.json`.

The chapter spec needs an ID, title, opening question and source file and URL. An optional `focus` gives the architect an editorial direction. An optional `seedBrief`, relative to the spec, carries forward an existing worked example from the same source. The [compression](examples/compression-chapter.json) and [hardware](examples/hardware-chapter.json) specs demonstrate both.

```sh
npm run study:engine -- outline scripts/study-engine/examples/compression-chapter.json \
  --out .cache/study-engine/compression-outline

npm run study:engine -- chapter scripts/study-engine/examples/compression-chapter.json \
  --outline .cache/study-engine/compression-outline/outline.json \
  --out .cache/study-engine/compression-chapter

npm run study:engine -- report .cache/study-engine/compression-outline .cache/study-engine/compression-chapter
```

Each output directory must be new. Inspect or edit `outline.json` before expansion. The architect can assign a different `targetWords` to each section so a mechanism with several steps gets more space than an introductory decision. Its source and spec fingerprints travel with it. The engine checks its source coverage, core teaching material and figures when loading it. For a single uninterrupted run, omit `--outline` from the chapter command. Both paths use the same model-response cache and budget flags. With a separately saved outline, report both receipts to include planning cost.

Fresh outlines include `glossTargets` for each section. Each target names a different decision a reader might get wrong. The writer places a distinct highlighted explainer for each, and the reviewer checks what the cards teach. Judge numerical figures from their values, labels and caption with the surrounding prose covered. Saved outlines from before this guidance retain their original writer and reviewer prompts. Pass the saved `--outline` and matching model profile to replay them from cache.

For full chapters the outline can use a `visual` of kind `bars`, `flow` or `custom` (a static SVG), or a `proseOnly` reason. Place a figure with `visualAfter` set to `mechanism`, `worked` (the default) or `diagnosis`. Pick the geometry and position from the reader’s task. Repeating a format can help when two examples invite direct comparison.

The architect gets a per-section draw to choose among equally suitable styles. The chapter ID makes the default draw repeatable. To explore another treatment, set e.g. `"visualSeed": "second sketch"` in the spec and generate a fresh outline. Use the same spec and seed when comparing authoring models. Replaying an approved outline uses its saved figures.

The section writer expands neighbouring sections in pairs. The saved `first-draft/` records the assembled draft. The engine checks the seeded exercise across the entire packet, including back matter and figure captions, and the reviewer checks the assembled chapter in a separate call. A correction goes to the responsible section or chapter text. The expansion produces `packet/` only after review. When browser inspection finds a wording issue, the saved plan accepts `copyEdits` containing a section ID (`sectionId`), an exact passage (`from`) and its replacement (`to`). These edits run locally on the reviewed teaching prose and repeat the transfer-answer check. Inspect `packet/packet.md`, `packet/diagram-plan.json` and `packet/quiz.md` together, or open the chapter using the preview command below. Look at a complete chapter's reading experience, including what the learner must infer from the figures and what the questions ask them to transfer. The one-section pilots below are useful fixtures for testing individual model calls.

## Run the two pilots

From the repository root, use the pinned local book checkout described in the [MLSys skill](../../.agents/skills/mlsys-study/SKILL.md). Live generation uses an authenticated local Codex CLI. Planning, compiling, tests and fully cached replays run locally.

```sh
npm run study:engine -- plan scripts/study-engine/examples/*-pilot.json
npm run study:engine -- run scripts/study-engine/examples/*-pilot.json \
  --profile lean --review-size 2 --max-calls 6 --out .cache/study-engine/my-run
npm run study:engine -- report .cache/study-engine/my-run
```

The output directory must be new. A single brief yields `packet/` and `run.json`. Multiple briefs yield `packets/<chapter-id>/packet/` and a shared top-level receipt. Each packet includes Markdown, a diagram plan, diagram assets and the native quiz manifests. Rejected runs record diagnostics and token usage. A packet appears only after every included section passes.

Use `--profile lean` for a Luna low-effort writer or `--profile reference` for a Sol 6.2 high-effort writer. Both use Terra 6.1 low for review and Sol 6.2 medium for one focused repair per section. The default review window holds two independent sections. Set `--review-size 1` to isolate judgments or try up to four on a later comparison. Each individual writer sees only its section. A rejected section gets its own feedback and returns to review.

`--max-calls` caps new CLI invocations. `--stop-after-tokens` checks accumulated reported input plus output before admitting the next live call. A call in progress can cross the threshold. `--max-calls 0` replays only cached work. The cache key includes the exact prompt, role, model, effort and adapter version. A text or source edit can reuse unaffected writers. If a member of a review group changes, that group gets a fresh review. Local compilation and styling changes can replay model replies for free.

Run `report` on the top-level run directories. It reports incremental tokens and a second total that includes the measured original calls behind cache hits. It retains available usage for failed attempts and flags missing provider usage. To estimate USD, supply `--rates path/to/rates.json` with numeric `input`, `cachedInput` and `output` prices per million tokens under each model ID. Provider-cached input is a subset of input. A local cache hit consumes zero incremental tokens.

## Author a brief

Start from the [compression brief](examples/compression-pilot.json) or [tile-capacity brief](examples/hardware-pilot.json). Add one entry per learning objective in reading order.

- Give the pinned source file and URL, an exact source heading and retrieval terms. The planner shows the excerpt line ranges and other chapter headings. Inspect the selected passages. The default allowance is 2,200 UTF-8 bytes per section and can be changed with `maxBytes`. Unresolved Quarto expressions are flagged for verification.
- Define the case and its units. Give observed or illustrative quantities separate names in the ordered `facts` ledger. Derived facts use `["+", "weights", "activations"]` or the other supported operators `-`, `*`, `/` with previously declared facts or numeric literals. The compiler substitutes the calculated values into the lesson, graphic and quiz. Include unit conversions explicitly.
- Name the quantities the learner should work through in `workedFacts`. Use `transfer` to describe a changed input, `answerFact` for the required result and `answerUnit` if the figure uses a different unit. The checker catches missing worked values and an explicit or distinct numeric answer leaked before the transfer. The reader should be able to solve it from the question alone.
- Select a visual that teaches the relationship. For comparisons, supply `visual.unit` and `rows` of `{label, fact}`. For a sequence, set `visual.kind` to `flow` and provide 2–6 `steps` of `{label, detail}`, plus `answerUnit` for the numeric transfer. For a bespoke quantitative sketch, use `kind: "custom"`, pass the source in `visual.svg` and interpolate baseline values with `{{factName}}`. Supply `answerUnit` for the numeric transfer. All three forms use a title and an explanatory caption. The lower-level compiler also accepts native charts and equations. The brief runner currently generates worked quantitative lessons.
- Inspect the section in the actual reader. Verify the arithmetic independently, read the question without opening its answer and try the figure at phone width. Use the standard chapter workflow for specialist interactives, audio and learner review.

## Open a private local preview

```sh
node scripts/study-engine/preview.mjs .cache/study-engine/my-preview \
  .cache/study-engine/my-run/packets/vol1/01_compression_pilot \
  .cache/study-engine/my-run/packets/vol1/02_hardware_pilot
MLSYS_PREVIEW_ROOT="$PWD/.cache/study-engine/my-preview" \
  node_modules/.bin/next dev --hostname 127.0.0.1 --port 4379
```

The preview builder prints the native chapter URLs and uses a fresh directory. From a second terminal run the browser check.

```sh
node scripts/study-engine/preview.browser.mjs .cache/study-engine/my-preview http://127.0.0.1:4379
node --test scripts/study-engine/*.test.mjs
```

## What the pilot measured

We used identical single-section briefs for the Chapter 10 resident-memory decision and Chapter 11 tile-capacity decision. The signals were source support, independently reproducible arithmetic, a readable figure, a working gloss, one plausible misconception and an unseen changed-input question. The two briefs used 2,183 and 2,141 source bytes extracted from 622,174 and 623,224 bytes respectively. These byte counts describe retrieval only. All token figures below come from live Codex usage receipts. [Per-call measurements](examples/pilot-measurements.json)

| Writer and review strategy | Writer tokens for both | Initial review tokens | Repair and re-review | Total tokens for two accepted sections |
| --- | ---: | ---: | ---: | ---: |
| Luna, separate reviews | 38,737 | 26,711 | 0 | 65,448 |
| Luna, paired review | 38,737 | 14,893 | 0 | 53,630 |
| Sol, separate reviews | 30,772 | 26,873 | 0 | 57,645 |
| Sol, paired review | 30,772 | 15,014 | 29,723 | 75,509 |

The paired runs reused the exact writer replies from the separate runs. Each table row counts that original writer usage once to compare the full workflow. Incremental usage for the paired runs was 14,893 and 44,737 tokens. A subsequent replay of each pair used zero model calls and produced byte-identical packets. Model subscription usage did not provide dollar charges. Prepared briefs, engine development and human review time are outside the totals.

The first iteration exposed two distinct failures. Luna gave away the hardware transfer result in its prose. Sol explained the compression rule but omitted its worked calculation. An independent reviewer accepted both. The engine now checks for both defects locally before spending tokens on review.

In the revised paired runs, both writers produced the 44 MiB compressed footprint and both hardware lessons arrived at 88 KiB with 8 KiB spare. Terra caught that Sol’s hardware question only asked for the total even though the brief also required fit and remaining capacity. It sent that section through repair. Luna’s prompt already asked for all three. One Luna writer invocation consumed 25,298 input tokens on a 5 KB prompt, illustrating why the smaller model can use more tokens. Each CLI call carries context beyond the lesson itself.

Use this pair as a repeatable calibration sample. Across new chapters, track tokens per accepted section alongside first-pass acceptance, incorrect calculations, answer leakage, rendering defects, editor time and learner performance on fresh transfer questions. This pilot measures production effort and lesson checks. Learner retention and whole-chapter costs still need observations.
