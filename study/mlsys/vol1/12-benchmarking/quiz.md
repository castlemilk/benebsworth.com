# Self-test — Benchmarking

1. A team reports a kernel microbenchmark, a whole-model latency figure, and a request-path p99 for the same optimization. Which result can certify that users see the improvement?
2. MLPerf Training fixes a 75.9% top-1 target for ResNet-50 and ranks submissions by time to reach it. Why is that stronger than ranking raw samples/second?
3. A vendor quotes peak INT4 TOPS; another quotes sustained INT8 latency on your model's architecture. Which number is more likely to survive your deployment, and why?
4. Your inference optimization is 5× faster on the isolated model, but end-to-end improves only 1.8×. What does the gap tell you before you touch the model again?
5. Two deployments report 0.10 Wh and 0.24 Wh per prompt for the same model. What is the first question to ask before declaring one better?
6. On an always-listening keyword spotter, a competitor's chip is twice as energy-efficient per inference yet dies faster on battery. Give a mechanism.

7. Explain to a teammate why the five vendor spec cards can't be ranked as quoted, and what a fair test would fix first.
8. A compressed model scores 94% where the baseline scores 95% on the same 1,000 images. Explain why the two scores alone can't settle whether the drop is real, and what evidence could.

9. A service request spends 14 ms in preprocessing and 21 ms in the model. The model is made 4× faster. Compute the new end-to-end time and speedup, and the ceiling if the model became instant.
10. A board draws 60 mW idle and 450 mW active. It infers for 12 ms inside each 2 s window at ~4 mJ. Compute the duty cycle, the average power, and which state dominates the battery drain.
11. A cluster peaks at 700 TFLOP/s on the matching path and sustains 210 TFLOP/s of model arithmetic. Compute the MFU and name two places the missing arithmetic can be going.
