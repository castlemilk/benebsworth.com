---
title: "Model Compression — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol1/10_model_compression/10_model_compression.html"
canonical_url: "https://benebsworth.com/study/vol1/10-model-compression/"
---

# Model Compression: Study Packet

A phone camera must finish 95% of frames within 33.3 ms. INT8 gets it there, but night-cyclist recall drops from 97% to 93%. Which version would you ship?

*Working through [Model Compression](https://mlsysbook.ai/vol1/10_model_compression/10_model_compression.html), chapter 10 of Machine Learning Systems by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

A compressed model earns its place when the compiled graph meets the device’s time, memory and energy budgets and the application’s quality floors. First identify the resource that binds. Then change the graph, the precision or the kernels that spend it. The phone camera below needs a **candidate that clears every gate** *(why it matters: An aggregate score can hide a loss on a deployment-critical slice. Compare the same candidates at the [frame deadline](https://benebsworth.com/study/vol1/10-model-compression/#fig-camera-frame-time) and the [night recall floor](https://benebsworth.com/study/vol1/10-model-compression/#fig-camera-release-gates).)*. The fastest candidate fails where night recall matters. Skip ahead to the [release gates](#fig-camera-release-gates) — the answer is visible in the gate table before the derivation.

> **note: Reading the marks**
> Amber dotted marks carry why-it-matters cards. Hover, tap or tab to read them.

## Guided notes

### Fitting the Deployment Budget

Suppose a phone camera flags cyclists while receiving 30 frames per second. The application requires **sustained service at 30 fps** and independently sets a **33.3 ms p95 deadline** from frame arrival through the result. Peak working memory may reach **64 MiB** and mean energy may reach **12 mJ/frame**. At 30 fps, that energy budget corresponds to an average **360 mW** for the measured pipeline.

The camera exercise is fictional. All three versions run on the same phone at the same input size. The baseline uses 32-bit floating point (FP32) on the CPU. The second uses 8-bit integers (INT8) on an accelerator. The mixed version keeps one sensitive block in 16-bit floating point (FP16). Moving from the baseline to INT8 changes both precision and hardware, so the timing difference measures their combined effect.

For the timing illustration, frames run serially with fixed stage times. Resize, transfer and postprocessing take 10 ms in each example. The totals therefore also give the modeled p95 on frames that enter service without queueing. Under a sustained 30 fps arrival stream, the FP32 candidate's excess service time would cause queueing or dropped frames.


**Frame time on the phone**

| Camera candidate | Model | Other frame work |
|---|---|---|
| FP32 CPU | 32 | 10 |
| INT8 PTQ | 16 | 10 |
| Mixed | 20 | 10 |

*Fictional serial timing at fixed stage times. FP32 on CPU fails the 33.3 ms deadline at 42 ms; full INT8 clears it at 26 ms and mixed INT8/FP16 at 30 ms. Queued FP32 frames take longer.*

- **Capacity** asks what fits at peak. Count weights, live activations, runtime scratch and persistent state such as an autoregressive model’s KV cache. **Bandwidth** asks how many of those bytes cross the interface per result. **Compute** and fixed dispatch costs determine how quickly the hardware can act on them.
- Compare raw payload with the release artifact and **peak device memory** *(why it matters: A small file can expand during loading. Record the maximum memory while the actual graph runs and temporary buffers coexist.)* as three distinct measurements. Packed values, scale metadata, tensor alignment, allocator behavior and workspace can make them diverge.

**Eq 1 · Raw weight payload**
$$
M_{\mathrm{weights}}=\frac{N b}{8}
$$

At four million weights, FP32 is 16 MB of raw payload. INT8 is 4 MB. Keeping one million weights in FP16 and three million in INT8 gives 5 MB. These are decimal megabytes. The memory gate is in mebibytes, where one MiB is $2^{20}$ bytes.

> **observation: Follow the resource**
> In the book’s running cases, a phone camera spends much of its frame on convolution work and activation traffic. Batch-one language model decoding can spend much of its token moving weights. A microcontroller may first run out of SRAM. Each profile suggests a different change.

### Structural Optimization: Changing What the Model Computes

**Pruning** uses a saliency signal such as weight magnitude to choose parameters or groups to remove. The signal is a proxy for the effect on task loss. Iterative pruning with recovery between passes can preserve more quality than a large one-shot removal, at the cost of repeated fine-tuning and evaluation. A winning lottery ticket is an empirical claim about a sparse subnetwork and its starting weights.

Consider a layer with 32 input channels and 16 output channels. Zeroing four outputs keeps 16 dense output slots. **Physically removing a channel** *(why it matters: The producer must export the smaller shape, and the next operator must consume it. Check the compiled dimensions, taking account of residual branches and hardware padding.)* deletes their weights and activations and narrows the next layer’s inputs. Test the new shapes against the target kernel's tiling and alignment rules.

![What the dense consumer reads](https://benebsworth.com/study/vol1/10-model-compression/diagrams/pruning-addresses.svg)

*Toy layer with 32 input channels and 16 output channels. Zeroing four output channels gives a dense projection with 512 weight slots. Removing four output channels changes the projection to 384 slots and requires the consumer to read 12 channels.*
**Low-rank factorization** replaces a dense matrix by two skinny factors. Truncated singular value decomposition keeps the largest singular components. A factorization of a $1{,}024 \times 1{,}024$ projection at rank 128 saves a factor of four in weight count and ideal matrix-vector MACs. It also creates a 128-element intermediate and usually an extra kernel launch. A suitable kernel and useful approximation both matter. Calculate the **rank break-even** *(why it matters: For a square matrix the rank must be below half the side length to save weights. A rank of 512 would tie the original count in this example.)* before profiling.

**Eq 2 · Low-rank weight count and break-even**
$$
\begin{aligned}
N_{\mathrm{factored}}&=r(m+n)\\
N_{\mathrm{dense}}&=mn\\
N_{\mathrm{factored}}<N_{\mathrm{dense}}&\iff r<\frac{mn}{m+n}
\end{aligned}
$$

**Knowledge distillation** trains a compact student using a teacher’s predictions as well as hard labels. A teacher may assign some probability to motorcycle on a bicycle frame and very little to bus. The relative scores offer training information even on an example both models classify correctly. The budget moves from repeated inference to generating teacher targets and training the student. Student capacity and teacher errors still bound quality. [Hinton, Vinyals and Dean](https://arxiv.org/abs/1503.02531)

![Two training targets for one bicycle frame](https://benebsworth.com/study/vol1/10-model-compression/diagrams/distillation-probabilities.svg)

*Illustrative class probabilities. The hard label gives bicycle 100% and the other classes 0%. The softened teacher gives 85% to bicycle, 13% to motorcycle and 2% to bus, expressing more similarity to motorcycle.*
**Eq 3 · Distillation with hard and soft targets**
$$
\begin{aligned}
\mathcal L&=(1-\alpha)\,\mathrm{CE}(y,p_{S,1})\\
&\quad+\alpha T^2\,D_{\mathrm{KL}}(p_{T,T}\,\|\,p_{S,T})
\end{aligned}
$$

**Efficient design and search** start from operators the target can execute well. Depthwise separable convolution uses a spatial pass per input channel followed by channel mixing. This can reduce arithmetic relative to a full convolution. The two stages still need efficient kernels. Hardware-aware neural architecture search can explore shapes and operators using latency and energy on the target, with an up-front search and benchmarking cost.

**Adaptive computation** assigns different work to different inputs. Early exit saves deeper layers on easy cases, so check path frequency and tail latency on hard cases. Mixture-of-experts routing can use only a few experts per token while the serving system still stores the larger set of expert weights. Count **active and resident experts** *(why it matters: A token routed to two of eight experts pays the selected experts' compute. If the device keeps all eight resident, memory capacity must still accommodate all eight.)* separately. Routing and uneven batches can consume part of the nominal benefit.

### Numerical Precision: Changing How Values Are Stored

- FP16 and BF16 use 16 bits with different layouts. FP16 has more fraction bits. BF16 devotes more bits to the exponent and preserves FP32’s normal exponent range. INT8 and INT4 typically use scaled integer codes.
- **Affine quantization** fixes a real-valued step size and the code for zero. It rounds each real value onto the resulting grid and saturates it to the code range.

**Eq 4 · Affine quantization and reconstruction**
$$
\begin{aligned}
s&=\frac{u-l}{q_{\max}-q_{\min}}\\
z&=\operatorname{clip}_{[q_{\min},q_{\max}]}\!\left(\operatorname{round}\!\left(q_{\min}-\frac{l}{s}\right)\right)\\
q&=\operatorname{clip}_{[q_{\min},q_{\max}]}\!\left(\operatorname{round}(x/s)+z\right)\\
\hat x&=s(q-z)
\end{aligned}
$$

Keeping the same code count makes **calibration a trade between resolution and clipping** *(why it matters: In the [eight-code example](https://benebsworth.com/study/vol1/10-model-compression/#fig-calibration-grid), the narrow range helps a common value and clips a larger one. A held-out slice can show whether that tail matters to the task.)*. With three unsigned bits, the ranges $[0,7]$ and $[0,14]$ both have eight codes. Their steps are 1 and 2. The narrower range maps 3.1 to 3 and clips 9.2 to 7. The wider range maps those inputs to 4 and 10.

![Eight codes spread over two ranges](https://benebsworth.com/study/vol1/10-model-compression/diagrams/calibration-grid.svg)

*Illustrative unsigned 3-bit quantizers on a common scale. Range 0–7 maps 3.1 to 3 and clips 9.2 to 7. Range 0–14 maps 3.1 to 4 and 9.2 to 10. Both ranges use eight codes.*
- **Granularity matters.** A per-channel weight scale can preserve detail in filters with smaller ranges. The backend has to support the scale layout. Symmetric ranges suit near-centered weights. Asymmetric ranges can use the codes better for skewed activations.
- **PTQ** converts frozen weights. Static activation quantization estimates ranges on representative inputs, so include conditions such as night scenes in calibration and keep a **separate quality set** *(why it matters: Use different encounters for calibration and evaluation when neighboring video frames are near duplicates. The critical slice needs examples in both sets.)*. **QAT** fine-tunes with simulated clipping and rounding during the forward pass and approximate gradients at the quantizers. A mixed-precision path can instead preserve sensitive layers if the runtime handles the boundaries efficiently.
- **Integer execution** can multiply INT8 weights and activations, accumulate in INT32, then requantize to the next layer's format. The output scale must account for the input and weight scales. Weight-only INT4 commonly unpacks to a higher-precision arithmetic path. Low-bit quality can stay near baseline before dropping sharply, with a threshold that depends on the model, workload and calibration or training recipe. [Jacob et al. on integer inference](https://arxiv.org/abs/1712.05877)

### Hardware Implementation: Changing How the Model Executes

Lower bit width helps a compute-bound layer when the runtime gets a faster supported kernel. For weight-streaming decode at batch one, the memory interface may set the lower bound. In this illustrative decoder, 1.5 billion weights stream once per token from off-chip memory. Use 50 GB/s available bandwidth and 0.30 GB of additional KV traffic at a fixed context length.

**Eq 5 · Bandwidth lower bound for decode**
$$
t_{\mathrm{token}}\ge\frac{D_{\mathrm{weights}}+D_{\mathrm{KV}}}{B}
$$

FP16 moves 3.00 GB of weights per token, for a 66 ms transfer floor after counting the KV traffic. Fused weight-only INT4 uses 0.75 GB of raw weights, for a 21 ms floor under the same assumptions. That is about $3.14\times$ on the transfer term. Real timing includes scale metadata, compute, launches and any additional memory movement.

![The off-chip cost of a separate unpacking pass](https://benebsworth.com/study/vol1/10-model-compression/diagrams/dequantization-traffic.svg)

*Illustrative traffic per decoded token. Both INT4 paths read 0.75 GB of weights and 0.30 GB of KV cache. Separate kernels write and read another 3 GB FP16 tensor, reaching 7.05 GB total. The fused path unpacks and consumes tiles on-chip and moves 1.05 GB under these assumptions.*
A separate unpacking kernel that writes a full FP16 copy to off-chip memory and forces the next kernel to read it adds **6.00 GB** to this idealized INT4 path. The **fused unpacking path** *(why it matters: A small tile is expanded close to computation and consumed immediately. Inspect the execution trace for a full-size floating-point tensor materialized between the two operations.)* avoids storing that full intermediate.

**Operator fusion** also keeps transient activations near the compute hardware. In inference, fixed batch-normalization statistics can be folded into a convolution’s weights and bias, then an activation such as ReLU can run in the same kernel. For a chain of three equal-size activation stages that would otherwise spill to memory, the idealized activation traffic falls from $6A$ to $2A$.

**Eq 6 · Traffic of a fused equal-size chain**
$$
D_{\mathrm{separate}}=2kA,\qquad D_{\mathrm{fused}}=2A
$$

**Sparse execution** needs a format and kernel that can skip work. Block patterns trade flexibility for regular loads. A **2:4 kernel** *(why it matters: A matrix can have 50% zeros and still violate the required local pattern. Check the axis and each group before assuming the exported tensor is eligible.)* can exploit two nonzeros per group of four along its supported axis. Check the exported shape, layout, data type and operation to see whether the compiler actually selects that path.

### Choosing and Combining: Which Candidate Ships?

- When capacity or memory traffic binds, try a smaller weight representation and inspect runtime buffers. When arithmetic binds, test supported faster precision or smaller dense shapes. When dispatch or intermediate traffic dominates, start by investigating fusion.
- A common workflow is to choose and prune the structure, use fine-tuning or distillation for recovery, then calibrate the final graph. If the structure changes after calibration, collect ranges again. If PTQ misses the quality floor, test better calibration, selective precision or QAT and profile the actual resulting graph.
- Cutting dense weights in half and converting FP32 to INT8 gives an eightfold raw payload reduction before metadata. Measured latency depends on shape padding, operator coverage, conversion, and the rest of the pipeline. Re-profile after every material change.

A candidate is dominated if another candidate is at least as good on all measured objectives and better on one. A visible knee can reveal diminishing returns. The release itself needs **explicit quality and resource thresholds** *(why it matters: The INT8 candidate saves the most time. Hold it to the night-recall gate before considering how valuable those four additional milliseconds are.)*.

![Which camera candidate clears both gates?](https://benebsworth.com/study/vol1/10-model-compression/diagrams/camera-release-gates.svg)

*Fictional frame times and night-cyclist recall. FP32 CPU is late at 42 ms or more. INT8 PTQ is fast at 26 ms and misses the 95% night-recall floor at 93%. Mixed precision passes the 33.3 ms deadline and the recall floor with 30 ms and 96%.*
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

The **fraction on the request’s critical path** *(why it matters: In the [40 ms example](https://benebsworth.com/study/vol1/10-model-compression/#fig-request-time-ceiling), halving the 8 ms model stage saves 4 ms total. Identify the timing boundary before quoting a speedup.)* sets the gain available from accelerating that stage. Amdahl’s law applies directly to an additive serial profile with the other stages fixed.

**Eq 7 · Amdahl’s law for an accelerated model stage**
$$
S_{\mathrm{end}}=\frac{1}{(1-f)+f/S_{\mathrm{model}}}
$$


**A twofold model speedup saves 4 ms per request**

| Model speed | Model | Other request work |
|---|---|---|
| Baseline | 8 | 32 |
| 2× model speed | 4 | 32 |
| Zero model time | 0 | 32 |

*Illustrative serial request. Model time falls from 8 ms to 4 ms while the other work takes 32 ms, so the request improves from 40 ms to 36 ms (about 1.11×). Even instantaneous inference leaves 32 ms (1.25×).*

Inspect per-layer activation histograms for clipping, placement traces for unsupported operators, and allocation traces for transient copies. Use these as evidence for the next experiment. Check confidence calibration if downstream logic relies on model scores, since confidence can drift while top-line accuracy moves little.

For example, the book traces dense projections and layer normalization in a vision transformer. Projections can account for most of the FLOPs. A layer normalization can still take appreciable time reading and writing activations and running reductions. Inspect the profile before choosing which component to optimize.

The camera exercise gates on observed recall. If the contract requires a confidence bound, the sampling plan becomes part of acceptance. For 960 of 1,000 independent outcomes, a two-sided 95% Wilson interval is about 94.6–97.0%. A contract that requires that lower endpoint to reach 95% would still be open. For correlated video frames, define independent sampling units such as encounters or account for clustering.

### Fallacies and Pitfalls

- **Zeros, payload and latency each have a test.** In a sparse format, even the storage win depends on **index width and overhead** *(why it matters: At one byte per value and two bytes per index, storage needs more than two-thirds zeros even before row metadata. Try the [matrix calculation](https://benebsworth.com/study/vol1/10-model-compression/#fig-sparse-storage-cost).)*. With one value and index per nonzero, the following inequality gives the minimum sparsity for smaller storage. Actual sparse execution also pays for gathers, index decoding and parallelism losses.

**Eq 8 · Sparse storage break-even with metadata**
$$
\begin{aligned}
N(1-s)(b_v+b_i)+R&<Nb_v\\
s&>\frac{b_i+R/N}{b_v+b_i}
\end{aligned}
$$

![Half the weights can take more bytes](https://benebsworth.com/study/vol1/10-model-compression/diagrams/sparse-storage-cost.svg)

*Toy CSR encoding for a 128 × 128 INT8 matrix. At 50% zeros, 8,192 weight bytes, 16,384 column-index bytes and 516 row-pointer bytes total 25,092 bytes. The dense encoding takes 16,384 bytes.*
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


---

## Key equations

**Eq 1 · Raw weight payload**

$$
M_{\mathrm{weights}}=\frac{N b}{8}
$$

*For $N$ uniformly packed parameters at $b$ bits each. For mixed precision, add the payloads of the separate groups. This excludes scales, padding, other metadata and runtime buffers.*

**Eq 2 · Low-rank weight count and break-even**

$$
\begin{aligned} N_{\mathrm{factored}}&=r(m+n)\\ N_{\mathrm{dense}}&=mn\\ N_{\mathrm{factored}}<N_{\mathrm{dense}}&\iff r<\frac{mn}{m+n} \end{aligned}
$$

*An $m$ by $n$ matrix is replaced by two factors of shapes $m$ by $r$ and $r$ by $n$. For a matrix-vector product the same counts apply to multiply-accumulates, before intermediate traffic and dispatch.*

**Eq 3 · Distillation with hard and soft targets**

$$
\begin{aligned} \mathcal L&=(1-\alpha)\,\mathrm{CE}(y,p_{S,1})\\ &\quad+\alpha T^2\,D_{\mathrm{KL}}(p_{T,T}\,\|\,p_{S,T}) \end{aligned}
$$

*Both teacher and student soft targets use temperature $T$. Multiplying the soft-target term by $T^2$ compensates for the approximate gradient scaling with temperature. Only the student is needed at inference.*

**Eq 4 · Affine quantization and reconstruction**

$$
\begin{aligned} s&=\frac{u-l}{q_{\max}-q_{\min}}\\ z&=\operatorname{clip}_{[q_{\min},q_{\max}]}\!\left(\operatorname{round}\!\left(q_{\min}-\frac{l}{s}\right)\right)\\ q&=\operatorname{clip}_{[q_{\min},q_{\max}]}\!\left(\operatorname{round}(x/s)+z\right)\\ \hat x&=s(q-z) \end{aligned}
$$

*Use a nonzero-width range containing real zero. The integer zero-point anchors zero. Keeping the number of codes fixed makes a wider calibration range increase the step between represented values.*

**Eq 5 · Bandwidth lower bound for decode**

$$
t_{\mathrm{token}}\ge\frac{D_{\mathrm{weights}}+D_{\mathrm{KV}}}{B}
$$

*Apply at a fixed batch size and context length for traffic that crosses the same memory interface. Quantizing weights leaves the KV-cache term intact unless it is changed separately.*

**Eq 6 · Traffic of a fused equal-size chain**

$$
D_{\mathrm{separate}}=2kA,\qquad D_{\mathrm{fused}}=2A
$$

*Counts activation reads and writes for $k$ stages with input and output of size $A$ at every stage, assuming every separate stage spills its output to the interface and fusion can keep intermediates on-chip. Weight reads are counted separately.*

**Eq 7 · Amdahl’s law for an accelerated model stage**

$$
S_{\mathrm{end}}=\frac{1}{(1-f)+f/S_{\mathrm{model}}}
$$

*This serial-stage model assumes the other work stays fixed. The model share is measured on the original request boundary. Overlapped pipelines require tracing the actual critical path.*

**Eq 8 · Sparse storage break-even with metadata**

$$
\begin{aligned} N(1-s)(b_v+b_i)+R&<Nb_v\\ s&>\frac{b_i+R/N}{b_v+b_i} \end{aligned}
$$

*Each retained value has its own index. Fixed overhead is charged once. The inequality is about storage. Sparse-kernel latency needs a separate experiment.*

## From the book

- [Quantization on the roofline](https://mlsysbook.ai/vol1/10_model_compression/10_model_compression.html) — The source puts two workloads on a roofline so you can see which resource limits each one. The packet follows actual byte categories in a modeled decode token.
- [Activation traffic with operator fusion](https://mlsysbook.ai/vol1/10_model_compression/10_model_compression.html) — Follow the memory reads and writes around three adjacent operators. The packet follows a second use of fusion, consuming packed weights inside the matrix multiplication.
- [Sparse-kernel break-even](https://mlsysbook.ai/vol1/10_model_compression/10_model_compression.html) — The book sketches the hardware-dependent point where a sparse kernel becomes faster. The packet computes a separate storage threshold from explicit index widths.
- [An INT8 quality gate](https://mlsysbook.ai/vol1/10_model_compression/10_model_compression.html) — The source illustrates a quantized candidate crossing a confidence-calibration error limit. The camera exercise applies a similar quality check using night recall alongside a frame deadline and resource gates.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

Attempt the questions before opening the answer key. Questions 1–6 adapt the book’s Model Compression quiz bank.

1. At the same nominal fraction of removed weights, a channel-pruned image model runs faster on a GPU than the unstructured version. What most directly explains the difference?
   - A. Training the channel-pruned model again increases the arithmetic throughput of the GPU.
   - B. Deleting channels can yield smaller dense tensors. Scattered zeros need a compatible sparse format and kernel to skip work.
   - C. Equal nominal sparsity gives the same weight addresses, so any difference must come from activation precision.
   - D. Storing arbitrary nonzero weights automatically gives the same memory locality as removing contiguous channels.

2. During INT8 calibration, most activations cluster near zero with a few large positive outliers. Which experiment increases resolution for the bulk of the distribution?
   - A. Use the full observed range so every observed value fits.
   - B. Use one global scale chosen from the layer with the largest outlier.
   - C. Keep the same scale and shift the zero-point so the spacing between codes shrinks.
   - D. Try a tighter percentile-based clipping range at the same code count, then check the quality impact.

3. How can compiling a convolution, inference batch normalization and ReLU together shorten execution?
   - A. The compiler can fold normalization into the convolution and avoid intermediate activation round trips and separate launches.
   - B. Fusion converts the convolution’s dense weights into a hardware-supported sparse matrix.
   - C. Fusion replaces the convolution with a smaller student trained on soft targets.
   - D. Every fused stage moves to INT8, so the speedup follows from weight bit width alone.

4. An edge decoder fits at short context and spends most of each batch-one token streaming weights. At the required longer context, its KV cache and workspace push it over memory capacity. Which is the most direct first experiment?
   - A. Fuse a layer normalization pass and assume that will shrink the static weight allocation.
   - B. Increase the batch size and extrapolate its throughput to the batch-one deployment.
   - C. Test supported weight-only PTQ, then measure total memory, per-token time and quality at the required context.
   - D. Lower activation precision while keeping weight storage and the decode kernels as they are.

5. A vision transformer’s projections account for most of its FLOPs, yet layer normalization uses appreciable wall time. What should guide the next optimization?
   - A. Apply the same pruning ratio to every layer to preserve the observed balance of FLOPs.
   - B. Profile each component’s limiting resource. Check how busy the compute units are for projections and measure activation traffic for normalization.
   - C. Treat the FLOP count as the latency breakdown and start with the largest projection.
   - D. Select the layer with the highest latency relative to its FLOP count, regardless of its absolute time or workload.

6. Pruning and quantization each sped up a model when tested in isolation. What should the team expect from applying both to the same artifact?
   - A. Multiply the two observed latency speedups to predict the speedup of the combined graph.
   - B. Carry the original calibration ranges forward because those ranges depend only on bit width.
   - C. Predict combined quality from the sum of the original error rates.
   - D. Recalibrate if the graph changes and evaluate the combined compiled path, since shapes, activation ranges and kernels can interact.

7. Explain to a teammate why you would choose the mixed INT8/FP16 camera candidate. Use the frame, throughput and night-cyclist gates in your argument.

8. The aggregate score holds after PTQ, but recall falls on night frames. Explain a mechanism that could cause this and describe two experiments that would test it.

9. An 8-million-weight FP32 model is pruned to 4 million weights and converted to INT8. Its baseline request takes 60 ms, including 24 ms in the model. The optimized model stage takes 12 ms and the other serial stages keep their original time. Calculate the raw payload reduction factor, the new request time and the end-to-end speedup.

---

## Answer key

1. B. Removing whole channels can shorten the dimensions of ordinary dense operations. A dense kernel still processes scattered zeros. A sparse kernel can avoid some of that work, while paying for indices and irregular access.

2. D. A smaller range makes adjacent codes closer together. It also saturates values outside that range. Validate the slices that could depend on those extreme activations.

3. A. With fixed inference statistics, batch normalization is an affine transform that can be folded into weights and bias. A fused activation can then consume the result in the same kernel, removing a materialized boundary.

4. C. Packed weights can directly reduce both the static weight allocation and the dominant traffic. Check peak memory with the target-length KV cache and verify that the kernel consumes packed weights without a large off-chip expansion.

5. B. A small arithmetic count can still entail costly data movement and launches. Measure where time goes and inspect hardware counters before choosing a change.

6. D. Structure changes can move activation ranges and alter kernel selection. Later conversions, bandwidth limits and remaining pipeline work affect the combined latency. Test both resource use and quality on the resulting graph.

7. The mixed candidate has a modeled service capacity of 33.3 fps and a 30 ms frame time, clearing 30 fps and the 33.3 ms deadline. Its observed night-cyclist recall is 96%, one point above the 95% floor. Full INT8 is faster but reaches 93% night recall. FP32 has 97% recall, needs at least 42 ms per frame and can service only 23.8 fps in this model. Mixed also clears the stated peak-memory, mean-energy and overall accuracy gates.

8. Calibration dominated by daytime inputs may give a sensitive layer too narrow a range for activations on night frames. Compare saturation or reconstruction error on independently held-out night and day encounters. Then recalibrate on a separate, representative set that includes night frames and compare recall on the same held-out encounters. If one layer still concentrates errors, try higher precision just there and profile the compiled path again.

9. The FP32 payload is 8 million weights × 4 bytes per weight = 32 million bytes (32 MB). The INT8 payload is 4 million weights × 1 byte per weight = 4 million bytes (4 MB), an eightfold reduction before metadata. The other stages take $60-24=36$ ms. The new request takes $36+12=48$ ms, for $60/48=1.25\times$ end-to-end speedup.

## Audio overview

[Listen to the Marcus & Iris read-along (~8 min)](https://benebsworth.com/study-audio/vol1/10-model-compression.m4a) — a generated podcast walking this packet's argument.
