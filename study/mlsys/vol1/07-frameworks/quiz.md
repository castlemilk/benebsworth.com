# ML Frameworks -- self-test

Book MCQs are drawn from the chapter's own quiz bank
(`frameworks_quizzes.json`). The Feynman prompts and numeric problems are
original. Answer before checking the key at the bottom.

## Book questions

**Q1.** A team reports that their model executes correctly on CPU but
produces mismatched tensor shapes and silent numerical corruption when
switched to a GPU backend because some operators silently default to a
different memory layout (such as NCHW versus NHWC). Which of the three
fundamental framework problems does this failure most directly expose?

- a. The hardware abstraction problem, because one unified model interface
  must preserve consistent semantic behavior, memory layouts, and numerical
  behavior across diverse hardware backends.
- b. The execution problem, because the operators were evaluated eagerly
  instead of being captured into a static graph.
- c. The differentiation problem, because the backward pass failed to save
  the tensors needed by the layout conversion.
- d. The scheduling problem, because the framework placed the layout
  conversion after the kernel launch.

**Q2.** A GPU performance profile reveals that a sequence of LayerNorm,
dropout, and GELU activation operations each finish in microseconds, yet the
device is idle most of the wall-clock step. Under the dispatch overhead law,
what is the most accurate diagnosis?

- a. The operations are arithmetic-bound: their FLOP count is too high for
  the accelerator's peak.
- b. The workload is overhead-bound: the fixed per-op dispatch and launch
  cost multiplied by the op count exceeds the device's compute-plus-memory
  time, so the ratio R sits above 1.
- c. The workload is bandwidth-bound: the tensors are too large to fit in
  cache.
- d. The GPU is thermally throttling between kernel launches.

**Q3.** For a neural network with $N = 10^7$ parameters and a single scalar
loss output $M = 1$, why is reverse-mode automatic differentiation the only
tractable choice?

- a. Reverse mode requires only a single forward pass to produce every
  gradient, while forward mode would need ~N sweeps -- and neither
  materializes the Jacobian.
- b. Reverse mode computes numerically exact gradients while forward mode
  produces only approximations.
- c. Forward mode cannot handle neural networks with more than one hidden
  layer.
- d. Reverse mode eliminates the need to save any forward activations.

**Q4.** A PyTorch user modifies an intermediate activation tensor using an
in-place operation (`x.relu_()`) and later sees a version-counter or "saved
tensor" error during `backward()`. What went wrong at the framework level?

- a. In-place operations are incompatible with GPU kernels and always
  corrupt device memory.
- b. The in-place write mutated a value that a registered backward rule
  expected to read from the recorded tape, so autograd detected the version
  change and refused a silently wrong gradient.
- c. The tensor's strides became negative, invalidating the computation
  graph.
- d. In-place operations allocate a second tape that collides with the
  first.

**Q5.** An engineering team is architecting a new commercial computer
vision system. In the chapter's decision framework, what is the correct
FIRST filter when choosing a framework?

- a. Pick the framework with the largest model zoo and community.
- b. Eliminate frameworks that cannot export every required operator to a
  runtime fitting the deployment target, before comparing ergonomics or
  benchmarks.
- c. Benchmark candidate frameworks on a standard model like ResNet-50 and
  pick the fastest.
- d. Choose whichever framework the most senior engineer already knows.

**Q6.** True or False: When eager fallback is enabled in `torch.compile`,
encountering a graph break necessarily means the compilation failed and the
whole model runs slower than pure eager.

- a. True -- a graph break discards all captured work.
- b. False -- a break splits the model into compiled regions and an eager
  remainder; the compiled regions still get fusion and scheduling, though
  each break forfeits cross-boundary optimization.

## Feynman prompts

**F1.** A product manager asks: "The model is identical -- same weights,
same architecture. Why does it matter which framework or mode we run it
in?" Explain why "the model is the same" does not mean "the runtime is the
same," using the GPT-2 XL decode-step numbers.

**F2.** On a whiteboard, explain to a new teammate what the autograd "tape"
is, why ResNet-50's training peak is ~100x its weight storage, and what
activation checkpointing trades.

## Numeric problems

**N1.** A training step dispatches 200 operations at ~15 us host cost each.
The modeled device time is $t_{compute} + t_{memory} = 1.5$ ms.
(a) Compute the overhead ratio R. (b) Is the step overhead-bound? (c) What
fraction of step time is dispatch? (d) Name two levers and which term of R
each one moves.

**N2.** A chain of $k = 4$ elementwise ops runs over an $N = 1$M-element
FP32 tensor. (a) Unfused traffic in MB? (b) Fused traffic? (c) The traffic
ratio? (d) Beyond traffic, what else does fusion remove?

**N3.** Compiling a serving model takes 300 s once and saves 20 ms per
request. Development is frozen ($D = 0$). (a) How many production requests
break even? (b) The same model in a research loop recompiles every one of
50 iterations -- how many requests now? (c) What does this say about where
compile belongs in the dev/deploy split?

## Answer key

- **Q1: a.** Semantics changed with the backend -- preserving meaning across
  hardware targets is the hardware abstraction problem; layout is one of
  the assumptions each rung must check at its boundary.
- **Q2: b.** R = $N_{op}{\cdot}o/(t_c{+}t_m) > 1$ puts the host in the
  critical path; the levers are fewer/cheaper dispatches or more work per
  dispatch.
- **Q3: a.** Forward mode carries one direction per sweep; reverse mode
  computes vector-Jacobian products for every parameter in one backward
  sweep. Its price is the saved forward state.
- **Q4: b.** The tape is a contract: backward rules read recorded forward
  values, and the version counter defends gradient correctness.
- **Q5: b.** Triage -- deployment constraints eliminate, then team pipeline
  and migration cost rank survivors.
- **Q6: b.** Capture compiles what it can hold; break frequency, not break
  existence, is the compatibility metric.
- **F1 (model).** The model fixes op count and weight bytes only: ~0.9 ms
  of device work vs ~8.6 ms of eager issue for the same step. The framework
  decides whether host or accelerator sets the pace.
- **F2 (model).** Tape = recorded program of rules + saved inputs; saved
  state grows linear in batch and depth, peaking at the backward boundary
  (~102 MB weights vs 8.4-12.4 GB peak); checkpointing re-runs a segment
  instead of holding it -- compute for memory.
- **N1.** (a) R = 3,000/1,500 = 2. (b) Yes, R > 1. (c) 2/3 ~ 67%.
  (d) Fusion shrinks $N_{op}$; replay shrinks $o$; bigger batch grows the
  denominator.
- **N2.** (a) $2{\cdot}4{\cdot}10^6{\cdot}4$ B = 32 MB. (b) 8 MB. (c) 4x.
  (d) $k{-}1 = 3$ launches and their dispatch costs -- a latency-term
  saving separate from the traffic cut.
- **N3.** (a) 300/0.02 = 15,000 requests. (b) 51 x 300 s of setup ->
  765,000 requests. (c) Compile at the deployment boundary; keep the
  research loop eager.
