# Neural Network Architectures -- self-test

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
