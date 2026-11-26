# Model Compression self-test

1. An inference device has a 48 MiB resident-memory budget. Compressed weights occupy 8 MiB, activations occupy 36 MiB, and an additional runtime buffer occupies 8 MiB. All three allocations coexist. What is the resident footprint, and does it fit?

2. A convolution is slow on a device using ordinary dense kernels. Half its weights can be set to zero, or whole output channels can be removed while updating every consumer. Both candidates pass the same quality gate. Which should the engineer prototype first to reduce dense computation?
   - A. Zero scattered weights while retaining the original tensor shapes.
   - B. Remove whole output channels and update every consumer.
   - C. Store the unchanged dense layer in a smaller compressed file.
   - D. Keep all channels and increase the inference batch size.

3. A vision service calibrates an early-exit threshold on mostly clear images. In production, a burst of low-light images sends many frames through the full path. Explain why the service can miss its latency target even if its earlier test had a low mean, and describe what to measure before changing the threshold.

4. A deployed stage reads 24 MiB of FP16 weights from memory at a sustained 600 MiB/s. An INT8 version reads 12 MiB of weights plus 3 MiB of metadata at the same rate. A trace shows that this read is on the critical path, but conversion cost is unknown. What is the best next engineering decision?
   - A. Deploy INT8 immediately: its estimated read time falls from 40 ms to 25 ms, guaranteeing the same end-to-end saving.
   - B. Keep FP16: its estimated read time is 25 ms, so the INT8 metadata makes the alternative slower.
   - C. Prototype INT8: its estimated read time falls from 40 ms to 25 ms, then measure conversion and end-to-end latency.
   - D. Reject INT8: its estimated read time falls from 40 ms to 20 ms, but metadata makes any speedup impossible.

5. A detector uses symmetric INT8 activation codes from −127 to 127. A revised calibration range includes rare large events but makes the step between codes much larger. Held-out common events now have worse detection quality, while rare events improve. Explain the likely cause and a practical next test.

6. A target accelerator supports a 2:4 sparse kernel for a model's matrix shapes. An exported checkpoint contains many zeros but is stored densely, and profiling shows that its dense matrix kernel dominates latency. Which action best tests whether sparsity can reduce latency?
   - A. Keep the dense layout and infer sparse speed from the fraction of zero weights.
   - B. Convert to an arbitrary sparse layout and assume the accelerator will skip its zeros.
   - C. Measure checkpoint size alone and select the representation with fewer stored bytes.
   - D. Export a supported 2:4 layout and benchmark its sparse kernel against the dense kernel.

7. A team calibrates an INT8 model, then prunes channels and fine-tunes it. The compiled candidate is faster but loses quality compared with the calibrated model. Explain why the earlier calibration may no longer be suitable and what you would check next.

8. A release requires peak memory at or below 50 MiB, 95th-percentile end-to-end latency at or below 15 ms, and recall of at least 90% on night images. Repeated representative tests show candidate X at 46 MiB, 13 ms, and 88% recall; candidate Y at 49 MiB, 14 ms, and 92% recall. Both meet all other gates. What should the team do?
   - A. Release candidate Y because it passes all three specified gates.
   - B. Release candidate X because it has the lower memory and latency.
   - C. Release candidate X because its recall is close to the required floor.
   - D. Delay both candidates because Y uses more memory than X.

9. An exported INT8 model misses its latency limit. A trace shows a normalization operator with few arithmetic operations taking substantial time while memory traffic is high. The largest matrix multiplication has most of the model's FLOPs but already uses an optimized INT8 kernel. What would you investigate and change first, and how would you test the diagnosis?

## Answer key

1. Add the simultaneous allocations: 8 + 36 + 8 = 52 MiB. This exceeds the 48 MiB budget by 4 MiB, so it does not fit.

2. B. Removing channels shrinks dense tensor dimensions, giving ordinary kernels less work. Scattered zeros preserve those dimensions, so a standard dense kernel still processes their positions. Actual speedup still requires profiling.

3. Low-light frames may have lower confidence and therefore require the remaining layers more often. A burst can increase the fraction of slow frames and affect batching, raising tail latency even if the earlier workload had a low mean. Measure exit rates, per-frame and tail latency, and quality on the frames that exit early under representative low-light traffic. Then adjust the threshold or graph and validate both latency and quality again.

4. C. The FP16 read takes 24 ÷ 600 = 0.040 s, or 40 ms. INT8 reads 15 MiB and takes 15 ÷ 600 = 0.025 s, or 25 ms. The strongest competing choice deploys immediately, but the 15 ms read estimate excludes conversion and other runtime costs; those must be measured.

5. The wider range reduces clipping of rare large activations, but its larger step increases rounding error for common activations and can erase distinctions needed for detection. Compare clipping and rounding errors and detection quality by slice, then test a narrower range or higher precision for the sensitive operation on separate held-out data.

6. D. A supported layout and kernel allow the runtime to skip the intended work, while a target-device benchmark accounts for packing and kernel overhead. Keeping the dense layout is the strongest alternative, but its dense kernel still processes stored zeros.

7. Pruning and fine-tuning can change weight and activation distributions, so ranges fitted before those changes may clip values or represent them poorly. Recalibrate the settled graph as the deployment toolchain expects, compile it again, and compare quality on the same evaluation cases. Inspect kernels, conversions, and fallback as well, because the new shapes can change execution.

8. A. Y satisfies each required limit. The strongest competing choice, X, is faster and smaller but fails the night-image recall floor; resource savings cannot compensate for a required quality failure.

9. Investigate normalization's activation reads and writes, allocations, and kernel launches, including any surrounding conversions. Its low arithmetic cost can coexist with high latency when it streams a large tensor. Test a supported implementation that reduces the observed traffic or overhead while keeping the workload fixed, then compare the operator and end-to-end timings. Recheck output quality and other acceptance gates on the revised artifact.
