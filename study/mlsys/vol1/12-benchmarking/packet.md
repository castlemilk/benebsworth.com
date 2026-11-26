---
openingQuestion: "Vendor A quotes 8 TOPS at INT8. Vendor B quotes 15 TOPS at INT4. Vendor C cites an MLPerf score from two generations ago. Which board do you buy for the camera trap?"
---

# Benchmarking: Study Packet

*Working through [Benchmarking](https://mlsysbook.ai/vol1/12_benchmarking/12_benchmarking.html), chapter 12 of Machine Learning Systems by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

A benchmark is a claim turned into a controlled test; ==the number only exists inside its boundary=={A throughput measured on an isolated accelerator, a warm machine, a narrow input distribution and a millisecond window describes that setup, not your deployment. Every result must name the measurement boundary it was taken inside.}. Optimization produced three favorable local numbers: a smaller file, a faster kernel, a higher score, each computed for one stage in isolation. Benchmarking asks whether they survive production granularity: the full request path, the tail percentile, the duty cycle, and the quality floor on the slices that matter. The camera-trap board below answers one question: [which vendor's claim survives normalization](#fig-vendor-claims-card)?

> [!note] Reading the marks
> Amber dotted marks carry why-it-matters cards. Hover, tap or tab to read them.

## Guided notes

### The Benchmark–Production Gap

- Each Part III chapter ended on a favorable local number. Data selection reached target accuracy on fewer examples, compression cut the model to a quarter of its size, and the roofline put the layers on the compute roof. Benchmarking tests those numbers ==where the machine meets the claim=={An INT8 artifact can post a large speedup on a synthetic workload and none under real traffic with variable input sizes and concurrent requests. The challenge is not whether a local metric improved but whether the improvement reaches the deployment.}.
- Three terms structure the gap. A ==service-level objective=={The measurement a deployment is allowed to miss only rarely (say 99% of requests inside 100 ms). The service-level agreement adds consequences.} turns a latency wish into a measurable target; ==MFU=={Share of the numerical-path peak the run spends on model arithmetic: useful FLOPs per elapsed second divided by the matching numerical-path peak. It reports what a run achieved, while the peak spec only bounds what is possible.} separates achieved arithmetic from the datasheet peak; and the ==hardware lottery=={Architectures get lucky when their structure matches the era's dominant hardware. Results measured on one hardware generation can fail to transfer.} warns that today's favorable number may not survive the next machine.
- The chapter's opening measurement sets the scale: an H100 delivers 989 TFLOP/s of dense FP16 arithmetic at peak, yet ResNet-50 training at about 5,000 images/s per accelerator at the rate a 64-accelerator H100 system logged in MLPerf Training v3.1, sustains about 123 TFLOP/s of model arithmetic, an achieved share of about 12.4%.

::eq[mfu]
$$
\mathrm{MFU}=\frac{\text{useful model FLOP/s}}{\text{peak FLOP/s}}
$$

::chart[mfu-gap]

### Benchmark Carpentry

- Every benchmark starts as a claim. Turning the claim into a test fixes ==six components=={Task and dataset, model and metrics, the measurement harness, the hardware specification, the run rules, and the report. Omit one and the number cannot be argued, only asserted.}: the task and dataset define what counts as correct; the model and metrics define what counts as better; the harness executes and records; the specification pins the machine; and the run rules fix the conditions any reproduction must match.

::fig[claim-to-test]

- ==Run rules=={Warm-up policy, clock and DVFS state, cache state, repetition count, and which initialization work is timed or discarded. A cold cache and a warm cache are different machines.} are where honest benchmarks spend their effort: steady-state measurement discards cold-start iterations, cache state matches the claim, and timing windows include only completed work.
- The performance specification couples a ==quality floor with execution limits=={MLPerf Training requires 75.9% top-1 for ResNet-50; an INT8 deployment might permit at most one percentage point of loss. Tail-latency ceilings, throughput matching the arrival rate, memory and energy budgets bound the execution.}.
- A complete reference benchmark fixes every component at once. MLPerf Tiny's anomaly-detection pipeline spans nine sequential phases, task through spectrogram extraction, autoencoder training, INT8 quantization, down to deployment on a microcontroller, and reports AUC because a trivial always-normal predictor already scores 99.9% on 0.1% anomalies.

### Granularity: Micro, Macro, End-to-End

- Microbenchmarks isolate a kernel; macro benchmarks time the model; ==end-to-end benchmarks measure the pipeline the request travels=={JPEG decode, resize and normalize can cost more host time than the inference they feed. A component speedup is diluted by every stage it does not touch.}. The right granularity is the one that decides the engineering question in front of you.
- Prediction and measurement do different work. The roofline puts ResNet-50 training's compute-roof ceiling near 40,200 images/s against the 295 FLOP/byte ridge; the MLPerf measurement reports about 5,000. The floor tells you where to look; the measurement tells you what the machine did.
- Component speedups dilute by Amdahl's law. A vision pipeline spending 8 ms on preprocessing and 10 ms on inference improves its total from 18 ms to 10 ms when inference runs 5× faster: a 1.8× gain, not 5×.

::eq[amdahl-pipeline]
$$
S_{\mathrm{e2e}}\le\frac{1}{1-f}\quad\text{as }S_{\mathrm{part}}\to\infty
$$

::chart[pipeline-dilution]

### Benchmark Suites and Their Claims

- Suites exist because vendor numbers don't compose. Synthetic instruction-mix microbenchmarks gave way to application benchmarks as systems grew too complex for a kernel to predict; MLPerf carries the same lesson into ML, fixing ==divisions, scenarios and run rules=={The closed division runs the reference model under shared rules; the open division permits model and software changes under disclosure. Scenarios (offline, server, single-stream, multi-stream) match the deployment arrival pattern.} so two submissions measure the same workload.
- The suite's claim is narrow by design: comparable numbers under shared conditions. It cannot certify your deployment: your data distribution, your latency tail and your duty cycle are yours to measure.

### Training Benchmarks

- The primary metric is ==time to accuracy=={The time required to reach a predefined quality target; time to quality or time to train. Throughput that never reaches the target is waste, however fast.}: doubling images per second by doubling the minibatch buys nothing if the run needs twice as many epochs or misses the quality floor.

::eq[time-to-accuracy]
$$
T_{\mathrm{train}}=\inf\{t\ge 0:\mathrm{Acc}_{\mathrm{val}}(t)\ge \mathrm{target}\}
$$
- Behind the headline number sit the diagnostics: scaling efficiency (an 8-GPU configuration that loses 25% of its ideal speedup is paying a tax somewhere), the achieved-share figure against the numerical-path peak, memory residency and occupancy, and energy per run; one large training run is estimated at 1,287 MWh.
- Run rules fix the accuracy target so submissions compete on the machine, not on convergence luck; checkpoint overhead and fault tolerance enter the budget too.

### Inference Benchmarks

- Serving is a distribution, not a number. Report ==percentiles=={p50 describes the typical request; p99 describes the slowest 1%. If 1% of requests take 10× longer, 10,000 requests per million are slow enough to risk timeouts; the tail is a user-facing quantity, not noise.}, never just the mean, and watch the composition: a fan-out request that waits for ten backends is dominated by the slowest of them.
- Generative serving splits latency into ==TTFT and TPOT=={Time to first token measures responsiveness; time per output token measures sustained delivery. A 750-token response takes 30 s at 25 tokens/s and 7.5 s at 100; the two rates are different user experiences.}.
- ==Cold start=={Load time plus first-request latency. A 7B-parameter model in FP16 is ~14 GB; PCIe 4.0 transfer at 25 GB/s effective bandwidth alone takes ~560 ms; the lower bound that makes caching and speculative loading design requirements.} is the percentile users actually feel in serverless deployments.

::eq[cold-start]
$$
t_{\mathrm{load}}\ge\frac{M_{\mathrm{model}}}{B_{\mathrm{link}}}
$$
- The chapter's camera trap puts it together: INT8 MobileNetV2 runs 15 ms on the host CPU against a 33 ms frame budget at 4× smaller size and −0.9 points of top-1; the attached accelerator's 7.5× isolated inference speedup narrows to ~3× end-to-end because preprocessing never moves off the host.
- And the vendor spec cards still don't compose:

::fig[vendor-claims-card]

### Power and Energy Measurement

- Energy obeys one identity, $E=P\times t$, and every ambiguity lives in ==which P and which t you integrate=={An isolated inference window at 300 W and 10 ms is 3 J. Widen the window to include idle and host time and the same request costs more.}.

::eq[inference-energy]
$$
E_{\mathrm{inf}}=P_{\mathrm{active}}\times t_{\mathrm{inf}}
$$
- The measurement boundary alone can more than double the reported energy. Google's median Gemini prompt drew 0.10 Wh at the accelerators and 0.24 Wh counting everything the service needs: active accelerators 58%, host CPUs and DRAM 25%, idle reserve and overhead 17%.

::fig[measurement-boundary]

::chart[energy-boundary]

- Precision is an energy lever, not just a size one: decomposing MobileNetV2, FP32 spends comparable energy reading weights (2,243 µJ) and computing (2,220 µJ); INT8 takes the total from 4,463 µJ to 681 µJ.
- Battery life follows the ==duty cycle=={The fraction of time the accelerator actively runs inference. Keyword spotting on an ESP32-S3-class board infers for 8.3 ms inside each one-second window, a 0.8% duty cycle where standby, not the 3.3 mJ inference, sets the drain.}, so at low duty the idle floor dominates and the active-efficiency comparison barely matters.

::eq[duty-power]
$$
P_{\mathrm{avg}}=d\,P_{\mathrm{active}}+(1-d)\,P_{\mathrm{standby}}
$$

::fig[duty-cycle-timeline]

### Best Practices: Is the Difference Real?

- A finite test set is an instrument with resolution. A 95% model versus a 94% model on the same 1,000 images is 50 errors versus 60; the ==marginal scores cannot answer the question=={Under a baseline binomial the error count has a standard deviation of about 7, so a 10-error gap overlaps noise. Only where the two models disagree carries information.}.

::eq[binomial-se]
$$
\mathrm{SE}=\sqrt{\frac{\hat a_1(1-\hat a_1)}{N}+\frac{\hat a_2(1-\hat a_2)}{N}}
$$

- ==McNemar's test discards the concordant images=={Images both models get right or wrong are uninformative. With at most 26 disagreements still flagging significance, the count of disagreements, not the size of the test set, decides.} and asks whether the disagreements are lopsided enough to be real.

::eq[mcnemar]
$$
\chi^2=\frac{(b-c)^2}{b+c}
$$

::fig[disagreement-decides]

- Protocol completes the statistics: repeated runs across seeds, paired tests on the same inputs, confidence intervals, and, at suite scale, audits and peer review of the run itself.
- Benchmarks are also targets. ==Goodhart's law=={Beam size 1 to 10 bought a 0.5-point BLEU gain at 10× the candidate evaluations: 50 ms became 200 ms and the serving deadline broke. Optimizing the metric optimizes away the thing it measured.}, benchmark overfitting, and the hardware lottery each describe a way a number stops meaning what it claimed.

### Model and Data Evaluation

- A hardware result certifies nothing about the model on your data: ==confidence calibration=={Expected calibration error weighs how often the model is right against how confident it said it was, per bin. A fast, wrong-and-confident model passes every systems metric.}, slice accuracy, and coverage are separate measurements.
- Accuracy averages hide the operative failure. On the camera trap's rare-species data an always-majority predictor scores 99% while failing the study's purpose; the same trick the 99.9% anomaly predictor plays.
- The data evaluation asks whether the test set was representative, whether labels are trustworthy, and whether the distribution you measured is the distribution you serve.

### Fallacies and Pitfalls

- ==Peak as sustained=={A vendor's peak TOPS at maximum batch and cool silicon is a ceiling, not a deployment. A sustained thermal run can deliver a fraction of the peak; measure the state you will actually hold.}.
- ==Mean as distribution=={The mean can improve while the p99 degrades; the user contract lives in the tail.}.
- ==Component as end-to-end=={The 7.5× isolated inference speedup that arrives as ~3× to the user, because preprocessing stayed on the host.}.
- ==Energy without a boundary=={0.10 Wh and 0.24 Wh describe the same prompt; only the boundary differs. Report the boundary or the number is unrepeatable.}.
- ==Throughput without quality=={Throughput that never reaches the accuracy target is not faster training; a benchmark score that games the metric is not better serving.}.

### Summary

- Benchmarking turns an optimization claim into a controlled test: fix the task, data, model, metrics, harness, machine and run rules, then measure at the granularity the decision needs.
- Prediction and measurement are complements: the roofline's 40,200 images/s ceiling and MLPerf's 5,000 name the same machine two ways, and the gap between them is the work.
- Boundary, state and duty cycle move every number: the same prompt is 0.10 Wh or 0.24 Wh; the same board is 8 TOPS or a throttle; the same test set decides or doesn't depending on disagreements.
- A benchmark is evidence under conditions, never proof; the only question that survives contact with production is whether those conditions matched.

## The physics

| Quantity | Value | Use |
|---|---|---|
| H100 dense FP16 peak vs sustained | 989 vs ~123 TFLOP/s | Peak is a ceiling; MFU ≈ 12.4% reports the achieved share. |
| Roofline ceiling vs measurement | ~40,200 vs ~5,000 images/s | The floor predicts where to look; the run rules report what happened. |
| ResNet-50 quality target | 75.9% top-1 (MLPerf Training) | Time to accuracy only counts against a fixed target. |
| Lighthouse footprints | ResNet-50: 25.6M params, 8.2 GFLOP, 102.2 MB FP32. MobileNetV2: 3.5M, 600 MFLOP, 14 MB. KWS: 200K, 20 MFLOP, 800 KB. | Equal accounting before any benchmark is run. |
| MobileNetV2 INT8 trade | 50 ms → 15 ms, 14 MB → 3.5 MB, −0.9 pp top-1 | A multi-dimensional trade; no single number settles it. |
| Edge accelerator dilution | 7.5× isolated → ~3× end-to-end | Preprocessing never leaves the host. |
| Amdahl pipeline | 8 + 10 ms; inference 5× → 18 → 10 ms = 1.8× | Untouched stages cap the win at $1/(1-f)$. |
| Per-prompt energy boundary | 0.10 Wh accelerators vs 0.24 Wh full stack | Boundary alone moves the number 2.4×; shares 58/25/17. |
| KWS duty cycle | 8.3 ms per 1 s window, ~3.3 mJ, idle share >90% | At low duty the standby floor sets battery drain. |
| Cold-start floor | ~14 GB at 25 GB/s → ~560 ms | The transfer bound serverless users feel first. |
| Statistical resolution | 50 vs 60 errors in 1,000 images; ≤26 disagreements decide | Marginal scores can't resolve small gaps; discordant pairs can. |

## Glossary

- **Service-level objective (SLO)**: the measurable target a deployment may miss only rarely; the SLA adds consequences.
- **MFU**: useful model FLOPs per elapsed second divided by the matching numerical-path peak.
- **Time to accuracy**: time required to reach a predefined quality target; the primary training metric.
- **Percentile (p50/p95/p99)**: the latency that share of requests meets or beats; the tail is a user-facing quantity.
- **TTFT / TPOT**: time to first token / time per output token; responsiveness and sustained delivery for generative serving.
- **Cold start**: load time plus first-request latency, dominant where models are loaded on demand.
- **Run rules**: the controlled conditions (warm-up, clocks, cache state, repetitions) a reproduction must match.
- **Measurement boundary**: which components and which window the meter covers.
- **Duty cycle**: the fraction of time the accelerator is active; sets which power state dominates.
- **Expected calibration error (ECE)**: weighted gap between confidence and observed correctness across bins.
- **McNemar's test**: a paired significance test that counts only disagreements between two models on the same inputs.
- **Hardware lottery**: architectures winning because their structure matches the era's dominant hardware.

## → Ben's world

- In the LLM harness, pin the run rules per benchmark card: model version, quantization path, prompt mix, concurrency and DVFS state all belong in the report, or the tok/s number can't be compared across runs.
- For Greenveil's extraction service, report p50 and p99 by image slice (night, small print); an aggregate latency or aggregate recall can both hide the operative failure.
- On the shared droplet, separate queueing from model time before believing a speedup; co-tenant contention is part of the machine you measured, not noise to discard.

## Open questions

- At what test-set size does a one-point slice regression become undetectable even with paired disagreements?
- How much of the 0.10 → 0.24 Wh gap is reserved idle capacity a deployment could in principle shed?
- Which of the harness's published tok/s numbers would survive a cold cache and a production prompt mix?
