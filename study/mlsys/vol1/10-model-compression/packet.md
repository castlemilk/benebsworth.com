---
openingQuestion: "A phone camera must finish 95% of frames within 33.3 ms. INT8 gets it there, but night-cyclist recall drops from 97% to 93%. Which version would you ship?"
---

# Model Compression: Study Packet

*Working through [Model Compression](https://mlsysbook.ai/vol1/10_model_compression/10_model_compression.html), chapter 10 of Machine Learning Systems by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

A compressed model earns its place when the compiled graph meets the device’s time, memory and energy budgets and the application’s quality floors. First identify the resource that binds. Then change the graph, the precision or the kernels that spend it. The phone camera below needs a ==candidate that clears every gate=={An aggregate score can hide a loss on a deployment-critical slice. Compare the same candidates at the [frame deadline](#fig-camera-frame-time) and the [night recall floor](#fig-camera-release-gates).}. The fastest candidate fails where night recall matters. Skip ahead to the [release gates](#fig-camera-release-gates) — the answer is visible in the gate table before the derivation.

> [!note] Reading the marks
> Amber dotted marks carry why-it-matters cards. Hover, tap or tab to read them.

## Guided notes

### Fitting the Deployment Budget

Suppose a phone camera flags cyclists while receiving 30 frames per second. The application requires **sustained service at 30 fps** and independently sets a **33.3 ms p95 deadline** from frame arrival through the result. Peak working memory may reach **64 MiB** and mean energy may reach **12 mJ/frame**. At 30 fps, that energy budget corresponds to an average **360 mW** for the measured pipeline.

The camera exercise is fictional. All three versions run on the same phone at the same input size. The baseline uses 32-bit floating point (FP32) on the CPU. The second uses 8-bit integers (INT8) on an accelerator. The mixed version keeps one sensitive block in 16-bit floating point (FP16). Moving from the baseline to INT8 changes both precision and hardware, so the timing difference measures their combined effect.

For the timing illustration, frames run serially with fixed stage times. Resize, transfer and postprocessing take 10 ms in each example. The totals therefore also give the modeled p95 on frames that enter service without queueing. Under a sustained 30 fps arrival stream, the FP32 candidate's excess service time would cause queueing or dropped frames.

::chart[camera-frame-time]

- **Capacity** asks what fits at peak. Count weights, live activations, runtime scratch and persistent state such as an autoregressive model’s KV cache. **Bandwidth** asks how many of those bytes cross the interface per result. **Compute** and fixed dispatch costs determine how quickly the hardware can act on them.
- Compare raw payload with the release artifact and ==peak device memory=={A small file can expand during loading. Record the maximum memory while the actual graph runs and temporary buffers coexist.} as three distinct measurements. Packed values, scale metadata, tensor alignment, allocator behavior and workspace can make them diverge.

::eq[weight-bytes]
$$
M_{\mathrm{weights}}=\frac{N b}{8}
$$

At four million weights, FP32 is 16 MB of raw payload. INT8 is 4 MB. Keeping one million weights in FP16 and three million in INT8 gives 5 MB. These are decimal megabytes. The memory gate is in mebibytes, where one MiB is $2^{20}$ bytes.

> [!observation] Follow the resource
> In the book’s running cases, a phone camera spends much of its frame on convolution work and activation traffic. Batch-one language model decoding can spend much of its token moving weights. A microcontroller may first run out of SRAM. Each profile suggests a different change.

### Structural Optimization: Changing What the Model Computes

**Pruning** uses a saliency signal such as weight magnitude to choose parameters or groups to remove. The signal is a proxy for the effect on task loss. Iterative pruning with recovery between passes can preserve more quality than a large one-shot removal, at the cost of repeated fine-tuning and evaluation. A winning lottery ticket is an empirical claim about a sparse subnetwork and its starting weights.

Consider a layer with 32 input channels and 16 output channels. Zeroing four outputs keeps 16 dense output slots. ==Physically removing a channel=={The producer must export the smaller shape, and the next operator must consume it. Check the compiled dimensions, taking account of residual branches and hardware padding.} deletes their weights and activations and narrows the next layer’s inputs. Test the new shapes against the target kernel's tiling and alignment rules.

::fig[pruning-addresses]

**Low-rank factorization** replaces a dense matrix by two skinny factors. Truncated singular value decomposition keeps the largest singular components. A factorization of a $1{,}024 \times 1{,}024$ projection at rank 128 saves a factor of four in weight count and ideal matrix-vector MACs. It also creates a 128-element intermediate and usually an extra kernel launch. A suitable kernel and useful approximation both matter. Calculate the ==rank break-even=={For a square matrix the rank must be below half the side length to save weights. A rank of 512 would tie the original count in this example.} before profiling.

::eq[low-rank-cost]
$$
\begin{aligned}
N_{\mathrm{factored}}&=r(m+n)\\
N_{\mathrm{dense}}&=mn\\
N_{\mathrm{factored}}<N_{\mathrm{dense}}&\iff r<\frac{mn}{m+n}
\end{aligned}
$$

**Knowledge distillation** trains a compact student using a teacher’s predictions as well as hard labels. A teacher may assign some probability to motorcycle on a bicycle frame and very little to bus. The relative scores offer training information even on an example both models classify correctly. The budget moves from repeated inference to generating teacher targets and training the student. Student capacity and teacher errors still bound quality. [Hinton, Vinyals and Dean](https://arxiv.org/abs/1503.02531)

::fig[distillation-probabilities]

::eq[distillation-loss]
$$
\begin{aligned}
\mathcal L&=(1-\alpha)\,\mathrm{CE}(y,p_{S,1})\\
&\quad+\alpha T^2\,D_{\mathrm{KL}}(p_{T,T}\,\|\,p_{S,T})
\end{aligned}
$$

**Efficient design and search** start from operators the target can execute well. Depthwise separable convolution uses a spatial pass per input channel followed by channel mixing. This can reduce arithmetic relative to a full convolution. The two stages still need efficient kernels. Hardware-aware neural architecture search can explore shapes and operators using latency and energy on the target, with an up-front search and benchmarking cost.

**Adaptive computation** assigns different work to different inputs. Early exit saves deeper layers on easy cases, so check path frequency and tail latency on hard cases. Mixture-of-experts routing can use only a few experts per token while the serving system still stores the larger set of expert weights. Count ==active and resident experts=={A token routed to two of eight experts pays the selected experts' compute. If the device keeps all eight resident, memory capacity must still accommodate all eight.} separately. Routing and uneven batches can consume part of the nominal benefit.

### Numerical Precision: Changing How Values Are Stored

- FP16 and BF16 use 16 bits with different layouts. FP16 has more fraction bits. BF16 devotes more bits to the exponent and preserves FP32’s normal exponent range. INT8 and INT4 typically use scaled integer codes.
- **Affine quantization** fixes a real-valued step size and the code for zero. It rounds each real value onto the resulting grid and saturates it to the code range.

::eq[affine-quantizer]
$$
\begin{aligned}
s&=\frac{u-l}{q_{\max}-q_{\min}}\\
z&=\operatorname{clip}_{[q_{\min},q_{\max}]}\!\left(\operatorname{round}\!\left(q_{\min}-\frac{l}{s}\right)\right)\\
q&=\operatorname{clip}_{[q_{\min},q_{\max}]}\!\left(\operatorname{round}(x/s)+z\right)\\
\hat x&=s(q-z)
\end{aligned}
$$

Keeping the same code count makes ==calibration a trade between resolution and clipping=={In the [eight-code example](#fig-calibration-grid), the narrow range helps a common value and clips a larger one. A held-out slice can show whether that tail matters to the task.}. With three unsigned bits, the ranges $[0,7]$ and $[0,14]$ both have eight codes. Their steps are 1 and 2. The narrower range maps 3.1 to 3 and clips 9.2 to 7. The wider range maps those inputs to 4 and 10.

::fig[calibration-grid]

- **Granularity matters.** A per-channel weight scale can preserve detail in filters with smaller ranges. The backend has to support the scale layout. Symmetric ranges suit near-centered weights. Asymmetric ranges can use the codes better for skewed activations.
- **PTQ** converts frozen weights. Static activation quantization estimates ranges on representative inputs, so include conditions such as night scenes in calibration and keep a ==separate quality set=={Use different encounters for calibration and evaluation when neighboring video frames are near duplicates. The critical slice needs examples in both sets.}. **QAT** fine-tunes with simulated clipping and rounding during the forward pass and approximate gradients at the quantizers. A mixed-precision path can instead preserve sensitive layers if the runtime handles the boundaries efficiently.
- **Integer execution** can multiply INT8 weights and activations, accumulate in INT32, then requantize to the next layer's format. The output scale must account for the input and weight scales. Weight-only INT4 commonly unpacks to a higher-precision arithmetic path. Low-bit quality can stay near baseline before dropping sharply, with a threshold that depends on the model, workload and calibration or training recipe. [Jacob et al. on integer inference](https://arxiv.org/abs/1712.05877)

### Hardware Implementation: Changing How the Model Executes

Lower bit width helps a compute-bound layer when the runtime gets a faster supported kernel. For weight-streaming decode at batch one, the memory interface may set the lower bound. In this illustrative decoder, 1.5 billion weights stream once per token from off-chip memory. Use 50 GB/s available bandwidth and 0.30 GB of additional KV traffic at a fixed context length.

::eq[decode-lower-bound]
$$
t_{\mathrm{token}}\ge\frac{D_{\mathrm{weights}}+D_{\mathrm{KV}}}{B}
$$

FP16 moves 3.00 GB of weights per token, for a 66 ms transfer floor after counting the KV traffic. Fused weight-only INT4 uses 0.75 GB of raw weights, for a 21 ms floor under the same assumptions. That is about $3.14\times$ on the transfer term. Real timing includes scale metadata, compute, launches and any additional memory movement.

::fig[dequantization-traffic]

A separate unpacking kernel that writes a full FP16 copy to off-chip memory and forces the next kernel to read it adds **6.00 GB** to this idealized INT4 path. The ==fused unpacking path=={A small tile is expanded close to computation and consumed immediately. Inspect the execution trace for a full-size floating-point tensor materialized between the two operations.} avoids storing that full intermediate.

**Operator fusion** also keeps transient activations near the compute hardware. In inference, fixed batch-normalization statistics can be folded into a convolution’s weights and bias, then an activation such as ReLU can run in the same kernel. For a chain of three equal-size activation stages that would otherwise spill to memory, the idealized activation traffic falls from $6A$ to $2A$.

::eq[fusion-traffic]
$$
D_{\mathrm{separate}}=2kA,\qquad D_{\mathrm{fused}}=2A
$$

**Sparse execution** needs a format and kernel that can skip work. Block patterns trade flexibility for regular loads. A ==2:4 kernel=={A matrix can have 50% zeros and still violate the required local pattern. Check the axis and each group before assuming the exported tensor is eligible.} can exploit two nonzeros per group of four along its supported axis. Check the exported shape, layout, data type and operation to see whether the compiler actually selects that path.

### Choosing and Combining: Which Candidate Ships?

- When capacity or memory traffic binds, try a smaller weight representation and inspect runtime buffers. When arithmetic binds, test supported faster precision or smaller dense shapes. When dispatch or intermediate traffic dominates, start by investigating fusion.
- A common workflow is to choose and prune the structure, use fine-tuning or distillation for recovery, then calibrate the final graph. If the structure changes after calibration, collect ranges again. If PTQ misses the quality floor, test better calibration, selective precision or QAT and profile the actual resulting graph.
- Cutting dense weights in half and converting FP32 to INT8 gives an eightfold raw payload reduction before metadata. Measured latency depends on shape padding, operator coverage, conversion, and the rest of the pipeline. Re-profile after every material change.

A candidate is dominated if another candidate is at least as good on all measured objectives and better on one. A visible knee can reveal diminishing returns. The release itself needs ==explicit quality and resource thresholds=={The INT8 candidate saves the most time. Hold it to the night-recall gate before considering how valuable those four additional milliseconds are.}.

::fig[camera-release-gates]

These are the fictional acceptance results. Service capacity is $1{,}000/t_{\mathrm{frame}}$ in frames per second when the frame time is in milliseconds.

| Gate | Target | FP32 CPU | INT8 PTQ | Mixed INT8/FP16 |
|---|---:|---:|---:|---:|
| Modeled service capacity | ≥30 fps | 23.8 fps | 38.5 fps | 33.3 fps |
| Frame p95 at fixed stage times | ≤33.3 ms | ≥42 ms | 26 ms | 30 ms |
| Peak working memory | ≤64 MiB | 56 MiB | 46 MiB | 49 MiB |
| Mean energy per frame | ≤12 mJ | 14 mJ | 9 mJ | 10 mJ |
| Overall accuracy | ≥98.0% | 98.4% | 98.3% | 98.4% |
| Night-cyclist recall | ≥95.0% | 97.0% | 93.0% | 96.0% |

Ship the mixed candidate in this exercise. Of 1,000 held-out night cyclists, the floor allows 50 misses. INT8 misses 70. Mixed precision misses 40 and still has 3.3 ms of modeled deadline margin. In a real acceptance run, record sustained throughput and p95 latency under load, including queued or dropped frames under the specified policy.

### Measuring Compression Gains

Profile the original and each compiled candidate at the same workload and quality gates. Record device, backend, compiled artifact, operator placement, input shape, batch size, concurrency, warm-up and sustained-load conditions. For decode, separate prefill and per-token timing and fix context length. For the camera, trace capture, host work, copies, accelerator, and output. Record peak live memory, steady-state rate, tail latency and energy per result. Repeat across thermal states and quantify quality uncertainty with per-slice sample counts.

The ==fraction on the request’s critical path=={In the [40 ms example](#fig-request-time-ceiling), halving the 8 ms model stage saves 4 ms total. Identify the timing boundary before quoting a speedup.} sets the gain available from accelerating that stage. Amdahl’s law applies directly to an additive serial profile with the other stages fixed.

::eq[amdahl]
$$
S_{\mathrm{end}}=\frac{1}{(1-f)+f/S_{\mathrm{model}}}
$$

::chart[request-time-ceiling]

Inspect per-layer activation histograms for clipping, placement traces for unsupported operators, and allocation traces for transient copies. Use these as evidence for the next experiment. Check confidence calibration if downstream logic relies on model scores, since confidence can drift while top-line accuracy moves little.

For example, the book traces dense projections and layer normalization in a vision transformer. Projections can account for most of the FLOPs. A layer normalization can still take appreciable time reading and writing activations and running reductions. Inspect the profile before choosing which component to optimize.

The camera exercise gates on observed recall. If the contract requires a confidence bound, the sampling plan becomes part of acceptance. For 960 of 1,000 independent outcomes, a two-sided 95% Wilson interval is about 94.6–97.0%. A contract that requires that lower endpoint to reach 95% would still be open. For correlated video frames, define independent sampling units such as encounters or account for clustering.

### Fallacies and Pitfalls

- **Zeros, payload and latency each have a test.** In a sparse format, even the storage win depends on ==index width and overhead=={At one byte per value and two bytes per index, storage needs more than two-thirds zeros even before row metadata. Try the [matrix calculation](#fig-sparse-storage-cost).}. With one value and index per nonzero, the following inequality gives the minimum sparsity for smaller storage. Actual sparse execution also pays for gathers, index decoding and parallelism losses.

::eq[sparse-break-even]
$$
\begin{aligned}
N(1-s)(b_v+b_i)+R&<Nb_v\\
s&>\frac{b_i+R/N}{b_v+b_i}
\end{aligned}
$$

::fig[sparse-storage-cost]

The toy compressed sparse row (CSR) format uses two bytes per column index and four per row pointer, including the pointer after the last row. This makes $R=(128+1)\times4=516$ bytes and puts the strict storage break-even near 67.72% zeros.

- **Percentile boundaries matter.** Measure complete-frame latency directly. Outside the fixed-time exercise, the sum of stage p95s can differ from the frame p95 because stages slow down on different frames or overlap.
- **Remeasure the whole compiled system after combining changes.** Pruning can change which tiles are efficient. A quantized layer that falls back to a floating-point operator can incur extra launch and transfer costs. Activation scales can change after a structural change. Inspect the overlay of device traces and outlier statistics before attributing a regression to a single technique.

### Summary

The mixed-precision camera meets the stated deadlines and keeps night-cyclist recall above its floor. Each candidate changes a different combination of arithmetic, representation and execution, so the next test always starts with the compiled path and the resource it spends. Hardware Acceleration follows that path into the memory hierarchy and the execution units.

## The physics

| Quantity | Value | Use |
|---|---|---|
| Camera arrival rate and p95 deadline | 30 fps and 33.3 ms | Check sustained service and the tail separately. |
| Camera energy budget | 12 mJ/frame at 30 fps is 360 mW on average | Define the power scope and count energy per completed result. |
| Weight payload | $Nb/8$ bytes | Check raw size before padding, metadata and live buffers. |
| Factored projection | $r(m+n)$ weights. The rank-128 example keeps $262{,}144$ of $1{,}048{,}576$. | Compare storage and ideal matrix-vector MACs. |
| Quantization step | $s=(u-l)/(q_{\max}-q_{\min})$ | A larger range uses more real units per code. |
| Distillation temperature correction | $T^2$ multiplies the soft-target term | Keep its gradient scale comparable as temperature changes. |
| Decode transfer bound | $(D_{\mathrm{weights}}+D_{\mathrm{KV}})/B$. FP16 and fused INT4 give 66 ms and 21 ms. | Hold batch and context fixed. Count traffic crossing the same interface. |
| Fused activation traffic | $2kA$ bytes separate, $2A$ bytes fused | Use when equal-size stages would each spill to the same memory boundary. |
| Amdahl’s limit | $1/(1-f)$ as model time approaches zero. At $f=0.2$, this is $1.25\times$ | Bound serial end-to-end speedup when other work is fixed. |
| Sparse storage | $N(1-s)(b_v+b_i)+R$ bytes | Charge every value, index and row offset. |

## Glossary

- **Affine quantization**: maps real values to evenly spaced integer codes using a scale and zero-point.
- **Calibration**: estimates quantizer ranges from weights or representative activations.
- **Clipping**: maps an out-of-range value to the nearest representable endpoint.
- **Zero-point**: the integer code that represents real zero.
- **Post-training quantization (PTQ)**: converts a trained model to lower precision without updating its weights through training.
- **Quantization-aware training (QAT)**: trains a model with simulated low-precision behavior in its forward pass.
- **Structured pruning**: removes groups such as channels or follows a hardware-supported sparsity pattern.
- **Knowledge distillation**: trains a student using predictions from a teacher model.
- **Low-rank factorization**: approximates a weight matrix by two smaller factors joined at a chosen rank.
- **Accuracy-efficiency frontier**: candidate operating points where no other measured candidate is at least as good on all objectives and better on one.
- **Working set**: memory used by the active weights, tensors and runtime state at the point of measurement.

## → Ben's world

- In the LLM benchmark harness, keep prompt lengths, decoding parameters and task slices fixed when comparing builds. For a locally served model, separate time to first token from decode rate and record the actual backend and quantized artifact.
- For Greenveil’s label-photo workflow, score recall on dim images and small print independently of the overall extraction score. Time image decoding and preparation alongside inference before changing a model.
- On a shared droplet, trace queueing and host contention as part of request latency. An execution change can cut model time while most of the user’s wait still sits elsewhere in the request.

## Open questions

- If only the night slice loses recall after PTQ, which paired calibration and held-out comparisons would identify the sensitive block?
- At what context length would KV traffic rival or exceed the packed weights in a decoder on a particular machine?
- Which channel widths on the target accelerator cross a tile boundary and actually shorten the compiled kernel?
