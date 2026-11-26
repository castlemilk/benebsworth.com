# hosts: Marcus | Iris

A: I'm Marcus, this is Iris. Last chapter was responsible engineering, the obligations a system owes the people it affects. Today we close the book: the conclusion, which makes the whole thesis quantitative. It opens with a failure story: an image classifier deployed across a fleet of mobile devices.

B: Three teams, and every one of them hit its metric. The architecture team chose depthwise separable convolutions. The compression team quantized to INT8 so everything fit in on-chip SRAM. The serving team held end-to-end p99 under fifty milliseconds. All green.

A: And then within weeks, accuracy fell four percentage points, on specific firmware and device cohorts only.

B: And nothing failed in isolation. INT8 quantization fixes its clipping ranges during calibration, it permanently encodes the distribution of the calibration images. A firmware-specific preprocessing routine interpolated images differently. On those cohorts the input distribution shifted, the calibrated ranges were wrong, and accuracy dropped.
::fig[interface-failure]

A: So no component broke, nothing crashed, and the monitoring never saw it because accuracy was only measured as an aggregate scalar over an offline eval set.

B: Exactly. The chapter's point: the failure lived at an interface no component test exercises. Per-cohort accuracy tracking from day one would have fired in week one. That's the opening argument for the thesis: the system is the model, the behavior a user receives comes from the pipeline, the weights, the execution stack, the serving path and the monitoring loop together. Never the weights alone.

A: The model as a file of floats is the wrong object to test, version and monitor.

B: Right. And the way the chapter makes that claim predictive is the five lighthouse models, each one a different limiting term.

A: Walk me through them.

B: ResNet-50 is compute-bound, batching and reduced precision pay, extra bandwidth past the ridge is wasted. GPT-2 and Llama decode is bandwidth-bound, batching, fewer bytes per weight and KV-cache management pay; peak arithmetic at batch one is wasted. DLRM is capacity-bound, the embedding tables exceed one accelerator's memory, so sharding and caching pay and faster dense math is wasted. MobileNetV2 is compute-bound inside a phone power envelope, depthwise, then INT8. And keyword spotting is power-bound, a sub-megabyte INT8 model under a milliwatt beats streaming audio to the cloud, because the radio costs more energy than local inference.
::fig[lighthouse-trace]

A: And the regime isn't a property of the model name, it's the workload on a machine.

B: That's the subtlety. GPT-2 training is compute-bound even though its decode is bandwidth-bound, because a training step reuses each weight across the batch. Precision moves it too: INT8 doubles the H100's peak rate without raising bandwidth, so the ridge point doubles, a layer whose activations still move at sixteen bits can fall below the new ridge and become bandwidth-bound.

A: MobileNetV2 on an H100 instead of a phone NPU, same crossing.

B: Same crossing. Compute-bound on the NPU, memory-bound on the H100. And the chapter walks MobileNetV2 through nine phases of the book, the deployment tier sets the watt envelope, depthwise convolutions cut FLOPs eight-point-seven times on a representative layer and thirteen-point-seven times versus ResNet-50 overall, training at high throughput for a model that will serve single requests, capacity-matched augmentation, INT8, where FP32 costs four times the bytes and FP16 two times, then mapping, benchmarking, serving, and monitoring. Every decision narrowed what the next phase could choose.

A: Then the chapter takes its thirteen quantitative principles and re-sorts them by the three questions the introduction asked.

B: What shapes predictions, data-as-code and the bias feedback model. What limits execution, data gravity, the iron law, the silicon contract, the Pareto frontier, arithmetic intensity, energy movement, Amdahl. What evidence supports deployment, the verification gap, statistical drift, training-serving skew, and the latency budget.
::fig[principle-map]

A: And they're not all the same kind of statement.

B: Right, three are hard bounds, two are decompositions, two fitted models, two policies, and four heuristics. The silicon contract is a heuristic: it predicts which resource saturates first, and the arithmetic intensity bound is what tests that prediction. Each principle only holds inside its stated assumptions.

A: And the meta-principle above all of them is conservation of complexity, Tesler's law.

B: A diagnostic, not a physical law: simplifying one part tends to move complexity somewhere else. Pruning spends capacity, quantization spends precision, distillation spends compute. After any local simplification, trace where the cost landed.

A: The energy-movement principle puts a number on the most basic asymmetry: one DRAM access costs about a hundred seventy-three to five hundred eighty-two times one arithmetic operation.

B: FP32 sits at the low end of that range, FP16 sets the high end. Data movement dominates both the time ledger and the energy ledger, which is why it shows up everywhere.

A: Then the dual mandate gets measured on two lighthouses, trustworthy behavior on DLRM, physical deliverability on the GPT-2 family.

B: And the sharpest physics in the chapter: Llama 2 seventy-B at batch one. About forty-seven times GPT-2's parameters, a hundred forty gigabytes of FP16 weights, a hundred forty gigaflops per token. On two H100s, six point seven terabytes per second of aggregate bandwidth, nearly two thousand teraflops of FP16 peak, the memory floor is twenty-point-nine milliseconds and the compute floor is point-zero-seven. Two hundred ninety-five times apart.
::eq[decode-floor]

A: So a batch-one token is almost entirely a memory wait. The levers are batching, shrinking bytes per weight, or speculative decode, spending compute to get more tokens per weight read. Nothing else touches it.

B: And the serving side of the same lesson: an LLM chat endpoint with a fifty-millisecond mean time to first token, looks healthy, but a two-thousand-millisecond p99. A tail forty times the mean, against a two-hundred-millisecond SLO. Prompt processing and queueing behind long generations do that while the mean stays green.

A: Both halves of the mandate are budgets the system keeps meeting, not certificates earned at launch.

B: Then future directions, the same principles stretched into new contexts. The edge under watt budgets, TinyML in kilobytes and milliwatts, and composed services where a request fans out through retrieval, a planner, tools, a generator and a verifier.

A: The latency of a composed request follows its critical path, parallel tool calls collapse to the slower one, not a sum.
::eq[critical-path]

B: And at fleet scale: a single GPU at about five point seven years mean time to failure. A thousand-twenty-four-accelerator pool, the cluster sees a failure about every forty-eight point eight hours. Roughly every two days.
::eq[fleet-mtbf]

A: Fault tolerance stops being a property and becomes a requirement.

B: The closing section puts the responsibility where the physics put it: robust systems assume confident-and-wrong is normal and build graceful degradation in, fallback paths, uncertainty thresholds, scoped rollback. And the fallacies all share one root: treating the system as decomposable into independent parts.

A: The Amdahl one is the arithmetic version: accelerate inference, ten percent of the request path, by ten times, and the system speeds up about ten percent.
::eq[amdahl-cap]

B: And the accuracy-version: a ninety-five percent model at five hundred milliseconds is infeasible under a hundred-millisecond SLO, while a ninety-three percent model at fifty ships. Feasibility first, then quality inside the feasible set.

A: The book ends by tracing that voice-assistant request through every layer one last time.

B: A keyword spotter, about two hundred thousand parameters, two hundred kilobytes of INT8 in one megabyte of flash, twenty megaflops, a milliwatt budget, listens for the wake word. Power-bound. A front end of MobileNetV2's size, six hundred megaflops on three and a half megabytes of INT8 inside five watts, transcribes on the NPU. DLRM ranks the retrieval against a hundred gigabytes of embeddings that exceed one H100's eighty, capacity before arithmetic. And GPT-2 writes the answer, reading three gigabytes of FP16 per token, a zero-point-nine millisecond memory floor. Power, compute, capacity, bandwidth, each stage bound by a different term of the same law.
::fig[request-trace]

A: That's the book: the system is the model, the regime picks the lever, and the interfaces are where it breaks.

B: What endures is the method, start from empirical evidence and physical bounds, quantify the trade-offs, and treat system design as constrained optimization. The world is rushing to build AI systems; the task is to engineer them.
