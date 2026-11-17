---
name: mlsys-study
description: Step-through study loop for the Machine Learning Systems book (mlsysbook.ai, Harvard CS249r) — produces chapter study packets with original diagrams/sketches, reviews them with Ben, quizzes him, and distils each chapter into a draft blog essay. Use when the user says things like "next chapter", "study chapter X", "quiz me on ch N", "write the post for chapter X", or works on the MLSys book series.
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

`/mlsys-study [unit] [phase]` — defaults: unit = first chapter in
`study/mlsys/curriculum.md` not yet `posted`; phase = the next incomplete
phase for that unit. Examples:

- `/mlsys-study` — continue the loop (usually "make the next packet")
- `/mlsys-study vol1/08 packet` — packet for Model Training
- `/mlsys-study quiz` — run the interactive quiz for the current chapter
- `/mlsys-study post` — draft the essay for the current chapter

## Layout

```
study/
  cs249r_book/            # gitignored sparse clone of harvard-edge/cs249r_book
    books/<vol>/<NN_ch>/
      NN_chapter.qmd      # chapter source — read this first
      *_concepts.yml      # book's own concept map (primary/secondary/claims)
      *_quizzes.json      # book's own quiz bank (MCQ/short answers per section)
      images/             # book figures — study references; mirror the ones the
                          #   packet cites into book-figures/ (never into diagrams/)
  mlsys/
    curriculum.md         # all volumes/chapters/sections — the map
    progress.md           # state table + session log — the tracker
    <vol>/<NN-slug>/
      packet.md           # guided notes: thesis, claims, numbers, connections
      quiz.md             # written self-test + answer key (human copy)
      quiz.json           # same questions as proto StudyQuiz — feeds /study
      equations.json      # [{id,number,title,latex,caption,symbols}] — key
                          #   formulas + per-symbol drilldown; ::eq[id] refs
                          #   resolve against this file
      charts.json         # [{id,kind,title,caption,x*,series}] — bklit charts
      diagrams.json       # [{id,file,title,caption}] — figure manifest
      diagrams/*.svg      # ORIGINAL sketches distilled from the chapter
      book-figures.json   # [{id,file,title,caption}] — same shape; captions say
                          #   what our sketch does differently
      book-figures/*      # figures referenced by "Figures to look at", mirrored
                          #   for local study (CC-BY-NC-SA 4.0, attributed on the
                          #   page). SVG inlines; PNG/JPG/WebP emits a data URI —
                          #   downscale raster before committing (~1600px wide).
      podcast.md          # two-host audio-overview script: `A:`/`B:` lines,
                          #   `# hosts: Name | Name` directive, optional
                          #   `::eq[id]` markers tagging turns to equations.json
                          #   entries. ~1300-1500 words (~6 min), spoken prose —
                          #   no formulas, numbers spelled out
      transcript.json     # proto StudyTranscript — {hosts, segments:[{speaker,
                          #   text,start,end,eq?}]} emitted by study-podcast.py;
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
- The run also emits `transcript.json` (per-segment WAV durations →
  start/end seconds) into the chapter dir AND `public/study-audio/<vol>/
  <slug>.transcript.json`. The chapter page renders `<AudioOverview>` —
  a karaoke read-along player (`components/mdx/audio-overview.tsx`):
  line-sweep highlight as each utterance plays, click-to-seek, transcript
  collapsed by default (toggle + expand-full), equation chips under tagged
  turns linking to `#eq-<id>`. In MDX use
  `<AudioOverview src="…m4a" transcriptSrc="…transcript.json" />`.
- Spoken prose only — no LaTeX/formulas/tables; spell numbers out
  ("sixteen point seven milliseconds"); keep units natural.
- ~1300-1500 words ≈ ~6 minutes. Follow the packet's argument spine: thesis,
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

## Phase 1 — PACKET

1. Read the chapter `NN_chapter.qmd` end to end. Skim its `images/` filenames
   so you know which figures the book already uses — your diagrams must be
   original, not redraws of theirs.
2. Read `*_concepts.yml` — it gives `primary_concepts`, `secondary_concepts`,
   and `claims` (one-sentence statements of each claim). Use it as the packet's
   skeleton and to check you didn't miss a core claim.
3. Write `study/mlsys/<vol>/<NN-slug>/packet.md` in the canonical skeleton
   (both shipped packets follow it — copy their shape):

   ```md
   # <Chapter title>: Study Packet
   *<one-line source attribution>*

   ## Thesis
   <one paragraph: the chapter's argument, your words>

   ## Guided notes
   ### <source section heading>
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
   ## Figures to look at in the book
   ```

   - **Thesis** — the chapter's one-paragraph argument, in your own words.
   - **Guided notes** — section-by-section (use `###` headings mirroring the
     book's `##` sections): what the section claims, the mechanism, the number
     or law worth remembering.
   - **The physics** — a `| Quantity | Value | Use |` table of every
     quantitative law / back-of-envelope number (e.g. iron law, energy-per-byte
     vs per-FLOP, latency budgets). These are what make the book "systems"
     rather than "ML". Scalar values and short formula forms live here inline
     as `$…$`; the full named laws get `::eq` display blocks inside Guided
     notes where they're discussed.
   - **Marks and notes** — two packet-only syntaxes render as reading
     affordances on `/study`: `==text==` highlights a phrase (single inline
     run only — no `==` spanning `*em*`/`$math$` elements), and
     `> [!kind] Title` opens a margin-style callout with the body on the
     following `> ` lines. Kinds: `note`, `observation` (chapter insight),
     `caution` (failure mode / fallacy), `method` (how to work it),
     `connection` (Ben's-world bridge, inline where the idea lives),
     `question`. Use marks sparingly — 4–6 per packet, on the phrases worth
     underlining.
   - **Mark glosses** — `==text=={gloss}` attaches a hover card to the
     highlight: one or two sentences on why the phrase earns the mark, plus
     `[label](#section-id)` links into the page (`#charts`, `#key-equations`,
     `#sketches`, `#self-test`) or `[label](https://…)` external refs. The
     gloss may contain links and span inline markup, but no `==` or `}`
     inside it. 2–4 per packet, on the marks that need a why.
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
       charts galleries — no duplicate rendering. Book figures keep
       their CC-BY-NC-SA attribution badge inline.
   - **Glossary** — new terms, defined in one line each.
   - **→ Ben's world** — 2–4 concrete connections to his stack: the LLM
     benchmark harness (`lib/lab/llm-benchmark/`), lab effects
     (`lib/lab/registry.ts`), the shared droplet, doc-analyser/greenveil,
     past posts. The house angle is "the same structure in two places" —
     find the second place.
   - **Open questions** — what the packet couldn't fully resolve; these feed
     the REVIEW discussion.
   - **Figures to look at** — point at the book's own images worth opening
     (path + why), since ours are complementary sketches, not replacements.
     Every figure cited here should also be mirrored into `book-figures/` (see
     step 4b) so the list isn't a dead pointer.
4. Write `diagrams/` — 1–3 ORIGINAL SVG sketches distilling the chapter's
   central structures. Site-compatible: light/dark legible (prefer
   `currentColor` / neutral greys + one accent), flat, labelled, readable at
   ~700px wide. Sketches, not engineering drawings — honest hand-drawn feel
   is fine. Never copy the book's figures; distil the idea differently.
   Then place each where it's discussed with `::fig[id]` (see the packet
   syntax bullet — standalone paragraph, blanks both sides).
4b. Mirror every figure the packet cites into `book-figures/` + a
   `book-figures.json` manifest (same shape as diagrams.json; captions say
   what our sketch does differently). Sources: `images/**/*.svg|png` in the
   book repo copy straight across; TikZ/Jupyter-only figures
   (`{#fig-…}` anchors in the .qmd) have no file — pull the rendered asset
   from the published page at
   `https://mlsysbook.ai/<vol>/<NN_ch>/<NN_ch>.html` → figure div →
   `*_files/mediabag/*.svg` or `figure-html/*.png`. Downscale raster to
   ~1600px. Book assets never go in `diagrams/`. Cite each inline via
   `::fig[id]` where the packet discusses it (badge travels with it);
   anything without a natural home still renders in "From the book" with
   the CC-BY-NC-SA attribution line.
5. Write `quiz.md` — the written self-test (see TEST below for sources).
5b. Write `podcast.md` then generate the audio — format contract, TTS
   command, and gotchas live in **Generated artifacts** above.
6. Write `quiz.json` — the same questions in `StudyQuiz` shape
   (`proto/study.proto`) so the `/study` microfrontend can run them
   interactively: `kind` ∈ `MCQ|FEYNMAN|NUMERIC`, `source` ∈ `BOOK|ORIGINAL`;
   MCQs carry `options[]` + `correctOptionId` + `explanation`, open questions
   carry `modelAnswer`. Keep it in lock-step with `quiz.md`.
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
   renders it as an expandable symbol key.
9. Write `charts.json` — 1–3 illustrative datasets as proto `StudyChart` rows:
   `kind` ∈ `LINE` (date x_points) | `BAR_STACKED` | `IRON_LAW_EXPLORER`
   (baseline movement/compute/overhead terms; the UI adds the rate slider).
   Keep values honest and label them illustrative — these are packet-owned
   data, not book measurements. Series colors use `var(--chart-N)`.
   Embed each via `::chart[id]` at the point of discussion (same
   standalone-paragraph rule as `::fig`).
10. Update `progress.md` (packet ✅ + date) and report: thesis in 3 lines,
   what diagrams were made, what to read first, what's open.

### Packet verification checklist

Run before marking a packet done — this is what "green" means for the phase:

- `task lint:prose` — `study/mlsys/**/*.md` must show **0 errors** (warnings
  are report-mode).
- `npx tsc --noEmit` and the study-surface unit tests if code changed
  (`npx vitest run components/mdx/equation.test.tsx lib/study/markdown.test.ts` —
  the latter locks the `::fig`/`::chart`/`::eq` embed contract incl. code-fence
  and orphan-marker behaviour).
- `task build` — must be run after ANY study/ edit (the chapter is in
  `build:default` sources since 2026-11-15; if Task says "up to date" after
  a packet change, the source glob broke — check `taskfiles/build.yml`).
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
- Generated artifacts all landed: `public/study-audio/<vol>/<slug>.m4a`
  exists (sanity: `afinfo` duration ≈ 130-140 words/min) and the page has
  `audio-overview` markup with `ao-seg` count == transcript.json segments;
  `out/study/<vol>/<slug>/anki.txt` has `#separator`/
  `#deck`/`mlsys::<vol>::<slug_>` headers and card count == quiz.json
  question count; `out/study/concepts/index.html` contains the chapter's
  glossary terms.

### Quality review loop — code + taste

The verification checklist above is the floor. Two triggers raise the bar:

1. **Every packet**, before marking it done — run the checklist, then do one
   cleanup round: read the built page, fix anything that looks off, rebuild.
2. **Whenever study-surface code changes** (`lib/study/`, `app/study/`,
   `components/study/`, `components/mdx/audio-overview.tsx`,
   `app/editorial.css`) — run the full review: the checklist plus the review
   skills below, fix findings, then a second round until clean.

**Lenses to apply (in `~/.agents/skills/`):**

- `vercel-react-best-practices` — walk its 70 rules against the diff. The
  ones that have actually fired here: `server-cache-react` (loaders called
  by both `generateMetadata` and the page → wrap in `React.cache()`),
  `bundle-dynamic-imports`/`bundle-conditional` (bklit/d3 split via
  `next/dynamic` in both gallery and portal paths), `server-serialization`
  (props to client components carry only what the client can't render —
  chart captions are server-rendered inside `::chart` placeholders, so the
  portal payload is just the chart object), `async-parallel` (independent
  `renderMarkdown` calls in `Promise.all`), `client-passive-event-listeners`.
  Skip `vercel-optimize` — it needs a linked Vercel project + Observability
  metrics; this site ships a static export to Cloudflare Pages.
- `design-taste-frontend` — the anti-slop checklist. /study is an editorial
  surface (dials ≈ 6/4/3): restrained chrome, one accent, consistent figure
  treatment between inline embeds and galleries. Not a landing page — the
  hero/bento machinery doesn't fire.
- `gpt-taste` — apply only the overlapping subset: no emoji, button text
  contrast, no cheap meta-labels ("SECTION 01"), overflow discipline,
  reduced-motion coverage. It's a landing-page generator — don't import
  its layout opinions.
- `deslop` — packet/quiz/podcast prose whenever lint warnings pile up.

**Failure modes found in this loop — check for the whole class, not the
instance:**

- Ambient scope vars are silent traps: `var(--folio-accent, …)` resolves to
  the fallback everywhere the surface lacks `.folio-study`/`.research-article`
  (all of /study). Scope component vars with guaranteed literal fallbacks
  (e.g. `.audio-overview{--ao-a:var(--blog);--ao-b:var(--folio-accent,#a34c29)}`)
  and check both themes — a `--chart-*` palette colour under `--bg` text was
  a ~1:1 contrast bug in light mode.
- Silent-failure paths hide authoring errors: unknown `::fig`/`::chart` ids
  and orphaned `::eq` markers all emit a visible `study-fig-missing` stub —
  never an empty element or a vanished marker.
- React portals into server HTML need `createPortal(child, node, key)`, and
  anything the user should see without JS belongs in the server-rendered
  placeholder, not the portaled payload.
- Layout reads (`getComputedStyle`, `clientHeight`) never go on hot paths
  (per-frame / per-timeupdate callbacks) — measure on layout-change events,
  paint per frame.
- Ids are a namespace: `fig-<id>` anchors collide across manifests; check
  built HTML for duplicates, not just counts.
- Selector scope: a `.parent .child` rule silently misses elements under a
  sibling class — style-check embeds AND galleries separately in built HTML.
- The thing that filters must be the thing that embeds: the page used to
  regex-scan source for `::fig`/`::chart` to build galleries — a marker
  inside a fenced code block counted as embedded but never transformed,
  silently dropping the asset. The transform now reports consumed ids via
  an `embeds` out-param (`StudyEmbedReport`); never scan source for
  decisions the renderer owns. Locked by `lib/study/markdown.test.ts`.
- Render is not an effect boundary: `recordQuiz` fired inside render →
  StrictMode double-invocation counted every quiz attempt twice. Any
  write (localStorage, network, DOM side-effect) goes in `useEffect`.
- Module-level localStorage caches + `storage` events: a listener that
  notifies subscribers but leaves the memoized `cache` intact never syncs
  cross-tab. One module listener: invalidate cache, then notify. And
  `useSyncExternalStore`'s server snapshot must be a stable constant
  (`const EMPTY = {}`), not `() => ({})`.
- Parity across surfaces: when inline embeds gained the attribution badge,
  gallery book figures stayed bare — same asset, two treatments. Any
  visual affordance added to one figure path gets mirrored in the other.
- Shared hooks before copies: `useReducedMotion` was inline in one file
  while a sibling component hardcoded `animationDuration` without it —
  extract `components/study/use-reduced-motion.ts` rather than letting
  the second consumer drift.

**Review coverage rotates:** re-reviewing the same files finds nothing.
Alternate slices per round — render pipeline → client stores → a11y →
perf hot paths → parity between inline and gallery surfaces → edge cases
(fences, orphaned markers, corrupt JSON). This round's pass over
`progress.ts`/`notes.ts`/`quiz-runner.tsx` caught four real bugs the
first loop's HTML-focused review couldn't see.

**After each review round:** rerun `tsc` + `eslint` + `task build` + the
built-HTML checks, and fold durable lessons back into the checklist above
(or this section) — the loop only earns its keep if next chapter inherits
the findings.

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
  `lib/lab/registry.ts` first.
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

- **Chapter order.** Default next unit = first non-`posted` chapter in
  curriculum order (vol1 → vol2 → vol3 → vol4). Only skip when the user says.
- **Packet ≠ post.** The packet is faithful notes for learning; the post is
  an original essay for readers. Don't paste packet sections into posts.
- **License discipline.** Attribute always. Original diagrams only — the
  book's `images/` are reference for understanding, never republished. The
  derived blog posts carry their own license as Ben's original essays with
  attribution to the book.
- **Keep `study/` private scaffolding** — it's committed for durability but
  it's not site content; nothing under `study/` goes to `content/` or
  `public/` directly. Post assets are authored fresh under `content/blog/`.
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
