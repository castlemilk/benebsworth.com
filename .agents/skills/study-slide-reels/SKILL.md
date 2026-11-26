---
name: study-slide-reels
description: Storyboard, author and review the timed slides that accompany narrated study chapters and research lessons on benebsworth.com. Use for transcript visuals, audio cue sheets, content reels, or a low-fidelity video built from stills and equations.
---

# Study slide reels

## Storyboard against the voice

Read the source lesson, its `podcast.md` and the available figures and equations. For an existing recording, use the read-only cue sheet to see where visuals change and which turns hold the previous slide. Add `--turn 10` to inspect a full utterance, its active visual and where that visual began.

```sh
python3 .agents/skills/study-slide-reels/scripts/cue_sheet.py study/mlsys/vol1/11-hw-acceleration/transcript.json
```

Write the question a listener should be able to answer at the end. Sketch one row per change of idea using **spoken phrase | what to look at | asset or hold**. For a new script, introduce the visual early enough to give the listener time to inspect it. For recorded speech, attach the visual to the existing turn. Cues take effect at the **start** of the turn, even if the marker is written after its final sentence.

Hold a frame across speakers when the second voice uses the same evidence. Read the first claim of each uncued turn against the frame it inherits. At 3:01 in Benchmarking, the speaker moves from pipeline speedup to slow requests. The inherited Amdahl equation has no latency distribution to inspect. Cue a distribution at the first mention of the tail. A second speaker continuing the same calculation can keep its equation. Revisit an earlier frame when the conclusion gives the listener a new reason to read it.

## Choose and compose the frame

| What the voice is doing | What the listener should see |
|---|---|
| Introducing a concrete object or workload | An identifiable image or small setup diagram with the named parts, dimensions or precision. |
| Comparing alternatives | Both cases on the same scale, named as spoken. Put the unit and the smallest decisive value beside the marks. |
| Following a mechanism | The state before and after the change. Give a repeated object a consistent label and position. |
| Deriving a relationship | Use an equation when the voice explains its terms. If the voice asks whether a numeric case fits a limit, show the inputs, total and limit together. |

Reuse a lesson figure when its **visible evidence** matches the narration. If it expects a reader to consult the surrounding article, crop or redraw the necessary detail as a reel still. Keep series names, colours and scale consistent across a comparison. Give the changing quantity the visual emphasis. Let the caption ask the reading question when the artwork already has a descriptive title.

At 390 px the Chapter 11 image frame is about 305 px wide. Judge labels at rendered size. Give an SVG its own readable palette and a descriptive `<desc>`, since the player loads it as an image. Use text or shape as well as colour. [Diagram guidance](../interactive-study-diagrams/SKILL.md)

## Attach cues

In `study/mlsys/<vol>/<slug>/podcast.md` or `study/research/<slug>/podcast.md`, put **at most one** cue on its own line inside an `A:` or `B:` turn. An uncued turn holds the last slide. Before the first cue, the player shows text only.

| Cue | Source |
|---|---|
| `::fig[tile-budget]` | Original chapter SVG identified in `diagrams.json`. |
| `::eq[tile-capacity]` | Entry in `equations.json`, rendered with KaTeX. |
| `![Which device has the lower time floor?](/study-audio/vol1/11-hw-acceleration/projection-time.svg)` | A published local image under `public/`. The bracketed text is the slide caption. Research lessons can use their existing `/study-research/<slug>/` assets. |

For cue-only edits, run `python3 scripts/study-podcast.py <vol> <slug> --sync-cues` from the repo root. For research, use `research` as the volume. Check both transcript copies and preserve the recorded words and timing arrays. If the actual speech changes, follow the [audio generation and alignment workflow](../mlsys-study/SKILL.md#generated-artifacts). Build the local export with `task build` and preview it on a server that supports audio byte ranges.

## Review like a listener

- [ ] Play through a change at normal speed. At the first spoken reference, point to the exact label, value or state on screen. Repeat at the end of a held slide.
- [ ] Pause at the deciding frame on a phone. Cover the transcript and answer the question from the visual. Then read the active phrase alongside it on desktop. Check the units, contrast, equation fit and image description.
- [ ] Seek backwards into a turn with no marker. Check the restored visual, audio position and highlighted text. Step between slides while paused. The existing [player browser tests](../../../e2e/transcript-slides.spec.ts) cover these interactions on Chapter 11. Exercise the actual lesson when reviewing another reel.

Report a timestamped moment to keep, the most consequential mismatch and the smallest edit that would resolve it. In an authoring pass, repeat that reader action after rebuilding. [Worked review of the Hardware Acceleration reel](references/hardware-reel.md)
