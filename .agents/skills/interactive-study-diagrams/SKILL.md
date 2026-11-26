---
name: interactive-study-diagrams
description: Plan, build, and verify visual coverage throughout Study packets and technical blog posts on benebsworth.com. Use for chapter packets, model reports, science explainers, and interactive diagrams.
metadata:
  internal: true
---

# Interactive study diagrams

## Plan the whole reading path

For a new or substantially revised technical blog post or Study packet, inventory the substantive H2 and H3 sections before drafting. A heading that only groups subsections needs no entry. For each other heading, identify what a reader should be able to trace, compare, calculate, or infer. Choose the evidence that makes that task easiest. A worked paragraph, equation or lookup table can carry a teaching section. When a figure helps, name the question its marks or paths will answer. Record the primary figure or a brief proseOnly reason in the plan.

Save the inventory as `diagram-plan.json` beside `index.mdx` or `packet.md`. Use the visible heading text as the key. Plan in reading order so the later training, evaluation, and limitations sections get the same attention as the opening. A page-level explorer can orient the reader. Put each primary figure inside the section that explains it.

```json
{
  "source": "packet.md",
  "sections": {
    "Follow the cache writes": {
      "figure": "::fig[cache-writes]",
      "teaches": "Predict which layer keeps the oldest cached key.",
      "source": "Technical report Figure 4 and checkpoint config. The token count is illustrative."
    },
    "Glossary": {
      "proseOnly": "Use searchable definitions for the terms introduced in the cache walkthrough."
    }
  }
}
```

Use a Markdown image with descriptive alt text, a standalone MLSys chapter marker with its entry in `diagrams.json` or `charts.json` (`::fig[id]` or `::chart[id]`), or a standalone registered MDX component (`<Component />`). For a component whose Markdown sibling loses the visual, give the reader a static figure, a worked example, or a table nearby. Use `./name.svg` for blog images mirrored under `public/blog/<slug>/` and a site-root URL for a public Study image. Research packets use public images. Keep a brief or dry run at the planning stage.

## Choose the diagram

### Draw among suitable styles

Start with the sentence the reader should be able to finish, such as “These two requests miss the deadline because …”. For a new figure with several good treatments, shortlist two or three that expose the needed evidence at phone width. The options can vary the geometry, composition or annotation style. Use these as starting points and add your own.

| What the reader needs to see | Treatments worth considering |
|---|---|
| Which cases gained or lost against a baseline | Aligned dot plots, paired bars, before-and-after panels with a shared scale |
| Where time goes or work overlaps | Request swimlanes, a start/finish trace, a waterfall for serial stages |
| Which path a request or signal takes | A fork with labelled destinations, two overlaid paths with a direct key, side-by-side route sketches |
| Where a limit or distribution changes the decision | A curve with a labelled crossing, an enlarged view of the tail, a counted dot strip for discrete observations |
| Where something lives or changes state | A labelled cutaway, a highlighted layer in a stack, successive snapshots of the same object |

Style can vary even when the diagram family stays fixed. A timing trace could read like an instrument display with a threshold line, an annotated notebook sketch tracing one late request, or a wide view with a close-up of the missed deadline. Keep the treatments that let the reader answer the particular question. Follow any style the user has specified.

Filter first. For instance, an aggregate waterfall loses the identity of an individual missed request. Within the shortlist, draw once. For hand authoring, run this with the actual candidates from the section:

```sh
python3 -c 'import secrets, sys; print(secrets.choice(sys.argv[1:]))' 'request swimlanes' 'aligned arrival and finish traces'
```

The chapter engine supplies a shuffled preference order per section for the same decision. Carry the selected treatment into the outline or figure brief so drafting, repair and reel playback reuse it. If one treatment clearly wins, use it directly. A second scheduling policy on the same requests should inherit the first policy’s rows and time axis. A short definition can stay in prose.

Across unrelated figures, leave a habitual layout out of the draw when other options explain the evidence equally well. Keep units, semantic colours, contrast and the identities of recurring objects consistent. If the sketch hides the answer at reading size, try the next suitable option.

### Check the evidence

Start with the inference. Sketch what position, distance, overlap, direction or repetition would let the reader see it. A queue approaching saturation benefits from a continuous utilization axis. A shadow deployment needs a path that ends in a log and another that reaches the caller. For interactive figures, identify the control, the resulting change and what stays fixed. For model reports, cite the relevant figure, config, or equation and identify every illustrative input and assumption. Leave benchmark claims in the prose unless the visual uses the authors’ actual data and conditions.

Cover the adjacent prose and answer the planned question from the figure and caption. If the reader must compare two numerical outcomes, show both on a common scale with units and the assumptions needed to interpret them. For instance, with zero point zero and nearest rounding, an activation of 0.04 reconstructs as 0 at a step of 0.10 and as 0.04 at a step of 0.02. A diagram titled “Where a weak feature loses resolution” should expose that difference. A flow earns its place when following an arrow explains which dependency or state changes next. Use baseline inputs in the figure when a changed case belongs to the self-test.

At phone width, read the labels first and the caption second. If the caption retells every bar, keep the deciding observation and any assumption missing from the labels. Put the derivation in the worked passage. For an error chart, a useful caption tells the reader which input benefits from the finer step and which one clips.

If the opening links straight to a figure, read the opening question and then jump there. Name each case from the question and locate it using the labels or caption. A roofline can show the crossover at 100 FLOP/byte clearly while leaving readers to guess where their workloads fall. Labelling batch 1 at about 1 FLOP/byte and batch 256 at 227.56 FLOP/byte lets them use the curves immediately.

At 390 px, cover the caption and read the smallest decisive nonzero mark, its comparator and their unit with the chart at rest. Responsive charts may suppress a value inside a short bar even when the SVG fits perfectly. Put that value outside the bar or in a compact labelled row alongside the plot, then repeat the comparison at the same width. For a chart comparing devices across batches, group by batch so the reader compares devices doing the same work.

- **Mechanism or sequence**. Use a labelled SVG, a layer stack, or a flow. Organise it by what changes during a step. Read [Diagram Design](https://github.com/cathrynlavery/diagram-design) for layout and semantic patterns. Use the site's surface, foreground, and accent tokens. Give nodes and edges meaning and cap complexity by splitting a diagram into consecutive views.
- **Spatial mechanism**. Read `../anatomy/SKILL.md` for React and isometric construction. [Hairline](https://github.com/lucasmarkes/hairline) is a reference for quiet linework, layering, and pointer response. Use projected depth when it helps the reader locate a part or follow a path. Keep selection available through a named keyboard control and mirror it in the geometry.
- **Quantity that changes**. Reuse the vendored [Bklit](https://bklit.com) components in `components/charts/` for axes, grouped or stacked data, scales, and tooltips. Start with `components/study/study-chart.tsx` and `components/study/iron-law-explorer.tsx`. Put exact numbers in the DOM with units. Label a derived estimate and its inputs. Use colour and labels together.
- **Control**. Follow `../ui-sdk/SKILL.md` and `AGENTS.md`. Compare composition in [the UI SDK Sink](https://ui-sdk.dev/sink) and use the installed docs to verify APIs. Use tabs for independent views, radios for discrete values, and a slider for an ordered range. Use shipped entry points and named parts.

## Author and integrate

1. Put arithmetic in a pure module under `lib/study/`. Derive the geometry, active labels, accessible summary, and readout from the same state. Include a hand-calculated case and an invariant test when the diagram models a formula.
2. Pick a meaningful initial state and readable labels. Keep exact values separate from axis ticks. Use `components/study/use-reduced-motion.ts` for chart transitions, and make every state readable with motion reduced and when touch provides no hover.
3. For a study, use a named section and a table-of-contents target, or the existing chart and figure markers when their contracts match. For MDX, register the component in `components/mdx/mdx-components.tsx`. Add its short text equivalent in the Markdown-sibling component registry. Retain the static prose or figure where readers need an export or a no-script explanation.
4. Inspect the selected data with Playwright. Use Tab and arrow keys, then click or tap. Verify the output changes correctly and check mobile width, desktop, both themes, and reduced motion. Check the static build includes the study and the Markdown export contains useful material. Preview drafts in a disposable copy using its normal route.

## Review the coverage

1. Run `task lint:diagrams`. It checks all enrolled documents, including drafts. It validates heading coverage, section-local primary embeds, image references and blog mirrors, MDX registration, and MLSys marker manifest references. Use `task lint:diagrams -- path/to/diagram-plan.json` during a single edit. The full check runs as part of `task verify` and remote site checks. Enrol older documents when you substantially revise them.
2. Scan the figures in reading order alongside a neighbouring chapter. If a row of cards could take another section’s labels without changing what its geometry says, try a more informative shape or keep the explanation in prose. Repeated axes and layouts can help readers compare related cases. For each figure, try to answer its learning question using its labels, arrows, data and caption. Check legibility at phone width, including SVG labels, units, and a readable fallback for interactive results. Check that toy inputs are labelled as such and that factual claims hold against their cited sources. Review any supporting figures even when the plan names one primary.
3. Open the exported Markdown for the same document and verify the section still teaches the relationship through text, a figure, or a table. Include the coverage result and browser checks in the handoff.

Kolibri has [a Study plan](../../../study/research/kolibri/diagram-plan.json) and [a blog plan](../../../content/blog/kolibri-systems-tradeoffs/diagram-plan.json). Its shared `components/study/kolibri-explorers.tsx` connects a token walkthrough, an illustrative router, and a cache chart to semantic controls. Its math and tests live in `lib/study/kolibri-explorers.ts` and `lib/study/kolibri-explorers.test.ts`.
