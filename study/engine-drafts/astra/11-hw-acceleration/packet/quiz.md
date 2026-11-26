# Hardware Acceleration self-test

1. A camera submits one frame at a time. Its runtime launches a separate projection for each of 24 spatial positions, all ready together and using identical weights. Each launch streams the weights from device memory. Waiting for another frame would miss the deadline. Which mapping should the team test first?
   - A. Group consecutive frames as rows of one tiled projection.
   - B. Group the ready positions as rows of one tiled projection.
   - C. Keep separate launches and distribute positions across more matrix engines.
   - D. Keep separate launches and divide each position into smaller feature blocks.

2. A runtime fuses a projection and row normalization into one GPU kernel. On identical inputs a new matrix instruction halves the time spent forming dot products, yet the kernel time changes little. A trace places most remaining cycles between the last product and the first normalized output. Explain how that can happen and how to distinguish two possible causes.

3. A vision kernel's filters stay in on-chip storage throughout an invocation. A device-memory trace attributes most reads to the same input rows being fetched for adjacent output tiles. The host finishes its upload before inference begins. Which mapping change should you test first to reduce device-memory reads?
   - A. Reserve additional on-chip storage for filters across adjacent output tiles.
   - B. Prefetch the next image from the host while computing the current image.
   - C. Process adjacent output tiles consecutively and retain their shared input rows on chip.
   - D. Keep completed output tiles on chip until the last tile has finished.

4. A gather kernel performs 8 GFLOP and reads 4 GB from device memory, with negligible writes. Its arithmetic path peaks at 40 TFLOP/s, and independent reads of the same transaction size sustain 1 TB/s. Use decimal units. The kernel takes 20 ms. A trace reveals that the address of each read depends on the previous result within its chain. Explain the gap and propose a test that keeps the work and byte count fixed. Assume several independent chains are ready.

5. A matrix multiply uses a 96 × 128 input tile and a 128 × 64 weight tile. Halve the output tile width from 64 to 32, keeping the row count and reduction depth fixed. Inputs and weights each use two buffers and two bytes per element. The accumulator uses one buffer and four bytes per element. A separate 12 KiB workspace stays resident. The SRAM has 96 KiB, with 1024 bytes per KiB and no padding, alignment overhead or other allocations. What are the four contributions and their total? Decide whether the tile fits and report the signed capacity margin.

6. A projection must minimize elapsed time for a fixed batch. Two supported schedules give equivalent outputs on that batch. Repeated timings include every required layout conversion and vary by less than 1 µs. The weight-stationary schedule takes 38 µs and reads each weight tile once. The output-stationary schedule takes 31 µs and reads each weight tile twice. Counters show frequent partial-sum stores and reloads only in the weight-stationary run. Which deployment decision follows?
   - A. Deploy the weight-stationary schedule for its lower weight refill count.
   - B. Defer selection until the two schedules use the same loop order.
   - C. Defer selection until the layout conversion times are excluded.
   - D. Deploy the output-stationary schedule for its shorter measured stage time.

7. Two concurrent requests hit the same compiled profile. Each uses a separate stream, and their inputs are already resident. The allocator gives both requests the same scratch address and inserts an event before the second kernel can use it. Kernel durations match an isolated replay, but the second request finishes late. Explain the delay and propose a test that preserves correctness.

8. Two accelerators now split a projection by output columns. Each holds the full input and all weights for its assigned columns. The next operator applies an elementwise activation on the same device, and later consumers accept column shards. Which dispatch decision satisfies these dependencies with the least inter-device traffic?
   - A. Launch each local activation as soon as its own output columns are ready.
   - B. Gather both column shards on one device before launching the activation there.
   - C. Sum the two column shards across devices before launching each local activation.
   - D. Exchange copies of the column shards before launching the two local activations.

9. An inspection camera must decide on each frame within 20 ms of capture. A runtime update makes its scorer compatible with the NPU. The delegate now reports one region, conversion events disappear, and defect decisions still match. Frames meet the deadline on startup. After ten minutes in the sealed enclosure, NPU frequency falls as the device reaches its thermal limit and frames begin arriving late. How would you test whether changing the scoring implementation again would recover the deadline?

10. A site must deliver 90 quality-approved inspections per second within its deadline. At the allowed utilization, including reserved headroom, one X server sustains 40 such results/s and one Y server sustains 50. Provision whole servers of one type. Assume each provisioned X draws 200 W and each Y draws 260 W throughout the hour, including spare capacity. Both fleets receive the same steady demand, and cooling is outside the boundary. Which configuration meets demand with the least wall energy?
    - A. Provision three X servers for the inspection service.
    - B. Provision two Y servers for the inspection service.
    - C. Provision two X servers for the inspection service.
    - D. Provision three Y servers for the inspection service.

## Answer key

1. B. The positions already supply independent rows, so one kernel can reuse a weight tile across them within the frame deadline. Grouping frames also creates reuse, but incurs the arrival delay the service cannot afford.

2. Normalization needs row statistics. Threads can form partial sums independently, but their results must be combined before the inverse standard deviation is available to scale an output. Fusion removes a launch while preserving that dependency. Inspect the reduction instructions and synchronization stalls to see whether lanes are waiting for other partial sums. Then inspect the reciprocal-square-root instruction or approximation sequence and its dependent stalls. Time those intervals separately to decide whether to change the reduction mapping or the special-function path.

3. C. Retaining the shared rows removes a device-memory fetch on the next tile's visit. Extra filter storage targets an already resident tensor, so it leaves the observed repeated reads in place.

4. The arithmetic floor is 0.2 ms. The independent-read bandwidth gives a 4 ms transfer estimate, but the kernel delivers only 4 GB / 0.020 s = 200 GB/s. A chain has to wait for a result before issuing its next read, so too few simultaneous chains can leave the interface idle even while execution stalls on memory. Interleave more of the ready chains, preserving the order within each one. Verify the same transaction bytes and look for more outstanding reads, higher delivered bandwidth and shorter execution. That combination would support limited memory parallelism as the cause.

5. Input storage stays at 96 × 128 × 2 × 2 / 1024 = 48 KiB. Weights need 128 × 32 × 2 × 2 / 1024 = 16 KiB. The accumulator needs 96 × 32 × 4 / 1024 = 12 KiB. Workspace adds 12 KiB. The total is 48 + 16 + 12 + 12 = 88 KiB. The tile fits with a signed margin of 96 − 88 = +8 KiB.

6. D. The 31 µs schedule meets the stated objective and its timing advantage exceeds the observed variation. Reading each weight tile once favors the other schedule on one counter, but its partial sums cross the storage boundary repeatedly. The measured time includes both effects and the required conversions.

7. Both kernels need exclusive use of the same scratch bytes. The event orders the second use after the first kernel releases them, so the second request spends time waiting even though its kernel runs at the usual speed. With enough free device memory, assign disjoint scratch buffers and replay the pair. Check whether the event wait disappears, whether completion latency falls, and whether both outputs remain correct. Separate streams permit overlap when hardware resources are available.

8. A. Each device reduces over all input features for its own columns, so its local values are complete. Gathering would produce a valid dense tensor, but the activation reads one element at a time and downstream consumers accept the existing shards. The gather would introduce a transfer and a dependency without supplying a needed operand.

9. Trace late frames from capture to decision and check whether time accumulates in the scorer, elsewhere in the NPU region, or in a queue waiting for earlier frames. Compare the old and new mappings at the same capture rate after each reaches thermal equilibrium, recording power, clocks and deadline misses. The update removed the conversion work, but a lower sustained clock can lengthen the remaining work and let a queue grow. Change scoring again only if a quality-preserving alternative reduces sustained critical-path time enough to recover the deadline.

10. B. Two Y servers sustain 100 useful results/s and use 520 Wh in the hour. Three X servers also meet demand, but together they use 600 Wh despite the lower wattage of each server. Two X servers fall short at 80 results/s, and a third Y adds power without increasing the required work.
