---
openingQuestion: "Which part of an accelerator limits this workload, and what evidence would justify changing the hardware or the mapping?"
---

# Hardware Acceleration: Study Packet

*Based on [Machine Learning Systems](https://github.com/harvard-edge/cs249r_book/blob/de87c0103806d7bfb1c677dbb77a2b92fa00c298/books/vol1/11_hw_acceleration/11_hw_acceleration.qmd) by Vijay Janapa Reddi and contributors (CC BY-NC-SA 4.0).*

## Thesis

Which part of an accelerator limits this workload, and what evidence would justify changing the hardware or the mapping? Start with one operator on the request's critical path. Its shape and precision determine the arithmetic it needs. Its execution schedule determines how often operands cross each memory boundary. Compare the time required for that work and traffic with the observed kernel time, then follow the result through the rest of the request. A change earns its place when it moves the predicted limiting metric, preserves output quality, and improves the deployment outcome that matters.

## Guided notes

### Why the same projection can need two different machines

Consider a visual inspection service that projects each image's feature vectors into a new representation. Each output is a sum of products. A CPU can evaluate these sums with a short loop, but it still spends instruction and register bandwidth directing the work. A matrix engine can direct many products with one instruction and distribute an operand to several arithmetic units. The benefit depends on how much of that regular work the service presents at once. One feature vector and a batch of vectors use the same learned weights, yet they offer quite different opportunities to reuse a weight after fetching it.

Write the projection as Y = XW. X has M rows of K features, and W has K rows and N columns. Each of the MN outputs takes K multiply-accumulates, for MKN in total. Count the rows the kernel actually receives. One image can contribute many spatial positions, and batching images increases M further if their positions share a projection.

Pick one weight, W[k,n]. It multiplies X[m,k] once for every row m, updating a different Y[m,n] each time. Those rows offer a ==reuse opportunity=={Several uses share a device-memory fetch only if the weight stays available on chip between uses.} A kernel can keep a weight tile nearby while visiting several rows, provided it also has room for their inputs and live sums. Trace an idle multiplier back to its missing operand. Even a resident tile can leave the multiplier waiting for a register read port or a wire carrying an activation. Adding multipliers increases demand on both.

For an illustrative service, assume one row per request, a weight matrix of S bytes, and a fresh device-memory read of the whole matrix per request. Eight separate requests then read 8S weight bytes. Schedule all eight rows against each weight tile before releasing it, and one pass reads S bytes, or S/8 per row. Test this schedule under representative arrivals. Record weight bytes per completed row and measure latency from arrival, including the wait for the eighth row. Adopt batching if it delivers the traffic saving and meets the service latency budget.

::fig[trace-one-weight]

The last step in the diagram counts reads of the weight traced in the first step. Eight distinct output sums are compatible with either one fetch or eight. If a smaller weight file leaves latency unchanged, inspect the bytes the running kernel reads and the instructions consuming them. Expansion before multiplication can change the execution path. If weight traffic did fall, time activation transfers and fixed request costs before predicting a further gain.

### Find the unit that executes each instruction

A projection followed by normalization exercises several parts of a chip. A matrix instruction forms a tile of dot products. Vector lanes can add a bias or compare activation values, and a reciprocal square root can use a special-function path. On a GPU, groups of threads issue instructions together and may cooperate on one matrix tile. On a systolic array, neighboring processing elements pass operands along a regular route and accumulate products as values meet. Both organizations exploit regularity, but a short reduction, a partially filled tile, or an unsupported numerical format can leave much of the advertised arithmetic capacity unavailable.

Consider clipping negative activations to zero. In SIMD code, a vector instruction compares several elements at once, one per lane. In SIMT code, a programmer can assign one element to each thread. The GPU groups threads to issue a common instruction. A maximum with zero works across the whole group. If a more elaborate activation compiles to branches and threads disagree on the branch, the group can issue instructions for each path with only the participating lanes active.

Now follow an activation entering the left edge of a weight-stationary systolic array. The first cell multiplies it by a resident weight and forwards the activation right. On the next cycle the neighbor uses it with another weight, saving a second central register-file read. It takes cycles for inputs to reach the far cells and for the last results to emerge. A long stream spreads those fill and drain costs over many outputs. A short stream can finish entering the array before all cells have useful work.

For an instruction-driven matrix tile, distinguish the ==operand and accumulator types=={A wide running sum can preserve contributions across a reduction even when the instruction reads narrow inputs.} Inspect both input types, the accumulation type and the supported tile dimensions. An edge tile may occupy a full instruction with only part of its output useful. Likewise, arithmetic savings from sparsity require a matching pattern, its expected representation and an instruction that skips products.

Suppose an illustrative trace starts with INT8 weights and activations. The runtime applies their quantization scales, produces floating-point tiles, then issues a floating-point matrix multiply. The stored tensors explain the compact model size. The emitted instruction determines the applicable arithmetic ceiling, and the conversions consume time before that instruction starts. Try a kernel accepting the actual dimensions, layout and scale scheme. Inspect the new trace for integer input operands and the intended accumulation type. Compare outputs against the reference on the same inputs, then time the projection from its first conversion through its final output. Select the integer path if it meets the error tolerance and reduces that elapsed time.

::fig[inspect-precision-path]

Read the audit from stored operands through to the result. A tensor containing many zeros can pass the first inspection and still reach a dense instruction at the third. Check the emitted operation before budgeting fewer arithmetic cycles. If the projection accelerates but request latency barely moves, time the following normalization. Its lanes must combine partial sums before the reciprocal square root can operate on the resulting variance. Even inside a fused kernel that dependency persists. Inspect repeated reads and writes around the reduction to determine which memory boundary carries the remaining traffic.

### Count bytes at the boundary the operator crosses

The byte count for a projection depends on where the observer stands. A weight might cross the host link once at startup, cross from device memory into on-chip storage once per batch, and travel from local storage to arithmetic units many times. Each boundary has its own bandwidth and its own opportunities for reuse. Capacity determines whether data can stay at a level. Access order determines whether successive operations find it there and whether each memory transaction carries useful values. A plausible diagnosis names the tensor, the boundary, and the interval over which traffic is counted.

Open the device-memory ledger when the projection’s first kernel starts and close it when its final dependent kernel finishes. Charge each weight tile when it enters the chip, including any refill after eviction. Count input activation reads and final output writes on the same basis. A partial sum held in registers adds no device-memory traffic during the reduction. If one kernel writes that sum to device memory and a second kernel reads it to finish the projection, enter the write under the producer and the read under the consumer. This ==accounting by crossing=={Changing the tile schedule can change the byte count even when the tensor shapes and arithmetic stay fixed.} captures what an implementation spends to produce the result.

Which tensor deserves local storage depends on when it will be used again. In single-row decoding, the next token can require another pass over the weight matrix. Processing several ready rows together can let each weight serve several rows before eviction. In an early vision layer, filters may already fit on chip while neighboring output tiles repeatedly fetch overlapping strips of a large input map. Retaining the shared activation strip can then save a refill on each successive tile.

Consider an illustrative single-row projection with 4,096 inputs and 4,096 outputs. Assume FP16 weights, inputs and outputs, one device-memory fetch per weight and input element, one final write per output element, and on-chip accumulation throughout. The matrix contains 4,096 × 4,096 weights. At two bytes each, they account for 33,554,432 bytes of reads. Counting a multiply and an add per weight gives 33,554,432 FLOPs, or one FLOP per weight byte. The input read and output write add 8,192 bytes apiece. The ledger therefore predicts 33,562,624 bytes read and 8,192 bytes written, for an intensity just under one FLOP per byte.

Compare those two entries with measured device-memory transaction bytes summed over every kernel in the projection. Excess reads warrant checking for tile refills or transactions that fetch unused values. To estimate the bandwidth the projection sustains, divide its measured read-plus-write total by elapsed time from the first kernel’s start to the final dependent kernel’s completion. Pairing both kernels’ traffic with only the producer’s duration would inflate the rate and could make a bandwidth upgrade look justified.

::fig[separate-memory-boundaries]

Follow one weight across the three boundaries. Its startup upload can disappear from the steady-state host trace while its device-to-local refill recurs on every token. At the engine, forwarding the value between cells can supply another multiply without another local-store read. If the weights already fit in device memory and counters still record roughly a matrix read per token, test whether processing ready rows together reduces bytes per row. If uploads recur, check the host timeline separately. A prefetch can hide its full transfer time only when the schedule permits independent computation, the copy and compute paths progress together, and the data arrives before its consumer needs it. Once the recurring crossing is identified, its byte count and bandwidth give a time floor to compare with the observed invocation time.

### Use the roofline to make a falsifiable prediction

For a kernel doing F operations and moving D bytes across a chosen interface, arithmetic intensity is F/D. Let P be the compute ceiling for the instructions in use, and B the bandwidth ceiling at that interface. Arithmetic needs at least F/P seconds and transfer needs at least D/B seconds. Even with perfect overlap, the kernel takes at least the larger of those times. Equivalently, its throughput is bounded by min(P, B × F/D). The ceilings meet at intensity P/B, called the ridge point. A kernel far below both ceilings calls for another measurement before either resource can be blamed.

Follow one projection from its instruction count to its device-memory counters. If each fused multiply-add contributes two FLOPs to the work, use the two-FLOP convention for the arithmetic rate too. Select the rate for the precision and instructions the kernel actually executes. For the transfer calculation, pair device-memory read and write bytes with a bandwidth for that interface. Substituting local-store bandwidth would shorten the calculated transfer time even though the same bytes still have to cross device memory.

Work backward from a throughput target before committing to a hardware change. At intensity I, every FLOP requires an average of 1/I bytes at the chosen boundary. Delivering R FLOP/s therefore requires R/I bytes/s. Compare that demand with bandwidth sustained for a similar access pattern and read/write mix. If the demand exceeds even the interface ceiling, the target is out of reach at the current traffic count. Look for repeated tile fetches or spilled partial sums. Eliminating a crossing increases intensity while leaving the projection's useful work fixed. Raising compute peak alone leaves the ==bandwidth demand at a given rate=={For fixed work and traffic, a target throughput requires the same bytes per second on a faster arithmetic engine.} unchanged.

Take an illustrative projection with 24 GFLOP of work and 6 GB of device-memory traffic, using decimal units. Suppose its instruction path supports 60 TFLOP/s and device memory supports 1.5 TB/s. Dividing 24 by 6 gives 4 FLOP/byte. The ridge is 60/1.5 = 40 FLOP/byte, so at this intensity the bandwidth ceiling permits only 1.5 × 4 = 6 TFLOP/s. A target of 12 TFLOP/s would require 3 TB/s. At the existing bandwidth ceiling, hitting that target would require cutting traffic to at most 3 GB for the same work.

Read each bar below as the minimum time for one resource to do its share. The arithmetic floor is 24 GFLOP divided by 60,000 GFLOP/s, or 0.4 ms. Moving 6 GB at 1,500 GB/s takes at least 4 ms. Doubling compute peak would halve the shorter bar and leave the 4 ms floor in place. If profiling confirms bandwidth saturation, test a mapping that reduces bytes.

::fig[compare-kernel-time-floors]

The tenfold difference in bar length predicts which resource sets the optimistic floor. It does not tell you how the kernel spent each millisecond. For example, an illustrative duration of 4.2 ms with 6 GB of counted traffic implies about 1.43 TB/s, close to the stated ceiling. A much longer duration with the same bytes implies lower delivered bandwidth. Before buying a wider interface, check whether dependent loads leave too few requests outstanding, partial tiles leave execution lanes idle, or the timing interval includes launch gaps. If counters instead identify repeated refills at high bandwidth, size the operand tiles and accumulators together to see which crossings a revised on-chip layout can eliminate.

### Fit operands and accumulators on chip

A tile promises local reuse only if all values needed at the same time fit in the available on-chip storage. During a double-buffered matrix multiply, one input buffer can feed the current computation while another receives the next block. The weights can use the same arrangement. Meanwhile, the output's partial sums must survive until the reduction finishes, and the kernel may need separate workspace. A tile capacity check counts every simultaneously resident allocation, using its own element width and buffer count, before crediting the schedule with any traffic savings.

Freeze the schedule just before the matrix unit finishes a reduction block. It still needs the current A and B blocks. Meanwhile, the transfer engine needs destinations for the incoming A and B blocks. Mark all four address ranges as occupied. When the transfers finish and the matrix unit releases the current pair, the two pairs can exchange roles. Overwriting either current block before its last read would feed the arithmetic values from the wrong reduction step.

Follow one output element across that exchange. Its accumulated products occupy one FP32 slot, and the next reduction step updates that same slot. The other output elements have the same lifetime. Converting the completed result to a smaller format saves bytes on the final store, but the conversion happens too late to shrink the live accumulator. The workspace also stays allocated through the exchange. Size the SRAM for ==peak live storage=={Two allocations can share an address range only when their lifetimes do not overlap.} at this point in the schedule. Changing the depth of a reduction block changes the size of both operand blocks while leaving the number of output slots fixed.

Consider an illustrative tile in a single 96 KiB SRAM, with 1 KiB equal to 1024 bytes. Assume tightly packed arrays, no alignment overhead and no allocations beyond those listed. One 96 × 128 input block at two bytes per element occupies 24 KiB. The current and incoming blocks together account for the 48 KiB input bar. One 128 × 64 weight block at the same precision occupies 16 KiB, so the weight bar is 32 KiB.

Each of the 96 × 64 output positions needs four bytes throughout the reduction. Those 24,576 bytes give the 24 KiB accumulator bar. Adding the separate 12 KiB workspace gives 48 + 32 + 24 + 12 = 116 KiB. The signed margin is capacity minus demand, or 96 − 116 = −20 KiB. Reject the planned overlap for this tile.

::fig[baseline-tile-storage]

Every allocation bar ends below the SRAM limit. Reading them one at a time would approve a schedule that needs all four at once. Compare the baseline total with the limit, then inspect the compiler’s allocation report at the prefetch step. If a kernel with these dimensions runs within 96 KiB, check whether the transfer starts only after the current operand storage becomes free, or whether the kernel places some state elsewhere. Either change affects the performance prediction. Rebuild the ledger for the schedule that actually runs before deciding which values are worth keeping local.

### Choose which values stay near the arithmetic

Two schedules for the same projection can execute identical arithmetic and generate different memory traffic. An output-stationary schedule assigns an output block to processing elements and holds its partial sums locally as successive blocks of the reduction dimension arrive. A weight-stationary schedule holds a weight block and brings it successive input rows. The choice shifts traffic among weights, inputs, and partial sums. Placement, layout, and fusion then determine how far values travel, how efficiently the machine accesses them, and whether the next operator can consume them before they leave the chip.

Pick one block of output columns and trace the loops at the boundary of a processing element’s local store. Suppose the projection spans R blocks of input rows and K blocks of reduction depth. Finishing one output block at a time brings in K input blocks and K weight blocks for that row block. If only the current operand pair fits alongside the sums, the same K weights must enter again for each of the R row blocks. The sums stay in place until the final store.

Now keep one weight block through all R row blocks before advancing the reduction. Each of the K weight blocks enters once, and each visit to a row block still needs its matching input. Trace the ==stationarity interval=={A refill is saved only when the next use occurs while the tile is still resident.} through to the next update of a particular sum. If each unfinished sum block must leave the local store between updates, it incurs a store and a reload at each of the K − 1 transitions. Where those transfers land matters when comparing them with the weight refills saved.

Check the addresses issued by adjacent lanes as well. Lanes reading neighboring elements can share a transaction. With a large stride, each lane may touch a different transaction and use only a few bytes from it. If a transpose makes the reads contiguous, charge its read, write and execution time to the candidate that needs it.

Assume an illustrative projection produces a 4 MiB intermediate whose sole consumer adds bias and clamps each element. With separate kernels, suppose the producer writes all 4 MiB to device memory and the consumer reads all 4 MiB back. Place the bias and clamp after the last reduction update in the producer. Each completed value can then pass directly to the activation arithmetic. The predicted saving at that boundary is 4 MiB written + 4 MiB read = 8 MiB. Both schedules still write the final output. Try the fused epilogue if the backend supports the operations and the tile fits. Retain it if outputs agree, counters confirm the predicted saving and the combined stage runs faster.

::fig[evaluate-a-mapping]

Read the flow from output placement through profiling. A count of weight refills gets only partway through the transaction step. Check partial-sum transfers and bytes per useful lane, then time the producer and consumer together. If fusion cuts intermediate traffic but elapsed time rises, inspect registers per thread, concurrent blocks and spill loads and stores. A larger live register set can limit concurrency or push temporary values into memory. Compare a smaller fused tile with the separate kernels on common shapes and on edge tiles where padding or masked lanes consume work. Carry the winning schedule into a request trace to see whether the stage saving reaches the critical path.

### Trace the compiled schedule through a real request

A tensor compiler can see that one operator produces a value consumed immediately by the next. While that relationship is explicit, it can fuse operations, choose a matrix kernel, plan storage lifetimes, and schedule transfers. Code generation turns those choices into executable instructions. The runtime then dispatches work under the shapes, workspace limits, and concurrency of an actual request. A fast compiled variant helps only on requests that select it, and a fast device kernel can still be preceded by a long host-side wait.

Pick one intermediate tensor and find its producer and every consumer in the optimized graph. If a projection and its activation fuse, the kernel can apply the activation before storing the result. If the next region requires a different layout, the plan may still materialize the tensor and launch a conversion. Match those regions to launches and copies on the device timeline. A conversion that reads one buffer and writes another accounts for traffic that a count of projection inputs and outputs would miss.

For each region, record the ==variant selection guard=={A cached executable is reusable only for inputs that satisfy its selection conditions.} alongside the variant that ran. An ahead-of-time build can prepare profiles for common dimensions. A just-in-time compiler can specialize an unfamiliar shape on arrival, then reuse that executable on a cache hit. Check when the stack makes each choice. TensorRT’s builder selects tactics using the permitted workspace, and its runtime selects a valid profile. Once the runtime submits a launch, hardware schedules its thread blocks.

Suppose a camera service normally sends 256 feature rows and occasionally sends 257. Keep the element type, layout, device, and workspace limit fixed. Warm the 256-row path, then submit two identical 257-row requests in sequence, waiting for the first to complete before submitting the second. For each request, mark arrival, cache lookup, compilation if any, launch, and completion. Compare host time before launch separately from device execution time.

If only the first 257-row request compiles and both dispatch the same kernel with comparable execution times, prepare that variant before serving traffic and repeat the first-request test. If both 257-row requests select a different kernel from the 256-row baseline and take longer on device, inspect the profile boundary and tile coverage. One extra row can leave most lanes in a final tile idle. Confirm the kernel’s tile shape before attributing the difference to that effect.

::fig[follow-the-compiled-plan]

Read the flow backward from dispatch. A warm replay can confirm that emitted code runs quickly while missing a wait introduced at the scheduling step. Replay the production mix concurrently and correlate each request’s selected profile, workspace allocation, and stream waits. If a launch waits for another request to release scratch space, test a lower concurrency limit and compare both tail latency and throughput. If it waits on a producer event, locate that producer. Its completion may include a transfer from another device.

### Decide what has to cross a device boundary

A workload can outgrow one accelerator because its state exceeds device memory or because one device misses the throughput target. Those pressures lead to different partitions. Replicating the model lets devices handle independent inference requests, but each replica must fit. Splitting layers sends activations between stages. Splitting a matrix operation can require a collective exchange within the operator. Package-level chiplets, links between accelerators in a server, and links between servers impose different costs on these transfers. The single-chip roofline still applies to local kernels, but it cannot price the synchronization that joins them.

Trace one output element back to its input features. Each feature supplies a product of an activation and a weight. Divide the features between two devices and give each the corresponding weight rows. Both devices now compute a contribution to every output element. The ==partial output shape=={Dividing the reduction dimension leaves each device with as many partial sums as there are elements in the full output.} determines how much data a device must contribute to the combine step.

Locate the consumer before pricing that step. If it runs on one device, the other can send its partial sums there for addition. Identify the physical route those bytes take. Chiplets join dies inside a package, and wafer-scale designs keep more work on one device. A split across server accelerators uses their actual peer connection. A split across machines also traverses the network.

Suppose the model fits on each of two accelerators and independent requests already keep one busy. Put a replica on each, route whole requests to each replica, and count completions per second at the required latency. This mapping adds capacity without introducing a partial-sum exchange. Now consider a single projection whose consumer needs the complete result on the first device. For illustrative timings, assume 100 µs on one device. With an equal feature split, suppose the two partial kernels start together and finish at 50 and 60 µs. If the transfer and addition then take 45 µs, the consumer starts at 105 µs. Keep the single-device projection for this latency goal.

::fig[trace-a-split-reduction]

At “Release the output,” follow both incoming contributions back through the combine step. Adding the faster kernel time to the exchange would predict a speedup while overlooking the late participant. Timestamp both partial completions and the consumer’s first usable input. If the implementation exchanges completed tiles early, charge only communication still exposed on the critical path. The same test applies when the producer and consumer are different engines on one chip.

### Follow an inspection frame across a heterogeneous chip

On a camera device, the projection shares a system-on-chip with image processing, control code, and rendering. A neural processing unit can execute supported dense layers, a DSP can process a sensor stream, and a CPU can handle irregular decisions. These blocks may share physical memory while using different layouts and synchronization protocols. Moving one operator to a faster block can therefore add waits and conversions at both ends. Sustained performance also depends on the power and heat generated by all active blocks in the enclosure.

Follow one frame from the sensor. The image signal processor prepares the pixels, a DSP extracts streaming features, and the NPU projects the feature tensor. The CPU can apply a decision rule to the resulting candidates, and the GPU can draw the overlay. At each handoff, record who owns the buffer, its layout and strides, and which event lets the consumer read it. A ==completion fence=={The consumer can receive a buffer handle before the producer has finished writing its contents.} lets the runtime express that dependency. If the engines lack coherent caches, the handoff may also require cache maintenance. If the consumer needs channels first and the producer stored aligned channels last, a conversion reads and rewrites the tensor through the shared memory system.

Assume the delegate report lists two NPU regions separated by a custom CPU scoring function. Use the split implementation as the baseline. For the same recorded frames, time the wait and input preparation, the scorer itself, and the preparation and dispatch needed to resume NPU work. Then express the score using supported operators and check that the delegate forms one region. Compare scores on representative defects, including cases near the decision threshold. Replay both mappings at the same capture rate with rendering enabled until temperature and engine clocks settle. Keep the supported implementation if it preserves the required decisions and improves sustained capture-to-overlay latency at the required frame rate.

::fig[trace-mobile-fallback]

Read the four boxes as a timeline for one tensor. A short CPU scoring interval between two long preparation intervals points to the cost of leaving and re-entering the NPU region. Optimizing the scorer on the assumption that shared buffers make both handoffs free would leave most of that delay in place. Check the fence timestamps and conversion traffic separately. If deadline misses grow only after warm-up, compare engine frequency, temperature, power and shared-memory bandwidth across the run. Falling clocks at a thermal limit call for retesting the sustained power budget. Count the frames that actually meet their deadlines when comparing devices.

### Choose hardware using completed work at the required service level

Hardware selection starts with a workload contract specifying input shapes, arrival patterns, accuracy, latency, and sustained throughput. Measure competing systems against that contract over the same interval. Useful throughput counts results that satisfy it. Dividing system energy and operating cost by that count connects a kernel-level improvement to a deployment decision. A credible case for new hardware identifies the saturated resource, shows how the candidate changes it, and verifies that the gain survives host work, communication, queueing, and sustained operation.

Timestamp a request when it arrives and when its result becomes available to the caller. Replay the same shapes and arrival times on each candidate. Increasing batch size can keep the device busy while the first request in each batch spends its latency budget waiting for the last one. Report latency percentiles over the offered requests, account for drops and timeouts, and count the results that meet the quality and deadline criteria. Measure energy over a ==common accounting interval=={Quiet periods consume energy even when they add no accepted results to the count.} that includes the idle time typical of deployment.

For a fleet, reserve enough capacity for arrival-rate variation. Divide the required result rate by the useful rate one server sustains at the planned utilization, then round up to whole servers. Include the energy of every provisioned server and state whether the measurement includes cooling. Turning that energy into operational emissions requires the electricity mix at the site. A lifecycle estimate also needs emissions from manufacturing the equipment. Cost per useful result requires prices, including purchase or rental charges over the service period.

Assume illustrative whole-server wall measurements over 60 seconds, excluding facility cooling. Both servers meet the service targets. A averages 300 W and returns 1,200 accepted results. Its energy is 300 J/s × 60 s = 18,000 J, or 15 J per accepted result. B averages 420 W and returns 2,100 accepted results, giving 25,200 J ÷ 2,100 = 12 J per accepted result. The bars labeled Server A and Server B use those quotients. Choose B if the objective is minimum energy per useful result at this load. Pricing is still needed to select on cost.

::fig[compare-energy-per-result]

B's shorter bar comes from completing 35 useful results per second against A's 20. Choosing A from the wattmeter reading alone would spend 3 extra joules per accepted result under these assumptions. Before ordering B, replay the deployment trace against the best validated mapping on A. If B's proposed advantage is reduced device-memory traffic, check bytes per request in hardware counters and time the affected operator. Then check arrival-to-result latency and accepted throughput. If queueing or host work absorbs the kernel gain, repeat the energy calculation with the observed useful count before committing to the fleet.

## The physics

| Quantity | Value | Use |
| --- | --- | --- |
| Dense projection work | MKN multiply-accumulates for (M × K) times (K × N) | Count M from the rows submitted to the projection, including spatial positions that use the same weights. |
| Matrix tile output utilization | Useful output elements / issued output slots, a dimensionless fraction | For a fixed tile shape, count padded edge slots in the denominator when estimating the fraction of tile arithmetic spent on useful outputs. |
| Arithmetic intensity of a single-row projection, counting weight reads alone | 2 FLOPs per FP16 weight ÷ 2 bytes per weight = 1 FLOP/byte, assuming one fetch per weight | Add all other reads and writes at the same boundary to obtain the invocation's device-memory intensity. |
| Bandwidth required for a target throughput | B_required = R/I, in bytes/s for R in FLOP/s and I in FLOP/byte | Compare the requirement with sustainable bandwidth at the interface used to count bytes. |
| SRAM capacity margin | Available KiB − peak simultaneously allocated KiB | A negative margin gives the storage shortfall. Include each live buffer at its allocated precision. |
| Intermediate traffic removed by fusion | 2S bytes for an S-byte intermediate written once and read once in full across the chosen boundary | Count the eliminated producer store and consumer load. Account separately for the final output and any spill traffic. |
| Request latency through device completion | L = (t_submit − t_arrival) + (t_complete − t_submit), in ms on a common timeline | Use the first submission for the request and completion of its final dependent operation. The second interval includes any device queue waits. |
| Remote partial-sum payload | M × N × s bytes for one dense M-by-N partial output sent once, with s bytes per partial sum | For a reduction onto one device, divide this payload by the directional link bandwidth in bytes/s to bound transfer time from below. |
| Memory traffic for a layout conversion | 2S bytes of logical buffer traffic for one full read and one full write of an S-byte tensor with equal input and output sizes | Estimate the work of a materialized conversion. Cache residency and padding can change the bytes observed at DRAM. |
| System energy per useful result | Mean system power (W) × elapsed time (s) ÷ accepted results = J per useful result | Sum energy across the provisioned systems and count accepted results over the same interval. |

## Glossary

- **Multiply-accumulate**: An operation that adds the product of two inputs to a running sum. A floating-point multiply-accumulate conventionally counts as two FLOPs.
- **Arithmetic intensity**: Operations performed per byte transferred across a specified memory interface during the same work interval.
- **Ridge point**: The intensity where the compute ceiling equals bandwidth times intensity for a particular device, precision path, and memory interface.
- **Tile capacity**: The storage budget available for all simultaneously resident data needed to execute a tile.
- **Local reuse**: Using a value multiple times after one fetch across a more distant memory boundary.
- **On-chip storage**: Storage on the processor die, including registers and local SRAM, that supplies nearby execution units.
- **Double buffering**: Using two storage regions so one block can be filled while the other is being consumed.
- **Stationary dataflow**: A schedule that retains a selected operand or partial sum near a processing element while other values move through it.
- **Systolic array**: A grid of processing elements that pass values between neighbors in a coordinated sequence to perform repeated arithmetic.
- **Kernel fusion**: Executing compatible operations in one kernel so intermediate values can remain local across their producer and consumer.
- **Runtime fallback**: Dispatch of an operation to an alternative implementation or engine when the preferred path cannot handle it.
- **Critical path**: The longest chain of dependent work and waits that determines when a request can finish.
- **Useful throughput**: The rate of completed outputs that meet the deployment's quality and service requirements.

## → Ben's world

- Decide whether to batch inspection requests by measuring weight traffic per image, queueing delay, and the fraction of images returned before the deadline.
- Evaluate a precision change by checking emitted instructions, bytes transferred, end-to-end time, and accuracy on the same inputs.
- Review a proposed fused kernel using a live-storage ledger and a prediction of intermediate traffic saved, then compare both with compiler reports and counters.
- Choose between model replication and partitioning by checking per-device capacity, independence of requests, and communication on the critical path.
- Compare procurement candidates with the same arrival trace and report cost and energy per accepted result at the required latency.

## Open questions

- At what arrival rate does batching first reduce the inspection service's deadline hit rate, and how does that threshold shift when the mix of input shapes changes?
- Which tensor accounts for the gap between predicted and measured device-memory traffic on the production projection, and which schedule change would distinguish reloads from spills?
- On the target camera, how much of the sustained frame-time increase comes from reduced clocks, shared-memory contention, or delegate handoffs? Which controlled runs would isolate each contribution?
- For the intended multi-device topology, which projection shapes save enough local computation to cover the measured cost of combining partial results?
