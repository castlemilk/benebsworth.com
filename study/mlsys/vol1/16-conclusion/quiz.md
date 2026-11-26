# Self-test: Conclusion

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
