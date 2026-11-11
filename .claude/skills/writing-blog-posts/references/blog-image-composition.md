# Blog artwork: style + theme + topic

Use this reference when composing, generating or reviewing blog thumbnails and header artwork. It extends the article's editorial brief; it does not choose the article's voice, taxonomy or authorship.

## Three independent choices

| Axis | What it controls | Useful choices |
|---|---|---|
| **Style** | Medium and composition language: how the scene is drawn and arranged | Paper and ink, precise technical section, geometric plate, restrained object study |
| **Theme** | Mood, palette, contrast and surface/lighting treatment | Warm and tactile; cool and measured; quiet archive; energetic but controlled |
| **Topic** | The article-specific factual subject, claim or concrete metaphor | A proposed result failing a check; a queue meeting limited capacity; waves spreading through a gap |

A family is a deliberate **style + theme + framing** combination reused with different topics. A topic can also be explored in more than one family. Keep the subject's meaning intact when changing medium or colour. Here, **theme** means the artwork's mood and treatment; the site's light/dark interface modes are separate display contexts to test.

The site topic in `lib/topics.ts` controls UI labels and accents. It is separate from the topic in an artwork brief. Do not change labels or slug mappings to obtain a colour, or infer authorship from either. A palette may echo a UI accent when that helps coherence, but there is no mandatory category-to-art-colour lookup. Preserve `.impeccable.md`'s restrained technical character and test both site backgrounds.

## Compact brief

Complete this before generation. The filled example is review metadata, not new site frontmatter:

```yaml
asset: thumbnail                 # thumbnail or inline-header
article: using-my-dot-with-codex
topic:
  thesis: A proposed result still needs checking against the actual work.
  scene: An ink disc and an offset outline; a pencil tip points at the mismatch.
  basis: metaphor               # metaphor, sourced-phenomenon or referenced-object
  must_preserve: The two circles do not line up; this does not show a passed check.
  evidence: Supplied observations in the article; no claim to be a Codex screenshot.
style:
  medium: paper and ink
  composition: One tilted paper sheet, two large circles and one pencil tip.
theme:
  mood: warm, thoughtful, tactile
  palette: ["#131318", "#e9e2d4", "#ff7a59"]
  treatment: Matte pigment, restrained grain, soft directional light, no glow.
framing:
  master: 1536x1024
  web: 1200x800
  focal_safe_area: Central 50–55% of width and central 75% of height.
text: none
provenance:
  article: ai-assisted           # human-written, ai-assisted, ai-generated, unknown
  article_basis: This draft was produced with AI assistance.
  human_review: pending
  artwork: planned-ai-generation # Change to ai-generated only after successful generation.
alt_draft: An orange disc and an offset graphite circle on ivory paper, with a pencil at their mismatch.
```

For edits, add `reference`, `change` and `keep` fields: identify the actual input asset, the requested change and the invariants. Keep the original master. For a factual phenomenon or specific object, cite the source/reference in the brief; without one, use a clearly identified concept or resolve the missing fact before claiming fidelity. Final alt text is written after viewing the generated pixels.

## Make the choices

- Start with the thesis and one visible relationship. “AI” is a subject area, not a scene. A misaligned proof expresses a checking problem without inventing machinery or a product screenshot.
- Pick style for what must read: paper/ink supports an essay metaphor; a section exposes a mechanism; geometry clarifies a spatial relationship; an object study suits a concrete artifact. These are starting points, not category assignments. A queue can be printed on paper, drawn geometrically or rendered as an object study.
- Pick theme separately. Use two quiet base colours plus one accent by default. Warm paper need not be orange; precise engineering need not be blue. Change mood and treatment while preserving sufficient contrast at 85% image opacity. Avoid using colour as the sole carrier of meaning.
- If style conflicts with the factual relationship, simplify the style or use another one. A glossy sphere should not replace the actual wave behaviour just because it looks polished. For equations, measured results or exact wiring, use verified diagrams in the article; imagegen concept art is not technical evidence.
- If a user specifies a style, theme or subject, keep that axis fixed. Resolve remaining choices from the article and nearby artwork. Vary one axis at a time when evaluating a weak result; do not add props to rescue an unclear idea.
- Keep provenance separate. Paper/ink does not mean human-written. Use `human-written` only when supported by the author's declaration or known workflow; otherwise keep `unknown` or the observed assistance level. Do not infer an existing article's authorship from its date, appearance or topic.

## Compose the prompt

Build a short labelled prompt from the brief, in this order:

```text
Use case: stylized-concept (or the appropriate supported imagegen use case).
Asset: blog thumbnail, landscape 1536×1024.
Topic and scene: [thesis expressed through one concrete visible relationship].
Factual invariants: [what must remain true; conceptual versus sourced depiction].
Style: [medium + composition language; number and scale of elements].
Theme: [mood + explicit palette + material/lighting treatment].
Framing: essential motif within central 50–55% width / 75% height;
         clear silhouette at 128×96; centre portrait crop must retain the meaning.
Avoid: [subject-specific errors] plus clutter, tiny decorative details,
       generic AI machinery, chrome, glass, neon bloom and particle clouds.
STRICT: no text, letters, numerals, equations, logos, labels, badges or pseudo-text.
```

The avoid list describes this site's restrained default, not a ban on every future use of those materials. An explicit user concept may justify an exception; retain legibility and factual constraints. For an edit, add the reference and exact change, then repeat the `keep` invariants. Do not silently convert an edit request into a fresh image.

Use imagegen for artwork generation or changes. Use supported image processing for crop, resize and optimisation. Do not draw a replacement illustration in a processing script. Save the actual prompt, input references, tool-reported model/settings when available, source master and selected asset. Do not guess unreported generation settings. Keep planned artwork labelled as planned until generation succeeds; briefs and prompts alone do not establish that an image exists.

## Examples that combine the axes

These are compositional alternatives, not claims that every variant has been generated.

**Same topic: a proposed result still needs checking.** Keep the visible mismatch across these choices:

| Style | Theme | Scene |
|---|---|---|
| Paper and ink | Warm/tactile: charcoal, ivory, orange | Offset ink disc and graphite outline, pencil at the discrepancy. This is the approved Codex direction. |
| Geometric plate | Warm/tactile: charcoal, ivory, orange | A filled disc and displaced contour with gently textured flat edges. Keeps topic and theme while changing the visual language. |
| Geometric plate | Cool/measured: navy charcoal, pale ivory, muted blue | A filled circular area and a displaced contour, flat edges, no paper or pencil. The offset itself carries the claim. |
| Paper and ink | Quiet archive: warm ivory, graphite, muted violet | The same disc-and-outline relationship as a two-ink print; a narrow graphite pointing stroke. Keeps style and topic while changing theme. |

**Different topics, one family.** Hold paper/ink style, warm charcoal/ivory/orange theme and central framing fixed:

| Topic | New scene | What must survive |
|---|---|---|
| Checking agent work | Offset disc and outline | The mismatch, not a success tick |
| Backpressure | Large printed squares queue before a narrowing paper channel | Queue, bottleneck and downstream space |
| Diffraction | Broad ink wavefronts meet a gap and spread as arcs beyond it | Gap and change in front shape; identify as a qualitative illustration |

The other approved treatments remain useful combinations: **precise engineering + measured charcoal/ivory/green + backpressure**; **geometric science + quiet charcoal/ivory/violet + diffraction**; **object study + warm charcoal/ivory/amber + USB adaptor concept**. The last is illustrative, not a photograph of tested hardware. These colours describe those samples, not permanent assignments for Software, Physics or Electrical Engineering.

## Framing, type and delivery

Generate a 1536×1024 master when supported; optimise a 1200×800 WebP around quality 80–82, inspecting the result. Preserve the source. Typical card artwork should be comfortably below 150 KB when quality allows; this is a target, not a reason to accept visible damage.

The current list frame is 160×112 desktop / 128×96 mobile; its border leaves 158×110 / 126×94 interiors. Images use `object-cover`, 85% default opacity and a 1.1× hover scale. The 1200×630 social card contains a **430×490 portrait artwork panel**, retaining only about 58.5% of a 3:2 image's width. Keep the essential relationship inside the central 50–55% width and 75% height. Paper corners, a shaft or a barrier edge may crop; the mismatch, pencil tip, gap or relevant object cannot. These bounds are a starting envelope, not proof of crop safety. Featured-card cropping is variable, at 90% opacity and 1.05× hover; inspect that placement when used. Recheck component dimensions when the site changes.

Keep typography out of generated art. The site supplies Space Grotesk headings, Hanken Grotesk prose and JetBrains Mono metadata. If a separate cover needs lettering, typeset it deterministically outside the artwork and test its own layout; do not bake a title into a small thumbnail.

Use one-sentence alt text for the visible objects and relationship, not the article title or an unseen conclusion. Example: “Five green blocks queue above a narrow opening, with one block below it.” Do not put AI provenance into every alt sentence; record provenance separately and use a caption where that context matters. The current blog card uses the title as alt, and the loader has no `heroImageAlt` or authorship field. Supply the proposed alt and provenance in review metadata rather than claiming unsupported frontmatter is wired up. An inline MDX image can use the descriptive alt directly.

Mirror selected assets into `content/blog/<slug>/` and `public/blog/<slug>/`; set `heroImage` to the public URL. Header artwork is a separate inline MDX image if requested. Keep earlier assets until the replacement is accepted. Leave publication and code changes within the user's authorised scope.

## Acceptance at real size

Inspect the master pixels, both card sizes on light and dark backgrounds, the portrait social crop and hover crop. Check that the central relationship reads at 128×96 without zooming, opacity does not erase a thin contour, colour is not the only cue, and no malformed object or stray text survives. Check important science/object claims against their references; even a qualitative concept must not depict a misleading relationship. A successful generation is not a factual validation.

Accept the best fit, not the most elaborate image. For a failure, name the defect and make one targeted change. Report the selected prompt, dimensions, final alt text, provenance and checks actually completed. A paper/ink treatment remains a visual choice even when an article is AI-assisted.
