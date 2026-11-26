# System Paradigms: Study Packet

*Working through Machine Learning Systems (Reddi, Harvard CS249r, mlsysbook.ai, CC-BY-NC-SA 4.0).
Chapter 2 of Volume I: the four deployment tiers, the physical walls that set them, and the screens for choosing one.*

## Thesis

Where a model runs is not a preference, it is a physics result. Every machine offers
a ==silicon contract=={Three iron-law terms (bandwidth, peak compute, fixed overhead) plus two preconditions (memory capacity, energy budget) that decide whether the workload can run at all. Chapter 1's terms, priced per tier.}:
a memory bandwidth, a peak compute rate, and a fixed overhead entering the iron
law's three terms, plus a memory capacity and an energy budget that act as
feasibility preconditions. Three physical walls set the envelope of each tier: the
light barrier (distance puts a floor under any remote path), the power wall
(dynamic power is roughly cubic in frequency), and the memory wall (compute
outgrows bandwidth ~1.33× a year). Cloud, edge, mobile, and TinyML are not four
kinds of deployment but four constraint regimes spanning ~9 orders of magnitude
in power and memory. The chapter's method: classify the workload by which wall it
hits first (four archetypes), screen candidate tiers against privacy, latency,
resource, and cost in that order, and when no tier survives, partition the
pipeline across tiers.

## Guided notes

### Four regimes, nine orders of magnitude

- Tiers as operating envelopes: cloud ~3 MW facility power, edge ~200 W site
  hardware, mobile ~5 W (2-5 W TDP) handsets, TinyML ~1 mW microcontrollers.
  Memory runs TB down to KB in step. A wake-word model on a smartwatch and a
  DLRM recommender differ by nine orders of magnitude and are the same kind of
  system only in that both obey the iron law.
- The silicon contract has two parts: three terms that go into the time
  equation, and two preconditions (capacity, energy) checked before the
  equation is even evaluated. ==A workload can be infeasible before it can be
  slow=={Feasibility precedes speed. Capacity-bound (doesn't fit) and power-bound (can't afford to run it) workloads fail the screen, not the benchmark. This is why the archetype table has four rows, not two.}.
- The single-node stack layers a host as: application target, framework
  translation, OS/driver/runtime, hardware. The hardware layer is where the
  contract terms are set; everything above negotiates with them.

::fig[deployment-spectrum]

::fig[tier-ladder]

### The three walls

- **Light barrier**: remote latency has a propagation floor. California
  to Virginia is a ~40 ms round trip before routing, queuing, or compute.
  A 10 ms safety budget physically cannot use remote cloud: no amount of remote
  silicon buys back propagation time.

::eq[light-barrier]
$$
T_{\mathrm{RTT}} \ge \frac{2\,D}{c_{\mathrm{fiber}}} \approx \frac{2\,D}{200{,}000\ \mathrm{km/s}}
$$
- **Power wall**: dynamic power is cubic in frequency once voltage scaling is
  counted. Doubling the clock can cost ~8× the power, and every watt is
  heat the chassis must shed. Dennard scaling ended ~2005: transistors grew
  ~190× since, top clocks stayed near ~4.7 GHz, single-thread performance rose
  ~5× (against ~21× the decade before). The slack went to cores and
  specialized units, which is why phones throttle at 2-5 W instead of racing.

::eq[power-scaling]
$$
P \propto C\,V^{2}\,f \quad\xrightarrow{\ V\propto f\ }\quad P \propto f^{3}
$$
- **Memory wall**: compute outgrows bandwidth every year.
  Compounded over a decade the gap opens ~16×. Movement dominates both time and
  energy budgets: an off-chip DRAM byte already costs orders of magnitude more
  than the arithmetic it feeds.

::eq[memory-wall]
$$
\rho_{\mathrm{wall}} = \frac{g_{\mathrm{compute}}}{g_{\mathrm{mem}}} \approx \frac{1.6}{1.2} \approx 1.33\ \text{per year}
$$

> [!observation] The walls are why tiers exist
> Cloud, edge, mobile, TinyML are not product categories. Each is the operating
> regime left over after one wall binds hardest: light barrier for edge's whole
> purpose, power wall for mobile, memory wall (as capacity) for TinyML.

::fig[microprocessor-trends]

::chart[memory-wall]

::fig[memory-wall-divergence]

### Workload archetypes: regimes, not model families

- Classify by the first wall hit: **compute-bound** (ResNet-50 training,
  ~8 GFLOP/image), **bandwidth-bound** (batch-1 LLM decode: all weights streamed
  per token, little reuse), **capacity-bound** (DLRM embedding tables past local
  memory), **power-bound** (keyword spotting on ~1 mW).
- Two archetypes are iron-law terms; two are preconditions. That is the clean
  structure: bandwidth and compute set *time*, capacity and energy set
  *feasibility*.
- The archetype is a regime, not a property of the model. ResNet-50 is
  compute-bound at batch 256 (weights reused across samples, arithmetic
  intensity above the ridge point) and bandwidth-bound at batch 1 (same weights
  streamed for one image). ==Change the batch, the precision, or the hardware,
  and the model changes archetype=={This is why 'my model is memory-bound' is shorthand. Bound to what, at what batch, on what hardware balance? The question has a quantitative answer: arithmetic intensity vs the platform's R_peak/BW ridge point.}.
- Two forms of the iron law do different work. The additive form prices one
  request's serialized path; the max form prices the interval between
  completions of an overlapped stream. Speeding a non-limiting stage buys
  nothing for the stream, though it still shortens one request's latency.
  Know which metric you are serving before you optimize.

::eq[iron-law-serial]
$$
T = \frac{D_{\mathrm{vol}}}{BW} + \frac{O}{R_{\mathrm{peak}}\,\eta_{\mathrm{hw}}} + L_{\mathrm{lat}}
$$

::eq[bottleneck-bound]
$$
T_{\mathrm{stream}} \ge \max\!\left(T_{\mathrm{mem}},\ T_{\mathrm{comp}},\ T_{\mathrm{IO}}\right) + L_{\mathrm{lat}}
$$

> [!method] Two-step hardware screen
> Coarse test: any operation whose latency exceeds the deadline cannot sit on
> the critical path at all (a 200 ms WAN call inside a 100 ms budget fails by
> construction). Fine test: compare the workload's arithmetic intensity to the
> platform's ridge point to name the binding term. Roofline
> formalism arrives in ch11; the comparison works now.

::eq[system-balance]
$$
I^{*} = \frac{R_{\mathrm{peak}}}{BW}
$$

::fig[archetype-map]

### The tiers themselves

- **Cloud**: elastic compute and capacity for the price of WAN latency, egress,
  and a recurring bill. Data gravity pulls compute to the data: shipping a
  dataset grows with volume, shipping the program does not.
- **Edge**: deletes the WAN round trip and keeps data on premises, but the box
  is fixed capacity (5-50 W modules, ~1-8 GB, LPDDR not HBM) and ops are
  hands-on: a failed firmware push across a thousand stores has no aisle to
  walk down.
- **Mobile**: two distinct energy limits people conflate. The battery budget
  (15 Wh: ~15 h at 1 W, ~3 h at 5 W) is fixable by duty cycling or a lighter
  model. The thermal ceiling (~2.5-5 W sustained) throttles regardless of
  charge. Quantization shrinks footprint ~4× but leakage and switching energy
  do not scale with it.
- **TinyML**: not scaled-down mobile. ESP32-class parts carry ~512 KB SRAM and
  MBs of flash at ~\$5 and ~1 mW average. RAM is ~10,000× smaller than a phone's.
  Below ~64 KB of working memory the answer is algorithmic redesign, not
  another quantization pass.
- The doorbell scorecard shows the discipline: screen storage first (weights
  fit flash?), then latency (iron-law estimate meets the SLA?), then SRAM for
  activations. Feasibility before speed, in order.

### The data locality invariant

- If even the idealized lower bound misses the deadline, the remote path is
  rejected outright; transmission and propagation cannot be bought down with
  faster remote compute.

::eq[locality-invariant]
$$
T_{\mathrm{remote}} \ge \frac{D_{\mathrm{vol}}}{BW_{\mathrm{net}}} + L_{\mathrm{net}} + \frac{O}{R_{\mathrm{rem}}\,\eta_{\mathrm{rem}}}
$$
- Worked anchor: a 4K drone frame is 24.9 MB (199 Mbit). Over a 100 Mbps uplink
  that is ~2,000 ms of transmission alone, plus ~110 ms of network and compute:
  ~2.1 s against a 16.7 ms frame deadline. Off by two orders of magnitude.
- ==5G does not repeal this=={5G raises BW_net but does nothing for L_net propagation and protocol floor. A tight deadline kills the remote path either way; a loose one never needed it. The bandwidth arms race and the latency wall are different variables.}.
- What every local tier gains by deleting the WAN terms: closed-loop latency
  you can actually bound, uplink traffic drops to event telemetry, a smaller
  transmission attack surface, and function through wide-area outages. Local is
  not automatically private; it just removes one exposure path.

::chart[locality-bound]

### Screen, then cost

- Check zero is not a tier check: does this need ML at all? A 50-line heuristic
  at 90% accuracy maintained an hour a month, versus an ML system at 95% that
  drags ~2,000 lines of supporting infrastructure and ~40 maintenance
  hours/month: the ==complexity tax=={The whole lifecycle premium of a learned system over a deterministic baseline: infra code, drift monitoring, retraining, GPU dependencies. ML must repay it, not just win on accuracy.} is ~40× for five
  points. ML must repay it, not just beat the baseline's score.
- Then four filters in order of how fast they kill a candidate: privacy
  (legal prohibition beats measurement), latency (the locality lower bound),
  resource (capacity, sustained compute, energy), cost (matched lifecycle
  budgets only; hourly rates hide most of TCO). Survivors move on; an empty set
  means redesign or partition, and a bound-pass still needs complete-path
  measurement.
- Emergency braking makes it concrete: 100 km/h × 100 ms = 2.8 m of travel.
  Remote delay of 50-150 ms eats half to all of the budget before detection
  runs. Local detection at 10 GFLOP/frame × 30 fps needs 300 GFLOP/s sustained:
  an edge-box number, not a cloud one.

> [!caution] Accuracy-first selection is the named failure
> Picking a tier on model accuracy and treating hardware as a downstream detail
> is the chapter's recurrent fallacy. The 99%-accurate model that pages on
> mobile RAM or throttles in seconds was never viable; it just hadn't met the
> preconditions yet.

::fig[playbook-flowchart]

::fig[screen-funnel]

::fig[doorbell-scorecard]

### Hybrid: partition the pipeline

- When no tier survives intact, put each stage where its limiting term is
  cheapest. Three patterns: **train-serve split** (training keeps ~16 B/param
  of state vs 2 B for FP16 weights: 8× memory asymmetry makes cloud-train,
  local-serve the default), **hierarchical processing** (local filter first,
  escalate low-confidence inputs: a confidence cascade), **progressive
  deployment** (one architecture, tier-specific variants).
- The price is synchronized state: feature definitions, model versions,
  preprocessing must match across tiers or you reintroduce training-serving
  skew at the boundary.
- The voice-assistant wall prices the cascade: cloud wake-word detection for
  1B devices means ~32 TB/s of streamed audio and ~\$500M/yr for a free feature.
  Local detection cuts uploads ~860×; the residual post-wake load (20
  queries/device/day at ~200 ms GPU time) still wants ~20-60 datacenters at
  peak. Hybrid is not a compromise, it is the only shape that works at that
  scale.

### Fallacies worth quoting

- One paradigm solves all problems: sub-10 ms robotics cannot use a WAN path;
  a billion parameters cannot fit in 512 KB.
- Closer is always faster: thermally throttled edge compute can lose to a
  distant accelerator. Separate end-to-end from model-execution latency.
- Model optimization beats power limits: INT8 is ~4× the footprint, not ~4×
  the battery life. Static leakage does not quantize.
- TinyML is scaled-down mobile ML: the memory and energy discontinuities
  (10^5-10^6 B SRAM, ~1 mW) force different runtimes, not smaller versions.
- Minimum compute minimizes cost: TCO includes power, cooling, egress, ops
  labor, and idle capacity; the cheapest box per inference can be the most
  expensive per year.

## The physics

| Quantity | Value | Use |
|---|---|---|
| Fiber propagation floor | $2D/200{,}000$ km/s (~5 ms/1,000 km RTT) | latency check before remote is considered |
| Cross-country RTT | ~40 ms CA-VA | a 10 ms budget cannot be met remotely |
| Dynamic power | $P \propto f^3$ under $V\propto f$ | why mobile throttles; why clocks froze ~2005 |
| Mobile TDP | 2-5 W sustained | the ceiling a model lives under |
| Memory wall ratio | $1.6/1.2 \approx 1.33$/yr, ~16×/decade | movement keeps gaining share of time |
| Drone frame offload | 199 Mbit @ 100 Mbps ≈ 2,000 ms | locality rejects cloud by ~125× |
| Braking distance | 2.8 m at 100 km/h × 100 ms | latency is a physical quantity |
| Train/serve state | ~16 B vs 2 B per param | why train-serve split amortizes |
| Voice fleet (cloud WW) | ~32 TB/s, ~\$500M/yr | hierarchical cascade is mandatory |
| Post-wake cloud load | ~M GPU-hrs/day, ~20-60 DCs | hybrid still needs the cloud |

## Glossary

- **Silicon contract**: the BW, $R_{\mathrm{peak}}$, and $L_{\mathrm{lat}}$ a
  machine offers, plus capacity and energy preconditions.
- **Light barrier**: the $2D/c$ propagation floor under any remote path.
- **Power wall**: thermal ceiling on sustained compute; $P\propto f^3$ is its
  engine.
- **Memory wall**: compute outpacing memory bandwidth, ~1.33×/yr.
- **Workload archetype**: a workload classified by its first binding wall:
  compute, bandwidth, capacity, power.
- **Arithmetic intensity**: FLOPs moved per byte; the workload side of the
  ridge point.
- **System balance / ridge point**: $R_{\mathrm{peak}}/BW$; the platform side.
- **Data locality invariant**: reject remote when its idealized lower bound
  misses the deadline; transmission can't be bought down.
- **Data gravity**: datasets pull computation toward them as volume grows.
- **Complexity tax**: the lifecycle premium of ML over a deterministic
  baseline.
- **TCO**: capex plus recurring opex (power, cooling, egress, labor) over the
  system's life.
- **Confidence cascade**: hierarchical serving that escalates only
  low-confidence inputs.
- **Throttling**: hardware reducing its own rate to shed heat.
- **Dennard scaling**: the ended era when shrinking transistors kept power
  density flat and clocks could rise freely.

## → Ben's world

- **The laptop is the bandwidth-bound tier.** `qwen3.8:27b-mlx` at batch 1 on
  the Mac is the textbook archetype: ~27B weights streamed per token, decode
  speed set by memory bandwidth, not compute. The think/no-think toggle is a
  compute-budget lever on a bandwidth-bound workload; the 200W+ GPU box vs the
  ~30W laptop is exactly the silicon-contract comparison the chapter draws.
- **The benchmark harness is a confidence cascade in waiting.** A cheap local
  model as first-pass filter with escalation to frontier models on hard/low-
  confidence cases is the hierarchical pattern: same routed-accuracy trade-off
  the book prices.
- **The droplet is the edge tier.** Fixed capacity, no aisle to walk down,
  intermittent ops; the voice-assistant-wall arithmetic is why it stays a
  preprocessing/filtering node rather than a serving tier for anything
  latency-critical to Sydney users.
- **doc-analyser / greenveil**: the privacy screen fires before latency is
  measured; that is the book's ordering (legal prohibition beats numbers).
  On-device prefiltering is how it keeps raw documents off the wire.

> [!connection] Same structure in two places
> The harness's think/no-think budget knob and the book's archetype regimes are
> the same move: you are reclassifying the workload by which term binds, then
> pricing it. The book just gives it a name and a formula.

## Open questions

1. Where does Apple's unified memory sit in this taxonomy: one shared pool
   erases the CPU/GPU copy stage ($T_{\mathrm{IO}}$), so does the max-form
   bound collapse to two terms on Apple silicon, or does coherence traffic
   just re-enter through bandwidth?
2. The locality invariant omits remote queueing and serialization. At what
   payload size does the omitted stuff dominate the *bound* rather than the
   bound being tight?
3. Confidence cascades trade median latency for routed accuracy. Is there a
   clean formula for the escalation threshold, or is it purely empirical?
4. TinyML training-adjacent work (on-device fine-tuning, federated updates)
   breaks the inference-only assumption the chapter leans on. Which
   precondition moves first: SRAM or energy?
