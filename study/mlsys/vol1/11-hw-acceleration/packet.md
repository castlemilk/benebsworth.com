---
openingQuestion: "One accelerator has twice the matrix compute, another twice the memory bandwidth. Which has the lower ideal time floor for the same projection at batch 1 and at batch 256?"
---

# Hardware Acceleration: Study Packet

*Working through [Hardware Acceleration](https://mlsysbook.ai/vol1/11_hw_acceleration/11_hw_acceleration.html), chapter 11 of Machine Learning Systems by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

A specialized accelerator earns its speed when the workload exposes operations the hardware supports and can supply their operands fast enough. The same matrix can be limited by device-memory traffic at one batch and by arithmetic at another. Count work and bytes at a named boundary, compare the two floors, then verify the compiled path and the complete request. The fictional machines below make the trade visible: ==the better ideal floor changes with reuse=={The comparison is within each batch. The larger batch performs more work but shares the weight reads across more inputs. See the [two rooflines](#fig-device-rooflines) and the [time floors](#fig-projection-floors).}. A floor is a prediction to test, not a measured latency. Skip ahead to [compare the two devices](#fig-device-rooflines) — the roofline picture answers the question before the derivation does.

> [!note] Reading the marks
> Amber dotted marks carry why-it-matters cards. Hover, tap or tab to read them.

## Guided notes

### Anatomy of an Accelerator

A host processor submits work to the accelerator. Device memory supplies shared on-chip storage and smaller local memories. Processing elements use those values in matrix, vector and special-function units. Host-device links, memory bandwidth, local capacity, synchronization and dispatch all influence whether arithmetic units can stay busy. Some devices have hardware-managed caches. Others expose software-managed scratchpads. The precise arrangement differs by product.

Amdahl's law puts a limit on an intervention before we inspect the matrix unit. Suppose a **separate illustrative serial request** takes 200 µs, including 80 µs for one projection and 120 µs for everything else. If that projection becomes twice as fast and the rest stays fixed, the request takes 160 µs. The stage gain is $2\times$. The request gain is only $1.25\times$. Even eliminating the stage entirely leaves 120 µs and caps the request gain at $1.67\times$.

::eq[amdahl]
$$
S=\frac{1}{(1-f)+f/G}
$$

::chart[request-ceiling]

The ==accelerated fraction belongs to a particular change=={If the 80 µs projection is halved, the remaining 120 µs stays fixed in this example. A faster host link would affect a different part of the baseline.} and is measured in the **baseline request**. A faster arithmetic path, a faster host link and a fused operator each affect different work. For overlapping stages, find the critical path in a trace. Adding their elapsed times or summing their p95s can be misleading.

### Hardware Specialization

A CPU spends area on flexible control, speculation and general-purpose execution. An accelerator can devote more of its budget to parallel multiply-accumulates and nearby storage, accepting a narrower set of efficient operations. This bargain helps when the graph, compiler and silicon agree on the ==operation, precision, shape and layout=={A model with FP16 weights does not prove that its matrix multiplications use a matrix unit. Check the selected kernel and any casts, padding or fallback in the trace.}.

::fig[hardware-contract]

Low precision has two possible benefits: fewer bytes per stored operand and more low-precision arithmetic per unit of silicon. Neither follows from a filename alone. A weight-only format may expand to a wider arithmetic type. The selected kernel must handle the representation and acceptable numerical error. Structured sparsity also needs a supported pattern, layout and sparse kernel. Merely storing zeros in a dense matrix need not skip arithmetic.

The book's illustrative 45 nm estimates put one 32-bit DRAM access at **640 pJ**, a 32-bit read from an 8 KB SRAM at **5 pJ**, and an FP32 multiply at **3.7 pJ**. DRAM is about $128\times$ the SRAM read in that model. These are historical, comparable example events, not universal measurements for a current accelerator. Locality can reduce costly accesses. Actual energy per result still needs system measurement.

### Compute Primitives

Neural networks combine several computational shapes. Dense projections and many convolutions can be expressed as matrix multiplication. Convolution may lower implicitly without materializing a huge image-to-column array. Element-wise additions and activations apply the same operation across values. Normalization and softmax also need reductions. Exponentials and other nonlinear functions may use special-function paths. The operator's data dependencies and reuse opportunities determine which execution unit can serve it well.

::fig[primitive-routing]

A transformer block can spend many FLOPs in projections yet still pay substantial time on normalization, softmax, memory movement or launches. Matching one expensive matrix operation to a matrix unit does not make the rest of the graph disappear. A separate device vector kernel and a CPU fallback have different costs: only the latter necessarily leaves the device.

### Compute Units

**SIMD** applies an instruction across multiple lanes. A **SIMT** programming model exposes many threads executed in groups. Divergent branches can serialize paths within a group and waste lanes. Matrix units perform blocks of multiply-accumulates. An FP16 or BF16 input path may accumulate in FP32. FP16 and BF16 have different range and precision even though both occupy two bytes. Consult the actual device's numerical contract.

A **systolic array** moves operands and partial sums through neighboring processing elements. Local transfers and repeated use can avoid returning to a distant memory tier for every multiply. The tiny example below holds one weight for two successive products. It does not assume every design uses the same dataflow or that every array cell remains busy.

::fig[local-reuse]

A supported 2:4 sparse path encodes two retained weights in each required group of four, plus position metadata. The unit uses those positions to pair retained weights with activations. Its advertised dense-equivalent throughput is conditional on the precise operation, grouping axis, format and shape. Speedup of the full model may be smaller because of metadata, other operators and data movement.

### Memory Systems

Distinguish ==capacity from bandwidth=={Fitting weights into device memory answers where they can reside. Reading them on every token can still exhaust the device-memory interface.}. A model can fit in device memory yet stream its weights slowly for every batch-one token. At fixed context length, the KV cache, activations, workspace and metadata can add both capacity and traffic. A large cache can change which interface is limiting, so name the boundary before counting bytes.

::fig[traffic-boundaries]

Registers are tiny and close to execution. Local SRAM or a scratchpad holds tiles. Shared cache and off-chip device memory provide progressively more capacity. Host memory and storage extend capacity across still slower boundaries. A DMA engine can overlap a transfer with independent compute, but dependencies and available links limit overlap. Pinned host memory supports DMA on relevant systems. It does not make a host-device transfer free.

Contiguous accesses can share fetched sectors. Scattered accesses may fetch many sectors for a small useful payload. A dependent lookup can also wait for an index before the payload address is known, leaving bandwidth idle. ==Low achieved bandwidth has more than one cause=={Wasted transferred bytes suggest poor spatial access. Long dependent stalls with unused bandwidth suggest a latency or concurrency problem instead. The [book's address figure](#book-figures) separates those mechanisms.}. Measure transactions, cache behavior, independent requests and stalls before choosing between reordering, prefetching, more bandwidth or a new format.

> [!method] Count the live state
> A particular mixed-precision Adam recipe stores 2 bytes of weights, 2 of gradients, 4 of FP32 master weights and 8 for two FP32 moments per parameter. Seven billion parameters therefore need 112 GB in decimal model-state bytes under this recipe, before activations, workspace and other overhead. Different optimizers and sharding schemes change the budget.

### Performance Bounds: Which Machine Wins?

Our fictional projection uses a $4{,}096 \times 4{,}096$ FP16 weight matrix $W$, an input matrix $X$ with $b$ columns, and FP16 final output. Accumulation is FP32 on chip. Count one multiply-accumulate as two FLOPs. For an **optimistic one-pass device-memory model**, start with weights and inputs in device memory and no on-chip copies. Read each weight and input once and write each final output once. No partial sums spill across that boundary. Finite on-chip storage may force rereads, while a warm cache from earlier work could reduce the bytes crossing this boundary.

::eq[projection-work]
$$
\begin{aligned}
O&=2mkb\\
D&=2(mk+kb+mb)\\
I&=O/D
\end{aligned}
$$

At batch 1, $O=33{,}554{,}432$ FLOPs and $D=33{,}570{,}816$ bytes, so intensity is about **1.00 FLOP/byte**. At batch 256, $O=8{,}589{,}934{,}592$ FLOPs and $D=37{,}748{,}736$ bytes, or **227.56 FLOP/byte**. Weight reads are amortized across columns. Both quantities count work for the entire batch, not a single request.

Compare two invented devices at the same workload and precision:

| Fictional device | FP16 matrix peak | Device-memory bandwidth | Ridge |
|---|---:|---:|---:|
| A: compute machine | 100 TFLOP/s | 500 GB/s | 200 FLOP/byte |
| B: bandwidth machine | 50 TFLOP/s | 1,000 GB/s | 50 FLOP/byte |

The roofline bounds a kernel's useful rate by the smaller of the supported compute peak and the memory supply rate. Its **ridge** is their intersection. Units must match: decimal TFLOP/s and GB/s give FLOP/byte after the factor of one thousand.

::eq[roofline]
$$
R\leq\min(P,BI),\qquad I_{\mathrm{ridge}}=P/B
$$

::fig[device-rooflines]

The ==two ridges are not the crossover=={B's bandwidth ceiling meets its own compute ceiling at 50 FLOP/byte. A reaches its own ridge at 200. Their two curves instead meet each other at 100 FLOP/byte.}. For positive intensity below 100 FLOP/byte, B has the higher ideal throughput ceiling. Above 100, A does. Since the devices perform the same work at each given batch, the higher rate ceiling gives the lower time floor. It does not guarantee a lower measured time.

For our one-pass square projection, $I(b)=4096b/(4096+2b)$. Batch 105 gives about 99.88 FLOP/byte, just below the crossover. Batch 106 gives about 100.78, just above it. The equality occurs at a non-integer batch of approximately 105.13 in this model. These are bounds for different workloads, so compare devices within each batch.

Equivalently, divide bytes by bandwidth and operations by peak compute. The larger term is a lower bound on elapsed time even under perfect overlap. Without overlap, a serial path may pay both. Dependencies, imperfect occupancy, other interfaces and dispatch can add time.

::eq[time-floors]
$$
t\geq\max\!\left(\frac{D}{B},\frac{O}{P}\right)
$$

| Batch | Device | Transfer floor | Compute floor | Larger floor |
|---|---|---:|---:|---:|
| 1 | A | 67.14 µs | 0.34 µs | 67.14 µs |
| 1 | B | 33.57 µs | 0.67 µs | 33.57 µs |
| 256 | A | 75.50 µs | 85.90 µs | 85.90 µs |
| 256 | B | 37.75 µs | 171.80 µs | 171.80 µs |

::chart[projection-floors]

At batch 1, B has the lower optimistic floor. At batch 256, A does. This ==does not prove either machine is faster in practice=={A lower bound cannot rank measured runtimes by itself. One-pass traffic, matrix-unit selection, achieved rates, dispatch and contention each need verification on the target devices.}. In particular, batch 256 is only modestly above A's ridge: extra traffic from tile reloads can change its modeled regime. Measure each candidate with the actual batch, latency target, precision and placement. Batching can improve throughput while making an individual request wait longer for peers.

### Hardware Mapping

**Spatial mapping** assigns work to processing elements or threads. **Temporal mapping** orders the loop iterations and decides what stays in local storage. For $Y_{ij}=\sum_k W_{ik}X_{kj}$, weight-stationary execution holds $W_{ik}$ across several batch columns $j$. Input-stationary holds $X_{kj}$ across output rows $i$. Output-stationary holds partial $Y_{ij}$ while the reduction index $k$ advances. The best order depends on shapes, storage, communication and the reuse it can actually capture.

::fig[stationary-choices]

Tiling divides the product into blocks that fit a fast memory tier. For FP16 weight and input tiles and FP32 output accumulators, all three live buffers must fit concurrently:

::eq[tile-capacity]
$$
2m_tk_t+2k_tn_t+4m_tn_t\leq C
$$

Use a $128 \times 128$ weight tile, a $128 \times 64$ input tile and a $128 \times 64$ accumulator. They require **32 + 16 + 32 = 80 KiB**. The fictional local store has 96 KiB, so these three fit in isolation. ==Double-buffering the weight and input tiles=={The existing 80 KiB already includes one FP32 accumulator. A second weight tile and input tile add 48 KiB. The accumulator is not duplicated in this example.} adds 48 KiB, making **128 KiB**, before alignment, workspace or other allocations. That schedule fails this one-store capacity test.

::fig[tile-budget]

A different mapping can use smaller tiles, stage buffers in another memory tier or forgo some overlap. All have performance consequences. Fringes can also waste lanes: a width of 4,100 padded to 4,224 for 128-wide blocks has only four useful values in the final block. The runtime may instead use a special tail kernel, so padding is a model of one possible implementation, not a universal rule.

### Compilers and Runtimes

A compiler ingests a graph, folds constants and fuses compatible operations, lowers work to loops or library kernels, and selects layouts, tiles and thread mappings. It can reuse physical buffers for tensors whose lifetimes do not overlap. A runtime dispatches variants for the actual shapes, manages memory and uses queues and events to honor dependencies without forcing the host to wait after every launch. Ordering of compiler passes differs among stacks.

::fig[compile-path]

A fixed-shape plan may not be the best plan for every dynamic batch or sequence length. Examine kernel names and device placement at the target shape. Fusion can remove an intermediate write and read, but keeping more live values may ==raise register pressure=={A fused kernel can use more registers per block, leaving room for fewer resident blocks. If that reduces latency hiding enough, the saved device-memory traffic may not pay for the fusion.} and reduce active blocks. A larger fused kernel can therefore lose even if its off-chip traffic falls. Compare the trace, peak memory and latency before and after the change.

### Beyond One Accelerator

Moving from one die to chiplets, multiple accelerators or multiple hosts adds communication boundaries with different bandwidth, latency and topology. More devices can also expand available capacity. Partitioning is worthwhile only when the useful compute saved outweighs the ==exposed communication=={In the [two-device example](#fig-partition-boundary), at least 10 µs of the 50 µs transfer must be hidden to tie the single-device time. More than 10 µs must be hidden to beat it.}, synchronization and imbalance on the critical path. Prefetch or independent work may hide part of a transfer. Dependent work cannot start until its inputs arrive.

::fig[partition-boundary]

In the fictional example, reducing a 100 µs compute term to 60 µs saves 40 µs. An additional 50 µs of serial communication raises the term to 110 µs. If that communication could fully overlap the 60 µs compute interval, their combined ideal duration would be 60 µs. Check actual dependencies and concurrency before assuming either extreme. Wafer-scale and tightly coupled designs reduce some boundaries but retain capacity, power and communication constraints.

### Heterogeneous SoC Design

A phone may place CPU cores, a GPU, a DSP and an NPU around shared physical memory under a small thermal envelope. A supported INT8 convolution may favor the NPU. Control flow or an unsupported operation may suit a CPU or GPU. ==Shared physical memory=={A camera frame can remain in the same LPDDR chips while a CPU and NPU access it in different layouts or compete for bandwidth. Sharing chips does not guarantee a zero-cost handoff.} can avoid an explicit copy yet still incur layout conversion, cache coordination and contention. Placement is a system decision.

::fig[soc-budget]

Dynamic voltage and frequency scaling trades performance against power and temperature. In a simplified CMOS model, dynamic power grows approximately with $CV^2f$. If voltage also has to rise roughly with frequency, it can grow approximately as $f^3$ over that range. This is a model, not a universal chip law. Record sustained clocks, temperature and throughput after warm-up. In a safety-critical application, deadline isolation and worst-case behavior can matter more than average throughput.

### Choosing an Accelerator

Start with the model's peak memory requirement and target input shape, precision, concurrency, latency and quality. Profile the work on each actual compiled backend. A bandwidth-limited projection may gain more from less traffic or more device bandwidth than from a larger matrix peak. A high-reuse projection may respond differently. Include unsupported operators, host work, physical links, software support and operational cost.

Power and energy are related by rate. During a steady measurement, divide average system power by completed useful results per second. At 200 W and 1,000 results/s, system C uses **0.20 J/result**. At 150 W and 500 results/s, system D uses **0.30 J/result**. Compare identical workloads and quality, with the same system boundary, including idle and host power within the interval.

::eq[energy-per-result]
$$
E_{\mathrm{result}}=P_{\mathrm{system}}/r
$$

::chart[energy-per-result]

Cost per result likewise depends on delivered throughput, uptime and total ownership cost, rather than peak arithmetic alone. Embodied manufacturing emissions and operational electricity emissions are separate lifecycle components. More useful work per device can amortize embodied emissions per result without necessarily reducing total emissions if total demand grows.

### Fallacies and Pitfalls

- **A peak is tied to a path.** Compare FP16 work with the dense FP16 matrix peak only when that path actually executes. A sparse peak, a different precision and a scalar unit are different denominators.
- **A good floor is not a timing.** Reuse may be incomplete, data-dependent accesses may expose latency, and launches or synchronization can dominate a small operation. The faster-bound device in the opening exercise still needs a measured comparison.
- **Offloading has a fixed cost.** Sending tiny operations individually to a device can spend more time in dispatch and transfer than the CPU would spend computing them. Consider batching, fusion or keeping the work on the host, then measure the full request.
- **Scaling and precision gains do not compose automatically.** A second device adds communication. An INT8 path needs compatible kernels, calibration and quality checks. Pruned weights need a matching sparse representation to skip work.

::fig[diagnostic-order]

### Summary

For the projection under the stated one-pass assumptions, the bandwidth machine has the lower floor at batch 1 and the compute machine at batch 256. The decision changes because batch changes work per byte. Hardware mapping, actual traffic, kernel coverage, precision and the rest of the request determine what survives in a measured system. The next chapter tests such predictions through benchmarking.

## The physics

| Quantity | Value | Use |
|---|---|---|
| Serial stage gain | $S=1/((1-f)+f/G)$ | At $f=0.4$ and $G=2$, a 200 µs request becomes 160 µs. |
| Movement and arithmetic energy | 640 pJ per 32-bit DRAM access, 5 pJ per 32-bit read from an 8 KB SRAM, 3.7 pJ per FP32 multiply | Historical 45 nm estimates for comparing events on that process. |
| Projection work | $2mkb$ FLOPs | Counts each multiply-accumulate as two FLOPs. |
| One-pass FP16 traffic | $2(mk+kb+mb)$ bytes | One weight and input read and one final output write, with no initial on-chip copies. This model excludes rereads and spills. |
| Batch 1 intensity | $0.9995$ FLOP/byte | Under the one-pass traffic assumptions for the fictional projection. |
| Batch 256 intensity | $227.56$ FLOP/byte | The weights stay fixed as work and activations grow with batch. |
| Roofline | $R\leq\min(P,BI)$ with ridge $P/B$ | Use the same precision and named memory interface for both ceilings. |
| Time floors | $t\geq\max(D/B,O/P)$ | Optimistic lower bound with perfect overlap. Actual time can be longer. |
| Tile fit | $2m_tk_t+2k_tn_t+4m_tn_t\leq C$ bytes | Includes FP16 operands and FP32 accumulators. Add workspace and double buffers separately. |
| Tile example | 80 KiB single-buffered, 128 KiB with duplicate weight and input tiles | Compare with the fictional 96 KiB local store. |
| System energy | $E=P/r$ | Watts divided by useful results/s gives joules/result for the same interval and power scope. |
| Dynamic power model | $P_{\mathrm{dyn}}\propto CV^2f$ | The further cubic approximation assumes voltage rises roughly with frequency. |

## Glossary

- **Accelerator**: processor or execution unit specialized for a narrower class of work.
- **Multiply-accumulate (MAC)**: multiplies two values and adds the product to an accumulator, commonly counted as two FLOPs.
- **Processing element (PE)**: local execution block in an array, often with nearby storage and connections to neighbors.
- **SIMD**: one instruction operates across multiple data lanes.
- **SIMT**: a programming and execution model that groups many threads for parallel instruction execution.
- **Systolic array**: a grid of processing elements that passes operands or partial sums through neighboring units.
- **Scratchpad**: explicitly managed local memory whose contents and transfers are controlled by software or a compiler.
- **Arithmetic intensity**: useful operations divided by bytes moved across a specified memory boundary.
- **Roofline**: a model bounding useful compute rate by arithmetic peak and bandwidth times intensity.
- **Ridge point**: intensity where the roofline's compute and bandwidth ceilings meet for a chosen path and interface.
- **Tiling**: partitioning work into blocks that fit a faster storage tier and can be reused there.
- **Stationary dataflow**: loop and placement choice that keeps an operand or partial output nearby while another dimension advances.
- **Occupancy**: active work resident on a processing unit relative to its supported capacity, often limited by registers or local memory.
- **DMA**: direct memory access, a mechanism for transfers that can proceed without the CPU copying each byte itself.
- **Dynamic voltage and frequency scaling (DVFS)**: adjustment of voltage and clock frequency to meet power, temperature or performance constraints.
- **Embodied emissions**: emissions associated with making and supplying a device before its operational electricity use.

## → Ben's world

- In the LLM benchmark harness, distinguish prompt prefill from batch-one decode and record context length, backend, precision and actual device. The same model can expose different reuse and bottlenecks in those two phases.
- For Greenveil's label-photo flow, trace image preparation, placement, inference and result handling together. If one operator falls back to the CPU, compare the complete request before paying for a faster matrix path.
- On the shared droplet, a faster inference kernel can still leave queueing, data movement or host contention on the critical path. Report sustained throughput and tail latency under the same load as well as the isolated kernel time.

## Open questions

- At the target batch and context length, how many bytes actually cross device memory per projection or decoded token, and how much is served by cache?
- Which kernels and precision paths does the target runtime select for the deployed shapes, including the last incomplete tile and any unsupported operator?
- Under sustained load, do host dispatch, thermal limits, queueing or transfers dominate the critical path after the model kernel improves?
