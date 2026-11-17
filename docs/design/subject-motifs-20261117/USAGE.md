# Usage and semantic rules

## Asset identity and delivery

Use the stable `BSM-20261117-01` through `-04` IDs with revision `r1`. A new creative revision must receive a new revision suffix and keep the previous original and receipt. A resized file is a derivative, not a new original. The manifest is this packet’s own record; it is not a shared category or graph registry.

Application references must carry: ID/revision, original path or pinned URL, SHA-256, pixel dimensions and alpha description, intended role, semantic caveat, theme policy, minimum useful display size and descriptive text. The supplied manifest contains those fields for every asset. A file path under `public/` is a proposed source asset, not evidence of deployment or adoption.

## Scale and placement

| Full canvas size | Permitted interpretation |
| --- | --- |
| 64 px | Decorative preview beside an accessible subject label. Do not depend on record panels, nib count or the red accent to convey meaning. |
| 128 px | Recommended minimum labelled thumbnail. The principal silhouette and relationship survived static light/dark review. |
| 256 px and above | Appropriate for reading the pointer, support, retained-tape and multiple-contact relationships. Scientific explanation still belongs in text or an exact diagram. |
| 512 px to original size | Article-scale spot illustration if accepted by the application/grammar owners. |

Keep the full square canvas and its built-in spacing. Do not trim transparent margins, crop to an apparent alpha bounding box, enlarge to a common painted-box size or stretch one dimension. Raw alpha contains low-opacity generator residue, so automatic nonzero-alpha trimming would also produce misleading bounds. Do not surround the art with decorative gear, orbital, lattice or connector constructions that reintroduce existing subjects.

## Light and dark

Use the same RGB/alpha original on both themes. The final examples use the existing folio surface colours `#f4f1e9` and `#111312`, read from `app/globals.css` at the audited revision. Do not bake a matte into a production derivative, invert the image, tint the whole subject, or recolour red to express application state. Review matte PNGs are opaque specimens only. Check a different receiving surface in the consuming layout before adoption.

## Meaning, captions and accessible text

| ID | Suggested caption | What the image does not establish |
| --- | --- | --- |
| 01 | Single-qubit state — a Bloch-sphere-inspired illustration of orientation. | A numerical state, gate angle, physical qubit, orbital model, multi-qubit state or complete account of quantum operations. |
| 02 | Cantilever gyroscope — an illustrative rotor, axle and support. | Motion, precession rate, nutation, stability, conservation, dimensions, manufacturability or measured behaviour. |
| 03 | Reverse-mode differentiation — retained computation revisited during sensitivity accumulation. | An inverse function, erased or undone forward computation, actual derivatives, an execution trace or an optimiser update. |
| 04 | Vectorised arithmetic — a shared operation across several elements. | Four hardware lanes, SIMD width, a thread schedule, masked/active lanes, a numerical result or a speedup. |

The qubit’s radial pointer refers to a representational idea. A surface pointer cannot explain mixed-state interior points or measurement/noise channels by itself. The gyroscope’s static support is a visual construction; a precession explanation requires its own correctly qualified text. The tape’s stylus revisits work, without an arrow asserting a derivative path or temporal direction. The shared tool’s four contacts are compositional. Its red nib is an accent only.

The `alt_text` entries describe what is visible. When the image is informative, retain a nearby technical subject label/caption because these metaphors do not name themselves. When the image merely repeats an adjacent linked heading, the consuming accessibility owner should decide whether empty alt text avoids repetition. No screen-reader or interactive-layout acceptance has been performed here.

## Source and evidence labels

Label the art **Illustration** wherever an evidence-basis distinction is needed. An association with a source article establishes relevance, not verification of generated geometry or the article’s every claim. It does not create a category, graph edge, equivalence, source citation, status indicator or navigation meaning. Do not use these motifs as controls, source-validity marks, icons for live state, product logos or replacements for canonical third-party symbols.

Primary references were consulted for the semantic boundaries only:

- [Microsoft Learn: the qubit](https://learn.microsoft.com/en-us/azure/quantum/concepts-the-qubit), for the single-qubit Bloch representation and the distinction between unitary operations and measurement.
- [OpenStax: precession of a gyroscope](https://openstax.org/books/university-physics-volume-1/pages/11-4-precession-of-a-gyroscope), for torque/angular momentum and the assumptions behind the simplified precession treatment.
- [JAX: forward- and reverse-mode autodiff](https://docs.jax.dev/en/latest/jacobian-vector-products.html), for reverse-mode vector-Jacobian products and retained-computation context.
- [NumPy: multiply](https://numpy.org/doc/stable/reference/generated/numpy.multiply.html), for elementwise array multiplication without an implementation or performance promise.

Consulted 17 November 2026. No source image from these references was used, copied or traced. Exact repository sources and hashes appear in the [gap map](gap-map.md) and [source audit](audit/source-audit.json).
