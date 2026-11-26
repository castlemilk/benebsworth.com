---
title: "ML Frameworks — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol1/07_frameworks/07_frameworks.html"
canonical_url: "https://benebsworth.com/study/vol1/07-frameworks/"
---
# ML Frameworks: Study Packet

*Working through Machine Learning Systems (Reddi, Harvard CS249r, mlsysbook.ai, CC-BY-NC-SA 4.0).
Chapter 7 of Volume I: the three problems every framework must solve, the dispatch overhead law, reverse mode as a recorded program, and why the operator surface decides what can be deployed.*

## Thesis

A framework is a **compiler wearing a library's clothes** *(why it matters: The tensor API reads like a numerical library, but every call is also source code for a lowering pipeline: the same model text can execute eagerly one op at a time, be captured into a graph, or be exported to a runtime that never runs Python at all. Which path runs decides speed, memory, and portability before the first kernel launches.)*. The model fixes the operation count; the framework decides where the other iron-law terms land -- execution mode sets the latency term, differentiation sets the memory term, and hardware abstraction sets which efficiencies are even reachable. Everything the framework can do is bounded by **what the program reveals to it** *(why it matters: Eager execution shows the runtime one operation at a time, so fusion and memory planning are impossible by construction; graph capture reveals a region and pays a graph break wherever capture fails; a static graph or export reveals the whole program and enables layout, scheduling, and arena allocation. Each optimization has a visibility prerequisite.)*: eager execution shows it one operation at a time, graph capture shows it a region, export shows it the whole program. The chapter's costs are all corollaries of that visibility boundary. The **dispatch overhead law** *(why it matters: Per-op host cost times op count, divided by device compute-plus-memory time. Above a ratio of 1 the accelerator waits on Python -- which is why a tiny eager model idles the GPU while GPT-3's dispatch share rounds to zero.)* prices the eager boundary, fusion exploits what capture reveals, and the **operator surface** *(why it matters: PyTorch's eager API exposes ~2,658 ATen schemas while the compiler-facing Core ATen set has ~192; XLA runs ~123 HLO opcodes, ONNX ~203, JAX ~135. The ~14x gap between what users can write and what compilers can lower is where export pipelines break.)* explains why "the model is the same" never means "the artifact is the same."

> **note**
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
  issue a step the device could read in ~0.9 ms -- about **10x the device
  work** *(why it matters: The host spends the step feeding the accelerator its instructions. This is the iron law's latency term paid in software, and it is the difference between a model that is fast in principle and a step that is slow in fact.)*. The silicon
  waits on Python.
- Whether the step costs one millisecond or ten is a framework decision,
  not a model decision: run each op as called, or capture the sequence,
  fuse it, and launch it as a unit.

### Three problems, three iron-law terms

- Every framework must solve **execution** *(why it matters: Lowering model operations to kernels in some order on some device -- the problem the dispatch overhead law prices.)*, **differentiation** *(why it matters: Producing gradients for every parameter without the programmer hand-writing derivatives -- the problem reverse mode solves at the price of saved forward state.)*, and
  **hardware abstraction** *(why it matters: One tensor interface that preserves semantics across CPU, GPU, TPU, and micro runtimes -- the problem layout, dtype, and operator-coverage gaps break.)*; each owns a term of the iron law.
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

- A computational graph is a **lowering artifact** *(why it matters: Nodes are operations, edges are tensors; the graph exists so a scheduler -- not the user -- picks order, fusion, and buffer reuse. The model text is the source; the graph is the intermediate representation.)*: nodes are ops,
  edges are tensors, and the graph exists so a scheduler picks order and
  buffers instead of the programmer.
- Eager execution builds the graph anew per call and shows the runtime one
  op at a time: fully debuggable, structurally unfusable.
- Static graphs (TF1 style) reveal the whole program but force graph-only
  control flow -- Python `if` becomes a graph node, and the Python that
  built the graph no longer runs it.
- Graph-capture JIT (`torch.compile`, `jax.jit`) traces regions and pays a
  **graph break** *(why it matters: Wherever capture fails -- data-dependent control flow like `if x.sum() > 0`, unsupported ops, or side effects -- the compiled region ends and execution falls back to eager. Each break forfeits the fusion and scheduling the compiler could have applied across it, so break frequency is the real compatibility metric, not compile success.)* wherever capture fails; a traced `if
  x.sum() > 0` silently bakes in whichever branch fired at trace time.
- The operator surface quantifies the gap: eager APIs expose ~2,658 ATen
  schemas and ~1,563 TF ops, while compiler-facing sets hold ~123-203 ops.
  Export works only if every op you wrote exists in the smaller set.


**What you can write vs what the compiler can lower**

| Framework | Lowers to compiler set (Core ATen 192 / XLA HLO 123 / lax 135) | Eager-only remainder |
|---|---|---|
| PyTorch | 192 | 2466 |
| TensorFlow | 123 | 1440 |
| JAX | 135 | 0 |

*Operator counts mined from each project (latest snapshots in the book's data tables). Each bar is the eager API surface, split into the subset its compiler-facing set can lower versus the eager-only remainder: ~7% coverage for PyTorch, ~8% for TensorFlow, ~100% for JAX - lax is already the compiler's language. Export succeeds only inside the thin first segment.*

![The execution continuum as widening visibility](https://benebsworth.com/study/vol1/07-frameworks/diagrams/visibility-ladder.svg)

*Every optimization has a visibility prerequisite. Eager reveals one operation, so fusion and memory planning are impossible by construction. Graph capture reveals a region and enables fusion inside it. AOT export reveals the whole program, enabling arena allocation and full scheduling. A vendor engine adds fixed shapes and one target, unlocking hand-tuned kernels. Moving right buys optimization and pays in flexibility - and each position maps to a framework idiom: Python loops, torch.compile/jax.jit, SavedModel/ONNX export, TensorRT/TFLM.*
- The memory wall makes most non-GEMM ops bandwidth-bound, so a chain of k
  elementwise kernels unfused pays ~2kNB of traffic for what one kernel
  does in ~2NB -- LayerNorm + dropout + activation is ~3x idealized traffic
  before counting the launches it removes.

**Eq 1 · Fusion traffic cut**
$$
B_{\text{unfused}} = 2kNB \quad\xrightarrow{\text{fuse}}\quad B_{\text{fused}} = 2NB
$$


**Where the step time goes: small op vs large op**

| Operation | Device work | Dispatch + launch |
|---|---|---|
| ~1 us kernel (ReLU-class) | 6.25 | 93.75 |
| ~100 us kernel (GEMM-class) | 87 | 13 |

*The dispatch overhead law at its two ends. A ~1 us elementwise kernel pays ~15 us of host issue cost for ~1 us of device work -- dispatch is ~94% of the step. A ~100 us GEMM pays the same fixed cost once, so dispatch drops to ~13%. The per-op cost is constant; only the denominator changes.*

- Five 1-us kernels eagerly: each pays ~15 us of host overhead for 1 us of
  device work -- the device idles ~94% of the sequence. One fused kernel
  later: ~19 us total. The GPU was never the slow part.

**Eq 8 · Dispatch share of step time**
$$
\text{Share} = \frac{R}{1 + R}
$$

**Eq 2 · Dispatch overhead law**
$$
R = \frac{N_{\text{op}}\cdot o}{t_{\text{compute}} + t_{\text{memory}}}, \qquad \text{overhead-bound when } R > 1
$$

![The decode step the host can't feed](https://benebsworth.com/study/vol1/07-frameworks/diagrams/gpt2-decode-tax.svg)

*One batch-one GPT-2 XL decode step in three clockings: the device can read the 3 GB of FP16 weights in ~0.9 ms, driver launches alone take ~2.9 ms (576 kernels x ~5 us), and full eager issue with Python dispatch takes ~8.6 ms. The accelerator spends ~90% of the step waiting for instructions. The gap between the first bar and the last is the framework's latency contribution.*
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

**Eq 3 · Compilation benefit**
$$
\text{Benefit} = \frac{P\,(t_{\text{eager}} - t_{\text{compiled}})}{T_{\text{compile}} + D\cdot T_{\text{compile}}}, \qquad \text{compile when } > 1
$$

### Differentiation: the recorded program

- Forward mode computes one directional derivative per sweep; for N
  parameters it needs N sweeps. Reverse mode computes **every gradient in
  one backward sweep** *(why it matters: Propagating adjoints as vector-Jacobian products from the scalar loss, never materializing a Jacobian. For N=10^7 parameters and one loss, that is one sweep instead of ten million -- the entire reason deep learning is trainable.)* at a small constant
  multiple of forward cost -- vector-Jacobian products, never a Jacobian.
- The Jacobian it avoids materializing: a 100,000-wide layer pair has
  $10^{10}$ entries -- 40 GB in FP32, larger than the model.

**Eq 5 · The Jacobian reverse mode never builds**
$$
J \in \mathbb{R}^{m \times n}: \quad 10^{5} \times 10^{5} \times 4\,\text{B} = 40\,\text{GB}
$$

- The bill arrives as **saved forward state** *(why it matters: Every backward rule reads values from the forward operating point, so the tape retains tensors until the sweep unwinds past them. Saved activations grow linearly in batch and depth, peak at the start of backward, and routinely exceed the weights by orders of magnitude -- ResNet-50's training peak is 82-121x its weight storage.)*.
- ResNet-50 batch 64 FP32: ~102 MB of weights, ~204 MB of Adam moments --
  and a training peak of 8.4-12.4 GB, ~82-121x the weights. The mountain is
  activations, not parameters.

**Eq 4 · Saved-activation memory**
$$
A \approx B_{\text{batch}} \cdot L \cdot S \cdot d \cdot k \cdot e
$$


**ResNet-50 batch-64 training peak: activations are the mountain**

| Activation estimate | Saved activations | Adam moments (m + v) | Weights + gradients |
|---|---|---|---|
| Low-activation model | 8 | 0.2 | 0.2 |
| High-activation model | 12 | 0.2 | 0.2 |

*Book scenario ResNet50Fp32AdamBatch64, FP32. Weights are ~102 MB and Adam's two moments add ~204 MB -- together under 4% of the peak. Saved activations dominate: the low and high estimates bracket 8.4-12.4 GB total, 82-121x the weight storage. The batch knob scales only the activation slice.*

- The recorded graph is also the hazard surface: in-place `x.relu_()`
  mutates a value a backward rule expected to read, and the failure is a
  version-counter error at backward time -- or silence.
- Recomputation trades compute for the retention: checkpoint segments and
  micro-batches (64-sample chunks of a 4,096 batch) cut the live peak up to
  64x; `.grad` accumulates additively, so the tape's choices leak into
  training semantics.

![The tape builds the peak, backward unwinds it](https://benebsworth.com/study/vol1/07-frameworks/diagrams/tape-and-peak.svg)

*Forward execution records ops and retains the tensors each backward rule will need, so the saved-activation stack grows one tower per layer and peaks exactly where forward ends. Backward consumes the towers in reverse order, freeing each as it passes. Checkpointing chooses to re-record a segment during backward rather than hold it - the compute-for-memory trade at the heart of training memory.*
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
- `.item()`, `print(tensor)`, `tensor.numpy()` are **sync points** *(why it matters: Each forces the device queue to drain and a blocking host copy -- the pipeline stalls on the call you wrote to look at a value. Profilers that insert these change the thing they measure.)*;
  pinned memory plus streams is how the copy hides behind compute instead.
- The feed has to keep pace: 1,000 ImageNet images/s of raw uint8 is
  ~150.5 MB/s sustained; the DataLoader is the framework's answer --
  workers, prefetch, pinned staging -- one 64-image batch is ~9.6 MB and
  ~0.6 ms of host-to-device copy.

### Modules: one object, three mechanisms

- The module tree gives **automatic parameter discovery** *(why it matters: `model.parameters()` walks registered attributes recursively, so the optimizer receives every weight without a hand-maintained list -- the reason a one-line `nn.Linear` is trainable immediately.)*, a train/eval mode
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
  ideal device time. **The step is dispatch-bound by two orders of
  magnitude** *(why it matters: And this is why small-model training loops feel slow on fast GPUs: the accelerator is idle waiting for Python. No kernel optimization fixes a step that is bound by its issue path -- only fewer dispatches (fusion, compile, larger kernels) or more work per dispatch (bigger batch) move the number.)*.
- The backward GEMMs cost ~2.013x the forward dense work -- two
  forward-sized products per layer, minus the first layer's unneeded
  input-gradient GEMM (the ch5 three-product rule with its exception).
- The optimizer step nobody modeled: Adam reads $p,g,m,v$ and writes
  $p,m,v$ -- 7 values x 4 bytes = 28 bytes per parameter, more traffic than
  the whole modeled step for this small net.

**Eq 7 · Adam step traffic**
$$
B_{\text{Adam}} = 7 \cdot e \cdot P = 28\,\text{B/param}
$$

- The ReLU's arithmetic intensity is ~0.125 FLOP/byte, ~160x below the
  H100's FP32 ridge -- in unfused eager it pays a launch plus a global
  round-trip for a few thousand comparisons.

**Eq 6 · Dense backward work**
$$
W_{\text{train}} = 3\,W_{\text{fwd}} - W_{\text{mm}_1} \;\approx\; 2.013\,W_{\text{fwd}}
$$

### Three frameworks, three emphases

- TensorFlow organized around SavedModel -- a serialized graph boundary
  between development and serving; static-graph instincts throughout.
- PyTorch organized around the eager module -- define-by-run first, compile
  as an opt-in capture (`torch.compile`) over whatever Dynamo can hold.
- JAX organized around **pure functions** *(why it matters: No side effects, no hidden state -- which is exactly the property XLA needs to see the whole program at once. The constraint that annoys users (explicit PRNG keys, no mutation) is the same property that makes whole-graph lowering, `vmap`, and `pmap` mechanical.)*: purity is the compiler
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


---

## Key equations

**Eq 1 · Fusion traffic cut**

$$
B_{\text{unfused}} = 2kNB \quad\xrightarrow{\text{fuse}}\quad B_{\text{fused}} = 2NB
$$

*A chain of k elementwise kernels round-trips an N-element tensor of B-byte values per kernel: each of the k ops reads and writes the full buffer. One fused kernel reads once and writes once. For the LayerNorm + dropout + activation chain (k = 3) the idealized traffic cut is ~3x, before counting the k - 1 launches it also removes.*

**Eq 2 · Dispatch overhead law**

$$
R = \frac{N_{\text{op}}\cdot o}{t_{\text{compute}} + t_{\text{memory}}}, \qquad \text{overhead-bound when } R > 1
$$

*N_op dispatched operations each pay a fixed host cost o; the device owes t_compute + t_memory under the additive no-overlap model. When R exceeds 1 the accelerator waits on Python. Every lever is named: fusion and capture shrink N_op, graph replay shrinks o, a larger batch grows the denominator. Dispatch share of step time is R/(1 + R).*

**Eq 3 · Compilation benefit**

$$
\text{Benefit} = \frac{P\,(t_{\text{eager}} - t_{\text{compiled}})}{T_{\text{compile}} + D\cdot T_{\text{compile}}}, \qquad \text{compile when } > 1
$$

*P production executions each save (t_eager - t_compiled); the setup cost is one compilation plus D development recompilations. Above 1 the capture pays for itself. The book's cost model puts the eager-to-JIT crossover near 2x10^6 executions and JIT-to-AOT near 6.7x10^6; ResNet-50 serving at ~47% speedup breaks even near 135K images.*

**Eq 4 · Saved-activation memory**

$$
A \approx B_{\text{batch}} \cdot L \cdot S \cdot d \cdot k \cdot e
$$

*Each of the L layers saves about k tensors of B x S x d activations at e bytes per element until the backward sweep unwinds past it. Linear in batch and depth; a non-sequence model drops S, a conv net replaces S x d with feature-map H x W x C. This is the term that makes the ResNet-50 training peak 82-121x its weight storage.*

**Eq 5 · The Jacobian reverse mode never builds**

$$
J \in \mathbb{R}^{m \times n}: \quad 10^{5} \times 10^{5} \times 4\,\text{B} = 40\,\text{GB}
$$

*A Jacobian for a 100,000-by-100,000 map has 10^10 entries - 40 GB in FP32, larger than most models. Reverse mode instead propagates adjoints as vector-Jacobian products from the scalar loss: every gradient in one backward sweep at a small constant multiple of forward cost. Forward mode would need one sweep per input direction.*

**Eq 6 · Dense backward work**

$$
W_{\text{train}} = 3\,W_{\text{fwd}} - W_{\text{mm}_1} \;\approx\; 2.013\,W_{\text{fwd}}
$$

*Each dense layer's backward runs two forward-sized GEMMs (the weight gradient and the input gradient), except the first layer, whose input gradient nobody requests. For the 784->128->10 step the dense training work is ~2.013x the forward - ch5's three-product rule with its input-gradient exception applied.*

**Eq 7 · Adam step traffic**

$$
B_{\text{Adam}} = 7 \cdot e \cdot P = 28\,\text{B/param}
$$

*FP32 Adam reads p, g, m, v and writes p, m, v: seven values at four bytes each per parameter. For the 101,770-parameter MLP that is ~2.85 MB - more traffic than the entire modeled forward-plus-backward step, and the term small training loops forget to count.*

**Eq 8 · Dispatch share of step time**

$$
\text{Share} = \frac{R}{1 + R}
$$

*The fraction of step time the host spends issuing work. R = 15.7 for a 1-us kernel gives 94% - the eager gantt's idle gaps made quantitative. R = 0.15 for a ~100-us GEMM gives 13%. The same per-op cost is everything for small ops and nothing for large ones.*

## From the book

- [Python dispatch overhead gantt](https://mlsysbook.ai/vol1/07_frameworks/07_frameworks.html) — The book's gantt of five 1-us kernels eagerly dispatched (~15 us host per op, ~94% device idle) against one fused launch. Our dispatch-share chart shows the same law as percentages; theirs shows it as a timeline - read ours for the ends, theirs for the shape of the wait.
- [Eager surfaces vs compiler-facing operator sets](https://mlsysbook.ai/vol1/07_frameworks/07_frameworks.html) — The book's grouped bar of PyTorch/TensorFlow eager growth (schemas doubling between snapshots) against Core ATen, XLA HLO, ONNX, and lax. Our chart shows the latest snapshot only; theirs adds the time dimension - both surfaces doubling is itself part of the story.
- [Total-cost lines across the continuum](https://mlsysbook.ai/vol1/07_frameworks/07_frameworks.html) — Compile-plus-execute cost versus production volume on a log scale, with the eager-to-JIT crossover near 2x10^6 executions and JIT-to-AOT near 6.7x10^6. The packet quotes the crossovers; the figure shows why they exist - each strategy is a line with a different intercept and slope.
- [Device interconnect hierarchy](https://mlsysbook.ai/vol1/07_frameworks/07_frameworks.html) — The book's margin chart ordering HBM3 (~3.35 TB/s), NVLink-class fabric, and PCIe Gen5 x16 (~64 GB/s) on a log scale - the ~52x HBM-to-PCIe gap that makes placement and pinned staging first-order concerns.
- [Dispatch share diverging with kernel size](https://mlsysbook.ai/vol1/07_frameworks/07_frameworks.html) — The book's margin figure of the same 94% / 13% split our dispatch-share chart plots. Where theirs sketches the divergence with kernel duration, ours states it as stacked shares of step time.
- [Training peak vs weights, log scale](https://mlsysbook.ai/vol1/07_frameworks/07_frameworks.html) — The book's margin bar comparing ~102 MB of FP32 ResNet-50 weights with the 8.4-12.4 GB training peak - an 82-121x ratio our training-peak chart decomposes into its four components.
- [Serial vs overlapped input pipeline](https://mlsysbook.ai/vol1/07_frameworks/07_frameworks.html) — The book's two margin figures on the DataLoader: copy/compute serialization versus stream overlap, and the worker/prefetch/pinned arrangement that keeps the feed ahead of a 1,000 img/s consumer.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

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

## Audio overview

[Listen to the Marcus & Iris read-along (~9 min)](https://benebsworth.com/study-audio/vol1/07-frameworks.m4a) — a generated podcast walking this packet's argument.
