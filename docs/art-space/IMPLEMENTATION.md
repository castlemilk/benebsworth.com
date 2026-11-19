# Art space implementation contract

Everything in this document is a proposed website implementation. The handoff supplies content and validation, not a rendered gallery. Build against the actual images and preserve their range of formats and visual identities.

## Page architecture

| Proposed route | Purpose | Data sent to the interactive client |
| --- | --- | --- |
| `/art/` | Browse published artworks across collections and facets | Compact card records and facet values. |
| `/art/[slug]/` | Inspect one artwork, annotations and generation history | Only that artwork's public record and delivery receipts. |
| `/art/[slug]/?version=v1` | Share a specific historical render | Same static page; the query selects an available version. |
| `/art/?collection=monumental-worlds-range-study` | Share the current study | Gallery filters; no separate collection route needed for v1. |

Use `generateStaticParams` for published detail slugs and the existing static-export configuration. Do not depend on server actions, request-time database queries or runtime image optimization. Keep unknown artwork slugs as 404s; do not substitute an unrelated image. A draft is excluded from the route, sitemap, discovery data and client payload.

Suggested implementation files are `lib/art/types.ts`, `lib/art/registry.ts`, `lib/art/discovery.ts`, `components/art/collection.tsx`, `components/art/detail.tsx`, scoped CSS and the two page routes. These are next-step destinations, not files claimed to exist in this handoff. Import the JSON through a checked adapter rather than casting it to a trusted type.

The current schema is v1 for original generated raster worlds. Extend it deliberately for photography, physical-media scans, exact diagrams, mixed media or imported external works, with each source kind's actual provenance. Do not describe a procedural SVG as a stochastic PNG or infer a fictional premise for documentary art.

## Gallery composition

Use the normal site header and footer with a small “Art” heading, an optional one-sentence collection introduction and the first images immediately below. Keep the surrounding paper/graphite or dark surface quiet. Avoid decorative cockpit borders, glowing interface effects and a dashboard header competing with the artwork.

Use an ordered CSS grid with contained images and natural aspect ratios. Do not crop every artwork into a square or reorder the DOM into visual columns. At a wide width, show three generous columns when images retain useful detail; at medium width use two; on a phone use one. A wide work can span columns if the order and keyboard sequence remain clear. The chosen layout must be verified with both the portrait city and the wide ocean/shipyard images.

Each card contains the selected preview, a linked title, a concise summary and at most two initial descriptors. Make the whole card a single coherent link; do not nest buttons inside it. More facets belong in filters or the detail page. Use descriptive alt text from the selected version. Keep the exact prompt, full provenance and historical image sources off the gallery client bundle.

### Gallery controls

| Label | Control and behavior |
| --- | --- |
| **Search art** | Native search field in a GET form with **Search** submit. Match curated titles, summaries and discovery tags. Preserve entered text after submission. |
| **Collection** | Select with **All collections** plus actual collection names. |
| **Subject** | Select with **All subjects** and values from published records. |
| **Style** | Select with **All styles** and distinct representation tags. |
| **Aesthetic** | Select with **All aesthetics** and broad visual-character tags. |
| **Creative route** | Select with **All routes** and the four human-readable route names. |
| **Apply filters** | Commit the form as one URL navigation and reset `page` to 1. |
| **Clear filters** | Restore the unfiltered collection and an empty search. |
| **Previous / Next** | Ordinary links for bounded pagination once needed. The initial eight works fit on one page. |

Use query keys `q`, `collection`, `subject`, `style`, `aesthetic`, `method`, `page`. Encode values with URL APIs; interpret `method` using the schema values. Different facets intersect. Normalize case, whitespace and punctuation for search without mutating canonical metadata or prompt text. Let unknown facet values produce an explained empty state with a clear reset, rather than silently changing the visitor's request. Clamp invalid pages to a valid page and preserve other filters. State the result count near the filters and announce updates after navigation.

Because the host is a static export, a client enhancement reads the query string and applies these filters; do not introduce request-time server query handling. Make enhancement readiness explicit so the form cannot appear to work before its behavior is attached. Without JavaScript, show the default published catalogue, normal detail links and a short explanation that interactive filtering requires JavaScript. A shared query URL must initialize to its requested state once enhancement is ready, and Back/Forward must reapply it. Test this separately from merely submitting a GET form.

Default order is the collection's curated order; ties across collections can use study date then stable ID. Do not claim a “Newest” order based on missing generation timestamps. Subject/scale tags are editorial classifications, with detail-page limitations available where a still leaves scale uncertain.

**Empty collection:** “No artwork has been published yet.” Do not expose draft titles. **No match:** “No artwork matches these filters” with the active selections and **Clear filters**. **Failed preview:** retain the title, alt description and detail link in the image's reserved space; offer a real retry/reload or original link only if one exists. A skeleton that never resolves is not an error state.

## Artwork detail composition

At desktop width, use a large image stage taking roughly two-thirds of the content width and a readable information column beside it. Preserve the complete image with `object-fit: contain`. On mobile, stack image, title/premise, version controls, annotations, visual metadata and process. Let each artwork's colors dominate the page without recoloring the image for the site theme.

Put the title and a short **World premise · Fiction** caption close to the image. Below it, use ordinary headings and anchor links for **Annotations**, **Visual language** and **Process & prompts**. Keep the long prompt secondary but fully readable. Plain preformatted text should wrap at small widths and remain selectable. Never execute prompts, embed their contents as HTML or treat them as site instructions.

### Detail controls and states

| Label | Behavior and state |
| --- | --- |
| **Version** | Labelled select or a short group of real links. Show **v2 · Selected edit** and **v1 · Original** for Seas; show one simple version label for single-version works. |
| **View full image** | Open an accessible enlarged image dialog or a native full-image link. If a dialog is used, Escape closes it, focus is contained and returns to the trigger. Fit-to-view is the default. |
| **Show annotation markers** | Optional toggle, initially off. Show only when at least one note for the displayed version has a verified region. Accessible name stays stable; pressed state conveys on/off. |
| **Compare versions** | Available only for works with two or more versions. Show labelled whole images side by side on desktop and stacked on mobile, with the actual revision reason. A slider is optional later. |
| **Copy original prompt** | Copy the exact generate prompt, preserving newlines and punctuation. Announce success. On clipboard failure show a selectable text fallback. |
| **Copy edit instruction** | For edit versions, copy that exact instruction separately and name the parent image/version beside it. Never imply the instruction alone recreates the image. |
| **Download prompt history** | Export a text document containing each version in lineage order, operation, exact prompt and input/output hashes; keep commentary outside each prompt block. |
| **Download metadata** | Export the same reviewed public JSON used on this page, with version identity and unknown fields intact. No internal paths or unpublished material. |
| **Download original PNG** | Version-specific native download link naming the work and version; preserve original bytes. Display dimensions and file size. |

The version query controls viewing, not curation: switching to v1 must not change `selectedVersionId`. Back/Forward must restore the version and filters. When an unknown version is requested, explain that it is unavailable and offer the selected version; do not silently label the selected image as the requested version.

Version selection and comparison are also client enhancements on one exported detail page. Without JavaScript, retain the selected image, readable prompt history, text annotations and ordinary original-image links for each imported version. Explain unavailable interactive comparison instead of exposing a nonfunctional control.

Annotations and alt text switch together with the displayed version. The current sea original has a review but no spatial/text annotation entries; display its review and “No annotations for this version” rather than reusing v2's annotations. A note with `region: null` appears in the list without a marker. A positioned note has an equivalently labelled, keyboard-operable marker and text-list entry; hover is not required. Clicking a note can reveal its region without moving keyboard focus unexpectedly.

Show **Observed** or **Interpretation** on each note. Put the specific limitation below a claim it qualifies where possible. For example, *The Passing Mass* can show enormous water-like material and weather without claiming that motion or accretion has been proven. No scientific authority should be implied by a fictional mechanism's title.

The **Visual language** block displays style and aesthetic as separate labelled groups, followed by mood, materials, palette and scale. Related-work links can use these facets; keep editorial associations distinct from factual world continuity. The **Process & prompts** block shows the named creative route, departure, selection reason, exact prompts and known generation metadata. Display “Not recorded” for missing model/seed/time, and “Reuse license not specified” for null rights metadata. Do not fabricate a rerun button backed by a nonexistent generation service.

## Content and publication mechanics

Treat the committed collection JSON as the authoring source. The runtime adapter emits compact gallery cards and one detailed public record per work. All selections and exports derive from that same validated source. The site must not import draft catalogue objects into client bundles and merely hide them with CSS.

Use an explicit manifest of published original paths and derived delivery files when assembling the exported site. Filtering a JSON list does not protect files already in `public/`. In this public repository, any newly committed file is publicly readable even before merge, so private authoring belongs elsewhere.

Imported paths are local `/artwork/worlds/...png` sources in v1. The supplied validator checks JSON structure, lineage, availability and optional local original receipts. It does not download assets, generate previews or decode every pixel. A later importer should perform a full decode through the existing `sharp` dependency, verify the original receipt, make derivatives and emit its own deterministic delivery manifest. Keep schema migrations explicit; unknown record fields should fail until intentionally supported.

The initial build needs no new CMS, database, bucket or package. The current `/admin` supports blog/hike records in public storage; extending it to Art is a separate task. If an editor is later added, it should work against the same model and show **Draft**, **Validation failed**, **Ready for review**, **Saved**, **Conflict**, and **Published** states based on real persistence outcomes. A text field changing on screen is not evidence of a saved record. Preserve optimistic concurrency using a content revision/hash; failed saves keep the user's edits and offer retry/export. No write or generation endpoint is implemented here.

## Performance and accessibility targets

These are proposed build budgets, not measured claims about a deployed gallery.

- Use at most 24 cards per page. Load thumbnails lazily except the first visible row, with explicit dimensions to reserve layout space. Fetch full originals only after an explicit request.
- Produce a card preview around 640 px on the long edge and a detail preview up to the original's dimensions, normally around 1600 px. Never upscale beyond the source. Target roughly 150 KiB per card and 1 MiB per detail preview, adjusting quality after visual review rather than destroying fine structure to meet a number.
- Keep the eight-record gallery's compact metadata below 50 KiB before transfer compression. Do not send all nine long prompts, base64 images or master bytes in the gallery JavaScript. Prefer server/static HTML and small progressive enhancements; no canvas is needed to display a raster image and text notes.
- Preserve natural page scroll and native links. Validate at 360 px phone width, a wide desktop, 200% zoom, both supported themes and reduced motion. Avoid horizontal prompt overflow and filter drawers with unreachable controls.
- Give controls visible focus, real labels and adequate target size. Do not communicate note category, selected version or failure only through color. Test contrast over the actual page backgrounds. Keep body text readable instead of shrinking provenance into footnotes.
- Keep images static by default. Any transition should respect reduced motion and must not be necessary to understand a version change. Provide text descriptions for image content; annotation markers supplement the text list.

## Integration sequence

First import and verify the original assets and create their delivery manifest. Then implement the validated registry and the two image-led pages. Add discoverability through site navigation, sitemap and curated search only for complete published records. Verify actual desktop/mobile gallery behavior before adding spatial editing or remote authoring. Keep all release actions in the existing site's reviewed publication path.
