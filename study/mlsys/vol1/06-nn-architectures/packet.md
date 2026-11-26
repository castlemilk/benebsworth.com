# Neural Network Architectures: Study Packet

*Working through Machine Learning Systems (Reddi, Harvard CS249r, mlsysbook.ai, CC-BY-NC-SA 4.0).
Chapter 6 of Volume I: inductive bias as a contract with physics, every family lowering onto GEMM, the two regimes of a transformer, and the embedding capacity wall.*

## Thesis

An architecture is a ==cost signature=={Three counts per building block -- weights stored, multiply-accumulates performed, bytes that must move or stay resident -- predict which iron-law term dominates before a single benchmark runs. The architecture does not fix the numbers, but it chooses which one saturates first.} before it is a model. Each family is defined by the structural assumption it encodes: spatial locality and weight sharing for convolution, ordered recurrence for sequence state, content-based routing for attention, and none at all for the dense layer. A bias that matches the data cuts ==parameters, samples, and operations=={A shared 3×3 filter on an ImageNet-sized input uses ~5,575× fewer weights than one dense feature detector. The same mechanism also reduces the dataset size needed to generalize, which is why weak priors only win when data and compute are large enough to pay for them.}; a weak prior only pays off once data and compute are large enough. Almost every family then ==lowers onto GEMM=={Convolution reaches matrix multiply through im2col, attention and LSTM gates fuse projections into wide GEMMs, and a 1×1 convolution is already a GEMM -- so matrix engines dominate the operation count and the exceptions are the memory-bound remainder: gathers, residual adds, normalization.} -- convolution through im2col, attention through fused projections -- and the operations that resist it are the memory-bound remainder. The transformer alone occupies ==two machine regimes=={Prefill evaluates the whole prompt as weight-reusing GEMMs and is usually compute-bound; decode emits one token per step, rereading every weight plus a KV cache that grows linearly with context, at about 1 FLOP/byte -- the same model, a different bottleneck per phase.}: prompt prefill, which is usually compute-bound, and autoregressive decode, which streams every weight per token at ~1 FLOP/byte. And the recommender's embedding table answers a question the other families never ask: ==capacity first=={A 100M-item table at 128 FP32 values per row is 51.2 GB -- 64% of an 80 GB accelerator before any arithmetic matters. Whether the table fits on-device, moves to host memory, or partitions across accelerators decides which bandwidth the data term pays.}, because a lookup is a copy, not a computation.

Five lighthouses carry the argument: ResNet-50 (compute-bound), GPT-2 XL (bandwidth-bound in decode), DLRM (capacity-bound), MobileNetV2 (compute inside a power envelope), and a DS-CNN keyword spotter (always-on power).

> [!note]
> Amber dotted marks each carry a one-line why-it-matters card: hover, tap, or
> tab to them. Select any text to pin your own highlight or note.

## Guided notes

### Architectural principles: inductive bias as contract

- Three requests hit the same accelerator -- a camera frame, a prompt, a
  click -- and expose three different limits (arithmetic busy, bandwidth
  starved, capacity blocked). The silicon is identical; the architecture is
  what differs.
- ==Inductive bias=={A structural constraint fixed at design time that restricts the hypothesis space. Distinct from regularization, which penalizes complexity at training time; the bias exists before any training run.} is a design-time restriction of the hypothesis space; it is
  not regularization, which acts on an already-chosen space during training.
- The magnitude: a shared $3{\times}3$ filter on a $224{\times}224$ RGB input
  uses ~5,575× fewer weights than one dense detector covering the same
  pixels. Locality is not a small optimization; it is a 4-order change in
  where parameters come from.
- Ordered by assumption strength: CNN (locality + equivariance) > RNN (order
  but not which positions matter) > Transformer (content routing) > MLP
  (none). Stronger priors need fewer samples on a matching task -- and fail
  harder on a mismatched one.
- The ==learnability gap=={Universal approximation guarantees existence, not learnability: the theorem bounds neither samples nor width, and some function classes need widths that grow fast with input dimension. A 784-pixel MNIST MLP works because the task is forgiving; a 256×256 image is not.} separates representation from learnability: the
  universal approximation theorem bounds neither the dataset nor the width,
  so "an MLP could represent it" is true and useless.

::fig[cost-signatures]

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
  at every position). Sharing gives ==translation equivariance=={Shifting the input shifts the output feature map by the same amount -- the edge detector fires wherever the edge is. Invariance (output unchanged under shift) is built later by pooling/global pooling, not by the stencil.}:
  $f(T(x)) = T(f(x))$. Invariance comes later through pooling.
- Receptive fields grow by $K{-}1$ per layer, so depth composes edges into
  objects -- a 3×3 kernel's field widens quadratically in area with depth.
- ==im2col=={Unfold each receptive-field patch into a matrix row, stack filters into columns, and the convolution becomes a plain GEMM on vendor-tuned libraries. The price: interior elements appear in up to K²=9 rows, a memory-for-simplicity trade -- datacenter GPUs accept it, mobile frameworks prefer direct convolution.} lowers convolution to GEMM by materializing patches;
  interior pixels appear in up to $K^2{=}9$ rows, a memory-for-simplicity
  trade -- datacenter GPUs accept it, mobile frameworks prefer direct conv.

::eq[conv-layer]
$$
H_{i,j,k} = f\!\left(\sum_{c}\sum_{u,v} W_{u,v,c,k}\,X_{i+u,j+v,c} + b_k\right)
$$

- The CNN cost signature inverts the dense layer's: few weights, many MACs
  per weight (a filter reuses at every one of ~50K spatial positions), and
  bytes dominated by feature maps rather than filters. Overlapping windows
  are tiled into SRAM so each pixel is not re-fetched 9× from DRAM.
- ResNet-50: ~25.6M params, ~102 MB FP32, 8.2 GFLOPs/image, ~half its MACs
  in 3×3 convs -- batched reuse puts it comfortably compute-bound.
- ==Depthwise separable=={Factor a K×K×C_in×C_out convolution into a per-channel spatial filter plus a 1×1 channel mix: params and MACs shrink to ≈ 1/C_out + 1/K² of the original, ≈8-9× for 3×3. But the depthwise stage loses cross-channel reuse -- low arithmetic intensity, so ~13× fewer FLOPs buys much less than 13× wall-clock on a big GPU.} convolutions factor filtering (per-channel) from mixing
  (1×1 pointwise): reduction $\approx \frac{1}{C_{out}} + \frac{1}{K^2}$,
  ≈8–9× for 3×3. MobileNetV2: 3.5M params (~7× smaller than ResNet-50),
  ~10-20× fewer FLOPs -- but the depthwise stage can't form wide GEMMs, so
  the FLOP cut doesn't translate into equal speedup on datacenter GPUs.

::eq[dw-reduction]
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
  signature cost: ==quadratic score work=={Dense attention computes S² score interactions; doubling context quadruples that work, and materializing the score matrix is optional storage that tiled kernels (FlashAttention) remove -- the quadratic arithmetic remains.} -- 2× context, 4× score memory;
  512→4096 tokens is a 64× blowup if materialized.

::eq[attention]
$$
\mathrm{Attention}(Q,K,V) = \mathrm{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

- The block's MAC account (GPT-2-class block, FFN width 4× hidden):
  projections + FFN cost $12\,S\,d^2$, the two attention products
  $2\,S^2d$. Equal when ==$S = 6d$=={Attention arithmetic dominates a block only past roughly six times the hidden width -- ~9,600 tokens at GPT-2 XL's 1,600. Below that, ordinary GEMMs are the wall; the quadratic term is a long-context phenomenon, not a per-token tax.}: the quadratic dominates only past ~6× the
  hidden width (~9,600 tokens at GPT-2 XL's 1,600). Below that, the boring
  GEMMs are the wall.

::eq[attention-crossover]
$$
12\,S\,d^2 = 2\,S^2 d \;\Rightarrow\; S^{*} = 6d
$$

::chart[attention-takeover]

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
  ==prefill=={One pass over all prompt tokens as matrix-matrix products -- weight reuse across every position, writes each token's K and V to the cache. Usually compute-bound, like training.} runs the whole prompt as GEMMs (compute-bound, like
  training); ==decode=={One token per step as matrix-vector products -- every weight and the whole KV cache re-read per token at ~1 FLOP/byte FP16. Usually bandwidth-bound at small batch; the serving-cost phase.} emits one token per step as GEMV, rereading every
  weight at ~1 FLOP/byte FP16.

::eq[decode-intensity]
$$
I_{decode} = \frac{2\ \mathrm{FLOPs}}{2\ \mathrm{bytes}} = 1.0\ \mathrm{FLOP/byte}
$$

- A 70B model in FP16 streams >100 GB of weights *per generated token*;
  the weight read alone is ~1 ms at HBM speeds. Decode is the serving cost.
- The ==KV cache=={Stores each past token's K and V so decode never recomputes them: O(layers × 2 × d_model × seq_len) bytes per request -- GPT-2 XL ≈ 307 KB/token. Linear in context and concurrency, so serving bounds it (shared K/V across heads, paged allocation, shorter contexts).} stores past keys and values: per request,
  $O(L \times 2 \times d_{model} \times S)$ ≈ 307 KB/token for GPT-2 XL
  (48 layers, $d$=1,600, FP16). A 7B-class model: ~1.07 GB per request,
  ~8.6 GB at 8 concurrent users.

::eq[kv-cache]
$$
M_{KV} = L \times 2 \times d_{model} \times S \times \mathrm{bytes}
$$

::chart[kv-growth]

- Three memory regimes diverge with context (GPT-2 XL shape): weights flat,
  KV linear (crosses weights ~10K tokens), materialized scores quadratic
  (one layer's scores alone fill an accelerator ~41K tokens -- why tiled
  kernels never materialize them).

::fig[prefill-decode]

### Sparse architectures: recommendation (DLRM)

- The data structure is categorical: high-cardinality IDs → learned rows
  read at data-dependent addresses. A lookup is a copy -- intensity is n/a,
  not low.
- The ==capacity wall=={Table size decides placement before arithmetic matters: HBM if it fits, else host DRAM over PCIe or peer accelerators over NVLink -- each with a different bandwidth price. Three escapes: shrink (hash/compress), move (slower lookups), partition (all-to-all communication).}: a 100M-item table at 128 FP32 values is 51.2 GB,
  64% of an 80 GB accelerator; a second table breaches it. Production
  tables reach terabytes.
- Three escapes: shrink (hashing/compression, loses long-tail info), move
  (host DRAM/key-value store, slower lookups), partition across devices
  (all-to-all communication, bisection bandwidth).
- The MLP towers are small; the model is the tables. DLRM inverts every
  dense family's priority: capacity is a feasibility constraint that comes
  before either execution term of the iron law.

::fig[capacity-wall]

### Comparing and choosing architectures

- One scale for all families: arithmetic intensity vs machine balance.
  Weight-only proxies (FP32): ResNet-50 high (deeper layers hit 100-200+
  FLOP/byte), MobileNetV2 mid, GPT-2 XL decode ~1, DLRM undefined. The
  ResNet/GPT-2 gap is ~160× -- the widest among the lighthouses.

::chart[intensity-signatures]

- The workload-profile table reads a request through the machine:
  persistent state, per-request state, intensity, parallel axis, limiting
  iron-law term. Transformer appears twice (prefill/decode) -- same weights,
  different regime.
- Training state = 16 B/param (FP32 weights + grads + 2 Adam moments):
  GPT-2 XL fits one accelerator; DLRM's tables do not.
- ==Selection is a triage=={Data structure picks candidate families (grid→CNN, sequence→RNN/transformer, tabular→MLP, high-cardinality→embeddings), then deployment constraints filter: memory capacity, compute, latency, accuracy, hardware readiness. Fails route back to scale down or increase capacity.}: data structure picks candidates, then
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
