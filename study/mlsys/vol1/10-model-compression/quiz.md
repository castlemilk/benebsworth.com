# Model Compression: self-test

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
