---
title: "Neural Computation — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol1/05_nn_computation/05_nn_computation.html"
canonical_url: "https://benebsworth.com/study/vol1/05-nn-computation/"
---
# Neural Computation: Study Packet

*Working through Machine Learning Systems (Reddi, Harvard CS249r, mlsysbook.ai, CC-BY-NC-SA 4.0).
Chapter 5 of Volume I: the network as arithmetic, cost from shapes, backprop's double pass, the four kinds of training state, and the threshold that turns scores into decisions.*

## Thesis

A neural network is a **budget before it is a program** *(why it matters: Layer shapes alone, before any code runs, fix the parameter count, the per-example FLOP count, and the activation memory. Architecture decisions are resource decisions written in linear algebra.)*. A dense layer is one matrix product plus bias followed by an element-wise nonlinearity; a network is their composition, and without the nonlinearity the whole stack collapses to a single linear map. Everything the machine pays is readable off the shapes: **width costs quadratically** *(why it matters: Each weight sits in a matrix product, so doubling a layer's width quadruples its arithmetic. Depth only multiplies cost linearly, but adds sequential steps and one more set of saved activations.)*, depth costs linearly plus sequential latency and saved activations.
Training is then two coupled passes, not one. The forward pass records activations; the backward pass consumes them in reverse through the **chain rule** *(why it matters: Each layer's gradient is a product of local slopes, so a dense layer's backward pass runs two matrix products of forward size, one for the weight gradient and one to carry the signal to the previous layer. The classic rule: a training step costs about three times the forward arithmetic.)*. And training memory is **four kinds of state** *(why it matters: Weights, gradients, optimizer state, and saved activations. Inference keeps exactly one (the weights) plus a rolling pair of activation buffers, which is why a model that trains on a machine may not fit there and why the same arithmetic runs under different budgets in the two phases.)*, of which inference keeps exactly one.
**Batch size is the systems knob** *(why it matters: At batch one a dense layer is a matrix-vector product that reads every weight for a single multiply-accumulate (arithmetic intensity ~0.5 FLOP/byte). Batching turns it into a matrix-matrix product that reuses each weight across examples (intensity ~12 FLOP/byte at batch 32), trading activation memory and latency for reuse up the bandwidth slope of the roofline.)*: it converts a matrix-vector product into a matrix-matrix one, reusing each weight read across examples and climbing the bandwidth slope. Finally, scores are not decisions: a deployed classifier needs a **confidence threshold** *(why it matters: The top-class score is compared to a calibrated cutoff; inputs below it route to human review. The operating point is chosen on the risk-coverage curve by an expected-cost rule over review cost and error cost, the 1989 USPS system hit 1% error only by rejecting 12.1% of digits.)* that prices review work against residual error.

One running example carries every count: a fully connected MNIST network, 784 to 128 to 64 to 10, with 109,386 parameters (~438 KB FP32), 109,184 MACs (218,368 FLOPs) per digit, and a first layer holding 91.9% of the arithmetic.

> **note**
> Amber dotted marks each carry a one-line why-it-matters card: hover, tap, or
> tab to them. Select any text to pin your own highlight or note.

## Guided notes

### From logic to arithmetic

- The chapter opens with a paradigm shift: rule-based programs and
  hand-engineered features (HOG descriptors ~3,780 ops/digit for digits) give
  way to learned features evaluated as matrix arithmetic (~218K FLOPs for the
  running network). The machine trade: control-flow code becomes structured
  parallel ops with large tensor working sets, accelerator-friendly.
- **Backpropagation is not learning** *(why it matters: Backprop computes the gradient; gradient descent performs the update. Confusing the two hides which one sets activation storage (backprop's saved values) and which sets optimizer state (the update rule's running statistics).)*, it is a gradient
  computation algorithm. It waited decades for systems: the chain rule was
  mechanized in the 1960s, but cheap dense matrix arithmetic plus enough
  labeled data had to exist before the loop was economical.
- Every stage of a training step is already legible at the ledger level:
  forward (one MAC per weight per example), loss (negligible), backward
  (up to twice the forward work), update (a few ops per parameter, byte-bound).

> **observation**
> The book's framing inversion: instead of "here is a neuron, here is the
> math," it asks "what does this computation cost and who pays." The systems
> table (work / data moved / state left behind / dominant cost) is the
> chapter's real thesis in miniature.

### Neural network fundamentals

- One neuron: $\hat{y}_j = f(\sum_i x_i w_{ij} + b_j)$. A layer vectorizes it:
  $Z = XW + b$, then $A = f(Z)$ element-wise. A network composes layers.

**Eq 1 · A layer is a map**
$$
A^{(l)} = f^{(l)}\!\left(A^{(l-1)} W^{(l)} + b^{(l)}\right)
$$
- **The nonlinearity is load-bearing** *(why it matters: Composing linear maps produces a linear map, so a stack of purely linear layers adds no expressiveness at any depth. The activation is also the cheapest operation in the layer, but it is what makes the rest worth computing.)*: strip it and depth collapses to one
  matrix product.
- Activation functions have a hardware price list: sigmoid and tanh need an
  exponential datapath and saturate (gradient ~0 for $|z| > 5$); ReLU is a
  comparator, about **50x cheaper in transistor area**, passes gradient 1 on
  its positive branch, and can die (a neuron stuck at zero never updates);
  softmax normalizes scores for the output.
- Parameters follow shapes: $(n_{in}+1)\,n_{out}$ per layer. The running
  network: 100,480 + 8,256 + 650 = 109,386. The first layer alone holds
  100,352 weights, **91.9% of the MACs**, because it meets the widest operand
  (784 inputs) at the widest matrix.
- Depth vs width is asymmetric: width enters quadratically (every weight sits
  in a product), depth linearly, but each added layer adds a sequential step
  and one more set of activations to hold for the backward pass.

**Eq 2 · Cost from shapes**
$$
P = \sum_{l=1}^{L} (n_{l-1}+1)\,n_l, \qquad \mathrm{Ops} = 2\sum_{l=1}^{L} n_{l-1}\,n_l, \qquad M_{act} \propto B\sum_{l=1}^{L} n_l
$$

![The layer ledger: cost read off shapes](https://benebsworth.com/study/vol1/05-nn-computation/diagrams/layer-ledger.svg)

*The running 784-128-64-10 network with the bill each shape fixes before code runs: 109,386 parameters and 109,184 MACs, of which the input layer alone holds 91.9%. Width enters quadratically because every weight sits in a matrix product; depth adds sequential steps and saved activations.*
- Why depth matters anyway: hierarchical representations reuse lower-level
  features; the fallacy section counters with ResNet's 1,202-layer CIFAR-10
  net testing *worse* than its 110-layer one, and EfficientNet's compound
  scaling (width, depth, resolution together) beating depth-only scaling.

### Learning process

- Supervised step: forward $\hat{y} = f(x;\theta)$, loss
  $\mathcal{L}(\hat{y}, y)$, backward gradients, update. Mini-batch descent
  averages per-example gradients, the batch becomes the main systems knob.
- Cross-entropy against a one-hot label collapses to the negative log of the
  correct-class probability. Fused with softmax, the logit gradient is
  $p - y$: push down every wrong class by its predicted mass, push the right
  class up by $1 - p$.

**Eq 3 · Cross-entropy with fused softmax gradient**
$$
L(\hat{y}, y) = -\sum_{j} y_j \log \hat{y}_j = -\log \hat{y}_{\mathrm{correct}}, \qquad \frac{\partial L}{\partial z_j} = p_j - y_j
$$

- Worked example from the book: a "seven" scored 0.6 on "three" and 0.1 on
  "seven." Loss = $-\log 0.1 \approx 2.30$; the "three" logit gets +0.6 (down),
  "seven" gets $-0.9$ (up).
- Backward pass at a dense layer = four ops: mask ($\odot f'(Z)$), weight
  gradient $A^T \cdot dZ$, bias gradient $1^T \cdot dZ$, input gradient
  $dZ \cdot W^T$. Two of those are matmuls of forward size, hence
  **backward ~2x forward, full step ~3x**. The running network comes in lower
  (~2.08x) because layer 1 needs no input gradient, and it holds most of the
  arithmetic.

**Eq 4 · Two backward products per layer**
$$
\underbrace{\frac{\partial L}{\partial W^{(l)}} = {A^{(l-1)}}^{\!\!T}\frac{\partial L}{\partial Z^{(l)}}}_{\text{weight grad}}
\qquad
\underbrace{\frac{\partial L}{\partial A^{(l-1)}} = \frac{\partial L}{\partial Z^{(l)}}{W^{(l)}}^{\!\!T}}_{\text{input grad}}
$$

- **Saved activations are the hidden contract** *(why it matters: Every forward activation must stay live until the backward pass reaches its layer, or be recomputed later. Memory peaks at the turnaround between the passes. This is why training memory can exceed inference memory with identical weights and identical forward arithmetic.)*: memory peaks at the
  turnaround between passes; every forward output stays live until its
  consumer in reverse.
- Numerical range is part of the training contract, not an implementation
  detail: the chain rule multiplies ~$L$ local factors, so per-layer slopes
  slightly below 1 vanish exponentially (20 sigmoid layers: $0.25^{20}
  \approx 9\times 10^{-13}$), slightly above 1 explode to Inf then NaN.
  Small gradients flush below the format's smallest normal (FP32
  ~$1.2\times 10^{-38}$, FP16 ~$6.1\times 10^{-5}$); some accelerators
  skip the subnormal range for speed and a zeroed gradient stops its weight
  entirely. Xavier/He initialization and non-saturating activations exist to
  keep that product near 1.

### Inference pipeline

- The phase shift: gradients, optimizer state, and most saved activations
  vanish; deadlines replace the training objective. Inference memory =
  weights + the largest adjacent pair of activation buffers, a sequential
  feed-forward pass frees layer $l$'s buffer once layer $l+1$ is done.
  (Skip connections extend buffer lifetimes; the KV cache in ch 6 is the
  extreme version.)

**Eq 5 · Four kinds of state**
$$
M_{train} \approx W + G + O + A_{saved}, \qquad M_{infer} \approx W + \max_l\left(A^{(l)} + A^{(l+1)}\right)
$$

- The running network at batch 32: inference ~462 KB, training step ~1.3 MB,
  roughly **3x** the memory for identical weights and forward arithmetic.
- Batching is the first lever: at $B{=}1$ every layer is a matrix-vector
  product (each weight read for one MAC, intensity ~0.5 FLOP/byte); at
  $B{=}32$ it is matrix-matrix (each weight read serves 32 MACs, intensity
  ~12 FLOP/byte). On the book's roofline, that is ~25 to ~595 GFLOP/s on the
  CPU and ~2 to ~40 TFLOP/s on the accelerator, both still on the
  bandwidth slope (ridge ~20 FLOP/byte). The accelerator wins on
  bandwidth, not multipliers.

**Eq 6 · Intensity and the roofline bound**
$$
I \approx \frac{\mathrm{FLOPs}}{\mathrm{bytes\ moved}} = \frac{2\,B\sum_l n_{l-1}n_l}{4B\sum_l n_l + 4P}, \qquad \mathrm{rate} = \min(\mathrm{peak},\ \mathrm{BW} \times I)
$$


**Arithmetic intensity vs batch size (main-memory traffic model)**

| Batch size | Arithmetic intensity (FLOP/byte) |
|---|---|
| batch 1 | 0.49 |
| batch 8 | 3.7 |
| batch 32 | 12.4 |
| batch 128 | 29.6 |

*Packet-owned computation from the chapter's running network: FLOPs over bytes moved under a stream-everything model, I = 2B·109,184 / (4B·986 + 4·109,386). Batching reuses each weight read across examples, climbing the bandwidth slope from ~0.5 to ~12 at batch 32 — and past the ~20 ridge by batch 128, where the model overstates real traffic because runtimes keep weights resident between steps. Book confirms ~0.5 (B=1) and ~12 (B=32).*

- Once the network is fast, the boundary stages dominate: preprocessing and
  postprocessing run on the host CPU, and Amdahl's law caps end-to-end
  speedup at $1/(1-f)$ over the unaccelerated fraction. Kernel fusion,
  quantization, and buffer planning (ch 7, 10, 13) all live at this edge.

### Handwritten digit recognition

- The deployed case study: 1989 USPS ZIP-code readers (early LeNet variant,
  ~9,760 params, ~40 KB, an order of magnitude smaller than the running
  network) and later bank-check readers share one six-stage pipeline:
  acquisition, preprocessing (segment, normalize), neural scoring,
  threshold check, downstream decision, human review for the rejected.
- **The network's output is a score, not a decision** *(why it matters: A confidence threshold divides labor between automation and review. The expected-cost rule (Chow 1970) picks the threshold minimizing r(tau) * review cost + e(tau) * error cost. A 1% error rate reported on accepted items means nothing without the rejection fraction, 12.1% of traffic went to humans to buy it.)*.
  The expected-cost rule minimizes
  $r(\tau)\,C_{review} + e(\tau)\,C_{error}$, and an error rate on accepted
  items must be multiplied by the accepted fraction before it counts.

**Eq 7 · The expected-cost threshold rule**
$$
\tau^{*} = \arg\min_{\tau}\ \ r(\tau)\,C_{review} + e(\tau)\,C_{error}
$$
- Measured point: **1% error on accepted digits only by rejecting 12.1%**;
  throughput dropped from >30 classifications/s after normalization to
  10-12/s including acquisition, the Amdahl boundary in the wild. Envelope
  belts leave tens of milliseconds per item.

![The reject gate turns scores into decisions](https://benebsworth.com/study/vol1/05-nn-computation/diagrams/reject-gate.svg)

*The six-stage USPS/check-reader composite: acquisition and preprocessing feed the neural scorer, a confidence threshold splits accepted items from review traffic, and the expected-cost rule prices the split. The 1989 system's 1% error bought its number by rejecting 12.1% of digits.*
- Drift applies here too (ch 4 echo): scanner optics, ink, envelope textures,
  and writing styles shift the input distribution; production monitoring
  tracks image statistics and the rejection rate, because review capacity
  is finite.

### D·A·M reading + fallacies

- The triad axes pull on each other: a bigger input grows the first weight
  matrix (a 56x56 input would roughly quadruple layer-1 MACs), a bigger
  batch grows training memory, a narrower format endangers gradients.
  Diagnosis = hypothesize per axis, then measure the binding constraint.
- Fallacies worth flagging: "deeper is always better" (ResNet 1,202 < 110),
  "distribution issues can be fixed after design" (a 99:1 fraud detector
  scores 99% by always predicting not-fraud), "research models deploy
  directly" (model latency inside a 50-100 ms budget leaves ~nothing for
  pre/post stages), "more compute means faster" (workload sits below the
  ridge point and waits on memory), and extrapolating accuracy gains
  (ImageNet top-5 error fell 15.3% to 3.6% while compute rose >10x; the
  benchmark histories mix architectures with scale).

> **caution**
> The pitfall pattern across the chapter: treating statistical behavior as
> if code behavior alone determined it. Accuracy targets, thresholds, batch
> sizes, and precisions are all contracts with a counterparty (the data, the
> machine, the review queue), not settings on the model.

## The physics

| Quantity | Value | Use |
|---|---|---|
| MAC per weight per example (dense) | 1 MAC = 2 FLOPs | layer cost unit |
| Running network params | 109,386 (~438 KB FP32) | 784-128-64-10 + biases |
| MACs per digit | 109,184 | first layer holds 91.9% |
| Backward arithmetic | ~2x forward | 2 matmuls per dense layer |
| Full training step | ~3x forward | running net ~2.08x (skips input grad at layer 1) |
| Training state | W + G + O + A | four kinds; inference keeps one + buffer pair |
| Training/inference memory | ~3x at batch 32 | ~1.3 MB vs ~462 KB |
| Arithmetic intensity | ~0.5 (B=1) to ~12 FLOP/B (B=32) | both below ~20 FLOP/B ridge: bandwidth-bound |
| Fused softmax+CE logit grad | $p - y$ | push wrong classes down by $p$ |
| Sigmoid-vs-ReLU area | ~50x transistor area | exponential datapath vs comparator |
| FP16 min normal | ~$6.1\times 10^{-5}$ | gradients below it flush to zero |
| USPS 1989 | 1% error, 12.1% rejected | ~9,760 params, ~40 KB, 10-12/s end-to-end |

## Glossary

- **MAC (multiply-accumulate)**: one multiply plus one add, the atomic unit
  of dense-layer work; 2 FLOPs.
- **Arithmetic intensity**: FLOPs per byte moved; the x-axis of the roofline
  and the quantity batching raises.
- **Ridge point**: a machine's peak-rate/bandwidth ratio; workloads below it
  are bandwidth-bound regardless of peak compute.
- **Saved activations**: forward outputs kept live for the backward pass;
  scale with batch x depth x width.
- **Optimizer state**: per-parameter running statistics (e.g. momentum,
  Adam's two moments); zero at inference.
- **Jacobian**: the matrix of local slopes one layer contributes to the
  chain-rule product.
- **Subnormal / flush-to-zero**: the denormal range below a format's
  smallest normal; some hardware flushes to zero for speed, freezing weights.
- **Xavier/He initialization**: variance-scaled random weight draws that
  keep the layer-product signal near unit scale at step zero.
- **Reject option**: routing low-confidence predictions to human review
  instead of forcing a classification.
- **Risk-coverage curve**: error among accepted predictions vs fraction
  accepted; the curve a threshold is chosen on.
- **Buffer reuse**: inference frees layer l's activation buffer when l+1
  completes; peak = largest adjacent pair.
- **Logits**: raw pre-softmax scores; softmax turns them into a normalized
  distribution.
- **Kernel fusion**: keeping intermediate results on-chip across adjacent
  ops instead of round-tripping memory.
- **Amdahl's law**: end-to-end speedup capped at 1/(1 - unaccelerated
  fraction); why boundary stages dominate fast models.

## → Ben's world

- **The edge-batching argument is the same argument.** The knowledge
  console's canvas batches ~750 quiet wires into ~3 stroke calls so each
  `beginPath`/`stroke` read serves many edges. Batching a matmul reuses each
  weight read across examples. Both are "amortize the expensive thing
  (state read / context call) across cheap repetitions," and both only pay
  off below the machine's ridge point. The graph's LOD tiers are the same
  ledger thinking: cost readable off shapes, spent only where visible.
- **The LLM benchmark's tok/s vs quality sweep** is a live intensity problem:
  qwen-mlx's thinking mode trades tokens/sec for accuracy; the ridge-point
  question is which model is bandwidth-bound (weights streaming from unified
  memory) vs compute-bound. Worth an experiment: report per-model intensity
  (params x bytes / generated FLOPs) alongside tok/s.
- **Reject option in the harness**: the benchmark's failure classification
  is the same score-to-decision boundary. A "return to review" tier for
  low-confidence harness verdicts would be the USPS gate in miniature,
  priced by (reviewer minutes) vs (wrong-verdict cost).
- **Four-state accounting for the droplet**: the shared box runs four
  products on one budget; the training-memory decomposition (persistent vs
  transient vs per-step state) is the right lens for whether a fifth tenant
  fits: its idle footprint is the "weights" term, its job bursts the
  "activations."

## Open questions

- The ~3x rule is derived on dense layers. Conv and attention layers have
  different backward products (im2col, two attention matmuls); where does
  the multiplier land for a transformer block? (ch 6 / 8 territory.)
- Checkpointing trades recompute for the saved-activation term. At what
  activation-memory pressure does recompute break even on the running
  network's roofline?
- Mixed precision changes the optimizer-state term (Adam keeps FP32 master
  weights) and the flush-to-zero floor simultaneously. Does the four-state
  budget predict when FP16 training destabilizes before accuracy does?
- The book notes the running model can live entirely in a CPU cache, which
  changes the "streams from main memory" traffic model. What does the
  intensity argument look like with cache residency modeled?


---

## Key equations

**Eq 1 · A layer is a map**

$$
A^{(l)} = f^{(l)}\!\left(A^{(l-1)} W^{(l)} + b^{(l)}\right)
$$

*One dense layer: previous activations times a weight matrix plus a bias, then an element-wise nonlinearity. A network is this map composed L times; without f the composition collapses to a single linear map and depth buys nothing.*

**Eq 2 · Cost from shapes**

$$
P = \sum_{l=1}^{L} (n_{l-1}+1)\,n_l, \quad \mathrm{Ops} = 2\sum_{l=1}^{L} n_{l-1}\,n_l, \quad M_{act} \propto B\sum_{l=1}^{L} n_l
$$

*Parameters, per-example work, and retained-activation memory all read off the layer widths before any code runs. Width enters quadratically (every weight sits in a product), depth linearly but adds sequential steps and saved activations. For 784-128-64-10: P = 109,386, Ops = 218,368 FLOPs/digit.*

**Eq 3 · Cross-entropy with fused softmax gradient**

$$
L = -\log \hat{y}_{\mathrm{correct}}, \qquad \frac{\partial L}{\partial z_j} = p_j - y_j
$$

*Against a one-hot label the full cross-entropy sum collapses to the negative log of the correct-class probability. Fused with softmax, each logit's gradient is predicted mass minus target: wrong classes push down by p, the right class up by 1 - p. The 'seven read as three' example: loss -log(0.1) = 2.30, gradients +0.6 on 'three', -0.9 on 'seven'.*

**Eq 4 · Two backward products per layer**

$$
\frac{\partial L}{\partial W^{(l)}} = {A^{(l-1)}}^{\!\!T}\frac{\partial L}{\partial Z^{(l)}}, \qquad \frac{\partial L}{\partial A^{(l-1)}} = \frac{\partial L}{\partial Z^{(l)}}{W^{(l)}}^{\!\!T}
$$

*A dense layer's backward pass runs two matrix products of forward size: one for the weight gradient and one to carry the signal to the previous layer. That is the origin of the 3x rule, one forward product plus two backward products per layer. The first layer skips its input gradient, so the running network lands near 2.08x.*

**Eq 5 · Four kinds of state**

$$
M_{train} \approx W + G + O + A_{saved}, \qquad M_{infer} \approx W + \max_l\big(A^{(l)} + A^{(l+1)}\big)
$$

*Training holds weights, gradients, optimizer state, and saved activations; inference keeps the weights plus the largest adjacent pair of activation buffers (each layer's buffer dies when the next layer finishes). For the running network at batch 32 that is ~1.3 MB vs ~462 KB, about 3x the memory for identical weights and identical forward arithmetic.*

**Eq 6 · Intensity and the roofline bound**

$$
I = \frac{2\,B\sum_l n_{l-1}n_l}{4B\sum_l n_l + 4P}, \qquad \mathrm{rate} = \min(\mathrm{peak},\ \mathrm{BW} \times I)
$$

*FLOPs over bytes moved under a stream-everything traffic model. Batching multiplies the numerator (each weight read serves B examples) while parameter bytes stay fixed, so intensity climbs ~0.5 FLOP/byte at batch 1 toward ~12 at batch 32, both below the ~20 FLOP/byte ridge. The workload is bandwidth-bound: the accelerator's lead is its memory bandwidth, not its multipliers.*

**Eq 7 · The expected-cost threshold rule**

$$
\tau^{*} = \arg\min_{\tau}\ r(\tau)\,C_{review} + e(\tau)\,C_{error}
$$

*Chow's 1970 reject option: choose the confidence threshold minimizing manual-review fraction times review cost plus misclassified fraction times error cost. Both fractions count all arriving items, so an error rate quoted on accepted items must be scaled by the accepted fraction. When errors are expensive the rule buys review volume; when reviews are expensive it tolerates error.*

**Eq 8 · The chain-rule product**

$$
\frac{\partial L}{\partial A^{(l)}} = \frac{\partial L}{\partial A^{(l+1)}}\,\frac{\partial A^{(l+1)}}{\partial A^{(l)}}
$$

*Each layer's gradient is a product of local slopes applied in reverse order, so the backward pass consumes saved activations last-to-first. Cascaded over L layers it multiplies L Jacobian factors end to end: factors below 1 vanish exponentially (20 sigmoid layers: 0.25^20 ~ 9e-13), above 1 they explode to Inf then NaN. Numerical range is part of the training contract.*

## Charts

**Training vs inference memory at batch 32 (KB, FP32)**

| Phase | Weights | Activations (pair vs all saved) | Gradients | Optimizer state |
|---|---|---|---|---|
| inference | 437.5 | 24.6 | 0 | 0 |
| training step | 437.5 | 25.8 | 437.5 | 437.5 |

*The four-state decomposition for the running network. Inference keeps weights plus the largest adjacent pair of activation buffers (~462 KB total); a training step adds gradients, one momentum-style optimizer copy, and all saved layer outputs (~1.3 MB, ~3x). Simplified single-device accounting matching the book's budget table; real runtimes add workspace and framework overhead.*

**MACs per layer: the first layer holds 91.9%**

| Layer | MACs per digit |
|---|---|
| 784 -> 128 | 100352 |
| 128 -> 64 | 8192 |
| 64 -> 10 | 640 |

*Multiply-accumulates per digit by layer for 784-128-64-10. The input layer dominates because it meets the widest operand (784) at the widest matrix, 100,352 of 109,184 MACs. This is why input resolution is a cost axis, not just a fidelity axis: a 56x56 input would roughly quadruple the dominant term.*


## From the book

- [fig-mnist-roofline: the running network on two rooflines](https://mlsysbook.ai/vol1/05_nn_computation/05_nn_computation.html) — Attainable FP32 rate vs arithmetic intensity for a desktop CPU and a data-center accelerator, with the running network marked at batch 1 (~0.5 FLOP/byte) and batch 32 (~12). Both points sit left of both ridge points (~20), the cleanest statement that this workload is bandwidth-bound and batching climbs the slope.
- [The two coupled passes](https://mlsysbook.ai/vol1/05_nn_computation/05_nn_computation.html) — Forward pass recording activations, backward pass consuming them in reverse; the turnaround is where saved-activation memory peaks. Our four-states.svg prices the same picture per term.
- [The composite USPS inference pipeline](https://mlsysbook.ai/vol1/05_nn_computation/05_nn_computation.html) — The book's six-stage composite shared by ZIP-code research and check readers: acquisition, preprocessing, neural scoring, thresholding, decision, review. Our reject-gate.svg abstracts the same shape around the threshold.
- [Handwritten address variability](https://mlsysbook.ai/vol1/05_nn_computation/05_nn_computation.html) — Real envelope city names and ZIP codes from the USPS database: cursive slant, uneven stroke width, broken loops, textured backgrounds. The variability preprocessing had to absorb before any network saw a digit.
- [Matmul share of the forward pass](https://mlsysbook.ai/vol1/05_nn_computation/05_nn_computation.html) — The book's margin figure on matrix multiplication's dominance: bias, activation, and softmax terms contribute a negligible fraction next to the matmul rows, which is why 'count the matmuls' is the whole cost model.
- [Training vs inference memory budget table](https://mlsysbook.ai/vol1/05_nn_computation/05_nn_computation.html) — The per-term byte table behind the ~3x ratio at batch 32: persistent parameters vs gradients, optimizer state, and saved activations. Worth auditing line by line against the four-state equation.
- [Early ZIP-code recognition results](https://mlsysbook.ai/vol1/05_nn_computation/05_nn_computation.html) — The 1989 measured point: 1% classification error on accepted digits after rejecting 12.1%, and the throughput drop from >30 to 10-12 classifications/s once acquisition is included. One point on the risk-coverage curve.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

Answer in writing before checking. The MCQs adapt the chapter's self-check
items; the Feynman prompts are oral-exam style, the numerics are
back-of-envelope.

## Book-check MCQs

**Q1.** A team stacks 20 linear layers and no activations, arguing depth will
add capacity. What does the math actually give them?

- a) A network 20x as expensive to train but equivalently expressive to one layer
- b) A single linear map: composing linear maps is a linear map, so the extra
  layers add cost without adding expressiveness
- c) A network that cannot be trained because gradients vanish without activations
- d) A valid deep network as long as the layers are wide enough

**Q2.** Why does the backward pass through a dense layer cost roughly twice
the forward pass?

- a) Gradients require second derivatives, which double the work
- b) The backward pass runs two matrix products of forward size: $A^T\,dZ$ for
  the weight gradient and $dZ\,W^T$ for the input gradient
- c) Every weight must be updated twice per step by the optimizer
- d) The loss must be evaluated once per parameter

**Q3.** Compared to a training step on the same machine, what does inference
memory retain?

- a) Weights, gradients, and a rolling activation buffer
- b) Weights plus all saved activations, but no optimizer state
- c) The weights plus the largest adjacent pair of activation buffers
- d) Exactly one-quarter of the training footprint by definition

**Q4.** The fused softmax + cross-entropy gradient at a logit simplifies to
what?

- a) $p_j \cdot y_j$, the product of prediction and target
- b) $-\log p_j$, the negative log of the predicted mass
- c) $p_j - y_j$, predicted mass minus the one-hot target
- d) $y_j / p_j$, the importance-weighted error

**Q5.** ReLU displaced sigmoid in most hidden layers partly for a hardware
reason. Which?

- a) ReLU needs no exponent datapath: a comparator is ~50x cheaper in
  transistor area, and its positive-branch gradient is exactly 1 (no saturation)
- b) ReLU uses half the memory of sigmoid activations
- c) ReLU can be fused into the matmul kernel, sigmoid cannot
- d) Sigmoid requires FP64 to avoid underflow

**Q6.** The 1989 USPS digit reader reported 1% classification error. What
made that number achievable?

- a) A convolutional architecture larger than any network trained before it
- b) Doubling the training set with synthetic distortions
- c) Running the classifier three times and voting
- d) Rejecting 12.1% of digits for human review: the error was measured only
  on the accepted fraction

## Feynman prompts

**Q7.** Explain to a skeptical firmware engineer why "the network is a budget
before it is a program." Use the running MNIST network: show that parameter
count, per-example FLOPs, and activation memory are all decided by layer
shapes alone, and explain why the first layer holds 91.9% of the arithmetic.

**Q8.** A colleague says "backpropagation is how the network learns."
Correct the statement: separate the gradient-computation algorithm from the
update rule, and explain which one creates the saved-activation memory term
and which creates the optimizer-state term.

## Numerics

**Q9.** A fully connected network for a different task is 512-256-10.
Compute the parameter count, MACs per example, and FLOPs per example.
Then: at FP32, what is the persistent weight footprint?

<details><summary>Answer</summary>

- Params: $(512+1)\cdot256 + (256+1)\cdot10 = 131,328 + 2,570 = 133,898$
- MACs: $512\cdot256 + 256\cdot10 = 131,072 + 2,560 = 133,632$
- FLOPs: $2 \times 133,632 = 267,264$
- Weights: $133,898 \times 4\text{B} \approx 535.6\text{ KB}$

</details>

**Q10.** A model has 110M parameters trained with Adam (two moment buffers)
in FP32. Estimate the static training memory before activations, then state
the smallest batch-activation term that would push total memory past 2 GB.

<details><summary>Answer</summary>

- Weights: $110\text{M} \times 4\text{B} = 440$ MB
- Gradients: 440 MB
- Optimizer state (2 moments): 880 MB
- Static total: $440 + 440 + 880 = 1,760$ MB $\approx 1.72$ GB
- Any activation-plus-workspace term above ~270 MB crosses 2 GB. With
  activations scaling as $B \cdot \sum_l n_l \cdot 4\text{B}$, that bound is
  reached quickly, which is why large-model training checkpoints or shards
  activations rather than holding them.

</details>

## Audio overview

[Listen to the Marcus & Iris read-along (~6 min)](https://benebsworth.com/study-audio/vol1/05-nn-computation.m4a) — a generated podcast walking this packet's argument.
