# Artwork authoring workflow

This workflow produces an artwork record that can be inspected, compared and published on the proposed Art space. It can be run manually or followed by a coding/creative assistant. It does not invoke a scheduled task, spend on generation automatically or create a new image API.

## 1. Begin with a consequential idea

Write one sentence about the world and one sentence about the image moment. A civilization's value, an ecology, an unfamiliar material process or an unexplained encounter can supply the premise. Unlimited energy and long timescales are valid fictional assumptions. Do not force conflict, fuel scarcity, human society or familiar machinery into every image.

For an exploratory set, first list the existing works' purpose, construction logic, silhouette, setting, camera, material and emotional register. Preserve the successful qualities: tangible mass, depth, legible scale, selective detail and atmospheric finish. Keep the particular shapes and palettes open. A second world needs a different spatial or conceptual relationship, rather than just a recolor.

## 2. Choose the creative sequence

| Record value | Working sequence | Useful when |
| --- | --- | --- |
| `story-first` | Develop the premise, then translate its consequences into a scene | A value, event or ecology already supplies a clear subject. |
| `departure-first` | Notice the familiar image; replace a major visual construction, then give it coherent purpose | Silhouettes, materials and staging are becoming repetitive. |
| `story-departure-coherence` | Begin with a premise; deliberately change its obvious depiction; follow the consequences back into the world | A complete narrative scene needs both clarity and surprise. |
| `departure-story-coherence` | Begin with an unfamiliar spatial/material relationship; develop its consequences and history | An artifact or encounter can retain useful mystery. |

Use story → departure → coherence as a practical starting point from the current study, while retaining the others for range. This is an editorial preference from eight different scenes, not measured superiority or a numeric blend slider. Antialgorithm is a creative method; it is not the image renderer.

Write `creativeProcess.departure` in plain language: what familiar construction was replaced and why. Derive a change in topology, process, material, viewpoint or event before adding style adjectives. Respect user-fixed choices. An escape from a pattern can become the next pattern, so compare with the recent actual collection.

## 3. Translate the premise into visible construction

Choose two or three consequences a still image can actually show. State the organizing mass or pattern, its position, foreground and background relationships, scale cues, material transitions, source of light and selective detail. Organic technology should integrate a process such as growth/fabrication, sensing/computation or circulation/transport into its construction. Plant decoration alone does not establish this relationship.

Separate invented purpose from visible appearance. A scene may suggest regeneration, propulsion or altered gravity without demonstrating it. Preserve that mystery in the premise and record the limit in the review.

Draft the full prompt with concrete nouns and spatial relationships. Use the actual image-generation tool's supported inputs. Do not invent seeds, model flags, lens metadata or API parameters. For an edit, identify the real input image and state what should stay fixed before describing the change.

## 4. Register each real render

After a successful generation, add a version under one stable artwork ID. Record the exact prompt that was used, operation, parent version for an edit and whatever service information is actually available. A prepared prompt with no output is not a render version in this contract.

Keep `model`, `seed` and `generatedAt` null when unknown. The collection's `studyDate` does not fill a missing per-image timestamp. A hash proves output byte identity; it cannot reproduce a model's stochastic output. `deterministicReplay: false` is deliberate for these records.

Compute SHA-256, byte count and dimensions from the original output. Preserve the original PNG unchanged. Use actual measured aspect ratio even when it differs from the requested format. Record the successful focused edit as another version, retaining its exact parent and edit instruction.

**Example:** *The Joining of Two Seas* is one work with v1 generated from the original prompt and v2 edited from v1. Its selected version is v2. The gallery must still count one artwork, and the detail page must distinguish “Original prompt” from “Edit instruction”. Copying the edit instruction alone is not a self-contained reproduction recipe.

## 5. Inspect the image before annotating

View the actual result without its title. Check whether its monumental science-fiction identity, mass, spatial depth and material relationships survive without explanatory prose. Then inspect local details and the specific event the prompt requested. Compare the visible image with the premise rather than treating requested features as observed facts.

Use one focused correction for the most consequential mismatch. Keep successful geometry and finish fixed where possible. After the bounded revision, record any remaining ambiguity honestly. A quiet alien landscape can remain mysterious; it does not always need added hardware to explain itself.

Write a selection reason. It should say what improved or what ambiguity was intentionally retained, rather than assigning a fabricated originality score.

## 6. Describe and annotate

| Field | Authoring rule | Example |
| --- | --- | --- |
| `summary` | A short catalogue description; avoid hidden-engine claims | An immense membrane landscape under blue water. |
| `premise.text` | Explicitly fictional world context | Two ocean ecologies join through an exchange system. |
| `taxonomy.styles` | Representation and finish | Painterly, selective sharp edges. |
| `taxonomy.aesthetics` | Broad visual/world character | Organic technology, elemental mystery. |
| `taxonomy.subjects` | Curated depicted subject or openly stated scene interpretation | Inhabited megastructure, vessel fabrication. |
| `taxonomy.scales` | Editorial scale category, qualified by the review | Monumental, planetary, astronomical. |
| `taxonomy.moods` | Subjective emotional reading | Serene, uncanny, communal. |
| `taxonomy.materials` | Apparent surfaces, not tested substances | Chalk ceramic, translucent membrane. |
| `taxonomy.palette` | Descriptive colors | Calamine pink, pale limestone, moss green. |
| `review.observed` | What the specific output shows | Terraces, a vast wall and a curved green interior. |
| `review.limitations` | What remains ambiguous or absent | Distinct gravity regimes cannot be established by the still. |
| `review.alt` | Concise visual description of this version | Identify subject, main relationship and meaningful scale cue. |

Do not call a generated image a physical oil painting because its finish looks painted. Do not invent sampled hexadecimal colors; a later sampling pass can add an explicitly measured palette through a schema extension.

Annotations belong to a **version**, not just to a work. Add two or three useful notes about scale, material, composition, light or atmosphere. An interpretation is labelled `basis: "interpretation"`; it is not silently displayed as observed engineering. Keep exact prompts free of editorial rewrites, even when the metadata improves.

Begin with `region: null`. This is a useful text note with no spatial marker. Add a rectangle only after inspecting that version's pixels. Coordinates are normalized against the complete uncropped image, with origin at the upper left. Require positive width/height and bounds entirely within `[0,1]`. When a new version changes geometry, review and reposition its notes explicitly; never reuse old marker positions automatically.

## 7. Import originals and prepare delivery images

For each original, recover the actual bytes and check the recorded SHA-256, byte length, PNG format and dimensions. Match by digest rather than guessing from a title. If the source is missing or differs, retain `not-imported` and explain the gap; do not regenerate and call the result the same original.

For the first build, place an accepted original under:

```text
public/artwork/worlds/<artwork-id>/<version-id>-<sha256-prefix>.png
```

Then set `asset.availability` to `imported` and `asset.src` to its root-relative `/artwork/worlds/...png` URL. This source change is a deliberate import into a public repository. Never put private drafts, reference footage, transient sandbox paths, signed URLs or credentials into these records.

Generate smaller delivery derivatives in a separate, deterministic build step using the repository's existing image tooling. The importer is a next milestone, not part of this handoff. A derivative receipt should identify its original hash, transform settings, dimensions, bytes, hash and tool version. It must never overwrite the master or masquerade as another creative version. Store these receipts in a separate delivery manifest so the present original-record schema remains exact.

The proposed gallery uses a thumbnail; the detail page uses a larger preview; “Download original PNG” resolves to the unchanged master. A future storage adapter may change delivery location after explicit review, while preserving the identity and receipts. The existing hiking bucket does not become private Art storage by adding a prefix.

## 8. Review the public record and select the version

Check title, public prompt text, alt descriptions, annotations, version lineage, selected version and source permissions. Set a display credit only when Ben chooses it. Leave `reuseLicense` null until an actual license is selected; the upstream method's MIT license does not grant a license to these images. A download link describes access, not a reuse grant.

Run metadata and asset checks. In v1, a work can be marked `published` only when all its recorded original versions are imported, so the public history has no broken source images. The future runtime must take only published records and an explicit public projection. `draft` is a gallery visibility state, not privacy protection for GitHub content or anything in `public/`.

Inspect the rendered gallery on desktop and phone using these real images, including keyboard controls, long prompts, missing-image recovery and version switching. Capture real page evidence. A schema check, sketch or generated mockup does not establish browser behavior.

Publication to the live site remains the existing release owner's action. Pushes, PRs, merges and deployments are separate states; retain current release holds and do not change settings, credentials or infrastructure as part of content preparation.

## 9. Learn without flattening the collection

Keep a short ledger of qualities worth retaining and forms still to explore. Review the actual set for repeated architecture, material, cultural shorthand and camera choices. In the current set, pale mineral surfaces, warm cavities and robed observers recur despite substantial structural range. Use the next brief to change those specific defaults when useful, while retaining mass, depth and atmospheric quality.

Feedback updates metadata or adds a version. It never changes an old image's bytes or rewrites the prompt used to make it. Future collections may explore other art directions; monumental sci-fi is this collection's brief, not a permanent restriction on the whole Art space.
