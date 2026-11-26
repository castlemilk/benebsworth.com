---
openingQuestion: "Which compression change will make this model fit and run well on its target device while preserving the quality users need?"
---

# Model Compression: Study Packet

*Based on [Machine Learning Systems](https://github.com/harvard-edge/cs249r_book/blob/de87c0103806d7bfb1c677dbb77a2b92fa00c298/books/vol1/10_model_compression/10_model_compression.qmd) by Vijay Janapa Reddi and contributors (CC BY-NC-SA 4.0).*

## Thesis

The compression change most likely to make a model fit and run well is the one that reduces the resource use that currently prevents deployment. Start by measuring the task and its bottleneck on the target device. Change the model structure when there is work the device could avoid, lower precision when fewer bits can reduce resident memory or data movement, and change execution when the runtime can avoid intermediate transfers or exploit the compressed representation. A candidate is ready when the exported artifact meets the device's memory, timing, and energy limits under representative conditions and preserves the quality users need, including on inputs the aggregate score can hide.

## Guided notes

### Count the entire resident footprint

A deployment budget puts a ceiling on the memory, time, and energy that a model can use. For a capacity limit, count the allocations that coexist at peak use, including weights, live activations, and runtime buffers. An artifact's file size answers a separate storage question. Once the model fits, timing depends on the deployment. A camera must deliver frames on time, a cloud service must handle its request load, and a microcontroller may need to fit its artifact in flash and its peak working set in SRAM.

Trace one inference through an allocation timeline: weights may persist throughout, while activations, scratch space, packed weight copies, and state have different lifetimes. Add only allocations that coexist, but include every allocation in the capacity being checked. For a decoder, repeat the accounting at the longest supported context because its key-value cache grows as tokens accumulate. ==Peak residency is a lifetime question=={Allocations that never coexist do not contribute together to the peak.}

Measure the baseline at production input sizes, batch or concurrency, and power mode. Pair allocation peaks and end-to-end timing with a runtime trace and hardware counters to investigate whether the hot path is limited by data transfers, arithmetic, or launch overhead.

For an illustrative device with a 48 MiB tensor budget, suppose 24 MiB of weights and 36 MiB of activations coexist. Their 60 MiB total exceeds capacity by 12 MiB. Reducing the weights to 8 MiB while holding activations fixed gives 44 MiB, leaving 4 MiB under the limit. The bar labels compare those two totals with capacity; this first calculation excludes all other allocations.

::fig[resident-footprint-versus-capacity]

The shorter compressed bar does not imply a threefold reduction in peak memory: activations remain at 36 MiB. Treating weight reduction as proportional peak reduction could lead to shipping a model that fails when other buffers coexist. Check the allocation trace at peak use, including runtime buffers, and recalculate against the applicable limit. Then measure timing and quality on the exported model. If the limiting resource remains computation rather than capacity, removing work from a hot layer is another candidate.

### Remove work from a trained model

Structural compression changes the work in the inference graph. Channel pruning removes an output channel and the corresponding inputs of layers that consume it. The resulting smaller dense layers can use ordinary kernels and may also produce smaller activations. Low-rank factorization replaces a matrix with two thinner matrices when its useful behavior can be approximated in fewer dimensions. Both methods are most promising when the affected layers contribute substantially to the measured bottleneck and the resized operations map well to the target.

When pruning a convolutional output channel, remove its corresponding inputs from every consumer. Follow residual paths and shared consumers as well: their tensor shapes must remain compatible. Try widths aligned with the target hardware’s tiles, then fine-tune each viable candidate and check task quality. Scattered zeros alone retain the original dense shape, so an ordinary dense kernel still processes those positions.

For an m-input, n-output linear layer, a rank-r approximation replaces m × n weights with r × (m + n). Its two operations create an intermediate tensor and may require a second launch. ==Fewer arithmetic operations are only a candidate speedup=={The exported operations must also execute efficiently on the target device.} Inspect approximation error and profile the exported graph.

Suppose an illustrative hot layer maps 1,024 inputs to 1,024 outputs and is approximated at rank 128, ignoring bias. The full matrix contains 1,024 × 1,024 = 1,048,576 weights. Its two factors contain 1,024 × 128 + 128 × 1,024 = 262,144 weights. For one input vector, dense multiply-accumulate counts have the same fourfold ratio. The bar labels compare these layer-level weight counts. Prototype the replacement, then keep it only if the exported pair improves the relevant device metric and passes the quality gate.

::fig[factorized-layer-weight-count]

The smaller bar represents thinner dense matrices, not merely zeros placed in the original matrix. Assuming scattered pruning produces the same dense-kernel saving could prompt an ineffective deployment. Inspect the exported tensor shapes and runtime trace: unchanged dimensions and similar kernel time indicate that ordinary dense execution has little work to skip. Try structural pruning or a supported sparse path, and verify the resulting quality and device performance.

### Train a smaller graph or vary work by input

When modifying an existing graph offers too little room, train a model designed around the target device. Distillation helps a compact student learn from the distribution of predictions made by a larger teacher, which conveys information about plausible alternatives to the labeled answer. A hardware-aware architecture uses operators and tensor shapes the target executes efficiently. Neural architecture search can explore those choices systematically. Adaptive computation tackles a different opportunity by giving easy inputs a short path and reserving deeper computation for inputs that need it.

A student processes each frame through its own graph; the teacher supplies training targets but need not run on the device. Select operators, channel widths and input resolution against the device’s latency and activation-memory limits, while holding the task and evaluation workload fixed. A search can use latency estimates to screen a bounded set of designs, then benchmark exported finalists: ==estimated latency is a filter=={Only measurements of the deployed graph establish whether a candidate meets the device budget.}

An early-exit policy instead routes each frame within a graph. Its confidence threshold trades the fraction returned early against the quality of those returned predictions; calibrate it on representative inputs and evaluate that subset separately.

For an illustrative camera workload, suppose 80% of frames finish in 6 ms and the remaining 20% take 14 ms, with routing included. The mean is 0.8 × 6 + 0.2 × 14 = 7.6 ms. At the 95th percentile, the 6 ms group has covered only 80% of frames, so the latency is 14 ms. Reject the candidate against a 12 ms 95th-percentile limit before assessing prediction quality.

::fig[early-exit-decision]

In the flow, the confidence check sends a frame either to a returned prediction or through the remaining layers. A lower mean can obscure deadline violations on the latter route, leading an engineer to approve the model too early. Record exit rates and per-frame latency under representative traffic; test clustered difficult inputs and batches whose paths diverge. If the tail misses its limit, revise the policy or graph and remeasure. Once the execution path is viable, precision offers another way to reduce its resource use.

### Choose a precision the device can use

Quantization maps weights or activations to a smaller set of representable values. FP32 to INT8 divides the raw bytes per converted value by four. The total memory and traffic also include scales, packing, and tensors left at higher precision. Lower precision can help a bandwidth-limited stage by reducing bytes moved, often reducing off-chip transfer energy as well. For a compute-limited stage, speed depends on whether the target can execute the chosen format efficiently at the workload's shapes and batch size.

Follow a weight block from memory into a kernel. A packed integer representation can reduce bytes crossing the bus, but an expansion to a wider temporary buffer adds traffic and conversion work. Inspect the accumulator type and floating-point fallbacks as well as the stored format. ==Packing must survive the path=={A small file alone does not establish that the deployed kernel moves fewer bytes.}

For floating point, exponent bits govern range and significand bits govern precision. For integers, the scale sets the spacing between codes and, with the available codes, their range. Check whether outliers clip and whether small values round away before accepting the format.

Use illustrative inputs for one weight read: 16 MiB of FP16 weights and a sustained 800 MiB/s transfer rate give 16 ÷ 800 = 0.020 s, or 20 ms. INT8 halves the raw payload to 8 MiB; adding 1 MiB of scales and metadata gives 9 ÷ 800 = 0.01125 s, or 11.25 ms. The bars label these two read-only estimates in milliseconds. Their difference is 8.75 ms. Prototype the conversion if the baseline trace places those reads on the critical path, then measure conversion and scheduling costs.

::fig[estimated-weight-transfer-time]

The shorter INT8 bar accounts for metadata but excludes execution and conversion. Treating its difference as an end-to-end speedup could justify a deployment that gains little. Profile the exported kernel for expanded buffers, fallbacks and time spent waiting for memory; if those costs dominate, choose a supported path or revisit the format. Next, test whether the chosen range preserves the model’s output quality.

### Manage quantization error

Post-training quantization usually offers the quickest trial. It chooses scales after training, using representative data when activation ranges must be estimated. Wider ranges preserve large values but increase the spacing between representable values, so ordinary inputs can lose detail. When calibration and selective precision leave unacceptable errors, quantization-aware training simulates quantization during training so the model can adapt. Very low bit widths magnify the quality trade-off and require an execution path that makes the representation worthwhile.

Calibration spends the available integer codes across the activation values seen under intended operating conditions. For each sensor event, the quantizer maps an activation to a nearby code and the runtime reconstructs an approximate value; values outside the chosen range clip at its boundary. Hold the model and bit width fixed while comparing ranges, then inspect clipping and rounding error by tensor or channel. Per-channel weight scales can give channels with different ranges appropriate resolution. A sensitive operator can retain higher precision if the target kernels support it.

Quantization-aware training changes the model by exposing it to simulated quantization errors during training. Check that the exported graph reproduces the numeric behavior evaluated there. At the extreme, sign-encoded binary weights and activations can replace scalar multiplication with XNOR, but ==packing and kernels matter=={A binary representation only saves execution work if the runtime can use it efficiently.}

For an illustrative sensor activation, use symmetric INT8 codes from −127 to 127. A magnitude limit of 2 gives a step of 2 ÷ 127, or about 0.0157; an activation of 5 clips to 2. A limit of 5 preserves that activation but increases the step to about 0.0394. Calibrate using representative events, then evaluate both exports on separate held-out quiet and loud events. If neither meets detection quality on a deployment slice, test higher precision for the operation or quantization-aware training.

::fig[quantization-quality-loop]

The loop directs attention from calibration through export, held-out evaluation, failure inspection and adjustment. Choosing the wider range solely because it clips fewer values may sacrifice distinctions among common quiet events. Compare slice-level detection errors and tensor clipping and rounding statistics; if quiet-event quality fails, revise the scale or retain precision and repeat the loop. Next, check whether the runtime actually exploits the accepted representation.

### Make the runtime realize the savings

The compiler and runtime determine how much of a compressed model's theoretical gain reaches the device. Operator fusion can keep intermediate values in registers or on-chip memory and avoid some launches. In a convolution, batch normalization, and activation chain, inference-time batch normalization can often be folded into the convolution and the activation applied in the same kernel. Sparse execution likewise requires a matching representation and kernel. A dense kernel still reads and processes stored zeros.

A compressed tensor saves device resources only through the operations the runtime selects. Follow a convolution output: separate kernels may write it to global memory, read it for batch normalization, write that result, and read it again for activation. Folding inference-time normalization into the convolution and fusing the activation can keep intermediates on-chip. After pruning fixes the surviving channels, fold normalization before calibrating the folded weights.

Inspect the lowered graph and device timeline for conversions, intermediate writes and device-to-host copies. A quantized kernel may unpack tiles inside its compute loop instead of materializing a full wider tensor. For sparse weights, ==zeros need a compatible kernel=={A dense kernel still processes stored zeros even when the checkpoint contains many of them.} A supported 2:4 layout, for example, limits each relevant group of four entries to two nonzeros. Compare its mask, alignment and packing costs with the dense path.

Suppose each operation in an illustrative three-operation chain reads a 4 MiB tensor and writes a 4 MiB tensor to global memory. The three separate kernels move 3 × (4 + 4) = 24 MiB. If one fused kernel reads the input once, keeps both intermediates on-chip and writes the final output once, it moves 4 + 4 = 8 MiB. Both counts exclude weights. The bar lengths show how much traffic each execution path would generate under these assumptions.

::fig[fusion-activation-traffic]

The 16 MiB gap is a traffic opportunity, not a guaranteed latency reduction: tiling or spills can change actual transfers. If intermediate traffic is on the critical path, test fusion and compare device traffic and latency. Likewise, a zero-heavy checkpoint alone does not justify choosing sparse execution. Inspect the exported layout and selected kernel, then benchmark a supported sparse path against dense execution on the target shapes. These measurements feed the comparison of feasible candidates.

### Sequence changes and compare feasible candidates

Pick the first change by matching it to the violated budget and its cause. Smaller resident weights can address capacity or weight traffic. Channel pruning or a smaller student can address expensive dense layers when the target executes the resized graph efficiently. Fusion can address an expensive chain of intermediate transfers. Compare candidates on measured quality and system costs. A candidate is dominated when another matches or improves every relevant metric and does strictly better on at least one. The remaining trade-offs belong on the accuracy-efficiency frontier.

A structural edit changes the tensors that later quantization will represent. Prune channels or train a student, recover quality with fine-tuning, then fold batch normalization if the deployment toolchain requires it and fit numeric ranges on that settled graph. ==Calibration follows the final distributions=={A later change to weights or activations can make previously fitted ranges unsuitable.} Compile the candidate and inspect its kernels, conversions, and fallbacks; fewer stored values do not by themselves guarantee less execution time. Save each candidate and its profile so the next decision uses the current bottleneck.

For an illustrative 40 MiB FP32 weight payload, removing half the weights and storing the survivors at 8 rather than 32 bits gives 40 × 0.5 × 8 ÷ 32 = 5 MiB, before sparse metadata and quantization scales. Separately, suppose a 100 ms run spends 40 ms in the affected stage and 60 ms elsewhere. An eightfold improvement to that stage leaves 40 ÷ 8 + 60 = 65 ms. The hypothetical result misses a 60 ms deadline, so inspect and change work outside that stage too.

::fig[compression-candidate-sequence]

Read the flow from locating the limit through setting structure, fitting ranges, compiling, and comparing candidates. Multiplying isolated speedups across the whole run would incorrectly predict that the deadline is met, while calibrating before pruning risks stale ranges. Compare stage traces and quality before and after compilation; unexpected fallback, conversion time, or a quality drop calls for investigating the artifact and recalibrating or retraining as needed. The surviving candidate still needs an end-to-end acceptance test.

### Run an end-to-end acceptance test

Test the artifact that will ship against the baseline under equivalent workload and device conditions. Evaluate three dimensions together. The data must represent the production distribution and important user slices. The algorithm must preserve task performance and any confidence behavior the application relies on. The machine must stay within its storage, peak memory, latency, throughput, and energy budgets. Define the limits before comparing candidates, and collect enough observations to tell whether a narrow margin is repeatable.

Run each held-out input through the same preprocessing, exported model, and postprocessing used in production. Keep the cases, device conditions, batch size, and concurrency comparable between baseline and candidate. Record median and tail latency, peak runtime memory, energy, and sustained behavior long enough to expose thermal throttling; measure cold start when users experience it. ==A pass belongs to a specific artifact=={Changing the export, runtime, or device configuration can invalidate the measurements used for release.} Check confidence calibration separately when decisions depend on predicted probabilities.

Suppose a camera release requires at most 48 MiB peak memory and 12 ms at the 95th percentile, plus at least 92% low-light recall. These inputs are illustrative. Candidate A uses 44 MiB and takes 10 ms but reaches only 89% recall; candidate B uses 47 MiB, takes 11 ms, and reaches 93% recall. Compare each number with its own limit: A fails its quality gate, while B passes all three. Release B only if it also meets every other gate and repeated trials support the margins.

::fig[deployment-acceptance-test]

The flow puts gate definition before the full workload and requires every threshold to pass before release. If aggregate accuracy conceals A's low-light loss, selecting the faster candidate would expose those users to missed detections. Report recall on the same held-out low-light cases for both models and repeat the device measurements; investigate the failing slice or revise the candidate before testing again. Record the artifact and environment so a failed gate can be traced to a reproducible cause.

### Trace a failed gate to its cause

A failed end-to-end test identifies a symptom. Align a candidate's device timeline with its graph to locate unexpected costs, and compare its outputs with the baseline on the same inputs to locate the first substantial error. A layer with few arithmetic operations can dominate runtime because it repeatedly streams a large activation. A quality drop can come from a saturated channel, pruning that removes a useful feature, or confidence scores that drift. Use a targeted intervention to test the suspected cause before changing the rest of the model.

Follow an activation through the exported graph while inspecting the device timeline. Kernel names and operator boundaries reveal whether it stays in INT8 or is converted for a floating-point fallback. Memory traffic counters and intermediate allocation sizes distinguish a tensor-copy bottleneck from expensive arithmetic; many short kernels can instead indicate launch overhead. ==A cheap operator can hold the critical path=={Low arithmetic cost does not prevent an operator from consuming time through data movement or launches.}

For a quality failure, compare baseline and candidate tensors on the same inputs. Plot error and saturation by tensor and input slice to find where divergence begins. For pruning, compare the mask with activation traces and test restoring a suspect channel; a filter's appearance alone does not establish its contribution.

Consider an illustrative INT8 artifact that takes 13 ms against an 11 ms deadline. Its trace attributes 4 ms to a block that falls back to floating point, including surrounding conversions. Change only that block to a supported lowering, holding the workload and rest of the graph fixed. If the block takes 1.5 ms on rerun and everything else stays steady, the predicted total is 13 − 4 + 1.5 = 10.5 ms. A measured 10.5 ms supports the fallback diagnosis. Recheck quality on the revised artifact and repeat the sustained run before accepting it.

::fig[failed-gate-diagnostic-loop]

The loop moves from reproducing the missed deadline to locating the fallback, changing it and repeating acceptance. Optimizing the largest layer by parameter count could leave that fallback untouched and waste effort. A timeline containing floating-point kernels bracketed by conversions is a testable symptom; replace the lowering and check whether both block and end-to-end time fall as predicted. If they do, proceed to the remaining quality and sustained-operation gates.

## The physics

| Quantity | Value | Use |
| --- | --- | --- |
| Peak resident memory | Maximum over time of the sum of simultaneous resident allocations, in bytes | Compare the measured peak with the capacity available to those allocations. |
| Factorized linear-layer weight count | r × (m + n) weights, excluding bias, for an m-input, n-output layer of rank r | Compare with m × n to estimate parameter and per-vector dense multiply-accumulate savings. |
| Mean latency for two execution paths | p × early-path latency + (1 − p) × full-path latency, where p is the early-exit fraction | Estimate the mean when path fractions and per-path timings are representative. |
| Transfer time | bytes transferred ÷ sustained bandwidth; use matching byte units | Estimate the time for a specified transfer before conversion and scheduling costs. |
| Symmetric quantization step | Magnitude limit ÷ 127 for signed codes −127 through 127 | Compare resolution when choosing an activation range. |
| Idealized global-memory traffic | Separate chain: 3 × (4 + 4) = 24 MiB; fused chain: 4 + 4 = 8 MiB, excluding weights | Estimate avoidable intermediate traffic under the stated buffer assumptions. |
| Total latency after accelerating one stage | Tnew = Taffected / speedup + Tother, assuming all other time is unchanged | Bound the end-to-end benefit of a local optimization. |
| Recall | True positives ÷ (true positives + false negatives), for a specified set of cases | Measure the fraction of relevant cases detected within a required slice. |
| End-to-end latency after an isolated block change | T_new = T_old − T_block,old + T_block,new, assuming all other path times remain fixed | Predict the full-path change and compare it with the measured rerun. |

## Glossary

- **Deployment budget**: Limits on the storage, working memory, timing, throughput, and energy available to an inference workload.
- **Resident footprint**: Bytes held in memory at the same time by live weights, activations, runtime buffers, and other state.
- **Activation**: A value or tensor produced by a model operation and used by another operation or returned as output.
- **Critical path**: The chain of dependent work that determines elapsed time for a result.
- **Structured pruning**: Removing groups such as channels or blocks to produce smaller tensors or a supported sparse layout.
- **Low-rank factorization**: Approximating a large weight matrix by multiplying smaller matrices through a lower-dimensional intermediate.
- **Knowledge distillation**: Training a student model with predictions or other signals from a trained teacher model.
- **Neural architecture search**: Using an automated search procedure to choose a model structure within a defined space of candidates.
- **Quantization**: Mapping values to a discrete representation with fewer levels, commonly using a scale and sometimes a zero point.
- **Quantization-aware training**: Training or fine-tuning with simulated quantization so the model can adapt to rounding and clipping.
- **Operator fusion**: Executing compatible operations together so intermediate values can remain local and fewer kernels may be launched.
- **Sparse execution**: Computing from a sparse layout with kernels that skip zero-valued work or avoid storing the corresponding entries.
- **Accuracy-efficiency frontier**: The measured candidates for which improving quality or one system cost requires accepting a worse result on another metric.
- **Confidence calibration**: The degree to which predicted confidence matches observed correctness across groups of predictions.

## → Ben's world

- Decide whether compressing weights alone can fit a model into an embedded device by checking artifact storage and peak working memory separately.
- Select camera model widths using measured batch-one latency and tile utilization, then verify that the chosen width preserves recall under low light and motion.
- Choose between weight quantization, kernel fusion, and a smaller graph for a decoder by profiling weight reads, cache growth, conversions, and sustained token latency at realistic context lengths.
- Build a release comparison that records the exact artifact, quality by slice, peak residency, latency percentiles, throughput, and energy per result under the same workload.

## Open questions

- Which allocations coexist at the actual memory peak on the constrained device, and how do input size and execution path change their lifetimes?
- At what batch sizes or context lengths does the target workload shift between limits imposed by data movement and arithmetic?
- Which layers and input slices account for quality loss after combined structural compression and quantization, and how much quality can selective precision recover?
- How do early-exit rates, tail latency, and prediction quality change during bursts of difficult inputs or after sustained operation heats the device?
- What measured sparsity and tensor shapes make the target's sparse kernels faster than dense kernels after metadata and packing costs are included?
