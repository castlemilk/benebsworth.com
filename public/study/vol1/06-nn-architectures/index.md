---
title: "Neural Network Architectures — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol1/06_nn_architectures/06_nn_architectures.html"
canonical_url: "https://benebsworth.com/study/vol1/06-nn-architectures/"
---
# Neural Network Architectures: Study Packet

*Working through Machine Learning Systems (Reddi, Harvard CS249r, mlsysbook.ai, CC-BY-NC-SA 4.0).
Chapter 6 of Volume I: inductive bias as a contract with physics, every family lowering onto GEMM, the two regimes of a transformer, and the embedding capacity wall.*

## Thesis

An architecture is a **cost signature** *(why it matters: Three counts per building block -- weights stored, multiply-accumulates performed, bytes that must move or stay resident -- predict which iron-law term dominates before a single benchmark runs. The architecture does not fix the numbers, but it chooses which one saturates first.)* before it is a model. Each family is defined by the structural assumption it encodes: spatial locality and weight sharing for convolution, ordered recurrence for sequence state, content-based routing for attention, and none at all for the dense layer. A bias that matches the data cuts **parameters, samples, and operations** *(why it matters: A shared 3×3 filter on an ImageNet-sized input uses ~5,575× fewer weights than one dense feature detector. The same mechanism also reduces the dataset size needed to generalize, which is why weak priors only win when data and compute are large enough to pay for them.)*; a weak prior only pays off once data and compute are large enough. Almost every family then **lowers onto GEMM** *(why it matters: Convolution reaches matrix multiply through im2col, attention and LSTM gates fuse projections into wide GEMMs, and a 1×1 convolution is already a GEMM -- so matrix engines dominate the operation count and the exceptions are the memory-bound remainder: gathers, residual adds, normalization.)* -- convolution through im2col, attention through fused projections -- and the operations that resist it are the memory-bound remainder. The transformer alone occupies **two machine regimes** *(why it matters: Prefill evaluates the whole prompt as weight-reusing GEMMs and is usually compute-bound; decode emits one token per step, rereading every weight plus a KV cache that grows linearly with context, at about 1 FLOP/byte -- the same model, a different bottleneck per phase.)*: prompt prefill, which is usually compute-bound, and autoregressive decode, which streams every weight per token at ~1 FLOP/byte. And the recommender's embedding table answers a question the other families never ask: **capacity first** *(why it matters: A 100M-item table at 128 FP32 values per row is 51.2 GB -- 64% of an 80 GB accelerator before any arithmetic matters. Whether the table fits on-device, moves to host memory, or partitions across accelerators decides which bandwidth the data term pays.)*, because a lookup is a copy, not a computation.

Five lighthouses carry the argument: ResNet-50 (compute-bound), GPT-2 XL (bandwidth-bound in decode), DLRM (capacity-bound), MobileNetV2 (compute inside a power envelope), and a DS-CNN keyword spotter (always-on power).

> **note**
> Amber dotted marks each carry a one-line why-it-matters card: hover, tap, or
> tab to them. Select any text to pin your own highlight or note.

## Guided notes

### Architectural principles: inductive bias as contract

- Three requests hit the same accelerator -- a camera frame, a prompt, a
  click -- and expose three different limits (arithmetic busy, bandwidth
  starved, capacity blocked). The silicon is identical; the architecture is
  what differs.
- **Inductive bias** *(why it matters: A structural constraint fixed at design time that restricts the hypothesis space. Distinct from regularization, which penalizes complexity at training time; the bias exists before any training run.)* is a design-time restriction of the hypothesis space; it is
  not regularization, which acts on an already-chosen space during training.
- The magnitude: a shared $3{\times}3$ filter on a $224{\times}224$ RGB input
  uses ~5,575× fewer weights than one dense detector covering the same
  pixels. Locality is not a small optimization; it is a 4-order change in
  where parameters come from.
- Ordered by assumption strength: CNN (locality + equivariance) > RNN (order
  but not which positions matter) > Transformer (content routing) > MLP
  (none). Stronger priors need fewer samples on a matching task -- and fail
  harder on a mismatched one.
- The **learnability gap** *(why it matters: Universal approximation guarantees existence, not learnability: the theorem bounds neither samples nor width, and some function classes need widths that grow fast with input dimension. A 784-pixel MNIST MLP works because the task is forgiving; a 256×256 image is not.)* separates representation from learnability: the
  universal approximation theorem bounds neither the dataset nor the width,
  so "an MLP could represent it" is true and useless.

![Five families, five signatures](https://benebsworth.com/study/vol1/06-nn-architectures/diagrams/cost-signatures.svg)

*The chapter's organizing move: each architecture family answers the same three counts - weights stored, MACs performed, bytes resident - and the answer predicts which iron-law term saturates first. Note the transformer alone gets two cells: prefill and decode share weights but not regimes.*
- Each family section reads the same four questions: the data pattern, the
  computation, the hardware mapping, and the bottleneck -- answered by the
  same three counts (weights, MACs, resident bytes). That triple is the
  signature.

### MLPs: dense pattern processing

- The dense layer pays for a weight between every input and every hidden
  unit, including relationships the data never uses. A $1{,}024{\times}1{,}024$
  layer: 1,048,576 weights; quadratic in width.
- At batch one the dense layer is a GEMV: each weight read serves exactly one
  MAC → 0.5 FLOP/byte FP32, 1.0 FP16 -- the floor of the intensity spectrum.
- MLPs stay load-bearing inside the other families: the transformer block's
  feed-forward network is an MLP, and DLRM's dense towers are MLPs. The other
  architectures add structure around dense layers rather than replace them.
- A worked contrast from ch5's running network: the 784→128 first layer
  holds 100,352 MACs (91.9% of the model) -- a dense head holding >90% of a
  small CNN's weights shows the same imbalance in miniature.

### CNNs: spatial pattern processing

- Two structural constraints define the family: local connectivity (each
  output sees a $K{\times}K$ window) and parameter sharing (the same filter
  at every position). Sharing gives **translation equivariance** *(why it matters: Shifting the input shifts the output feature map by the same amount -- the edge detector fires wherever the edge is. Invariance (output unchanged under shift) is built later by pooling/global pooling, not by the stencil.)*:
  $f(T(x)) = T(f(x))$. Invariance comes later through pooling.
- Receptive fields grow by $K{-}1$ per layer, so depth composes edges into
  objects -- a 3×3 kernel's field widens quadratically in area with depth.
- **im2col** *(why it matters: Unfold each receptive-field patch into a matrix row, stack filters into columns, and the convolution becomes a plain GEMM on vendor-tuned libraries. The price: interior elements appear in up to K²=9 rows, a memory-for-simplicity trade -- datacenter GPUs accept it, mobile frameworks prefer direct convolution.)* lowers convolution to GEMM by materializing patches;
  interior pixels appear in up to $K^2{=}9$ rows, a memory-for-simplicity
  trade -- datacenter GPUs accept it, mobile frameworks prefer direct conv.

**Eq 1 · One convolutional layer**
$$
H_{i,j,k} = f\!\left(\sum_{c}\sum_{u,v} W_{u,v,c,k}\,X_{i+u,j+v,c} + b_k\right)
$$

- The CNN cost signature inverts the dense layer's: few weights, many MACs
  per weight (a filter reuses at every one of ~50K spatial positions), and
  bytes dominated by feature maps rather than filters. Overlapping windows
  are tiled into SRAM so each pixel is not re-fetched 9× from DRAM.
- ResNet-50: ~25.6M params, ~102 MB FP32, 8.2 GFLOPs/image, ~half its MACs
  in 3×3 convs -- batched reuse puts it comfortably compute-bound.
- **Depthwise separable** *(why it matters: Factor a K×K×C_in×C_out convolution into a per-channel spatial filter plus a 1×1 channel mix: params and MACs shrink to ≈ 1/C_out + 1/K² of the original, ≈8-9× for 3×3. But the depthwise stage loses cross-channel reuse -- low arithmetic intensity, so ~13× fewer FLOPs buys much less than 13× wall-clock on a big GPU.)* convolutions factor filtering (per-channel) from mixing
  (1×1 pointwise): reduction $\approx \frac{1}{C_{out}} + \frac{1}{K^2}$,
  ≈8–9× for 3×3. MobileNetV2: 3.5M params (~7× smaller than ResNet-50),
  ~10-20× fewer FLOPs -- but the depthwise stage can't form wide GEMMs, so
  the FLOP cut doesn't translate into equal speedup on datacenter GPUs.

**Eq 2 · Depthwise-separable cost ratio**
$$
\frac{\text{factorized}}{\text{standard}} \approx \frac{1}{C_{out}} + \frac{1}{K^2}
$$

### Skip connections and normalization

- The residual's $y = F(x) + x$ gives gradients a highway past each block --
  the input stays live through the branch, an activation-memory cost the
  checkpointing trade in ch8 will price.
- Normalization steadies the forward pass; the variants differ in what they
  reduce over: BatchNorm over batch+spatial dims (adds batch dependence and
  train/serve skew), LayerNorm over the hidden dim (two reductions),
  RMSNorm (one reduction, no mean-centering -- easier to fuse).
- Both residual adds and norms are bandwidth-bound elementwise work -- an
  unfused residual add sits under 0.1 FLOP/byte. They are the "memory-bound
  remainder" that survives GEMM lowering.

### RNNs: sequential pattern processing

- The recurrence $h_t = f(W_{hh}h_{t-1} + W_{hx}x_t + b_h)$ shares weights
  across steps and keeps $O(1)$ state -- a 128-wide hidden state is 16,384
  recurrent MACs per step vs 12,800 input MACs at input width 100, and the
  state fits in kilobytes.
- Two loop nests expose the concurrency boundary: batch instances
  parallelize freely; the time loop is serial. BPTT unrolls the serial chain
  for training and truncates it when the unroll gets long.
- The serial floor is the family's signature cost: throughput can't grow
  with batch the way convolutions can. Counterpoint -- for streaming
  inference under a fixed state budget (KWS-style always-on), $O(1)$ state
  is exactly the win.

### Attention: dynamic processing

- The routing is content-based: $\mathrm{softmax}(QK^T/\sqrt{d_k})V$ -- one
  relevance score per position pair. That pair term is the family's
  signature cost: **quadratic score work** *(why it matters: Dense attention computes S² score interactions; doubling context quadruples that work, and materializing the score matrix is optional storage that tiled kernels (FlashAttention) remove -- the quadratic arithmetic remains.)* -- 2× context, 4× score memory;
  512→4096 tokens is a 64× blowup if materialized.

**Eq 3 · Scaled dot-product attention**
$$
\mathrm{Attention}(Q,K,V) = \mathrm{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

- The block's MAC account (GPT-2-class block, FFN width 4× hidden):
  projections + FFN cost $12\,S\,d^2$, the two attention products
  $2\,S^2d$. Equal when **$S = 6d$** *(why it matters: Attention arithmetic dominates a block only past roughly six times the hidden width -- ~9,600 tokens at GPT-2 XL's 1,600. Below that, ordinary GEMMs are the wall; the quadratic term is a long-context phenomenon, not a per-token tax.)*: the quadratic dominates only past ~6× the
  hidden width (~9,600 tokens at GPT-2 XL's 1,600). Below that, the boring
  GEMMs are the wall.

**Eq 4 · Where the quadratic term takes over**
$$
12\,S\,d^2 = 2\,S^2 d \;\Rightarrow\; S^{*} = 6d
$$


**Dense GEMM vs attention MACs per block, by context length**

| Context length (tokens) | Dense GEMMs (projections + FFN) | Attention products (QK^T and score·V) |
|---|---|---|
| 1K | 31.5 | 3.4 |
| 4K | 125.8 | 53.7 |
| 8K | 251.7 | 214.7 |
| 16K | 503.3 | 858.9 |

*Packet-owned computation from the block MAC account for a GPT-2 XL-shaped model (width 1,600, FFN 4x): projections+FFN cost 12·S·d^2 MACs and the two attention products cost 2·S^2·d. Attention is a minority below a few thousand tokens, reaches parity at S = 6d ≈ 9,600, and dominates at 16K - the crossover equation plotted. This counts arithmetic only; materialized score storage is the separate quadratic term tiled kernels avoid.*

- Multi-head attention splits the same QKV work across heads ($d_{model} =
  h \times d_{head}$, GPT-2 small: 12 heads × 64) and recombines through
  $W^O$ -- same MACs, different feature mixing.
- Position is injected, not learned by attention: sinusoidal or learned
  position embeddings -- BERT's learned table for 512 positions became a
  hard 512-token input limit in deployment.

### Transformers: parallel sequence processing

- The block = multi-head attention + position-wise FFN + norms + residuals;
  the family replaces recurrence's serial chain with parallel token
  evaluation -- which is why it trains at datacenter scale.
- Generation splits into two phases with different machine profiles:
  **prefill** *(why it matters: One pass over all prompt tokens as matrix-matrix products -- weight reuse across every position, writes each token's K and V to the cache. Usually compute-bound, like training.)* runs the whole prompt as GEMMs (compute-bound, like
  training); **decode** *(why it matters: One token per step as matrix-vector products -- every weight and the whole KV cache re-read per token at ~1 FLOP/byte FP16. Usually bandwidth-bound at small batch; the serving-cost phase.)* emits one token per step as GEMV, rereading every
  weight at ~1 FLOP/byte FP16.

**Eq 5 · Decode arithmetic intensity**
$$
I_{decode} = \frac{2\ \mathrm{FLOPs}}{2\ \mathrm{bytes}} = 1.0\ \mathrm{FLOP/byte}
$$

- A 70B model in FP16 streams >100 GB of weights *per generated token*;
  the weight read alone is ~1 ms at HBM speeds. Decode is the serving cost.
- The **KV cache** *(why it matters: Stores each past token's K and V so decode never recomputes them: O(layers × 2 × d_model × seq_len) bytes per request -- GPT-2 XL ≈ 307 KB/token. Linear in context and concurrency, so serving bounds it (shared K/V across heads, paged allocation, shorter contexts).)* stores past keys and values: per request,
  $O(L \times 2 \times d_{model} \times S)$ ≈ 307 KB/token for GPT-2 XL
  (48 layers, $d$=1,600, FP16). A 7B-class model: ~1.07 GB per request,
  ~8.6 GB at 8 concurrent users.

**Eq 6 · KV cache size per request**
$$
M_{KV} = L \times 2 \times d_{model} \times S \times \mathrm{bytes}
$$


**KV cache per request vs context (GPT-2 XL, FP16)**

| Context length (tokens) | KV cache (GB) |
|---|---|
| 1K | 0.31 |
| 4K | 1.23 |
| 10K | 3.07 |
| 32K | 9.83 |
| 128K | 39.3 |

*Packet-owned computation from the KV-cache formula: 48 layers x 2 tensors x 1,600 wide x 2 bytes = ~307 KB per token per request. The cache is negligible at prompt scale, crosses the ~3 GB FP16 weight footprint near ten thousand tokens, and keeps climbing linearly - multiply again by concurrent requests. Weights stay flat; the cache is the moving term in decode memory.*

- Three memory regimes diverge with context (GPT-2 XL shape): weights flat,
  KV linear (crosses weights ~10K tokens), materialized scores quadratic
  (one layer's scores alone fill an accelerator ~41K tokens -- why tiled
  kernels never materialize them).

![Prefill and decode regimes](https://benebsworth.com/study/vol1/06-nn-architectures/diagrams/prefill-decode.svg)

*Why one model gets two rows in the workload profile. Prompt evaluation is a weight-reusing GEMM (compute-bound); each generated token is a GEMV that rereads every weight plus a KV cache growing ~307 KB per token - bandwidth-bound at ~1 FLOP/byte.*
### Sparse architectures: recommendation (DLRM)

- The data structure is categorical: high-cardinality IDs → learned rows
  read at data-dependent addresses. A lookup is a copy -- intensity is n/a,
  not low.
- The **capacity wall** *(why it matters: Table size decides placement before arithmetic matters: HBM if it fits, else host DRAM over PCIe or peer accelerators over NVLink -- each with a different bandwidth price. Three escapes: shrink (hash/compress), move (slower lookups), partition (all-to-all communication).)*: a 100M-item table at 128 FP32 values is 51.2 GB,
  64% of an 80 GB accelerator; a second table breaches it. Production
  tables reach terabytes.
- Three escapes: shrink (hashing/compression, loses long-tail info), move
  (host DRAM/key-value store, slower lookups), partition across devices
  (all-to-all communication, bisection bandwidth).
- The MLP towers are small; the model is the tables. DLRM inverts every
  dense family's priority: capacity is a feasibility constraint that comes
  before either execution term of the iron law.

![The embedding capacity wall](https://benebsworth.com/study/vol1/06-nn-architectures/diagrams/capacity-wall.svg)

*Recommendation tables are feasibility problems before they are performance problems: a 51.2 GB table fits an 80 GB accelerator, two do not. The three escapes - shrink, move, partition - each relocate the cost rather than remove it.*
### Comparing and choosing architectures

- One scale for all families: arithmetic intensity vs machine balance.
  Weight-only proxies (FP32): ResNet-50 high (deeper layers hit 100-200+
  FLOP/byte), MobileNetV2 mid, GPT-2 XL decode ~1, DLRM undefined. The
  ResNet/GPT-2 gap is ~160× -- the widest among the lighthouses.


**Weight-traffic intensity signatures by lighthouse (FLOP/byte)**

| Workload | Weight-stream intensity |
|---|---|
| ResNet-50 (batched conv) | 150 |
| MobileNetV2 (depthwise) | 12 |
| GPT-2 XL decode (B=1) | 1 |
| MLP dense (B=1) | 0.5 |
| DLRM lookups | 0.02 |

*Qualitative proxies from the chapter's workload profile: how much arithmetic each family buys per byte of weight traffic in its common regime. Batched ResNet-50 convolutions reuse each weight across ~50K positions and the whole batch; depthwise MobileNetV2 trades some of that reuse away for the ~9x param cut; a batch-one dense layer and GPT-2 decode sit at the GEMV floor. DLRM plots at the floor because lookups are copies - its constraint is capacity, which intensity can't express.*

- The workload-profile table reads a request through the machine:
  persistent state, per-request state, intensity, parallel axis, limiting
  iron-law term. Transformer appears twice (prefill/decode) -- same weights,
  different regime.
- Training state = 16 B/param (FP32 weights + grads + 2 Adam moments):
  GPT-2 XL fits one accelerator; DLRM's tables do not.
- **Selection is a triage** *(why it matters: Data structure picks candidate families (grid→CNN, sequence→RNN/transformer, tabular→MLP, high-cardinality→embeddings), then deployment constraints filter: memory capacity, compute, latency, accuracy, hardware readiness. Fails route back to scale down or increase capacity.)*: data structure picks candidates, then
  constraints eliminate -- memory, compute, latency, accuracy, deployment.
  A mismatch chosen here can't be rescued by later kernel tuning.
- The Netflix Prize lesson: the million-dollar-winning ensemble never shipped --
  integration cost and a shifted objective (DVD→streaming) ate the
  accuracy gain.

### D·A·M reading + fallacies

- **D**: data symmetries (locality, order, cardinality) nominate the bias.
- **A**: the family's structural assumption -- the signature written in
  layer shapes.
- **M**: which iron-law term saturates -- compute for batched CNN, bandwidth
  for decode, capacity for embeddings, power for always-on.
- Fallacies the book names:
  - *More complex architectures always perform better* -- ViTs matched CNN
    accuracy only with much larger pretraining data; the bitter lesson
    favors weak priors only when you can pay for them.
  - *One dominant bottleneck across regimes* -- the same graph is
    compute-bound in prefill and bandwidth-bound in decode; a benchmark
    in one regime says nothing about the other.
  - *Accuracy-only selection* -- the Netflix ensemble; metric gain without
    production fit ships nothing.
  - *Hybrids add linearly* -- conv+attention+recurrence each carry distinct
    memory access patterns; combining can add traffic and break locality.
  - *Train hardware ≈ deploy hardware* -- an 8×A100 node holds ≥40× a
    Jetson Orin NX's memory; the deployed constraint is a different
    envelope.

## The physics

| Quantity | Value | Use |
|---|---|---|
| Locality param reduction | ~5,575× | 3×3 shared filter vs dense detector on 224×224 RGB |
| Dense B=1 intensity | 0.5 FLOP/B (FP32), 1.0 (FP16) | GEMV floor; decode regime anchor |
| Depthwise separable | $\frac{1}{C_{out}}+\frac{1}{K^2}$ ≈ 8–9× | param/MAC cut for 3×3; intensity drops |
| Attention crossover | $S^* = 6d$ | quadratic dominates only past ~9.6K tokens @ d=1600 |
| Decode weight stream | >100 GB/token @70B FP16 | why decode sets serving cost |
| KV cache | $L{\cdot}2{\cdot}d{\cdot}S$ bytes | GPT-2 XL ≈307 KB/token; crosses weights ~10K |
| Score materialization | $S^2 \times$ bytes | 2× context → 4×; 512→4096 → 64×; fills device ~41K |
| ResNet-50 | 25.6M params, ~102 MB, 8.2 GFLOPs | compute-bound lighthouse |
| MobileNetV2 | 3.5M params, ~0.5-0.6 GFLOPs | ~13× fewer FLOPs, latency/power profile |
| DLRM table | 51.2 GB (100M×128 FP32) | 64% of 80 GB A100; two tables breach |
| Training state | 16 B/param | FP32 + grads + 2 Adam moments |
| Unfused residual add | <0.1 FLOP/B | the memory-bound remainder of GEMM lowering |
| ResNet/GPT-2 intensity | ~160× | widest lighthouse gap, weight-only proxy |
| im2col expansion | up to $K^2{=}9×$ per element | memory for GEMM simplicity |
| RNN step | 16,384 recurrent MACs (@128h) | serial floor; state <1 MiB |

## Glossary

- **Inductive bias**: a structural constraint fixed at design time that
  restricts the hypothesis space, trading representational freedom for
  sample and compute efficiency.
- **Cost signature**: the per-family triple of weights, MACs, and resident
  bytes that predicts the dominant iron-law term.
- **Translation equivariance**: $f(T(x)) = T(f(x))$ -- shifting the input
  shifts the output by the same amount; conferred by parameter sharing.
- **Receptive field**: the input region one output activation depends on;
  grows $K{-}1$ per stacked layer.
- **im2col**: unfold each receptive-field patch into a matrix row so
  convolution runs as GEMM; costs up to $K^2$ data expansion.
- **Depthwise separable convolution**: per-channel spatial filter + 1×1
  channel mix; ~8-9× cheaper but lower arithmetic intensity.
- **GEMV**: matrix-vector product -- the batch-one/decode degenerate GEMM
  with one operand read per FLOP pair.
- **Prefill**: the parallel prompt-evaluation phase that writes the KV
  cache; matrix-matrix, usually compute-bound.
- **Decode**: autoregressive one-token-per-step phase; matrix-vector at
  ~1 FLOP/byte, usually bandwidth-bound.
- **KV cache**: stored keys+values for all past tokens; linear in context
  and concurrent requests.
- **Embedding table**: one learned row per categorical ID; lookups are
  gathers (copies), capacity-first cost.
- **Capacity wall**: when model size exceeds device memory -- feasibility
  constraint ahead of compute and bandwidth.
- **All-to-all**: every device sends to every device, the collective that
  sharded embedding lookups pay.
- **Learnability gap**: between what a network can represent (UAT) and
  what it can learn under sample and compute budgets.
- **Bitter lesson caveat**: weak priors win only with data and compute
  large enough to buy the lost bias.
- **Linear bottleneck**: MobileNetV2's projection without a trailing
  nonlinearity on the thin map -- keeps low-rank structure intact.

## → Ben's world

- The `lib/lab/llm-benchmark` runner is the decode regime in the room:
  every `ollama` generation pays ~1 FLOP/byte per token on streamed
  weights, which is why `qwen3.8:27b-mlx` at ~31 tok/s is bandwidth-bound
  by construction -- the same number the chapter predicts off the KV and
  weight-stream model.
- The harness's per-model latency differences are architecture-signature
  differences: `gemma3:4b` at 132 tok/s vs the 27B at 31 -- the streamed
  weight bytes per token differ ~6×, the tok/s differs ~4×. The signature
  predicts the ratio before the benchmark measures it.
- DLRM's capacity wall is the greenveil crawler problem in miniature: a
  table that doesn't fit forces the shrink/move/partition decision --
  Supabase is the "move to host DRAM" answer, and every query pays the
  PCIe-priced bandwidth.
- The prefill/decode split explains why long-prompt benchmark tasks feel
  fast to start but crawl to finish: TTFT rides GEMM reuse, TPOT rides
  the bus.

## Open questions

- The weight-only intensity proxy omits activation and KV traffic -- for
  MobileNetV2's depthwise layers, does including activation bytes flip
  the "compute-bound" label on real mobile NPUs?
- The 6×d crossover assumes FFN width = 4× hidden. Modern LLaMA-family
  blocks use SwiGLU with ~2.7× effective width -- does the crossover move
  to ~4×d, and does that change which models are "attention-dominated"
  at their trained context?
- Speculative decoding amortizes weight reads across guessed tokens --
  how far up the intensity slope does it push batch-one decode, and does
  it change the signature or only the operating point?
- Mamba/state-space families sit outside this chapter's taxonomy -- is
  their cost signature "RNN-like with parallel training," and does the
  workload-profile table need a sixth row?


---

## Key equations

**Eq 1 · One convolutional layer**

$$
H_{i,j,k} = f\!\left(\sum_{c}\sum_{u,v} W_{u,v,c,k}\,X_{i+u,j+v,c} + b_k\right)
$$

*Each output activation reads only a K-by-K window of the input, and the same W is used at every spatial position. Local connectivity shrinks the weight count per detector; sharing multiplies each weight's reuse by the number of positions. The two constraints are the whole CNN bias.*

**Eq 2 · Depthwise-separable cost ratio**

$$
\frac{\text{factorized}}{\text{standard}} \approx \frac{1}{C_{out}} + \frac{1}{K^2}
$$

*Splitting a K x K convolution into a per-channel spatial filter plus a 1 x 1 channel mix divides parameters and MACs by roughly the larger of C_out or K^2 - about 8-9x for 3 x 3 kernels. The saving is real arithmetic, but the depthwise stage has no cross-channel reuse, so its arithmetic intensity drops and wall-clock speedup lags the FLOP count on wide-GEMM hardware.*

**Eq 3 · Scaled dot-product attention**

$$
\mathrm{Attention}(Q,K,V) = \mathrm{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

*Content-based routing: every query scores against every key, softmax turns scores into mixing weights, and the output is a weighted sum of values. The QK^T product is where the S-squared score work lives - the family's signature cost. Dividing by sqrt(d_k) keeps score magnitudes out of the softmax's saturated tail as head width grows.*

**Eq 4 · Where the quadratic term takes over**

$$
12\,S\,d^2 = 2\,S^2 d \;\Rightarrow\; S^{*} = 6d
$$

*Inside one transformer block the dense projections plus a 4x-width FFN cost 12·S·d^2 MACs while the two attention products cost 2·S^2·d. Setting them equal puts the crossover at six times the hidden width - about 9,600 tokens for a 1,600-wide model. Below it, ordinary GEMMs dominate; the quadratic is a long-context phenomenon.*

**Eq 5 · Decode arithmetic intensity**

$$
I_{decode} = \frac{2\ \mathrm{FLOPs}}{2\ \mathrm{bytes}} = 1.0\ \mathrm{FLOP/byte}
$$

*Autoregressive decode at batch one is a GEMV: each FP16 weight is read once and participates in one MAC (2 FLOPs) per emitted token. The ratio never rises with better kernels - only batching or weight reuse lifts it. A 70B model therefore streams over 100 GB of weights per token, and the weight read alone costs about a millisecond at HBM speeds.*

**Eq 6 · KV cache size per request**

$$
M_{KV} = L \times 2 \times d_{model} \times S \times \mathrm{bytes}
$$

*Decode never recomputes past keys and values: each layer stores one K and one V per past token. GPT-2 XL (48 layers, width 1,600, FP16) burns about 307 KB per token, so the cache crosses the ~3 GB weight footprint near ten thousand tokens of context, then keeps growing linearly with context and concurrency.*

**Eq 7 · Materialized score memory**

$$
M_{scores} = S^2 \times \mathrm{bytes}_{elem} \times L
$$

*If the S x S score matrix is written out, storage grows quadratically: doubling context quadruples it, and 512 to 4096 tokens is a 64x blowup. Across all layers of a GPT-2 XL-shaped model, materialized scores would fill an 80 GB accelerator around 20-40K tokens - which is why tiled kernels stream the scores through registers instead of materializing them. The arithmetic stays quadratic; only the storage is optional.*

**Eq 8 · Training state per parameter**

$$
M_{train} = P \times 16\ \mathrm{bytes}
$$

*Holding a model for training costs four FP32-sized slots per parameter: weights, gradients, and Adam's two moments (momentum and variance). GPT-2 XL's ~24 GB of parameter state fits one accelerator; DLRM's embedding-heavy footprint does not - which is why table capacity, not compute, decides its cluster shape.*

## From the book

- [Three memory regimes of a long context](https://mlsysbook.ai/vol1/06_nn_architectures/06_nn_architectures.html) — The book's log-log plot of weights, per-request KV cache, and one layer's materialized scores against context length - the quantitative version of our prefill-decode sketch. Ours shows the two-phase mechanism; theirs shows where the three curves actually cross (~10K and ~41K tokens).
- [Architecture workload profiles table](https://mlsysbook.ai/vol1/06_nn_architectures/06_nn_architectures.html) — The table this whole packet compresses into the signature cards: per-family persistent state, per-request activations, intensity regime, parallel axis, and limiting iron-law term. Read the transformer's two rows - same weights, different bottleneck.
- [Arithmetic intensity across workloads](https://mlsysbook.ai/vol1/06_nn_architectures/06_nn_architectures.html) — The lighthouse models placed on one intensity axis with machine-balance ridges - the ~160x ResNet/GPT-2-decode gap our chart approximates qualitatively. Theirs is the measured version; check where each lighthouse sits relative to the roofline knee.
- [Architecture selection flowchart](https://mlsysbook.ai/vol1/06_nn_architectures/06_nn_architectures.html) — The triage tree the packet calls 'selection as elimination': data type picks candidate families, then memory, compute, latency, accuracy, and deployment diamonds filter - with recommendation workloads routed to the sparse family first. The packet's D·A·M reading is this chart's one-line summary.
- [Attention memory wall (margin)](https://mlsysbook.ai/vol1/06_nn_architectures/06_nn_architectures.html) — The book's margin sketch of quadratic score memory versus linear KV growth - compare with our prefill-decode strip. Theirs motivates tiled attention kernels; ours motivates why decode serving is the bill.
- [Inductive bias spectrum (margin)](https://mlsysbook.ai/vol1/06_nn_architectures/06_nn_architectures.html) — The book's ordering of families by assumption strength. The packet adds RNNs between CNN and transformer (recurrence fixes order but not which positions matter) - check whether you agree with the placement.
- [Capacity wall (margin)](https://mlsysbook.ai/vol1/06_nn_architectures/06_nn_architectures.html) — The book's version of our capacity-wall sketch. Compare escapes: theirs frames it as an HBM/DRAM/NVLink placement ladder, ours as three explicit trade-offs (shrink/move/partition).

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

Book MCQs are drawn from the chapter's own quiz bank
(`nn_architectures_quizzes.json`). The Feynman prompts and numeric problems
are original. Answer before checking the key at the bottom.

## Book questions

**Q1.** A team must choose between an MLP and a CNN for classifying
$224 \times 224$ RGB medical images. A single dense first layer would need
~150M weights per thousand output units, whereas a CNN uses a shared
$3 \times 3 \times 3$ filter (27 weights). Using inductive bias, which
statement best explains why the CNN is the superior starting point?

- a. The CNN is strictly more expressive, approximating functions the
  Universal Approximation Theorem forbids.
- b. The MLP is mathematically incapable of representing 2D spatial features.
- c. The CNN eliminates gradient descent because convolutional filters are
  deterministic.
- d. The CNN's spatial-locality and weight-sharing prior matches image
  structure: convolution is translation equivariant, and pooling can build
  invariance on top.

**Q2.** A single dense layer ($2{,}048 \times 2{,}048$) running FP32
inference at batch size 1 achieves ~4% of peak compute, with an arithmetic
intensity of ~0.5 FLOP/byte. What most effectively moves it out of the
bandwidth-bound regime?

- a. Increase the batch size, turning the matrix-vector product into a
  matrix-matrix product that reuses each weight read across examples.
- b. Replace the matmul with an unvectorized scalar loop to avoid kernel
  launch overhead.
- c. Upgrade to an accelerator with double the peak FLOP/s, keeping B = 1.
- d. Replace the linear map with an element-wise activation to eliminate
  weight traffic.

**Q3.** A standard RNN with input dimension 100 and hidden dimension 128
performs how many MACs per time step?

- a. 12,800 -- only the input projection multiplies a matrix.
- b. 29,184 -- $128 \times 128 = 16{,}384$ recurrent MACs plus
  $100 \times 128 = 12{,}800$ input MACs.
- c. 1,280,000 -- recurrence multiplies hidden states across all past steps.
- d. 256 -- an RNN only does a vector addition per step.

**Q4.** In an attention layer with sequence length $S = 512$ and per-head
dimension $d_k = 64$, how many MACs does computing the $QK^T$ score matrix
cost?

- a. 32,768
- b. 262,144
- c. 1,048,576
- d. 16,777,216 -- $S \times S \times d_k$

**Q5.** The workload profile gives the transformer two rows, prefill and
decode, even though both run the same weights. Which statement is correct?

- a. Prefill is limited by the data term because it reads the whole prompt
  from storage; decode is limited by compute.
- b. Prefill processes all $S$ prompt tokens together, raising weight reuse
  and arithmetic intensity enough to be compute-bound; decode produces one
  token per step and rereads all weights plus the KV cache, making it
  bandwidth-bound at small batch.
- c. Both are limited by memory capacity because the KV cache always
  exceeds device memory.
- d. Decode is compute-bound because its $O(S^2)$ attention dominates;
  prefill is latency-bound.

**Q6.** A profiler reports embedding tables consuming over 1 TB across
cluster nodes, requests performing sparse random row lookups rather than
dense matmuls, and a hard memory-capacity constraint on every device. Which
lighthouse architecture is this?

- a. DLRM -- capacity-bound tables with irregular gathers.
- b. ResNet-50 -- dense conv throughput.
- c. GPT-2 -- bandwidth-bound autoregressive decode.
- d. MobileNetV2 -- depthwise-separable low-intensity conv.

## Feynman prompts

**Q7.** Explain to a junior engineer why "the transformer is bandwidth-bound"
is wrong as stated but right half the time -- using the difference between
prefill and decode, and what arithmetic intensity each phase has.

**Q8.** A colleague says: "Depthwise-separable convolution cuts FLOPs 9x, so
MobileNet should be 9x faster than ResNet on a datacenter GPU." Explain the
two reasons the FLOP cut doesn't translate -- one about what depthwise conv
can no longer form, one about what intensity it lands at.

## Numeric problems

**Q9.** A 7B-parameter model in FP16 has 32 layers and hidden width 4,096.
(a) How many bytes of weights does decode stream per generated token?
(b) How large is one request's KV cache at 4K tokens of context?
(c) At 8 concurrent requests, which term -- weights or KV -- is bigger, and
what does that imply for batching?

**Q10.** A transformer block has hidden width $d = 2{,}048$ and FFN width
$4d$. At what context length does attention arithmetic overtake the dense
GEMMs? Give the rule and the number.

---
--- answer key ---

**Q1: d.** Locality + sharing match image structure directly: the same
detector applies at every position (equivariance), and pooling can later
produce invariance. Expressiveness arguments run backwards -- the CNN is the
*more* constrained family, which is precisely why it needs fewer samples and
parameters here. Filters are still learned.

**Q2: a.** At B = 1 each weight serves exactly one MAC -- the GEMV floor.
Batching turns it into GEMM, reusing every weight read across examples;
that is the only listed change that raises arithmetic intensity. More peak
FLOP/s (c) makes the bandwidth-bound layer *relatively worse*, not better.

**Q3: b.** $16{,}384 + 12{,}800 = 29{,}184$ MACs per step. The recurrent
matrix is the larger term whenever hidden width exceeds input width -- and
it is the term on the serial critical path.

**Q4: d.** $512 \times 512$ score positions, each a dot product of length
64 → $S^2 \cdot d_k = 16.8$M MACs. This is the quadratic signature: double
S and the term quadruples.

**Q5: b.** Same weights, different regime. Prefill is matrix-matrix work
with full reuse; decode is matrix-vector work where every weight and all
cached K/V stream per token. A benchmark of one phase says nothing about
the other -- which is also a named fallacy in the chapter.

**Q6: a.** Terabyte tables + irregular lookups + a capacity-first
constraint = the recommender lighthouse. Intensity is not even the right
unit: a lookup is a copy.

**Q7 -- model points.** Prefill runs the whole prompt as GEMMs: each weight
is reused across all S positions, so intensity is high and the phase is
usually compute-bound. Decode emits one token per step as GEMV: each FP16
weight is read once per token for 2 FLOPs → ~1 FLOP/byte, bandwidth-bound.
So the sentence is right for the *serving* half (which is where users feel
latency and where bills accrue) and wrong for prompt evaluation and
training. Bonus: the KV cache adds a second streamed term that grows with
context, so decode gets *more* bandwidth-bound over long sessions.

**Q8 -- model points.** (1) The pointwise 1×1 half is a GEMM, but the
depthwise half filters each channel in isolation -- no cross-channel
contraction axis, so it can't lower onto wide matrix multiplies; it runs
as many small stencil ops with low reuse. (2) Its arithmetic intensity
drops accordingly, so on a big GPU the depthwise stage sits on the
bandwidth slope: ~9x fewer FLOPs competes against ~9x lower intensity.
The saving shines where the constraint is parameters/energy (edge,
always-on), not where the machine is compute-hungry.

**Q9.** (a) 7B × 2 B = **14 GB** of weights per token. (b) $L \times 2
\times d \times S \times \mathrm{bytes} = 32 \times 2 \times 4096 \times
4000 \times 2 \approx 2.1\ \mathrm{GB}$ per request. (c) At 8 requests:
KV ≈ **16.8 GB > 14 GB weights** -- the cache is now the bigger streamed
term, and its size depends on context and concurrency, not on the model
alone. Implication: batching amortizes the weight stream but the KV term
scales with requests; paged/shared-KV schemes exist precisely to bound it.

**Q10.** Rule: $S^{*} = 6d$ (from $12Sd^2 = 2S^2d$, FFN at 4×). Number:
$6 \times 2{,}048 = \mathbf{12{,}288}$ tokens. Below it the dense GEMMs
dominate the block's arithmetic; above it the quadratic takes over.

## Audio overview

[Listen to the Marcus & Iris read-along (~9 min)](https://benebsworth.com/study-audio/vol1/06-nn-architectures.m4a) — a generated podcast walking this packet's argument.
