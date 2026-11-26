# hosts: Marcus | Iris

A: I'm Marcus, and this is Iris. We have two imaginary accelerators. One offers twice the matrix compute of the other. The other offers twice the memory bandwidth. Which one would you choose for a neural network projection?
![Hardware acceleration](/study/vol1/11-hw-acceleration/cover.webp)

B: I want to know the workload first. In our exercise the same projection runs at batch one and then at batch two hundred and fifty-six. We will hold each batch fixed while comparing the two machines. The answer changes with the batch.
::fig[device-rooflines]

A: Let's name them. Compute machine has one hundred trillion floating-point operations per second at its supported half-precision matrix path, and five hundred gigabytes per second of device-memory bandwidth. Bandwidth machine has half the compute rate and twice the bandwidth. These are invented, ideal ceilings, not measurements or product specifications.

B: Both run a weight matrix with four thousand and ninety-six inputs and four thousand and ninety-six outputs. Each weight and input takes two bytes. The final output takes two bytes, while the intermediate sums stay locally in thirty-two-bit precision. Count a multiply and an addition as two operations.
::fig[local-reuse]

A: Our generous traffic model reads each weight and each input once from device memory and writes each result once. It assumes no partial sums spill back to device memory. It also assumes the same projection shape, numerical path, and work on both machines at the chosen batch.
::fig[traffic-boundaries]

B: At batch one, the weights dominate. The projection does about thirty-three point six million operations and moves about thirty-three point six million bytes. That's almost one floating-point operation per byte. At batch two hundred and fifty-six, we reuse the weights across the input columns. The work rises much faster than the device-memory traffic.
::eq[projection-work]

A: Specifically, at the larger batch we do about eight point five nine billion operations and move about thirty-seven point seven five million bytes under the one-pass assumption. That is about two hundred and twenty-eight operations per byte. We have changed the workload, not made an individual weight read magically faster.

B: Next, compare the time each resource needs. Divide bytes by bandwidth and operations by the supported peak compute rate. Even if transfers and arithmetic overlap perfectly, the kernel cannot finish before the slower of those two floors. Neither floor includes launch overhead or guarantees the hardware will reach its advertised rate.
::eq[time-floors]

A: At batch one, the memory floors are about sixty-seven microseconds on Compute machine and thirty-four on Bandwidth machine. The arithmetic floors are much smaller. Bandwidth machine has the better ideal bound, despite its lower arithmetic peak.
![Which device has the lower time floor?](/study-audio/vol1/11-hw-acceleration/projection-time.svg)

B: At batch two hundred and fifty-six, Compute machine's arithmetic floor is about eighty-six microseconds and its transfer floor about seventy-five. Bandwidth machine needs at least about one hundred and seventy-two microseconds of arithmetic. Compute machine now has the better ideal bound. These are bounds for the whole batch, not measured request latencies.

A: The same comparison has a picture called the roofline. Arithmetic intensity is operations per byte across a named boundary. Multiply intensity by bandwidth and you get the rate memory could feed. Compare that with the supported compute peak. The smaller rate is the ceiling.
::eq[roofline]

B: Where those lines meet is the ridge point. Compute machine's ridge is two hundred operations per byte. Bandwidth machine's is fifty. Our batch-one example is well below both. At the larger batch it is above both, in this simplified accounting. Actual traffic, achieved rates, or a different bottleneck can put real execution somewhere else.
::fig[device-rooflines]

A: So how does hardware try to supply that work? A general CPU spends significant area on flexible control and caching. An accelerator devotes more resources to repeated parallel arithmetic and local operand storage. That trade pays when the operation, precision, layout, and shape are supported and there is enough work to use the array.
::fig[hardware-contract]

B: A projection can map to a matrix unit. Element-wise operations and reductions often run on vector units, while functions such as exponentials may use special-function hardware. One unsupported operation might still have a device kernel. Another might fall back to the CPU, requiring synchronization and a transfer. Those are different kinds of fallback.
::fig[primitive-routing]

A: In a matrix array, neighboring processing elements can pass operands and partial sums locally. Holding a weight close to a cell while different input values flow through lets that weight contribute repeatedly without every use returning to device memory. The exact arrangement depends on the chosen dataflow.
::fig[local-reuse]

B: The location of a byte matters for energy as well as time. The book cites illustrative older process estimates: one thirty-two-bit DRAM access costs about six hundred and forty picojoules, versus about five to read a thirty-two-bit word from an eight-kilobyte SRAM. They are not universal costs for today's chips, but they make the reason for reuse visible.
::fig[traffic-boundaries]

A: Capacity and bandwidth answer different questions. The weights may fit in device memory and still have to cross that interface every token. Registers and on-chip SRAM are smaller, so software loads tiles and uses them before eviction. Physical traffic depends on what stays cached and which boundary we are measuring.

B: Let's budget one tile. Use a weight tile one hundred and twenty-eight by one hundred and twenty-eight, an input tile one hundred and twenty-eight by sixty-four, and a thirty-two-bit accumulator one hundred and twenty-eight by sixty-four. Together they need eighty kibibytes. If the local store has ninety-six kibibytes, the three fit in this simplified allocation.
::eq[tile-capacity]

A: But double-buffering both input tiles and weight tiles adds another forty-eight kibibytes. Now the example needs one hundred and twenty-eight, which exceeds the stated store. A pipeline that overlaps fetching the next tile with computing the current one still has to fit its buffers. Registers, alignment, workspace, and occupancy matter too.
::fig[tile-budget]

B: Loop order chooses what stays nearby. A weight-stationary schedule reuses a weight tile across input columns. An output-stationary schedule keeps partial sums while it walks the reduction dimension. An input-stationary schedule reuses an input tile across output features. Which choice moves fewer bytes depends on shapes and available storage.
::fig[stationary-choices]

A: The compiler makes many of those choices. It can fold constants, fuse operators, select kernels, schedule tiles, and plan buffers from tensor lifetimes. The runtime then dispatches compatible variants for the shapes actually seen and manages device memory and dependencies. A dynamic batch can select a different kernel or expose an inefficient shape.
::fig[compile-path]

B: Fusion is not free either. Keeping an intermediate on chip can remove an expensive read and write, but the extra live values can increase register pressure and reduce the number of active blocks. The practical test is the compiled trace and timing, not the number of operators in the source graph.

A: Now zoom out from a kernel to a request. In a separate illustrative serial request, the baseline takes two hundred microseconds, of which eighty are in the projection. Halving only that stage saves forty microseconds, so the request takes one hundred and sixty. That is a one point two five times improvement, even though the stage is twice as fast.
::eq[amdahl]

B: If that projection became instantaneous, the unchanged one hundred and twenty microseconds would remain. And if stages overlap, we cannot just add their timings. We need a trace of the critical path and must account for what the actual change accelerates.

A: The boundaries get wider with more devices. Partitioning a projection can reduce each device's arithmetic, but intermediate results may need to cross a chip or network link. A transfer hidden under independent work has a different cost from one exposed on the critical path. Measure the latter against the computation saved.
::fig[partition-boundary]

B: On a phone, CPU, GPU, and neural engine may share physical memory and a power budget. Shared memory avoids some explicit copies, but layouts, cache coordination, and bandwidth contention can still cost time. Sustained heat can also change the clocks. Measure the whole workload after warm-up, not just a cold burst.
::fig[soc-budget]

A: Power alone does not settle efficiency. Imagine one complete system averages two hundred watts while finishing one thousand equivalent results per second. It uses zero point two joules per result. Another averages one hundred and fifty watts but finishes only five hundred per second, or zero point three joules per result.
::eq[energy-per-result]

B: Compare those figures at the same quality and with the same measurement boundary, and also check capacity, cost, tail latency, software support, and the real arrival pattern. Batching can raise throughput while waiting for enough requests increases latency. A better kernel bound is useful only if it survives these constraints.
::fig[diagnostic-order]

A: So the opening question has two answers. For our fictional projection at batch one, the bandwidth machine has the better modeled floor. At batch two hundred and fifty-six, the compute machine does. Before buying either, verify the traffic, chosen kernels, sustained rates, and full request on the actual workload.
![Which device has the lower time floor?](/study-audio/vol1/11-hw-acceleration/projection-time.svg)
