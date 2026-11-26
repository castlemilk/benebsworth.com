# Hardware Acceleration: Self-test

Try the questions before opening the answer key. These questions adapt the chapter quiz bank and add worked examples from this packet.

## 1. A layer-normalization kernel has intensity 4 FLOP/byte on a device with 1.5 TB/s memory bandwidth and a compatible 312 TFLOP/s compute peak. What is its simple roofline rate ceiling?

- **A.** 4 TFLOP/s, because the numerical intensity itself sets the ceiling.
- **B.** 208 TFLOP/s, because peak compute divided by bandwidth is the ceiling.
- **C.** 6 TFLOP/s, because the bandwidth roof is lower than the compute peak.
- **D.** 312 TFLOP/s, because the supported arithmetic peak sets the ceiling.

## 2. A batch-one decoder fits entirely in device memory but still spends most of its token time streaming weights. Which distinction best explains this?

- **A.** Capacity measures how quickly weights can be read. Bandwidth measures the number that fit.
- **B.** A resident weight can always be supplied at the rate needed by every matrix unit.
- **C.** If weights fit, only the capacity of the host memory can limit each decoding step.
- **D.** A model can fit in device memory while bandwidth still limits repeated weight reads.

## 3. For $Y_{ij}=\sum_k W_{ik}X_{kj}$, which loop can reuse a locally held weight $W_{ik}$ without changing it?

- **A.** Vary output row $i$ while retaining an input element $X_{kj}$ across rows.
- **B.** Vary output column $j$ while using the same weight for different input columns.
- **C.** Vary reduction index $k$ while retaining partial output $Y_{ij}$ in local storage.
- **D.** Vary both $i$ and $k$ while retaining the output column index $j$.

## 4. A model has 50% zeros scattered across a weight tensor. When can an advertised 2:4 sparse matrix path exploit it?

- **A.** When the per-group pattern, axis, representation, operation, shape and sparse kernel are supported.
- **B.** When the tensor has 50% zeros overall and the compiler can use any dense kernel for its shape.
- **C.** When the stored weights are smaller but are expanded to a full dense tensor before computation.
- **D.** When activations contain 50% zeros, even if the weight groups violate the required pattern.

## 5. A projection uses a matrix unit, but a normalization operation does not. What should you check before calling that normalization a CPU fallback?

- **A.** Count the total matrix multiplications and check whether they dominate the model FLOPs.
- **B.** Compare host and device memory capacity and check whether the complete model fits on device.
- **C.** Inspect the trace for an on-device vector or reduction kernel as well as any host transfer.
- **D.** Check whether the projection and normalization use tensors with identical dimensions.

## 6. A phone CPU, GPU and NPU share physical memory. Which cost can still remain when moving a model between them?

- **A.** A shared RAM address forces every engine to run at the same clock frequency and precision.
- **B.** A shared RAM address guarantees that each engine uses the same layout and cache state.
- **C.** A shared RAM address removes bandwidth contention as long as the model fits in memory.
- **D.** A shared RAM address can still incur layout conversion, cache coordination and contention.

## 7. After fusion, a GPU kernel moves fewer device-memory bytes but takes longer. The profiler reports twice as many registers per thread and half as many resident blocks. Which follow-up experiment best tests the mechanism suggested by these counters?

- **A.** Test whether the grid is too small by sweeping batch size and measuring the number of blocks launched.
- **B.** Try a tile that needs fewer registers and compare active blocks, spills and kernel time.
- **C.** Test a different input layout and compare cache hit rates and bytes transferred per memory transaction.
- **D.** Compare host enqueue times and queue dependencies to see how long the next operation waits.

## 8. Explain to a teammate why the fictional bandwidth machine has a lower ideal projection floor at batch 1 while the compute machine has a lower floor at batch 256. Why does that result not prove the actual winner?

## 9. A projection takes 90 µs on one device. A two-device partition reduces its compute to 55 µs, requires a 50 µs transfer and adds a 5 µs serial barrier. Profiling shows 18 µs of the transfer currently overlapping compute. Does the split win today, how much transfer must be hidden to beat the one-device time, and which trace intervals would verify the overlap and the barrier?

## 10. A serial request takes 250 µs. A projection consumes 150 µs of that baseline and is made 3 times faster. All other work stays fixed. Calculate the new request time, end-to-end speedup and maximum speedup if that projection became instantaneous.

## 11. An FP16 weight tile is 128 × 128, its FP16 input tile is 128 × 32, and its FP32 accumulator is 128 × 32. How many KiB are live with one set of tiles? Can a second weight and input tile coexist with a further 1 KiB of workspace in a 96 KiB local store?

---

## Answer key

**1.** **C.** Bandwidth times intensity is 1.5 TB/s × 4 FLOP/byte = 6 TFLOP/s. The compute ceiling is higher, so 6 TFLOP/s is the tighter modeled ceiling. A lower actual rate may have other causes.

**2.** **D.** Fit is a capacity check. Repeated reads can still saturate or wait on the device-memory path, even though every weight is resident there.

**3.** **B.** For fixed $i$ and $k$, varying $j$ uses the same weight in different output columns. The input and partial output change. Whether this schedule is best depends on storage and the rest of the traffic.

**4.** **A.** The local pattern and supported sparse execution path matter. Global sparsity does not establish that each hardware group meets the required contract.

**5.** **C.** Not all device operations use matrix units. An on-device kernel can have its own launch and memory costs. A CPU fallback can also require host-device transfer and synchronization.

**6.** **D.** Shared physical RAM can avoid an explicit copy while accesses, layouts, cache coherence, contention and the shared thermal envelope still affect execution.

**7.** **B.** The counters point to register pressure limiting the number of blocks that can run together. Keep the inputs and device fixed. If the new tile admits more active blocks and runs faster, check spill traffic before attributing the gain to occupancy. Grid size, cache behaviour and host queueing are separate hypotheses.

**8.** At batch 1, reading the weight matrix dominates about 33.57 MB of one-pass traffic for 33.55 million FLOPs, so both machines have a memory floor and the 1 TB/s bandwidth machine has the lower one. At batch 256 the same weight read serves many columns, giving 227.56 FLOP/byte in the one-pass model. That batch-256 intensity exceeds both stated ridges, so the 100 TFLOP/s machine has the lower compute floor. These are optimistic bounds. Real traffic, cache, kernel selection, achieved rates, overlap and launch costs must be measured at each batch.

**9.** The split loses today: $55+(50-18)+5=92$ µs against the 90 µs baseline. If the transfer were fully exposed it would take $55+50+5=110$ µs, so with $h$ microseconds hidden the term is $110-h$. Hiding exactly 20 µs ties the single device, so a win needs more than 20 µs hidden. Full overlap would give an ideal $55+5=60$ µs. Verify the transfer's start and finish timestamps against the compute interval — measured overlap, not assumed — plus the barrier's synchronization point on the critical path and link traffic during the transfer.

**10.** The unchanged work is $250-150=100$ µs. The faster projection takes $150/3=50$ µs, giving $100+50=150$ µs per request. End-to-end speedup is $250/150=1.67\times$. If the projection were instantaneous, 100 µs would remain, so the maximum is $250/100=2.5\times$.

**11.** The weight tile takes $128\times128\times2=32{,}768$ bytes, or 32 KiB. The input takes $128\times32\times2=8{,}192$ bytes, or 8 KiB. The accumulator takes $128\times32\times4=16{,}384$ bytes, or 16 KiB. One set totals 56 KiB. A second weight and input tile adds 40 KiB, reaching exactly 96 KiB. The required 1 KiB workspace raises the allocation to 97 KiB, so it does not fit in the stated store.
