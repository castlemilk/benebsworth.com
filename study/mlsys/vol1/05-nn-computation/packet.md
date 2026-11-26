# Neural Computation: Study Packet

*Working through Machine Learning Systems (Reddi, Harvard CS249r, mlsysbook.ai, CC-BY-NC-SA 4.0).
Chapter 5 of Volume I: the network as arithmetic, cost from shapes, backprop's double pass, the four kinds of training state, and the threshold that turns scores into decisions.*

## Thesis

A neural network is a ==budget before it is a program=={Layer shapes alone, before any code runs, fix the parameter count, the per-example FLOP count, and the activation memory. Architecture decisions are resource decisions written in linear algebra.}. A dense layer is one matrix product plus bias followed by an element-wise nonlinearity; a network is their composition, and without the nonlinearity the whole stack collapses to a single linear map. Everything the machine pays is readable off the shapes: ==width costs quadratically=={Each weight sits in a matrix product, so doubling a layer's width quadruples its arithmetic. Depth only multiplies cost linearly, but adds sequential steps and one more set of saved activations.}, depth costs linearly plus sequential latency and saved activations.
Training is then two coupled passes, not one. The forward pass records activations; the backward pass consumes them in reverse through the ==chain rule=={Each layer's gradient is a product of local slopes, so a dense layer's backward pass runs two matrix products of forward size, one for the weight gradient and one to carry the signal to the previous layer. The classic rule: a training step costs about three times the forward arithmetic.}. And training memory is ==four kinds of state=={Weights, gradients, optimizer state, and saved activations. Inference keeps exactly one (the weights) plus a rolling pair of activation buffers, which is why a model that trains on a machine may not fit there and why the same arithmetic runs under different budgets in the two phases.}, of which inference keeps exactly one.
==Batch size is the systems knob=={At batch one a dense layer is a matrix-vector product that reads every weight for a single multiply-accumulate (arithmetic intensity ~0.5 FLOP/byte). Batching turns it into a matrix-matrix product that reuses each weight across examples (intensity ~12 FLOP/byte at batch 32), trading activation memory and latency for reuse up the bandwidth slope of the roofline.}: it converts a matrix-vector product into a matrix-matrix one, reusing each weight read across examples and climbing the bandwidth slope. Finally, scores are not decisions: a deployed classifier needs a ==confidence threshold=={The top-class score is compared to a calibrated cutoff; inputs below it route to human review. The operating point is chosen on the risk-coverage curve by an expected-cost rule over review cost and error cost, the 1989 USPS system hit 1% error only by rejecting 12.1% of digits.} that prices review work against residual error.

One running example carries every count: a fully connected MNIST network, 784 to 128 to 64 to 10, with 109,386 parameters (~438 KB FP32), 109,184 MACs (218,368 FLOPs) per digit, and a first layer holding 91.9% of the arithmetic.

> [!note]
> Amber dotted marks each carry a one-line why-it-matters card: hover, tap, or
> tab to them. Select any text to pin your own highlight or note.

## Guided notes

### From logic to arithmetic

- The chapter opens with a paradigm shift: rule-based programs and
  hand-engineered features (HOG descriptors ~3,780 ops/digit for digits) give
  way to learned features evaluated as matrix arithmetic (~218K FLOPs for the
  running network). The machine trade: control-flow code becomes structured
  parallel ops with large tensor working sets, accelerator-friendly.
- ==Backpropagation is not learning=={Backprop computes the gradient; gradient descent performs the update. Confusing the two hides which one sets activation storage (backprop's saved values) and which sets optimizer state (the update rule's running statistics).}, it is a gradient
  computation algorithm. It waited decades for systems: the chain rule was
  mechanized in the 1960s, but cheap dense matrix arithmetic plus enough
  labeled data had to exist before the loop was economical.
- Every stage of a training step is already legible at the ledger level:
  forward (one MAC per weight per example), loss (negligible), backward
  (up to twice the forward work), update (a few ops per parameter, byte-bound).

> [!observation]
> The book's framing inversion: instead of "here is a neuron, here is the
> math," it asks "what does this computation cost and who pays." The systems
> table (work / data moved / state left behind / dominant cost) is the
> chapter's real thesis in miniature.

### Neural network fundamentals

- One neuron: $\hat{y}_j = f(\sum_i x_i w_{ij} + b_j)$. A layer vectorizes it:
  $Z = XW + b$, then $A = f(Z)$ element-wise. A network composes layers.

::eq[layer-map]

$$
A^{(l)} = f^{(l)}\!\left(A^{(l-1)} W^{(l)} + b^{(l)}\right)
$$
- ==The nonlinearity is load-bearing=={Composing linear maps produces a linear map, so a stack of purely linear layers adds no expressiveness at any depth. The activation is also the cheapest operation in the layer, but it is what makes the rest worth computing.}: strip it and depth collapses to one
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

::eq[depth-width-cost]

$$
P = \sum_{l=1}^{L} (n_{l-1}+1)\,n_l, \qquad \mathrm{Ops} = 2\sum_{l=1}^{L} n_{l-1}\,n_l, \qquad M_{act} \propto B\sum_{l=1}^{L} n_l
$$

::fig[layer-ledger]

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

::eq[softmax-ce]

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

::eq[backprop-cost]

$$
\underbrace{\frac{\partial L}{\partial W^{(l)}} = {A^{(l-1)}}^{\!\!T}\frac{\partial L}{\partial Z^{(l)}}}_{\text{weight grad}}
\qquad
\underbrace{\frac{\partial L}{\partial A^{(l-1)}} = \frac{\partial L}{\partial Z^{(l)}}{W^{(l)}}^{\!\!T}}_{\text{input grad}}
$$

- ==Saved activations are the hidden contract=={Every forward activation must stay live until the backward pass reaches its layer, or be recomputed later. Memory peaks at the turnaround between the passes. This is why training memory can exceed inference memory with identical weights and identical forward arithmetic.}: memory peaks at the
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

::eq[training-memory]

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

::eq[arithmetic-intensity]

$$
I \approx \frac{\mathrm{FLOPs}}{\mathrm{bytes\ moved}} = \frac{2\,B\sum_l n_{l-1}n_l}{4B\sum_l n_l + 4P}, \qquad \mathrm{rate} = \min(\mathrm{peak},\ \mathrm{BW} \times I)
$$

::chart[intensity-batch]

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
- ==The network's output is a score, not a decision=={A confidence threshold divides labor between automation and review. The expected-cost rule (Chow 1970) picks the threshold minimizing r(tau) * review cost + e(tau) * error cost. A 1% error rate reported on accepted items means nothing without the rejection fraction, 12.1% of traffic went to humans to buy it.}.
  The expected-cost rule minimizes
  $r(\tau)\,C_{review} + e(\tau)\,C_{error}$, and an error rate on accepted
  items must be multiplied by the accepted fraction before it counts.

::eq[reject-cost]

$$
\tau^{*} = \arg\min_{\tau}\ \ r(\tau)\,C_{review} + e(\tau)\,C_{error}
$$
- Measured point: **1% error on accepted digits only by rejecting 12.1%**;
  throughput dropped from >30 classifications/s after normalization to
  10-12/s including acquisition, the Amdahl boundary in the wild. Envelope
  belts leave tens of milliseconds per item.

::fig[reject-gate]

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

> [!caution]
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
