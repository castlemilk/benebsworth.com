---
openingQuestion: "Which compression change will make this model fit and run well on its target device while preserving the quality users need?"
---

# Model Compression: Study Packet

*Based on [Machine Learning Systems](https://github.com/harvard-edge/cs249r_book/blob/de87c0103806d7bfb1c677dbb77a2b92fa00c298/books/vol1/10_model_compression/10_model_compression.qmd) by Vijay Janapa Reddi and contributors (CC BY-NC-SA 4.0).*

## Thesis

Which compression change will make this model fit and run well on its target device while preserving the quality users need? Start with one result the device must deliver, such as a sorting decision before a parcel reaches a diverter. Measure where the current pipeline exceeds its budget. A smaller weight representation can relieve memory pressure, a narrower network can remove arithmetic, and a fused kernel can avoid moving an intermediate tensor. Each change makes a different prediction about what the device will do. Choose the change that addresses the measured limit, then test that prediction and the quality of the decision together on the exported model.

## Guided notes

### Find what holds up one decision

A parcel sorter has until the parcel reaches the diverter to turn a camera exposure into a routing decision. That interval gives latency a concrete meaning. Start the timer at capture and stop it when the decision is available to the controller. Within that interval, use a device trace to locate waits, transfers and kernels on the critical path. A convolution can spend its time performing arithmetic, while a relatively simple normalization can spend its time reading and writing an entire feature map. Reducing either operator's cost matters to the deadline only to the extent that it advances the final decision.

Fix the batch size and image resolution, then replay the arrival pattern the sorter must handle. Keep the capture timestamp attached to each frame as it moves through the queue. A burst can leave a frame waiting behind its neighbors even when its own inference takes the usual time. Run long enough to capture the clock speeds the device sustains over a shift. A short run from cold can miss delays that appear once the device heats up.

Pick a late command and trace backward from delivery. If a transfer overlaps a kernel, only its ==exposed delay=={Shortening a transfer advances its consumer only until another required input becomes the last to arrive.} can move that consumer earlier. For a kernel on this path, compare arithmetic-unit utilization with bytes transferred per second. A convolution that keeps the arithmetic units busy is a candidate for reducing operations. A normalization that approaches sustainable memory bandwidth while those units sit mostly idle calls for reducing tensor traffic. Gaps between short kernels warrant checking dispatch overhead.

Suppose, illustratively, that one frame encounters no queue and all three stages run in sequence. Preparation finishes 7 ms after capture, inference finishes at 7 + 15 = 22 ms, and command delivery finishes at 24 ms. Against a 20 ms deadline, halving the 2 ms delivery stage still leaves the command 3 ms late. Holding preparation and delivery fixed leaves 20 − 7 − 2 = 11 ms for inference. Use the trace to look for 4 ms recoverable there, then replay arrivals to see whether the modified path meets the deadline.

::fig[trace-a-routing-decision]

Read the four steps from left to right. The deadline sets the timer endpoints, the replay supplies the workload, and the last two steps connect a delay to its cause. Ranking layers by multiply-accumulates alone could send an engineer to a convolution while a feature-map pass holds up delivery. If the trace implicates that pass, try a fused kernel and check whether both transferred bytes and command latency fall. For cloud serving, run the comparison at the required tail latency and compare throughput per dollar. On a microcontroller, first check that the artifact fits storage and that peak live allocations fit working memory.

### Count the entire resident footprint

Memory capacity limits allocations that must coexist. Weights hold learned coefficients, while activations hold values produced for the current input. Compressing weights changes only one term if the runtime keeps the same activations live. For a first deployment-budget calculation, specify the memory pool, the allocations charged to it and the instant at which they coexist. Add their resident sizes and compare the sum with the capacity assigned to that pool. A model file answers a different accounting question because the runtime can unpack it or allocate temporary storage during execution.

Follow a feature map from its producer to its last reader. If a convolution writes an output while its input is still live, count space for both at that instant. Once the last reader finishes, the allocator can give the input's space to a later tensor that fits. Draw each allocation as an interval and add the bytes along a vertical slice through those intervals. The largest sum gives the ==peak live bytes=={An allocator can reserve more memory than its live tensors occupy.} for the pool under examination.

Use the same units throughout. One MiB is 1,048,576 bytes. Placement matters on a microcontroller that reads weights directly from flash. Charge the stored weights to flash and the live feature maps to SRAM. If the runtime copies weights into SRAM during initialization, include that copy for its actual lifetime.

Consider an illustrative 48 MiB pool assigned to simultaneous weights and activations. Exclude all other allocations for this calculation. The original 24 MiB of weights coexist with 36 MiB of activations, giving 60 MiB and a 12 MiB shortfall. Reducing resident weights to 8 MiB leaves the activation allocation intact. The candidate therefore uses 8 + 36 = 44 MiB, which passes this tensor budget with 4 MiB to spare.

::fig[resident-footprint-versus-capacity]

Compare each footprint bar with the 48 MiB capacity bar. The 16 MiB drop between footprints accounts for every weight byte saved. Dividing the original 60 MiB by three would also shrink the activation allocation on paper and could lead to approving a device with too little memory. Trace initialization and steady-state inference at each supported input size. If the observed high-water mark exceeds the estimate, inspect allocator reservations and the scratch space requested by the kernel running at the peak. Recheck fit with those bytes included, then test latency and predictive quality separately.

### Remove work the device can actually skip

A structural change pays off when it removes useful amounts of scheduled work at an acceptable quality cost. Pruning an output channel from a convolution removes a filter, a feature map and the corresponding input slice from consumers that can accept the narrower shape. Pruning individual coefficients produces a different opportunity. Their positions must be encoded and a kernel must exploit them to skip work. Low-rank factorization offers a third route when many outputs depend on the same few combinations of inputs. Two smaller dense maps can then approximate one large map using regular operations already available on the device.

Start with a convolution that the device spends appreciable time running. Rank its output channels by the sum of their absolute filter weights, or record how strongly each channel activates on representative parcels. Either ranking suggests a cut to try. A channel that rarely activates across the stream may still matter every time a particular destination appears. Remove a small group, keep the surviving channels in the same order throughout the graph, then fine-tune and check routing errors by destination. Trace each removed channel through every branch. At a residual addition, both operands must agree on which channels occupy the surviving positions. Matching widths alone can leave unrelated features being added together.

Choose the size of the cut with the compiled kernel in view. For an illustrative kernel that schedules output channels in tiles of 16, widths of 64 and 60 both occupy four tiles. A width of 48 occupies three. Crossing a ==tile boundary=={A smaller logical width can occupy the same number of scheduled tiles until an entire tile disappears.} can therefore change the work scheduled for each output location while the image size stays fixed. Removing a whole stage goes further by eliminating its operations, but the remaining stages must learn to compensate for the lost transformation.

Consider a bias-free projection in the sorter with 256 inputs and 128 outputs. Assume these dimensions and the proposed rank are illustrative. The dense bar counts one coefficient for every input-output pair, or 256 × 128 = 32,768. To read the rank-32 bar, follow one input vector through two linear maps. The first forms 32 intermediate values using 256 × 32 = 8,192 coefficients. The second mixes those values into the original 128 outputs using 32 × 128 = 4,096 more. Together they retain 12,288 coefficients, or 37.5% of the original count.

At equal weight precision that saves storage for 20,480 coefficients while preserving the consumer's input width. Check the approximation on held-out parcel images, including cases where the two most likely destinations score nearly alike. If routing quality holds, time both exports at batch one. The factorized path may write and reread 32 intermediate values and incur a second kernel launch. Use the measured decision time to decide whether the storage saving also helps meet the deadline.

::fig[projection-coefficient-count]

Both bars count coefficients in the exported projections. A filter mask can produce many zeros while leaving the dense bar at its original height. If a pruning run reports fewer active weights but device time stays flat, inspect the producer's output shape, each consumer's input shape and the kernel selected at export. Rebuild compatible narrower tensors if the mask left the shapes intact. If the shapes contracted, check tile counts before cutting more channels. When several such cuts cost too much routing accuracy, a student designed around supported widths offers another way to change the schedule.

### Choose a smaller network and decide when it should run

Sometimes the expensive part is the architecture itself. A compact student can learn from both task labels and a larger teacher's output distribution. For a damaged label, the teacher's relative scores for two plausible destinations convey information that a single destination label omits. Distillation makes that training signal available to a student whose widths, operators and activation sizes suit the device. A further design choice is whether every parcel needs the full student. An early exit can finish easy inputs cheaply if its confidence predicts correctness and enough inputs take the shortcut to repay the cost of checking.

Use the stage timings to bound the architecture search. Try widths, depths and operators for which the runtime has kernels, and keep candidates within the device's memory budget. Include input resolution as a choice. A smaller crop can cut feature-map traffic at several stages, yet two destination codes may become indistinguishable once the camera's finest lettering has been resampled. Score that pair during the search. Use a latency estimator to narrow the candidates, then time the promising exports on the device. An unfamiliar width can select a different kernel and reverse the estimated ordering.

For each training image, divide the teacher's logits by a temperature greater than one before computing probabilities. This leaves more probability on alternative destinations. Train the student to match those softened probabilities at the same temperature, and score its ordinary predictions against the known labels. The teacher can generate targets ahead of time. At deployment an intermediate head reads the student's own features and either returns a destination or passes the parcel to the remaining stages. Every parcel pays for that check. The ==exit threshold=={Changing the threshold changes which parcels contribute to the early path's error rate.} controls both the frequency of the shortcut and the evidence needed to trust it.

Consider an illustrative acceptance test in which at most 1% of creased labels may be misrouted. Fit the threshold on held-out labels, then freeze it. Replay the same clean and creased batches through the fixed-depth export and the adaptive export. Record the exit choice, destination and elapsed decision time per parcel. Suppose 50 of 100 creased labels exit early and two of those go to the wrong destination. Even with every full-path decision correct, the adaptive export misses the limit. Its early-exit error rate is 2/50, and its error rate across creased labels is 2/100. Retain the fixed-depth student if it meets the quality and timing budgets, even if clean parcels give the adaptive export a lower average time.

::fig[qualify-an-early-exit]

The replay and difficult-run steps answer different questions. Per-parcel records reveal whether confidence predicts correctness. Preserving arrival times during a run of damaged labels reveals whether full-path decisions, each carrying the routing overhead, make the queue grow. Test the exported student with the teacher offline. Adding the teacher to replay would charge every parcel for a training signal the student already learned and could lead to rejecting a feasible design. Once the architecture and exit policy are settled, use their actual activation distributions to evaluate lower precision.

### Spend precision where errors change decisions

Quantization represents a tensor using a limited set of values. With uniform integer quantization, a scale sets the distance between adjacent representable values and a zero point locates real zero on the integer grid. A wide range can preserve outliers while rounding distinct small signals to the same value. A narrow range can resolve those signals while clipping large ones. Floating-point formats use exponent bits to span magnitudes and fraction bits to distinguish nearby values. The choice therefore depends on the tensor's distribution, the decisions that depend on it and the formats the target can execute efficiently.

Start post-training quantization with the trained weights fixed. Run calibration images through the inference graph and collect activation ranges at the tensors the exporter will quantize. Include parcels whose destinations differ by a faint stroke, as well as images with glare that produces large responses. If one channel has a large peak, a shared scale that accommodates it spends integer codes on magnitudes that a neighboring channel never reaches. Where the target operator supports per-channel activation scales, the exporter can give the quieter channel a finer grid while keeping both channels at eight bits. Check support for the particular tensor. A kernel that accepts per-channel weight scales can still require a single activation scale.

If the export misses its quality target, replay the same failing images through both models. Compare reconstructed activations at successive operators and trace where a difference becomes large enough to change the winning destination. Restoring a suspect operator to higher precision and repeating the comparison tests its contribution. Inspect each ==precision boundary=={An extra conversion can require a full tensor read and write even when only one operator needs higher precision.} in the resulting device trace. If rounding and clipping affect several layers, quantization-aware training lets the optimizer adjust weights while simulated quantizers expose those errors during training. Export the result and repeat the decision test.

Account separately for bytes and execution time. Each FP32 weight occupies four bytes and each INT8 weight occupies one, before scale metadata and alignment. Reading fewer bytes can shorten a bandwidth-limited operation and save energy on data movement. Compute time depends on which kernel consumes those bytes. At the binary extreme, a specialized kernel can compare packed signs from two vectors a word at a time. For entries restricted to −1 and +1, each matching pair contributes +1 to a dot product and each mismatch contributes −1. Counting matching bits supplies the sum once the vector length is known. Include packing costs in the timing and test whether discarding magnitude preserves the decisions.

Consider two illustrative label-image channels with a shared scale of 0.1 activation units per code, zero point 0 and nearest rounding. A faint stroke produces 0.04 units in the quieter channel. Dividing by 0.1 gives 0.4, which rounds to code 0 and reconstructs as 0. An absent stroke with value 0 gets the same code. Assume the runtime supports a scale of 0.02 for this channel. The same division now gives code 2, which reconstructs as 2 × 0.02 = 0.04 units. Keep the wider channel's scale fixed and test this export. The calculation establishes that the stroke survives encoding. Adoption also requires checking the quieter channel's peaks for clipping and comparing routing decisions on held-out images.

::fig[follow-a-quantized-feature]

“Observe the range” and “Trace the decision” use different images for different purposes. Calibration on clear labels alone can yield a grid that looks adequate until glare drives responses to the end codes. Low contrast can instead push two distinguishable responses into the same interior bin. For parcels whose route changes after export, inspect both end-code counts and the codes assigned to the distinguishing stroke. Use those observations to revise calibration coverage or scale granularity, then verify quality and trace the cost of the chosen representation on the device.

### Follow compressed values through the runtime

The runtime determines where compressed values travel and what arithmetic consumes them. A kernel can read packed weights, unpack a small tile close to the arithmetic unit and immediately use it. Expanding the whole tensor into global memory first introduces a write and another read. Fusion applies the same principle to intermediate results. For an inference convolution followed by batch normalization and an activation, a compiler can fold fixed normalization parameters into the convolution and apply the activation before writing the output. This removes launches and intermediate transfers where the shapes, precision and operator semantics permit it.

Pick one camera frame and follow its activation tensor through the lowered graph, where each operation has a device assignment and a concrete layout. A convolution may leave its output in accelerator memory with channels arranged in blocks. If the next operator runs only on the CPU, the runtime may have to reorder the tensor, make it available to the CPU and wait for completion before launching the next accelerator kernel. On a device with separate memories, that detour can include a copy in each direction. Look for those dependencies on the frame's timeline. A short CPU kernel can hold up the frame for much longer than its arithmetic takes.

Apply the same reasoning to sparse weights. An irregular sparse representation carries positions alongside surviving values. A kernel must decode those positions to fetch the corresponding input elements. A patterned kernel can exploit a ==local sparsity requirement=={Eligibility can depend on the arrangement of weights within every group along the kernel's reduction dimension.} as well as constraints on tensor dimensions. Inspect the exported layout and the selected kernel at the deployed shape. A high overall zero count can coexist with a dense launch that executes all the multiplies.

Suppose an illustrative sorter trace contains a quantized convolution, dequantization, floating-point batch normalization, requantization and an activation. The normalization uses frozen inference statistics. For one output channel, write the convolution as y = Wx + b and the frozen normalization as ay + c, where a and c are constants for that channel. Substitution gives (aW)x + (ab + c). Apply that transformation to each channel before quantization. Calibrate the folded graph, compile it with the activation and replay the same frames at the production batch size and image dimensions. Check whether the conversion launches disappear and whether the activation runs before the convolution output leaves the kernel. Prefer the candidate if routing quality passes and timing confirms a saving on the frame's critical path.

::fig[inspect-a-fused-block]

The first two steps establish why folding preserves the floating-point computation. The third matters because multiplying each filter by its own constant changes the range the quantizer must encode. The last step checks what actually ran. If conversions disappear but frame latency stays flat, inspect the timeline for a wait elsewhere before crediting fusion with a deadline improvement. Use the same test for two matrices with equal zero fractions. If only one selects the sparse kernel, inspect grouping and dimensions before choosing a pruning pattern. Fix the surviving channels and fold their normalization constants before collecting ranges for the final export.

### Sequence changes around what calibration assumes

Compression techniques interact through the tensors they change. Channel pruning changes the inputs received by downstream layers. Fine-tuning or distillation changes the surviving weights and can shift activation ranges again. Integer scales fitted to an earlier graph can therefore clip the final model even if each change passed in isolation. For a pruned student using post-training quantization, settle the topology, recover task quality, finalize inference transformations that alter ranges and then calibrate. Keep intermediate candidates so a regression can be traced to a particular change or combination.

Trace a parcel image through the slowest convolution. If the device repeatedly fetches the same filters from memory and its arithmetic units wait for those reads, try a supported compact weight format at the current channel width. If dense multiply-accumulates occupy the units throughout the layer, compare widths that fill whole kernel tiles. Removing a few channels can leave the kernel executing the same number of tiles with the last one partly empty. After a material gain, profile the whole graph again. The next delay may be a tensor transfer between operators.

Training code can use a teacher’s outputs to adjust the surviving weights or simulate integer rounding during recovery. The deployment compiler chooses the kernels that execute those operations. For post-training quantization, treat the scales as ==part of the checkpoint’s export=={Reusing scales after a range-changing edit can map distinct responses to the same limiting integer.} Save the checkpoint, preprocessing, calibration input list, scales and compiler settings together so another engineer can reconstruct the comparison.

Consider an illustrative sorter for which the recovered floating-point pruned model and an INT8 export of the original network each pass the damaged-label test. A pruned INT8 build using the original activation ranges fails. Keep the recovered weights fixed, fold batch normalization for inference, and verify the folded floating-point export on the same label images. Fit fresh scales on a separate representative calibration set. Then replay the label test through the freshly calibrated export and its floating-point counterpart with identical preprocessing.

Suppose several misroutes persist. At one convolution, distinct floating-point responses to broken strokes all exceed the upper endpoint in the integer export. Try a supported wider precision at that layer. Keep the candidate if it restores the required decisions and still meets the device limits after accounting for conversions at both ends of the layer.

::fig[sequence-a-pruned-student]

Read the flow from left to right when tracing the failure. The recovered checkpoint tells you whether the narrow model could distinguish the damaged labels before rounding. The calibration step tests the ranges of that particular model. Adding the losses from two independent trials skips that dependency and could lead you to discard a usable channel width. Record quality and device cost for each export, then remove candidates that miss a hard limit. Among the survivors, one candidate dominates another when it does at least as well on every chosen objective and better on one. Take the remaining trade-offs into a production-shaped replay.

### Accept the model on a full production-shaped run

The acceptance test asks whether the delivered system makes a good enough decision in time under the conditions users encounter. Run the baseline and exported candidate on the target with the same preprocessing, input mix, arrival pattern and output handling. Record artifact size, peak resident memory, latency distribution, sustained throughput and energy per completed decision. Pair these measurements with task quality and confidence calibration on consequential slices. A candidate qualifies when the same deployed configuration meets all required limits. Results drawn from different batch sizes, devices or precision settings cannot establish that joint outcome.

Follow one scan from the camera timestamp to the command issued at the diverter. Keep its input identifier alongside the predicted destination, confidence, final command and known destination. A low-confidence read may send the parcel to inspection. A confidently wrong read sends it down the wrong chute. Set limits for both outcomes before the replay, and tag scans by lighting and label condition. Within a confidence band, compare predicted confidence with the fraction of predictions that were correct. A change in confidence can move parcels across the inspection threshold even when their highest-scoring destinations stay the same.

Time cold initialization separately, then replay arrivals long enough for the device to reach its sustained operating temperature. Keep queueing time in the capture-to-command interval. Repeat the replay and report variation across trials so a short run at a high clock rate cannot stand in for an entire shift. For energy, use ==one accounting interval=={Energy and completed decisions must cover the same time window for their ratio to describe that workload.} State which components the meter covers, integrate their power over the interval and count the decisions completed within it.

For an illustrative acceptance trial, set the capture-to-command p99 limit at 20 ms and the damaged-label misroute limit at 1% of all damaged-label cases. Replay the baseline and candidate with the production inspection threshold. Suppose the candidate’s p99 across the replay is 18 ms. That clears the timing limit by 2 ms. Now select the 1,000 damaged-label records and count commands that sent a parcel to an incorrect destination. With 18 such commands the observed rate is 18 / 1,000 = 1.8%. The contract allows at most 10 in this sample. Withhold acceptance and retain the identifiers of the 18 parcels for paired inspection.

::fig[accept-a-sorter-release]

At “Check every limit,” the two results come from the same replay but use different populations. Averaging the damaged labels into a much larger set of clean scans could leave rounded accuracy unchanged and conceal the failed check. Start with parcels the baseline handled correctly. Compare floating-point and dequantized activations for values pinned to an endpoint. If the error already appears in the floating-point pruned model, inspect whether a removed channel responded to the damaged strokes. For a timing failure, align the slow scan’s timestamps with fallback kernels and device transfers. Use the observed divergence to choose the next change, then repeat the contract. Keep the artifact identifier, runtime version, device settings and replay description with the results so a compiler update can be evaluated under the same conditions.

## The physics

| Quantity | Value | Use |
| --- | --- | --- |
| Inference time budget | 20 ms − 7 ms − 2 ms = 11 ms for serial stages with no queue | Subtract the fixed time on either side of inference from the capture-to-command deadline. |
| Peak live tensor footprint in one pool | Maximum over time of the sum of simultaneously live tensor storage, counting shared bytes once, in MiB | Compare the peak with the capacity assigned to tensors in that pool. |
| Weight storage for a factorized projection | br(n + m) bytes for two dense factors versus bmn bytes for one dense map | For n inputs, m outputs, rank r and b bytes per coefficient, compare bias-free weight payloads before padding or metadata. |
| Mean device service time per parcel | p × t_early + (1 − p) × t_full, in milliseconds per parcel | Weight each path's mean service time, including the routing check, by its observed frequency. Here p is the fraction exiting early. Queueing delay is accounted for separately. |
| Raw weight payload | For N weights, FP32 occupies 4N bytes and INT8 occupies N bytes, excluding metadata and padding. | Estimate the weight storage saved before measuring traffic and latency. |
| Intermediate tensor traffic | 2S bytes for one write and one subsequent read of an S-byte intermediate. | Estimate traffic that fusion can remove at a kernel boundary. Actual DRAM savings depend on caching and spills. |
| Output-channel tiles per group | ⌈C / T⌉ tiles for C output channels in a group and a fixed kernel tile width of T channels | For a kernel that executes full tiles, check whether a proposed width removes a tile or merely leaves more lanes idle. |
| Energy per completed decision | ∫ P(t) dt / N, in J/decision, with power in watts, time in seconds and N > 0 completions in the interval | Compare sustained runs using the same meter boundary and arrival pattern. |

## Glossary

- **Deployment budget**: The storage, working memory, time and energy a deployment can allocate while delivering its required service.
- **Weights and activations**: Weights are learned coefficients reused across inputs. Activations are intermediate values produced while processing a particular input or batch.
- **Memory capacity**: The maximum number of bytes available in a particular memory pool. Capacity must cover allocations that coexist in that pool.
- **Memory bandwidth**: The rate at which bytes can cross a memory interface. A model can fit in memory and still wait on that interface on every request.
- **Critical path**: The chain of dependent work and waits that determines when a result becomes available.
- **Structured pruning**: Removing defined groups of parameters, such as whole channels, so the computation can use smaller tensor shapes or a supported sparse pattern.
- **Low-rank factorization**: Approximating a linear map by composing two maps through a smaller intermediate dimension.
- **Knowledge distillation**: Training a student model using a teacher's predictions or representations as learning targets.
- **Quantization calibration**: Using representative data or tensor statistics to choose numerical ranges and scales for a quantized model.
- **Confidence calibration**: Agreement between predicted confidence and observed correctness across comparable predictions.
- **Kernel fusion**: Implementing adjacent operations in a combined kernel so intermediate values can stay close to the arithmetic units.
- **Pareto frontier**: The measured candidates for which improving one selected objective requires giving up ground on another among the available choices.

## → Ben's world

- Extend the resident-memory case by making an additional 8 MiB runtime buffer simultaneously resident. Calculate the new footprint, name the allocations you counted and decide whether they fit the unchanged 48 MiB budget.
- For a phone decoder that fits in memory but generates tokens slowly, measure weight traffic per token and time spent waiting on memory. Use those observations to decide whether to trial packed weights or a change to the compute graph.
- For a microcontroller audio classifier, map the persistent model, feature extractor, live activations and scratch storage to their actual memory pools before choosing between smaller weights and shorter feature windows.
- For a cloud inference service, compare a compact dense student with a sparse candidate at the same arrival rate and tail-latency requirement. Use measured quality and cost per completed request to choose between them.

## Open questions

- Which damaged-label features disappear first as the sorter's projection rank decreases, and do those failures cluster by destination or printing process?
- On the intended runtime, at what batch sizes and tensor shapes does reduced weight traffic repay the cost of unpacking the supported low-bit format?
- How does a sustained run of difficult parcels change queue lengths and misroute rates for an early-exit student compared with a fixed-depth student?
- How stable are the chosen activation ranges and confidence thresholds across cameras, seasonal lighting changes and later compiler releases?
