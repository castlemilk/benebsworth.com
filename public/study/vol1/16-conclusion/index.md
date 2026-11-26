---
title: "Conclusion — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol1/16_conclusion/16_conclusion.html"
canonical_url: "https://benebsworth.com/study/vol1/16-conclusion/"
---

# Conclusion: Study Packet

Every team on a mobile image-classifier fleet hit its metric, architecture shrank the FLOPs, compression fit the SRAM, serving brought p99 under 50 ms. Within weeks, accuracy fell four points on specific firmware cohorts and nobody's dashboard noticed. What failed?

*Working through [Conclusion](https://www.mlsysbook.ai/vol1/16_conclusion/16_conclusion.html), chapter 16 of Machine Learning Systems by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

**The system is the model.** The behavior a user receives is produced by the data pipeline, the weights, the execution stack, the serving path and the monitoring loop together, never by the weights alone. Every chapter gave one stage of that voice-assistant request a mechanism and a cost; this chapter shows the costliest failures live **at the interfaces no component test exercises** *(why it matters: The fleet failure: INT8 clipping ranges fixed during calibration met a firmware-specific preprocessing routine that interpolated images differently. No component failed, nothing crashed, and the cohort accuracy drop was invisible to monitoring built only for aggregates.)*. The discipline that catches them is the same one the whole book taught: trace the request end to end, find the limiting term, and measure the boundary. Start with [the five lighthouses](#fig-lighthouse-trace), each one probes a different limiting term.

> **note: Reading the marks**
> Amber dotted marks carry why-it-matters cards. Hover, tap or tab to read them.

## Guided notes

### The System Is the Model

- The opening composite: three teams, three green metrics. Architecture chose depthwise separable convolutions, compression quantized to INT8 inside on-chip SRAM, serving held end-to-end p99 under 50 ms. Weeks later, accuracy fell **four percentage points on specific firmware and device cohorts** *(why it matters: INT8 quantization fixes its clipping ranges during calibration, permanently encoding the calibration images' distribution. A firmware-specific preprocessing path interpolated images differently and shifted the input on those cohorts. Aggregate offline evaluation passed; cohort telemetry didn't exist.)*.
- No component failed in isolation. Each team validated its own piece; latency was measured end to end, but accuracy was measured only as an aggregate scalar over an offline set. The fix was not better components, it was **per-cohort accuracy tracking from day one** *(why it matters: The alarm would have fired in week one. Most failures of this kind start at an interface between components, so the engineering task is to test the interfaces before they fail.)*.
- Traditional software engineering treats correctness as decoupled from hardware and the "model" as a weights checkpoint. In ML systems, weights are often not the most fragile part, statistical behavior is physically inseparable from the pipelines, memory hierarchies and accelerators that train, serve and monitor it.

![Local wins compose into a global loss](https://benebsworth.com/study/vol1/16-conclusion/diagrams/interface-failure.svg)

*Architecture, compression and serving each hit their metric. The failure lived between them: INT8 clipping ranges met a firmware-specific preprocessing path, the input shifted on one cohort, and aggregate telemetry never saw the four-point drop.*
### Lighthouse Models: Constraint Propagation

- The five lighthouses each saturate a different resource first, and each names the lever that pays: ResNet-50 compute-bound (batch + reduced precision; bandwidth wasted past the ridge), GPT-2/Llama decode bandwidth-bound (batching, fewer bytes per weight, KV management; peak arithmetic wasted at batch one), DLRM capacity-bound (shard embeddings across tiers; faster dense math wasted), MobileNetV2 compute-bound in its phone-NPU regime (depthwise, then INT8), KWS power-bound (sub-megabyte INT8 under a milliwatt; cloud streaming wasted, the radio costs more than local inference).
- The regime belongs to the **workload on a machine, not the model name** *(why it matters: GPT-2 training is compute-bound even though its decode is bandwidth-bound, training reuses each weight across the batch. ResNet-50 went input-bound when the data pipeline starved it. Check the regime before choosing the lever.)*.
- Precision and machine move the regime: INT8 doubles the H100's peak rate without raising bandwidth, so it doubles the ridge point, a layer whose activations still move at 16 bits can fall below the doubled ridge and become bandwidth-bound. MobileNetV2, compute-bound on the phone NPU, waits on memory on an H100.

**Eq 2 · Arithmetic intensity law**
$$
\text{rate}\le \min(P,\; I\times B)
$$

![Five lighthouses, five limiting terms](https://benebsworth.com/study/vol1/16-conclusion/diagrams/lighthouse-trace.svg)

*Each lighthouse saturates one resource first — compute, bandwidth, capacity, compute-in-envelope, power. The regime belongs to the workload on a machine; batch, phase and precision can move it.*
- MobileNetV2's nine-phase journey is the whole book in one column: mobile tier sets the watt envelope → depthwise separable convolutions (**8.7×** fewer FLOPs on a representative 3×3, 256-channel layer; **13.7×** fewer ops than ResNet-50) → high-throughput training for a low-latency server → capacity-matched augmentation → INT8 (FP32 costs **4×**, FP16 **2×** the bytes) → NPU mapping → benchmark boundary → p99 serving → drift monitoring. Every decision narrowed what the next phase could choose.

### Thirteen Quantitative Principles

- The book's thirteen principles are not the same kind of statement: three hard bounds (Pareto frontier, arithmetic intensity, Amdahl), two decompositions (iron law, energy-movement), two fitted models (statistical drift, bias feedback), two policies (verification gap, latency budget), four heuristics (data-as-code, data gravity, silicon contract, training-serving skew). Each is reliable only **within its stated assumptions** *(why it matters: The silicon contract is a heuristic because it predicts which resource saturates first, a prediction the arithmetic intensity bound then tests.)*.
- Regrouped by the introduction's three questions: what shapes predictions (data-as-code + bias feedback), what limits execution (data gravity, iron law, silicon contract, Pareto, arithmetic intensity, energy-movement, Amdahl), what evidence supports deployment (verification gap, drift, skew, latency budget).
- The meta-principle connecting them is the **conservation-of-complexity heuristic** *(why it matters: Tesler's Law extended: simplifying one part tends to move complexity to another part rather than remove it. Pruning spends capacity, quantization spends precision, distillation spends training compute. It is a diagnostic, not a physical law, trace where the displaced cost landed.)*: after any local simplification, find where the cost went.
- The energy-movement principle anchors the ledger in joules: one DRAM access costs ≈ **173–582×** one arithmetic operation (FP32 at the low end, FP16 at the high end).

![Thirteen principles, three questions](https://benebsworth.com/study/vol1/16-conclusion/diagrams/principle-map.svg)

*The book's quantitative toolkit sorted by what shapes predictions, what limits execution, and what evidence supports deployment — with each tool's kind (bound, decomposition, fitted model, policy, heuristic) marked.*
**Eq 1 · Iron law of ML systems**
$$
T=\frac{D}{B}+\frac{O}{P\,\eta}+L
$$

### The Dual Mandate Revisited

- The book's two obligations, measured on two lighthouses: trustworthy learned behavior on DLRM (tracked through drift, skew, and the bias feedback factor, a disparity that passes at launch can still compound), and physical deliverability on the GPT-2 family (tracked through the iron law, the roofline, energy per event).
- The sharpest physical example: Llama 2 70B at batch one. ≈47× GPT-2's 1.5B parameters; 140 GB of FP16 weights, 140 GFLOP per token. Sharded on two H100s (6.70 TB/s, 1,978 TFLOP/s), the memory-transfer floor is ≈**20.9 ms** and the compute floor ≈**0.07 ms**, a ratio of **295.2×** *(why it matters: Decode reads every weight once per token; at batch one its intensity is ~1 FLOP/byte, far below the ~295 FLOP/byte ridge of the two-H100 pair. More peak arithmetic cannot move it, only batching, fewer bytes per weight, or speculative decode touches the limiting term.)*.
- The sharpest serving example: an LLM chat endpoint with 50 ms mean time-to-first-token but 2,000 ms p99, a tail **40×** the mean against a 200 ms SLO. The mean looks healthy while the product is broken.
- Both halves are budgets the system must keep meeting, not certificates earned at launch.

**Eq 3 · Llama 70B decode floor**
$$
T_{\mathrm{mem}}=\frac{140\ \mathrm{GB}}{6.70\ \mathrm{TB/s}}\approx 20.9\ \mathrm{ms},\qquad
T_{\mathrm{comp}}=\frac{140\ \mathrm{GFLOP}}{1{,}978\ \mathrm{TFLOP/s}}\approx 0.07\ \mathrm{ms}
$$


**One token, two floors — Llama 2 70B decode on 2×H100**

| Lower bound | ms/token |
|---|---|
| Compute floor (140 GFLOP ÷ 1,978 TFLOP/s) | 0.07 |
| Memory floor (140 GB ÷ 6.70 TB/s) | 20.9 |

*Every generated token reads all 140 GB of weights once: the memory floor (20.9 ms) is 295.2× the compute floor (0.07 ms). Batch-one decode is bandwidth-bound — arithmetic investment at this batch buys nothing.*

### Future Directions

- Every added deployment context adds failure surfaces: the edge runs under watt and battery budgets, TinyML compresses the same problem into kilobytes and milliwatts, and composed services (retrieval → planner → tools → generator → verifier) put several principles under load at once.
- A composed request's realized latency follows its **critical path** *(why it matters: Retrieval + planner + the slower of the two parallel tool calls + generation + verification + orchestration overhead. The latency budget must hold that sum at the chosen quantile, and each added stage is also an added failure surface and observability boundary.)*: parallel tools collapse to their slowest member, not to a sum.

**Eq 5 · Composed-request critical path**
$$
T_{\mathrm{req}}=t_{\mathrm{ret}}+t_{\mathrm{plan}}+\max(t_{a},t_{b})+t_{\mathrm{gen}}+t_{\mathrm{ver}}+t_{\mathrm{oh}}
$$
- Fleet scale keeps the same method at a larger boundary: a single GPU at ≈5.7 years MTTF (~50,000 hours) looks reliable; across a 1,024-accelerator pool the cluster MTBF collapses to ≈**48.8 hours, about two days**. Fault tolerance stops being a property and becomes a requirement.

**Eq 4 · Fleet MTBF**
$$
\mathrm{MTBF}_{\mathrm{fleet}}=\frac{\mathrm{MTTF}}{N}=\frac{50{,}000\ \mathrm{h}}{1{,}024}\approx 48.8\ \mathrm{h}
$$


**Independent failures at fleet scale**

| Pool size | MTBF (h) |
|---|---|
| 1 GPU (MTTF ≈ 5.7 yr) | 50000 |
| 1,024-GPU pool | 48.8 |

*The same failure rate that gives one GPU a ~5.7-year life gives a 1,024-accelerator pool a ~48.8-hour cluster MTBF — a failure about every two days.*

### The Engineering Responsibility and Pitfalls

- The responsibility follows from the physics: accessibility, subgroup fairness and environmental cost are engineering outcomes because the same cross-layer decisions produce them. Robust systems assume confident-and-wrong behavior is normal and design **graceful degradation** *(why it matters: Fallback paths, uncertainty thresholds that route low-confidence predictions down them, version-scoped rollback, monitoring hooks. Rollback repairs a bad release, it cannot repair covariate drift, which follows the cause, not the symptom.)* into the request path.
- The fallacies share one root: treating the system as decomposable into independent parts. The Amdahl pitfall is the arithmetic form, accelerating inference, 10% of request time, by 10× yields a system speedup of $1/(0.9+0.01)\approx 1.1\times$, because the unowned 90% sets the ceiling.
- A model evaluated on top-line accuracy alone ignores its boundaries: under a 100 ms tail SLO, a 95%-accurate model at 500 ms is infeasible while a 93%-accurate model at 50 ms ships.

**Eq 6 · Amdahl ceiling**
$$
\text{Speedup}=\frac{1}{(1-f)+f/s}=\frac{1}{0.9+0.10/10}\approx 1.1\times
$$

### The Request, Retraced

- The voice-assistant request, traced once more through every layer: a ~200K-parameter KWS model (200 KB INT8 in 1 MB flash, 20 MFLOP, milliwatt) listens; a MobileNetV2-class front end (600 MFLOP, 3.5 MB INT8, 5 W) transcribes on the NPU; DLRM ranks retrieval against **100 GB of embeddings that exceed one H100's 80 GB before any arithmetic** *(why it matters: Capacity is a precondition, not a term, the silicon contract says the tables must be sharded or cached before compute or bandwidth matter.)*; a GPT-2 decoder writes the answer at ~0.9 ms/token of weight traffic. Power, compute, capacity, bandwidth, each layer sets a different limit on one request.

![One request, four limiting terms](https://benebsworth.com/study/vol1/16-conclusion/diagrams/request-trace.svg)

*The closing voice-assistant trace: KWS power-bound, the front end compute-in-envelope, DLRM capacity-bound, GPT-2 decode bandwidth-bound — four different physics inside one user request.*
## Physics table

| Quantity | Value | Where |
|---|---|---|
| Fleet cohort drop | −4 pp on firmware/device cohorts | The System Is the Model |
| p99 serving target | < 50 ms end-to-end | The System Is the Model |
| MobileNetV2 layer FLOPs | 8.7× fewer (3×3, 256 ch, depthwise) | Lighthouse Models |
| ResNet-50 → MobileNetV2 ops | 13.7× fewer at ImageNet scale | Lighthouse Models |
| INT8 bytes | 4× smaller than FP32, 2× than FP16 | Lighthouse Models |
| DRAM access energy | ≈173–582× one arithmetic op | Thirteen Principles |
| Llama 2 70B decode floor | 20.9 ms memory vs 0.07 ms compute (295.2×) | Dual Mandate |
| Llama 2 70B scale | ≈47× GPT-2's 1.5B params; 140 GB FP16, 140 GFLOP/token | Dual Mandate |
| 2×H100 envelope | 6.70 TB/s, 1,978 TFLOP/s FP16 | Dual Mandate |
| p99 TTFT tail | 2,000 ms vs 50 ms mean, 40× | Dual Mandate |
| Fleet MTBF | 50,000 h / 1,024 ≈ 48.8 h | Future Directions |
| Amdahl pitfall | inference 10% × 10× → ≈1.1× system | Pitfalls |
| SLO feasibility | 95% @ 500 ms infeasible; 93% @ 50 ms ships | Pitfalls |
| KWS stage | ~200K params, 200 KB INT8, 1 MB flash, 20 MFLOP, mW | Request trace |
| Front-end stage | 600 MFLOP, 3.5 MB INT8, 5 W envelope | Request trace |
| DLRM stage | 100 GB embeddings > 80 GB one H100 | Request trace |
| GPT-2 stage | 3 GB FP16/token → ~0.9 ms memory floor | Request trace |


---

## Key equations

**Eq 1 · Iron law of ML systems**

$$
T=\frac{D}{B}+\frac{O}{P\,\eta}+L
$$

*Execution time decomposes into data movement, computation, and fixed overhead. The two timed terms overlap between their maximum and their sum; every optimization in the book attacks exactly one of the three terms.*

**Eq 2 · Arithmetic intensity law**

$$
\text{rate}\le \min(P,\; I\times B)
$$

*Attainable compute is capped by the lower of peak rate and intensity times bandwidth. A workload left of the ridge cannot buy speed with more arithmetic — the roofline makes the ridge the machine's balance point.*

**Eq 3 · Llama 70B decode floor**

$$
T_{\mathrm{mem}}=\frac{140\ \mathrm{GB}}{6.70\ \mathrm{TB/s}}\approx 20.9\ \mathrm{ms},\qquad T_{\mathrm{comp}}=\frac{140\ \mathrm{GFLOP}}{1{,}978\ \mathrm{TFLOP/s}}\approx 0.07\ \mathrm{ms}
$$

*Batch-one Llama 2 70B decode on two H100s: every token reads all 140 GB of FP16 weights once, so the memory floor exceeds the compute floor by 295.2x. Batching, lower-precision weights, or speculative decode are the levers; faster arithmetic is not.*

**Eq 4 · Fleet MTBF**

$$
\mathrm{MTBF}_{\mathrm{fleet}}=\frac{\mathrm{MTTF}}{N}=\frac{50{,}000\ \mathrm{h}}{1{,}024}\approx 48.8\ \mathrm{h}
$$

*Independent failures multiply across a pool. A GPU at ~5.7 years MTTF looks reliable alone; a 1,024-accelerator cluster sees a failure about every two days. Fault tolerance is a requirement, not a feature.*

**Eq 5 · Composed-request critical path**

$$
T_{\mathrm{req}}=t_{\mathrm{ret}}+t_{\mathrm{plan}}+\max(t_{a},t_{b})+t_{\mathrm{gen}}+t_{\mathrm{ver}}+t_{\mathrm{oh}}
$$

*A composed assistant's latency is set by its critical path, not by the sum of stages: parallel tool calls collapse to the slower one. The latency-budget principle must hold this sum at the chosen quantile.*

**Eq 6 · Amdahl ceiling**

$$
S=\frac{1}{(1-f)+f/s}=\frac{1}{0.9+0.10/10}\approx 1.1\times
$$

*The un-accelerated fraction caps total speedup. Making inference — 10% of the request path — ten times faster moves the system about 10%. The stage nobody owns sets the ceiling.*

## From the book

- [Calibration to cohort drop](https://mlsysbook.ai/vol1/16_conclusion/16_conclusion.html) — Vertical causal chain: INT8 calibration, then the firmware preprocessing path, then an input shift on one device cohort, ending in a marked accuracy drop.
- [Chapter margin figure](https://mlsysbook.ai/vol1/16_conclusion/16_conclusion.html) — Companion illustration from the chapter margins.
- [Chapter margin figure](https://mlsysbook.ai/vol1/16_conclusion/16_conclusion.html) — Companion illustration from the chapter margins.
- [Fleet MTBF ladder](https://mlsysbook.ai/vol1/16_conclusion/16_conclusion.html) — One GPU at ~5.7 years mean time to failure versus a 1,024-GPU pool at ~48.8 hours mean time between failures — independent failures collapse component reliability into a two-day cluster cadence.
- [ML systems architecture stack](https://mlsysbook.ai/vol1/16_conclusion/16_conclusion.html) — The full stack a single production decision travels: data, model computation, framework lowering, accelerator execution, serving, operations and governance.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

1. A mobile image classifier fleet drops four accuracy points on specific firmware and device cohorts. Architecture, compression and serving teams all passed their component checks, and aggregate offline evaluation stayed green. Which single addition would have caught the drop in week one?
   - A. Recalibrating the INT8 clipping ranges against a larger and more diverse calibration image set before release.
   - B. Per-cohort accuracy tracking from deployment day one, sliced by device and firmware version.
   - C. Tightening the end-to-end p99 latency budget so preprocessing variance shows up in the tail latency.
   - D. Running the offline evaluation set through the same preprocessing path the firmware applies on-device.

2. A team serving GPT-2 at batch size one on an H100 can fund one of two projects: hand-tuned matrix-multiply kernels that raise achieved FLOP/s, or request batching plus lower-precision weights. The lighthouse trace says which pays and why?
   - A. The kernels, higher achieved FLOP/s always reduces the compute term, and compute is the term batching cannot shrink once weights are already resident.
   - B. Neither, at batch one the fixed overhead term dominates the request, so only dispatch work like graph capture moves the token latency at all.
   - C. The kernels, lower-precision weights risk measurable accuracy loss, and the silicon contract forbids trading statistical quality for a speed win.
   - D. Batching and precision, decode is bandwidth-bound at batch one, so weight-read bytes and reuse, not arithmetic, set the token floor.

3. A recommender workload is dominated by embedding tables larger than one accelerator's memory. Engineers keep proposing faster dense-arithmetic units. Why doesn't that investment move the model?
   - A. Because the tables must be sharded or cached across memory tiers first, capacity is a precondition, not a timed term.
   - B. Because dense arithmetic is already fully overlapped with the embedding lookups, so its execution time is hidden behind the memory transfers.
   - C. Because recommendation quality is set upstream by the data pipeline and the model architecture, so execution improvements cannot change the outcome.
   - D. Because Amdahl's law caps any dense-arithmetic speedup at the share of request time the MLP layers occupy, which is small.

4. Under the book's reference energy constants, one off-chip DRAM access costs roughly how much energy relative to a single arithmetic operation?
   - A. About the same, the energy-movement principle counts them as comparable events.
   - B. Roughly 10×, one order of magnitude, which is why registers exist.
   - C. Roughly 173–582×, hundreds of times, depending on whether the operation is FP32 or FP16.
   - D. Roughly 10,000×, five orders of magnitude, matching the latency gap between DRAM and compute.

5. A single data-center GPU has a mean time to failure of about 5.7 years (~50,000 hours). Across a 1,024-GPU training pool where every accelerator fails independently at the same rate, the cluster mean time between failures is approximately:
   - A. About 48.8 hours, the per-GPU MTTF divided by the pool size, so roughly one failure every two days.
   - B. About 5.7 years divided by the log of the pool size, so roughly one failure per month across the whole cluster under the same per-GPU rate.
   - C. Still about 5.7 years, failures that are truly independent do not compound, and the pool shares nothing that would couple them.
   - D. About 500 hours, the component lifetime divided by the square root of the accelerator count, the standard reliability-pooling rule.

6. Profiling shows accelerator inference is 10% of the serving request path; host-side image decoding and normalization own the rest. The team makes inference 10× faster. End-to-end speedup is closest to:
   - A. 10×, the accelerator term was the critical path, so its speedup passes straight through to the request.
   - B. 5×, Amdahl's law returns roughly half the local speedup once the serial share is accounted for.
   - C. 2×, the parallelizable fraction was half the path, so the speedup halves.
   - D. About 1.1×, the un-accelerated 90% caps the gain: 1/(0.9 + 0.1/10).

7. An LLM chat endpoint reports a 50 ms mean time-to-first-token, but telemetry reveals a 2,000 ms p99 against a 200 ms SLO. Which set of mechanisms should engineers investigate first?
   - A. Long prompts inflating prefill work, and queueing behind long generations, the tail is set by the request mix and scheduling, not the mean decode rate.
   - B. Peak arithmetic throughput at batch one, the mean is healthy, so a 40x tail must be a compute-floor violation that only appears during bursts.
   - C. Weight-loading cold starts, a 2,000 ms tail at p99 is almost always the model deserializing from storage as instances cycle in and out.
   - D. Clock throttling under sustained load, thermal limits cap the decode rate and land precisely on the p99 quantile of the request mix.

8. The chapter's thesis is 'the system is the model.' Explain to a skeptic why the weights-file view, treating the model as a checkpoint of floating-point numbers, fails in production.

9. Using the iron law and the arithmetic intensity law, explain why generating one token from a large decoder at batch size one is bound by memory bandwidth, and name one lever that actually helps.

10. A composed assistant answers a query through: retrieval 50 ms, planner 30 ms, two tool calls issued in parallel at 80 ms and 60 ms, generation 40 ms, verification 20 ms, and 10 ms of orchestration overhead. What is the request's critical-path latency in ms?

11. Under a 100 ms tail-latency SLO, model Alpha scores 95% accuracy but runs at 500 ms while model Beta scores 93% at a measured 50 ms tail. The chapter's verdict:
    - A. Alpha ships, two accuracy points outweigh the latency SLO, which is a product preference that can be renegotiated once users see the quality.
    - B. Beta ships, Alpha is infeasible under the SLO regardless of accuracy; a model is deployable only if it clears every boundary.
    - C. Neither, the SLO and the accuracy target are both hard product requirements, so the honest engineering answer is to redesign the service.
    - D. Alpha ships behind a response cache, serving popular answers from cache moves the effective mean under 100 ms and satisfies the SLO.

## Answer key

1. B. No component failed, the failure lived at an interface, and accuracy was only measured as an aggregate scalar. Disaggregated telemetry by cohort is what would have surfaced it; the other options help but none is the instrument that sees this failure.

2. D. At batch one every token reads every weight once, so intensity is ~1 FLOP/byte and the bandwidth ceiling binds. Batching reuses the weight read across requests and lower precision shrinks the bytes moved, both attack the limiting term.

3. A. DLRM is capacity-bound: the tables exceed one accelerator's memory before arithmetic ever starts. Placement, sharding and caching decide whether the model runs at all, a faster unit on the small MLP layers leaves the limit untouched.

4. C. The energy-movement principle prices events per byte moved and per operation. The DRAM-access-to-FLOP ratio lands in the hundreds, FP32 at the lower end, the cheaper FP16 op setting the upper end.

5. A. Independent constant-rate failures pool multiplicatively: cluster MTBF ≈ MTTF/N = 50,000 h / 1,024 ≈ 48.8 h. At fleet scale, fault tolerance stops being a property and becomes a requirement.

6. D. Amdahl's law: S = 1/((1−f) + f/s) = 1/(0.9 + 0.01) ≈ 1.099. The stage nobody profiles, host preprocessing, sets the ceiling.

7. A. Time-to-first-token includes prompt processing and request waiting. Long prompts and queueing behind long generations stretch the tail 40× past the mean while the mean stays green, the mix and scheduler are the suspects.

8. A user's experienced behavior is produced by the data pipeline, the weights, the execution stack, the serving path and the monitoring loop together. The weights can be byte-identical while behavior degrades: a drifted feature, a miscalibrated quantization range from a shifted preprocessing path, or a queueing spike all change outputs without touching the file. In the composite fleet case every component passed its checks and accuracy still fell four points on some cohorts, the failure lived at interfaces no component test exercises. So the thing to test, monitor and version is the request path end to end, not the artifact.

9. The iron law splits token time into bytes-moved/bandwidth + operations/achieved-rate + overhead. At batch one, decode reads every weight once and performs roughly two FLOPs per parameter, so intensity is ~1 FLOP/byte, far left of a modern accelerator's ridge (~295 FLOP/byte on the two-H100 pair). The arithmetic intensity law then caps attainable compute at intensity×bandwidth, making the memory floor ~20.9 ms vs a ~0.07 ms compute floor for Llama 2 70B. Levers that touch the limiting term: batch requests to reuse each weight read, shrink bytes per weight (INT8/INT4), or speculative decode that does extra compute to produce more tokens per weight read.

10. 230 ms, 50 + 30 + max(80, 60) + 40 + 20 + 10 = 230. Parallel tool calls collapse to the slower one, not to a sum; the latency-budget principle must hold this critical path at the chosen quantile.

11. B. The latency budget is a feasibility gate, not a tradeable objective. Alpha cannot meet the boundary it must cross; Beta clears the tail and meets the latency requirement, feasibility first, then accuracy within the feasible set.

## Audio overview

[Listen to the Marcus & Iris read-along (~9 min)](https://benebsworth.com/study-audio/vol1/16-conclusion.m4a) — a generated podcast walking this packet's argument.
