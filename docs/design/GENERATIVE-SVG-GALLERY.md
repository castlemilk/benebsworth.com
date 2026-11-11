# Generative SVG gallery

## Current direction

The user approved graphite/red imagery for the gallery, then asked for dynamic styling, mathematical generation and an SVG framework. The implementation covers all 25 original manifest IDs on the existing `/vectors/` route. Each drawing has a declared model and shares a small styling lab. Catalogue coverage is complete; browser and release acceptance remain separate.

The gallery's job is to let a visitor explore a drawing, distinguish its model from its appearance, and export the exact current SVG. Its visual mode is an artwork-led gallery with a single inline workbench, not a dashboard or a modal studio. Existing site navigation and all other page identities stay unchanged.

The three imagegen concepts (Sine Wave, Prism Dispersion, Binary Search Tree) are art-direction references only. Their generated strokes were not traced or treated as scientific data. The originals and prompt records remain preserved separately.

## Drawing language

- Light: paper `#f4f1e8`, graphite `#28343b`, red `#b32624`.
- Dark: surface `#11171b`, warm ink `#f4f1e8`, pale red `#ffaaa5`.
- Figure guides: `#707b80` light and `#9ba8ae` dark.
- Page text: `#56636a` light and `#b3bdc1` dark for secondary text.
- Existing Folio Serif for titles; existing Hanken Grotesk controls. Monospace is reserved for SVG node values/code, not decorative interface labels.
- A common 320 × 240 transparent drawing space, generous bounds and crisp rounded strokes. No synthetic roughening of measured geometry, random jitter, glow, embedded paper or rasterized scientific curves.
- Appearance presets (Folio, Technical, Bold) are starting points. Custom ink/accent colors, preview surface, weight, round/flat line ends, guide opacity and selection emphasis are independently tunable. Custom colors stay unchanged across surfaces, with a contrast warning rather than silent correction. Semantic parameters live separately. Default output is static; no animation loop or implicit motion.
- Semantic selection uses heavier strokes and bold tree keys as well as color, so the search route remains visible in monochrome. Zero-vector data remains visible when construction guides are hidden.
- One large selected drawing leads into a quiet specimen index. The source model and export remain beside the work. Small screens stack the workbench without hiding controls.

## Framework boundary

`lib/generative-svg/model.ts` owns typed numeric primitives, model definitions, declared assumptions, parameter validation and finite/bounds checks. The 25 supported models use continuous domains or explicit graph/illustrative primitives. `additional-studies.ts` contains the expanded model catalogue and its pure numerical/topology helpers.

`lib/generative-svg/render.ts` owns concrete style tokens, deterministic numeric formatting, escaped SVG text and standalone serialization. Both React previews and downloads use the same serializer. Appearance does not enter the model functions. Safe six-digit hex colors, bounded finite knobs and enumerated caps are validated at the serialization boundary. The SVG metadata includes a versioned study/parameter/appearance recipe that reproduces the same bytes. SVGs have no external resources, scripts, canvas background or document-wide IDs.

`components/generative-svg/gallery.tsx` owns selection, accessible controls, filter recovery and export actions. Clipboard feedback is scoped to the exact study/model/appearance revision. Each study retains its parameter values while browsing the current page; reloading starts fresh. Presets and appearance reset do not alter parameters or selection, and parameter reset affects only the selected study. Downloads use the same bytes as the preview; they work without a remote service. A native SVG file is provided, not a PNG masquerading as SVG.

Sampled curves are approximations. Sine and parabola specify maximum interpolation errors over their supported domains. Fourier is explicitly a finite partial sum. The prism is illustrative, not an optical calculation. Future discontinuous functions must split their domains; the sampling helper rejects non-finite sampled points but is not a general discontinuity detector.

## Implemented studies

| Study | Provenance | Parameters |
| --- | --- | --- |
| Sine wave | Mathematical sampling of A sin(kx) on [0, 2π] | Amplitude, integer cycle count |
| Parabola | Mathematical sampling of ax² on [−1, 1] | Curvature |
| Fourier harmonics | Finite odd-harmonic partial sum | Number of odd harmonics |
| Rotational field | F(x,y) = (−y,x) on a fixed grid | None |
| Binary search tree | Seven ordered keys and six parent-child edges | Search target |
| Prism study | Illustrative triangular geometry and rays | None |
| Phase-space orbit | Normalized ideal harmonic oscillator, equal axis scales | Amplitude, phase in π/4 steps |
| QAM constellation | Ideal square 4/16/64-QAM, unit mean symbol energy | Bits per axis |
| Finite state machine | Defined three-state, one-symbol automaton; fixed accepting state | Active state |

The original manifests, not the mismatched legacy runtime entries, define the complete 25-item identity set. The additional models are:

| Study | Declared model | Parameters |
| --- | --- | --- |
| Integral trajectories | Three solutions y=sin(x)+C to dy/dx=cos(x) | Initial value C |
| Black-hole null rays | Exterior equatorial Schwarzschild null geodesics, RK4 Δφ=.005, G=c=M=1 | Closest radius |
| Quantum wavepacket | Normalized Gaussian Re ψ and separate probability density at t=0 | Width, wave number |
| Magnetic dipole | Ideal point-dipole field lines r=r₀ sin²θ outside r≥.8 | Shell count |
| Consistent hash ring | Inclusive clockwise successor in a 12-key space with six tokens | Key |
| Directed acyclic graph | Fixed six-node dependency graph with exact ancestor closure | Target |
| Scaled dot-product attention | One softmax row from declared fixed Q/K matrices | Query, temperature |
| Raft quorum study | Five-member acknowledgement count; necessary quorum condition only | Acknowledgement count |
| Event stream pipeline | Five fixed offsets and one consumer read position | Read count |
| Gossip mesh | Synchronous reliable one-hop propagation in a fixed graph | Round |
| Circuit breaker | Four directed transitions among Closed/Open/Half-open | Selected mode |
| Round-robin load balancer | Request n selects healthy backend n mod 3 | Request index |
| Short-dipole radiation | Meridional polar power sin²θ, not field amplitude | Axis orientation |
| Boolean gate array | AND/XOR feeding OR, with Y=A∨B | Two input bits |
| RLC band-pass response | Ideal series RLC voltage across R, normalized ω/ω₀ | Q |
| Synthetic eye diagram | Eight NRZ patterns with deterministic tanh transitions and timing offsets | Timing offset |

Every model declares its assumptions in the workbench and portable SVG description. Graph diagrams illustrate topology or exact calculations on a deliberately small system, not a running distributed service or learned transformer. The black-hole numerical integration conserves its first integral and agrees under step refinement; it is a coordinate-plane ray projection, not an observer lensing image. Wavepacket normalization applies to the infinite line; the displayed finite window is not renormalized. Eye traces are synthetic, not measured BER/jitter. Article equations, existing scientific diagrams, numerical labs, category symbols and canonical technology logos are outside this gallery rewrite and are unchanged.

Transparent graph labels have deliberate line clearance instead of opaque background masks. The hash ring is split around its six tokens, key arrows respect their distinct endpoint radii, and attention weights occupy a separate keyed label band. Existing artwork files are preserved byte-for-byte.

Three.js is not installed: none of this slice requires rotatable 3D geometry. A future genuine 3D study could add a lazy inspector and deterministic projected SVG poster with honest limitations. D3/Mafs or other chart frameworks are similarly deferred until a concrete need justifies them.

## Acceptance

Model, DOM, static export and actual browser acceptance are separate. The gallery retains existing visual/access/release holds. Native clipboard/download, narrow/theme layout, zoom, keyboard, print and forced-color acceptance still need the existing permitted browser path. Complete motif coverage does not imply full scientific simulation, actual-browser acceptance, visual certification or deployment.

## Extending and finding studies

The repository skill `.agents/skills/generate-svg-studies/SKILL.md` guides new model authoring. Its executable Lissajous example lives in `lib/generative-svg/examples/lissajous.ts` and is deliberately not registered as another public motif. The original 25 IDs are a required preserved subset, not a hard limit.

`definition.ts` owns the model contract. `registry.ts` validates stable unique IDs, curated tags/aliases and bounded parameter controls, then derives lookups, search results and Pagefind records from the definitions. A new valid registered model automatically joins gallery counts, filters, metadata and site search; it does not need another renderer or a separate search list.

Gallery search normalizes case, accents, whitespace, punctuation and letter/digit boundaries. All terms must match word prefixes across the title, ID, aliases, subject and tags. Exact names/aliases rank first. Subject and tag filters intersect with the query. Scientific prose and negated caveats are excluded from discovery text. The visible tag vocabulary is independent of the blog's existing editorial topics.

The existing Pagefind postbuild now adds one curated record per study alongside the article index. The site's search dialog finds both notes and studies. Pagefind descriptions use subject/tag summaries because its metadata can also be indexed; this prevents a description's “no noise” caveat from advertising noise simulation. Numeric aliases include compact spellings such as 64QAM. Direct `/vectors/?study=ID` links select the correct workbench; navigation updates selection history, and Back/Forward preserves local tuning. A permalink opens default parameters after a reload; portable SVG recipes retain tuned settings.

Validation includes a real Pagefind/WASM index test, not just mocked search results. The emitted-index checker exercises each title/alias, representative tags/acronyms, and caveat exclusion. Native browser acceptance remains a separate gate.
