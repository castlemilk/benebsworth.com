# ML Frameworks: Study Packet

*Working through Machine Learning Systems (Reddi, Harvard CS249r, mlsysbook.ai, CC-BY-NC-SA 4.0).
Chapter 7 of Volume I: the three problems every framework must solve, the dispatch overhead law, reverse mode as a recorded program, and why the operator surface decides what can be deployed.*

## Thesis

A framework is a ==compiler wearing a library's clothes=={The tensor API reads like a numerical library, but every call is also source code for a lowering pipeline: the same model text can execute eagerly one op at a time, be captured into a graph, or be exported to a runtime that never runs Python at all. Which path runs decides speed, memory, and portability before the first kernel launches.}. The model fixes the operation count; the framework decides where the other iron-law terms land -- execution mode sets the latency term, differentiation sets the memory term, and hardware abstraction sets which efficiencies are even reachable. Everything the framework can do is bounded by ==what the program reveals to it=={Eager execution shows the runtime one operation at a time, so fusion and memory planning are impossible by construction; graph capture reveals a region and pays a graph break wherever capture fails; a static graph or export reveals the whole program and enables layout, scheduling, and arena allocation. Each optimization has a visibility prerequisite.}: eager execution shows it one operation at a time, graph capture shows it a region, export shows it the whole program. The chapter's costs are all corollaries of that visibility boundary. The ==dispatch overhead law=={Per-op host cost times op count, divided by device compute-plus-memory time. Above a ratio of 1 the accelerator waits on Python -- which is why a tiny eager model idles the GPU while GPT-3's dispatch share rounds to zero.} prices the eager boundary, fusion exploits what capture reveals, and the ==operator surface=={PyTorch's eager API exposes ~2,658 ATen schemas while the compiler-facing Core ATen set has ~192; XLA runs ~123 HLO opcodes, ONNX ~203, JAX ~135. The ~14x gap between what users can write and what compilers can lower is where export pipelines break.} explains why "the model is the same" never means "the artifact is the same."

> [!note]
> Amber dotted marks each carry a one-line why-it-matters card: hover, tap, or
> tab to them. Select any text to pin your own highlight or note.

## Guided notes

### The hook: 576 kernel launches to read 3 GB

- One batch-one GPT-2 XL decode step reads ~3 GB of FP16 weights. At
  H100's ~3.35 TB/s that read costs ~0.9 ms -- this is the bandwidth-bound
  workload from ch6, now asked a different question.
- The same step issues ~12 kernels per transformer block across 48 blocks:
  576 launches. At ~5 us of driver overhead each, launching alone is ~2.9
  ms -- already ~3x the weight read.
- Add ~10 us of Python dispatch per operation and the host needs ~8.6 ms to
  issue a step the device could read in ~0.9 ms -- about ==10x the device
  work=={The host spends the step feeding the accelerator its instructions. This is the iron law's latency term paid in software, and it is the difference between a model that is fast in principle and a step that is slow in fact.}. The silicon
  waits on Python.
- Whether the step costs one millisecond or ten is a framework decision,
  not a model decision: run each op as called, or capture the sequence,
  fuse it, and launch it as a unit.

### Three problems, three iron-law terms

- Every framework must solve ==execution=={Lowering model operations to kernels in some order on some device -- the problem the dispatch overhead law prices.}, ==differentiation=={Producing gradients for every parameter without the programmer hand-writing derivatives -- the problem reverse mode solves at the price of saved forward state.}, and
  ==hardware abstraction=={One tensor interface that preserves semantics across CPU, GPU, TPU, and micro runtimes -- the problem layout, dtype, and operator-coverage gaps break.}; each owns a term of the iron law.
- A useful mnemonic: execution decides *when* work runs, differentiation
  decides *what state is kept*, abstraction decides *where* it can run.
- The opening decode example is only the execution problem made visible.
  The same model text would produce different memory bills (differentiation)
  and different deployable targets (abstraction) under other frameworks.

### The ladder the APIs hide

- Frameworks accreted bottom-up: BLAS kernels (1950s-70s) -> array
  libraries (NumPy) -> autodiff frameworks (Theano, early TF) -> graph
  compilers (XLA, TorchInductor). Each rung automated what the one below
  left to the programmer.
- Each rung also hid assumptions -- shape, dtype, device, units -- that the
  boundary between rungs must check. Most "framework bugs" are unchecked
  assumptions crossing a rung boundary, not wrong math.
- NumPy set the durable pattern: high-level control flow in a slow host
  language over dense kernels in a fast one. Every framework since is that
  pattern with a compiler bolted at a different height.

### Execution: what the runtime can see

- A computational graph is a ==lowering artifact=={Nodes are operations, edges are tensors; the graph exists so a scheduler -- not the user -- picks order, fusion, and buffer reuse. The model text is the source; the graph is the intermediate representation.}: nodes are ops,
  edges are tensors, and the graph exists so a scheduler picks order and
  buffers instead of the programmer.
- Eager execution builds the graph anew per call and shows the runtime one
  op at a time: fully debuggable, structurally unfusable.
- Static graphs (TF1 style) reveal the whole program but force graph-only
  control flow -- Python `if` becomes a graph node, and the Python that
  built the graph no longer runs it.
- Graph-capture JIT (`torch.compile`, `jax.jit`) traces regions and pays a
  ==graph break=={Wherever capture fails -- data-dependent control flow like `if x.sum() > 0`, unsupported ops, or side effects -- the compiled region ends and execution falls back to eager. Each break forfeits the fusion and scheduling the compiler could have applied across it, so break frequency is the real compatibility metric, not compile success.} wherever capture fails; a traced `if
  x.sum() > 0` silently bakes in whichever branch fired at trace time.
- The operator surface quantifies the gap: eager APIs expose ~2,658 ATen
  schemas and ~1,563 TF ops, while compiler-facing sets hold ~123-203 ops.
  Export works only if every op you wrote exists in the smaller set.

::chart[operator-surface]

::fig[visibility-ladder]

- The memory wall makes most non-GEMM ops bandwidth-bound, so a chain of k
  elementwise kernels unfused pays ~2kNB of traffic for what one kernel
  does in ~2NB -- LayerNorm + dropout + activation is ~3x idealized traffic
  before counting the launches it removes.

::eq[fusion-traffic]

$$
B_{\text{unfused}} = 2kNB \quad\xrightarrow{\text{fuse}}\quad B_{\text{fused}} = 2NB
$$

::chart[dispatch-share]

- Five 1-us kernels eagerly: each pays ~15 us of host overhead for 1 us of
  device work -- the device idles ~94% of the sequence. One fused kernel
  later: ~19 us total. The GPU was never the slow part.

::eq[overhead-share]

$$
\text{Share} = \frac{R}{1 + R}
$$

::eq[dispatch-law]

$$
R = \frac{N_{\text{op}}\cdot o}{t_{\text{compute}} + t_{\text{memory}}}, \qquad \text{overhead-bound when } R > 1
$$

::fig[gpt2-decode-tax]

### Compilation is a purchase, not a feature

- The continuum runs eager -> graph JIT -> AOT runtime -> vendor-specialized
  engine; each step right trades flexibility for optimization visibility.
- Compiling pays when production executions amortize compile time: the
  book's cost model puts the eager-to-JIT crossover near $2{\times}10^{6}$
  executions and JIT-to-AOT near $6.7{\times}10^{6}$ under one illustrative
  model -- the number moves, the shape of the question does not.
- ResNet-50 serving at a ~47% compiled speedup breaks even after ~135K
  images at the reference compile cost -- trivially worth it in serving,
  never worth it in a research loop that recompiles every iteration.
- The pitfall writes itself: a workload that recompiles on every change can
  run >40x slower than staying eager. Compile the artifact, not the
  experiment.

::eq[compile-benefit]

$$
\text{Benefit} = \frac{P\,(t_{\text{eager}} - t_{\text{compiled}})}{T_{\text{compile}} + D\cdot T_{\text{compile}}}, \qquad \text{compile when } > 1
$$

### Differentiation: the recorded program

- Forward mode computes one directional derivative per sweep; for N
  parameters it needs N sweeps. Reverse mode computes ==every gradient in
  one backward sweep=={Propagating adjoints as vector-Jacobian products from the scalar loss, never materializing a Jacobian. For N=10^7 parameters and one loss, that is one sweep instead of ten million -- the entire reason deep learning is trainable.} at a small constant
  multiple of forward cost -- vector-Jacobian products, never a Jacobian.
- The Jacobian it avoids materializing: a 100,000-wide layer pair has
  $10^{10}$ entries -- 40 GB in FP32, larger than the model.

::eq[jacobian-memory]

$$
J \in \mathbb{R}^{m \times n}: \quad 10^{5} \times 10^{5} \times 4\,\text{B} = 40\,\text{GB}
$$

- The bill arrives as ==saved forward state=={Every backward rule reads values from the forward operating point, so the tape retains tensors until the sweep unwinds past them. Saved activations grow linearly in batch and depth, peak at the start of backward, and routinely exceed the weights by orders of magnitude -- ResNet-50's training peak is 82-121x its weight storage.}.
- ResNet-50 batch 64 FP32: ~102 MB of weights, ~204 MB of Adam moments --
  and a training peak of 8.4-12.4 GB, ~82-121x the weights. The mountain is
  activations, not parameters.

::eq[saved-activations]

$$
A \approx B_{\text{batch}} \cdot L \cdot S \cdot d \cdot k \cdot e
$$

::chart[training-peak]

- The recorded graph is also the hazard surface: in-place `x.relu_()`
  mutates a value a backward rule expected to read, and the failure is a
  version-counter error at backward time -- or silence.
- Recomputation trades compute for the retention: checkpoint segments and
  micro-batches (64-sample chunks of a 4,096 batch) cut the live peak up to
  64x; `.grad` accumulates additively, so the tape's choices leak into
  training semantics.

::fig[tape-and-peak]

### Abstraction: metadata picks the kernel

- A tensor is metadata plus a buffer: shape, dtype, strides, device. The
  metadata selects the kernel; two tensors with identical values and
  different strides are different calls.
- Silent cross-device mixing is forbidden by construction -- an op with
  operands on two devices must fail loudly, because the alternative is an
  implicit copy across the slowest link in the machine.
- The link hierarchy prices placement: HBM ~3.35 TB/s vs PCIe Gen5 x16 ~64
  GB/s is a ~52x gap; NVLink's ~450 GB/s-per-direction-class fabric is ~7x
  PCIe bidirectional. A 4 MB tensor is ~1.2 us on HBM, ~62 us on PCIe.
- `.item()`, `print(tensor)`, `tensor.numpy()` are ==sync points=={Each forces the device queue to drain and a blocking host copy -- the pipeline stalls on the call you wrote to look at a value. Profilers that insert these change the thing they measure.};
  pinned memory plus streams is how the copy hides behind compute instead.
- The feed has to keep pace: 1,000 ImageNet images/s of raw uint8 is
  ~150.5 MB/s sustained; the DataLoader is the framework's answer --
  workers, prefetch, pinned staging -- one 64-image batch is ~9.6 MB and
  ~0.6 ms of host-to-device copy.

### Modules: one object, three mechanisms

- The module tree gives ==automatic parameter discovery=={`model.parameters()` walks registered attributes recursively, so the optimizer receives every weight without a hand-maintained list -- the reason a one-line `nn.Linear` is trainable immediately.}, a train/eval mode
  flag propagated from the root (dropout and batch-norm read it), and
  hierarchical serialization through dotted `state_dict` keys.
- `load_state_dict` is a name-matching copy, not a format conversion --
  missing and unexpected keys are the whole compatibility story.
- `model.eval()` changes numerics, not bookkeeping: dropout stops dropping,
  batch-norm switches to running statistics. Forgetting it is a silent
  accuracy bug, the inverse of a crash.

### Anatomy of one training step

- The worked step: an MLP $784{\to}128{\to}10$, batch 32, FP32 -- 101,770
  parameters, ~6.5 MFLOP of dense forward work.
- On paper the device owes well under a microsecond of ideal compute-plus-
  memory time. The modeled host bill: 5 Python entries and 9 driver
  launches at the same ~15 us/op -- ~95 us of issue time against <1 us of
  ideal device time. ==The step is dispatch-bound by two orders of
  magnitude=={And this is why small-model training loops feel slow on fast GPUs: the accelerator is idle waiting for Python. No kernel optimization fixes a step that is bound by its issue path -- only fewer dispatches (fusion, compile, larger kernels) or more work per dispatch (bigger batch) move the number.}.
- The backward GEMMs cost ~2.013x the forward dense work -- two
  forward-sized products per layer, minus the first layer's unneeded
  input-gradient GEMM (the ch5 three-product rule with its exception).
- The optimizer step nobody modeled: Adam reads $p,g,m,v$ and writes
  $p,m,v$ -- 7 values x 4 bytes = 28 bytes per parameter, more traffic than
  the whole modeled step for this small net.

::eq[adam-bytes]

$$
B_{\text{Adam}} = 7 \cdot e \cdot P = 28\,\text{B/param}
$$

- The ReLU's arithmetic intensity is ~0.125 FLOP/byte, ~160x below the
  H100's FP32 ridge -- in unfused eager it pays a launch plus a global
  round-trip for a few thousand comparisons.

::eq[dense-training-ratio]

$$
W_{\text{train}} = 3\,W_{\text{fwd}} - W_{\text{mm}_1} \;\approx\; 2.013\,W_{\text{fwd}}
$$

### Three frameworks, three emphases

- TensorFlow organized around SavedModel -- a serialized graph boundary
  between development and serving; static-graph instincts throughout.
- PyTorch organized around the eager module -- define-by-run first, compile
  as an opt-in capture (`torch.compile`) over whatever Dynamo can hold.
- JAX organized around ==pure functions=={No side effects, no hidden state -- which is exactly the property XLA needs to see the whole program at once. The constraint that annoys users (explicit PRNG keys, no mutation) is the same property that makes whole-graph lowering, `vmap`, and `pmap` mechanical.}: purity is the compiler
  contract, and `jit`/`vmap`/`pmap` are mechanical consequences of it.
- Same three problems, different visible surface: the comparison that
  matters is what each lets the compiler see, not a throughput leaderboard.

### Choosing is elimination, then ranking

- First pass eliminates: which frameworks can export every required op to a
  runtime that fits the deployment target? The deployment runtime is the
  first check, made before the training framework is chosen -- ExecuTorch,
  TFLite, and TFLM (256 KB SRAM, 1 MB flash on the nRF52840) each close
  different doors.
- Second pass ranks survivors by team pipeline and migration cost --
  checkpoints, loaders, serving formats, and expertise make a framework a
  multi-year commitment measured in engineer-months.
- The two errors are symmetric: choosing a research-ergonomic stack you
  cannot deploy, or a deploy-clean stack your team cannot iterate in.

### Fallacies, briefly

- *Same model = same performance*: the decode-step numbers refute it --
  0.9 ms of device work vs ~8.6 ms of eager issue, and ~47% from compiling
  ResNet-50. Fusion depth and capture coverage differ per framework.
- *Popularity is a spec*: deployment constraints dominate; the runtime
  check precedes the training-framework choice.
- *The API hides the systems*: the training-step table shows a step
  dispatch-bound by ~100x and a ReLU ~160x under the ridge -- no API call
  reveals either.
- *Weights are just math, migration is easy*: custom ops, numeric
  equivalence suites, and formats like SavedModel/ONNX boundaries make it
  an engineer-months migration, not an afternoon.

## The physics

| Quantity | Value | Use |
|---|---|---|
| Per-op host overhead | ~15 us (5 driver + ~10 Python) | numerator term of the dispatch law |
| GPT-2 XL decode weight read | ~0.9 ms (3 GB FP16 at ~3.35 TB/s) | device floor for one step |
| GPT-2 XL decode launches | ~576 (~12 x 48 blocks) | launch tax alone ~2.9 ms, ~3x the read |
| GPT-2 XL decode eager issue | ~8.6 ms host | ~10x the device work |
| Dispatch share, small vs large op | ~94% vs ~13% | $R/(1{+}R)$ at the two ends |
| Fusion traffic bound | $2kNB \to 2NB$ | ~3x idealized for LN+dropout+act |
| Compile crossovers | ~$2{\times}10^{6}$ eager-to-JIT, ~$6.7{\times}10^{6}$ JIT-to-AOT | one cost model's answer |
| ResNet-50 compile breakeven | ~135K images at ~47% speedup | serving yes, research loop no |
| Recompile-everything cost | >40x slower than staying eager | the pitfall bound |
| Jacobian avoided | $10^{5}{\times}10^{5}{\times}4\text{B} = 40$ GB | why VJPs exist |
| Saved-state peak | $B{\cdot}L{\cdot}S{\cdot}d{\cdot}k{\cdot}e$; ResNet-50 ~82-121x weights | the tape's bill |
| Micro-batch peak cut | up to 64x (64 of 4,096) | recomputation trade |
| Link hierarchy | HBM ~3.35 TB/s, NVLink ~450 GB/s, PCIe Gen5 ~64 GB/s | placement law (~52x ends) |
| Feed target | ~150.5 MB/s raw, ~0.6 ms per 64-image H2D batch | what the DataLoader must sustain |
| Worked step anatomy | ~95 us host vs <1 us device | dispatch-bound by ~100x |
| Dense training ratio | ~2.013x forward | two forward-sized products per layer |
| Adam bytes | 28 B/param (7 values x 4 B) | optimizer traffic nobody models |
| ReLU intensity | ~0.125 FLOP/B, ~160x under the ridge | unfused eager's real cost |
| Operator surface | ~2,658 / ~1,563 eager vs ~123-203 compiler | ~14x export gap |
| TFLM budget | 256 KB SRAM, 1 MB flash (nRF52840) | deployment check precedes training |

## Glossary

- **Dispatch overhead law**: $N{\cdot}o/(t_c{+}t_m)$; above 1 the host, not the device, is the bottleneck.
- **Graph break**: the point where capture fails and execution falls back to eager, forfeiting cross-boundary optimization.
- **Operator surface**: the count of ops the eager API exposes vs the set the compiler can lower (~14x gap).
- **Tape / recorded program**: the graph autodiff builds during forward, storing ops plus the tensors backward rules will need.
- **Vector-Jacobian product**: reverse mode's primitive; computes $\bar{y}^T J$ without materializing $J$.
- **Saved forward state**: tensors retained for backward rules; linear in batch and depth, peaks at backward start.
- **Activation checkpointing**: record less, recompute segments during backward; trades compute for the peak.
- **State dict**: the dotted-key dictionary that makes a module tree serializable; `load_state_dict` is name matching plus a copy.
- **Pinned memory**: page-locked host memory enabling async DMA copies; the prerequisite for transfer-compute overlap.
- **Compilation benefit**: $P(t_e{-}t_c)/(T_c{+}D{\cdot}T_c)$; compile when it exceeds 1.
- **Graph capture / JIT**: trace regions of Python into graphs, guard them, replay fast; pay a break where capture fails.
- **DataLoader**: the pipeline abstraction -- workers, prefetch, pinned staging -- separating what a sample is from how it reaches the device.

## → Ben's world

- The llm-benchmark harness lives at the AOT end of the continuum by
  construction: Ollama/MLX runtimes are pre-compiled inference engines, so
  the harness measures deployment-path performance, not development-path --
  which is exactly the right layer for a model bake-off, and the wrong one
  to conclude anything about eager iteration cost.
- `qwen3.8:27b-mlx`'s ~31 tok/s vs `gemma3:4b`'s ~132 is ch6's weight-stream
  signature; this chapter adds the second term -- at batch one on MLX the
  per-token host overhead is already amortized by the engine, which is why
  measured tok/s tracks bytes/token instead of the ~15 us/op dispatch tax a
  naive Python loop would pay.
- The dispatch overhead law is the greenveil edge's silent twin: an API
  that fans out N small backend calls per request has the same N-times-
  fixed-cost structure -- the SSR product-page crawl is a dispatch-bound
  workload where compilation is called caching.
- The operator-surface gap is why `torch.compile` is a flag and not a
  default: ~2,658 things you can write, ~192 the core set lowers. Any
  custom op in a benchmarked model is a potential graph break.

## Open questions

- The chapter's per-op overhead (~15 us) is one illustrative constant --
  how does it move across PyTorch versions, CUDA vs MPS backends, and does
  CUDA-graph replay at batch one push the decode step below the ~3x launch
  bound?
- Graph breaks are treated as binary, but partial-graph recompilation has a
  cost too -- is there a useful "breaks per thousand steps" budget where
  eager fallback stops being worth the capture at all?
- Micro-batch peak reduction scales with logical/micro ratio, but
  recomputation adds backward work -- where does the added compute time
  cross the wall-clock saved by fitting a larger micro-batch?
- The continuum model assumes constant compile cost per change; real
  `torch.compile` recompiles are shaped by guard hits and dynamic shapes --
  does a guard-aware cost model move the 2x10^6 crossover by an order of
  magnitude either way?
