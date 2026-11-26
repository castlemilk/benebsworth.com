# hosts: Marcus | Iris

A: I'm Marcus, and this is Iris. A camera-trap team is choosing a board. Vendor A quotes eight TOPS at eight-bit integer. Vendor B quotes fifteen TOPS at four-bit. Vendor C quotes latency on a proprietary model, Vendor D cites a benchmark score from two generations ago, and Vendor E gives only peak throughput at maximum batch. Which board wins?
::fig[vendor-claims-card]

B: None of them can win yet, and that's the first lesson of this chapter. Each card names a different measurement; different precision paths, different models, different rules, different machine states. A rate in TOPS and a latency on an unknown model aren't two answers to one question. They're answers to five different questions.

A: The fix is the chapter's core move: turn a claim into a test. Fix the task and dataset; what counts as correct. Fix the model and metrics; what counts as better. Fix the harness that executes and records, the machine specification, and the run rules a reproduction must match. Only then does the output become a number you can argue with.
::fig[claim-to-test]

B: Run rules are where honest benchmarks spend their effort. Warm-up policy, clock and power state, cache state, repetition count, and which initialization work is timed. A cold cache and a warm cache are different machines.

A: Before any of that, the chapter opens with the scale of the gap. An H100 delivers nine hundred and eighty-nine teraflops of dense sixteen-bit arithmetic at peak. ResNet-50 training at about five thousand images per second per accelerator; the rate a sixty-four-accelerator system logged in MLPerf Training; sustains about a hundred and twenty-three.
::eq[mfu]

B: That's a model FLOPs occupancy of about twelve percent. The peak is a ceiling under favorable state. MFU reports what the run actually achieved; and the gap between them is where memory-bound layers, the input pipeline, and launch overhead live.

A: Prediction and measurement complement each other here. The roofline puts ResNet-50's ceiling near forty thousand images per second against the ridge. The benchmark reports five thousand. The floor tells you where to look; the measurement tells you what the machine did.

B: The same dilution shows up inside a single request. Take a pipeline with eight milliseconds of preprocessing and ten of inference. Make inference five times faster and the total goes from eighteen to ten; a one-point-eight-times gain, not five. Even infinitely fast inference leaves the eight milliseconds it never touched.
::eq[amdahl-pipeline]

A: That's why component speedups need end-to-end verification. The chapter's edge board is the same story: an attached accelerator runs the model seven and a half times faster than the host CPU, but the user sees about three times, because preprocessing never leaves the host.

B: For serving, the mean hides the operative failure. If one percent of requests take ten times longer, that's ten thousand slow requests per million; timeouts and churn measured at the ninety-ninth percentile, invisible at the mean. Report the percentiles, and for generative work report time to first token and time per token separately.

A: Cold start is another number users actually feel. A seven-billion-parameter model in sixteen-bit is about fourteen gigabytes. A PCIe-4 transfer at twenty-five gigabytes per second takes about five hundred and sixty milliseconds before the runtime does any work; that's the floor that makes model caching a design requirement.
::eq[cold-start]

B: Energy follows one identity; power times time; and every ambiguity lives in which power and which window you integrate. Google's median assistant prompt drew zero point one watt-hours at the accelerators and zero point two four counting everything the service needs. Same prompt, same machines. Only the meter boundary moved.
::fig[measurement-boundary]

A: Two point four times from the boundary alone; fifty-eight percent accelerators, twenty-five percent host CPUs and DRAM, seventeen percent idle reserve. And precision is an energy lever, not just a size one: decomposing MobileNetV2, the float32 weight read and the compute cost comparable joules; eight-bit takes the total from forty-four hundred microjoules to about seven hundred.

B: Battery life follows the duty cycle. Keyword spotting runs one inference per one-second window; about eight milliseconds of work per thousand, under a one-percent duty cycle. At that duty, standby power sets the drain. The efficiency that matters is the one that's off.
::fig[duty-cycle-timeline]

A: Average power is duty times active plus one minus duty times standby. The crossover where active energy starts to matter sits well above the operating duty for always-listening workloads.
::eq[duty-power]

B: Then comes the statistics. A compressed model scores ninety-four percent where the baseline scores ninety-five on the same thousand images; fifty errors versus sixty. Under an independent-samples model the difference is within noise. So is the regression real?
::eq[binomial-se]

A: The marginals can't answer it. The paired comparison can: count where the two models disagree. Images they both get right or both get wrong carry no information; McNemar's test asks whether the disagreements are lopsided enough to be real, and at most twenty-six disagreements still flag this gap.
::fig[disagreement-decides]

B: And one more way a number stops meaning what it claimed: Goodhart's law. A team raised beam search from one to ten, gained half a BLEU point, and turned fifty milliseconds into two hundred; the metric improved and the product broke. Benchmarks are targets.

A: So back to the five vendor cards. What do we actually do with them?
::fig[vendor-claims-card]

B: Use them for a shortlist, then run one test. Fix the trap's own frames, the deployed model artifact, a sustained thermal state at the deployment duty cycle, and a full-stack meter boundary. Measure the ninety-ninth-percentile frame time, energy per frame, and recall on the species the study cares about. The card that survives normalization is the answer; and it might not be the fifteen-TOPS one.

A: A benchmark is evidence under conditions, never proof. The only question that survives contact with production is whether those conditions matched.

B: And this chapter is where the whole optimization part of the book cashes out; data selection, compression, acceleration all ended on a favorable local number. Benchmarking is the discipline that checks whether the numbers survive.
