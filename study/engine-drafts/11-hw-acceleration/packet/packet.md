---
openingQuestion: "Which part of an accelerator limits this workload, and what evidence would justify changing the hardware or the mapping?"
---

# Hardware Acceleration: Study Packet

*Based on [Machine Learning Systems](https://github.com/harvard-edge/cs249r_book/blob/de87c0103806d7bfb1c677dbb77a2b92fa00c298/books/vol1/11_hw_acceleration/11_hw_acceleration.qmd) by Vijay Janapa Reddi and contributors (CC BY-NC-SA 4.0).*

## Thesis

Which part of an accelerator limits this workload, and what evidence would justify changing the hardware or the mapping? Start with an operator at the shapes, batch sizes, and precision the application actually uses. Count its arithmetic and the bytes that cross each relevant memory interface, then check whether its tiles fit in local storage and whether the compiler selects the intended execution units. Compare the resulting performance bounds with a profile to see which resource is saturated and which units are waiting. Carry the investigation through launches, transfers, synchronization, and sustained deployment conditions. A change earns its place when an experiment confirms that it relieves the diagnosed bottleneck and improves the application metric that motivated the work.

## Guided notes

### Identify the work worth specializing

An accelerator trades some of a general-purpose processor's flexibility for efficient execution of recurring operations. A CPU spends chip area and energy on machinery that handles branches, speculation, and a wide variety of instruction sequences. A dense linear layer offers a more regular workload. Its multiply-accumulate operations can share instruction control and reuse operands across many arithmetic units. Local storage and data paths make that reuse practical by delivering values at the rate the units consume them. As specialization raises arithmetic throughput, operand delivery can become the limiting resource. This integration bottleneck explains why a wider array may spend much of its time idle and why a smaller model file can leave request latency nearly unchanged.

Profile dense arithmetic, elementwise work, reductions, and irregular control separately at the deployed batch size. Follow a weight from its checkpoint through conversion, memory, and the matrix unit: storage in a narrow format reduces traffic only on interfaces it crosses while still narrow. Hold shapes and precision fixed when comparing hardware. A wider array also increases demand on local storage and data paths; ==operand delivery sets a boundary=={Additional arithmetic units help only when the data path can supply useful work to them.}

Consider an illustrative sensor classifier with irregular feature gathering followed by a dense projection. Suppose a batch-one trace attributes 8 ms to gathering and 2 ms to projection. Even eliminating projection time would reduce latency only from 10 ms to 8 ms, so investigate gathering first. For a large batch, suppose those phases take 10 ms and 40 ms respectively. Test the matrix engine there, then measure the complete pipeline; a faster projection matters only to the extent that its savings survive the remaining phases.

::fig[specialization-diagnosis]

Read the flow from phase profile through operand delivery to the full-workload test. If a larger array is chosen solely for its MAC count, the batch-one trace predicts little benefit because gathering dominates. Compare phase times and matrix-unit activity before and after the change; if activity is low while operand stalls are high, investigate the data path. The next step is to identify which execution units actually run each operator.

### Follow an operator to its execution units

A model graph exposes several kinds of work that call for different execution units. Vector operations apply the same instruction across many elements. Matrix operations organize multiply-accumulates into tiles so each fetched input or weight contributes to multiple outputs. Special function units and dedicated instruction paths help evaluate operations such as the exponential in softmax or the reciprocal square root in normalization. SIMD issues one instruction across lanes, while GPU SIMT exposes individual threads that typically issue instructions in groups. Tensor Cores execute instruction-driven matrix tiles. A systolic array passes values between neighboring processing elements in a timed pattern, reducing repeated register-file accesses. A single layer can move among these paths, so its performance depends on the mix of work and the cost of moving data between units.

Follow a score tile through the projection: input and weight tiles are staged in nearby storage, while partial sums remain close to the arithmetic cells before the scores pass to softmax. Check deployed shapes for partial tiles, SIMT branch divergence, and systolic fill and drain; each can consume cycles without useful work. Record multiply and accumulator precision separately. ==Zeros need a matching path=={A dense instruction still performs work on zero weights unless a supported sparse representation and kernel let it skip that work.}

For an illustrative ranking service, suppose a trace assigns 2 ms to projection and 6 ms to softmax, with high matrix-unit activity during projection. The softmax trace uses a general arithmetic sequence for exponentials. The flow's first step produces scores; the next subtracts their row maximum, followed by exponentials, a sum, and normalization. Benchmark a supported softmax implementation on the same inputs and compare both elapsed time and output error. If it meets the error requirement and reduces end-to-end latency, prefer that change before buying a faster matrix engine.

::fig[projection-softmax-path]

The path after projection contains reductions as well as exponentials, so speeding up exponentials alone need not remove all softmax time. A sparse-weight optimization would also be a poor response if the trace still selects dense matrix instructions. Inspect the selected kernel and instruction path, then retest the full operation. Next, account for the bytes moving between storage and those execution paths.

### Find which interface carries the bytes

An accelerator moves tensors through a hierarchy that trades capacity against access speed. Registers and local SRAM feed arithmetic quickly but hold small working sets. Device DRAM, including HBM on some accelerators, holds much larger tensors and supplies less bandwidth than the combined local paths. A discrete accelerator also exchanges data with the host over a separate link. The same tensor can cross several of these interfaces, so count traffic at the one under investigation. A dense operation can repeatedly use values already in local storage, while token-by-token decoding at small batch sizes can stream weights from device memory with little reuse. The memory wall appears when an interface reaches sustainable bandwidth and the arithmetic units wait for data.

Trace a weight tile from device DRAM into SRAM, through the compute units, and then account for result writes. Count every crossing of the interface being studied: a reload or an intermediate spill adds traffic even though it adds no new tensor to the model. Tensor sizes establish a capacity requirement; the execution schedule and hardware counters reveal traffic. ==Residency is not throughput=={A tensor can fit in device memory and still arrive too slowly to keep arithmetic units busy.}

The dominant objects change by phase: early vision layers may pressure activation storage, decoding reads weights and attention state, and training also retains gradients and optimizer state. On a shared timeline, compare host copies with kernels. Keeping intermediates on the device avoids host-link crossings; asynchronous copies can overlap work only when dependencies permit.

For an illustrative decoder, assume each separate request reads the same 64 MiB weight block once per token step. Four separate requests therefore read 4 × 64 = 256 MiB. If a batched kernel instead fetches the block once and reuses it for all four, it reads 64 MiB total, or 16 MiB per request. This accounting excludes activations and attention state. Measure those bytes and batch formation delay before deciding whether the batch improves the service.

::fig[tensor-interface-path]

Follow the flow from host transfer through DRAM, SRAM and result writes: each step has a separate byte count. If the model fits but device-memory bandwidth is saturated while compute units wait, adding capacity alone targets the wrong resource. Check interface counters and the copy/kernel timeline, then test reuse or device residency at the pressured crossing. Those byte counts also provide the input for a roofline estimate.

### Predict whether compute or bandwidth limits a kernel

The roofline model estimates kernel throughput from the arithmetic peak of the execution path and the bandwidth of a specified memory interface. Arithmetic intensity is the number of operations performed per byte crossing that interface. The bandwidth ceiling is bandwidth multiplied by intensity, and the kernel's modeled throughput is bounded by the lower of that ceiling and the compute peak. Their intersection, the ridge point, equals peak compute divided by bandwidth. A kernel below the ridge can benefit from moving fewer bytes or using a faster interface. A kernel above it has more reason to pursue better execution-unit utilization or a higher arithmetic rate. Profile the kernel to check whether it approaches the predicted ceiling.

For one kernel invocation, count operations and bytes at the chosen interface, then compare the time each resource would need. Use a consistent operation convention: if a multiply and an add count separately, each MAC is two operations, and the compute peak must use that convention too. The larger of operations divided by compute rate and bytes divided by bandwidth is a time lower bound. ==A bound is not a prediction=={Dependencies, poor utilization and sequential work can make elapsed time longer than either ideal resource time.}

Choose the peak for the supported precision path and bandwidth suited to the access pattern. If measured throughput lies far below both ceilings, inspect access efficiency, tile utilization, stalls and fixed overhead before selecting an upgrade.

Consider an illustrative kernel with 8 GFLOP and 2 GB of device-memory traffic, using decimal units. Its intensity is 4 FLOP/byte. At 16 TFLOP/s peak and 1 TB/s sustainable bandwidth, the ridge is 16 FLOP/byte; the lower ceiling is 4 TFLOP/s. Arithmetic needs at least 0.5 ms and transfer at least 2 ms, so the time bound is 2 ms. Doubling bandwidth raises the ceiling to 8 TFLOP/s and lowers the bound to 1 ms; doubling compute alone leaves it unchanged.

::fig[roofline-upgrade-comparison]

Read the bars as modeled throughput ceilings for that same kernel: baseline and doubled compute both reach 4 TFLOP/s, while doubled bandwidth reaches 8. Buying compute on the assumption that its peak halves runtime would miss the modeled byte limit. Check whether a profile actually shows device-memory saturation before testing a bandwidth upgrade. Next, examine whether operand and accumulator tiles fit on chip, since their placement can change traffic and intensity.

### Fit operands and accumulators on chip

A tile can exploit local reuse only when all values live at the same time fit in the storage available to its execution group. The working set includes input and weight tiles, partial sums, and temporary workspace. Double buffering reserves two copies of an operand tile so the next can load while the current one is in use. Accumulators often use a wider format than the operands, so their footprint can be substantial even with a single buffer. In a matrix multiply, reducing the output tile width shrinks the weight tile and the accumulator tile while the input tile stays the same size. That change can make a schedule feasible, but it can also produce more tiles and alter how often the input is loaded.

Budget each live allocation as element count × bytes per element × resident copies, then add workspace and other overlapping state. Follow an input tile as its current buffer feeds the matrix unit while the next buffer is filled; both occupy SRAM even though only one is being consumed. An accumulator remains live across reduction steps and may use more bytes per element.

Check each physical storage tier separately: registers cannot rescue an oversized shared-memory allocation. Account for padding, alignment, and concurrent tiles against the capacity actually available to the execution group. ==A capacity pass is only a feasibility test=={Execution-unit dimensions and measured reloads still determine whether the schedule is useful.}

For an illustrative shared SRAM budget, take a 96 × 128 input and 128 × 64 weights, both double buffered at 2 bytes per element. Their allocations are 48 KiB and 32 KiB. A single 96 × 64 accumulator at 4 bytes per element adds 24 KiB, and workspace adds 12 KiB. With 1 KiB = 1024 bytes and no other allocations, the total is 116 KiB against 96 KiB available: reject this candidate because it exceeds capacity by 20 KiB.

::fig[baseline-tile-storage]

The bars separate the four allocations from their total and the SRAM limit. Counting only the 80 KiB of operands would incorrectly accept the baseline; the accumulator and workspace remain live too. Check the compiler's allocation report for each storage tier and any spill or launch failure, then resize the tile or reduce residency. After finding a feasible candidate, inspect matrix-unit compatibility and profile input reloads: splitting an output region can require loading the same input again. The next mapping decision determines whether that potential reuse is actually captured.

### Turn reuse in the equations into reuse on the chip

Mapping turns a tensor operation into a plan for where work runs, what data each processing element holds, and in which order loops execute. A weight-stationary schedule keeps weights local while inputs stream past them. An output-stationary schedule keeps partial sums near the units that update them. An input-stationary schedule keeps input values local while different filters or output channels use them. Each schedule saves traffic for one operand and places different demands on storage, parallelism, and communication. Tile dimensions determine how much reuse fits, tensor layout determines whether accesses use memory efficiently, and fusion can keep intermediates near their producers. Choose these together because a locally attractive choice can force a layout conversion, spill, or synchronization elsewhere.

Start with the operator's loops and choose which values remain in registers or SRAM across iterations. Changing loop order, tile size, and placement together changes both the local working set and the traffic needed to refill it. Reject schedules that exceed a storage budget or violate execution-unit constraints before estimating traffic.

Logical shape alone is insufficient: inspect whether adjacent lanes access contiguous physical locations, and charge any layout conversion to the full comparison. Fusion can avoid writing and rereading an intermediate, but extends live ranges and may cause spills or reduce occupancy. ==Saved transfers must repay their costs=={A fused schedule can lose time if its extra live state restricts parallel execution.} Different operators in a graph can therefore merit different mappings.

Consider an illustrative audio classifier with a depthwise convolution whose filter coefficients are reused across time positions. One candidate reloads coefficients for every output tile; another assigns nearby positions to processing elements that retain their channel's coefficients. If the coefficients stay resident, predict fewer device-memory weight reads for the second candidate. Measure total bytes and elapsed time at the application's shapes: smaller channel groups may leave lanes idle, offsetting the saved reads.

::fig[mapping-candidate-selection]

Read the flow from reuse discovery through placement, storage and layout checks, fusion, and profiling. A largest-fitting-tile rule skips the last comparison and can select a schedule with too few independent tiles or costly edge handling. Inspect unit activity, traffic, and timing while comparing feasible tile sizes; choose the faster candidate under representative conditions. Then verify that the compiler and runtime actually execute the selected plan.

### Verify the plan the compiler and runtime actually execute

A machine learning compiler preserves tensor operations long enough to make graph-wide decisions about fusion, layout, precision, and memory lifetimes. It optimizes the graph, chooses kernels, plans storage, schedules computations, and generates code for the target. The runtime makes that plan work under current conditions by selecting a compatible variant, obtaining workspace, launching work, and enforcing dependencies between kernels and copies. Ahead-of-time compilation can specialize common shapes and shift compilation out of the request path. Just-in-time compilation can specialize a newly encountered shape, with compilation time on or near its first use. Changing shapes, concurrency, or available memory can change the selected path and move the bottleneck.

Follow an intermediate activation from its producer to its last consumer. The compiler can assign its buffer to a later tensor once that consumer finishes, but an asynchronous kernel may still be reading it after launch. Overlapping requests also keep multiple activations and workspaces live. ==A launch is not completion=={Reusing a buffer before dependent device work finishes can corrupt a later result.} Compiler diagnostics reveal fusion boundaries, layout conversions, kernel choices, and supported precision; a device trace establishes which choices actually ran.

Consider an illustrative image service with a common shape and an occasional wider shape. The common shape has a precompiled fused variant. The first wider request triggers compilation, then caches its variant. Hold the model, device, and other request conditions fixed while tracing a cold wider request and a subsequent warm one. Compare compilation, allocation, kernel, copy, and wait durations. If only the cold request exceeds the latency target and the warm variant meets it, precompile the wider shape when its frequency warrants the startup and cache costs.

::fig[graph-to-device-trace]

Read the flow from graph optimization through dispatch: the last step tests whether the earlier plan applies to this request. A fused graph alone could prompt an engineer to ignore a slow fallback. Check the selected variant and kernel launches for the wider shape, including under workspace pressure. If a generic path or synchronization remains slow when warm, investigate that path rather than compilation alone. The same trace discipline extends to transfers and waits between devices.

### Extend the bottleneck analysis across accelerators

Multiple accelerators can provide aggregate memory capacity, higher throughput, or shorter computation time. Each device still needs an efficient local mapping, and partitioning adds communication to account for. Data parallelism gives devices separate batches, normally with a model replica on each device. Training replicas must coordinate gradient updates. Model parallelism partitions layers or individual tensor operations so weights and runtime state can span devices, with activations or partial results crossing the partition. The location of that boundary matters. Chiplets communicate inside a package, wafer-scale designs keep more communication within the device, and board-level or network links impose their own bandwidth, latency, and contention limits. End-to-end latency depends on the communication and waiting exposed on the critical path.

A tensor shard produced on one device may be needed by an operation on another. Its transfer time depends on bytes, effective directional bandwidth, and message latency; many small messages can spend much of their time on fixed per-message costs. Shared links can reduce the bandwidth available to each transfer. ==Only exposed communication delays the critical path=={A transfer hidden completely behind useful work does not add its full duration to elapsed time.} Keep the workload and latency objective fixed when comparing mappings, and use a timeline to find dependent waits and unbalanced stages.

Take an illustrative operator that fits on one device and runs in 6 ms. A two-device partition reduces critical-path compute to 3 ms, but adds 4 ms of communication and synchronization with no overlap. Its predicted latency is 3 + 4 = 7 ms, so retain one device for this latency target. For a larger shape that exceeds one device's memory, evaluate sharding as a capacity solution and measure its latency at that shape. Independent replicas are another throughput option when the model fits on each device.

::fig[device-partition-critical-path]

Follow the flow from partition choice to per-device fit, messages, and exposed waits before comparing outcomes. Assuming two devices halve latency would favor the partition despite its slower 7 ms critical path. A timeline showing the next operation stalled on a transfer supports keeping the local mapping or reducing the exposed exchange. Subsequent end-to-end analysis should also include the rest of the pipeline and sustained power conditions.

### Map the full pipeline under a sustained power budget

A heterogeneous system-on-chip combines CPU cores, GPU execution units, digital signal processors, and neural processing units connected to shared memory. A deployment can assign each pipeline stage to the engine that handles its operations efficiently. Shared memory helps with data exchange, but engines may still require different layouts or precisions and wait for each other at boundaries. Unsupported operators or shapes can cause an accelerator delegate to split a graph and send part of it to another engine. At the same time, sustained work heats the device and can reduce clock rates. The best mapping therefore depends on whole-pipeline latency, shared memory traffic, and energy after the device has reached a representative operating temperature.

Trace one audio window from DSP features through the NPU graph to the CPU decision. Check delegate coverage at the deployed shapes and data types: an unsupported operation can split that graph, forcing the intermediate tensor to leave the NPU and return. At each boundary, account for the dependency wait, any layout or precision conversion, and cache maintenance required by the participating engines. ==Shared storage is not shared readiness=={A consumer must still see the producer's completed, correctly formatted data.} Concurrent stages can also compete for DRAM bandwidth, even when they use different engines.

For an illustrative wearable, keep the input windows, duty cycle, enclosure, and decision threshold fixed. The DSP extracts features, the NPU runs the keyword model, and the CPU applies the decision rule. A reduction inside the model falls back to the CPU, creating NPU-to-CPU and CPU-to-NPU handoffs. Test a delegate-supported formulation of that reduction after validating its output quality. Run both graphs until temperature and clocks stabilize; compare response latency and energy per detection window. Retain the formulation only if it meets the quality and deadline requirements and improves the desired metric.

::fig[soc-pipeline-evaluation]

The pipeline evaluation proceeds from assignment and fallback inspection to a full sustained run. A shared buffer may hide the cost of two waits and conversions in an operator-only profile; assuming those handoffs are free could lead to optimizing the NPU kernel while the pipeline still misses its deadline. Inspect delegate partitions and a cross-engine timeline, then check latency and frequency as the device warms. If the split dominates, remove it where quality permits; if latency rises with falling clocks, revisit the power budget or schedule. Those measurements also inform the hardware comparison that follows.

### Choose hardware by useful work delivered

Accelerator selection starts with constraints on memory capacity, numerical quality, latency, throughput, and power. Compare candidates using the actual operation mix, shapes, and software stack. Dense training can reward matrix throughput and fast interconnects. Small-batch decoding can put more weight on memory bandwidth and capacity. An embedded pipeline can depend on operator coverage and sustained power. Diagnose the limiting resource with traces and counters, then change one relevant factor and measure the effect. Rank feasible candidates by useful requests per unit cost and joules per useful request at the system boundary. Those figures reflect utilization, host work, and idle time when the measurement includes them. Emissions estimates also depend on cooling overhead, the electricity mix, and embodied hardware impacts.

Hold the request mix, quality threshold, and tail-latency target fixed while measuring each candidate. Count only successful responses delivered within the target, and measure power at the same system boundary. The resource limiting a request might be memory bandwidth, arithmetic capacity, or time lost to launches and communication; a peak compute rating cannot distinguish them. ==Useful throughput sets the denominator=={Work that misses the service requirement consumes energy without increasing the counted output.} Compare traces and counters, then vary one relevant shape, batch size, or mapping choice to test the suspected limit.

For an illustrative queued service, require at least 1,400 useful requests/s and assume additional throughput can be used. Both servers meet the same quality and tail-latency targets. A delivers 1,800 requests/s at 900 W for \$3.60/hour; B delivers 1,500 at 600 W for \$2.70/hour. Divide watts by requests/s: A uses 0.50 J/request and B uses 0.40 J/request. Divide hourly price by hourly useful output: A costs about \$0.56 per million requests and B costs \$0.50. Choose B under these assumptions; reconsider replica counts if demand exceeds its capacity.

::fig[accelerator-evaluation-sequence]

The evaluation sequence first filters by service requirements, then measures useful output, tests the bottleneck, and compares feasible systems. Ranking by peak performance per watt would skip those gates and could select a server that wastes power on idle time or late responses. Check system power and timely completions over a representative period, alongside latency and resource counters. If a candidate misses the target, adjust its configuration or reject it; otherwise compare energy and total cost at realistic load, including host, network, and capacity headroom.

## The physics

| Quantity | Value | Use |
| --- | --- | --- |
| Amdahl's law | Speedup = 1 / ((1 − f) + f / s), for accelerated time fraction f and phase speedup s | Bound full-workload speedup when only one phase is accelerated. |
| SIMD register capacity | 512 bits / 32 bits per value = 16 values | Count FP32 elements held in one 512-bit vector register; actual useful lanes depend on the operation and mask. |
| Traffic time lower bound | Bytes crossing an interface ÷ sustainable interface bandwidth, assuming steady transfer | Estimate the minimum time needed to move the counted bytes across that interface. |
| Roofline throughput bound | Throughput ≤ min(compute peak, interface bandwidth × arithmetic intensity), with intensity in FLOP/byte | Compare compute and interface ceilings for a specified execution path and traffic count. |
| Live storage footprint | Σ(elements × bytes per element × resident copies) + workspace bytes, for overlapping allocations in the same storage tier | Compare with the bytes allocatable to the execution group. |
| Loop-order search bound | n! orders for n distinct loops, ignoring dependencies and equivalent orderings | Estimate the size of a naive ordering search before applying legality and feasibility constraints. |
| Safe buffer reuse | After the last asynchronous consumer completes | Determine when a tensor's storage can be assigned to another live value. |
| Critical-path latency for the illustrative partition | 3 ms compute + 4 ms exposed communication and synchronization = 7 ms | Compare the partition with the 6 ms single-device latency. |
| Energy per detection window | J/window = energy consumed in joules ÷ detection windows processed | Compare sustained mappings over the same representative workload and measurement boundary. |
| Energy per useful request | J/request = average system power in W ÷ useful requests per second, at a steady operating point | Compare feasible systems measured at the same boundary and service requirements. |

## Glossary

- **Multiply-accumulate (MAC)**: An operation that multiplies two operands and adds the product to a running sum.
- **SIMD**: Single instruction, multiple data. One issued instruction applies across multiple data lanes.
- **SIMT**: Single instruction, multiple threads. Programmers express work as threads, and hardware typically issues instructions to groups of those threads.
- **Tensor Core**: An instruction-driven matrix unit that performs multiply-accumulates on small tiles in supported number formats.
- **Systolic array**: A grid of processing elements that pass operands or partial results between neighbors in a timed pattern.
- **Special function unit (SFU)**: A dedicated execution unit for operations such as exponentials or reciprocal square roots, depending on the architecture.
- **Arithmetic intensity**: Operations performed per byte transferred across a specified memory interface.
- **Roofline model**: A throughput bound given by the lower of compute peak and the product of bandwidth and arithmetic intensity.
- **Ridge point**: The arithmetic intensity at which the roofline's compute and bandwidth ceilings meet.
- **Tile capacity**: The limit on the tile operands, accumulators, and workspace that can reside together in the storage available to an execution group.
- **Local reuse**: Using an operand or partial sum multiple times while it resides near the execution units, avoiding repeated transfers from a slower tier.
- **On-chip storage**: Registers and SRAM within the chip that provide fast access to data near execution units.
- **Stationary dataflow**: A schedule that keeps a chosen operand or partial sum local while other values move through the compute units.
- **Kernel fusion**: Combining operations into one kernel so intermediate values can stay local and separate launches may be avoided.
- **Runtime fallback**: Execution through an alternate kernel or device when the preferred path cannot handle the current operation or conditions.
- **Critical path**: The longest chain of dependent work and waits that determines the earliest time a result can be ready.
- **Useful throughput**: The rate of successful results that meet the workload's quality and service requirements.

## → Ben's world

- When choosing a low-precision deployment path, verify that the compiler preserves narrow operands through memory and selects native instructions, then compare quality and latency at the target batch sizes.
- When a kernel spills or a tile is rejected, inventory simultaneously live allocations and compare feasible tile shapes using traffic counters, execution-unit activity, and elapsed time.
- When deciding between fusion and a hardware upgrade, use an interface-specific roofline estimate and test whether eliminating an intermediate write and read moves the measured bottleneck.
- When adding a second accelerator, use per-device memory estimates and a communication timeline to decide whether to replicate the model, split layers, or shard individual operations.
- When deploying a model on a mobile SoC, compare delegate coverage and handoff costs, then run the complete pipeline long enough to measure sustained latency and energy.
- When buying inference capacity, compare feasible deployments using useful requests per second, tail latency, cost per useful request, and system energy per useful request.

## Open questions

- For the narrow tile on a specific target, how do real alignment, workspace, and concurrency requirements affect its local storage needs, and does additional input traffic change which mapping is fastest?
- At what request mix and batch sizes does a deployed decoder move from streaming weights to another dominant cost such as attention-state traffic or matrix execution?
- Which fused kernels stay within register and SRAM limits across the production shape distribution, and where do spills reverse the expected traffic savings?
- Under concurrent traffic on the target interconnect, how much communication can a model partition hide, and which partition minimizes tail latency while meeting memory limits?
- How does the best CPU, DSP, GPU, and NPU placement change as the intended enclosure heats up and other device workloads contend for shared memory?
- Which candidate platform delivers the lowest cost and energy per useful request over the observed load cycle once idle periods, replica counts, and host resources are included?
