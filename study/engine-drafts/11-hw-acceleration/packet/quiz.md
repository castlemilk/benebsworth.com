# Hardware Acceleration self-test

1. A batch-one service spends 7 ms gathering features and 3 ms in a dense projection. A proposed matrix engine halves projection time but does not affect gathering. Which decision best follows for reducing request latency?
   - A. Replace the matrix engine first; it saves 5 ms per request.
   - B. Investigate gathering first; the new engine saves 1.5 ms per request.
   - C. Replace the matrix engine first; it halves total request latency.
   - D. Investigate gathering first; the new engine saves 3 ms per request.

2. A projection has half its weights set to zero. It runs with a dense matrix kernel on hardware that also supports a particular structured sparse format. The weights are not encoded in that format. Explain why the zeros may not reduce projection time and what you would test.

3. A decoder keeps all weights in device memory. Profiling shows the host link is mostly idle, device-memory bandwidth is saturated, and compute units often wait. Which change should the engineer test first?
   - A. Add device-memory capacity to hold a larger model.
   - B. Increase host-link bandwidth to accelerate transfers.
   - C. Batch requests to reuse weight reads across them.
   - D. Choose a device with a higher arithmetic peak.

4. A kernel performs 12 GFLOP and transfers 3 GB across device memory. Its execution path has a 24 TFLOP/s compute peak and 2 TB/s sustainable device-memory bandwidth. Decimal units apply. If a mapping change halves device-memory traffic without changing the operation count, explain how the modeled limiting resource and minimum time change.

5. A hypothetical matrix multiply uses a 96 × 128 input tile and a 128 × 64 weight tile. Both operands use 2 bytes per element and are double buffered; the 96 × 64 accumulator uses 4 bytes per element and is single buffered. A separate 12 KiB workspace is resident. Available SRAM is 96 KiB; 1 KiB = 1024 bytes. There are no other allocations, padding, or alignment. Halve the output width to 32, keeping all other dimensions, buffering, precision, and workspace unchanged. Calculate each allocation and the total in KiB. Does the tile fit, and how much SRAM remains?

6. A convolution kernel has two feasible mappings at the application's input shape. Mapping A uses a larger tile and estimates fewer weight reads, but profiling shows low lane utilization and longer elapsed time. Mapping B uses smaller tiles, has higher lane utilization, and completes sooner; both produce the required output. Which mapping should the engineer select for this workload?
   - A. Select mapping A because its estimated weight traffic is lower.
   - B. Select mapping A because its larger tile fits in local storage.
   - C. Select mapping B only after increasing its tile to match A.
   - D. Select mapping B and validate it across representative inputs.

7. A service has a precompiled fused variant for a fixed input shape. The same shape is fast with one request at a time but slow under concurrent requests, and traces show a different kernel variant with less workspace. Explain a plausible cause and how to test it.

8. An inference model fits on each of two accelerators. One replica completes a request in 10 ms. Sharding it across both reduces critical-path compute to 4 ms but adds 3 ms of non-overlapping communication. The objective is to minimize latency for one request. Which mapping should the engineer choose, assuming no other overhead?
   - A. Shard the request across both accelerators for a predicted 7 ms latency.
   - B. Run the request on one accelerator for a predicted 10 ms latency.
   - C. Run independent replicas and expect one request to finish in 5 ms.
   - D. Shard the request across both accelerators and expect a 4 ms latency.

9. An audio pipeline runs a supported NPU layer, an unsupported CPU operation, then another supported NPU layer. CPU and NPU share DRAM, but use different tensor layouts and do not share coherent caches. The NPU layers are individually fast, yet end-to-end latency is high. Explain what to inspect and how a supported replacement for the CPU operation could change latency.

10. A service needs 800 timely, successful requests/s. Two servers meet the same quality and tail-latency targets at their stated steady rates, and the service can use all additional throughput. Server X delivers 1,000 useful requests/s at 700 W; server Y delivers 900 useful requests/s at 540 W. Which single-server choice minimizes operational energy per useful request?
    - A. Choose server X.
    - B. Choose server Y.
    - C. Use either server; their energy per request is equal.
    - D. Reject both servers for insufficient capacity.

## Answer key

1. B. The projection falls from 3 ms to 1.5 ms, so total latency falls from 10 ms to 8.5 ms. The closest competing choice counts the entire original projection time as saved, which would require eliminating that phase rather than halving it.

2. The dense instructions still execute the matrix operations for zero-valued weights. Check whether the zero pattern meets the hardware's structured sparsity rules, encode it in the supported format if it does, and benchmark a kernel that uses that format. Compare projection and end-to-end time, including encoding or operand-handling costs, and verify output accuracy.

3. C. A higher arithmetic peak is a strong competing choice, but the units are waiting for weight data. Reusing weight reads targets the saturated device-memory interface; extra capacity or host-link bandwidth does not address the observed limit.

4. Initially the intensity is 4 FLOP/byte, so the bandwidth ceiling is 8 TFLOP/s and the minimum time is 1.5 ms. Halving traffic to 1.5 GB raises intensity to 8 FLOP/byte and the bandwidth ceiling to 16 TFLOP/s. That remains below the 24 TFLOP/s compute peak, so the kernel is still bandwidth limited in the model, and its minimum time falls to 0.75 ms. A profile is needed to establish whether the implementation approaches that bound.

5. Input buffers: 96 × 128 × 2 × 2 / 1024 = 48 KiB. Weight buffers: 128 × 32 × 2 × 2 / 1024 = 16 KiB. Accumulator: 96 × 32 × 4 / 1024 = 12 KiB. Workspace: 12 KiB. The total is 48 + 16 + 12 + 12 = 88 KiB, so it fits in 96 KiB with 8 KiB remaining.

6. D. Mapping B already completes sooner at the relevant shape. The strongest competitor, A, saves estimated weight reads, but its low lane utilization and longer measured time show that reuse alone does not determine the result.

7. Concurrent requests can reduce available workspace, causing the runtime to select a compatible lower-workspace variant even though the shape has not changed. Compare variant IDs, workspace availability, allocations, and kernel durations at low and high concurrency. Then adjust workspace limits or concurrency and repeat the trace to see whether the original variant returns and latency improves.

8. A. The sharded critical path is 4 + 3 = 7 ms, below the single-device 10 ms. The strongest competing choice, one accelerator, avoids communication but retains the full 10 ms of compute. Independent replicas can increase throughput but do not split one request; sharding still pays the exposed communication cost.

9. Inspect the two graph boundaries in a timeline, including waits, layout conversions, cache maintenance, and intermediate DRAM traffic. A supported replacement can keep the intermediate on the NPU and remove both cross-engine handoffs, reducing those costs. Validate output quality and measure the full pipeline because the replacement's own execution cost may offset the savings.

10. B. X uses 700 ÷ 1,000 = 0.70 J/request; Y uses 540 ÷ 900 = 0.60 J/request. Both exceed the required capacity, so Y minimizes energy per useful request. X's higher throughput is the strongest competing reason to choose it, but its power rises enough to make each useful request cost more energy.
