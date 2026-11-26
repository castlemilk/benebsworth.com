---
name: mlsys-study
description: Write, self-critique and revise chapter packets for the Machine Learning Systems book (Harvard CS249r), review them with Ben, quiz him, and develop a draft blog essay. Use for the next chapter, a rendered packet review, an authoring-model comparison or an MLSys quiz or post.
metadata:
  internal: true
---

# MLSys book study loop

A guided read-through of *Machine Learning Systems* (Vijay Janapa Reddi,
<https://mlsysbook.ai>, CC-BY-NC-SA 4.0) that turns each chapter into three
things: a study packet for Ben to review, a test of his understanding, and one
site-native blog essay.

The loop per chapter — run phases in order, never skip ahead:

```
PACKET  →  REVIEW  →  TEST  →  POST
(notes    (user      (quiz →  (draft essay,
 + quiz    reads;     score    content/blog/
 + svg)    discuss)   logged)   draft:true)
```

State machine: `unread → packet → reviewed → quizzed → posted`, tracked in
`study/mlsys/progress.md`. Update it after every phase transition.

## Invocation

`/mlsys-study [unit] [phase]` resumes the learner's current phase.
When Ben asks to generate the next chapter, take the first unprepared
chapter after the latest packet in curriculum order. Preserve Ben's review
and quiz status for the earlier chapters. Examples:

- `/mlsys-study` — continue the loop (usually "make the next packet")
- `/mlsys-study vol1/08 packet` — packet for Model Training
- `/mlsys-study quiz` — run the interactive quiz for the current chapter
- `/mlsys-study post` — draft the essay for the current chapter

## Author a full chapter

Use the engine’s `outline` and `chapter` commands. The default mixed profile
uses Sol 6.2 for the teaching sequence and explanatory cores, Terra for section
drafts and repairs, and Luna for chapter review. Use `--profile astra` for
an all-Astra comparison. [Commands and saved-outline replay](../../../scripts/study-engine/README.md)

Read a completed neighbour before approving the outline. Follow one decision
from the opening through a worked example to a changed case. Carry the same
workload forward when an earlier result changes what the reader should do next.
Assign `targetWords` for the reasoning each section needs. A derivation may
need assumptions, intermediate quantities and a failure case. A transition
can stop as soon as it connects the two decisions.

Inspect what each section asks the reader to notice. For a new figure, use the
[style draw](../interactive-study-diagrams/SKILL.md#draw-among-suitable-styles)
when several treatments fit. The planner supplies a repeatable draw for each
section. Set the optional `visualSeed` string in the chapter spec for another
draw on a fresh outline. Keep an approved figure and its placement through
repairs. Use a `proseOnly` reason where the worked text carries the inference.
Cover the prose and try the figure, then review the section’s `glossTargets`. Read
the example with every gloss closed. Mark the phrase where a reader could
take the wrong action and give its card the missing reason. In a quantization
lesson, rounding away a faint signal and clipping a large signal can lead to
opposite changes in scale. They merit separate explanations where they arise.
The [two-workflow comparison](../../../study/engine-drafts/astra/comparison.md)
pairs examples from the finished chapters with their costs.

For a new chapter, a revision or a model rerun, use the [author’s self-critique
checklist](references/author-self-critique.md). Give section writers the opening
case names, their claims and the source rows behind the deciding comparison.
Reuse that short brief for figures, audio and assessment. Before recording,
have the reviewer solve the decision and check what changed between those rows.

## Layout

The public entry point is `/learning/`. Each book or course has one row.
Machine Learning Systems opens at `/learning/ml-systems/`, and chapter
materials and exports use their existing `/study/<vol>/<slug>/` URLs.
Additional chapters inherit the book thumbnail. When preparing artwork for
a new book on request, use the core BrandBrain MCP and inspect the final crop
at library-row size. The [existing book provenance](../../../assets/learning/ml-systems-provenance.md)
shows where to keep the original, generation record and exported thumbnail.

```
study/
  cs249r_book/            # gitignored sparse clone of harvard-edge/cs249r_book
    books/<vol>/<NN_ch>/
      NN_chapter.qmd      # chapter source — read this first
      *_concepts.yml      # book's own concept map (primary/secondary/claims)
      *_quizzes.json      # book's own quiz bank (MCQ/short answers per section)
      images/             # reference-only book figures; do not copy into public source
  mlsys/
    curriculum.md         # all volumes/chapters/sections — the map
    progress.md           # state table + session log — the tracker
    <vol>/<NN-slug>/      # MUST equal the curriculum slug (`14-ml-ops`, not
                          #   `14-ml-operations`): a mismatched dir renders a
                          #   stub page, and transcripts bake `visual` paths
                          #   with the slug at generation time — a rename
                          #   leaves 404s until every baked path is rewritten
      packet.md           # guided notes: thesis, claims, numbers, connections
      diagram-plan.json   # learning goals and section-local figures
      quiz.md             # written self-test + answer key (human copy)
      quiz.json           # same questions as proto StudyQuiz — feeds /study
      equations.json      # [{id,number,title,latex,caption,symbols}] — key
                          #   formulas + per-symbol drilldown; ::eq[id] refs
                          #   resolve against this file
      charts.json         # [{id,kind,title,caption,xLabel,yLabel,xPoints,
                          #   series:[{key,label,color,values}]}] — bklit charts;
                          #   series values[] is parallel to xPoints[]; kind is a
                          #   ChartKind enum (BAR_STACKED, LINE). LINE xPoints
                          #   must be ISO dates ("2012-01-01", not "2012");
                          #   series color must be var(--chart-N) tokens, not
                          #   named colors. Build-time validation rejects wrong
                          #   field names (`type`, `data`) — no guessing.
      diagrams.json       # [{id,file,title,caption}] — figure manifest
      diagrams/*.svg      # ORIGINAL sketches distilled from the chapter
      book-figures.json   # [{id,file,title,caption}] — same shape; captions say
                          #   what our sketch does differently
                          #   Reference metadata renders an attributed source-chapter
                          #   link; upstream image bytes are not committed or exported.
      podcast.md          # two-host audio-overview script: `A:`/`B:` lines,
                          #   `# hosts: Name | Name` directive, optional
                          #   visual cues for figures, images or equations.
                          #   ~1300-1500 words, spoken prose —
                          #   no formulas, numbers spelled out
      transcript.json     # proto StudyTranscript — {hosts, segments:[{speaker,
                          #   text,start,end,eq?,visual?}]} emitted by study-podcast.py;
                          #   karaoke timings for the AudioOverview component
```

### Generated artifacts

Three study aids derive from packet files — each is produced (not hand-edited),
and each has an authoring contract:

**Podcast / audio overview** — you write `podcast.md`, then generate:

```bash
uv run --with 'mlx-audio,misaki[en]' scripts/study-podcast.py <vol> <slug>
# → public/study-audio/<vol>/<slug>.m4a  (~5 min, Kokoro-82M on the local GPU)
```

- `podcast.md` format the parser expects: utterances start `A:` or `B:`;
  continuation lines join the current turn; `#` lines are comments. One
  `A:`/`B:` line = one TTS segment.
- `# hosts: Marcus | Iris` — display names for speakers A/B (A=`am_michael`,
  B=`af_heart`). Written into transcript.json; the player's chips show the
  initials and the legend shows the names. Introduce them once in the
  opening utterance so the names are also spoken.
- `::eq[<id>]` — on its own line inside a turn. Stripped from speech; tags
  the segment with that `equations.json` entry (resolved to {id,title,latex}
  at generation → the transcript stays self-contained). Place one where a
  law is actually discussed, not in recap turns.
- Valid cue types are ONLY `::eq[id]`, `::fig[id]` and `![alt](/path)`. Any
  other `::x[...]` line (e.g. `::chart[id]`) is NOT stripped — it falls
  through into the turn's spoken text, TTS reads it aloud, and it bakes
  into the transcript + audio. `::chart` ids have no file asset; cue the
  nearest `::fig` instead. Post-build, grep the chapter HTML for literal
  `::[a-z]*[` residue — it catches this exact leak.
- Use [study-slide-reels](../study-slide-reels/SKILL.md) to storyboard the
  read-along, attach figures, equations or still images, and review them at
  playback speed. Its cue-only workflow preserves existing audio and timings.
- The run also emits `transcript.json` (per-segment WAV durations →
  start/end seconds) into the chapter dir AND `public/study-audio/<vol>/
  <slug>.transcript.json`, then auto-runs `scripts/study-align.py`
  (whisper-small word_timestamps over the joined audio via `afconvert`
  decode — ffmpeg is broken on this box) which adds a `words[]` array of
  measured per-word `{text,start,end}` to every segment. To (re)align
  standalone: `uv run --with 'mlx-whisper' scripts/study-align.py <vol>
  <slug>|--all`.
- The chapter page renders `<AudioOverview>` — a karaoke read-along
  player (`components/mdx/audio-overview.tsx`): **word-level** sweep —
  the active segment renders one span per word; an rAF loop reads
  `audio.currentTime` (not the ~4Hz `timeupdate`) and marks words
  `ao-done`/`ao-cur` at whisper's measured boundaries; authored text is
  zipped over the timings so display wording is unchanged. Segments
  without `words` fall back to char+punctuation-weighted interpolation.
  Click-to-seek, transcript collapsed by default (toggle + expand-full),
  equation chips under tagged turns linking to `#eq-<id>`. In MDX use
  `<AudioOverview src="…m4a" transcriptSrc="…transcript.json" />`.
- Spoken prose only — no LaTeX/formulas/tables; spell numbers out
  ("sixteen point seven milliseconds", "seven eight four to one twenty
  eight" for layer widths); keep units natural. Digits-as-digits read
  terribly through TTS.
- Check the spoken numbers and assumptions against the worked example before
  synthesis. If the spoken words change afterward, regenerate the audio and
  both transcript copies, then check playback and seek on the built page.
  For a display-only spelling correction, keep the existing audio after
  confirming the pronunciation and word timing still match.
- Estimate listening time from the script and the hosts’ measured pace.
  Chapter 11 has 1,437 spoken words in 10:09. Use the generated track’s
  duration in the reader. Follow the packet's argument spine: thesis,
  each mechanism with its worked number, one counter-intuitive beat, takeaway.
- Gotchas already burned once: `misaki[en]` is a hard dependency (Kokoro
  crashes without it); `afconvert -f m4af -d aac` — do NOT pass `-b` bitrate,
  it's rejected for the 24 kHz mono WAV.
- Regenerate after any packet revision that changes the argument. The page
  shows a player only when the .m4a exists, so a missing file fails silent —
  check the file, not the page.

**Anki export** — fully automatic: `app/study/.../anki.txt/route.ts` renders
`quiz.json` into an Anki TSV (`#separator:tab` `#html:true`, `#deck` named per
chapter, tag `mlsys::<vol>::<slug with _>`). MCQ fronts letter the options,
backs give the correct option + explanation; non-MCQ backs use `modelAnswer`.
Contract: keep `quiz.json` in lock-step with `quiz.md` and fill `modelAnswer`
on every non-MCQ or the card back is empty.

**Concept index** — fully automatic: `/study/concepts/` aggregates every
packet's `## Glossary`. Contract: glossary terms MUST be `- **Term**:
definition` bullets (the parser slices between `##` headings and only reads
bullets in that shape).

### Restoring the book clone (fresh machine)

```bash
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/harvard-edge/cs249r_book.git study/cs249r_book
git -C study/cs249r_book sparse-checkout set books
git -C study/cs249r_book checkout
```

Update to latest: `git -C study/cs249r_book pull`, then regenerate section
lists in `curriculum.md` by re-running the heading extractor (walk each
`<vol>/<NN>/` dir, read `title:` frontmatter or the first `# Heading
{#sec-...}`, collect `## Section {#...}` headings). The file's row format is
parsed by `lib/study/load.ts` — keep `## Volume N: Title[, qualifier] (N ch)`
headers and `- [X] \`volN/NN_slug\`: Title · *sections*` rows (`:` and `·` are
the delimiters).

## Drafting individual worked sections on a token budget

For quantitative sections, the local study engine takes a source heading, an
illustrative case and a ledger of facts. It compiles a native figure, glosses
and a self-test from reviewed section drafts. Start with `npm run study:engine
-- plan <brief>` to inspect the selected source lines and omitted headings.
Keep the chapter outline, source check and final rendered review at chapter
scope. Choose a flow for an ordered mechanism and a chart for a quantitative
comparison. Track total tokens through acceptance, including repairs. Test a
fresh transfer question and an unchanged `--max-calls 0` replay before changing
the default model mix. The [engine guide and measured pilot](../../../scripts/study-engine/README.md)
includes two briefs, the review command and the measured cost of combining reviews.

## Phase 1 — PACKET

1. Read the chapter `NN_chapter.qmd` end to end. Skim its `images/` filenames
   so you know which figures the book already uses — your diagrams must be
   original, not redraws of theirs.
2. Read `*_concepts.yml` — it gives `primary_concepts`, `secondary_concepts`,
   and `claims` (one-sentence statements of each claim). Use it as the packet's
   skeleton and to check you didn't miss a core claim.
3. Before drafting, use [interactive-study-diagrams](../interactive-study-diagrams/SKILL.md)
   to plan visuals across the packet in a co-located `diagram-plan.json`.
   Write `study/mlsys/<vol>/<NN-slug>/packet.md` in the canonical skeleton
   below. Open a completed neighbour through Learning → Machine Learning Systems
   first. Identify any comparison that benefits from the same treatment and
   any different relationship the learner needs to see. For example, chapter 8 follows a training-memory budget
   through successive changes. Chapter 9 compares selection strategies at the
   same quality and coverage. Choose the question that should carry this packet:

   ```md
   # <Chapter title>: Study Packet
   *<one-line source attribution>*

   ## Thesis
   <one paragraph: the chapter's argument, your words>

   ## Guided notes
   ### <the decision or mechanism this section teaches>
   - <claim / mechanism / number bullets>
   ::eq[some-law]
   $$
   <display math>
   $$
   > [!kind] Title
   > <callout body>

   ## The physics
   | Quantity | Value | Use |
   ## Glossary
   ## → Ben's world
   ## Open questions
   ```

   All four tail sections are required, in that order — ch7 shipped once
   without `## The physics` and with Glossary last; the physics table is the
   quick-reference surface the numbers-heavy chapters need most.

   - **Opening question and thesis**. When one decision carries the chapter,
     set an optional plain-text `openingQuestion` in the packet's YAML
     frontmatter. It appears below the chapter title, before the audio player,
     and in the Markdown export. Give the reader a specific prediction to
     make. Put the deciding condition in the first sentence of the thesis. Read
     the title, opening question and thesis together to catch a repeated question.
     If the decisive comparison comes several sections later, give the reader a
     visible link at the opening and a contents label that names the decision.
     At the destination, label the cases from the question in the units the
     figure uses. Keep the worked derivation where its prerequisites have been taught.
   - **Guided notes**. Use learner-facing `###` headings. Map them to the
     exact source headings in the outline. Split a dense topic or group
     related ones when that gives the reader a clearer derivation.
   - **The physics** — a `| Quantity | Value | Use |` table of every
     quantitative law / back-of-envelope number (e.g. iron law, energy-per-byte
     vs per-FLOP, latency budgets). These are what make the book "systems"
     rather than "ML". Scalar values and short formula forms live here inline
     as `$…$`; the full named laws get `::eq` display blocks inside Guided
     notes where they're discussed.
   - **Marks and notes** — two packet-only syntaxes render as reading
     affordances on `/study`: `==text==` highlights a phrase (single inline
     run only — no `==` spanning inline-markup elements: `*em*`,
    `**bold**` and `$math$` all split the span and leave literal `=={`
    residue in the built HTML; keep the marked run plain text), and
     `> [!kind] Title` opens a margin-style callout with the body on the
     following `> ` lines. `Title` must be same-line and short — a bare
     `> [!kind]` leaves the title empty (correct); never let the first
     wrapped body line play title (a `\s*`-eats-newline renderer bug once
     made it do exactly that). Kinds: `note`, `observation` (chapter insight),
     `caution` (failure mode / fallacy), `method` (how to work it),
     `connection` (Ben's-world bridge, inline where the idea lives),
     `question`. Obsidian-style aliases `warning→caution`, `tip→note`,
     `important→caution` are mapped by the renderer — prefer the canonical
     six for consistent labels. Mark the phrase a reader would want to revisit
     when making a decision. Include one early
     `> [!note]` telling the reader amber dotted marks carry why-it-matters
     cards (hover/tap/tab) — the affordance isn't self-evident.
   - **Mark glosses** — `==text=={gloss}` attaches a hover card to the
     highlight: one or two sentences on why the phrase earns the mark, plus
     `[label](#section-id)` links into the page (`#charts`, `#key-equations`,
     `#sketches`, `#self-test`) or `[label](https://…)` external refs. The
     gloss may contain links and span inline markup, but no `==` or `}`
     inside it. Escape currency as `\$` inside glosses too: two bare `$` in
     one gloss pair into a math node that splits the text run, so the next
     `==mark==` on the same line is emitted literally (`=={` residue). At
     each substantive section, ask where a reader could choose the
     wrong baseline, confuse two mechanisms, or miss an assumption. Gloss that
     phrase with an example, a consequence, or a link to the exact worked
     figure. Read the sentence once with the card closed and once with it open.
     Keep the core argument in the sentence and give the card a second job.
     Read the marks in page order. If they cluster in the introduction, check
     whether one belongs at a later calculation or release decision.
     Leave transitions and routine definitions unmarked when the prose already answers the question.
   - **Equation annotations** — every load-bearing formula gets a display
     block at the point it's discussed: `::eq[equations.json-id]` on its own
     line, then a `$$` block with the math on the lines *between* the `$$`
     fences (single-line `$$x = y$$` parses as INLINE math, not display).
     The renderer wraps it in the hover-Σ explainer and pulls the symbol
     drilldown from `equations.json`, so the id must exist there with
     `symbols` filled. Keep `::eq`/`$$` blocks at top level between prose —
     inside list items or callouts they're unreliable. Inline `$…$` stays
     inline and gets no explainer — use it for terms and scalars, not for
     the named laws. `<!-- -->` comments are dropped by the pipeline, which
     is why `::eq[]` exists — don't use comments as markers.
   - **Packet syntax cheat-sheet** — everything the pipeline recognises:

     | Source | Renders as |
     |---|---|
     | `==text==` | `<mark>` highlight |
     | `==text=={gloss}` | highlight + hover card ("Why it matters") |
     | `> [!kind] Title` | `.study-note` callout (6 kinds) |
     | `::eq[id]` + `$$…$$` | display eq + hover-Σ explainer + symbol panel |
     | `::fig[id]` | figure embedded at that spot (diagram or book-figure) |
     | `::chart[id]` | charts.json chart embedded at that spot (React portal) |
     | `$$…$$` alone | display eq, wrapped, no explainer |
     | `$…$` | inline KaTeX |
     | `\$` | literal dollar (escape!) |
   - **Inline figures and charts** — `::fig[diagrams.json-or-
     book-figures.json-id]` and `::chart[charts.json-id]` embed the asset
     at the point of discussion rather than only in the end galleries.
     Embed aggressively — most figures and charts should sit next to the
     prose that motivates them; the galleries then only catch what has no
     natural home. Rules learned the hard way:
     - The marker must be a **standalone paragraph — blank line before
       AND after**. Glued to a bullet or paragraph line it merges into
       that text and silently renders as a literal `::fig[…]`.
     - All three manifests share ONE `fig-<id>` anchor namespace per
       chapter — a chart id colliding with a diagram id produces a
       duplicate DOM id. Keep ids globally unique within a chapter.
     - Placement: end of the section/bullet that introduces the concept —
       the visual accompanies its explanation, never decorates cold.
     - Embedded ids are auto-filtered from the Sketches / From-the-book /
       charts galleries — no duplicate rendering. Book references keep
       their source attribution and chapter link inline.
   - **Glossary** — new terms, defined in one line each.
   - **→ Ben's world** — 2–4 concrete connections to his stack: the LLM
     benchmark harness (`lib/lab/llm-benchmark/`), lab effects
     (`lib/lab/registry.ts`), the shared droplet, doc-analyser/greenveil,
     past posts. The house angle is "the same structure in two places" —
     find the second place.
   - **Open questions** — what the packet couldn't fully resolve; these feed
     the REVIEW discussion.
   - **No hand-written book-figure list** — `book-figures.json` (step 4b) IS
     the "figures to look at" section: it renders the From-the-book gallery
     with your why-notes as captions. A second markdown list section is
     visible duplication (ch5 shipped it once).
4. Write the original SVG sketches that the chapter's teaching sections need
   under `diagrams/`. Use the learning goals in the plan to choose their
   scope. Site-compatible: light/dark legible (prefer
   `currentColor` / neutral greys + one accent), flat, labelled, readable at
   their actual reading width. Sketches, not engineering drawings — honest hand-drawn feel
   is fine. Never copy the book's figures; distil the idea differently.
   Then place each where it's discussed with `::fig[id]` (see the packet
   syntax bullet — standalone paragraph, blanks both sides).
   **Dark mode is the canonical theme** — every shipped diagram carries a
   `<style>` block mapping its light palette to dark-safe values keyed off
   the site's `.dark` class, e.g.
   `.dark [fill="#374151"]{fill:#e5e7eb}` / `.dark [stroke="#2563eb"]{stroke:#60a5fa}`
   (attribute selectors beat presentation attributes; generate one rule per
   hex used). Scope stylesheet selectors and IDs to the diagram because SVG
   is inlined into a shared document. For a compact illustration, use the
   `study-fig-fit` class on its root SVG and design the text for a phone.
   Dense legacy drawings can still scroll. Check that a phone reader can see
   both sides of a comparison together, or read their values in the caption.
   For the var-token style figures (`--fig-paper/ink/mark/outline/rule` with a
   `.dark #id { --fig-* }` override block): `--fig-rule` is shared by secondary
   text AND hairlines, so its dark value must pass ~4.5:1 on `--fig-paper`
   (#93a094 on #252a27 works; #646b63 fails — every caption and axis label
   sinks). Verify one figure per chapter in rendered dark mode, not just the
   token values.
4b. Record cited book figures in `book-figures.json` as reference metadata.
   Do not republish upstream SVG/PNG bytes. The public reader renders an
   attributed link to the source book for these references; original sketches
   alone go in `diagrams/`. Preserve existing reference files without exporting
   them. Exact upstream revision and per-asset provenance must be established
   before reconsidering publication; a general book attribution is not evidence
   of permission for every embedded asset.
5. Author the questions and worked keys once in `quiz.json` (see TEST below
   for sources). For a new written quiz, render the Markdown from that JSON
   with the command below. The chapter engine already produces both copies.
5b. Write `podcast.md` then generate the audio — format contract, TTS
   command, and gotchas live in **Generated artifacts** above.
6. Check the questions use the `StudyQuiz` shape
   (`proto/study.proto`) so the `/study` microfrontend can run them
   interactively: `kind` ∈ `MCQ|FEYNMAN|NUMERIC`, `source` ∈ `BOOK|ORIGINAL`;
   MCQs carry `options[]` + `correctOptionId` + `explanation`, open questions
   carry `modelAnswer`. There is no separate `TRUE_FALSE` kind or `AUTHORED`
   source: encode book true/false items as an MCQ with `True`/`False`
   options and use `ORIGINAL` for packet-authored questions. Keep it in
   lock-step with `quiz.md`.
   **Escape every currency `$` as `\$` at the JSON source** — two bare
   dollar signs in a prompt or modelAnswer pair into a KaTeX span that
   swallows the text between them and can overflow the page at phone
   width (ch14 shipped a hidden 579px math element inside Self-test this
   way). Same trap as packet prose, but the JSON is the source of truth.
   Field map (verified against built HTML): markdown-rendered → quiz.json
   `prompt`/`options[].label`/`explanation`/`answer`/`modelAnswer`,
   equations.json `caption`, charts.json `caption`, diagrams.json
   `caption`/`title`/`alt` — escape `$` in all of them. Plain text
   (escaping shows a literal `\$`) → equations.json `symbols[].meaning`,
   charts.json `yLabel`/`series[].label` — leave `$` bare. `diagram-plan.json`
   is authoring metadata, never rendered — no escaping needed.
7. Write `diagrams.json` — figure manifest `[{id,file,title,caption}]`
   matching the files in `diagrams/`.
8. Write `equations.json` — every load-bearing formula (typically 4–8) as
   `[{id,number,title,latex,caption,symbols}]` (`latex` = raw TeX, no `$$`
   delimiters; `caption` = markdown). They render on /study as numbered,
   copyable equation figures AND power every `::eq[id]` block's drilldown —
   the ids are the contract between the two files. `number` is display order
   in the Key-equations section; renumber contiguously when you add one.
   `symbols` is the per-equation drilldown:
   `[{symbol,name,meaning}]` — `symbol` is TeX for one term (e.g.
   `"R_{\\mathrm{peak}}"`), `name` its short label, `meaning` a one-line
   gloss of what it measures/units. Cover every term in `latex` — the UI
   renders it as an expandable symbol key. "Every term" includes the easy
   misses: input activations when only outputs are listed (`A^{(l-1)}` next
   to `A^{(l)}`), named quantities (`Ops`, `M_{act}`), and compound terms
   like `max_l(A^{(l)}+A^{(l+1)})` or `W^{(l)}` inside a transpose.
   **Keep `latex` phone-narrow.** A long `\mathrm{}` argument list grows
   the hidden MathML layer past the viewport edge, and a stacked `\frac`
   inside `\sqrt` can overflow the card at 390px — prefer slash form
   inside the radical (`\sqrt{2C_{r}\,/\,(Q\,v\,A_{0}\,\delta)}`) and
   short argument lists (the symbol drilldown carries the detail).
9. Use `charts.json` when a native chart answers the reader’s question.
   An empty array is valid when the packet's evidence is clearer in other forms.
   `kind` ∈ `LINE` | `BAR_STACKED` | `IRON_LAW_EXPLORER` (baseline
   movement/compute/overhead terms; the UI adds the rate slider).
   **The x_points contract is hard:** `LINE` = `YYYY-MM-DD` ISO dates only
   (the client does `new Date(x)` — a category or bare number hydrates into
   `Intl.RangeError` and the root error boundary replaces the WHOLE PAGE,
   after SSR looked perfectly clean). For a continuous numeric axis such as
   utilization, draw a scaled SVG curve. For categories, use bars when their
   lengths answer the question. Stack components only when adding them gives
   a meaningful total. A decision threshold can be a labelled reference line
   on the same scale. Identify measured values and label illustrative inputs.
   **Every `series` entry needs a `key`** (proto `Series.key`, the row
   dataKey): omit it and each `Bar` binds `dataKey=undefined` — rects
   render at height 0 with unscaled widths, SSR looks fine, nothing
   throws. ch8 shipped three zero-height charts this way; only a live
   rect-geometry check catches it (`rect` bounding-box `h>0` after
   hydration — count alone passes on zero-height rects).
   Three caption rules learned the hard way:
   - `caption` renders as **markdown**: bare `*` pairs into `<em>` and eats
     multiplication signs (`2B*109,184` → italic soup + a stray `*`). Use
     `·`/`×` or wrap the formula in code ticks.
   - The caption's **claim must agree with the plotted values** — ch5's
     intensity chart claimed "stays bandwidth-bound" while its batch-128
     bar crossed the ridge. Either fix the data or say what the crossing
     means (here: stream-everything overstates traffic once weights are
     cache-resident).
   - In a `BAR_STACKED`, adjacent series colors must contrast —
     `chart-1` violet beside `chart-3` purple merges on dark. Reorder the
     palette assignments. The renderer suppresses `showValue` labels in short
     segments. At phone width read the shortest bar, its unit and its comparator
     without hovering. Use a direct outside label or a compact value row when
     the missing number decides the answer.
   - Keep `BAR_STACKED` values nonnegative. The renderer computes
     cumulative stack geometry directly; a negative value becomes an
     invalid negative `<rect width>` at hydration (hundreds of console
     errors) even though SSR looks fine. Model a loss with a nonnegative
     gross/absolute series and put the subtraction or break-even in the
     caption, as ch9's savings chart does.
   Series colors use `var(--chart-N)`. Embed each via `::chart[id]` at the
   point of discussion (same standalone-paragraph rule as `::fig`).
10. Update `progress.md` (packet ✅ + date) and report: thesis in 3 lines,
   what diagrams were made, what to read first, what's open.
   Also eyeball the generated LLM sibling once —
   `task build:gen:study-md` refreshes `public/study/<vol>/<slug>/index.md`
   (run standalone; no rebuild needed) — the automation guarantees marker
   resolution, not taste: check one fig image link, one chart table, and
   that no parenthetical gloss reads awkwardly mid-sentence.

### Review the worked example before recording

Read the opening question as a learner. Cover the conclusion and answer key.
Use the source section, the figure and its caption to do three things.

1. **Derive the result.** Write down the workload, the baseline, what varies
   and the units at each step. Recompute the decisive value from the inputs.
   Name the event in the denominator: a 32-bit read from an 8 KB memory is
   one word transfer. Likewise, time per batch and time per request describe
   different events.
   Identify which numbers come from the book, an illustrative model or a
   measurement. For each side of a measured comparison, read the original
   table row and its footnotes. Record the sampled population, workload,
   denominator and measurement boundary. If both the fleet and the meter
   change, use a within-fleet pair to teach the boundary effect, or describe
   the two changes together. Carry that qualification into every caption,
   spoken claim and keyed explanation that reuses the result.
2. **Find where the conclusion changes.** Vary one consequential input or
   assumption. Give the reader enough evidence to predict the new outcome.
   A modeled performance ceiling needs a timing measurement before it can
   support a purchase. An observed recall threshold and a threshold on a
   confidence bound can lead to different release decisions.
3. **Try a fresh case.** Solve the question from its prompt with the answer
   hidden. For a diagnosis, name an observed symptom, a mechanism that could
   cause it, a test that distinguishes it and the counter or outcome expected
   to change. Check that the prompt supplies every stage and dependency the
   answer needs. If the numerator counts traffic across two kernels, time the
   same two kernels. Explain why a plausible alternative fails and resolve
   assumptions that allow two answers. Keep the worked baseline consistent
   across the figure, caption and audio. For each question intended as
   transfer, compare its inputs and answer with the teaching prose, open
   glosses, figures and transcript. This applies to explain-in-your-own-words
   questions as well as numeric ones. A recap can reuse the taught case.
   For transfer, change a consequential condition, independently solve the
   new case, and put its conclusion in the written, web and flashcard keys.

Read the multiple-choice options once with the prompts hidden. If a reader
can keep finding the key by picking the longest or most carefully qualified
option, shorten the key or give the distractors comparable specificity.
Base distractors on real mistakes, such as adding overlapping time floors
or dividing by the wrong rate. Vary answer positions and reconcile the key
in the web quiz, written quiz and deck after editing.
Run `node .agents/skills/mlsys-study/scripts/review-quiz.mjs path/to/quiz.json`
to see the answer positions and which keys are uniquely longest in the source
text. It accepts several quiz files for comparison. Use these clues to
inspect the wording in context. When length repeatedly predicts the key,
revise the distractors around credible mistakes and rerun the check. Keep
a longer answer when the subject requires it. Padded distractor text must
pass the prose lint too: no em dashes, no banned words (a pad round once
reintroduced dashes that only the decoded-JSON lint caught).

For a new written copy, `quiz-copy.mjs` prints prompts, choices and a separate
worked key using the chapter engine's formatter. Compare an existing authored
copy before editing it. After the build, compare the actual Markdown sibling.

```sh
unit=vol1/12-benchmarking
chapter="study/mlsys/$unit"
node .agents/skills/mlsys-study/scripts/quiz-copy.mjs "$chapter/quiz.json" --compare "$chapter/quiz.md"
node .agents/skills/mlsys-study/scripts/quiz-copy.mjs "$chapter/quiz.json" --compare "out/study/$unit/index.md"
```

Set `unit` to the chapter under review. Omit `--compare` and its path to print the reference
copy. The comparison reports numbered wording, option-order or key differences
and a missing key. Read flagged items side by side. Formatting or an intentional
paraphrase can differ while preserving the same question and answer. For an
older quiz with `rubric` or `answer` fields, inspect the existing key when
repairing a missing `modelAnswer`. The web reader uses `modelAnswer`.

Use the pinned chapter headings and concept map to check breadth, especially
sections following the main example. For each substantive section, name
something the reader can now calculate, trace or diagnose. When a picture
only repeats a table, use its geometry to show the mechanism, such as where
probability moves between a one-hot label and a teacher's soft targets.

### Packet verification checklist

Run before marking a packet done — this is what "green" means for the phase:

- Run `task lint:diagrams -- study/mlsys/<vol>/<slug>/diagram-plan.json`
  for the chapter under review, then `task lint:diagrams` for the collection.
  The collection command discovers existing plans. A green collection result
  alone cannot tell you whether this packet has one.
- Run `node scripts/lint-prose.mjs --ci --files study/mlsys/<vol>/<slug>/*.md`
  to gate this chapter. The collection-wide `task lint:prose` prints a report.
- `npx tsc --noEmit` and the study-surface unit tests if code changed
  (`npx vitest run components/mdx/equation.test.tsx lib/study/markdown.test.ts` —
  the latter locks the `::fig`/`::chart`/`::eq` embed contract incl. code-fence
  and orphan-marker behaviour).
- `task build` — must be run after ANY study/ edit (the chapter is in
  `build:default` sources since 2026-11-15; if Task says "up to date" after
  a packet change, the source glob broke — check `taskfiles/build.yml`).
- **Real-browser hydration check — SSR lies.** Static HTML can be perfect
  while a client-only throw replaces the entire page with the 500 error
  boundary (ch4 shipped exactly this: a `useMemo` `Intl` throw on bad chart
  x-points). From the repository root, serve the export on an available port
  with byte-range support (for example, `npx --no-install serve out -l tcp://127.0.0.1:4321`). Load the chapter
  in playwright, and require **zero console/page errors AND real content**
  (h2 count > 5, figures present, `!body.includes('Something went wrong')`)
  — at 1440 AND 390, both color schemes. HTML greps alone do not count.
- In `out/study/<vol>/<slug>/index.html`: one `data-eq-explainer` button and
  one `id="eqs-<id>"` panel per `::eq` ref, `data-kind` on each callout,
  `study-mark`/`study-mark-gloss` counts match the packet, `katex` nodes
  present, no leaked `::eq` or `==`/`{gloss}` text, every chart section has
  serialized series + `role="img"` label, TOC `<a>` hrefs resolve to ids.
- The KaTeX stylesheet loads on the page (the bug that made math render as
  scattered glyphs was a missing `katex.min.css` import on the study route).
- Zero `katex-error` spans in the built HTML — a bare unescaped `$` (e.g.
  `$24/mo`) pairs with the next `$` and swallows the sentence as broken
  math. Escape every currency dollar as `\$`.
- Figure/chart embeds resolved: zero literal `::fig[`/`::chart[` text and
  zero `study-fig-missing` stubs in the built HTML, no duplicate
  `id="fig-*"` anchors (cross-manifest id collision), and every embedded
  chart shows its placeholder as `data-study-chart` (the React portal
  fills it client-side — nothing renders inside it during SSG).
- Rendered captions are clean: no stray `<em>` inside `figcaption` from a
  bare `*`, no truncated callout titles (bare `> [!kind]` must produce an
  aside with NO `study-note-title` node), and equation symbol drilldowns
  cover the latex terms (spot-check 2-3 panels).
- Generated artifacts all landed: `public/study-audio/<vol>/<slug>.m4a`
  exists (compare its measured duration with the transcript’s final end time) and the page has
  `audio-overview` markup with `ao-seg` count == transcript.json segments;
  `out/study/<vol>/<slug>/anki.txt` has `#separator`/
  `#deck`/`mlsys::<vol>::<slug_>` headers and card count == quiz.json
  question count; `out/study/concepts/index.html` contains the chapter's
  glossary terms.
- The LLM-friendly sibling regenerated: `out/study/<vol>/<slug>/index.md`
  (from `gen:study-md` inside `task build`) has **zero** `::[`, `==`, `[!`
  residue; every `::fig` sketch appears as `![](…/diagrams/<file>.svg)` and
  the matching file exists under `out/study/<vol>/<slug>/diagrams/`; every
  embedded `::chart` appears as a markdown data table; the tail carries
  Key equations / From the book / Self-test / Audio sections as the
  manifests require. The chapter page's `<head>` has
  `rel="alternate" type="text/markdown"` (only packet chapters get one),
  and `out/llms.txt` lists the chapter under `## Study` with its
  `[Markdown](…/index.md)` link.

### Read it as a learner

Apply the [self-critique checklist and repair process](references/author-self-critique.md)
to the built chapter before handing it to Ben. Compare a completed neighbour
at the same viewport and theme. Ben’s own review and quiz results belong to
the next phases. The [Chapter 11 reader critique](references/hardware-reader-critique.md)
shows which findings persisted after an editorial revision.

After exporting, run `npx playwright test e2e/learning-packet.spec.ts`.
It discovers enrolled book chapters and exercises the library path, chart and
figure rendering, compact SVG label clipping and collisions, every authored gloss, quiz
feedback and Markdown figure links.
For shared renderer changes, also run the affected component tests.
[Renderer regression notes](references/renderer-review.md) cover previous
failures in hydration, chart geometry, annotations and theme styles.

When comparing authors or models, record the first complete draft before
giving editorial feedback. Record who supplied a replacement question, its
inputs and its answer. Credit the resulting run for the work it performed.
To evaluate independent question design, give the author the source and the
learning objective and keep the reviewer’s worked replacement out of its brief.
Report a concrete example of source fidelity,
independent calculation, visual explanation and quiz transfer for each
chapter. Distinguish edits the author made on its own from those the reviewer
prompted, and compare the finished pages under the same browser checks.
When the chapters or briefs differ, describe the observed runs and their
differences in scope. Compare source and spec fingerprints, word targets,
prompt revisions and review passes. Count guided prose separately from
glosses, reference material and quizzes. Report tokens for planning, writing,
repairs and review from the receipts, including the original cost of a cache
hit once. Report dollars only with applicable rates. Claims about learning
gains need evidence from learners.

The engine currently rereads the assembled chapter after a repair. To
benchmark a cheaper recheck, give a reviewer the previous finding, changed
passage, affected figure or quiz, and source excerpt. Compare its decision
with the full reread on the same correction. A changed premise, shared number
or answer revealed elsewhere calls for checking every dependent section.
The [Chapter 10 and 11 comparison](references/chapter-10-11-comparison.md)
shows how a quiz can pass interaction tests while its option wording gives
away the correct answers.

## Phase 2 — REVIEW

The user reads the packet. In-session: answer questions, go deeper on
anything flagged, resolve Open questions against the `.qmd`. When the user
signals they're ready ("quiz me" / moving on), mark reviewed and proceed.

## Phase 3 — TEST

Two instruments; run whichever the user asks for, both by default over time.

- **Written self-test** (`quiz.md`, already produced): drawn from
  `*_quizzes.json` — pick the 4–6 highest-value questions (its
  `rationale.focus_areas` says what each section's questions target), plus
  2–3 Feynman prompts ("explain the iron law to a junior dev") and 1 numeric
  / design problem. Answer key at the bottom of the file under a clear
  `--- answer key ---` divider so it's scannable but not spoiled.
- **Interactive quiz** (in-session): ask 5–8 questions conversationally —
  mix book MCQs, Feynman prompts, one numeric. One question at a time; mark
  each answer, correct with a pointer back to the packet/section rather than
  just the answer. Score at the end and log it to `progress.md`
  (`Quizzed (score)` column) with weak spots in Notes.

Pass bar: ≥ ~80% and no core claim missed. Weak spots → annotate packet.md
or revisit before POST.

## Phase 4 — POST

One essay per chapter (the agreed series shape). Invoke the repo's blog
workflow — read `.claude/skills/writing-blog-posts/SKILL.md` and follow it
as the strict checklist. Series-specific deltas:

- **Angle, not summary.** The post is a standalone essay on the chapter's
  strongest counter-intuitive claim (house style: "Backprop is just the
  chain rule", "Every wire is an RLC circuit"). The packet is raw material;
  the essay re-derives the idea in Ben's voice. Never title it "Chapter N" —
  it should read to a stranger as a complete idea.
- **Slug/title**: kebab-case claim, e.g. `ml-systems-fail-silently`.
  `labels: machine-learning,mlsys`, `draft: true`, `release: false` until the
  user approves. Add the slug → `TOPIC.software` in `lib/topics.ts` `BY_SLUG`.
- **Attribution** (CC-BY-NC-SA 4.0): a short note near the top or bottom —
  "Working through *Machine Learning Systems* (Reddi, Harvard CS249r),
  chapter N — this is my essay on the idea that stuck." Link the chapter at
  mlsysbook.ai and the book home. Quote at most a line or two with quotes;
  everything else is original prose and original diagrams.
- **Diagrams**: evolve packet sketches into site assets
  (`public/blog/<slug>/`, mirrored to `content/blog/<slug>/`), or a bespoke
  registered component / `LabCanvas` effect if an existing lab fits — check
  `lib/lab/registry.ts` first. Write a diagram plan for the essay's own
  sections and validate it with the blog workflow.
- **Series continuity**: end with a forward-looking sign-off naming the next
  chapter (house style: "next we'll …"). Keep a running "the series so far"
  link list once ≥2 posts exist.
- **Gates**: `draft: true` means the post isn't built — validate with the
  disposable-preview trick from the blog skill when a render check is needed,
  never flip release in the working checkout.
- After user approval of the draft: mark `posted` in `progress.md` with the
  slug, log the session. Publishing/deploy is a separate, explicit ask —
  this loop stops at a reviewed draft.

## Rules

- **Chapter order.** Advance in curriculum order (vol1 → vol2 → vol3 →
  vol4). An explicit unit or phase takes precedence.
- **Packet ≠ post.** The packet is faithful notes for learning; the post is
  an original essay for readers. Don't paste packet sections into posts.
- **License discipline.** Attribute always. Original diagrams only — the
  book's `images/` are reference for understanding, never republished. The
  derived blog posts carry their own license as Ben's original essays with
  attribution to the book.
- **Keep `study/` private scaffolding** — it's committed for durability but
  it's not site content; nothing under `study/` goes to `content/` or
  `public/` directly — *one exception*: `task build` runs
  `scripts/gen-study-md.mjs` (the `gen:study-md` task), which flattens each
  packet into `public/study/<vol>/<slug>/index.md` — an LLM-friendly
  sibling served at `/study/<vol>/<slug>/index.md` and advertised via
  `<link rel="alternate" type="text/markdown">` + the `llms.txt` Study
  section. It resolves `::eq`/`::fig`/`::chart` markers (equations get an
  `Eq N` breadcrumb, figures become image links to copied
  `public/.../diagrams/*.svg`, charts become data tables), `==mark=={gloss}`
  becomes bold + parenthetical, `[!kind]` callouts become bold — and appends
  Key equations / Charts / From the book / Self-test / Audio sections. Its
  correctness depends on the same authoring rules (markers standalone,
  `$$` multiline, callout titles same-line): keep packets clean and the
  sibling regenerates correctly — review it with `task build:gen:study-md`.
  Post assets are authored fresh under `content/blog/`.
- **`/study` renders packets as-is** — the microfrontend (`app/study/`,
  `lib/study/load.ts`) reads `curriculum.md` + each chapter dir at build
  time. So: `packet.md` stays *plain markdown* (no JSX/MDX components — the
  pipeline is remark/rehype, raw `<`/`{` will break the build); `$…$`/`$$…$$`
  LaTeX is supported everywhere (packet prose, quiz prompts, option labels,
  captions), plus `==mark==` highlights and `> [!kind]` callouts (see Phase 1).
  `quiz.json`/`charts.json` validate against `proto/study.proto`
  (bad enums fail the build), equations render through `equations.json` →
  gamma `Equation` figures (Key-equations section) AND `::eq[id]` blocks →
  `.equation-packet` explainers (in-packet), charts through `charts.json` →
  bklit primitives, and diagrams are inlined from `diagrams/*.svg` via
  `diagrams.json`.
  On top of the rendered packet, `PacketAnnotator` gives the reader
  select-to-highlight and margin notes (localStorage, `mlsys:study:notes:v1`) —
  write packets knowing they'll be marked up.
- **MDX LaTeX in posts.** Blog MDX (unlike packets) *can* use components:
  `$$…$$` renders via rehype-katex, and `<Equation number="1" latex="…"
  caption="…">` wraps display math in a numbered figure with a copy-LaTeX
  action menu (`components/mdx/equation.tsx`). Prefer `<Equation>` for
  named laws; plain `$$` for incidental math.
- **No bench spend.** Packets may reference the benchmark harness, but this
  skill never triggers `task bench:*` or paid API calls.
- **Prose lint gates packets too** — `study/mlsys/**/*.md` is in the manifest,
  so the pre-commit hook and `task lint:prose:file` apply. Run packets
  through it before finishing: no em dashes (en-dash ranges count against the
  budget — use hyphens), no ai-tell vocabulary, honest plain prose.
