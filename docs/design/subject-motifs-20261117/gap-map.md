# BSM-20261117 — subject motif gap map

Four additional subject motifs were selected after auditing the preserved fifty category originals and the current source inventory. They extend the knowledge-subject vocabulary. They do not fill an absent broad category, replace an existing original, or adopt a new taxonomy.

## Evidence and scope

Repository: `castlemilk/benebsworth.com`, default branch `master`. The source audit is pinned to [`e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e`](https://github.com/castlemilk/benebsworth.com/commit/e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e), which includes the five-batch category source consolidation. Audit date: 17 November 2026, Australia/Melbourne.

The [machine-readable source audit](audit/source-audit.json) contains the exact path, expected and observed SHA-256, byte size, decoded dimensions and match result for **all fifty selected originals**. All fifty match the preserved selection records and decode as PNGs. The authoritative selection source remains `docs/design/category-expansion/source-delivery/selected-originals.json`; this packet does not modify it.

Root completed the fifty-original visual review before selecting the new subjects. The independent visual reviewer also reported inspecting all fifty plus the preserved atom and black-hole originals. The source auditor separately inspected the current inventories and recomputed the byte checks. The broader editorial, grounded and vector collections were screened through their source metadata; this is not a claim to have visually inspected every existing artwork.

| Current source inventory | Count |
| --- | ---: |
| Blog topic keys | 20 |
| Lab categories | 9 |
| Lab entries, including spatial entries | 85 |
| Blog source folders | 103 |
| Articles explicitly marked `release: true` | 97 |
| Articles explicitly marked `release: false` | 6 |
| Study curriculum chapters | 71 |
| Actual study packets | 3 |
| Existing `TOPIC_ART` mappings | 50 |
| Preserved selected category originals | 50 |
| Existing editorial raster subjects | 8 |
| Existing grounded artwork records | 155 |
| Existing vector concept briefs | 25 |
| Existing generative SVG study definitions | 52 |

These are source counts, not rendered-page, live-service or scientific-validation results. The three actual packets are Introduction, System Paradigms and ML Lifecycle under `study/mlsys/vol1/`. Planned curriculum rows are not counted as completed packets.

## Existing category coverage

Every current topic meaning already has a preserved motif in the fifty-image selection or original ART04 family. This is **archive coverage**, not a claim that every full-size original is used by the runtime.

| Current topic keys | Preserved coverage |
| --- | --- |
| `maths`, `chemistry`, `biology`, `earth` | Batch 01: Mathematics, Chemistry, Life Sciences, Earth & Space |
| `kubernetes`, `istio`, `tekton`, `kustomize`, `minikube` | Batch 02: container orchestration, service mesh, staged assembly, configurable plates, local workstation |
| `gcp`, `react`, `technology`, `general`, `hiking` | Batch 02: cloud infrastructure, interface modules, engineering mechanism, field notebook, cairn/compass |
| `ee`, `physics`, `cosmology`, `software`, `algorithms`, `ai` | Preserved ART04 circuit, atom, black hole, floppy disk, branching graph and brain |

The source also maps every Lab category to existing artwork:

| Lab category | Existing artwork slug |
| --- | --- |
| `art` | `topology` |
| `maths` | `mathematics` |
| `physics` | `optics` |
| `chemistry` | `chemistry` |
| `biology` | `life-sciences` |
| `earth` | `earth-space` |
| `engineering` | `engineering` |
| `ai` | `neuroscience` |
| `cosmology` | `astronomy` |

These rows record `lib/knowledge/topic-art.ts`. They do not endorse scientific equivalence between the category and its artwork subject. No mapping is changed by this packet.

## The four selected subject gaps

Selection status: assistant-selected for bounded review; user-unrated. Each new request is text-only, with no existing category original supplied as an image reference or edit target.

| Stable ID | Subject and source relevance | Distinct construction |
| --- | --- | --- |
| `BSM-20261117-01` | **Single-qubit state.** The published qubit-gate article and registered Bloch-sphere Lab discuss a state pointer and its evolution. | One meridian, one equator and one radial pointer. State representation replaces the familiar atomic-orbit metaphor; no nucleus or orbital ellipses. |
| `BSM-20261117-02` | **Cantilever gyroscope.** A current article and spatial Lab explicitly address spin angular momentum, support and gravitational torque. | One off-centre rotor disc, one oblique axle and one clearly connected end support. The asymmetric support relationship differentiates it from a generic mechanism or flyball governor. |
| `BSM-20261117-03` | **Reverse-mode retained computation.** The backpropagation article separates saved forward intermediates, reverse derivative accumulation and the later optimiser update. | Curled tape retains impressions while a stylus revisits an earlier mark. No graph network, conveyor, cards or memory stack. |
| `BSM-20261117-04` | **Vectorised arithmetic.** The software-radio article includes an elementwise vector multiply and vectorised convolution; the inference-engine article also describes a vectorised GEMM epilogue. | One shared four-nib stylus over separate strips. A common tool acting at distinct contacts carries the metaphor without another grid, processor stack or pipeline. |

### Exact source associations

All links below are pinned to the audited revision. Each source's Git blob SHA and SHA-256 are recorded in the JSON audit.

- Single-qubit state: [`content/blog/every-qubit-gate-is-a-rotation/index.mdx`](https://github.com/castlemilk/benebsworth.com/blob/e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e/content/blog/every-qubit-gate-is-a-rotation/index.mdx), particularly “The arrow on the ball” and “Decoherence: the arrow sinks off the surface”; `bloch-sphere` in `lib/lab/registry.ts`. The related error-correction article is contextual source coverage, not a claim encoded by this motif.
- Gyroscope: [`content/blog/a-gyroscope-falls-sideways/index.mdx`](https://github.com/castlemilk/benebsworth.com/blob/e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e/content/blog/a-gyroscope-falls-sideways/index.mdx), particularly “Torque is a rate of change of a vector” and “Why a real top wobbles”; [`content/lab/gyroscope.mdx`](https://github.com/castlemilk/benebsworth.com/blob/e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e/content/lab/gyroscope.mdx) explicitly records the steady slow-precession model's limits.
- Reverse-mode retained computation: [`content/blog/backprop-is-just-the-chain-rule/index.mdx`](https://github.com/castlemilk/benebsworth.com/blob/e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e/content/blog/backprop-is-just-the-chain-rule/index.mdx), particularly “One forward pass, one backward pass”, “Why backwards, specifically” and “From gradient to learning”.
- Vectorised arithmetic: [`content/blog/software-defined-radio-in-100-lines/index.mdx`](https://github.com/castlemilk/benebsworth.com/blob/e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e/content/blog/software-defined-radio-in-100-lines/index.mdx), including `baseband = iq * lo` and `np.convolve`; secondary support is [`content/blog/beating-splash-on-an-m5-max/index.mdx`](https://github.com/castlemilk/benebsworth.com/blob/e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e/content/blog/beating-splash-on-an-m5-max/index.mdx). Its numerical benchmark results are not reused or implied by the art.

## Semantic boundaries

All four artworks are **illustrative**. They are neither measured data nor numerical simulations, mathematically validated diagrams, working instruments or third-party logos. Source articles establish topic relevance; they do not validate generated geometry or every interpretation a viewer may infer.

**Single-qubit state:** the pointer is a state-space metaphor. A surface pointer evokes a pure single-qubit state; mixed states must not be described as confined to the surface. The image is not an electron orbit, a processor, entanglement or an arbitrary quantum operation. It does not encode a computed state or gate angle.

**Gyroscope:** a static object does not demonstrate precession, conservation, friction, nutation or a numerical prediction. No dimensions, balance, fabrication or bearing design are asserted. A plausible support relationship is a visual requirement, not an engineering certification.

**Reverse-mode tape:** revisiting saved work is not inverse computation. The stylus does not rewind, erase or undo the forward function. No impression encodes a derivative, local Jacobian, path sum, runtime trace or neural-network architecture. The motif represents derivative bookkeeping; the optimiser step remains distinct.

**Vectorised arithmetic:** four nibs are a compositional choice. They assert no SIMD width, instruction set, hardware lane count, concurrency schedule, numerical equivalence or performance gain. Array syntax alone does not prove a specific SIMD implementation. The intended subject name is “Vectorised arithmetic”, not a claim about a particular processor.

## Alternatives rejected for repetition

| Candidate | Reason for excluding it from this set |
| --- | --- |
| Serial double pendulum | Source coverage is strong, but the existing grounded coupled-pendulums subject and category geophysics pendulum make the family more repetitive. |
| Ising domain mosaic | Another lattice/tile silhouette would sit too close to Materials Science, grain-boundary and close-packing studies. |
| Cellular-automaton glider | Another cell-grid construction; a literal glider would also require exact state validation. |
| Memory hierarchy stack | Already present as the editorial `memory-layer-stack` motif. |
| Coil or generic magnetic field | Already represented by wound-inductor, solenoid, transformer and dipole subjects. |
| Generic quantum wavepacket | Already present in both vector briefs and generative studies. |
| Generic tree, DAG or network | Existing Algorithms and network subjects already cover these constructions; they also approach the graph lane's scope. |
| Complex-root folded sheet | Actual published coverage exists, but folded Mathematics, Topology, helical-screw and surface studies make silhouette differentiation weaker. |
| Lens or prism | Already represented in category, editorial, vector and grounded collections. |

This screen is bounded to the audited collections and identified neighbouring concepts. It is not a claim of global visual originality.

## Ownership, preservation and review limits

The new strand owns only `docs/design/subject-motifs-20261117/` and `public/artwork/subject-motifs-v1/`. Editorial visual grammar, marks/ornaments and application layouts remain separate. Existing fifty-image paths, source packets, ART04, canonical SVG symbols, taxonomy, graph identities, Hardware/UI SDK, routes and styles are outside this work.

The current source bridge (#165, alongside older #158), editorial workbench (#159), motion workbench (#160) and graph-view prototype (#161) remain separately owned. Exact observed heads are in the JSON audit. A suggested subject association does not create a graph edge, alias, category or identity merge. The current graph's normalized tag/glossary matches remain lexical evidence rather than proof of conceptual equivalence.

Batch 04's historical recovery remains partial: the ten selected originals are exact, but later actual requests/settings, the rejected opaque framing result and the final cumulative source packet are still missing. This strand neither reconstructs those missing receipts nor changes their status.

New-image alpha, margins, thumbnails and light/dark observations belong to the separate asset-review receipts. This source audit does not claim new-image visual acceptance, browser checks, a deployed gallery, accessibility verification or consuming-route adoption. Draft publication is separate from merge or release. Existing preview/release holds remain in force.

Coordination records: [canonical blog design Space](https://chatgpt.com/space/page_6adc74403d50819193fb9b2d0681ea64) and [workstream index](https://chatgpt.com/space/page_ba64e3a87b908191b185bdfc76e46171).
