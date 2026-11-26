---
openingQuestion: "Every team on a mobile image-classifier fleet hit its metric, architecture shrank the FLOPs, compression fit the SRAM, serving brought p99 under 50 ms. Within weeks, accuracy fell four points on specific firmware cohorts and nobody's dashboard noticed. What failed?"
---

# Conclusion: Study Packet

*Working through [Conclusion](https://www.mlsysbook.ai/vol1/16_conclusion/16_conclusion.html), chapter 16 of Machine Learning Systems by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

**The system is the model.** The behavior a user receives is produced by the data pipeline, the weights, the execution stack, the serving path and the monitoring loop together, never by the weights alone. Every chapter gave one stage of that voice-assistant request a mechanism and a cost; this chapter shows the costliest failures live ==at the interfaces no component test exercises=={The fleet failure: INT8 clipping ranges fixed during calibration met a firmware-specific preprocessing routine that interpolated images differently. No component failed, nothing crashed, and the cohort accuracy drop was invisible to monitoring built only for aggregates.}. The discipline that catches them is the same one the whole book taught: trace the request end to end, find the limiting term, and measure the boundary. Start with [the five lighthouses](#fig-lighthouse-trace), each one probes a different limiting term.

> [!note] Reading the marks
> Amber dotted marks carry why-it-matters cards. Hover, tap or tab to read them.

## Guided notes

### The System Is the Model

- The opening composite: three teams, three green metrics. Architecture chose depthwise separable convolutions, compression quantized to INT8 inside on-chip SRAM, serving held end-to-end p99 under 50 ms. Weeks later, accuracy fell ==four percentage points on specific firmware and device cohorts=={INT8 quantization fixes its clipping ranges during calibration, permanently encoding the calibration images' distribution. A firmware-specific preprocessing path interpolated images differently and shifted the input on those cohorts. Aggregate offline evaluation passed; cohort telemetry didn't exist.}.
- No component failed in isolation. Each team validated its own piece; latency was measured end to end, but accuracy was measured only as an aggregate scalar over an offline set. The fix was not better components, it was ==per-cohort accuracy tracking from day one=={The alarm would have fired in week one. Most failures of this kind start at an interface between components, so the engineering task is to test the interfaces before they fail.}.
- Traditional software engineering treats correctness as decoupled from hardware and the "model" as a weights checkpoint. In ML systems, weights are often not the most fragile part, statistical behavior is physically inseparable from the pipelines, memory hierarchies and accelerators that train, serve and monitor it.

::fig[interface-failure]

### Lighthouse Models: Constraint Propagation

- The five lighthouses each saturate a different resource first, and each names the lever that pays: ResNet-50 compute-bound (batch + reduced precision; bandwidth wasted past the ridge), GPT-2/Llama decode bandwidth-bound (batching, fewer bytes per weight, KV management; peak arithmetic wasted at batch one), DLRM capacity-bound (shard embeddings across tiers; faster dense math wasted), MobileNetV2 compute-bound in its phone-NPU regime (depthwise, then INT8), KWS power-bound (sub-megabyte INT8 under a milliwatt; cloud streaming wasted, the radio costs more than local inference).
- The regime belongs to the ==workload on a machine, not the model name=={GPT-2 training is compute-bound even though its decode is bandwidth-bound, training reuses each weight across the batch. ResNet-50 went input-bound when the data pipeline starved it. Check the regime before choosing the lever.}.
- Precision and machine move the regime: INT8 doubles the H100's peak rate without raising bandwidth, so it doubles the ridge point, a layer whose activations still move at 16 bits can fall below the doubled ridge and become bandwidth-bound. MobileNetV2, compute-bound on the phone NPU, waits on memory on an H100.

::eq[ai-law]
$$
\text{rate}\le \min(P,\; I\times B)
$$

::fig[lighthouse-trace]

- MobileNetV2's nine-phase journey is the whole book in one column: mobile tier sets the watt envelope → depthwise separable convolutions (**8.7×** fewer FLOPs on a representative 3×3, 256-channel layer; **13.7×** fewer ops than ResNet-50) → high-throughput training for a low-latency server → capacity-matched augmentation → INT8 (FP32 costs **4×**, FP16 **2×** the bytes) → NPU mapping → benchmark boundary → p99 serving → drift monitoring. Every decision narrowed what the next phase could choose.

### Thirteen Quantitative Principles

- The book's thirteen principles are not the same kind of statement: three hard bounds (Pareto frontier, arithmetic intensity, Amdahl), two decompositions (iron law, energy-movement), two fitted models (statistical drift, bias feedback), two policies (verification gap, latency budget), four heuristics (data-as-code, data gravity, silicon contract, training-serving skew). Each is reliable only ==within its stated assumptions=={The silicon contract is a heuristic because it predicts which resource saturates first, a prediction the arithmetic intensity bound then tests.}.
- Regrouped by the introduction's three questions: what shapes predictions (data-as-code + bias feedback), what limits execution (data gravity, iron law, silicon contract, Pareto, arithmetic intensity, energy-movement, Amdahl), what evidence supports deployment (verification gap, drift, skew, latency budget).
- The meta-principle connecting them is the ==conservation-of-complexity heuristic=={Tesler's Law extended: simplifying one part tends to move complexity to another part rather than remove it. Pruning spends capacity, quantization spends precision, distillation spends training compute. It is a diagnostic, not a physical law, trace where the displaced cost landed.}: after any local simplification, find where the cost went.
- The energy-movement principle anchors the ledger in joules: one DRAM access costs ≈ **173–582×** one arithmetic operation (FP32 at the low end, FP16 at the high end).

::fig[principle-map]

::eq[iron-law]
$$
T=\frac{D}{B}+\frac{O}{P\,\eta}+L
$$

### The Dual Mandate Revisited

- The book's two obligations, measured on two lighthouses: trustworthy learned behavior on DLRM (tracked through drift, skew, and the bias feedback factor, a disparity that passes at launch can still compound), and physical deliverability on the GPT-2 family (tracked through the iron law, the roofline, energy per event).
- The sharpest physical example: Llama 2 70B at batch one. ≈47× GPT-2's 1.5B parameters; 140 GB of FP16 weights, 140 GFLOP per token. Sharded on two H100s (6.70 TB/s, 1,978 TFLOP/s), the memory-transfer floor is ≈**20.9 ms** and the compute floor ≈**0.07 ms**, a ratio of ==295.2×=={Decode reads every weight once per token; at batch one its intensity is ~1 FLOP/byte, far below the ~295 FLOP/byte ridge of the two-H100 pair. More peak arithmetic cannot move it, only batching, fewer bytes per weight, or speculative decode touches the limiting term.}.
- The sharpest serving example: an LLM chat endpoint with 50 ms mean time-to-first-token but 2,000 ms p99, a tail **40×** the mean against a 200 ms SLO. The mean looks healthy while the product is broken.
- Both halves are budgets the system must keep meeting, not certificates earned at launch.

::eq[decode-floor]
$$
T_{\mathrm{mem}}=\frac{140\ \mathrm{GB}}{6.70\ \mathrm{TB/s}}\approx 20.9\ \mathrm{ms},\qquad
T_{\mathrm{comp}}=\frac{140\ \mathrm{GFLOP}}{1{,}978\ \mathrm{TFLOP/s}}\approx 0.07\ \mathrm{ms}
$$

::chart[token-floor-ratio]

### Future Directions

- Every added deployment context adds failure surfaces: the edge runs under watt and battery budgets, TinyML compresses the same problem into kilobytes and milliwatts, and composed services (retrieval → planner → tools → generator → verifier) put several principles under load at once.
- A composed request's realized latency follows its ==critical path=={Retrieval + planner + the slower of the two parallel tool calls + generation + verification + orchestration overhead. The latency budget must hold that sum at the chosen quantile, and each added stage is also an added failure surface and observability boundary.}: parallel tools collapse to their slowest member, not to a sum.

::eq[critical-path]
$$
T_{\mathrm{req}}=t_{\mathrm{ret}}+t_{\mathrm{plan}}+\max(t_{a},t_{b})+t_{\mathrm{gen}}+t_{\mathrm{ver}}+t_{\mathrm{oh}}
$$
- Fleet scale keeps the same method at a larger boundary: a single GPU at ≈5.7 years MTTF (~50,000 hours) looks reliable; across a 1,024-accelerator pool the cluster MTBF collapses to ≈**48.8 hours, about two days**. Fault tolerance stops being a property and becomes a requirement.

::eq[fleet-mtbf]
$$
\mathrm{MTBF}_{\mathrm{fleet}}=\frac{\mathrm{MTTF}}{N}=\frac{50{,}000\ \mathrm{h}}{1{,}024}\approx 48.8\ \mathrm{h}
$$

::chart[fleet-mtbf]

### The Engineering Responsibility and Pitfalls

- The responsibility follows from the physics: accessibility, subgroup fairness and environmental cost are engineering outcomes because the same cross-layer decisions produce them. Robust systems assume confident-and-wrong behavior is normal and design ==graceful degradation=={Fallback paths, uncertainty thresholds that route low-confidence predictions down them, version-scoped rollback, monitoring hooks. Rollback repairs a bad release, it cannot repair covariate drift, which follows the cause, not the symptom.} into the request path.
- The fallacies share one root: treating the system as decomposable into independent parts. The Amdahl pitfall is the arithmetic form, accelerating inference, 10% of request time, by 10× yields a system speedup of $1/(0.9+0.01)\approx 1.1\times$, because the unowned 90% sets the ceiling.
- A model evaluated on top-line accuracy alone ignores its boundaries: under a 100 ms tail SLO, a 95%-accurate model at 500 ms is infeasible while a 93%-accurate model at 50 ms ships.

::eq[amdahl-cap]
$$
\text{Speedup}=\frac{1}{(1-f)+f/s}=\frac{1}{0.9+0.10/10}\approx 1.1\times
$$

### The Request, Retraced

- The voice-assistant request, traced once more through every layer: a ~200K-parameter KWS model (200 KB INT8 in 1 MB flash, 20 MFLOP, milliwatt) listens; a MobileNetV2-class front end (600 MFLOP, 3.5 MB INT8, 5 W) transcribes on the NPU; DLRM ranks retrieval against ==100 GB of embeddings that exceed one H100's 80 GB before any arithmetic=={Capacity is a precondition, not a term, the silicon contract says the tables must be sharded or cached before compute or bandwidth matter.}; a GPT-2 decoder writes the answer at ~0.9 ms/token of weight traffic. Power, compute, capacity, bandwidth, each layer sets a different limit on one request.

::fig[request-trace]

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
